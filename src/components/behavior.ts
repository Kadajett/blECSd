/**
 * AI/Behavior component for game entities.
 *
 * Provides a lightweight behavior tree system with common AI behaviors
 * (idle, patrol, chase, flee) and support for custom behaviors.
 * Uses SoA (Structure of Arrays) for ECS performance.
 *
 * @module components/behavior
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Behavior component store using SoA (Structure of Arrays) for performance.
 *
 * - `behaviorType`: Current behavior type (see BehaviorType enum)
 * - `state`: Current state within the behavior (see BehaviorState enum)
 * - `targetEntity`: Entity ID to chase/flee from (0 = no target)
 * - `waitTimer`: Remaining wait time in seconds
 * - `patrolIndex`: Current patrol point index
 * - `patrolCount`: Total number of patrol points
 * - `speed`: Movement speed for this behavior
 * - `detectionRange`: Range for detecting targets (chase/flee)
 * - `fleeRange`: Distance to flee before stopping
 *
 * @example
 * ```typescript
 * import { setBehavior, BehaviorType, updateBehavior } from 'blecsd';
 *
 * setBehavior(world, entity, { type: BehaviorType.Patrol, speed: 2 });
 * updateBehavior(world, entity, deltaTime);
 * ```
 */
export const Behavior = {
	/** Current behavior type */
	behaviorType: new Uint8Array(DEFAULT_CAPACITY),
	/** Current state within the behavior */
	state: new Uint8Array(DEFAULT_CAPACITY),
	/** Target entity for chase/flee (0 = none) */
	targetEntity: new Uint32Array(DEFAULT_CAPACITY),
	/** Remaining wait time in seconds */
	waitTimer: new Float32Array(DEFAULT_CAPACITY),
	/** Current patrol point index */
	patrolIndex: new Uint16Array(DEFAULT_CAPACITY),
	/** Total number of patrol points */
	patrolCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Movement speed for this behavior */
	speed: new Float32Array(DEFAULT_CAPACITY),
	/** Range for detecting targets */
	detectionRange: new Float32Array(DEFAULT_CAPACITY),
	/** Distance to flee before stopping */
	fleeRange: new Float32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Available behavior types.
 */
export const BehaviorType = {
	/** No behavior, entity is idle */
	Idle: 0,
	/** Patrol between waypoints */
	Patrol: 1,
	/** Chase a target entity */
	Chase: 2,
	/** Flee from a target entity */
	Flee: 3,
	/** User-defined custom behavior */
	Custom: 4,
} as const;
export type BehaviorTypeValue = (typeof BehaviorType)[keyof typeof BehaviorType];

/**
 * Behavior execution states.
 */
export const BehaviorState = {
	/** Behavior is inactive */
	Inactive: 0,
	/** Behavior is actively running */
	Active: 1,
	/** Behavior is waiting (timer) */
	Waiting: 2,
	/** Behavior has completed */
	Completed: 3,
} as const;
export type BehaviorStateValue = (typeof BehaviorState)[keyof typeof BehaviorState];

// =============================================================================
// TYPES
// =============================================================================

/**
 * A 2D point used for patrol waypoints.
 */
export interface Point2D {
	readonly x: number;
	readonly y: number;
}

/**
 * Patrol route data stored in a side store.
 */
export interface PatrolRoute {
	readonly points: readonly Point2D[];
	readonly loop: boolean;
	readonly waitTime: number;
}

/**
 * Custom behavior callback.
 */
export type CustomBehaviorCallback = (world: World, eid: Entity, delta: number) => void;

/**
 * Behavior data returned by getBehavior.
 */
export interface BehaviorData {
	readonly type: BehaviorTypeValue;
	readonly state: BehaviorStateValue;
	readonly targetEntity: number;
	readonly waitTimer: number;
	readonly patrolIndex: number;
	readonly patrolCount: number;
	readonly speed: number;
	readonly detectionRange: number;
	readonly fleeRange: number;
}

/**
 * Options for setting behavior on an entity.
 */
export interface BehaviorOptions {
	/** Behavior type (default: Idle) */
	type?: BehaviorTypeValue;
	/** Movement speed (default: 1) */
	speed?: number;
	/** Target entity for chase/flee (default: 0) */
	targetEntity?: number;
	/** Detection range for chase/flee (default: 10) */
	detectionRange?: number;
	/** Distance to flee before stopping (default: 15) */
	fleeRange?: number;
}

// =============================================================================
// SIDE STORES
// =============================================================================

/** Patrol routes keyed by entity ID */
const patrolRoutes = new Map<number, PatrolRoute>();

/** Custom behavior callbacks keyed by entity ID */
const customCallbacks = new Map<number, CustomBehaviorCallback>();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Initializes Behavior component values to defaults.
 */
function initBehavior(eid: Entity): void {
	Behavior.behaviorType[eid] = BehaviorType.Idle;
	Behavior.state[eid] = BehaviorState.Inactive;
	Behavior.targetEntity[eid] = 0;
	Behavior.waitTimer[eid] = 0;
	Behavior.patrolIndex[eid] = 0;
	Behavior.patrolCount[eid] = 0;
	Behavior.speed[eid] = 1;
	Behavior.detectionRange[eid] = 10;
	Behavior.fleeRange[eid] = 15;
}

/**
 * Sets behavior on an entity. Adds the Behavior component if not present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Behavior configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setBehavior, BehaviorType } from 'blecsd';
 *
 * setBehavior(world, entity, { type: BehaviorType.Chase, speed: 3, targetEntity: player });
 * ```
 */
export function setBehavior(world: World, eid: Entity, options: BehaviorOptions = {}): Entity {
	if (!hasComponent(world, eid, Behavior)) {
		addComponent(world, eid, Behavior);
		initBehavior(eid);
	}

	Behavior.behaviorType[eid] = options.type ?? BehaviorType.Idle;
	Behavior.speed[eid] = options.speed ?? 1;
	Behavior.targetEntity[eid] = options.targetEntity ?? 0;
	Behavior.detectionRange[eid] = options.detectionRange ?? 10;
	Behavior.fleeRange[eid] = options.fleeRange ?? 15;
	Behavior.state[eid] = BehaviorState.Active;

	return eid;
}

/**
 * Gets the behavior data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Behavior data or undefined if no Behavior component
 *
 * @example
 * ```typescript
 * import { getBehavior } from 'blecsd';
 *
 * const ai = getBehavior(world, entity);
 * if (ai) {
 *   console.log(`Behavior: ${ai.type}, State: ${ai.state}`);
 * }
 * ```
 */
export function getBehavior(world: World, eid: Entity): BehaviorData | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}
	return {
		type: Behavior.behaviorType[eid] as BehaviorTypeValue,
		state: Behavior.state[eid] as BehaviorStateValue,
		targetEntity: Behavior.targetEntity[eid] as number,
		waitTimer: Behavior.waitTimer[eid] as number,
		patrolIndex: Behavior.patrolIndex[eid] as number,
		patrolCount: Behavior.patrolCount[eid] as number,
		speed: Behavior.speed[eid] as number,
		detectionRange: Behavior.detectionRange[eid] as number,
		fleeRange: Behavior.fleeRange[eid] as number,
	};
}

