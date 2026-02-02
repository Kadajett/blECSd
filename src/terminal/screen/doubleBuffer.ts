/**
 * Double Buffering System
 *
 * Provides efficient rendering through double buffering. The system maintains
 * two buffers (front and back), tracks dirty regions, and computes minimal
 * update sets for efficient terminal output.
 *
 * @module terminal/screen/doubleBuffer
 * @internal This module is internal and used by the rendering system.
 *
 * @example
 * ```typescript
 * import {
 *   createDoubleBuffer,
 *   getBackBuffer,
 *   markDirtyRegion,
 *   swapBuffers,
 *   getMinimalUpdates,
 * } from 'blecsd';
 *
 * // Create a double buffer
 * const db = createDoubleBuffer(80, 24);
 *
 * // Write to back buffer
 * const back = getBackBuffer(db);
 * setCell(back, 10, 5, createCell('X'));
 *
 * // Mark the region as dirty
 * markDirtyRegion(db, 10, 5, 1, 1);
 *
 * // Get minimal updates and swap
 * const updates = getMinimalUpdates(db);
 * swapBuffers(db);
 *
 * // Output only the changed cells
 * for (const { x, y, cell } of updates) {
 *   outputCell(x, y, cell);
 * }
 * ```
 */

import type { Cell, CellChange, ScreenBufferData } from './cell';
import { cellsEqual, cloneCell, createCell, createScreenBuffer, resizeBuffer } from './cell';

/**
 * A rectangular region of the screen.
 */
export interface Rect {
	/** Left edge X coordinate */
	readonly x: number;
	/** Top edge Y coordinate */
	readonly y: number;
	/** Width of region */
	readonly w: number;
	/** Height of region */
	readonly h: number;
}

/**
 * Double buffer data structure.
 *
 * Maintains front and back buffers for efficient rendering,
 * along with dirty region tracking.
 */
export interface DoubleBufferData {
	/** Width of buffers */
	readonly width: number;
	/** Height of buffers */
	readonly height: number;
	/** Front buffer (currently displayed) */
	frontBuffer: ScreenBufferData;
	/** Back buffer (being rendered to) */
	backBuffer: ScreenBufferData;
	/** Dirty regions that need updating */
	readonly dirtyRegions: Rect[];
	/** Full redraw flag */
	fullRedraw: boolean;
}

/**
 * Creates a new double buffer system.
 *
 * @param width - Buffer width in cells
 * @param height - Buffer height in cells
 * @param defaultCell - Optional default cell for initialization
 * @returns A new DoubleBufferData
 * @throws {Error} If dimensions are not positive
 *
 * @example
 * ```typescript
 * import { createDoubleBuffer } from 'blecsd';
 *
 * const db = createDoubleBuffer(80, 24);
 * ```
 */
export function createDoubleBuffer(
	width: number,
	height: number,
	defaultCell?: Cell,
): DoubleBufferData {
	return {
		width,
		height,
		frontBuffer: createScreenBuffer(width, height, defaultCell),
		backBuffer: createScreenBuffer(width, height, defaultCell),
		dirtyRegions: [],
		fullRedraw: true, // Initial state needs full draw
	};
}

/**
 * Gets the back buffer for rendering.
 *
 * @param db - The double buffer
 * @returns The back buffer
 *
 * @example
 * ```typescript
 * const back = getBackBuffer(db);
 * setCell(back, 10, 5, createCell('X'));
 * ```
 */
export function getBackBuffer(db: DoubleBufferData): ScreenBufferData {
	return db.backBuffer;
}

/**
 * Gets the front buffer (currently displayed).
 *
 * @param db - The double buffer
 * @returns The front buffer
 */
export function getFrontBuffer(db: DoubleBufferData): ScreenBufferData {
	return db.frontBuffer;
}

