/**
 * Behavior system namespace.
 *
 * @example
 * ```typescript
 * import { behaviorSys } from 'blecsd/systems';
 * const system = behaviorSys.create({
 *   resolvePosition: (world, eid) => ({ x: 0, y: 0 }),
 *   applyMovement: (world, eid, dx, dy) => {},
 * });
 * system(world);
 * ```
 */
import { createBehaviorSystem } from '../behaviorSystem';

export const behaviorSys = Object.freeze({
	create: createBehaviorSystem,
});

export type BehaviorSysModule = typeof behaviorSys;