/**
 * Checks if an entity has a Behavior component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Behavior
 */
export function hasBehavior(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Behavior);
}

/**
 * Removes the Behavior component from an entity.
 * Also cleans up side stores (patrol routes, custom callbacks).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeBehavior(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Behavior)) {
		removeComponent(world, eid, Behavior);
	}
	patrolRoutes.delete(eid);
	customCallbacks.delete(eid);
	return eid;
}

// =============================================================================
// BEHAVIOR TYPE SETTERS
// =============================================================================

/**
 * Sets an entity to idle behavior.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function setIdle(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.behaviorType[eid] = BehaviorType.Idle;
	Behavior.state[eid] = BehaviorState.Active;
	Behavior.targetEntity[eid] = 0;
}

/**
 * Sets an entity to patrol behavior with waypoints.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param points - Array of waypoints to patrol
 * @param options - Patrol options
 *
 * @example
 * ```typescript
 * import { setPatrol } from 'blecsd';
 *
 * setPatrol(world, guard, [
 *   { x: 10, y: 5 },
 *   { x: 20, y: 5 },
 *   { x: 20, y: 15 },
 * ], { loop: true, waitTime: 2 });
 * ```
 */
export function setPatrol(
	world: World,
	eid: Entity,
	points: readonly Point2D[],
	options: { loop?: boolean; waitTime?: number } = {},
): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	if (points.length === 0) {
		return;
	}

	Behavior.behaviorType[eid] = BehaviorType.Patrol;
	Behavior.state[eid] = BehaviorState.Active;
	Behavior.patrolIndex[eid] = 0;
	Behavior.patrolCount[eid] = points.length;
	Behavior.waitTimer[eid] = 0;

	patrolRoutes.set(eid, {
		points: [...points],
		loop: options.loop ?? true,
		waitTime: options.waitTime ?? 0,
	});
}

/**
 * Sets an entity to chase a target.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param target - The entity to chase
 */
