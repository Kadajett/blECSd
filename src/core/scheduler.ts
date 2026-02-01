/**
 * System scheduler for ordered execution.
 * @module core/scheduler
 */

import type { System, World } from './types';
import { LoopPhase } from './types';

/**
 * Registered system entry.
 */
interface SystemEntry {
	system: System;
	priority: number;
}

/**
 * Current delta time for the frame.
 * Accessed via getDeltaTime() during system execution.
 */
let currentDeltaTime = 0;

/**
 * Gets the current frame's delta time.
 * Call this from within a system to get the time elapsed since the last frame.
 *
 * @returns Delta time in seconds
 *
 * @example
 * ```typescript
 * import { getDeltaTime } from 'blecsd';
 *
 * const movementSystem: System = (world) => {
 *   const dt = getDeltaTime();
 *   // Use dt for frame-rate independent movement
 *   return world;
 * };
 * ```
 */
export function getDeltaTime(): number {
	return currentDeltaTime;
}

/**
 * Scheduler for managing and executing systems in order.
 *
 * Systems are organized into phases that run in a fixed order.
 * Within each phase, systems run by priority (lower = earlier).
 *
 * The INPUT phase is protected and cannot be modified by users
 * to ensure input is always processed first.
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 *
 * scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export class Scheduler {
	private phases: Map<LoopPhase, SystemEntry[]> = new Map();
	private inputSystems: SystemEntry[] = [];

	constructor() {
		// Initialize all phases
		for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
			this.phases.set(phase, []);
		}
	}

	/**
	 * Registers a system for a specific phase.
	 * Systems are sorted by priority within their phase (lower = earlier).
	 *
	 * Note: The INPUT phase is protected and cannot be modified by users.
	 * Use registerInputSystem() for internal input systems only.
	 *
	 * @param phase - The loop phase to register the system in
	 * @param system - The system function to register
	 * @param priority - Priority within the phase (default: 0, lower = earlier)
	 * @throws Error if attempting to register to the INPUT phase
	 *
	 * @example
	 * ```typescript
	 * scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
	 * scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem, 10);
	 * ```
	 */
	registerSystem(phase: LoopPhase, system: System, priority = 0): void {
		if (phase === LoopPhase.INPUT) {
			throw new Error(
				'Cannot register systems to INPUT phase. INPUT phase is protected and always runs first.',
			);
		}

		const systems = this.phases.get(phase);
		if (!systems) {
			return;
		}

		systems.push({ system, priority });
		this.sortPhase(systems);
	}

	/**
	 * Registers an internal input system.
	 * This is only for internal library use to process input.
	 *
	 * @param system - The input system function
	 * @param priority - Priority within input phase (default: 0)
	 * @internal
	 */
	registerInputSystem(system: System, priority = 0): void {
		this.inputSystems.push({ system, priority });
		this.sortPhase(this.inputSystems);
	}

	/**
	 * Unregisters a system from all phases.
	 *
	 * @param system - The system function to unregister
	 *
	 * @example
	 * ```typescript
	 * scheduler.unregisterSystem(movementSystem);
	 * ```
	 */
	unregisterSystem(system: System): void {
		for (const [phase, systems] of this.phases) {
			if (phase === LoopPhase.INPUT) {
				continue; // Skip protected INPUT phase
			}
			const index = systems.findIndex((entry) => entry.system === system);
			if (index !== -1) {
				systems.splice(index, 1);
			}
		}
	}

	/**
	 * Unregisters an internal input system.
	 *
	 * @param system - The input system to unregister
	 * @internal
	 */
	unregisterInputSystem(system: System): void {
		const index = this.inputSystems.findIndex((entry) => entry.system === system);
		if (index !== -1) {
			this.inputSystems.splice(index, 1);
		}
	}

	/**
	 * Runs all systems in phase order.
	 * INPUT phase always runs first, followed by other phases in order.
	 *
	 * @param world - The ECS world to process
	 * @param deltaTime - Time elapsed since last frame in seconds
	 * @returns The world after all systems have processed it
	 *
	 * @example
	 * ```typescript
	 * // In game loop
	 * let lastTime = performance.now();
	 *
	 * function gameLoop() {
	 *   const now = performance.now();
	 *   const deltaTime = (now - lastTime) / 1000;
	 *   lastTime = now;
	 *
	 *   scheduler.run(world, deltaTime);
	 *   requestAnimationFrame(gameLoop);
	 * }
	 * ```
	 */
	run(world: World, deltaTime: number): World {
		currentDeltaTime = deltaTime;

		let currentWorld = world;

		// Always run INPUT systems first (internal)
		for (const entry of this.inputSystems) {
			currentWorld = entry.system(currentWorld);
		}

		// Run all phases in order
		for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
			const systems = this.phases.get(phase);
			if (!systems) {
				continue;
			}

			for (const entry of systems) {
				currentWorld = entry.system(currentWorld);
			}
		}

		return currentWorld;
	}

	/**
	 * Gets all systems registered for a specific phase.
	 * Returns a copy of the systems array.
	 *
	 * @param phase - The loop phase to get systems for
	 * @returns Array of systems in priority order
	 *
	 * @example
	 * ```typescript
	 * const updateSystems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);
	 * console.log(`${updateSystems.length} systems in UPDATE phase`);
	 * ```
	 */
	getSystemsForPhase(phase: LoopPhase): System[] {
		if (phase === LoopPhase.INPUT) {
			return this.inputSystems.map((entry) => entry.system);
		}

		const systems = this.phases.get(phase);
		if (!systems) {
			return [];
		}

		return systems.map((entry) => entry.system);
	}

	/**
	 * Gets the count of systems in a specific phase.
	 *
	 * @param phase - The loop phase to count systems for
	 * @returns Number of systems in the phase
	 */
	getSystemCount(phase: LoopPhase): number {
		if (phase === LoopPhase.INPUT) {
			return this.inputSystems.length;
		}

		const systems = this.phases.get(phase);
		return systems ? systems.length : 0;
	}

	/**
	 * Gets the total number of systems across all phases.
	 *
	 * @returns Total system count
	 */
	getTotalSystemCount(): number {
		let total = this.inputSystems.length;
		for (const systems of this.phases.values()) {
			total += systems.length;
		}
		return total;
	}

	/**
	 * Checks if a system is registered in any phase.
	 *
	 * @param system - The system to check
	 * @returns true if the system is registered
	 */
	hasSystem(system: System): boolean {
		// Check input systems
		if (this.inputSystems.some((entry) => entry.system === system)) {
			return true;
		}

		// Check all phases
		for (const systems of this.phases.values()) {
			if (systems.some((entry) => entry.system === system)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Clears all systems from a specific phase.
	 * Cannot clear the INPUT phase.
	 *
	 * @param phase - The phase to clear
	 * @throws Error if attempting to clear the INPUT phase
	 */
	clearPhase(phase: LoopPhase): void {
		if (phase === LoopPhase.INPUT) {
			throw new Error('Cannot clear INPUT phase. INPUT phase is protected.');
		}

		const systems = this.phases.get(phase);
		if (systems) {
			systems.length = 0;
		}
	}

	/**
	 * Clears all systems from all phases except INPUT.
	 */
	clearAllSystems(): void {
		for (const [phase, systems] of this.phases) {
			if (phase !== LoopPhase.INPUT) {
				systems.length = 0;
			}
		}
	}

	/**
	 * Sorts systems in a phase by priority.
	 */
	private sortPhase(systems: SystemEntry[]): void {
		systems.sort((a, b) => a.priority - b.priority);
	}
}

/**
 * Creates a new scheduler instance.
 *
 * @returns A new Scheduler instance
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 *
 * // Register systems
 * scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
 * scheduler.registerSystem(LoopPhase.PHYSICS, physicsSystem);
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // Run in game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export function createScheduler(): Scheduler {
	return new Scheduler();
}
