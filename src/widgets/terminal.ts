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
	readonly type?: 'line' | 'bg' | 'none' | undefined;
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number | undefined;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number | undefined;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset | undefined;
}

/**
 * Style configuration for terminal widget.
 */
export interface TerminalStyle {
	/** Foreground color (default text) */
	readonly fg?: string | number | undefined;
	/** Background color */
	readonly bg?: string | number | undefined;
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
 *
 * @example
 * ```typescript
 * import { createTerminal } from 'blecsd/widgets';
 *
 * const terminal = createTerminal(world, {
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Spawn with full PTY configuration
 * terminal.spawn({
 *   shell: '/bin/bash',
 *   args: ['--login'],
 *   env: { CUSTOM_VAR: 'value' },
 *   cwd: '/home/user',
 *   term: 'xterm-256color',
 *   cols: 80,
 *   rows: 24,
 *   autoResize: true,
 * });
 * ```
 */
export interface PtyOptions {
	/** Shell to spawn (default: $SHELL or /bin/sh) */
	readonly shell?: string;
	/** Arguments to pass to the shell */
	readonly args?: readonly string[];
	/** Environment variables (merged with process.env) */
	readonly env?: Record<string, string>;
	/** Working directory (default: process.cwd()) */
	readonly cwd?: string;
	/** TERM environment variable (default: 'xterm-256color') */
	readonly term?: string;
	/** Initial columns (default: widget width) */
	readonly cols?: number;
	/** Initial rows (default: widget height) */
	readonly rows?: number;
	/** Auto-resize PTY when widget resizes (default: true) */
	readonly autoResize?: boolean;
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
	/** Auto-resize PTY when widget resizes */
	autoResize: boolean;
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
	/** Gets the raw PTY handle for direct control (advanced use) */
	getPtyHandle(): unknown | null;

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
 * Zod schema for PTY options.
 *
 * @example
 * ```typescript
 * import { PtyOptionsSchema } from 'blecsd/widgets';
 *
 * const options = PtyOptionsSchema.parse({
 *   shell: '/bin/bash',
 *   args: ['--login'],
 *   env: { CUSTOM_VAR: 'value' },
 *   cwd: '/home/user',
 *   term: 'xterm-256color',
 *   cols: 80,
 *   rows: 24,
 *   autoResize: true,
 * });
 * ```
 */
export const PtyOptionsSchema = z.object({
	shell: z.string().min(1).optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional(),
	cwd: z.string().min(1).optional(),
	term: z.string().min(1).default('xterm-256color'),
	cols: z.number().int().positive().optional(),
	rows: z.number().int().positive().optional(),
	autoResize: z.boolean().default(true),
});

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
 * Parsed spawn options for PTY creation.
 */
interface ParsedSpawnOptions {
	readonly shell: string;
	readonly args: string[];
	readonly env: Record<string, string>;
	readonly cwd: string | undefined;
	readonly term: string;
	readonly cols: number | undefined;
	readonly rows: number | undefined;
	readonly autoResize: boolean;
}

/**
 * Parses spawn options into a normalized format.
 */
function parseSpawnOptions(options?: PtyOptions | string): ParsedSpawnOptions {
	const defaultShell = process.env.SHELL ?? '/bin/sh';
	const defaultEnv = { ...process.env } as Record<string, string>;

	if (typeof options === 'string') {
		return {
			shell: options,
			args: [],
			env: defaultEnv,
			cwd: undefined,
			term: 'xterm-256color',
			cols: undefined,
			rows: undefined,
			autoResize: true,
		};
	}

	if (!options) {
		return {
			shell: defaultShell,
			args: [],
			env: defaultEnv,
			cwd: undefined,
			term: 'xterm-256color',
			cols: undefined,
			rows: undefined,
			autoResize: true,
		};
	}

	// Validate and parse options with Zod
	const validated = PtyOptionsSchema.parse(options);

	return {
		shell: validated.shell ?? defaultShell,
		args: validated.args ?? [],
		env: validated.env
			? ({ ...process.env, ...validated.env } as Record<string, string>)
			: defaultEnv,
		cwd: validated.cwd,
		term: validated.term,
		cols: validated.cols,
		rows: validated.rows,
		autoResize: validated.autoResize,
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
// FACTORY HELPERS
// =============================================================================

/**
 * Sets up the border configuration for a terminal widget.
 */
function setupTerminalBorder(
	world: World,
	eid: Entity,
	borderConfig: BorderConfig | undefined,
): void {
	if (!borderConfig) {
		return;
	}

	const borderType = borderConfig.type ? borderTypeToEnum(borderConfig.type) : BorderType.Line;

	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});

	if (borderConfig.ch) {
		const charset =
			typeof borderConfig.ch === 'string' ? getBorderCharset(borderConfig.ch) : borderConfig.ch;
		setBorderChars(world, eid, charset);
	}
}

/**
 * Sets up the style configuration for a terminal widget.
 */
function setupTerminalStyle(world: World, eid: Entity, style: TerminalStyle | undefined): void {
	if (!style) {
		return;
	}

	setStyle(world, eid, {
		fg: style.fg !== undefined ? parseColor(style.fg) : undefined,
		bg: style.bg !== undefined ? parseColor(style.bg) : undefined,
	});
}

/**
 * Calculates display dimensions including border if present.
 */
function calculateDisplayDimensions(
	width: number,
	height: number,
	borderConfig: BorderConfig | undefined,
): { displayWidth: number; displayHeight: number } {
	const hasBorder = borderConfig !== undefined && borderConfig.type !== 'none';
	return {
		displayWidth: width + (hasBorder ? 2 : 0),
		displayHeight: height + (hasBorder ? 2 : 0),
	};
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

	// Calculate and set dimensions
	const { displayWidth, displayHeight } = calculateDisplayDimensions(
		validated.width,
		validated.height,
		validated.border,
	);
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

	// Set style and visibility
	setupTerminalStyle(world, eid, validated.style);
	setVisible(world, eid, true);

	// Set border
	setupTerminalBorder(world, eid, validated.border);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Initialize PTY state
	const ptyState: PtyState = {
		pty: null,
		onDataCallback: null,
		onExitCallback: null,
		autoResize: true,
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
			const {
				shell,
				args,
				env,
				cwd,
				term,
				cols: optCols,
				rows: optRows,
				autoResize,
			} = parseSpawnOptions(options);

			// Get terminal dimensions (use options if provided, otherwise widget dimensions)
			const buffer = getTerminalBuffer(world, eid);
			const cols = optCols ?? buffer?.width ?? 80;
			const rows = optRows ?? buffer?.height ?? 24;

			// Store auto-resize setting
			ptyState.autoResize = autoResize;

			// Spawn PTY
			const pty = nodePty.spawn(shell, args, {
				name: term,
				cols,
				rows,
				...(cwd !== undefined ? { cwd } : {}),
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

			// Resize PTY if running and autoResize is enabled
			const pty = ptyState.pty as { resize: (cols: number, rows: number) => void } | null;
			if (pty && ptyState.autoResize) {
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

		getPtyHandle(): unknown | null {
			return ptyState.pty;
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
			const buffer = getTerminalBuffer(world, eid);
			return {
				width: buffer?.width ?? 0,
				height: buffer?.height ?? 0,
			};
		},

		getCursor(): { x: number; y: number } {
			const buffer = getTerminalBuffer(world, eid);
			return {
				x: buffer?.cursorX ?? 0,
				y: buffer?.cursorY ?? 0,
			};
		},

		getState(): TerminalState | undefined {
			return getTerminalState(world, eid);
		},

		getCells(): readonly Cell[] | undefined {
			return getTerminalCells(world, eid);
		},

		// Lifecycle
		destroy(): void {
			// Kill PTY if running
			widget.kill();

			// Clean up
			Terminal.isTerminal[eid] = 0;
			Terminal.mouseEnabled[eid] = 0;
			Terminal.keysEnabled[eid] = 0;
			removeTerminalBuffer(world, eid);
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
// KEYBOARD HANDLER HELPERS
// =============================================================================

/**
 * Lookup table for special key escape sequences.
 */
const SPECIAL_KEY_SEQUENCES: Record<string, string> = {
	return: '\r',
	enter: '\r',
	backspace: '\x7f',
	tab: '\t',
	escape: '\x1b',
	up: '\x1b[A',
	down: '\x1b[B',
	right: '\x1b[C',
	left: '\x1b[D',
	home: '\x1b[H',
	end: '\x1b[F',
	pageup: '\x1b[5~',
	pagedown: '\x1b[6~',
	delete: '\x1b[3~',
	insert: '\x1b[2~',
} as const;

/**
 * Handles special key input for PTY.
 */
function handleSpecialKey(widget: TerminalWidget, key: string): boolean {
	const sequence = SPECIAL_KEY_SEQUENCES[key];
	if (sequence) {
		widget.input(sequence);
		return true;
	}
	return false;
}

/**
 * Handles control key combinations.
 */
function handleCtrlKey(widget: TerminalWidget, char: string | undefined): boolean {
	if (!char) {
		return false;
	}

	const code = char.toUpperCase().charCodeAt(0) - 64;
	if (code >= 0 && code <= 31) {
		widget.input(String.fromCharCode(code));
		return true;
	}

	return false;
}

/**
 * Handles alt key combinations.
 */
function handleAltKey(widget: TerminalWidget, char: string | undefined): boolean {
	if (!char) {
		return false;
	}

	widget.input(`\x1b${char}`);
	return true;
}

/**
 * Handles PTY input for running terminal.
 */
function handlePtyInput(
	widget: TerminalWidget,
	key: string,
	char: string | undefined,
	ctrl: boolean,
	alt: boolean,
): boolean {
	// Special keys
	if (handleSpecialKey(widget, key)) {
		return true;
	}

	// Ctrl combinations
	if (ctrl && handleCtrlKey(widget, char)) {
		return true;
	}

	// Alt combinations
	if (alt && handleAltKey(widget, char)) {
		return true;
	}

	// Regular character
	if (char && !ctrl && !alt) {
		widget.input(char);
		return true;
	}

	return false;
}

/**
 * Handles scroll navigation when PTY is not running.
 */
function handleScrollKeys(widget: TerminalWidget, key: string, ctrl: boolean): boolean {
	if (key === 'pageup') {
		widget.scrollUp(widget.getDimensions().height);
		return true;
	}

	if (key === 'pagedown') {
		widget.scrollDown(widget.getDimensions().height);
		return true;
	}

	if (key === 'home' && ctrl) {
		widget.scrollToTop();
		return true;
	}

	if (key === 'end' && ctrl) {
		widget.scrollToBottom();
		return true;
	}

	return false;
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
		return handlePtyInput(widget, key, char, ctrl, alt);
	}

	// PTY not running - handle scroll keys
	return handleScrollKeys(widget, key, ctrl);
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
