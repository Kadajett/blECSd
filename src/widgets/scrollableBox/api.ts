/**
 * ScrollableBox Widget API
 *
 * Standalone API functions for working with ScrollableBox widgets.
 *
 * @module widgets/scrollableBox/api
 */

import type { Entity, World } from '../../core/types';
import { ScrollableBox } from './state';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a scrollable box widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a scrollable box
 *
 * @example
 * ```typescript
 * import { isScrollableBox } from 'blecsd/widgets';
 *
 * if (isScrollableBox(world, entity)) {
 *   // Handle scrollable-box-specific logic
 * }
 * ```
 */
export function isScrollableBox(_world: World, eid: Entity): boolean {
	return ScrollableBox.isScrollableBox[eid] === 1;
}

/**
 * Checks if mouse scrolling is enabled for a scrollable box.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if mouse scrolling is enabled
 */
export function isMouseScrollEnabled(_world: World, eid: Entity): boolean {
	return ScrollableBox.mouseEnabled[eid] === 1;
}

/**
 * Checks if keyboard scrolling is enabled for a scrollable box.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if keyboard scrolling is enabled
 */
export function isKeysScrollEnabled(_world: World, eid: Entity): boolean {
	return ScrollableBox.keysEnabled[eid] === 1;
}

/**
 * Resets the ScrollableBox component store. Useful for testing.
 * @internal
 */
export function resetScrollableBoxStore(): void {
	ScrollableBox.isScrollableBox.fill(0);
	ScrollableBox.mouseEnabled.fill(0);
	ScrollableBox.keysEnabled.fill(0);
}
