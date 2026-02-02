/**
 * Screen Region Operations
 *
 * Provides high-level region clearing, filling, and copying operations
 * for screen buffers. These utilities build on the core cell operations
 * to provide convenient region manipulation.
 *
 * @module terminal/screen/regions
 *
 * @example
 * ```typescript
 * import {
 *   clearRegion,
 *   fillRegion,
 *   copyRegionInBuffer,
 *   blankLine,
 * } from 'blecsd';
 *
 * // Clear a rectangular region
 * clearRegion(buffer, 10, 5, 20, 10);
 *
 * // Fill with a specific cell
 * fillRegion(buffer, 0, 0, 80, 1, createCell(' ', 0xffffffff, 0x0000ffff));
 *
 * // Copy a region within the same buffer (for scrolling)
 * copyRegionInBuffer(buffer, 0, 1, 0, 0, 80, 23);
 *
 * // Blank a single line
 * blankLine(buffer, 24);
 * ```
 */

import type { AttrFlags, Cell, ScreenBufferData } from './cell';
import { Attr, cloneCell, createCell, DEFAULT_BG, DEFAULT_FG } from './cell';

/**
 * Region bounds descriptor.
 */
export interface RegionBounds {
	/** Left edge X coordinate */
	readonly x: number;
	/** Top edge Y coordinate */
	readonly y: number;
	/** Width of region */
	readonly width: number;
	/** Height of region */
	readonly height: number;
}

/**
 * Clears a rectangular region of the buffer with empty cells.
 * This sets all cells in the region to space characters with default colors.
 *
 * @param buffer - The screen buffer
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param width - Width of region
 * @param height - Height of region
 * @param fg - Optional foreground color for cleared cells (default: white)
 * @param bg - Optional background color for cleared cells (default: black)
 * @param attrs - Optional attributes for cleared cells (default: none)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, clearRegion } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Clear a 20x10 region at position (10, 5)
 * clearRegion(buffer, 10, 5, 20, 10);
 *
 * // Clear with custom background color
 * clearRegion(buffer, 0, 0, 80, 1, 0xffffffff, 0x0000ffff);
 * ```
 */
export function clearRegion(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	fg: number = DEFAULT_FG,
	bg: number = DEFAULT_BG,
	attrs: AttrFlags = Attr.NONE,
): void {
	// Clamp to buffer bounds
	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(buffer.width, Math.floor(x + width));
	const y2 = Math.min(buffer.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return; // Empty region
	}

	const clearCell: Cell = { char: ' ', fg, bg, attrs };

	for (let row = y1; row < y2; row++) {
		for (let col = x1; col < x2; col++) {
			const idx = row * buffer.width + col;
			buffer.cells[idx] = cloneCell(clearCell);
		}
	}
}

/**
 * Fills a rectangular region of the buffer with a specific cell.
 *
 * @param buffer - The screen buffer
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param width - Width of region
 * @param height - Height of region
 * @param cell - Cell to fill with
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, fillRegion, createCell, Attr } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Fill status bar with blue background
 * fillRegion(buffer, 0, 23, 80, 1, createCell(' ', 0xffffffff, 0x0000ffff));
 *
 * // Fill a box with red X characters
 * fillRegion(buffer, 10, 5, 20, 10, createCell('X', 0xff0000ff, 0x000000ff));
 * ```
 */
export function fillRegion(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	cell: Cell,
): void {
	// Clamp to buffer bounds
	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(buffer.width, Math.floor(x + width));
	const y2 = Math.min(buffer.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return; // Empty region
	}

	for (let row = y1; row < y2; row++) {
		for (let col = x1; col < x2; col++) {
			const idx = row * buffer.width + col;
			buffer.cells[idx] = cloneCell(cell);
		}
	}
}