/**
 * Swaps front and back buffers.
 * Call this after rendering to the back buffer and outputting changes.
 *
 * @param db - The double buffer
 *
 * @example
 * ```typescript
 * // Render to back buffer...
 * const updates = getMinimalUpdates(db);
 * // Output updates to terminal...
 * swapBuffers(db);
 * clearDirtyRegions(db);
 * ```
 */
export function swapBuffers(db: DoubleBufferData): void {
	const temp = db.frontBuffer;
	db.frontBuffer = db.backBuffer;
	db.backBuffer = temp;
}

/**
 * Marks a rectangular region as dirty (needs redraw).
 *
 * @param db - The double buffer
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param w - Width of region
 * @param h - Height of region
 *
 * @example
 * ```typescript
 * // Mark a 10x5 region starting at (5, 3) as dirty
 * markDirtyRegion(db, 5, 3, 10, 5);
 * ```
 */
export function markDirtyRegion(
	db: DoubleBufferData,
	x: number,
	y: number,
	w: number,
	h: number,
): void {
	// Clamp to buffer bounds
	const x1 = Math.max(0, x);
	const y1 = Math.max(0, y);
	const x2 = Math.min(db.width, x + w);
	const y2 = Math.min(db.height, y + h);

	if (x2 <= x1 || y2 <= y1) {
		return; // Empty region
	}

	db.dirtyRegions.push({
		x: x1,
		y: y1,
		w: x2 - x1,
		h: y2 - y1,
	});
}

/**
 * Marks a single line as dirty.
 * Convenience function that marks the entire width of the specified line.
 *
 * @param db - The double buffer
 * @param y - Line number (0-indexed)
 *
 * @example
 * ```typescript
 * // Mark line 5 as dirty
 * markLineDirty(db, 5);
 * ```
 */
export function markLineDirty(db: DoubleBufferData, y: number): void {
	if (y < 0 || y >= db.height) {
		return; // Out of bounds
	}
	markDirtyRegion(db, 0, y, db.width, 1);
}

/**
 * Marks the entire buffer as dirty (full redraw needed).
 *
 * @param db - The double buffer
 *
 * @example
 * ```typescript
 * // After resize or major state change
 * markFullRedraw(db);
 * ```
 */
export function markFullRedraw(db: DoubleBufferData): void {
	db.fullRedraw = true;
}

/**
 * Clears all dirty region tracking.
 * Call this after rendering updates to the terminal.
 *
 * @param db - The double buffer
 */
export function clearDirtyRegions(db: DoubleBufferData): void {
	db.dirtyRegions.length = 0;
	db.fullRedraw = false;
}

/**
 * Gets all dirty regions.
 *
 * @param db - The double buffer
 * @returns Array of dirty rectangles
 */
export function getDirtyRegions(db: DoubleBufferData): readonly Rect[] {
	return db.dirtyRegions;
}

/**
 * Gets all dirty line numbers.
 * Extracts unique line numbers from all dirty regions.
 *
 * @param db - The double buffer
 * @returns Sorted array of dirty line numbers
 *
 * @example
 * ```typescript
 * markDirtyRegion(db, 0, 5, 10, 3); // Lines 5, 6, 7
 * markLineDirty(db, 10); // Line 10
 *
 * const lines = getDirtyLines(db);
 * // Returns [5, 6, 7, 10]
 * ```
 */
export function getDirtyLines(db: DoubleBufferData): number[] {
	if (db.fullRedraw) {
		// Return all lines
		const lines: number[] = [];
		for (let y = 0; y < db.height; y++) {
			lines.push(y);
		}
		return lines;
	}

	const lineSet = new Set<number>();
	for (const region of db.dirtyRegions) {
		for (let y = region.y; y < region.y + region.h; y++) {
			lineSet.add(y);
		}
	}

	return Array.from(lineSet).sort((a, b) => a - b);
}

/**
 * Checks if any regions are dirty.
 *
 * @param db - The double buffer
 * @returns true if there are dirty regions or full redraw is needed
 */
