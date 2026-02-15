/**
 * Type definitions for Terminal Widget.
 *
 * @module widgets/terminal/types
 */

import type { BorderCharset } from '../../components/border';
import type { CursorShape } from '../../components/terminalBuffer';
import type { Entity } from '../../core/types';
import type { Cell } from '../../terminal/screen/cell';

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
export interface PtyState {
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

	// Content
	/** Writes data to the terminal (processes ANSI escape sequences) */
	write(data: string): TerminalWidget;
	/** Writes a line to the terminal (appends newline) */
	writeln(data: string): TerminalWidget;
	/** Clears the terminal buffer */
	clear(): TerminalWidget;
	/** Resets the terminal to initial state */
	reset(): TerminalWidget;

	// Scrolling
	/** Scrolls up by the given number of lines */
	scrollUp(lines?: number): TerminalWidget;
	/** Scrolls down by the given number of lines */
	scrollDown(lines?: number): TerminalWidget;
	/** Scrolls to the top of history */
	scrollToTop(): TerminalWidget;
	/** Scrolls to the bottom (current view) */
	scrollToBottom(): TerminalWidget;

	// Cursor
	/** Sets cursor position */
	setCursor(x: number, y: number): TerminalWidget;
	/** Shows the cursor */
	showCursor(): TerminalWidget;
	/** Hides the cursor */
	hideCursor(): TerminalWidget;

	// PTY Process
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

	// Events
	/** Registers a callback for PTY output data */
	onData(callback: (data: string) => void): TerminalWidget;
	/** Registers a callback for PTY process exit */
	onExit(callback: (code: number, signal?: number) => void): TerminalWidget;

	// Visibility
	/** Shows the terminal */
	show(): TerminalWidget;
	/** Hides the terminal */
	hide(): TerminalWidget;

	// Focus
	/** Focuses the terminal */
	focus(): TerminalWidget;
	/** Blurs the terminal */
	blur(): TerminalWidget;
	/** Checks if the terminal is focused */
	isFocused(): boolean;

	// State Access
	/** Gets terminal dimensions */
	getDimensions(): { width: number; height: number };
	/** Gets cursor position */
	getCursor(): { x: number; y: number };
	/** Gets the terminal state (for advanced use) */
	getState(): import('../../components/terminalBuffer').TerminalState | undefined;
	/** Gets the cell buffer (for rendering) */
	getCells(): readonly Cell[] | undefined;

	// Lifecycle
	/** Destroys the widget and releases resources */
	destroy(): void;
	/** Marks the widget as dirty (needs re-render) */
	refresh(): TerminalWidget;
}
