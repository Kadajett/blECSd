/**
 * Position component for entity positioning in the terminal grid.
 * @module components/position
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../core/types';

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
 * import { createWorld, addEntity } from 'bitecs';
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
