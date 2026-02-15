/**
 * Layout Widget API
 *
 * @module widgets/layout/api
 */

import type { Entity, World } from '../../core/types';
import { Layout } from './state';
import type { LayoutMode } from './types';

function numberToLayoutMode(num: number): LayoutMode {
	return num === 1 ? 'grid' : num === 2 ? 'flex' : 'inline';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a layout widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a layout widget
 *
 * @example
 * ```typescript
 * import { isLayout } from 'blecsd/widgets';
 *
 * if (isLayout(world, entity)) {
 *   // Handle layout-specific logic
 * }
 * ```
 */
export function isLayout(_world: World, eid: Entity): boolean {
	return Layout.isLayout[eid] === 1;
}

/**
 * Gets the layout mode of a layout entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The layout mode
 */
export function getLayoutMode(_world: World, eid: Entity): LayoutMode {
	return numberToLayoutMode(Layout.mode[eid] as number);
}

/**
 * Resets the Layout component store. Useful for testing.
 * @internal
 */
export function resetLayoutStore(): void {
	Layout.isLayout.fill(0);
	Layout.mode.fill(0);
	Layout.gap.fill(0);
	Layout.wrap.fill(0);
	Layout.justify.fill(0);
	Layout.align.fill(0);
	Layout.cols.fill(0);
	Layout.direction.fill(0);
}
