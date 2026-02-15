/**
 * Velocity and Acceleration components for entity movement.
 * @module components/velocity
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { hasPosition, Position } from './position';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// VELOCITY COMPONENT
// =============================================================================

/**
 * Velocity component store using SoA (Structure of Arrays) for performance.
 *
 * - `x`, `y`: Velocity in cells per second
 * - `maxSpeed`: Maximum speed (0 = unlimited)
 * - `friction`: Friction factor 0-1 (0 = no friction, 1 = instant stop)
 *
 * @example
 * ```typescript
 * import { Velocity, setVelocity, getVelocity } from 'blecsd';
 *
 * // Set entity velocity
 * setVelocity(world, entity, 5, 0); // Move right at 5 cells/sec
 *
 * // Get current velocity
 * const vel = getVelocity(world, entity);
 * console.log(`Speed: ${Math.sqrt(vel.x*vel.x + vel.y*vel.y)}`);
 * ```
 */
export const Velocity = {
	/** X velocity in cells per second */
	x: new Float32Array(DEFAULT_CAPACITY),
	/** Y velocity in cells per second */
	y: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum speed (0 = unlimited) */
	maxSpeed: new Float32Array(DEFAULT_CAPACITY),
	/** Friction factor (0-1, 0 = no friction) */
	friction: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Velocity data returned by getVelocity.
 */
export interface VelocityData {
	readonly x: number;
	readonly y: number;
	readonly maxSpeed: number;
	readonly friction: number;
}

/**
 * Options for setting velocity.
 */
export interface VelocityOptions {
	/** X velocity in cells per second */
	x?: number;
	/** Y velocity in cells per second */
	y?: number;
	/** Maximum speed (0 = unlimited) */
	maxSpeed?: number;
	/** Friction factor (0-1) */
	friction?: number;
}

/**
 * Initializes velocity component with default values.
 */
function initVelocity(eid: Entity): void {
	Velocity.x[eid] = 0;
	Velocity.y[eid] = 0;
	Velocity.maxSpeed[eid] = 0;
	Velocity.friction[eid] = 0;
}

/**
 * Sets the velocity of an entity.
 * Adds the Velocity component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - X velocity in cells per second
 * @param y - Y velocity in cells per second
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setVelocity, setPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * setPosition(world, entity, 10, 10);
 * setVelocity(world, entity, 5, -2); // Right 5, up 2 cells/sec
 * ```
 */
export function setVelocity(world: World, eid: Entity, x: number, y: number): Entity {
	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		initVelocity(eid);
	}
	Velocity.x[eid] = x;
	Velocity.y[eid] = y;
	return eid;
}

/**
 * Sets velocity with options.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Velocity options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setVelocityOptions } from 'blecsd';
 *
 * setVelocityOptions(world, entity, {
 *   x: 5,
 *   y: 0,
 *   maxSpeed: 10,
 *   friction: 0.1,
 * });
 * ```
 */
export function setVelocityOptions(world: World, eid: Entity, options: VelocityOptions): Entity {
	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		initVelocity(eid);
	}
	if (options.x !== undefined) Velocity.x[eid] = options.x;
	if (options.y !== undefined) Velocity.y[eid] = options.y;
	if (options.maxSpeed !== undefined) Velocity.maxSpeed[eid] = options.maxSpeed;
	if (options.friction !== undefined) Velocity.friction[eid] = options.friction;
	return eid;
}

/**
 * Gets the velocity data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Velocity data or undefined
 *
 * @example
 * ```typescript
 * import { getVelocity } from 'blecsd';
 *
 * const vel = getVelocity(world, entity);
 * if (vel) {
 *   const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
 *   console.log(`Moving at ${speed} cells/sec`);
 * }
 * ```
 */
export function getVelocity(world: World, eid: Entity): VelocityData | undefined {
	if (!hasComponent(world, eid, Velocity)) {
		return undefined;
	}
	return {
		x: Velocity.x[eid] as number,
		y: Velocity.y[eid] as number,
		maxSpeed: Velocity.maxSpeed[eid] as number,
		friction: Velocity.friction[eid] as number,
	};
}

