/**
 * Terminal Widget
 *
 * High-level terminal emulator widget that embeds a terminal buffer for
 * displaying ANSI content and optionally spawning shell processes via PTY.
 *
 * @module widgets/terminal
 *
 * @example
 * ```typescript
 * import { createTerminal } from 'blecsd/widgets';
 *
 * // Create a terminal widget
 * const terminal = createTerminal(world, {
 *   width: 80,
 *   height: 24,
 *   scrollback: 1000,
 *   border: { type: 'line' },
 * });
 *
 * // Write ANSI content
 * terminal.write('\x1b[31mRed text\x1b[0m\n');
 * terminal.writeln('Hello, world!');
 *
 * // Spawn a shell (requires node-pty)
 * terminal.spawn('/bin/bash');
 *
 * // Handle output
 * terminal.onData((data) => console.log('Output:', data));
 * terminal.onExit((code) => console.log('Exited:', code));
 * ```
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import {
	type CursorShape,
	clearTerminal,
	getTerminalBuffer,
	getTerminalCells,
	getTerminalState,
	removeTerminalBuffer,
	resetTerminal,
	resizeTerminalBuffer,
	scrollTerminalDown,
	scrollTerminalToBottom,
	scrollTerminalToTop,
	scrollTerminalUp,
	setCursorPosition,
	setCursorVisible,
	setTerminalBuffer,
	type TerminalBufferConfig,
	type TerminalState,
	writeToTerminal,
} from '../components/terminalBuffer';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Cell } from '../terminal/screen/cell';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Border configuration for terminal widget.
 */
export interface BorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Style configuration for terminal widget.
 */
export interface TerminalStyle {
	/** Foreground color (default text) */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
}

/**
 * Configuration for creating a Terminal widget.
 */
export interface TerminalConfig {
	/** Terminal width in columns (default: 80) */
	readonly width?: number;
	/** Terminal height in rows (default: 24) */
	readonly height?: number;
	/** Maximum scrollback lines (default: 1000) */
	readonly scrollback?: number;
	/** Cursor blink enabled (default: true) */
	readonly cursorBlink?: boolean;
	/** Cursor shape (default: 'block') */
	readonly cursorShape?: CursorShape;

	// Position
	/** Left position */
	readonly left?: PositionValue;
	/** Top position */
	readonly top?: PositionValue;

	// Style
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Style configuration */
	readonly style?: TerminalStyle;

	// Input
	/** Enable mouse input (default: true) */
	readonly mouse?: boolean;
	/** Enable keyboard input (default: true) */
	readonly keys?: boolean;
}

/**
 * PTY process options for spawning a shell.
 */
export interface PtyOptions {
	/** Shell to spawn (default: $SHELL or /bin/sh) */
	readonly shell?: string;
	/** Arguments to pass to the shell */
	readonly args?: readonly string[];
	/** Environment variables */
	readonly env?: Record<string, string>;
	/** Working directory */
	readonly cwd?: string;
}

/**
 * Internal state for PTY process management.
 */
interface PtyState {
	/** PTY process instance (if spawned) */
	pty: unknown | null;
	/** Data callback */
	onDataCallback: ((data: string) => void) | null;
	/** Exit callback */
	onExitCallback: ((code: number, signal?: number) => void) | null;
}

/**
 * Terminal widget interface providing chainable methods.
 */
