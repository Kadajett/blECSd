/**
 * Camera system for updating camera positions.
 * Processes all entities with Camera component.
 * @module systems/cameraSystem
 */

import { query } from 'bitecs';
import { Camera, updateCameraFollow } from '../components/camera';
import { getDeltaTime, type Scheduler } from '../core/scheduler';
import { LoopPhase, type System, type World } from '../core/types';

// =============================================================================
// CAMERA QUERIES
// =============================================================================

/**
 * Query all entities with the Camera component.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs with Camera component
 */
export function queryCameras(world: World): number[] {
	return Array.from(query(world, [Camera]));
}

// =============================================================================
// CAMERA SYSTEM
// =============================================================================

/**
 * Camera system that updates all cameras with follow targets.
 *
 * This system should be registered in the UPDATE phase, after movement.
 * It updates camera positions to follow their targets with smoothing
 * and dead zone support.
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, cameraSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.UPDATE, cameraSystem, 20); // After movement and collision
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export const cameraSystem: System = (world: World): World => {
	const dt = getDeltaTime();
	const cameras = queryCameras(world);

	for (const eid of cameras) {
		updateCameraFollow(world, eid, dt);
	}

	return world;
};

/**
 * Creates a new camera system.
 *
 * Factory function that returns the cameraSystem.
 *
 * @returns The camera system function
 *
 * @example
 * ```typescript
 * import { createCameraSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createCameraSystem();
 * scheduler.registerSystem(LoopPhase.UPDATE, system, 20);
 * ```
 */
export function createCameraSystem(): System {
	return cameraSystem;
}

/**
 * Registers the camera system with a scheduler.
 *
 * Convenience function that registers cameraSystem in the UPDATE phase.
 * Uses priority 20 by default to run after movement (priority 0) and collision (priority 10).
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the UPDATE phase (default: 20)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerCameraSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerCameraSystem(scheduler);
 *
 * // Camera updates will happen in UPDATE phase after movement
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerCameraSystem(scheduler: Scheduler, priority = 20): void {
	scheduler.registerSystem(LoopPhase.UPDATE, cameraSystem, priority);
}

/**
 * Manually updates all cameras.
 *
 * Useful when you need to update cameras outside of the system,
 * such as in tests or custom update loops.
 *
 * @param world - The ECS world
 * @param deltaTime - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateCameras } from 'blecsd';
 *
 * // Manual camera update (typically use the system instead)
 * updateCameras(world, 0.016);
 * ```
 */
export function updateCameras(world: World, deltaTime: number): void {
	const cameras = queryCameras(world);
	for (const eid of cameras) {
		updateCameraFollow(world, eid, deltaTime);
	}
}
