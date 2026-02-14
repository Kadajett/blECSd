/**
 * Braille Pattern Graphics Backend
 *
 * Implements a graphics backend using Unicode braille pattern characters
 * for higher resolution image rendering. Each terminal cell represents a
 * 2x4 pixel grid using braille dots.
 *
 * This is the most universal fallback and works in almost all modern terminals.
 *
 * @module terminal/graphics/braille
 */

import { cellMapToString, renderToAnsi } from '../../media/render/ansi';
import type {
	BackendName,
	GraphicsBackend,
	GraphicsCapabilities,
	ImageData,
	RenderOptions,
} from './backend';
import { detectBrailleSupport, type EnvChecker } from './detect';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Braille backend name.
 */
export const BRAILLE_BACKEND_NAME: BackendName = 'braille';

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
 * Renders image data using braille patterns with positioning.
 *
 * Uses Unicode braille characters to represent a 2x4 pixel grid per cell,
 * providing higher resolution than color blocks.
 *
 * @param image - Image data (RGBA or RGB pixels)
 * @param options - Render options with position and size
 * @returns Complete escape sequence with cursor positioning and braille art
 *
 * @example
 * ```typescript
 * import { renderBrailleImage } from 'blecsd';
 *
 * const output = renderBrailleImage(
 *   { width: 100, height: 50, data: rgbaBuffer, format: 'rgba' },
 *   { x: 0, y: 0, width: 40, height: 20 },
 * );
 * process.stdout.write(output);
 * ```
 */
export function renderBrailleImage(image: ImageData, options: RenderOptions): string {
	// Convert ImageData to Bitmap format for renderToAnsi
	const bitmap = {
		width: image.width,
		height: image.height,
		data: image.data,
	};

	// Render to cell map using braille mode
	const cellMap = renderToAnsi(bitmap, {
		width: options.width,
		height: options.height,
		mode: 'braille',
		dither: false,
	});

	// Convert to ANSI string
	const brailleOutput = cellMapToString(cellMap);

	// Position cursor and output the image
	const pos = cursorPosition(options.x, options.y);
	return pos + brailleOutput;
}

/**
 * Generates a clear sequence for braille images.
 *
 * Since braille art doesn't have a dedicated clear command, this overwrites
 * the area with spaces to erase the image.
 *
 * @param options - Area to clear (x, y, width, height in cells)
 * @returns Escape sequence to blank the area
 *
 * @example
 * ```typescript
 * import { clearBrailleImage } from 'blecsd';
 *
 * const seq = clearBrailleImage({ x: 0, y: 0, width: 40, height: 20 });
 * process.stdout.write(seq);
 * ```
 */
export function clearBrailleImage(options?: {
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
 * Creates a braille pattern graphics backend.
 *
 * This backend uses Unicode braille characters to render images with
 * higher resolution. Each terminal cell represents a 2x4 pixel grid.
 *
 * Braille rendering requires Unicode support but works in almost all
 * modern terminals, making it the most universal fallback.
 *
 * @param envChecker - Optional environment checker for testing
 * @returns A GraphicsBackend for braille pattern rendering
 *
 * @example
 * ```typescript
 * import { createBrailleBackend, createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, createBrailleBackend());
 * ```
 */
export function createBrailleBackend(envChecker?: EnvChecker): GraphicsBackend {
	const capabilities: GraphicsCapabilities = {
		staticImages: true,
		animation: false,
		alphaChannel: true,
		maxWidth: null,
		maxHeight: null,
	};

	return {
		name: BRAILLE_BACKEND_NAME,
		capabilities,
		render: renderBrailleImage,
		clear: () => '',
		isSupported: () => detectBrailleSupport(envChecker),
	};
}
