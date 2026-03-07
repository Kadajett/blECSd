/**
 * Shared utilities for dirty rectangle manipulation.
 * @module core/dirtyRects/utils
 */

import type { DirtyRect } from './types';

/**
 * Checks if two rectangles can be merged.
 * Returns true if they overlap or are adjacent (within 1 cell of each other).
 *
 * @param a - First rectangle
 * @param b - Second rectangle
 * @returns True if rectangles can be merged
 * @internal
 */
export function canMergeRects(a: DirtyRect, b: DirtyRect): boolean {
	// Allow merging if they overlap or are adjacent (within 1 cell)
	const aRight = a.x + a.width;
	const aBottom = a.y + a.height;
	const bRight = b.x + b.width;
	const bBottom = b.y + b.height;

	// Check if they're within 1 cell of each other
	return !(b.x > aRight + 1 || bRight < a.x - 1 || b.y > aBottom + 1 || bBottom < a.y - 1);
}

/**
 * Merges two rectangles into their bounding box.
 *
 * @param a - First rectangle
 * @param b - Second rectangle
 * @returns A new rectangle that encompasses both inputs
 * @internal
 */
export function mergeRects(a: DirtyRect, b: DirtyRect): DirtyRect {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	const right = Math.max(a.x + a.width, b.x + b.width);
	const bottom = Math.max(a.y + a.height, b.y + b.height);

	return { x, y, width: right - x, height: bottom - y };
}