/**
 * Copies a rectangular region within the same buffer.
 * Handles overlapping regions correctly by using a temporary buffer
 * when source and destination overlap.
 *
 * This is useful for implementing scrolling within a buffer.
 *
 * @param buffer - The screen buffer
 * @param srcX - Source X coordinate
 * @param srcY - Source Y coordinate
 * @param dstX - Destination X coordinate
 * @param dstY - Destination Y coordinate
 * @param width - Width to copy
 * @param height - Height to copy
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, copyRegionInBuffer } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Scroll content up by one line (copy line 1+ to line 0+)
 * copyRegionInBuffer(buffer, 0, 1, 0, 0, 80, 23);
 *
 * // Scroll content down by one line (copy line 0-22 to line 1-23)
 * copyRegionInBuffer(buffer, 0, 0, 0, 1, 80, 23);
 * ```
 */
export function copyRegionInBuffer(
	buffer: ScreenBufferData,
	srcX: number,
	srcY: number,
	dstX: number,
	dstY: number,
	width: number,
	height: number,
): void {
	// Clamp source to buffer bounds
	const srcX1 = Math.max(0, Math.floor(srcX));
	const srcY1 = Math.max(0, Math.floor(srcY));
	const srcX2 = Math.min(buffer.width, Math.floor(srcX + width));
	const srcY2 = Math.min(buffer.height, Math.floor(srcY + height));

	if (srcX2 <= srcX1 || srcY2 <= srcY1) {
		return; // Empty source region
	}

	// Adjust destination based on source clamping
	const adjDstX = Math.floor(dstX) + (srcX1 - Math.floor(srcX));
	const adjDstY = Math.floor(dstY) + (srcY1 - Math.floor(srcY));

	// Calculate actual copy dimensions
	const copyW = srcX2 - srcX1;
	const copyH = srcY2 - srcY1;

	// Clamp destination to buffer bounds
	const dstX1 = Math.max(0, adjDstX);
	const dstY1 = Math.max(0, adjDstY);
	const dstX2 = Math.min(buffer.width, adjDstX + copyW);
	const dstY2 = Math.min(buffer.height, adjDstY + copyH);

	if (dstX2 <= dstX1 || dstY2 <= dstY1) {
		return; // Empty destination region
	}

	// Final copy dimensions
	const finalW = dstX2 - dstX1;
	const finalH = dstY2 - dstY1;
	const finalSrcX = srcX1 + (dstX1 - adjDstX);
	const finalSrcY = srcY1 + (dstY1 - adjDstY);

	// Check for overlap - if regions overlap, use temp buffer
	const overlaps =
		finalSrcX < dstX2 && dstX1 < finalSrcX + finalW && finalSrcY < dstY2 && dstY1 < finalSrcY + finalH;

	if (overlaps) {
		// Copy to temp buffer first
		const temp: Cell[] = new Array(finalW * finalH);
		for (let row = 0; row < finalH; row++) {
			for (let col = 0; col < finalW; col++) {
				const srcIdx = (finalSrcY + row) * buffer.width + (finalSrcX + col);
				const srcCell = buffer.cells[srcIdx];
				if (srcCell) {
					temp[row * finalW + col] = cloneCell(srcCell);
				}
			}
		}
		// Copy from temp to destination
		for (let row = 0; row < finalH; row++) {
			for (let col = 0; col < finalW; col++) {
				const dstIdx = (dstY1 + row) * buffer.width + (dstX1 + col);
				const tempCell = temp[row * finalW + col];
				if (tempCell) {
					buffer.cells[dstIdx] = tempCell;
				}
			}
		}
	} else {
		// No overlap, copy directly
		for (let row = 0; row < finalH; row++) {
			for (let col = 0; col < finalW; col++) {
				const srcIdx = (finalSrcY + row) * buffer.width + (finalSrcX + col);
				const dstIdx = (dstY1 + row) * buffer.width + (dstX1 + col);
				const srcCell = buffer.cells[srcIdx];
				if (srcCell) {
					buffer.cells[dstIdx] = cloneCell(srcCell);
				}
			}
		}
	}
}

/**
 * Blanks (clears) a single line in the buffer.
 * Sets the entire line to space characters with specified or default styling.
 *
 * @param buffer - The screen buffer
 * @param y - Line number (0-indexed)
 * @param fg - Optional foreground color (default: white)
 * @param bg - Optional background color (default: black)
 * @param attrs - Optional attributes (default: none)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, blankLine } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Blank line 5
 * blankLine(buffer, 5);
 *
 * // Blank with blue background (for status bar)
 * blankLine(buffer, 23, 0xffffffff, 0x0000ffff);
 * ```
 */
