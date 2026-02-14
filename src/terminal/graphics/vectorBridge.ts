/**
 * Vector-to-Pixel Bridge
 *
 * Converts BrailleCanvas vector drawings to pixel bitmaps for rendering
 * through high-fidelity graphics backends (Kitty, iTerm2, Sixel).
 * Falls back to braille character output when no pixel-capable backend
 * is available.
 *
 * @module terminal/graphics/vectorBridge
 */

import type { Bitmap } from '../../media/render/ansi';
import type { GraphicsManagerState, RenderOptions } from './backend';
import { getActiveBackend, renderImage } from './backend';
import type { BrailleCanvas } from './vector';
import { canvasToString } from './vector';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for rendering a vector canvas.
 *
 * @example
 * ```typescript
 * import type { VectorRenderOptions } from 'blecsd';
 *
 * const opts: VectorRenderOptions = {
 *   cellWidth: 8,
 *   cellHeight: 16,
 *   foreground: { r: 255, g: 255, b: 255 },
 *   background: { r: 0, g: 0, b: 0 },
 * };
 * ```
 */
export interface VectorRenderOptions {
	/** Width of a terminal cell in pixels (default: 8) */
	readonly cellWidth?: number;
	/** Height of a terminal cell in pixels (default: 16) */
	readonly cellHeight?: number;
	/** Foreground color for dots as RGB (default: white) */
	readonly foreground?: { readonly r: number; readonly g: number; readonly b: number };
	/** Background color as RGB (default: black) */
	readonly background?: { readonly r: number; readonly g: number; readonly b: number };
}

// =============================================================================
// PIXEL-CAPABLE BACKEND DETECTION
// =============================================================================

/** Backend names that support pixel-based rendering */
const PIXEL_CAPABLE_BACKENDS = new Set(['kitty', 'iterm2', 'sixel']);

/**
 * Checks if the active backend supports pixel-based rendering.
 *
 * @param manager - Graphics manager state
 * @returns true if the active backend can render pixel bitmaps
 *
 * @example
 * ```typescript
 * import { createAutoGraphicsManager, hasPixelBackend } from 'blecsd';
 *
 * const manager = createAutoGraphicsManager();
 * if (hasPixelBackend(manager)) {
 *   // Can render at full pixel resolution
 * }
 * ```
 */
export function hasPixelBackend(manager: GraphicsManagerState): boolean {
	const backend = getActiveBackend(manager);
	if (!backend) return false;
	return PIXEL_CAPABLE_BACKENDS.has(backend.name);
}

// =============================================================================
// CANVAS TO BITMAP CONVERSION
// =============================================================================

/** Resolves the RGB color for a dot, using per-cell color or default foreground */
function resolveDotColor(
	canvas: BrailleCanvas,
	dotX: number,
	dotY: number,
	fg: { readonly r: number; readonly g: number; readonly b: number },
): { r: number; g: number; b: number } {
	const cellX = Math.floor(dotX / 2);
	const cellY = Math.floor(dotY / 4);
	const cellIdx = cellY * canvas.widthCells + cellX;
	const cellColor = canvas.colors[cellIdx];

	if (cellColor !== undefined && cellColor !== 0) {
		return {
			r: (cellColor >>> 16) & 0xff,
			g: (cellColor >>> 8) & 0xff,
			b: cellColor & 0xff,
		};
	}
	return { r: fg.r, g: fg.g, b: fg.b };
}

/** Fills a rectangular region of pixels in the bitmap data with a solid color */
function fillDotPixels(
	data: Uint8Array,
	pixelWidth: number,
	pixelHeight: number,
	startPx: number,
	startPy: number,
	dotW: number,
	dotH: number,
	r: number,
	g: number,
	b: number,
): void {
	const endPy = Math.min(startPy + dotH, pixelHeight);
	const endPx = Math.min(startPx + dotW, pixelWidth);
	for (let py = startPy; py < endPy; py++) {
		for (let px = startPx; px < endPx; px++) {
			const pixIdx = (py * pixelWidth + px) * 4;
			data[pixIdx] = r;
			data[pixIdx + 1] = g;
			data[pixIdx + 2] = b;
			data[pixIdx + 3] = 255;
		}
	}
}

