/**
 * Flexbox Widget API
 *
 * Standalone API functions for working with Flexbox widgets.
 *
 * @module widgets/flexbox/api
 */

import type { Entity, World } from '../../core/types';
import { FlexContainer, flexContainerStateMap } from './state';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Type guard to check if an entity is a flex container.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a flex container
 */
export function isFlexContainer(_world: World, eid: Entity): boolean {
	return FlexContainer.isFlexContainer[eid] === 1;
}

/**
 * Resets the flexbox store (for testing).
 * @internal
 */
export function resetFlexContainerStore(): void {
	flexContainerStateMap.clear();
	FlexContainer.isFlexContainer.fill(0);
}