export function blankLine(
	buffer: ScreenBufferData,
	y: number,
	fg: number = DEFAULT_FG,
	bg: number = DEFAULT_BG,
	attrs: AttrFlags = Attr.NONE,
): void {
	const row = Math.floor(y);
	if (row < 0 || row >= buffer.height) {
		return; // Out of bounds
	}

	const clearCell: Cell = { char: ' ', fg, bg, attrs };
	const startIdx = row * buffer.width;

	for (let col = 0; col < buffer.width; col++) {
		buffer.cells[startIdx + col] = cloneCell(clearCell);
	}
}

/**
 * Blanks multiple lines in the buffer.
 *
 * @param buffer - The screen buffer
 * @param startY - First line to blank (0-indexed)
 * @param count - Number of lines to blank
 * @param fg - Optional foreground color (default: white)
 * @param bg - Optional background color (default: black)
 * @param attrs - Optional attributes (default: none)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, blankLines } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Blank lines 20-23 (bottom 4 lines)
 * blankLines(buffer, 20, 4);
 *
 * // Blank with colored background
 * blankLines(buffer, 0, 2, 0xffffffff, 0x333333ff);
 * ```
 */
export function blankLines(
	buffer: ScreenBufferData,
	startY: number,
	count: number,
	fg: number = DEFAULT_FG,
	bg: number = DEFAULT_BG,
	attrs: AttrFlags = Attr.NONE,
): void {
	const y1 = Math.max(0, Math.floor(startY));
	const y2 = Math.min(buffer.height, Math.floor(startY + count));

	for (let y = y1; y < y2; y++) {
		blankLine(buffer, y, fg, bg, attrs);
	}
}

/**
 * Scrolls a region of the buffer up by a specified number of lines.
 * Empty lines are filled at the bottom of the region.
 *
 * @param buffer - The screen buffer
 * @param x - Left edge of scroll region
 * @param y - Top edge of scroll region
 * @param width - Width of scroll region
 * @param height - Height of scroll region
 * @param lines - Number of lines to scroll (default: 1)
 * @param fillCell - Cell to use for newly exposed lines (default: empty)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, scrollRegionUp } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Scroll entire buffer up by 1 line
 * scrollRegionUp(buffer, 0, 0, 80, 24, 1);
 *
 * // Scroll a 40x10 region up by 3 lines
 * scrollRegionUp(buffer, 10, 5, 40, 10, 3);
 * ```
 */
