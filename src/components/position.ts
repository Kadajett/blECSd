/**
 * Position component for entity positioning in the terminal grid.
 * @module components/position
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SetPositionSchema, ZIndexSchema } from '../schemas/components';
import { getDimensions } from './dimensions';
import { getParent, Hierarchy } from './hierarchy';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Position component store using SoA (Structure of Arrays) for performance.
 *
 * - `x`, `y`: Coordinates in the terminal grid (floats for smooth movement)
 * - `z`: Z-index for layering (higher values render on top)
 * - `absolute`: 0 = position relative to parent, 1 = absolute screen position
 *
 * @example
 * ```typescript
 * import { Position, setPosition, getPosition } from 'blecsd';
 *
 * // Position is automatically added when using setPosition
 * setPosition(world, entity, 10, 5);
 *
 * // Get current position
 * const pos = getPosition(world, entity);
 * console.log(pos.x, pos.y); // 10, 5
 * ```
 */
export const Position = {
	/** X coordinate in terminal cells */
	x: new Float32Array(DEFAULT_CAPACITY),
	/** Y coordinate in terminal cells */
	y: new Float32Array(DEFAULT_CAPACITY),
	/** Z-index for layering (0-65535) */
	z: new Uint16Array(DEFAULT_CAPACITY),
	/** 0 = relative to parent, 1 = absolute screen position */
	absolute: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Position data returned by getPosition.
 */
export interface PositionData {
	readonly x: number;
	readonly y: number;
	readonly z: number;
	readonly absolute: boolean;
}

/**
 * Sets the position of an entity.
 * Adds the Position component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z-index for layering (default: 0)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Set position
 * setPosition(world, entity, 10, 5);
 *
 * // With z-index
 * setPosition(world, entity, 10, 5, 100);
 * ```
 */
export function setPosition(world: World, eid: Entity, x: number, y: number, z = 0): Entity {
	SetPositionSchema.parse({ x, y, z });
	if (!hasComponent(world, eid, Position)) {
		addComponent(world, eid, Position);
		// Initialize all values to defaults when component is first added
		Position.absolute[eid] = 0;
	}
	Position.x[eid] = x;
	Position.y[eid] = y;
	Position.z[eid] = z;
	return eid;
}

/**
 * Gets the position data of an entity.
 * Returns undefined if the entity doesn't have a Position component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Position data or undefined
 *
 * @example
 * ```typescript
 * import { getPosition } from 'blecsd';
 *
 * const pos = getPosition(world, entity);
 * if (pos) {
 *   console.log(`Entity at (${pos.x}, ${pos.y}) z=${pos.z}`);
 * }
 * ```
 */
export function getPosition(world: World, eid: Entity): PositionData | undefined {
	if (!hasComponent(world, eid, Position)) {
		return undefined;
	}
	// Entity ID is guaranteed valid here since hasComponent returned true
	// TypeScript's noUncheckedIndexedAccess requires these assertions
	return {
		x: Position.x[eid] as number,
		y: Position.y[eid] as number,
		z: Position.z[eid] as number,
		absolute: Position.absolute[eid] === 1,
	};
}

/**
 * Sets whether the entity uses absolute positioning.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param absolute - true for absolute, false for relative to parent
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsolute } from 'blecsd';
 *
 * // Make entity use absolute screen coordinates
 * setAbsolute(world, entity, true);
 * ```
 */
export function setAbsolute(world: World, eid: Entity, absolute: boolean): Entity {
	if (!hasComponent(world, eid, Position)) {
		addComponent(world, eid, Position);
		// Initialize all values to 0 when component is first added
		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Position.z[eid] = 0;
	}
	Position.absolute[eid] = absolute ? 1 : 0;
	return eid;
}

/**
 * Checks if an entity uses absolute positioning.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if absolute, false if relative or no Position component
 *
 * @example
 * ```typescript
 * import { isAbsolute } from 'blecsd';
 *
 * if (isAbsolute(world, entity)) {
 *   // Use screen coordinates directly
 * }
 * ```
 */
export function isAbsolute(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Position)) {
		return false;
	}
	return Position.absolute[eid] === 1;
}

