/**
 * Dirty region calculation and coalescing.
 * @module core/dirtyRects/regions
 */

import type { DirtyRect, DirtyTrackerData } from './types';
import { canMergeRects, mergeRects } from './utils';

/** Get byte and bit index for a cell position */
function getCellIndices(
	x: number,
	y: number,
	width: number,
): { byteIndex: number; bitIndex: number } {
	const cellIndex = y * width + x;
	return { byteIndex: cellIndex >> 3, bitIndex: cellIndex & 7 };
}

/** Check if a bit is set in a bitset */
function isBitSet(array: Uint8Array, byteIndex: number, bitIndex: number): boolean | undefined {
	const byte = array[byteIndex];
	if (byte === undefined) return undefined;
	return (byte & (1 << bitIndex)) !== 0;
}

/** Set a bit in a bitset */
function setBit(array: Uint8Array, byteIndex: number, bitIndex: number): void {
	const byte = array[byteIndex];
	if (byte !== undefined) {
		array[byteIndex] = byte | (1 << bitIndex);
	}
}

/** Check if a cell is dirty and unprocessed */
function isUnprocessedDirtyCell(
	dirtyCells: Uint8Array,
	processed: Uint8Array,
	byteIndex: number,
	bitIndex: number,
): boolean {
	const isDirty = isBitSet(dirtyCells, byteIndex, bitIndex);
	const isProcessed = isBitSet(processed, byteIndex, bitIndex);
	if (isDirty === undefined || isProcessed === undefined) return false;
	return isDirty && !isProcessed;
}

/** Expand right from start position while cells are dirty and unprocessed */
function expandRight(
	dirtyCells: Uint8Array,
	processed: Uint8Array,
	startX: number,
	y: number,
	width: number,
	maxWidth: number,
): number {
	let endX = startX;
	while (endX < maxWidth) {
		const { byteIndex, bitIndex } = getCellIndices(endX, y, width);
		if (!isUnprocessedDirtyCell(dirtyCells, processed, byteIndex, bitIndex)) break;
		endX++;
	}
	return endX;
}

/** Check if entire row segment is dirty and unprocessed */
function isRowSegmentValid(
	dirtyCells: Uint8Array,
	processed: Uint8Array,
	startX: number,
	endX: number,
	y: number,
	width: number,
): boolean {
	for (let x = startX; x < endX; x++) {
		const { byteIndex, bitIndex } = getCellIndices(x, y, width);
		if (!isUnprocessedDirtyCell(dirtyCells, processed, byteIndex, bitIndex)) return false;
	}
	return true;
}

/** Mark rectangle cells as processed */
function markRectProcessed(
	processed: Uint8Array,
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	width: number,
): void {
	for (let y = startY; y < endY; y++) {
		for (let x = startX; x < endX; x++) {
			const { byteIndex, bitIndex } = getCellIndices(x, y, width);
			setBit(processed, byteIndex, bitIndex);
		}
	}
}

/**
 * Expands a dirty cell into the largest possible rectangle.
 * @internal
 */
function expandDirtyRect(
	tracker: DirtyTrackerData,
	processed: Uint8Array,
	startX: number,
	startY: number,
): DirtyRect {
	const endX = expandRight(
		tracker.dirtyCells,
		processed,
		startX,
		startY,
		tracker.width,
		tracker.width,
	);
	const rectWidth = endX - startX;
	if (rectWidth === 0) return { x: startX, y: startY, width: 0, height: 0 };

	// Expand down while maintaining width
	let endY = startY;
	while (endY < tracker.height) {
		if (!isRowSegmentValid(tracker.dirtyCells, processed, startX, endX, endY, tracker.width)) break;
		endY++;
	}

	markRectProcessed(processed, startX, startY, endX, endY, tracker.width);

	return { x: startX, y: startY, width: rectWidth, height: endY - startY };
}

/** Try to merge current rect with any unused rects */
function tryMergeWithOthers(
	current: DirtyRect,
	sorted: DirtyRect[],
	used: Set<number>,
	startIndex: number,
): { merged: DirtyRect; didMerge: boolean } {
	let merged = current;
	let didMerge = false;

	for (let j = startIndex; j < sorted.length; j++) {
		if (used.has(j)) continue;
		const other = sorted[j];
		if (!other) continue;

		if (canMergeRects(merged, other)) {
			merged = mergeRects(merged, other);
			used.add(j);
			didMerge = true;
		}
	}

	return { merged, didMerge };
}

/**
 * Coalesces overlapping or adjacent rectangles.
 * @internal
 */
function coalesceRegions(regions: DirtyRect[]): DirtyRect[] {
	if (regions.length < 2) return regions;

	const sorted = [...regions].sort((a, b) => b.width * b.height - a.width * a.height);
	const result: DirtyRect[] = [];
	const used = new Set<number>();

	for (let i = 0; i < sorted.length; i++) {
		if (used.has(i)) continue;

		let current = sorted[i];
		if (!current) continue;
		used.add(i);

		// Keep merging until no more merges possible
		let didMerge = true;
		while (didMerge) {
			const mergeResult = tryMergeWithOthers(current, sorted, used, i + 1);
			current = mergeResult.merged;
			didMerge = mergeResult.didMerge;
		}

		result.push(current);
	}

	return result;
}

/**
 * Calculates coalesced dirty regions from the dirty cell bitset.
 * Uses a greedy rectangle finding algorithm.
 *
 * @param tracker - The dirty tracker
 * @returns Array of dirty rectangles
 */
export function calculateDirtyRegions(tracker: DirtyTrackerData): DirtyRect[] {
	if (tracker.forceFullRedraw) {
		return [{ x: 0, y: 0, width: tracker.width, height: tracker.height }];
	}

	const regions: DirtyRect[] = [];
	const processed = new Uint8Array(tracker.dirtyCells.length);

	for (let y = 0; y < tracker.height; y++) {
		for (let x = 0; x < tracker.width; x++) {
			const { byteIndex, bitIndex } = getCellIndices(x, y, tracker.width);

			if (isUnprocessedDirtyCell(tracker.dirtyCells, processed, byteIndex, bitIndex)) {
				const rect = expandDirtyRect(tracker, processed, x, y);
				if (rect.width > 0 && rect.height > 0) regions.push(rect);
			}
		}
	}

	return coalesceRegions(regions);
}