export function scrollRegionUp(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	lines: number = 1,
	fillCell?: Cell,
): void {
	const scrollLines = Math.floor(lines);
	if (scrollLines <= 0) {
		return;
	}

	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(buffer.width, Math.floor(x + width));
	const y2 = Math.min(buffer.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return;
	}

	const regionW = x2 - x1;
	const regionH = y2 - y1;

	if (scrollLines >= regionH) {
		// Scroll amount is >= region height, just clear the region
		clearRegion(buffer, x1, y1, regionW, regionH);
		return;
	}

	// Copy lines upward
	const linesToCopy = regionH - scrollLines;
	for (let row = 0; row < linesToCopy; row++) {
		const srcRow = y1 + scrollLines + row;
		const dstRow = y1 + row;
		for (let col = x1; col < x2; col++) {
			const srcIdx = srcRow * buffer.width + col;
			const dstIdx = dstRow * buffer.width + col;
			const srcCell = buffer.cells[srcIdx];
			if (srcCell) {
				buffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Clear newly exposed lines at bottom
	const fill = fillCell ?? createCell();
	for (let row = 0; row < scrollLines; row++) {
		const clearRow = y2 - scrollLines + row;
		for (let col = x1; col < x2; col++) {
			const idx = clearRow * buffer.width + col;
			buffer.cells[idx] = cloneCell(fill);
		}
	}
}

/**
 * Scrolls a region of the buffer down by a specified number of lines.
 * Empty lines are filled at the top of the region.
 *
 * @param buffer - The screen buffer
 * @param x - Left edge of scroll region
 * @param y - Top edge of scroll region
 * @param width - Width of scroll region
 * @param height - Height of scroll region
 * @param lines - Number of lines to scroll (default: 1)
 * @param fillCell - Cell to use for newly exposed lines (default: empty)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, scrollRegionDown } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Scroll entire buffer down by 1 line
 * scrollRegionDown(buffer, 0, 0, 80, 24, 1);
 *
 * // Scroll a 40x10 region down by 3 lines
 * scrollRegionDown(buffer, 10, 5, 40, 10, 3);
 * ```
 */
export function scrollRegionDown(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	lines: number = 1,
	fillCell?: Cell,
): void {
	const scrollLines = Math.floor(lines);
	if (scrollLines <= 0) {
		return;
	}

	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(buffer.width, Math.floor(x + width));
	const y2 = Math.min(buffer.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return;
	}

	const regionW = x2 - x1;
	const regionH = y2 - y1;

	if (scrollLines >= regionH) {
		// Scroll amount is >= region height, just clear the region
		clearRegion(buffer, x1, y1, regionW, regionH);
		return;
	}

	// Copy lines downward (work from bottom to avoid overwriting)
	const linesToCopy = regionH - scrollLines;
	for (let row = linesToCopy - 1; row >= 0; row--) {
		const srcRow = y1 + row;
		const dstRow = y1 + scrollLines + row;
		for (let col = x1; col < x2; col++) {
			const srcIdx = srcRow * buffer.width + col;
			const dstIdx = dstRow * buffer.width + col;
			const srcCell = buffer.cells[srcIdx];
			if (srcCell) {
				buffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Clear newly exposed lines at top
	const fill = fillCell ?? createCell();
	for (let row = 0; row < scrollLines; row++) {
		const clearRow = y1 + row;
		for (let col = x1; col < x2; col++) {
			const idx = clearRow * buffer.width + col;
			buffer.cells[idx] = cloneCell(fill);
		}
	}
}

/**
 * Inserts blank lines at the specified position, pushing content down.
 * Content that would go beyond the region is discarded.
 *
 * @param buffer - The screen buffer
 * @param y - Line number to insert at
 * @param count - Number of lines to insert
 * @param regionBottom - Bottom boundary (exclusive, default: buffer height)
 * @param fillCell - Cell to use for inserted lines (default: empty)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, insertLines } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Insert 3 blank lines at line 5
 * insertLines(buffer, 5, 3);
 *
 * // Insert within a region (lines 5-15)
 * insertLines(buffer, 5, 2, 15);
 * ```
 */
export function insertLines(
	buffer: ScreenBufferData,
	y: number,
	count: number,
	regionBottom?: number,
	fillCell?: Cell,
): void {
	const insertY = Math.floor(y);
	const insertCount = Math.floor(count);
	const bottom = regionBottom !== undefined ? Math.min(buffer.height, Math.floor(regionBottom)) : buffer.height;

	if (insertY < 0 || insertY >= bottom || insertCount <= 0) {
		return;
	}

	// Scroll region down from insertY to bottom
	scrollRegionDown(buffer, 0, insertY, buffer.width, bottom - insertY, insertCount, fillCell);
}

/**
 * Deletes lines at the specified position, pulling content up.
 * Empty lines are added at the bottom of the region.
 *
 * @param buffer - The screen buffer
 * @param y - Line number to delete from
 * @param count - Number of lines to delete
 * @param regionBottom - Bottom boundary (exclusive, default: buffer height)
 * @param fillCell - Cell to use for empty lines at bottom (default: empty)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, deleteLines } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Delete 2 lines starting at line 5
 * deleteLines(buffer, 5, 2);
 *
 * // Delete within a region (lines 5-15)
 * deleteLines(buffer, 5, 2, 15);
 * ```
 */
export function deleteLines(
	buffer: ScreenBufferData,
	y: number,
	count: number,
	regionBottom?: number,
	fillCell?: Cell,
): void {
	const deleteY = Math.floor(y);
	const deleteCount = Math.floor(count);
	const bottom = regionBottom !== undefined ? Math.min(buffer.height, Math.floor(regionBottom)) : buffer.height;

	if (deleteY < 0 || deleteY >= bottom || deleteCount <= 0) {
		return;
	}

	// Scroll region up from deleteY to bottom
	scrollRegionUp(buffer, 0, deleteY, buffer.width, bottom - deleteY, deleteCount, fillCell);
}

/**
 * Computes the intersection of two regions.
 *
 * @param a - First region
 * @param b - Second region
 * @returns Intersection region, or null if no overlap
 *
 * @example
 * ```typescript
 * import { intersectRegions } from 'blecsd';
 *
 * const a = { x: 0, y: 0, width: 20, height: 10 };
 * const b = { x: 10, y: 5, width: 20, height: 10 };
 *
 * const overlap = intersectRegions(a, b);
 * // { x: 10, y: 5, width: 10, height: 5 }
 * ```
 */
export function intersectRegions(a: RegionBounds, b: RegionBounds): RegionBounds | null {
	const x1 = Math.max(a.x, b.x);
	const y1 = Math.max(a.y, b.y);
	const x2 = Math.min(a.x + a.width, b.x + b.width);
	const y2 = Math.min(a.y + a.height, b.y + b.height);

	if (x2 <= x1 || y2 <= y1) {
		return null; // No overlap
	}

	return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Computes the union (bounding box) of two regions.
 *
 * @param a - First region
 * @param b - Second region
 * @returns Bounding box containing both regions
 *
 * @example
 * ```typescript
 * import { unionRegions } from 'blecsd';
 *
 * const a = { x: 0, y: 0, width: 10, height: 10 };
 * const b = { x: 15, y: 5, width: 10, height: 10 };
 *
 * const bbox = unionRegions(a, b);
 * // { x: 0, y: 0, width: 25, height: 15 }
 * ```
 */
export function unionRegions(a: RegionBounds, b: RegionBounds): RegionBounds {
	const x1 = Math.min(a.x, b.x);
	const y1 = Math.min(a.y, b.y);
	const x2 = Math.max(a.x + a.width, b.x + b.width);
	const y2 = Math.max(a.y + a.height, b.y + b.height);

	return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Checks if a point is inside a region.
 *
 * @param region - The region to check
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if point is inside region
 *
 * @example
 * ```typescript
 * import { isPointInRegion } from 'blecsd';
 *
 * const region = { x: 10, y: 5, width: 20, height: 10 };
 * console.log(isPointInRegion(region, 15, 8)); // true
 * console.log(isPointInRegion(region, 5, 8)); // false
 * ```
 */
export function isPointInRegion(region: RegionBounds, x: number, y: number): boolean {
	return x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
}

/**
 * Checks if a region is empty (zero or negative dimensions).
 *
 * @param region - The region to check
 * @returns true if region is empty
 */
export function isRegionEmpty(region: RegionBounds): boolean {
	return region.width <= 0 || region.height <= 0;
}

/**
 * Creates a region bounds object.
 *
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param width - Width of region
 * @param height - Height of region
 * @returns A RegionBounds object
 *
 * @example
 * ```typescript
 * import { createRegion } from 'blecsd';
 *
 * const region = createRegion(10, 5, 20, 10);
 * ```
 */
export function createRegion(x: number, y: number, width: number, height: number): RegionBounds {
	return { x, y, width, height };
}

/**
 * Clips a region to buffer bounds.
 *
 * @param buffer - The screen buffer
 * @param region - The region to clip
 * @returns Clipped region within buffer bounds
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, clipToBuffer, createRegion } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * const region = createRegion(-5, -5, 100, 30);
 *
 * const clipped = clipToBuffer(buffer, region);
 * // { x: 0, y: 0, width: 80, height: 24 }
 * ```
 */
export function clipToBuffer(buffer: ScreenBufferData, region: RegionBounds): RegionBounds {
	const x1 = Math.max(0, region.x);
	const y1 = Math.max(0, region.y);
	const x2 = Math.min(buffer.width, region.x + region.width);
	const y2 = Math.min(buffer.height, region.y + region.height);

	return {
		x: x1,
		y: y1,
		width: Math.max(0, x2 - x1),
		height: Math.max(0, y2 - y1),
	};
}
