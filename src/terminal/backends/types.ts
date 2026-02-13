/**
 * 2D TUI Render Backend Interface
 *
 * Defines the contract for terminal rendering backends that convert
 * screen buffer data into terminal output. Similar to the 3D module's
 * RendererBackend but designed for cell-based 2D TUI rendering.
 *
 * @module terminal/backends/types
 *
 * @example
 * ```typescript
 * import { createAnsiBackend } from 'blecsd';
 *
 * const backend = createAnsiBackend();
 * backend.init();
 *
 * // Render a buffer
 * const output = backend.renderBuffer(cells, width, height);
 * process.stdout.write(output);
 *
 * backend.cleanup();
 * ```
 */

import type { Cell } from '../screen/cell';

/**
 * Supported 2D render backend types.
 */
export type RenderBackendType = 'ansi' | 'kitty';

/**
 * Capabilities reported by a render backend.
 */
export interface RenderBackendCapabilities {
	/** Whether the backend supports true 24-bit color */
	readonly truecolor: boolean;
	/** Whether the backend supports image rendering */
	readonly images: boolean;
	/** Whether the backend supports synchronized output */
	readonly synchronizedOutput: boolean;
	/** Whether the backend supports styled underlines */
	readonly styledUnderlines: boolean;
}

/**
 * A cell change to render, with position and cell data.
 */
export interface RenderCell {
	/** Column position (0-indexed) */
	readonly x: number;
	/** Row position (0-indexed) */
	readonly y: number;
	/** Cell data to render */
	readonly cell: Cell;
}

/**
 * Interface that all 2D TUI render backends must implement.
 *
 * Backends convert cell-based screen buffer data into terminal output strings.
 * They handle ANSI escape sequences, cursor management, and protocol-specific
 * features.
 *
 * @example
 * ```typescript
 * import { createAnsiBackend, type RenderBackend } from 'blecsd';
 *
 * const backend: RenderBackend = createAnsiBackend();
 * const supported = backend.detect();
 * if (supported) {
 *   backend.init();
 *   const output = backend.renderBuffer(changes, 80, 24);
 *   process.stdout.write(output);
 * }
 * ```
 */
export interface RenderBackend {
	/** Backend name identifier */
	readonly name: RenderBackendType;
	/** Backend capabilities */
	readonly capabilities: RenderBackendCapabilities;

	/**
	 * Detects if this backend is supported in the current terminal.
	 *
	 * @returns true if the backend can be used
	 */
	detect(): boolean;

	/**
	 * Initializes the backend. Called once before any rendering.
	 * May emit terminal setup sequences (alternate screen, etc.).
	 *
	 * @returns Initialization escape sequence string, or empty string
	 */
	init(): string;

	/**
	 * Renders a set of cell changes to a terminal output string.
	 *
	 * @param changes - Array of cell changes to render
	 * @param width - Screen width in columns
	 * @param height - Screen height in rows
	 * @returns Terminal output string with escape sequences
	 */
	renderBuffer(changes: readonly RenderCell[], width: number, height: number): string;

	/**
	 * Cleans up the backend. Called once when rendering is done.
	 * Should restore terminal state.
	 *
	 * @returns Cleanup escape sequence string, or empty string
	 */
	cleanup(): string;
}
