/**
 * ANSI Render Backend
 *
 * Standard ANSI escape sequence renderer for 2D TUI output.
 * This is the default backend that works with virtually all modern terminals.
 * Extracted from the outputSystem's ANSI generation logic.
 *
 * @module terminal/backends/ansi
 *
 * @example
 * ```typescript
 * import { createAnsiBackend } from 'blecsd';
 *
 * const backend = createAnsiBackend();
 * backend.init();
 *
 * const output = backend.renderBuffer(changes, 80, 24);
 * process.stdout.write(output);
 * ```
 */

import {
	CSI,
	createRenderState,
	generateCursorMove,
	generateStyleChanges,
	SGR,
	sgr,
} from './helpers';
import type { RenderBackend, RenderBackendCapabilities, RenderCell } from './types';

// =============================================================================
// ANSI BACKEND
// =============================================================================

/**
 * ANSI backend configuration options.
 */
export interface AnsiBackendConfig {
	/** Enable truecolor output (default: true) */
	readonly truecolor?: boolean;
}

/**
 * Creates an ANSI render backend.
 *
 * The ANSI backend generates standard ANSI escape sequences for rendering
 * cell-based terminal UIs. It supports truecolor, text attributes,
 * and optimized cursor movement.
 *
 * @param config - Optional configuration
 * @returns A new RenderBackend using ANSI escape sequences
 *
 * @example
 * ```typescript
 * import { createAnsiBackend } from 'blecsd';
 *
 * const backend = createAnsiBackend();
 * console.log(backend.name); // 'ansi'
 * console.log(backend.detect()); // true (always supported)
 *
 * const initSeq = backend.init();
 * process.stdout.write(initSeq);
 * ```
 */
export function createAnsiBackend(config?: AnsiBackendConfig): RenderBackend {
	const truecolor = config?.truecolor ?? true;
	let state = createRenderState();

	const capabilities: RenderBackendCapabilities = {
		truecolor,
		images: false,
		synchronizedOutput: false,
		styledUnderlines: false,
	};

	return {
		name: 'ansi',
		capabilities,

		detect(): boolean {
			// ANSI is universally supported in modern terminals
			return true;
		},

		init(): string {
			state = createRenderState();
			// Enter alternate screen and hide cursor
			return `${CSI}?1049h${CSI}?25l`;
		},

		renderBuffer(changes: readonly RenderCell[]): string {
			if (changes.length === 0) return '';

			// Sort by row then column for optimal cursor movement
			const sorted = [...changes].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});

			let output = '';

			for (const change of sorted) {
				const { x, y, cell } = change;

				// Cursor movement
				output += generateCursorMove(state, x, y);

				// Style changes
				output += generateStyleChanges(state, cell.fg, cell.bg, cell.attrs);

				// Character
				output += cell.char;

				// Update cursor position (advance by 1 for single-width char)
				state.lastX = x + 1;
				state.lastY = y;
			}

			return output;
		},

		cleanup(): string {
			state = createRenderState();
			// Reset attributes, show cursor, leave alternate screen
			return `${sgr(SGR.RESET)}${CSI}?25h${CSI}?1049l`;
		},
	};
}
