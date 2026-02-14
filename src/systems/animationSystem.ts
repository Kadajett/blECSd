/**
 * Animation system for updating sprite animations.
 * Processes all entities with Animation component.
 * @module systems/animationSystem
 */

import { updateAnimationEntity } from '../components/animation';
import { hasComponent, query, registerComponent, withStore } from '../core/ecs';
import { getDeltaTime, type Scheduler } from '../core/scheduler';
import { LoopPhase, type System, type World } from '../core/types';

// Default capacity for component arrays
const DEFAULT_CAPACITY = 10000;

/**
 * Store for the Animation component's typed arrays.
 * Using SoA (Structure of Arrays) pattern for cache efficiency.
 */
interface AnimationSystemStore {
	animationId: Uint32Array;
	playing: Uint8Array;
	loop: Uint8Array;
	speed: Float32Array;
	elapsed: Float32Array;
	currentFrameIndex: Uint16Array;
	direction: Int8Array;
}

/**
 * Create a new Animation store for system processing.
 */
function createAnimationStore(capacity = DEFAULT_CAPACITY): AnimationSystemStore {
	return {
		animationId: new Uint32Array(capacity),
		playing: new Uint8Array(capacity),
		loop: new Uint8Array(capacity),
		speed: new Float32Array(capacity),
		elapsed: new Float32Array(capacity),
		currentFrameIndex: new Uint16Array(capacity),
		direction: new Int8Array(capacity),
	};
}

// Global store used by the system
const systemStore = createAnimationStore();

// Symbol to track if component is registered for a world
const REGISTERED_WORLDS = new WeakSet<World>();

// Reference to the component (set when first registered)
// biome-ignore lint/suspicious/noExplicitAny: Component type varies by world
let AnimationSystemComponentRef: any = null;

/**
 * Get or register the Animation component for use with the system.
 * This ensures the component is registered before querying.
 *
 * @param world - The ECS world
 * @returns The component reference for querying
 */
function getAnimationComponent(world: World): unknown {
	if (!REGISTERED_WORLDS.has(world)) {
		AnimationSystemComponentRef = registerComponent(
			world,
			withStore(() => systemStore),
		);
		REGISTERED_WORLDS.add(world);
	}
	return AnimationSystemComponentRef;
}

/**
 * Query all entities with the Animation component.
 *
 * PERF: Returns iterable query result to avoid per-frame allocation.
 *
 * @param world - The ECS world
 * @returns Iterable of entity IDs with Animation component
 */
export function queryAnimation(world: World): Iterable<number> {
	const component = getAnimationComponent(world);
	return query(world, [component]);
}

/**
 * Checks if an entity has the Animation component (via system store).
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns true if entity has Animation component
 */
export function hasAnimationSystem(world: World, eid: number): boolean {
	const component = getAnimationComponent(world);
	return hasComponent(world, eid, component);
}

/**
 * Animation system that updates all entities with Animation component.
 *
 * This system should be registered in the UPDATE phase of the game loop.
 * It reads delta time from getDeltaTime() which is set by the scheduler.
 *
 * For each playing animation, the system:
 * 1. Adds elapsed time (scaled by speed)
 * 2. Checks if current frame duration exceeded
 * 3. Advances to next frame (respecting direction)
 * 4. Handles loop/stop when animation completes
 * 5. Updates the entity's Sprite component frame
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, animationSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.UPDATE, animationSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export const animationSystem: System = (world: World): World => {
	// PERF: Cache delta time lookup once per frame
	const dt = getDeltaTime();
	const entities = queryAnimation(world);

	// PERF: Simple loop over entities - minimal allocation overhead
	// Each updateAnimationEntity accesses typed arrays directly (cache-friendly)
	for (const eid of entities) {
		updateAnimationEntity(world, eid, dt);
	}

	return world;
};

/**
 * Creates a new animation system.
 *
 * Factory function that returns the animationSystem.
 * Useful for cases where you need a fresh reference.
 *
 * @returns The animation system function
 *
 * @example
 * ```typescript
 * import { createAnimationSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createAnimationSystem();
 * scheduler.registerSystem(LoopPhase.UPDATE, system);
 * ```
 */
export function createAnimationSystem(): System {
	return animationSystem;
}

/**
 * Registers the animation system with a scheduler.
 *
 * Convenience function that registers animationSystem in the UPDATE phase.
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the UPDATE phase (default: 0)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerAnimationSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerAnimationSystem(scheduler);
 *
 * // Animation updates will now happen in UPDATE phase
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerAnimationSystem(scheduler: Scheduler, priority = 0): void {
	scheduler.registerSystem(LoopPhase.UPDATE, animationSystem, priority);
}

/**
 * Manually update animations for specific entities.
 *
 * Useful when you need to update animations outside of the system,
 * such as in tests or custom update loops.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to update
 * @param deltaTime - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateAnimations, queryAnimation } from 'blecsd';
 *
 * // Manual update (typically use the system instead)
 * const entities = queryAnimation(world);
 * updateAnimations(world, entities, 0.016); // ~60fps frame
 * ```
 */
export function updateAnimations(
	world: World,
	entities: readonly number[],
	deltaTime: number,
): void {
	for (const eid of entities) {
		updateAnimationEntity(world, eid, deltaTime);
	}
}
