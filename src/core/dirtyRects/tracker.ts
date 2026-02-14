/**
 * Dirty tracker creation and management.
 * @module core/dirtyRects/tracker
 */

import { createComponentStore } from '../../utils/componentStorage';
import type { DirtyTrackerData } from './types';

/**
 * Creates a new dirty tracking system.
 *
 * @param width - Screen width in cells
 * @param height - Screen height in cells
 * @returns A new DirtyTrackerData
 *
 * @example
 * ```typescript
 * import { createDirtyTracker } from 'blecsd';
 *
 * const tracker = createDirtyTracker(80, 24);
 * ```
 */
export function createDirtyTracker(width: number, height: number): DirtyTrackerData {
	// Calculate bytes needed for bitset (1 bit per cell, 8 cells per byte)
	const cellCount = width * height;
	const byteCount = Math.ceil(cellCount / 8);

	return {
		width,
		height,
		dirtyCells: new Uint8Array(byteCount),
		dirtyEntities: new Set(),
		entityBounds: createComponentStore({ iterable: true }),
		dirtyRegions: [],
		regionsStale: true,
		forceFullRedraw: true, // First frame needs full draw
		frameCount: 0,
	};
}

/**
 * Resizes the dirty tracker for a new screen size.
 *
 * @param tracker - The dirty tracker
 * @param newWidth - New screen width
 * @param newHeight - New screen height
 * @returns A new resized tracker
 *
 * @example
 * ```typescript
 * tracker = resizeDirtyTracker(tracker, 120, 40);
 * ```
 */
export function resizeDirtyTracker(
	tracker: DirtyTrackerData,
	newWidth: number,
	newHeight: number,
): DirtyTrackerData {
	const newTracker = createDirtyTracker(newWidth, newHeight);

	// Copy entity bounds that still fit
	tracker.entityBounds.forEach((bounds, eid) => {
		if (bounds.prevX < newWidth && bounds.prevY < newHeight) {
			newTracker.entityBounds.set(eid, { ...bounds });
		}
	});

	// Force full redraw after resize
	newTracker.forceFullRedraw = true;

	return newTracker;
}
