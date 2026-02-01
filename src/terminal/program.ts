/**
 * Program Class
 *
 * Main terminal control interface. Manages input/output streams,
 * terminal dimensions, cursor position, and event handling.
 *
 * @module terminal/program
 * @internal This module is internal and not exported from the main package.
 */

import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import type * as tty from 'node:tty';
import { z } from 'zod';
import { cursor, screen, style } from './ansi';
import { OutputBuffer } from './outputBuffer';
import { ScreenBuffer } from './screenBuffer';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Program configuration schema
 */
export const ProgramConfigSchema = z.object({
	/**
	 * Input stream (default: process.stdin)
	 */
	input: z.custom<Readable>().optional(),

	/**
	 * Output stream (default: process.stdout)
	 */
	output: z.custom<Writable>().optional(),

	/**
	 * Use alternate screen buffer (default: true)
	 */
	useAlternateScreen: z.boolean().default(true),

	/**
	 * Hide cursor on init (default: true)
	 */
	hideCursor: z.boolean().default(true),

	/**
	 * Terminal title
	 */
	title: z.string().optional(),

	/**
	 * Force specific terminal dimensions (for testing)
	 */
	forceWidth: z.number().int().positive().optional(),
	forceHeight: z.number().int().positive().optional(),
});

export type ProgramConfig = z.input<typeof ProgramConfigSchema>;
export type ResolvedProgramConfig = z.output<typeof ProgramConfigSchema>;

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Key event data
 */
export interface KeyEvent {
	/** Key name or character */
	name: string;
	/** Raw key sequence */
	sequence: string;
	/** Ctrl key pressed */
	ctrl: boolean;
	/** Meta/Alt key pressed */
	meta: boolean;
	/** Shift key pressed */
	shift: boolean;
}

/**
 * Mouse event data
 */
export interface MouseEvent {
	/** Mouse X position (1-indexed) */
	x: number;
	/** Mouse Y position (1-indexed) */
	y: number;
	/** Mouse button (0=left, 1=middle, 2=right) */
	button: number;
	/** Event action */
	action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheel';
	/** Ctrl key pressed */
	ctrl: boolean;
	/** Meta/Alt key pressed */
	meta: boolean;
	/** Shift key pressed */
	shift: boolean;
}

/**
 * Resize event data
 */
export interface ResizeEvent {
	/** New width in columns */
	cols: number;
	/** New height in rows */
	rows: number;
}

/**
 * Program event types
 */
export interface ProgramEvents {
	key: [event: KeyEvent];
	mouse: [event: MouseEvent];
	resize: [event: ResizeEvent];
	focus: [];
	blur: [];
}

// =============================================================================
// TYPED EVENT EMITTER
// =============================================================================

type EventMap = Record<string, unknown[]>;

/**
 * Type-safe event emitter wrapper
 */
class TypedEventEmitter<T extends EventMap> {
	private emitter = new EventEmitter();

	on<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): this {
		this.emitter.on(event, listener as (...args: unknown[]) => void);
		return this;
	}

	off<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): this {
		this.emitter.off(event, listener as (...args: unknown[]) => void);
		return this;
	}

	once<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): this {
		this.emitter.once(event, listener as (...args: unknown[]) => void);
		return this;
	}

	emit<K extends keyof T & string>(event: K, ...args: T[K]): boolean {
		return this.emitter.emit(event, ...args);
	}

	removeAllListeners<K extends keyof T & string>(event?: K): this {
		this.emitter.removeAllListeners(event);
		return this;
	}
}

// =============================================================================
// PROGRAM CLASS
// =============================================================================

/**
 * Program provides the main interface for terminal control.
 *
 * Manages:
 * - Input/output streams
 * - Terminal dimensions
 * - Cursor position
 * - Buffered output
 * - Alternate screen buffer
 * - Event handling (key, mouse, resize)
 *
 * @example
 * ```typescript
 * const program = new Program();
 * await program.init();
 *
 * program.on('key', (event) => {
 *   if (event.name === 'q') {
 *     program.destroy();
 *   }
 * });
 *
 * program.move(10, 5);
 * program.write('Hello, World!');
 * program.flush();
 * ```
 */
