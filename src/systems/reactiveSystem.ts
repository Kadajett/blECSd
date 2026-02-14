/**
 * Reactive system for ECS integration.
 * Flushes scheduled effects during the appropriate loop phase.
 *
 * @module systems/reactiveSystem
 */

import { flushScheduledEffects } from '../core/reactiveEffects';
import type { System, World } from '../core/types';
import { LoopPhase } from '../core/types';

/**
 * Creates a reactive system that flushes scheduled effects.
 * This system should be registered in the EARLY_UPDATE phase to ensure
 * reactive effects run before layout and rendering.
 *
 * @param phase - Loop phase to flush effects for (default: EARLY_UPDATE)
 * @returns System function
 *
 * @example
 * ```typescript
 * import { createScheduler, createReactiveSystem, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const reactiveSystem = createReactiveSystem();
 *
 * // Register in EARLY_UPDATE phase
 * scheduler.registerSystem(LoopPhase.EARLY_UPDATE, reactiveSystem);
 *
 * // Now scheduled effects will run during EARLY_UPDATE
 * ```
 */
export function createReactiveSystem(phase: LoopPhase = LoopPhase.EARLY_UPDATE): System {
	return (world: World): World => {
		flushScheduledEffects(phase);
		return world;
	};
}

/**
 * Creates multiple reactive systems, one for each phase.
 * This allows scheduled effects to run in their designated phases.
 *
 * @returns Map of phase to system function
 *
 * @example
 * ```typescript
 * import { createScheduler, createReactiveSystemsForAllPhases, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const reactiveSystems = createReactiveSystemsForAllPhases();
 *
 * // Register a system for each phase
 * for (const [phase, system] of reactiveSystems) {
 *   scheduler.registerSystem(phase, system);
 * }
 *
 * // Now scheduled effects will run in their designated phases
 * ```
 */
export function createReactiveSystemsForAllPhases(): Map<LoopPhase, System> {
	const systems = new Map<LoopPhase, System>();

	// Create a system for each phase (except INPUT, which is protected)
	for (let phase = LoopPhase.EARLY_UPDATE; phase <= LoopPhase.POST_RENDER; phase++) {
		systems.set(phase, (world: World): World => {
			flushScheduledEffects(phase);
			return world;
		});
	}

	return systems;
}
