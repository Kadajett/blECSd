/**
 * Collision component for entity collision detection.
 * @module components/collision
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COLLIDER TYPES
// =============================================================================

/**
 * Collider shape types.
 */
export enum ColliderType {
	/** Axis-aligned bounding box */
	BOX = 0,
	/** Circle collider */
	CIRCLE = 1,
}

// =============================================================================
// COLLIDER COMPONENT
// =============================================================================

/**
 * Collider component store using SoA (Structure of Arrays) for performance.
 *
 * - `type`: Collider shape (BOX or CIRCLE)
 * - `width`, `height`: Dimensions (for BOX, height ignored for CIRCLE where width=diameter)
 * - `offsetX`, `offsetY`: Offset from entity position
 * - `layer`: Collision layer bitmask (what layer this entity is on)
 * - `mask`: Collision mask bitmask (what layers to collide with)
 * - `isTrigger`: Whether collider is a trigger (events only, no physics response)
 *
 * @example
 * ```typescript
 * import { setCollider, ColliderType } from 'blecsd';
 *
 * // Box collider
 * setCollider(world, entity, {
 *   type: ColliderType.BOX,
 *   width: 2,
 *   height: 1,
 * });
 *
 * // Circle collider as trigger
 * setCollider(world, entity, {
 *   type: ColliderType.CIRCLE,
 *   width: 3, // diameter
 *   isTrigger: true,
 * });
 * ```
 */
export const Collider = {
	/** Collider type (0=BOX, 1=CIRCLE) */
	type: new Uint8Array(DEFAULT_CAPACITY),
	/** Width (or diameter for circles) */
	width: new Float32Array(DEFAULT_CAPACITY),
	/** Height (ignored for circles) */
	height: new Float32Array(DEFAULT_CAPACITY),
	/** X offset from entity position */
	offsetX: new Float32Array(DEFAULT_CAPACITY),
	/** Y offset from entity position */
	offsetY: new Float32Array(DEFAULT_CAPACITY),
	/** Collision layer bitmask */
	layer: new Uint16Array(DEFAULT_CAPACITY),
	/** Collision mask (layers to collide with) */
	mask: new Uint16Array(DEFAULT_CAPACITY),
	/** Whether this is a trigger (1) or solid (0) */
	isTrigger: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Collider data returned by getCollider.
 */
export interface ColliderData {
	readonly type: ColliderType;
	readonly width: number;
	readonly height: number;
	readonly offsetX: number;
	readonly offsetY: number;
	readonly layer: number;
	readonly mask: number;
	readonly isTrigger: boolean;
}

/**
 * Options for setting a collider.
 */
export interface ColliderOptions {
	/** Collider type (default: BOX) */
	type?: ColliderType;
	/** Width or diameter (default: 1) */
	width?: number;
	/** Height, ignored for circles (default: 1) */
	height?: number;
	/** X offset from position (default: 0) */
	offsetX?: number;
	/** Y offset from position (default: 0) */
	offsetY?: number;
	/** Collision layer bitmask (default: 1) */
	layer?: number;
	/** Collision mask (default: 0xFFFF - collide with all) */
	mask?: number;
	/** Whether this is a trigger only (default: false) */
	isTrigger?: boolean;
}

/**
 * Default collision layer.
 */
export const DEFAULT_LAYER = 1;

/**
 * Default collision mask (collide with all layers).
 */
export const DEFAULT_MASK = 0xffff;

/**
 * Initializes collider component with default values.
 */
function initCollider(eid: Entity): void {
	Collider.type[eid] = ColliderType.BOX;
	Collider.width[eid] = 1;
	Collider.height[eid] = 1;
	Collider.offsetX[eid] = 0;
	Collider.offsetY[eid] = 0;
	Collider.layer[eid] = DEFAULT_LAYER;
	Collider.mask[eid] = DEFAULT_MASK;
	Collider.isTrigger[eid] = 0;
}

/**
 * Sets a collider on an entity.
 * Adds the Collider component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Collider options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCollider, ColliderType } from 'blecsd';
 *
 * // Create a box collider
 * setCollider(world, player, {
 *   type: ColliderType.BOX,
 *   width: 1,
 *   height: 2,
 *   layer: 0b0001,  // Player layer
 *   mask: 0b0110,   // Collide with enemies and walls
 * });
 *
 * // Create a trigger zone
 * setCollider(world, checkpoint, {
 *   type: ColliderType.BOX,
 *   width: 3,
 *   height: 3,
 *   isTrigger: true,
 * });
 * ```
 */
export function setCollider(world: World, eid: Entity, options: ColliderOptions = {}): Entity {
	if (!hasComponent(world, eid, Collider)) {
		addComponent(world, eid, Collider);
		initCollider(eid);
	}

	if (options.type !== undefined) Collider.type[eid] = options.type;
	if (options.width !== undefined) Collider.width[eid] = options.width;
	if (options.height !== undefined) Collider.height[eid] = options.height;
	if (options.offsetX !== undefined) Collider.offsetX[eid] = options.offsetX;
	if (options.offsetY !== undefined) Collider.offsetY[eid] = options.offsetY;
	if (options.layer !== undefined) Collider.layer[eid] = options.layer;
	if (options.mask !== undefined) Collider.mask[eid] = options.mask;
	if (options.isTrigger !== undefined) Collider.isTrigger[eid] = options.isTrigger ? 1 : 0;

	return eid;
}

/**
 * Gets the collider data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Collider data or undefined
 *
 * @example
 * ```typescript
 * import { getCollider } from 'blecsd';
 *
 * const collider = getCollider(world, entity);
 * if (collider) {
 *   console.log(`Collider: ${collider.width}x${collider.height}`);
 * }
 * ```
 */
export function getCollider(world: World, eid: Entity): ColliderData | undefined {
	if (!hasComponent(world, eid, Collider)) {
		return undefined;
	}
	return {
		type: Collider.type[eid] as ColliderType,
		width: Collider.width[eid] as number,
		height: Collider.height[eid] as number,
		offsetX: Collider.offsetX[eid] as number,
		offsetY: Collider.offsetY[eid] as number,
		layer: Collider.layer[eid] as number,
		mask: Collider.mask[eid] as number,
		isTrigger: (Collider.isTrigger[eid] as number) === 1,
	};
}

/**
 * Checks if an entity has a Collider component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Collider component
 */
export function hasCollider(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Collider);
}