/**
 * Checks if an entity has a Velocity component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Velocity component
 */
export function hasVelocity(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Velocity);
}

/**
 * Sets the maximum speed for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param maxSpeed - Maximum speed (0 = unlimited)
 * @returns The entity ID for chaining
 */
export function setMaxSpeed(world: World, eid: Entity, maxSpeed: number): Entity {
	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		initVelocity(eid);
	}
	Velocity.maxSpeed[eid] = maxSpeed;
	return eid;
}

/**
 * Sets the friction for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param friction - Friction factor (0-1)
 * @returns The entity ID for chaining
 */
export function setFriction(world: World, eid: Entity, friction: number): Entity {
	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		initVelocity(eid);
	}
	Velocity.friction[eid] = Math.max(0, Math.min(1, friction));
	return eid;
}

/**
 * Adds to current velocity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param dx - Delta X velocity
 * @param dy - Delta Y velocity
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { addVelocity } from 'blecsd';
 *
 * // Apply impulse
 * addVelocity(world, entity, 0, -10); // Jump impulse
 * ```
 */
export function addVelocity(world: World, eid: Entity, dx: number, dy: number): Entity {
	if (!hasComponent(world, eid, Velocity)) {
		addComponent(world, eid, Velocity);
		initVelocity(eid);
	}
	Velocity.x[eid] = (Velocity.x[eid] as number) + dx;
	Velocity.y[eid] = (Velocity.y[eid] as number) + dy;
	return eid;
}

/**
 * Gets the current speed (magnitude of velocity).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Current speed or 0 if no velocity component
 */
export function getSpeed(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Velocity)) {
		return 0;
	}
	const vx = Velocity.x[eid] as number;
	const vy = Velocity.y[eid] as number;
	return Math.sqrt(vx * vx + vy * vy);
}

/**
 * Stops an entity (sets velocity to zero).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function stopEntity(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Velocity)) {
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
	}
	return eid;
}

/**
 * Removes velocity from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeVelocity(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Velocity)) {
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
		Velocity.maxSpeed[eid] = 0;
		Velocity.friction[eid] = 0;
	}
	return eid;
}

// =============================================================================
// ACCELERATION COMPONENT
// =============================================================================

/**
 * Acceleration component store using SoA (Structure of Arrays) for performance.
 *
 * Acceleration is applied to velocity each frame.
 *
 * @example
 * ```typescript
 * import { Acceleration, setAcceleration, getAcceleration } from 'blecsd';
 *
 * // Set gravity
 * setAcceleration(world, entity, 0, 9.8); // Gravity down
 *
 * // Get current acceleration
 * const accel = getAcceleration(world, entity);
 * ```
 */
export const Acceleration = {
	/** X acceleration in cells per second squared */
	x: new Float32Array(DEFAULT_CAPACITY),
	/** Y acceleration in cells per second squared */
	y: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Acceleration data returned by getAcceleration.
 */
export interface AccelerationData {
	readonly x: number;
	readonly y: number;
}

/**
 * Initializes acceleration component with default values.
 */
function initAcceleration(eid: Entity): void {
	Acceleration.x[eid] = 0;
	Acceleration.y[eid] = 0;
}

/**
 * Sets the acceleration of an entity.
 * Adds the Acceleration component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - X acceleration in cells per second squared
 * @param y - Y acceleration in cells per second squared
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAcceleration } from 'blecsd';
 *
 * // Apply gravity
 * setAcceleration(world, entity, 0, 20);
 *
 * // Apply thrust
 * setAcceleration(world, player, thrustX, thrustY);
 * ```
 */
export function setAcceleration(world: World, eid: Entity, x: number, y: number): Entity {
	if (!hasComponent(world, eid, Acceleration)) {
		addComponent(world, eid, Acceleration);
		initAcceleration(eid);
	}
	Acceleration.x[eid] = x;
	Acceleration.y[eid] = y;
	return eid;
}

/**
 * Gets the acceleration data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Acceleration data or undefined
 */
export function getAcceleration(world: World, eid: Entity): AccelerationData | undefined {
	if (!hasComponent(world, eid, Acceleration)) {
		return undefined;
	}
	return {
		x: Acceleration.x[eid] as number,
		y: Acceleration.y[eid] as number,
	};
}

/**
 * Checks if an entity has an Acceleration component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Acceleration component
 */
export function hasAcceleration(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Acceleration);
}