/**
 * Checks if an entity has a Position component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Position component
 *
 * @example
 * ```typescript
 * import { hasPosition } from 'blecsd';
 *
 * if (hasPosition(world, entity)) {
 *   // Safe to call getPosition
 * }
 * ```
 */
export function hasPosition(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Position);
}

/**
 * Moves an entity by a delta amount.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param dx - Delta X (added to current x)
 * @param dy - Delta Y (added to current y)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { moveBy } from 'blecsd';
 *
 * // Move entity 1 cell right, 2 cells down
 * moveBy(world, entity, 1, 2);
 * ```
 */
export function moveBy(world: World, eid: Entity, dx: number, dy: number): Entity {
	if (!hasComponent(world, eid, Position)) {
		addComponent(world, eid, Position);
		// Initialize all values to 0 when component is first added
		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Position.z[eid] = 0;
		Position.absolute[eid] = 0;
	}
	// Entity ID is guaranteed valid since we just ensured component exists
	Position.x[eid] = (Position.x[eid] as number) + dx;
	Position.y[eid] = (Position.y[eid] as number) + dy;
	return eid;
}

/**
 * Sets the z-index of an entity for layering.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param z - Z-index (0-65535, higher = on top)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setZIndex } from 'blecsd';
 *
 * // Bring entity to front
 * setZIndex(world, entity, 1000);
 * ```
 */
export function setZIndex(world: World, eid: Entity, z: number): Entity {
	ZIndexSchema.parse(z);
	if (!hasComponent(world, eid, Position)) {
		addComponent(world, eid, Position);
		// Initialize all values to 0 when component is first added
		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Position.absolute[eid] = 0;
	}
	Position.z[eid] = z;
	return eid;
}

/**
 * Gets the z-index of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Z-index value, or 0 if no Position component
 *
 * @example
 * ```typescript
 * import { getZIndex } from 'blecsd';
 *
 * const z = getZIndex(world, entity);
 * console.log(`Entity z-index: ${z}`);
 * ```
 */
export function getZIndex(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Position)) {
		return 0;
	}
	return Position.z[eid] as number;
}

/**
 * Brings an entity to the front of a set of entities.
 * Sets the z-index to one more than the maximum in the provided array.
 *
 * @param world - The ECS world
 * @param eid - The entity to bring to front
 * @param siblings - Array of sibling entities to compare against
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { bringToFront, getSiblings } from 'blecsd';
 *
 * // Bring entity to front of its siblings
 * const siblings = getSiblings(world, entity);
 * bringToFront(world, entity, siblings);
 * ```
 */
export function bringToFront(world: World, eid: Entity, siblings: readonly Entity[]): Entity {
	let maxZ = 0;

	for (const sibling of siblings) {
		if (sibling !== eid && hasComponent(world, sibling, Position)) {
			const z = Position.z[sibling] as number;
			if (z > maxZ) {
				maxZ = z;
			}
		}
	}

	// Set z-index one higher than max (capped at Uint16 max)
	const newZ = Math.min(maxZ + 1, 65535);
	return setZIndex(world, eid, newZ);
}

/**
 * Sends an entity to the back of a set of entities.
 * Sets the z-index to one less than the minimum in the provided array.
 *
 * @param world - The ECS world
 * @param eid - The entity to send to back
 * @param siblings - Array of sibling entities to compare against
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { sendToBack, getSiblings } from 'blecsd';
 *
 * // Send entity to back of its siblings
 * const siblings = getSiblings(world, entity);
 * sendToBack(world, entity, siblings);
 * ```
 */
export function sendToBack(world: World, eid: Entity, siblings: readonly Entity[]): Entity {
	let minZ = 65535;

	for (const sibling of siblings) {
		if (sibling !== eid && hasComponent(world, sibling, Position)) {
			const z = Position.z[sibling] as number;
			if (z < minZ) {
				minZ = z;
			}
		}
	}

	// Set z-index one lower than min (capped at 0)
	const newZ = Math.max(minZ - 1, 0);
	return setZIndex(world, eid, newZ);
}

