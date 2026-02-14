/**
 * ANSI Color Block Graphics Backend
 *
 * Implements a graphics backend using ANSI 256-color escape sequences
 * to render images as colored blocks. This is a fallback for terminals
 * that don't support native image protocols but have 256-color support.
 *
 * @module terminal/graphics/ansi
 */

import { cellMapToString, renderToAnsi } from '../../media/render/ansi';
import type {
	BackendName,
	GraphicsBackend,
	GraphicsCapabilities,
	ImageData,
	RenderOptions,
} from './backend';
import { detectAnsiSupport, type EnvChecker } from './detect';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * ANSI backend name.
 */
export const ANSI_BACKEND_NAME: BackendName = 'ansi';

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

/**
 * Builds a cursor positioning escape sequence.
 *
 * @param x - Column position (0-based)
 * @param y - Row position (0-based)
 * @returns ANSI CUP escape sequence (1-based)
 *
 * @example
 * ```typescript
 * import { cursorPosition } from 'blecsd';
 *
 * const seq = cursorPosition(10, 5);
 * // '\x1b[6;11H'
 * ```
 */
export function cursorPosition(x: number, y: number): string {
	return `\x1b[${y + 1};${x + 1}H`;
}

// =============================================================================
// RENDER HELPER
// =============================================================================

/**
 * Renders image data using ANSI 256-color blocks with positioning.
 *
 * Uses upper-half-block characters with foreground and background colors
 * to represent two vertical pixels per terminal cell.
 *
 * @param image - Image data (RGBA or RGB pixels)
 * @param options - Render options with position and size
 * @returns Complete escape sequence with cursor positioning and ANSI art
 *
 * @example
 * ```typescript
 * import { renderAnsiImage } from 'blecsd';
 *
 * const output = renderAnsiImage(
 *   { width: 100, height: 50, data: rgbaBuffer, format: 'rgba' },
 *   { x: 0, y: 0, width: 40, height: 20 },
 * );
 * process.stdout.write(output);
 * ```
 */
export function renderAnsiImage(image: ImageData, options: RenderOptions): string {
	// Convert ImageData to Bitmap format for renderToAnsi
	const bitmap = {
		width: image.width,
		height: image.height,
		data: image.data,
	};

	// Render to cell map
	const cellMap = renderToAnsi(bitmap, {
		width: options.width,
		height: options.height,
		mode: 'color',
		dither: false,
	});

	// Convert to ANSI string
	const ansiOutput = cellMapToString(cellMap);

	// Position cursor and output the image
	const pos = cursorPosition(options.x, options.y);
	return pos + ansiOutput;
}

/**
 * Generates a clear sequence for ANSI images.
 *
 * Since ANSI art doesn't have a dedicated clear command, this overwrites
 * the area with spaces to erase the image.
 *
 * @param options - Area to clear (x, y, width, height in cells)
 * @returns Escape sequence to blank the area
 *
 * @example
 * ```typescript
 * import { clearAnsiImage } from 'blecsd';
 *
 * const seq = clearAnsiImage({ x: 0, y: 0, width: 40, height: 20 });
 * process.stdout.write(seq);
 * ```
 */
export function clearAnsiImage(options?: {
	x: number;
	y: number;
	width: number;
	height: number;
}): string {
	if (!options) return '';
	const lines: string[] = [];
	for (let row = 0; row < options.height; row++) {
		lines.push(cursorPosition(options.x, options.y + row) + ' '.repeat(options.width));
	}
	return lines.join('');
}

// =============================================================================
// BACKEND FACTORY
// =============================================================================

/**
 * Creates an ANSI color block graphics backend.
 *
 * This backend uses 256-color ANSI escape sequences to render images
 * as colored blocks. Each terminal cell represents two vertical pixels.
 *
 * @param envChecker - Optional environment checker for testing
 * @returns A GraphicsBackend for ANSI color block rendering
 *
 * @example
 * ```typescript
 * import { createAnsiBackend, createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, createAnsiBackend());
 * ```
 */
export function createAnsiBackend(envChecker?: EnvChecker): GraphicsBackend {
	const capabilities: GraphicsCapabilities = {
		staticImages: true,
		animation: false,
		alphaChannel: true,
		maxWidth: null,
		maxHeight: null,
	};

	return {
		name: ANSI_BACKEND_NAME,
		capabilities,
		render: renderAnsiImage,
		clear: () => '',
		isSupported: () => detectAnsiSupport(envChecker),
	};
}
