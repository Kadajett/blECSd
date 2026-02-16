/**
 * Reactive system namespace.
 *
 * @example
 * ```typescript
 * import { reactive } from 'blecsd/systems';
 * const system = reactive.create(world, Velocity, (world, eid) => {
 *   // React to Velocity component changes
 * });
 * const allPhases = reactive.createForAllPhases(world, MyComponent, handler);
 * ```
 */
import { createReactiveSystem, createReactiveSystemsForAllPhases } from '../reactiveSystem';

export const reactive = Object.freeze({
	create: createReactiveSystem,
	createForAllPhases: createReactiveSystemsForAllPhases,
});

export type ReactiveSystemModule = typeof reactive;