/**
 * Moves an entity one step forward in z-order among siblings.
 * Finds the next higher z-index and sets this entity above it.
 *
 * @param world - The ECS world
 * @param eid - The entity to move forward
 * @param siblings - Array of sibling entities
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { moveForward, getSiblings } from 'blecsd';
 *
 * const siblings = getSiblings(world, entity);
 * moveForward(world, entity, siblings);
 * ```
 */
export function moveForward(world: World, eid: Entity, siblings: readonly Entity[]): Entity {
	const currentZ = getZIndex(world, eid);
	let nextZ = 65535;
	let found = false;

	// Find the smallest z-index greater than current
	for (const sibling of siblings) {
		if (sibling !== eid && hasComponent(world, sibling, Position)) {
			const z = Position.z[sibling] as number;
			if (z > currentZ && z < nextZ) {
				nextZ = z;
				found = true;
			}
		}
	}

	if (found) {
		// Set to one above the next sibling
		return setZIndex(world, eid, Math.min(nextZ + 1, 65535));
	}

	// Already at front, no change
	return eid;
}

/**
 * Moves an entity one step backward in z-order among siblings.
 * Finds the next lower z-index and sets this entity below it.
 *
 * @param world - The ECS world
 * @param eid - The entity to move backward
 * @param siblings - Array of sibling entities
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { moveBackward, getSiblings } from 'blecsd';
 *
 * const siblings = getSiblings(world, entity);
 * moveBackward(world, entity, siblings);
 * ```
 */
export function moveBackward(world: World, eid: Entity, siblings: readonly Entity[]): Entity {
	const currentZ = getZIndex(world, eid);
	let prevZ = 0;
	let found = false;

	// Find the largest z-index smaller than current
	for (const sibling of siblings) {
		if (sibling !== eid && hasComponent(world, sibling, Position)) {
			const z = Position.z[sibling] as number;
			if (z < currentZ && z > prevZ) {
				prevZ = z;
				found = true;
			}
		}
	}

	if (found) {
		// Set to one below the previous sibling
		return setZIndex(world, eid, Math.max(prevZ - 1, 0));
	}

	// Already at back, no change
	return eid;
}

/**
 * Normalizes z-indices of a set of entities.
 * Reassigns z-indices to sequential values starting from 0.
 * Useful after many front/back operations to prevent z-index overflow.
 *
 * @param world - The ECS world
 * @param entities - Entities to normalize
 *
 * @example
 * ```typescript
 * import { normalizeZIndices, getSiblings } from 'blecsd';
 *
 * // After many z-order changes, normalize indices
 * const siblings = getSiblings(world, parent);
 * normalizeZIndices(world, siblings);
 * ```
 */
export function normalizeZIndices(world: World, entities: readonly Entity[]): void {
	// Collect entities with their current z-index
	const withZ: Array<{ entity: Entity; z: number }> = [];

	for (const entity of entities) {
		if (hasComponent(world, entity, Position)) {
			withZ.push({
				entity,
				z: Position.z[entity] as number,
			});
		}
	}

	// Sort by current z-index
	withZ.sort((a, b) => a.z - b.z);

	// Reassign sequential z-indices
	for (let i = 0; i < withZ.length; i++) {
		const item = withZ[i];
		if (item) {
			Position.z[item.entity] = i;
		}
	}
}

/**
 * Swaps the z-indices of two entities.
 *
 * @param world - The ECS world
 * @param a - First entity
 * @param b - Second entity
 *
 * @example
 * ```typescript
 * import { swapZIndex } from 'blecsd';
 *
 * // Swap z-order of two entities
 * swapZIndex(world, entityA, entityB);
 * ```
 */
export function swapZIndex(world: World, a: Entity, b: Entity): void {
	const zA = getZIndex(world, a);
	const zB = getZIndex(world, b);
	setZIndex(world, a, zB);
	setZIndex(world, b, zA);
}

// =============================================================================
// POSITION KEYWORDS AND PERCENTAGES
// =============================================================================

/**
 * Position keyword type for alignment shortcuts.
 */
