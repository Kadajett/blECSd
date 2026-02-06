/**
 * Program Module
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
import type { OutputBuffer } from './outputBuffer';
import { createOutputBuffer } from './outputBuffer';
import type { ScreenBuffer } from './screenBuffer';
import { createScreenBuffer } from './screenBuffer';

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
	[key: string]: unknown[];
}

// =============================================================================
// TYPED EVENT EMITTER (functional wrapper)
// =============================================================================

type EventMap = Record<string, unknown[]>;

interface TypedEmitter<T extends EventMap> {
	on<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void;
	off<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void;
	once<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void;
	emit<K extends keyof T & string>(event: K, ...args: T[K]): boolean;
	removeAllListeners<K extends keyof T & string>(event?: K): void;
}

function createTypedEmitter<T extends EventMap>(): TypedEmitter<T> {
	const emitter = new EventEmitter();

	return {
		on<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void {
			emitter.on(event, listener as (...args: unknown[]) => void);
		},
		off<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void {
			emitter.off(event, listener as (...args: unknown[]) => void);
		},
		once<K extends keyof T & string>(event: K, listener: (...args: T[K]) => void): void {
			emitter.once(event, listener as (...args: unknown[]) => void);
		},
		emit<K extends keyof T & string>(event: K, ...args: T[K]): boolean {
			return emitter.emit(event, ...args);
		},
		removeAllListeners<K extends keyof T & string>(event?: K): void {
			emitter.removeAllListeners(event);
		},
	};
}

// =============================================================================
// PROGRAM INTERFACE
// =============================================================================

/**
 * Program interface for type-safe access.
 *
 * Manages:
 * - Input/output streams
 * - Terminal dimensions
 * - Cursor position
 * - Buffered output
 * - Alternate screen buffer
 * - Event handling (key, mouse, resize)
 */
