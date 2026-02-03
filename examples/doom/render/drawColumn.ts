/**
 * Low-level pixel drawing: converts palette-indexed pixels to RGB
 * via COLORMAP and PLAYPAL, then writes to the framebuffer.
 *
 * @module render/drawColumn
 */

import { three } from 'blecsd';
import type { RenderState } from './defs.js';

/**
 * Draw a single pixel at (x, y) using palette-indexed color with
 * light diminishing via colormap.
 *
 * @param rs - Render state (contains framebuffer, palette, colormap)
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param paletteIndex - Palette color index (0-255)
 * @param colormapIndex - Light level (0=bright, 31=dark)
 */
export function drawColumn(
	rs: RenderState,
	x: number,
	y: number,
	paletteIndex: number,
	colormapIndex: number,
): void {
	// Apply colormap (light diminishing)
	const cmap = rs.colormap[colormapIndex];
	const shadedIdx = cmap ? (cmap[paletteIndex] ?? paletteIndex) : paletteIndex;

	// Look up RGB from palette
	const color = rs.palette[shadedIdx];
	if (!color) return;

	three.setPixelUnsafe(rs.fb, x, y, color.r, color.g, color.b, 255);
}

/**
 * Draw a vertical run of a single palette color.
 * Optimized for drawing untextured wall columns.
 *
 * @param rs - Render state
 * @param x - Screen X coordinate
 * @param y1 - Start Y (inclusive)
 * @param y2 - End Y (inclusive)
 * @param paletteIndex - Palette color index
 * @param colormapIndex - Light level
 */
export function drawColumnRun(
	rs: RenderState,
	x: number,
	y1: number,
	y2: number,
	paletteIndex: number,
	colormapIndex: number,
): void {
	const cmap = rs.colormap[colormapIndex];
	const shadedIdx = cmap ? (cmap[paletteIndex] ?? paletteIndex) : paletteIndex;
	const color = rs.palette[shadedIdx];
	if (!color) return;

	const r = color.r;
	const g = color.g;
	const b = color.b;

	const startY = Math.max(0, y1);
	const endY = Math.min(rs.screenHeight - 1, y2);

	for (let y = startY; y <= endY; y++) {
		three.setPixelUnsafe(rs.fb, x, y, r, g, b, 255);
	}
}