/**
 * Removes the collider from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeCollider(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Collider)) {
		removeComponent(world, eid, Collider);
	}
	return eid;
}

/**
 * Sets the collision layer for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param layer - The collision layer bitmask
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCollisionLayer } from 'blecsd';
 *
 * // Put entity on layer 2
 * setCollisionLayer(world, entity, 0b0010);
 * ```
 */
export function setCollisionLayer(world: World, eid: Entity, layer: number): Entity {
	if (!hasComponent(world, eid, Collider)) {
		addComponent(world, eid, Collider);
		initCollider(eid);
	}
	Collider.layer[eid] = layer;
	return eid;
}

/**
 * Sets the collision mask for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param mask - The collision mask bitmask
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCollisionMask } from 'blecsd';
 *
 * // Only collide with layers 1 and 3
 * setCollisionMask(world, entity, 0b0101);
 * ```
 */
export function setCollisionMask(world: World, eid: Entity, mask: number): Entity {
	if (!hasComponent(world, eid, Collider)) {
		addComponent(world, eid, Collider);
		initCollider(eid);
	}
	Collider.mask[eid] = mask;
	return eid;
}

/**
 * Sets whether the collider is a trigger.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param isTrigger - Whether collider is trigger-only
 * @returns The entity ID for chaining
 */
export function setTrigger(world: World, eid: Entity, isTrigger: boolean): Entity {
	if (!hasComponent(world, eid, Collider)) {
		addComponent(world, eid, Collider);
		initCollider(eid);
	}
	Collider.isTrigger[eid] = isTrigger ? 1 : 0;
	return eid;
}

/**
 * Checks if a collider is a trigger.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if collider is a trigger
 */