export function setChase(world: World, eid: Entity, target: Entity): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.behaviorType[eid] = BehaviorType.Chase;
	Behavior.state[eid] = BehaviorState.Active;
	Behavior.targetEntity[eid] = target;
}

/**
 * Sets an entity to flee from a target.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param target - The entity to flee from
 */
export function setFlee(world: World, eid: Entity, target: Entity): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.behaviorType[eid] = BehaviorType.Flee;
	Behavior.state[eid] = BehaviorState.Active;
	Behavior.targetEntity[eid] = target;
}

/**
 * Sets a custom behavior callback on an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param callback - The custom behavior function
 */
export function setCustomBehavior(
	world: World,
	eid: Entity,
	callback: CustomBehaviorCallback,
): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.behaviorType[eid] = BehaviorType.Custom;
	Behavior.state[eid] = BehaviorState.Active;
	customCallbacks.set(eid, callback);
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Gets the current behavior type of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The behavior type, or undefined if no Behavior component
 */
export function getBehaviorType(world: World, eid: Entity): BehaviorTypeValue | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}
	return Behavior.behaviorType[eid] as BehaviorTypeValue;
}

/**
 * Gets the current behavior state of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The behavior state, or undefined if no Behavior component
 */
export function getBehaviorState(world: World, eid: Entity): BehaviorStateValue | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}
	return Behavior.state[eid] as BehaviorStateValue;
}

/**
 * Gets the target entity of a behavior.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Target entity ID, or 0 if no target or no Behavior component
 */
export function getBehaviorTarget(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Behavior)) {
		return 0;
	}
	return Behavior.targetEntity[eid] as number;
}

/**
 * Sets the behavior target entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param target - The target entity ID
 */
export function setBehaviorTarget(world: World, eid: Entity, target: Entity): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.targetEntity[eid] = target;
}

/**
 * Sets the behavior speed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param speed - Movement speed
 */
export function setBehaviorSpeed(world: World, eid: Entity, speed: number): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.speed[eid] = speed;
}

/**
 * Sets the detection range for chase/flee behaviors.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param range - Detection range
 */
export function setDetectionRange(world: World, eid: Entity, range: number): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	Behavior.detectionRange[eid] = range;
}

/**
 * Checks if a behavior is currently active.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the behavior state is Active
 */
export function isBehaviorActive(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Behavior)) {
		return false;
	}
	return (Behavior.state[eid] as number) === BehaviorState.Active;
}

/**
 * Checks if a behavior is in the waiting state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the behavior state is Waiting
 */
export function isBehaviorWaiting(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Behavior)) {
		return false;
	}
	return (Behavior.state[eid] as number) === BehaviorState.Waiting;
}

/**
 * Checks if a behavior has completed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the behavior state is Completed
 */
export function isBehaviorCompleted(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Behavior)) {
		return false;
	}
	return (Behavior.state[eid] as number) === BehaviorState.Completed;
}

/**
 * Gets the patrol route for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The patrol route, or undefined if none set
 */
export function getPatrolRoute(world: World, eid: Entity): PatrolRoute | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}
	return patrolRoutes.get(eid);
}

/**
 * Gets the current patrol waypoint for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current waypoint, or undefined
 */
export function getCurrentPatrolPoint(world: World, eid: Entity): Point2D | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}
	const route = patrolRoutes.get(eid);
	if (!route) {
		return undefined;
	}
	const index = Behavior.patrolIndex[eid] as number;
	return route.points[index];
}

// =============================================================================
// BEHAVIOR UPDATE
// =============================================================================

/**
 * Result from computing a behavior direction.
 */
export interface BehaviorDirection {
	readonly dx: number;
	readonly dy: number;
}

/**
 * Computes the movement direction for patrol behavior.
 * Returns the direction to the current waypoint.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param currentX - Current entity X position
 * @param currentY - Current entity Y position
 * @param delta - Time elapsed in seconds
 * @returns Movement direction, or undefined if no movement needed
 */
export function computePatrolDirection(
	world: World,
	eid: Entity,
	currentX: number,
	currentY: number,
	delta: number,
): BehaviorDirection | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}

	const route = patrolRoutes.get(eid);
	if (!route || route.points.length === 0) {
		return undefined;
	}

	// Handle waiting state
	if ((Behavior.state[eid] as number) === BehaviorState.Waiting) {
		const remaining = (Behavior.waitTimer[eid] as number) - delta;
		if (remaining > 0) {
			Behavior.waitTimer[eid] = remaining;
			return undefined;
		}
		Behavior.waitTimer[eid] = 0;
		Behavior.state[eid] = BehaviorState.Active;
	}

	const index = Behavior.patrolIndex[eid] as number;
	const target = route.points[index];
	if (!target) {
		return undefined;
	}

	const dx = target.x - currentX;
	const dy = target.y - currentY;
	const dist = Math.sqrt(dx * dx + dy * dy);
	const speed = Behavior.speed[eid] as number;
	const threshold = speed * delta * 0.5;

	// Reached waypoint
	if (dist <= threshold) {
		return advancePatrolPoint(eid, route);
	}

	// Move toward waypoint
	return { dx: (dx / dist) * speed, dy: (dy / dist) * speed };
}