export function hasDirtyRegions(db: DoubleBufferData): boolean {
	return db.fullRedraw || db.dirtyRegions.length > 0;
}

/**
 * Checks if full redraw is needed.
 *
 * @param db - The double buffer
 * @returns true if full redraw is needed
 */
export function needsFullRedraw(db: DoubleBufferData): boolean {
	return db.fullRedraw;
}

/**
 * Coalesces overlapping or adjacent dirty regions.
 * This reduces the number of regions to process.
 *
 * @param db - The double buffer
 *
 * @example
 * ```typescript
 * // After marking multiple dirty regions
 * coalesceDirtyRegions(db);
 * // Now getDirtyRegions() returns fewer, larger regions
 * ```
 */
export function coalesceDirtyRegions(db: DoubleBufferData): void {
	if (db.dirtyRegions.length < 2) {
		return;
	}

	// Sort by y, then x
	db.dirtyRegions.sort((a, b) => {
		if (a.y !== b.y) return a.y - b.y;
		return a.x - b.x;
	});

	const coalesced: Rect[] = [];
	let current = db.dirtyRegions[0];
	if (!current) return;

	for (let i = 1; i < db.dirtyRegions.length; i++) {
		const next = db.dirtyRegions[i];
		if (!next) continue;

		// Check if regions can be merged
		if (canMergeRects(current, next)) {
			current = mergeRects(current, next);
		} else {
			coalesced.push(current);
			current = next;
		}
	}
	coalesced.push(current);

	// Replace dirty regions with coalesced set
	db.dirtyRegions.length = 0;
	db.dirtyRegions.push(...coalesced);
}

/**
 * Checks if two rectangles can be merged (overlap or adjacent).
 * @internal
 */
function canMergeRects(a: Rect, b: Rect): boolean {
	// Check if they overlap or are adjacent (within 1 cell)
	const aRight = a.x + a.w;
	const aBottom = a.y + a.h;
	const bRight = b.x + b.w;
	const bBottom = b.y + b.h;

	return !(b.x > aRight + 1 || bRight < a.x - 1 || b.y > aBottom + 1 || bBottom < a.y - 1);
}

/**
 * Merges two rectangles into their bounding box.
 * @internal
 */