export function isTrigger(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Collider)) {
		return false;
	}
	return (Collider.isTrigger[eid] as number) === 1;
}

/**
 * Checks if two layers can collide based on layer/mask.
 *
 * @param layerA - Layer of entity A
 * @param maskA - Mask of entity A
 * @param layerB - Layer of entity B
 * @param maskB - Mask of entity B
 * @returns true if the entities can collide
 *
 * @example
 * ```typescript
 * import { canLayersCollide } from 'blecsd';
 *
 * // Check if player (layer 1, mask 6) can collide with enemy (layer 2, mask 1)
 * const canCollide = canLayersCollide(1, 6, 2, 1); // true
 * ```
 */
export function canLayersCollide(
	layerA: number,
	maskA: number,
	layerB: number,
	maskB: number,
): boolean {
	// A's mask must include B's layer AND B's mask must include A's layer
	return (maskA & layerB) !== 0 && (maskB & layerA) !== 0;
}

// =============================================================================
// COLLISION BOUNDS
// =============================================================================

/**
 * Axis-aligned bounding box.
 */
export interface AABB {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}

/**
 * Gets the AABB for an entity's collider at a given position.
 *
 * @param eid - The entity ID
 * @param posX - Entity X position
 * @param posY - Entity Y position
 * @returns The AABB bounds
 *
 * @example
 * ```typescript
 * import { getColliderAABB, Position } from 'blecsd';
 *
 * const bounds = getColliderAABB(entity, Position.x[entity], Position.y[entity]);
 * console.log(`Bounds: ${bounds.minX},${bounds.minY} to ${bounds.maxX},${bounds.maxY}`);
 * ```
 */
export function getColliderAABB(eid: Entity, posX: number, posY: number): AABB {
	const type = Collider.type[eid] as number;
	const width = Collider.width[eid] as number;
	const height = Collider.height[eid] as number;
	const offsetX = Collider.offsetX[eid] as number;
	const offsetY = Collider.offsetY[eid] as number;

	const centerX = posX + offsetX;
	const centerY = posY + offsetY;

	if (type === ColliderType.CIRCLE) {
		const radius = width / 2;
		return {
			minX: centerX - radius,
			minY: centerY - radius,
			maxX: centerX + radius,
			maxY: centerY + radius,
		};
	}

	// BOX
	const halfW = width / 2;
	const halfH = height / 2;
	return {
		minX: centerX - halfW,
		minY: centerY - halfH,
		maxX: centerX + halfW,
		maxY: centerY + halfH,
	};
}

// =============================================================================
// COLLISION TESTING
// =============================================================================

/**
 * Tests if two AABBs overlap.
 *
 * @param a - First AABB
 * @param b - Second AABB
 * @returns true if the AABBs overlap
 *
 * @example
 * ```typescript
 * import { testAABBOverlap } from 'blecsd';
 *
 * const overlaps = testAABBOverlap(boundsA, boundsB);
 * ```
 */