export class Program extends TypedEventEmitter<ProgramEvents> {
	private config: ResolvedProgramConfig;
	private _input: Readable;
	private _output: Writable;
	private outputBuffer: OutputBuffer;
	private screenBuffer: ScreenBuffer;
	private _cols = 80;
	private _rows = 24;
	private _initialized = false;
	private cursorHidden = false;
	private rawModeEnabled = false;
	private boundResizeHandler: () => void;

	/**
	 * Create a new Program instance.
	 *
	 * @param config - Program configuration
	 */
	constructor(config: ProgramConfig = {}) {
		super();
		this.config = ProgramConfigSchema.parse(config);
		this._input = this.config.input ?? process.stdin;
		this._output = this.config.output ?? process.stdout;
		this.outputBuffer = new OutputBuffer({ trackCursor: true });
		this.screenBuffer = new ScreenBuffer(this._output);
		this.boundResizeHandler = this.handleResize.bind(this);
	}

	// =========================================================================
	// PROPERTIES
	// =========================================================================

	/**
	 * Input stream (usually process.stdin)
	 */
	get input(): Readable {
		return this._input;
	}

	/**
	 * Output stream (usually process.stdout)
	 */
	get output(): Writable {
		return this._output;
	}

	/**
	 * Terminal width in columns
	 */
	get cols(): number {
		return this._cols;
	}

	/**
	 * Terminal height in rows
	 */
	get rows(): number {
		return this._rows;
	}

	/**
	 * Current cursor X position (1-indexed)
	 */
	get x(): number {
		return this.outputBuffer.cursorX;
	}

	/**
	 * Current cursor Y position (1-indexed)
	 */
	get y(): number {
		return this.outputBuffer.cursorY;
	}

	/**
	 * Whether the program is initialized
	 */
	get initialized(): boolean {
		return this._initialized;
	}

	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	/**
	 * Initialize the terminal.
	 *
	 * - Detects terminal dimensions
	 * - Enters alternate screen buffer (if configured)
	 * - Hides cursor (if configured)
	 * - Sets up resize listener
	 * - Enables raw mode for input
	 *
	 * @example
	 * ```typescript
	 * const program = new Program();
	 * await program.init();
	 * // Terminal is now ready for use
	 * ```
	 */
	async init(): Promise<void> {
		if (this._initialized) {
			return;
		}

		// Detect dimensions
		this.updateDimensions();

		// Enter alternate screen
		if (this.config.useAlternateScreen) {
			this.screenBuffer.enterAlternateScreen();
		}

		// Hide cursor
		if (this.config.hideCursor) {
			this.rawWrite(cursor.hide());
			this.cursorHidden = true;
		}

		// Set title
		if (this.config.title) {
			this.setTitle(this.config.title);
		}

		// Clear screen and move to top-left
		this.rawWrite(screen.clear());
		this.rawWrite(cursor.home());

		// Setup resize handler
		if (this.isTTY(this._output)) {
			this._output.on('resize', this.boundResizeHandler);
		}

		// Enable raw mode for input
		this.enableRawMode();

		// Register cleanup handler
		this.screenBuffer.onCleanup(() => {
			this.restoreTerminal();
		});

		this._initialized = true;
	}

	/**
	 * Destroy the program and restore terminal state.
	 *
	 * - Exits alternate screen buffer
	 * - Shows cursor
	 * - Disables raw mode
	 * - Removes event listeners
	 *
	 * @example
	 * ```typescript
	 * program.destroy();
	 * // Terminal is restored to normal state
	 * ```
	 */
	destroy(): void {
		if (!this._initialized) {
			return;
		}

		this.restoreTerminal();
		this.screenBuffer.destroy();
		this.removeAllListeners();

		// Remove resize handler
		if (this.isTTY(this._output)) {
			this._output.off('resize', this.boundResizeHandler);
		}

		this._initialized = false;
	}

	// =========================================================================
	// OUTPUT
	// =========================================================================

	/**
	 * Write data to the output buffer.
	 * Call flush() to send buffered data to the terminal.
	 *
	 * @param data - String data to write
	 *
	 * @example
	 * ```typescript
	 * program.write('Hello');
	 * program.write(style.fg('red'));
	 * program.write('Red text');
	 * program.flush();
	 * ```
	 */
	write(data: string): void {
		this.outputBuffer.write(data);
	}