/**
 * Advances to the next patrol point.
 */
function advancePatrolPoint(eid: Entity, route: PatrolRoute): BehaviorDirection | undefined {
	const nextIndex = (Behavior.patrolIndex[eid] as number) + 1;

	if (nextIndex >= route.points.length) {
		if (route.loop) {
			Behavior.patrolIndex[eid] = 0;
		} else {
			Behavior.state[eid] = BehaviorState.Completed;
			return undefined;
		}
	} else {
		Behavior.patrolIndex[eid] = nextIndex;
	}

	// Enter waiting if configured
	if (route.waitTime > 0) {
		Behavior.state[eid] = BehaviorState.Waiting;
		Behavior.waitTimer[eid] = route.waitTime;
		return undefined;
	}

	return { dx: 0, dy: 0 };
}

/**
 * Computes the movement direction for chase behavior.
 * Moves toward the target entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param currentX - Current entity X position
 * @param currentY - Current entity Y position
 * @param targetX - Target entity X position
 * @param targetY - Target entity Y position
 * @returns Movement direction, or undefined if no movement needed
 */
export function computeChaseDirection(
	world: World,
	eid: Entity,
	currentX: number,
	currentY: number,
	targetX: number,
	targetY: number,
): BehaviorDirection | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}

	const dx = targetX - currentX;
	const dy = targetY - currentY;
	const dist = Math.sqrt(dx * dx + dy * dy);

	if (dist === 0) {
		return { dx: 0, dy: 0 };
	}

	const range = Behavior.detectionRange[eid] as number;
	if (range > 0 && dist > range) {
		return undefined;
	}

	const speed = Behavior.speed[eid] as number;
	return { dx: (dx / dist) * speed, dy: (dy / dist) * speed };
}

/**
 * Computes the movement direction for flee behavior.
 * Moves away from the target entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param currentX - Current entity X position
 * @param currentY - Current entity Y position
 * @param targetX - Target entity X position
 * @param targetY - Target entity Y position
 * @returns Movement direction, or undefined if no movement needed
 */
export function computeFleeDirection(
	world: World,
	eid: Entity,
	currentX: number,
	currentY: number,
	targetX: number,
	targetY: number,
): BehaviorDirection | undefined {
	if (!hasComponent(world, eid, Behavior)) {
		return undefined;
	}

	const dx = currentX - targetX;
	const dy = currentY - targetY;
	const dist = Math.sqrt(dx * dx + dy * dy);

	const fleeRange = Behavior.fleeRange[eid] as number;
	if (fleeRange > 0 && dist >= fleeRange) {
		return undefined;
	}

	if (dist === 0) {
		return { dx: 1, dy: 0 };
	}

	const speed = Behavior.speed[eid] as number;
	return { dx: (dx / dist) * speed, dy: (dy / dist) * speed };
}

/**
 * Executes a custom behavior callback.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param delta - Time elapsed in seconds
 */
export function executeCustomBehavior(world: World, eid: Entity, delta: number): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}
	const callback = customCallbacks.get(eid);
	if (callback) {
		callback(world, eid, delta);
	}
}

/**
 * Updates behavior wait timer. Call this each frame.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param delta - Time elapsed in seconds
 */
export function updateBehaviorTimer(world: World, eid: Entity, delta: number): void {
	if (!hasComponent(world, eid, Behavior)) {
		return;
	}

	if ((Behavior.state[eid] as number) !== BehaviorState.Waiting) {
		return;
	}

	const remaining = (Behavior.waitTimer[eid] as number) - delta;
	if (remaining <= 0) {
		Behavior.waitTimer[eid] = 0;
		Behavior.state[eid] = BehaviorState.Active;
	} else {
		Behavior.waitTimer[eid] = remaining;
	}
}

// =============================================================================
// STORE RESET
// =============================================================================

/**
 * Resets all behavior side stores. Useful for testing.
 */
export function resetBehaviorStore(): void {
	patrolRoutes.clear();
	customCallbacks.clear();
}