export interface Program {
	readonly input: Readable;
	readonly output: Writable;
	readonly cols: number;
	readonly rows: number;
	readonly x: number;
	readonly y: number;
	readonly initialized: boolean;
	on<K extends keyof ProgramEvents & string>(
		event: K,
		listener: (...args: ProgramEvents[K]) => void,
	): void;
	off<K extends keyof ProgramEvents & string>(
		event: K,
		listener: (...args: ProgramEvents[K]) => void,
	): void;
	once<K extends keyof ProgramEvents & string>(
		event: K,
		listener: (...args: ProgramEvents[K]) => void,
	): void;
	removeAllListeners<K extends keyof ProgramEvents & string>(event?: K): void;
	init(): Promise<void>;
	destroy(): void;
	write(data: string): void;
	rawWrite(data: string): void;
	flush(): void;
	clear(): void;
	move(x: number, y: number): void;
	cursorTo(x: number, y: number): void;
	showCursor(): void;
	hideCursor(): void;
	setTitle(title: string): void;
	resetStyle(): void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isTTY(stream: Readable | Writable): stream is tty.ReadStream | tty.WriteStream {
	return 'isTTY' in stream && stream.isTTY === true;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new Program instance.
 *
 * @param config - Program configuration
 * @returns A new Program instance
 *
 * @example
 * ```typescript
 * const program = createProgram();
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
export function createProgram(config: ProgramConfig = {}): Program {
	const resolvedConfig = ProgramConfigSchema.parse(config);
	const _input = resolvedConfig.input ?? process.stdin;
	const _output = resolvedConfig.output ?? process.stdout;
	const outputBuffer: OutputBuffer = createOutputBuffer({ trackCursor: true });
	const screenBuffer: ScreenBuffer = createScreenBuffer(_output);
	const emitter = createTypedEmitter<ProgramEvents>();

	let _cols = 80;
	let _rows = 24;
	let _initialized = false;
	let cursorHidden = false;
	let rawModeEnabled = false;

	function updateDimensions(): void {
		if (resolvedConfig.forceWidth && resolvedConfig.forceHeight) {
			_cols = resolvedConfig.forceWidth;
			_rows = resolvedConfig.forceHeight;
			return;
		}

		const outputTTY = _output as tty.WriteStream;
		if (isTTY(_output)) {
			_cols = outputTTY.columns ?? 80;
			_rows = outputTTY.rows ?? 24;
		}
	}

	function handleResize(): void {
		const oldCols = _cols;
		const oldRows = _rows;
		updateDimensions();

		if (_cols !== oldCols || _rows !== oldRows) {
			emitter.emit('resize', { cols: _cols, rows: _rows });
		}
	}

	function enableRawMode(): void {
		if (rawModeEnabled) {
			return;
		}

		if (isTTY(_input) && 'setRawMode' in _input) {
			(_input as tty.ReadStream).setRawMode(true);
			rawModeEnabled = true;
		}
	}

	function disableRawMode(): void {
		if (!rawModeEnabled) {
			return;
		}

		if (isTTY(_input) && 'setRawMode' in _input) {
			(_input as tty.ReadStream).setRawMode(false);
			rawModeEnabled = false;
		}
	}

	function restoreTerminal(): void {
		if (cursorHidden) {
			_output.write(cursor.show());
			cursorHidden = false;
		}
		_output.write(style.reset());
		disableRawMode();
	}

	const program: Program = {
		get input(): Readable {
			return _input;
		},

		get output(): Writable {
			return _output;
		},

		get cols(): number {
			return _cols;
		},

		get rows(): number {
			return _rows;
		},

		get x(): number {
			return outputBuffer.cursorX;
		},

		get y(): number {
			return outputBuffer.cursorY;
		},

		get initialized(): boolean {
			return _initialized;
		},

		on<K extends keyof ProgramEvents & string>(
			event: K,
			listener: (...args: ProgramEvents[K]) => void,
		): void {
			emitter.on(event, listener);
		},

		off<K extends keyof ProgramEvents & string>(
			event: K,
			listener: (...args: ProgramEvents[K]) => void,
		): void {
			emitter.off(event, listener);
		},

		once<K extends keyof ProgramEvents & string>(
			event: K,
			listener: (...args: ProgramEvents[K]) => void,
		): void {
			emitter.once(event, listener);
		},

		removeAllListeners<K extends keyof ProgramEvents & string>(event?: K): void {
			emitter.removeAllListeners(event);
		},

		async init(): Promise<void> {
			if (_initialized) {
				return;
			}

			updateDimensions();

			if (resolvedConfig.useAlternateScreen) {
				screenBuffer.enterAlternateScreen();
			}

			if (resolvedConfig.hideCursor) {
				_output.write(cursor.hide());
				cursorHidden = true;
			}

			if (resolvedConfig.title) {
				program.setTitle(resolvedConfig.title);
			}

			_output.write(screen.clear());
			_output.write(cursor.home());

			if (isTTY(_output)) {
				_output.on('resize', handleResize);
			}

			enableRawMode();

			screenBuffer.onCleanup(() => {
				restoreTerminal();
			});

			_initialized = true;
		},

		destroy(): void {
			if (!_initialized) {
				return;
			}

			restoreTerminal();
			screenBuffer.destroy();
			emitter.removeAllListeners();

			if (isTTY(_output)) {
				_output.off('resize', handleResize);
			}

			_initialized = false;
		},

		write(data: string): void {
			outputBuffer.write(data);
		},

		rawWrite(data: string): void {
			_output.write(data);
		},

		flush(): void {
			outputBuffer.flush(_output);
		},

		clear(): void {
			program.write(screen.clear());
			program.write(cursor.home());
			outputBuffer.resetCursor();
		},

		move(x: number, y: number): void {
			program.write(cursor.move(x, y));
		},

		cursorTo(x: number, y: number): void {
			program.move(x, y);
		},

		showCursor(): void {
			program.write(cursor.show());
			cursorHidden = false;
		},

		hideCursor(): void {
			program.write(cursor.hide());
			cursorHidden = true;
		},

		setTitle(title: string): void {
			_output.write(`\x1b]2;${title}\x07`);
		},

		resetStyle(): void {
			program.write(style.reset());
		},
	};

	return program;
}