function mergeRects(a: Rect, b: Rect): Rect {
	const x1 = Math.min(a.x, b.x);
	const y1 = Math.min(a.y, b.y);
	const x2 = Math.max(a.x + a.w, b.x + b.w);
	const y2 = Math.max(a.y + a.h, b.y + b.h);

	return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * Collects all cells from buffer for full redraw.
 * @internal
 */
function collectAllCells(db: DoubleBufferData, changes: CellChange[]): void {
	const back = db.backBuffer;
	for (let y = 0; y < db.height; y++) {
		for (let x = 0; x < db.width; x++) {
			const idx = y * db.width + x;
			const cell = back.cells[idx];
			if (cell) {
				changes.push({ x, y, cell: cloneCell(cell) });
			}
		}
	}
}

/**
 * Checks if a cell has changed between front and back buffer.
 * @internal
 */
function isCellChanged(frontCell: Cell | undefined, backCell: Cell | undefined): boolean {
	if (!backCell) {
		return false;
	}
	if (!frontCell) {
		return true;
	}
	return !cellsEqual(frontCell, backCell);
}

/**
 * Collects changed cells within dirty regions.
 * @internal
 */
function collectDirtyRegionChanges(db: DoubleBufferData, changes: CellChange[]): void {
	const front = db.frontBuffer;
	const back = db.backBuffer;

	for (const region of db.dirtyRegions) {
		for (let y = region.y; y < region.y + region.h; y++) {
			for (let x = region.x; x < region.x + region.w; x++) {
				const idx = y * db.width + x;
				const frontCell = front.cells[idx];
				const backCell = back.cells[idx];

				if (isCellChanged(frontCell, backCell) && backCell) {
					changes.push({ x, y, cell: cloneCell(backCell) });
				}
			}
		}
	}
}

/**
 * Computes the minimal set of cell updates needed.
 * Compares back buffer against front buffer and returns only changed cells.
 *
 * If full redraw is needed, returns all cells.
 * Otherwise, only compares cells within dirty regions.
 *
 * @param db - The double buffer
 * @returns Array of cell changes with positions
 *
 * @example
 * ```typescript
 * const updates = getMinimalUpdates(db);
 * for (const { x, y, cell } of updates) {
 *   moveCursor(x, y);
 *   outputCell(cell);
 * }
 * ```
 */
export function getMinimalUpdates(db: DoubleBufferData): CellChange[] {
	const changes: CellChange[] = [];

	if (db.fullRedraw) {
		collectAllCells(db, changes);
		return changes;
	}

	if (db.dirtyRegions.length === 0) {
		return changes;
	}

	coalesceDirtyRegions(db);
	collectDirtyRegionChanges(db, changes);

	return changes;
}

/**
 * Clears the back buffer to a default cell.
 *
 * @param db - The double buffer
 * @param clearCell - Cell to fill with (default: empty space)
 *
 * @example
 * ```typescript
 * // Clear back buffer before rendering frame
 * clearBackBuffer(db);
 * ```
 */
export function clearBackBuffer(db: DoubleBufferData, clearCell?: Cell): void {
	const cell = clearCell ?? createCell();
	const back = db.backBuffer;

	for (let i = 0; i < back.cells.length; i++) {
		back.cells[i] = cloneCell(cell);
	}

	// Mark full screen as dirty since we cleared
	db.fullRedraw = true;
}

/**
 * Resizes the double buffer.
 * Creates new buffers with the new dimensions, copying existing content.
 *
 * @param db - The double buffer
 * @param newWidth - New width
 * @param newHeight - New height
 * @param fillCell - Cell for newly exposed areas
 * @returns A new resized DoubleBufferData
 *
 * @example
 * ```typescript
 * // Handle terminal resize
 * db = resizeDoubleBuffer(db, newWidth, newHeight);
 * ```
 */
export function resizeDoubleBuffer(
	db: DoubleBufferData,
	newWidth: number,
	newHeight: number,
	fillCell?: Cell,
): DoubleBufferData {
	const newFront = resizeBuffer(db.frontBuffer, newWidth, newHeight, fillCell);
	const newBack = resizeBuffer(db.backBuffer, newWidth, newHeight, fillCell);

	return {
		width: newWidth,
		height: newHeight,
		frontBuffer: newFront,
		backBuffer: newBack,
		dirtyRegions: [],
		fullRedraw: true, // Need full redraw after resize
	};
}

/**
 * Copies the front buffer to the back buffer.
 * Useful when you want to start rendering from the current displayed state.
 *
 * @param db - The double buffer
 */
export function copyFrontToBack(db: DoubleBufferData): void {
	const front = db.frontBuffer;
	const back = db.backBuffer;

	for (let i = 0; i < front.cells.length; i++) {
		const cell = front.cells[i];
		if (cell) {
			back.cells[i] = cloneCell(cell);
		}
	}
}

/**
 * Gets buffer statistics for debugging.
 *
 * @param db - The double buffer
 * @returns Statistics object
 */
export function getDoubleBufferStats(db: DoubleBufferData): {
	width: number;
	height: number;
	totalCells: number;
	dirtyRegionCount: number;
	dirtyAreaTotal: number;
	needsFullRedraw: boolean;
} {
	let dirtyAreaTotal = 0;
	for (const region of db.dirtyRegions) {
		dirtyAreaTotal += region.w * region.h;
	}

	return {
		width: db.width,
		height: db.height,
		totalCells: db.width * db.height,
		dirtyRegionCount: db.dirtyRegions.length,
		dirtyAreaTotal,
		needsFullRedraw: db.fullRedraw,
	};
}
