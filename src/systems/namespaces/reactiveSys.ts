/**
 * Reactive system namespace.
 *
 * @example
 * ```typescript
 * import { reactiveSys } from 'blecsd/systems';
 * const system = reactiveSys.create(world, Velocity, (world, eid) => {
 *   // React to Velocity component changes
 * });
 * const allPhases = reactiveSys.createForAllPhases(world, MyComponent, handler);
 * ```
 */
import { createReactiveSystem, createReactiveSystemsForAllPhases } from '../reactiveSystem';

export const reactiveSys = Object.freeze({
	create: createReactiveSystem,
	createForAllPhases: createReactiveSystemsForAllPhases,
});

export type ReactiveSysModule = typeof reactiveSys;
