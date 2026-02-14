/**
 * Viewport-related dirty tracking helpers.
 * @module core/dirtyRects/viewport
 */

import { getDirtyRegions } from './queries';
import type { DirtyRect, DirtyTrackerData } from './types';

/**
 * Checks if a region intersects any dirty region.
 *
 * @param tracker - The dirty tracker
 * @param x - Region X
 * @param y - Region Y
 * @param width - Region width
 * @param height - Region height
 * @returns true if region intersects dirty area
 */
export function regionIntersectsDirty(
	tracker: DirtyTrackerData,
	x: number,
	y: number,
	width: number,
	height: number,
): boolean {
	if (tracker.forceFullRedraw) {
		return true;
	}

	const regions = getDirtyRegions(tracker);
	for (const region of regions) {
		// Check for intersection
		if (
			x < region.x + region.width &&
			x + width > region.x &&
			y < region.y + region.height &&
			y + height > region.y
		) {
			return true;
		}
	}

	return false;
}

/**
 * Gets dirty regions clipped to a viewport.
 * Useful for rendering only visible dirty areas.
 *
 * @param tracker - The dirty tracker
 * @param viewX - Viewport X
 * @param viewY - Viewport Y
 * @param viewWidth - Viewport width
 * @param viewHeight - Viewport height
 * @returns Dirty regions clipped to viewport
 */
export function getDirtyRegionsInViewport(
	tracker: DirtyTrackerData,
	viewX: number,
	viewY: number,
	viewWidth: number,
	viewHeight: number,
): DirtyRect[] {
	const regions = getDirtyRegions(tracker);
	const clipped: DirtyRect[] = [];

	for (const region of regions) {
		// Calculate intersection
		const x1 = Math.max(region.x, viewX);
		const y1 = Math.max(region.y, viewY);
		const x2 = Math.min(region.x + region.width, viewX + viewWidth);
		const y2 = Math.min(region.y + region.height, viewY + viewHeight);

		if (x2 > x1 && y2 > y1) {
			clipped.push({
				x: x1,
				y: y1,
				width: x2 - x1,
				height: y2 - y1,
			});
		}
	}

	return clipped;
}
