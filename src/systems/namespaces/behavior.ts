/**
 * Behavior system namespace.
 *
 * @example
 * ```typescript
 * import { behavior } from 'blecsd/systems';
 * const system = behavior.create({
 *   resolvePosition: (world, eid) => ({ x: 0, y: 0 }),
 *   applyMovement: (world, eid, dx, dy) => {},
 * });
 * system(world);
 * ```
 */
import { createBehaviorSystem } from '../behaviorSystem';

export const behavior = Object.freeze({
	create: createBehaviorSystem,
});

export type BehaviorSystemModule = typeof behavior;
