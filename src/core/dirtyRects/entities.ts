/**
 * Entity-level dirty tracking operations.
 * @module core/dirtyRects/entities
 */

import { ComputedLayout, hasComputedLayout } from '../../systems/layoutSystem';
import type { Entity, World } from '../types';
import { markRegionDirty } from './cells';
import type { DirtyTrackerData, EntityBoundsEntry } from './types';

/**
 * Marks an entity as dirty for redraw.
 * Also marks both old and new positions if entity moved.
 *
 * @param tracker - The dirty tracker
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * // When entity changes position or appearance
 * markEntityDirty(tracker, world, entity);
 * ```
 */
export function markEntityDirty(tracker: DirtyTrackerData, world: World, eid: Entity): void {
	tracker.dirtyEntities.add(eid);

	// Get current bounds
	if (!hasComputedLayout(world, eid)) {
		return;
	}

	const currentX = ComputedLayout.x[eid] as number;
	const currentY = ComputedLayout.y[eid] as number;
	const currentW = ComputedLayout.width[eid] as number;
	const currentH = ComputedLayout.height[eid] as number;

	// Check for previous bounds
	const prevBounds = tracker.entityBounds.get(eid);

	if (prevBounds) {
		// Mark old position dirty (entity moved away from here)
		if (
			prevBounds.prevX !== currentX ||
			prevBounds.prevY !== currentY ||
			prevBounds.prevWidth !== currentW ||
			prevBounds.prevHeight !== currentH
		) {
			markRegionDirty(
				tracker,
				prevBounds.prevX,
				prevBounds.prevY,
				prevBounds.prevWidth,
				prevBounds.prevHeight,
			);
		}
	}

	// Mark new position dirty
	markRegionDirty(tracker, currentX, currentY, currentW, currentH);

	tracker.regionsStale = true;
}

/**
 * Updates entity bounds cache after rendering.
 * Call this after an entity has been rendered.
 *
 * @param tracker - The dirty tracker
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param visible - Whether entity is currently visible
 */
export function updateEntityBounds(
	tracker: DirtyTrackerData,
	world: World,
	eid: Entity,
	visible: boolean,
): void {
	if (!hasComputedLayout(world, eid)) {
		// Remove from cache if no layout
		tracker.entityBounds.delete(eid);
		return;
	}

	const entry: EntityBoundsEntry = {
		prevX: ComputedLayout.x[eid] as number,
		prevY: ComputedLayout.y[eid] as number,
		prevWidth: ComputedLayout.width[eid] as number,
		prevHeight: ComputedLayout.height[eid] as number,
		wasVisible: visible,
	};

	tracker.entityBounds.set(eid, entry);
}

/**
 * Removes an entity from dirty tracking.
 * Call when entity is destroyed.
 *
 * @param tracker - The dirty tracker
 * @param eid - The entity ID
 */
export function removeEntityFromTracking(tracker: DirtyTrackerData, eid: Entity): void {
	const prevBounds = tracker.entityBounds.get(eid);

	// Mark previous position dirty (entity was here, now gone)
	if (prevBounds?.wasVisible) {
		markRegionDirty(
			tracker,
			prevBounds.prevX,
			prevBounds.prevY,
			prevBounds.prevWidth,
			prevBounds.prevHeight,
		);
	}

	tracker.dirtyEntities.delete(eid);
	tracker.entityBounds.delete(eid);
}

/**
 * Checks if an entity is marked dirty.
 *
 * @param tracker - The dirty tracker
 * @param eid - The entity ID
 * @returns true if entity is dirty
 */
export function isEntityDirty(tracker: DirtyTrackerData, eid: Entity): boolean {
	return tracker.dirtyEntities.has(eid);
}