export type PositionKeyword =
	| 'center'
	| 'top-left'
	| 'tl'
	| 'top-right'
	| 'tr'
	| 'bottom-left'
	| 'bl'
	| 'bottom-right'
	| 'br';

/**
 * Sets entity position using a keyword for quick alignment.
 * Requires parent with Dimensions component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param keyword - Position keyword
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setPositionKeyword } from 'blecsd';
 *
 * // Center within parent
 * setPositionKeyword(world, dialog, 'center');
 *
 * // Top-left corner
 * setPositionKeyword(world, logo, 'top-left');
 *
 * // Bottom-right corner
 * setPositionKeyword(world, statusBar, 'bottom-right');
 * ```
 */
export function setPositionKeyword(world: World, eid: Entity, keyword: PositionKeyword): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		// No parent, position at origin based on keyword
		const basePos = keywordToPosition(keyword, 0, 0, 0, 0);
		setPosition(world, eid, basePos.x, basePos.y);
		return eid;
	}

	const parent = getParent(world, eid);
	if (parent === 0) {
		// No parent, position at origin
		const basePos = keywordToPosition(keyword, 0, 0, 0, 0);
		setPosition(world, eid, basePos.x, basePos.y);
		return eid;
	}

	// Get parent dimensions
	const parentDims = getDimensions(world, parent);
	if (!parentDims) {
		// Parent has no dimensions, position at origin
		const basePos = keywordToPosition(keyword, 0, 0, 0, 0);
		setPosition(world, eid, basePos.x, basePos.y);
		return eid;
	}

	// Get own dimensions for centering
	const ownDims = getDimensions(world, eid);
	const ownWidth = ownDims?.width ?? 0;
	const ownHeight = ownDims?.height ?? 0;

	const pos = keywordToPosition(keyword, parentDims.width, parentDims.height, ownWidth, ownHeight);
	setPosition(world, eid, pos.x, pos.y);
	return eid;
}

/**
 * Converts a position keyword to x,y coordinates.
 * @internal
 */
function keywordToPosition(
	keyword: PositionKeyword,
	parentWidth: number,
	parentHeight: number,
	entityWidth: number,
	entityHeight: number,
): { x: number; y: number } {
	switch (keyword) {
		case 'center':
			return {
				x: Math.floor((parentWidth - entityWidth) / 2),
				y: Math.floor((parentHeight - entityHeight) / 2),
			};
		case 'top-left':
		case 'tl':
			return { x: 0, y: 0 };
		case 'top-right':
		case 'tr':
			return { x: Math.max(0, parentWidth - entityWidth), y: 0 };
		case 'bottom-left':
		case 'bl':
			return { x: 0, y: Math.max(0, parentHeight - entityHeight) };
		case 'bottom-right':
		case 'br':
			return {
				x: Math.max(0, parentWidth - entityWidth),
				y: Math.max(0, parentHeight - entityHeight),
			};
		default:
			return { x: 0, y: 0 };
	}
}

/**
 * Sets entity position using percentage of parent size.
 * Requires parent with Dimensions component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param xPercent - X position as percentage (0-100)
 * @param yPercent - Y position as percentage (0-100)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setPositionPercent } from 'blecsd';
 *
 * // Center horizontally, 25% from top
 * setPositionPercent(world, header, 50, 25);
 *
 * // Bottom-right quadrant
 * setPositionPercent(world, footer, 75, 75);
 * ```
 */
export function setPositionPercent(
	world: World,
	eid: Entity,
	xPercent: number,
	yPercent: number,
): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		setPosition(world, eid, 0, 0);
		return eid;
	}

	const parent = getParent(world, eid);
	if (parent === 0) {
		setPosition(world, eid, 0, 0);
		return eid;
	}

	const parentDims = getDimensions(world, parent);
	if (!parentDims) {
		setPosition(world, eid, 0, 0);
		return eid;
	}

	const x = Math.floor((parentDims.width * xPercent) / 100);
	const y = Math.floor((parentDims.height * yPercent) / 100);

	setPosition(world, eid, x, y);
	return eid;
}
