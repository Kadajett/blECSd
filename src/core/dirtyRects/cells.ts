/**
 * Cell-level dirty tracking operations.
 * @module core/dirtyRects/cells
 */

import type { DirtyTrackerData } from './types';

/**
 * Marks a single cell as dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 */
export function markCellDirty(tracker: DirtyTrackerData, x: number, y: number): void {
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = cellIndex >> 3; // Divide by 8
	const bitIndex = cellIndex & 7; // Mod 8

	const byte = tracker.dirtyCells[byteIndex];
	if (byte !== undefined) {
		tracker.dirtyCells[byteIndex] = byte | (1 << bitIndex);
	}

	tracker.regionsStale = true;
}

/**
 * Checks if a cell is dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns true if cell is dirty
 */
export function isCellDirty(tracker: DirtyTrackerData, x: number, y: number): boolean {
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return false;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = cellIndex >> 3;
	const bitIndex = cellIndex & 7;

	const byte = tracker.dirtyCells[byteIndex];
	if (byte === undefined) {
		return false;
	}

	return (byte & (1 << bitIndex)) !== 0;
}

/**
 * Marks a rectangular region as dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Region left edge
 * @param y - Region top edge
 * @param width - Region width
 * @param height - Region height
 */
export function markRegionDirty(
	tracker: DirtyTrackerData,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	// Clamp to screen bounds
	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(tracker.width, Math.floor(x + width));
	const y2 = Math.min(tracker.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return;
	}

	// Mark all cells in region
	for (let cy = y1; cy < y2; cy++) {
		for (let cx = x1; cx < x2; cx++) {
			const cellIndex = cy * tracker.width + cx;
			const byteIndex = cellIndex >> 3;
			const bitIndex = cellIndex & 7;

			const byte = tracker.dirtyCells[byteIndex];
			if (byte !== undefined) {
				tracker.dirtyCells[byteIndex] = byte | (1 << bitIndex);
			}
		}
	}

	tracker.regionsStale = true;
}