export interface TerminalWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// ==========================================================================
	// Content
	// ==========================================================================

	/** Writes data to the terminal (processes ANSI escape sequences) */
	write(data: string): TerminalWidget;
	/** Writes a line to the terminal (appends newline) */
	writeln(data: string): TerminalWidget;
	/** Clears the terminal buffer */
	clear(): TerminalWidget;
	/** Resets the terminal to initial state */
	reset(): TerminalWidget;

	// ==========================================================================
	// Scrolling
	// ==========================================================================

	/** Scrolls up by the given number of lines */
	scrollUp(lines?: number): TerminalWidget;
	/** Scrolls down by the given number of lines */
	scrollDown(lines?: number): TerminalWidget;
	/** Scrolls to the top of history */
	scrollToTop(): TerminalWidget;
	/** Scrolls to the bottom (current view) */
	scrollToBottom(): TerminalWidget;

	// ==========================================================================
	// Cursor
	// ==========================================================================

	/** Sets cursor position */
	setCursor(x: number, y: number): TerminalWidget;
	/** Shows the cursor */
	showCursor(): TerminalWidget;
	/** Hides the cursor */
	hideCursor(): TerminalWidget;

	// ==========================================================================
	// PTY Process
	// ==========================================================================

	/** Spawns a shell process (requires node-pty) */
	spawn(options?: PtyOptions | string): TerminalWidget;
	/** Sends input to the PTY process */
	input(data: string): TerminalWidget;
	/** Resizes the PTY (and terminal buffer) */
	resize(cols: number, rows: number): TerminalWidget;
	/** Kills the PTY process */
	kill(signal?: string): TerminalWidget;
	/** Checks if a PTY process is running */
	isRunning(): boolean;

	// ==========================================================================
	// Events
	// ==========================================================================

	/** Registers a callback for PTY output data */
	onData(callback: (data: string) => void): TerminalWidget;
	/** Registers a callback for PTY process exit */
	onExit(callback: (code: number, signal?: number) => void): TerminalWidget;

	// ==========================================================================
	// Visibility
	// ==========================================================================

	/** Shows the terminal */
	show(): TerminalWidget;
	/** Hides the terminal */
	hide(): TerminalWidget;

	// ==========================================================================
	// Focus
	// ==========================================================================

	/** Focuses the terminal */
	focus(): TerminalWidget;
	/** Blurs the terminal */
	blur(): TerminalWidget;
	/** Checks if the terminal is focused */
	isFocused(): boolean;

	// ==========================================================================
	// State Access
	// ==========================================================================

	/** Gets terminal dimensions */
	getDimensions(): { width: number; height: number };
	/** Gets cursor position */
	getCursor(): { x: number; y: number };
	/** Gets the terminal state (for advanced use) */
	getState(): TerminalState | undefined;
	/** Gets the cell buffer (for rendering) */
	getCells(): readonly Cell[] | undefined;

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	/** Destroys the widget and releases resources */
	destroy(): void;
	/** Marks the widget as dirty (needs re-render) */
	refresh(): TerminalWidget;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z
	.object({
		type: z.enum(['line', 'bg', 'none']).optional(),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		ch: z
			.union([
				z.enum(['single', 'double', 'rounded', 'bold', 'ascii']),
				z.custom<BorderCharset>((val) => {
					return (
						typeof val === 'object' &&
						val !== null &&
						'topLeft' in val &&
						'topRight' in val &&
						'bottomLeft' in val &&
						'bottomRight' in val &&
						'horizontal' in val &&
						'vertical' in val
					);
				}),
			])
			.optional(),
	})
	.optional();

/**
 * Zod schema for terminal widget configuration.
 */