/**
 * Converts a BrailleCanvas to an RGBA pixel bitmap.
 *
 * Each dot in the braille canvas maps to a rectangular pixel area
 * determined by the cell dimensions. Set dots are rendered in the
 * foreground color, unset dots in the background color.
 *
 * @param canvas - The braille canvas to convert
 * @param options - Rendering options (cell size, colors)
 * @returns An RGBA bitmap suitable for graphics backend rendering
 *
 * @example
 * ```typescript
 * import { createBrailleCanvas, drawLine, canvasToPixelBitmap } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawLine(canvas, 0, 0, 79, 79, 0xffffffff);
 *
 * const bitmap = canvasToPixelBitmap(canvas, {
 *   cellWidth: 8,
 *   cellHeight: 16,
 * });
 * ```
 */
export function canvasToPixelBitmap(
	canvas: BrailleCanvas,
	options: VectorRenderOptions = {},
): Bitmap {
	const cellW = options.cellWidth ?? 8;
	const cellH = options.cellHeight ?? 16;
	const fg = options.foreground ?? { r: 255, g: 255, b: 255 };
	const bg = options.background ?? { r: 0, g: 0, b: 0 };

	// Each dot maps to a pixel area:
	// A cell is cellW x cellH pixels, a cell has 2x4 dots
	// So each dot is (cellW/2) x (cellH/4) pixels
	const dotW = Math.max(1, Math.floor(cellW / 2));
	const dotH = Math.max(1, Math.floor(cellH / 4));

	const pixelWidth = canvas.widthDots * dotW;
	const pixelHeight = canvas.heightDots * dotH;
	const data = new Uint8Array(pixelWidth * pixelHeight * 4);

	// Fill with background first
	for (let i = 0; i < data.length; i += 4) {
		data[i] = bg.r;
		data[i + 1] = bg.g;
		data[i + 2] = bg.b;
		data[i + 3] = 255;
	}

	// Render each set dot as a filled rectangle of pixels
	const totalDots = canvas.widthDots * canvas.heightDots;
	for (let dotIdx = 0; dotIdx < totalDots; dotIdx++) {
		const byteIdx = dotIdx >>> 3;
		const bitIdx = dotIdx & 7;
		const byteVal = canvas.dots[byteIdx];
		if (byteVal === undefined) continue;
		if (!((byteVal >>> bitIdx) & 1)) continue;

		const dotX = dotIdx % canvas.widthDots;
		const dotY = Math.floor(dotIdx / canvas.widthDots);
		const color = resolveDotColor(canvas, dotX, dotY, fg);

		fillDotPixels(
			data,
			pixelWidth,
			pixelHeight,
			dotX * dotW,
			dotY * dotH,
			dotW,
			dotH,
			color.r,
			color.g,
			color.b,
		);
	}

	return { width: pixelWidth, height: pixelHeight, data };
}

// =============================================================================
// UNIFIED VECTOR RENDERING
// =============================================================================

/**
 * Renders a BrailleCanvas using the best available method.
 *
 * If a pixel-capable backend (Kitty, iTerm2, Sixel) is available, converts
 * the canvas to a pixel bitmap and renders it at full resolution through
 * the graphics protocol. Otherwise, falls back to braille character output.
 *
 * @param canvas - The braille canvas to render
 * @param manager - Graphics manager with registered backends
 * @param position - Position for image placement (used in pixel mode)
 * @param options - Rendering options
 * @returns Terminal output string (escape sequences or braille characters)
 *
 * @example
 * ```typescript
 * import {
 *   createBrailleCanvas,
 *   drawBrailleLine,
 *   fillBrailleCircle,
 *   createAutoGraphicsManager,
 *   renderVector,
 * } from 'blecsd';
 *
 * const canvas = createBrailleCanvas(40, 20);
 * drawBrailleLine(canvas, 0, 0, 79, 79, 0xffffffff);
 * fillBrailleCircle(canvas, 40, 40, 20, 0xff00ff00);
 *
 * const manager = createAutoGraphicsManager();
 * const output = renderVector(canvas, manager, { x: 0, y: 0 });
 * process.stdout.write(output);
 * ```
 */
export function renderVector(
	canvas: BrailleCanvas,
	manager: GraphicsManagerState,
	position: Pick<RenderOptions, 'x' | 'y'>,
	options: VectorRenderOptions = {},
): string {
	if (!hasPixelBackend(manager)) {
		// Fallback to braille character output
		return canvasToString(canvas);
	}

	// Convert to pixel bitmap and render through graphics backend
	const bitmap = canvasToPixelBitmap(canvas, options);

	return renderImage(
		manager,
		{
			width: bitmap.width,
			height: bitmap.height,
			data: bitmap.data,
			format: 'rgba',
		},
		{
			x: position.x,
			y: position.y,
			width: canvas.widthCells,
			height: canvas.heightCells,
		},
	);
}