export function testAABBOverlap(a: AABB, b: AABB): boolean {
	return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * Tests if two circles overlap.
 *
 * @param x1 - Center X of first circle
 * @param y1 - Center Y of first circle
 * @param r1 - Radius of first circle
 * @param x2 - Center X of second circle
 * @param y2 - Center Y of second circle
 * @param r2 - Radius of second circle
 * @returns true if the circles overlap
 */
export function testCircleOverlap(
	x1: number,
	y1: number,
	r1: number,
	x2: number,
	y2: number,
	r2: number,
): boolean {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const distSq = dx * dx + dy * dy;
	const radiiSum = r1 + r2;
	return distSq < radiiSum * radiiSum;
}

/**
 * Tests if a circle overlaps with an AABB.
 *
 * @param cx - Circle center X
 * @param cy - Circle center Y
 * @param radius - Circle radius
 * @param box - The AABB
 * @returns true if they overlap
 */
export function testCircleAABBOverlap(cx: number, cy: number, radius: number, box: AABB): boolean {
	// Find the closest point on the AABB to the circle center
	const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
	const closestY = Math.max(box.minY, Math.min(cy, box.maxY));

	// Check if that point is within the circle
	const dx = cx - closestX;
	const dy = cy - closestY;
	return dx * dx + dy * dy < radius * radius;
}

/**
 * Tests if two entities' colliders overlap.
 * Handles all combinations of BOX and CIRCLE colliders.
 *
 * @param eidA - First entity
 * @param posAX - First entity X position
 * @param posAY - First entity Y position
 * @param eidB - Second entity
 * @param posBX - Second entity X position
 * @param posBY - Second entity Y position
 * @returns true if the colliders overlap
 *
 * @example
 * ```typescript
 * import { testCollision, Position } from 'blecsd';
 *
 * const colliding = testCollision(
 *   entityA, Position.x[entityA], Position.y[entityA],
 *   entityB, Position.x[entityB], Position.y[entityB]
 * );
 * ```
 */
export function testCollision(
	eidA: Entity,
	posAX: number,
	posAY: number,
	eidB: Entity,
	posBX: number,
	posBY: number,
): boolean {
	const typeA = Collider.type[eidA] as number;
	const typeB = Collider.type[eidB] as number;

	const offsetAX = Collider.offsetX[eidA] as number;
	const offsetAY = Collider.offsetY[eidA] as number;
	const offsetBX = Collider.offsetX[eidB] as number;
	const offsetBY = Collider.offsetY[eidB] as number;

	const centerAX = posAX + offsetAX;
	const centerAY = posAY + offsetAY;
	const centerBX = posBX + offsetBX;
	const centerBY = posBY + offsetBY;

	// Circle vs Circle
	if (typeA === ColliderType.CIRCLE && typeB === ColliderType.CIRCLE) {
		const radiusA = (Collider.width[eidA] as number) / 2;
		const radiusB = (Collider.width[eidB] as number) / 2;
		return testCircleOverlap(centerAX, centerAY, radiusA, centerBX, centerBY, radiusB);
	}

	// Box vs Box
	if (typeA === ColliderType.BOX && typeB === ColliderType.BOX) {
		const aabbA = getColliderAABB(eidA, posAX, posAY);
		const aabbB = getColliderAABB(eidB, posBX, posBY);
		return testAABBOverlap(aabbA, aabbB);
	}

	// Circle vs Box
	if (typeA === ColliderType.CIRCLE && typeB === ColliderType.BOX) {
		const radiusA = (Collider.width[eidA] as number) / 2;
		const aabbB = getColliderAABB(eidB, posBX, posBY);
		return testCircleAABBOverlap(centerAX, centerAY, radiusA, aabbB);
	}

	// Box vs Circle
	if (typeA === ColliderType.BOX && typeB === ColliderType.CIRCLE) {
		const aabbA = getColliderAABB(eidA, posAX, posAY);
		const radiusB = (Collider.width[eidB] as number) / 2;
		return testCircleAABBOverlap(centerBX, centerBY, radiusB, aabbA);
	}

	return false;
}

// =============================================================================
// COLLISION PAIRS
// =============================================================================

/**
 * Represents a collision between two entities.
 */
export interface CollisionPair {
	readonly entityA: Entity;
	readonly entityB: Entity;
	readonly isTrigger: boolean;
}

/**
 * Creates a normalized collision pair (lower entity ID first).
 * This ensures consistent ordering for collision tracking.
 *
 * @param eidA - First entity
 * @param eidB - Second entity
 * @param isTrigger - Whether this is a trigger collision
 * @returns Normalized collision pair
 */
export function createCollisionPair(eidA: Entity, eidB: Entity, isTrigger: boolean): CollisionPair {
	// Normalize order so (A,B) and (B,A) produce the same pair
	if (eidA < eidB) {
		return { entityA: eidA, entityB: eidB, isTrigger };
	}
	return { entityA: eidB, entityB: eidA, isTrigger };
}

/**
 * Creates a unique key for a collision pair.
 *
 * @param pair - The collision pair
 * @returns A unique string key
 */
export function collisionPairKey(pair: CollisionPair): string {
	return `${pair.entityA}:${pair.entityB}`;
}