	/**
	 * Write data directly to output, bypassing the buffer.
	 * Use sparingly - prefer write() + flush() for batched output.
	 *
	 * @param data - String data to write
	 */
	rawWrite(data: string): void {
		this._output.write(data);
	}

	/**
	 * Flush buffered output to the terminal.
	 *
	 * @example
	 * ```typescript
	 * program.write('Hello');
	 * program.flush(); // Now 'Hello' appears on screen
	 * ```
	 */
	flush(): void {
		this.outputBuffer.flush(this._output);
	}

	/**
	 * Clear the screen.
	 *
	 * @example
	 * ```typescript
	 * program.clear();
	 * program.flush();
	 * ```
	 */
	clear(): void {
		this.write(screen.clear());
		this.write(cursor.home());
		this.outputBuffer.resetCursor();
	}

	// =========================================================================
	// CURSOR
	// =========================================================================

	/**
	 * Move cursor to absolute position.
	 *
	 * @param x - Column (1-indexed)
	 * @param y - Row (1-indexed)
	 *
	 * @example
	 * ```typescript
	 * program.move(10, 5);
	 * program.write('At position 10,5');
	 * program.flush();
	 * ```
	 */
	move(x: number, y: number): void {
		this.write(cursor.move(x, y));
	}

	/**
	 * Alias for move().
	 *
	 * @param x - Column (1-indexed)
	 * @param y - Row (1-indexed)
	 */
	cursorTo(x: number, y: number): void {
		this.move(x, y);
	}

	/**
	 * Show the cursor.
	 */
	showCursor(): void {
		this.write(cursor.show());
		this.cursorHidden = false;
	}

	/**
	 * Hide the cursor.
	 */
	hideCursor(): void {
		this.write(cursor.hide());
		this.cursorHidden = true;
	}

	// =========================================================================
	// TERMINAL
	// =========================================================================

	/**
	 * Set the terminal title.
	 *
	 * @param title - Title text
	 */
	setTitle(title: string): void {
		this.rawWrite(`\x1b]2;${title}\x07`);
	}

	/**
	 * Reset all text attributes.
	 */
	resetStyle(): void {
		this.write(style.reset());
	}

	// =========================================================================
	// PRIVATE METHODS
	// =========================================================================

	/**
	 * Update terminal dimensions.
	 */
	private updateDimensions(): void {
		if (this.config.forceWidth && this.config.forceHeight) {
			this._cols = this.config.forceWidth;
			this._rows = this.config.forceHeight;
			return;
		}

		if (this.isTTY(this._output)) {
			this._cols = this._output.columns ?? 80;
			this._rows = this._output.rows ?? 24;
		}
	}

	/**
	 * Handle terminal resize.
	 */
	private handleResize(): void {
		const oldCols = this._cols;
		const oldRows = this._rows;
		this.updateDimensions();

		if (this._cols !== oldCols || this._rows !== oldRows) {
			this.emit('resize', { cols: this._cols, rows: this._rows });
		}
	}

	/**
	 * Enable raw mode on stdin.
	 */
	private enableRawMode(): void {
		if (this.rawModeEnabled) {
			return;
		}

		if (this.isTTY(this._input) && 'setRawMode' in this._input) {
			(this._input as tty.ReadStream).setRawMode(true);
			this.rawModeEnabled = true;
		}
	}

	/**
	 * Disable raw mode on stdin.
	 */
	private disableRawMode(): void {
		if (!this.rawModeEnabled) {
			return;
		}

		if (this.isTTY(this._input) && 'setRawMode' in this._input) {
			(this._input as tty.ReadStream).setRawMode(false);
			this.rawModeEnabled = false;
		}
	}

	/**
	 * Restore terminal to normal state.
	 */
	private restoreTerminal(): void {
		// Show cursor if hidden
		if (this.cursorHidden) {
			this.rawWrite(cursor.show());
			this.cursorHidden = false;
		}

		// Reset styles
		this.rawWrite(style.reset());

		// Disable raw mode
		this.disableRawMode();
	}

	/**
	 * Check if stream is a TTY.
	 */
	private isTTY(stream: Readable | Writable): stream is tty.ReadStream | tty.WriteStream {
		return 'isTTY' in stream && stream.isTTY === true;
	}
}
