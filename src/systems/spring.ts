/**
 * Spring-physics animation system inspired by BubbleTea/Harmonica.
 * Provides smooth, physics-based animations using spring dynamics.
 * @module systems/spring
 */

import { Position } from '../components/position';
import { Velocity } from '../components/velocity';
import { addComponent, hasComponent, query } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Spring configuration parameters.
 * Controls the behavior of spring animations.
 */
export interface SpringConfig {
	/** Spring stiffness (higher = faster response) */
	readonly stiffness: number;
	/** Damping coefficient (higher = less oscillation) */
	readonly damping: number;
	/** Precision threshold for stopping (smaller = more precise) */
	readonly precision: number;
}

/**
 * Spring component store using SoA (Structure of Arrays) for performance.
 *
 * - `targetX`, `targetY`: Target positions for the spring
 * - `stiffness`: Spring stiffness coefficient
 * - `damping`: Damping coefficient
 * - `precision`: Precision threshold for stopping animation
 * - `active`: 1 if spring is active, 0 if at rest
 *
 * @example
 * ```typescript
 * import { Spring, createSpring, springSystem } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * setPosition(world, entity, 0, 0);
 *
 * // Create spring animation to target position
 * createSpring(world, entity, { stiffness: 180, damping: 12, precision: 0.01 });
 * setSpringTarget(world, entity, 100, 50);
 *
 * // In game loop
 * springSystem(world, deltaTime);
 * ```
 */
export const Spring = {
	/** Target X position */
	targetX: new Float32Array(DEFAULT_CAPACITY),
	/** Target Y position */
	targetY: new Float32Array(DEFAULT_CAPACITY),
	/** Spring stiffness */
	stiffness: new Float32Array(DEFAULT_CAPACITY),
	/** Damping coefficient */
	damping: new Float32Array(DEFAULT_CAPACITY),
	/** Precision threshold */
	precision: new Float32Array(DEFAULT_CAPACITY),
	/** Active flag (1 = active, 0 = at rest) */
	active: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Bouncy spring preset.
 * High stiffness, low damping - creates bouncy, playful animations.
 */
export const springBouncy: SpringConfig = {
	stiffness: 180,
	damping: 8,
	precision: 0.01,
};

/**
 * Smooth spring preset.
 * Moderate stiffness and damping - creates smooth, fluid animations.
 */
export const springSmooth: SpringConfig = {
	stiffness: 100,
	damping: 15,
	precision: 0.01,
};

/**
 * Snappy spring preset.
 * Very high stiffness, high damping - creates quick, snappy animations.
 */
export const springSnappy: SpringConfig = {
	stiffness: 300,
	damping: 20,
	precision: 0.01,
};

/**
 * Creates a spring animation component on an entity.
 * Requires Position component to be present or will add it.
 * Automatically adds Velocity component if not present.
 *
 * @param world - The ECS world
 * @param eid - The entity to add spring animation to
 * @param config - Spring configuration (default: springSmooth)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createSpring, springBouncy } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Create with custom config
 * createSpring(world, entity, springBouncy);
 *
 * // Create with default smooth spring
 * createSpring(world, entity);
 * ```
 */
export function createSpring(
	world: World,
	eid: Entity,
	config: SpringConfig = springSmooth,
): Entity {
	// Store current position if it exists
	const hasPos = hasComponent(world, eid, Position);
	const currentX = hasPos ? (Position.x[eid] ?? 0) : 0;
	const currentY = hasPos ? (Position.y[eid] ?? 0) : 0;

	// Ensure required components exist
	if (!hasPos) {
		addComponent(world, eid, Position);
		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Position.z[eid] = 0;
		Position.absolute[eid] = 0;
	}

	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
		Velocity.maxSpeed[eid] = 0;
		Velocity.friction[eid] = 0;
	}

	// Add Spring component
	if (!hasComponent(world, eid, Spring)) {
		addComponent(world, eid, Spring);
	}

	// Initialize spring with current position as target
	Spring.targetX[eid] = currentX;
	Spring.targetY[eid] = currentY;
	Spring.stiffness[eid] = config.stiffness;
	Spring.damping[eid] = config.damping;
	Spring.precision[eid] = config.precision;
	Spring.active[eid] = 0;

	return eid;
}