export const TerminalConfigSchema = z.object({
	width: z.number().int().positive().default(80),
	height: z.number().int().positive().default(24),
	scrollback: z.number().int().nonnegative().default(1000),
	cursorBlink: z.boolean().default(true),
	cursorShape: z.enum(['block', 'underline', 'bar']).default('block'),
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	border: BorderConfigSchema,
	style: z
		.object({
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
	mouse: z.boolean().default(true),
	keys: z.boolean().default(true),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Terminal widget marker component.
 */
export const Terminal = {
	/** Tag indicating this is a terminal widget (1 = yes) */
	isTerminal: new Uint8Array(DEFAULT_CAPACITY),
	/** Mouse input enabled (1 = yes) */
	mouseEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Keyboard input enabled (1 = yes) */
	keysEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Map of entity ID to PTY state */
const ptyStateMap = new Map<Entity, PtyState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a position value to a number.
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Converts border type string to BorderType enum.
 */
function borderTypeToEnum(type: 'line' | 'bg' | 'none'): BorderType {
	switch (type) {
		case 'line':
			return BorderType.Line;
		case 'bg':
			return BorderType.Background;
		case 'none':
			return BorderType.None;
	}
}

/**
 * Gets the appropriate BorderCharset for a named style.
 */
function getBorderCharset(ch: 'single' | 'double' | 'rounded' | 'bold' | 'ascii'): BorderCharset {
	switch (ch) {
		case 'single':
			return BORDER_SINGLE;
		case 'double':
			return BORDER_DOUBLE;
		case 'rounded':
			return BORDER_ROUNDED;
		case 'bold':
			return BORDER_BOLD;
		case 'ascii':
			return BORDER_ASCII;
	}
}

/**
 * node-pty interface (subset we use).
 * Defined here to avoid requiring the actual types.
 */
interface NodePtyModule {
	spawn(
		shell: string,
		args: string[],
		options: {
			name: string;
			cols: number;
			rows: number;
			cwd?: string;
			env?: Record<string, string>;
		},
	): {
		onData: (callback: (data: string) => void) => void;
		onExit: (callback: (e: { exitCode: number; signal?: number }) => void) => void;
		write: (data: string) => void;
		resize: (cols: number, rows: number) => void;
		kill: (signal?: string) => void;
	};
}

/**
 * Tries to load node-pty dynamically from multiple locations.
 * Returns null if not available.
 */
function tryLoadNodePty(): NodePtyModule | null {
	// Try multiple resolution strategies for finding node-pty
	const strategies = [
		// 1. Try from the current working directory (where the app is run from)
		() => createRequire(pathToFileURL(`${process.cwd()}/`).href)('node-pty'),
		// 2. Try from this module's location (library location)
		() => createRequire(import.meta.url)('node-pty'),
		// 3. Try from main module if available
		() => {
			const mainPath = process.argv[1];
			if (mainPath) {
				return createRequire(pathToFileURL(mainPath).href)('node-pty');
			}
			throw new Error('No main module');
		},
	];

	for (const strategy of strategies) {
		try {
			return strategy() as NodePtyModule;
		} catch {
			// Try next strategy
		}
	}

	return null;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Terminal widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns Terminal widget interface
 *
 * @example
 * ```typescript
 * import { createTerminal } from 'blecsd/widgets';
 *
 * const terminal = createTerminal(world, {
 *   width: 80,
 *   height: 24,
 *   border: { type: 'line' },
 * });
 *
 * // Write content
 * terminal.writeln('Hello, Terminal!');
 *
 * // Spawn a shell
 * terminal.spawn('/bin/bash');
 * terminal.onData((data) => console.log(data));
 * ```
 */
export function createTerminal(world: World, config: TerminalConfig = {}): TerminalWidget {
	const validated = TerminalConfigSchema.parse(config);

	// Create entity
	const eid = addEntity(world);

	// Mark as terminal widget
	Terminal.isTerminal[eid] = 1;
	Terminal.mouseEnabled[eid] = validated.mouse ? 1 : 0;
	Terminal.keysEnabled[eid] = validated.keys ? 1 : 0;

	// Set position
	const x = parsePositionToNumber(validated.left);
	const y = parsePositionToNumber(validated.top);
	setPosition(world, eid, x, y);

	// Calculate dimensions (add 2 for border if present)
	const hasBorder = validated.border !== undefined && validated.border.type !== 'none';
	const displayWidth = validated.width + (hasBorder ? 2 : 0);
	const displayHeight = validated.height + (hasBorder ? 2 : 0);
	setDimensions(world, eid, displayWidth, displayHeight);

	// Set up terminal buffer
	const bufferConfig: TerminalBufferConfig = {
		width: validated.width,
		height: validated.height,
		scrollbackLines: validated.scrollback,
		cursorBlink: validated.cursorBlink,
		cursorShape: validated.cursorShape,
		cursorVisible: true,
	};
	setTerminalBuffer(world, eid, bufferConfig);

	// Set style
	if (validated.style) {
		setStyle(world, eid, {
			fg: validated.style.fg !== undefined ? parseColor(validated.style.fg) : undefined,
			bg: validated.style.bg !== undefined ? parseColor(validated.style.bg) : undefined,
		});
	}
	setVisible(world, eid, true);

	// Set border
	if (validated.border) {
		const borderType = validated.border.type
			? borderTypeToEnum(validated.border.type)
			: BorderType.Line;

		setBorder(world, eid, {
			type: borderType,
			fg: validated.border.fg !== undefined ? parseColor(validated.border.fg) : undefined,
			bg: validated.border.bg !== undefined ? parseColor(validated.border.bg) : undefined,
		});

		if (validated.border.ch) {
			const charset =
				typeof validated.border.ch === 'string'
					? getBorderCharset(validated.border.ch)
					: validated.border.ch;
			setBorderChars(world, eid, charset);
		}
	}

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Initialize PTY state
	const ptyState: PtyState = {
		pty: null,
		onDataCallback: null,
		onExitCallback: null,
	};
	ptyStateMap.set(eid, ptyState);

	// Create widget interface
	const widget: TerminalWidget = {
		eid,

		// Content
		write(data: string): TerminalWidget {
			writeToTerminal(world, eid, data);
			return widget;
		},

		writeln(data: string): TerminalWidget {
			writeToTerminal(world, eid, `${data}\n`);
			return widget;
		},

		clear(): TerminalWidget {
			clearTerminal(world, eid);
			return widget;
		},

		reset(): TerminalWidget {
			resetTerminal(world, eid);
			return widget;
		},

		// Scrolling
		scrollUp(lines = 1): TerminalWidget {
			scrollTerminalUp(world, eid, lines);
			return widget;
		},

		scrollDown(lines = 1): TerminalWidget {
			scrollTerminalDown(world, eid, lines);
			return widget;
		},

		scrollToTop(): TerminalWidget {
			scrollTerminalToTop(world, eid);
			return widget;
		},

		scrollToBottom(): TerminalWidget {
			scrollTerminalToBottom(world, eid);
			return widget;
		},

		// Cursor
		setCursor(cursorX: number, cursorY: number): TerminalWidget {
			setCursorPosition(world, eid, cursorX, cursorY);
			return widget;
		},

		showCursor(): TerminalWidget {
			setCursorVisible(world, eid, true);
			return widget;
		},

		hideCursor(): TerminalWidget {
			setCursorVisible(world, eid, false);
			return widget;
		},

		// PTY Process
		spawn(options?: PtyOptions | string): TerminalWidget {
			const nodePty = tryLoadNodePty();
			if (!nodePty) {
				console.warn('node-pty is not installed. Install it with: pnpm add node-pty');
				return widget;
			}

			// Kill existing process if any
			if (ptyState.pty) {
				widget.kill();
			}

			// Parse options
			let shell: string;
			let args: string[] = [];
			let env: Record<string, string> = { ...process.env } as Record<string, string>;
			let cwd: string | undefined;

			if (typeof options === 'string') {
				shell = options;
			} else if (options) {
				shell = options.shell ?? process.env.SHELL ?? '/bin/sh';
				args = options.args ? [...options.args] : [];
				env = options.env ? ({ ...process.env, ...options.env } as Record<string, string>) : env;
				cwd = options.cwd;
			} else {
				shell = process.env.SHELL ?? '/bin/sh';
			}

			// Get terminal dimensions
			const buffer = getTerminalBuffer(eid);
			const cols = buffer?.width ?? 80;
			const rows = buffer?.height ?? 24;

			// Spawn PTY
			const pty = nodePty.spawn(shell, args, {
				name: 'xterm-256color',
				cols,
				rows,
				cwd,
				env,
			});

			ptyState.pty = pty;

			// Handle PTY output
			pty.onData((data: string) => {
				// Write to terminal buffer
				writeToTerminal(world, eid, data);

				// Call user callback
				if (ptyState.onDataCallback) {
					ptyState.onDataCallback(data);
				}
			});

			// Handle PTY exit
			pty.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
				ptyState.pty = null;

				if (ptyState.onExitCallback) {
					ptyState.onExitCallback(exitCode, signal);
				}
			});

			return widget;
		},

		input(data: string): TerminalWidget {
			const pty = ptyState.pty as { write: (data: string) => void } | null;
			if (pty) {
				pty.write(data);
			}
			return widget;
		},

		resize(cols: number, rows: number): TerminalWidget {
			// Resize terminal buffer
			resizeTerminalBuffer(world, eid, cols, rows);

			// Resize PTY if running
			const pty = ptyState.pty as { resize: (cols: number, rows: number) => void } | null;
			if (pty) {
				pty.resize(cols, rows);
			}

			// Update widget dimensions
			const hasBorderNow = validated.border !== undefined && validated.border.type !== 'none';
			const newDisplayWidth = cols + (hasBorderNow ? 2 : 0);
			const newDisplayHeight = rows + (hasBorderNow ? 2 : 0);
			setDimensions(world, eid, newDisplayWidth, newDisplayHeight);

			markDirty(world, eid);
			return widget;
		},

		kill(signal = 'SIGTERM'): TerminalWidget {
			const pty = ptyState.pty as { kill: (signal?: string) => void } | null;
			if (pty) {
				pty.kill(signal);
				ptyState.pty = null;
			}
			return widget;
		},

		isRunning(): boolean {
			return ptyState.pty !== null;
		},

		// Events
		onData(callback: (data: string) => void): TerminalWidget {
			ptyState.onDataCallback = callback;
			return widget;
		},

		onExit(callback: (code: number, signal?: number) => void): TerminalWidget {
			ptyState.onExitCallback = callback;
			return widget;
		},

		// Visibility
		show(): TerminalWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TerminalWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Focus
		focus(): TerminalWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TerminalWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// State Access
		getDimensions(): { width: number; height: number } {
			const buffer = getTerminalBuffer(eid);
			return {
				width: buffer?.width ?? 0,
				height: buffer?.height ?? 0,
			};
		},

		getCursor(): { x: number; y: number } {
			const buffer = getTerminalBuffer(eid);
			return {
				x: buffer?.cursorX ?? 0,
				y: buffer?.cursorY ?? 0,
			};
		},

		getState(): TerminalState | undefined {
			return getTerminalState(eid);
		},

		getCells(): readonly Cell[] | undefined {
			return getTerminalCells(eid);
		},

		// Lifecycle
		destroy(): void {
			// Kill PTY if running
			widget.kill();

			// Clean up
			Terminal.isTerminal[eid] = 0;
			Terminal.mouseEnabled[eid] = 0;
			Terminal.keysEnabled[eid] = 0;
			removeTerminalBuffer(eid);
			ptyStateMap.delete(eid);
			removeEntity(world, eid);
		},

		refresh(): TerminalWidget {
			markDirty(world, eid);
			return widget;
		},
	};

	// Mark dirty for initial render
	markDirty(world, eid);

	return widget;
}

// =============================================================================
// KEYBOARD HANDLER
// =============================================================================

/**
 * Handles keyboard input for a Terminal widget.
 *
 * @param widget - The terminal widget
 * @param key - Key name
 * @param char - Character (if printable)
 * @param ctrl - Control key pressed
 * @param alt - Alt key pressed
 * @param shift - Shift key pressed
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { createTerminal, handleTerminalKey } from 'blecsd/widgets';
 *
 * const terminal = createTerminal(world, config);
 *
 * // In your input handler
 * if (handleTerminalKey(terminal, event.key, event.char, event.ctrl, event.alt, event.shift)) {
 *   // Key was handled
 * }
 * ```
 */
export function handleTerminalKey(
	widget: TerminalWidget,
	key: string,
	char?: string,
	ctrl = false,
	alt = false,
	_shift = false,
): boolean {
	// If PTY is running, forward input
	if (widget.isRunning()) {
		// Handle special keys
		if (key === 'return' || key === 'enter') {
			widget.input('\r');
			return true;
		}
		if (key === 'backspace') {
			widget.input('\x7f');
			return true;
		}
		if (key === 'tab') {
			widget.input('\t');
			return true;
		}
		if (key === 'escape') {
			widget.input('\x1b');
			return true;
		}

		// Arrow keys
		if (key === 'up') {
			widget.input('\x1b[A');
			return true;
		}
		if (key === 'down') {
			widget.input('\x1b[B');
			return true;
		}
		if (key === 'right') {
			widget.input('\x1b[C');
			return true;
		}
		if (key === 'left') {
			widget.input('\x1b[D');
			return true;
		}

		// Home/End
		if (key === 'home') {
			widget.input('\x1b[H');
			return true;
		}
		if (key === 'end') {
			widget.input('\x1b[F');
			return true;
		}

		// Page up/down
		if (key === 'pageup') {
			widget.input('\x1b[5~');
			return true;
		}
		if (key === 'pagedown') {
			widget.input('\x1b[6~');
			return true;
		}

		// Delete/Insert
		if (key === 'delete') {
			widget.input('\x1b[3~');
			return true;
		}
		if (key === 'insert') {
			widget.input('\x1b[2~');
			return true;
		}

		// Ctrl+key combinations
		if (ctrl && char) {
			const code = char.toUpperCase().charCodeAt(0) - 64;
			if (code >= 0 && code <= 31) {
				widget.input(String.fromCharCode(code));
				return true;
			}
		}

		// Alt+key combinations
		if (alt && char) {
			widget.input(`\x1b${char}`);
			return true;
		}

		// Regular character
		if (char && !ctrl && !alt) {
			widget.input(char);
			return true;
		}

		return false;
	}

	// PTY not running - handle scroll keys
	switch (key) {
		case 'pageup':
			widget.scrollUp(widget.getDimensions().height);
			return true;
		case 'pagedown':
			widget.scrollDown(widget.getDimensions().height);
			return true;
		case 'home':
			if (ctrl) {
				widget.scrollToTop();
				return true;
			}
			break;
		case 'end':
			if (ctrl) {
				widget.scrollToBottom();
				return true;
			}
			break;
	}

	return false;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a Terminal widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a terminal widget
 */
export function isTerminal(_world: World, eid: Entity): boolean {
	return Terminal.isTerminal[eid] === 1;
}

/**
 * Checks if mouse input is enabled for a terminal.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if mouse input is enabled
 */
export function isTerminalMouseEnabled(_world: World, eid: Entity): boolean {
	return Terminal.mouseEnabled[eid] === 1;
}

/**
 * Checks if keyboard input is enabled for a terminal.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if keyboard input is enabled
 */
export function isTerminalKeysEnabled(_world: World, eid: Entity): boolean {
	return Terminal.keysEnabled[eid] === 1;
}

/**
 * Resets the Terminal component store. Useful for testing.
 * @internal
 */
export function resetTerminalStore(): void {
	Terminal.isTerminal.fill(0);
	Terminal.mouseEnabled.fill(0);
	Terminal.keysEnabled.fill(0);
	ptyStateMap.clear();
}