/**
 * Clears acceleration (sets to zero).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function clearAcceleration(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Acceleration)) {
		Acceleration.x[eid] = 0;
		Acceleration.y[eid] = 0;
	}
	return eid;
}

/**
 * Removes acceleration from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeAcceleration(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Acceleration)) {
		Acceleration.x[eid] = 0;
		Acceleration.y[eid] = 0;
	}
	return eid;
}

// =============================================================================
// MOVEMENT UPDATE FUNCTIONS
// =============================================================================

/**
 * Applies acceleration to velocity for a single entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param deltaTime - Time elapsed in seconds
 */
export function applyAccelerationToEntity(_world: World, eid: Entity, deltaTime: number): void {
	if (Acceleration.x[eid] === undefined || Velocity.x[eid] === undefined) {
		return;
	}
	Velocity.x[eid] = (Velocity.x[eid] as number) + (Acceleration.x[eid] as number) * deltaTime;
	Velocity.y[eid] = (Velocity.y[eid] as number) + (Acceleration.y[eid] as number) * deltaTime;
}

/**
 * Applies friction to velocity for a single entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param deltaTime - Time elapsed in seconds
 */
export function applyFrictionToEntity(_world: World, eid: Entity, deltaTime: number): void {
	const friction = Velocity.friction[eid] as number;
	if (friction <= 0) {
		return;
	}

	// Friction reduces velocity exponentially
	const factor = 1 - friction * deltaTime;
	if (factor <= 0) {
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
		return;
	}

	Velocity.x[eid] = (Velocity.x[eid] as number) * factor;
	Velocity.y[eid] = (Velocity.y[eid] as number) * factor;
}

/**
 * Clamps velocity to max speed for a single entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clampSpeedForEntity(_world: World, eid: Entity): void {
	const maxSpeed = Velocity.maxSpeed[eid] as number;
	if (maxSpeed <= 0) {
		return;
	}

	const vx = Velocity.x[eid] as number;
	const vy = Velocity.y[eid] as number;
	const speed = Math.sqrt(vx * vx + vy * vy);

	if (speed > maxSpeed) {
		const scale = maxSpeed / speed;
		Velocity.x[eid] = vx * scale;
		Velocity.y[eid] = vy * scale;
	}
}

/**
 * Applies velocity to position for a single entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param deltaTime - Time elapsed in seconds
 */
export function applyVelocityToEntity(_world: World, eid: Entity, deltaTime: number): void {
	if (Position.x[eid] === undefined || Velocity.x[eid] === undefined) {
		return;
	}
	Position.x[eid] = (Position.x[eid] as number) + (Velocity.x[eid] as number) * deltaTime;
	Position.y[eid] = (Position.y[eid] as number) + (Velocity.y[eid] as number) * deltaTime;
}

/**
 * Updates movement for a single entity (full update cycle).
 * Applies: acceleration -> velocity -> friction -> clamp -> position.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param deltaTime - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateEntityMovement } from 'blecsd';
 *
 * // Manual movement update
 * updateEntityMovement(world, entity, 0.016);
 * ```
 */
export function updateEntityMovement(world: World, eid: Entity, deltaTime: number): void {
	if (!hasVelocity(world, eid)) {
		return;
	}

	// Apply acceleration if present
	if (hasAcceleration(world, eid)) {
		applyAccelerationToEntity(world, eid, deltaTime);
	}

	// Apply friction
	applyFrictionToEntity(world, eid, deltaTime);

	// Clamp to max speed
	clampSpeedForEntity(world, eid);

	// Apply velocity to position
	if (hasPosition(world, eid)) {
		applyVelocityToEntity(world, eid, deltaTime);
	}
}