/**
 * Sets the target position for a spring animation.
 * Activates the spring if it's currently at rest.
 *
 * @param world - The ECS world
 * @param eid - The entity with spring animation
 * @param targetX - Target X position
 * @param targetY - Target Y position
 *
 * @example
 * ```typescript
 * import { setSpringTarget } from 'blecsd';
 *
 * // Animate to new position
 * setSpringTarget(world, entity, 100, 50);
 * ```
 */
export function setSpringTarget(world: World, eid: Entity, targetX: number, targetY: number): void {
	if (!hasComponent(world, eid, Spring)) {
		return;
	}

	Spring.targetX[eid] = targetX;
	Spring.targetY[eid] = targetY;
	Spring.active[eid] = 1;
}

/**
 * Gets the spring target position.
 *
 * @param world - The ECS world
 * @param eid - The entity to query
 * @returns Target position or undefined if no spring component
 */
export function getSpringTarget(
	world: World,
	eid: Entity,
): { readonly x: number; readonly y: number } | undefined {
	if (!hasComponent(world, eid, Spring)) {
		return undefined;
	}

	return {
		x: Spring.targetX[eid] ?? 0,
		y: Spring.targetY[eid] ?? 0,
	};
}

/**
 * Checks if a spring animation is active.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns True if spring is animating, false otherwise
 */
export function isSpringActive(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Spring) && Spring.active[eid] === 1;
}

/**
 * Updates a single entity's spring physics.
 * Applies spring forces to velocity and updates position.
 */
function updateSpringEntity(eid: Entity, dt: number): void {
	// Skip if spring is not active
	if (Spring.active[eid] === 0) {
		return;
	}

	const currentX = Position.x[eid] ?? 0;
	const currentY = Position.y[eid] ?? 0;
	const targetX = Spring.targetX[eid] ?? 0;
	const targetY = Spring.targetY[eid] ?? 0;
	const stiffness = Spring.stiffness[eid] ?? 100;
	const damping = Spring.damping[eid] ?? 15;
	const precision = Spring.precision[eid] ?? 0.01;

	// Calculate displacement from target
	const dx = targetX - currentX;
	const dy = targetY - currentY;

	// Calculate spring force (Hooke's law)
	const forceX = stiffness * dx;
	const forceY = stiffness * dy;

	// Apply damping force
	const velX = Velocity.x[eid] ?? 0;
	const velY = Velocity.y[eid] ?? 0;
	const dampingForceX = damping * velX;
	const dampingForceY = damping * velY;

	// Update velocity with spring and damping forces
	const newVelX = velX + (forceX - dampingForceX) * dt;
	const newVelY = velY + (forceY - dampingForceY) * dt;
	Velocity.x[eid] = newVelX;
	Velocity.y[eid] = newVelY;

	// Update position based on velocity
	Position.x[eid] = currentX + newVelX * dt;
	Position.y[eid] = currentY + newVelY * dt;

	// Check if spring has settled (distance and velocity below threshold)
	const distance = Math.sqrt(dx * dx + dy * dy);
	const speed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);

	if (distance < precision && speed < precision) {
		// Snap to target and deactivate
		Position.x[eid] = targetX;
		Position.y[eid] = targetY;
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
		Spring.active[eid] = 0;
	}
}

/**
 * Spring physics system.
 * Updates all entities with active Spring animations.
 *
 * This system should be registered in the ANIMATION phase of the game loop.
 * It processes spring forces and updates entity positions smoothly.
 *
 * @param world - The ECS world to process
 * @param dt - Delta time in seconds
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, springSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.ANIMATION, springSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export function springSystem(world: World, dt: number): World {
	// Query all entities with Spring, Position, and Velocity components
	// We need to check hasComponent for each since Spring requires both
	const entities = getAllEntitiesWithSpring(world);

	for (const eid of entities) {
		updateSpringEntity(eid, dt);
	}

	return world;
}

/**
 * Gets all entities that have Spring, Position, and Velocity components.
 * Helper function for the spring system.
 */
function getAllEntitiesWithSpring(world: World): readonly Entity[] {
	return query(world, [Spring, Position, Velocity]) as unknown as readonly Entity[];
}
