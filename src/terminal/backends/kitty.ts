/**
 * Kitty Graphics Protocol Render Backend
 *
 * Extends the ANSI backend with support for the Kitty graphics protocol
 * for inline image rendering in supported terminals (Kitty, WezTerm, etc.).
 *
 * @module terminal/backends/kitty
 *
 * @example
 * ```typescript
 * import { createKittyRenderBackend } from 'blecsd';
 *
 * const backend = createKittyRenderBackend();
 * if (backend.detect()) {
 *   backend.init();
 *   const output = backend.renderBuffer(changes, 80, 24);
 *   process.stdout.write(output);
 * }
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
// CONSTANTS
// =============================================================================

const APC = '\x1b_G';
const ST = '\x1b\\';

// =============================================================================
// KITTY GRAPHICS PROTOCOL
// =============================================================================

/**
 * Encodes image data as a Kitty graphics protocol command.
 *
 * @param imageData - Base64-encoded image data (PNG/RGB)
 * @param options - Image display options
 * @returns Kitty graphics protocol escape sequence
 *
 * @example
 * ```typescript
 * import { encodeKittyImage } from 'blecsd';
 *
 * const data = Buffer.from(pngBytes).toString('base64');
 * const seq = encodeKittyImage(data, { width: 10, height: 5 });
 * process.stdout.write(seq);
 * ```
 */
export function encodeKittyImage(
	imageData: string,
	options?: {
		readonly width?: number;
		readonly height?: number;
		readonly format?: 'png' | 'rgb' | 'rgba';
	},
): string {
	const parts: string[] = ['a=T', 'f=100']; // Transmit, PNG format by default

	if (options?.format === 'rgb') parts[1] = 'f=24';
	if (options?.format === 'rgba') parts[1] = 'f=32';

	if (options?.width !== undefined) parts.push(`c=${options.width}`);
	if (options?.height !== undefined) parts.push(`r=${options.height}`);

	return `${APC}${parts.join(',')};${imageData}${ST}`;
}

// =============================================================================
// KITTY RENDER BACKEND
// =============================================================================

/**
 * Kitty backend configuration options.
 */
export interface KittyBackendConfig {
	/** Enable image rendering via Kitty protocol (default: true) */
	readonly images?: boolean;
}

/**
 * Creates a Kitty graphics protocol render backend.
 *
 * Extends standard ANSI rendering with Kitty-specific features:
 * - Inline image rendering via the Kitty graphics protocol
 * - Synchronized output to prevent flicker
 * - Styled underlines (curly, dotted, dashed)
 *
 * Falls back to ANSI rendering for standard text cells.
 *
 * @param config - Optional configuration
 * @returns A new RenderBackend using Kitty protocol extensions
 *
 * @example
 * ```typescript
 * import { createKittyRenderBackend } from 'blecsd';
 *
 * const backend = createKittyRenderBackend();
 *
 * if (backend.detect()) {
 *   const initSeq = backend.init();
 *   process.stdout.write(initSeq);
 * }
 * ```
 */
export function createKittyRenderBackend(config?: KittyBackendConfig): RenderBackend {
	const supportsImages = config?.images ?? true;
	let state = createRenderState();

	const capabilities: RenderBackendCapabilities = {
		truecolor: true,
		images: supportsImages,
		synchronizedOutput: true,
		styledUnderlines: true,
	};

	return {
		name: 'kitty',
		capabilities,

		detect(): boolean {
			// Check TERM_PROGRAM for Kitty
			const termProgram = process.env.TERM_PROGRAM ?? '';
			if (termProgram.toLowerCase() === 'kitty') return true;

			// Check for WezTerm (also supports Kitty protocol)
			const term = process.env.TERM ?? '';
			if (term.includes('wezterm') || termProgram.toLowerCase() === 'wezterm') return true;

			// Check KITTY_WINDOW_ID (non-empty)
			const kittyId = process.env.KITTY_WINDOW_ID;
			if (kittyId !== undefined && kittyId !== '') return true;

			return false;
		},

		init(): string {
			state = createRenderState();
			// Enter alternate screen, hide cursor, begin synchronized output
			return `${CSI}?1049h${CSI}?25l${CSI}?2026h`;
		},

		renderBuffer(changes: readonly RenderCell[]): string {
			if (changes.length === 0) return '';

			// Start synchronized output
			let output = `${CSI}?2026h`;

			const sorted = [...changes].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});

			for (const change of sorted) {
				const { x, y, cell } = change;

				output += generateCursorMove(state, x, y);
				output += generateStyleChanges(state, cell.fg, cell.bg, cell.attrs);
				output += cell.char;

				state.lastX = x + 1;
				state.lastY = y;
			}

			// End synchronized output
			output += `${CSI}?2026l`;
			return output;
		},

		cleanup(): string {
			state = createRenderState();
			return `${sgr(SGR.RESET)}${CSI}?2026l${CSI}?25h${CSI}?1049l`;
		},
	};
}
