/**
 * ECS World creation and management
 * @module core/world
 */

import { createWorld as bitEcsCreateWorld, resetWorld as bitEcsResetWorld } from 'bitecs';
import type { World } from './types';

/**
 * Creates a new ECS world for the game.
 *
 * @returns A new World instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 *
 * const world = createWorld();
 * ```
 */
export function createWorld(): World {
	return bitEcsCreateWorld();
}

/**
 * Resets an existing world, removing all entities and resetting component data.
 * Useful for level reloading or game restart.
 *
 * @param world - The world to reset
 *
 * @example
 * ```typescript
 * import { createWorld, resetWorld } from 'blecsd';
 *
 * const world = createWorld();
 * // ... game runs ...
 * resetWorld(world); // Clear everything for new game
 * ```
 */
export function resetWorld(world: World): void {
	bitEcsResetWorld(world);
}
