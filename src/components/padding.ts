/**
 * Padding component for element spacing.
 * @module components/padding
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Padding component store using SoA (Structure of Arrays) for performance.
 *
 * - `left`, `top`, `right`, `bottom`: Padding values in characters/cells
 *
 * @example
 * ```typescript
 * import { Padding, setPadding, getPadding } from 'blecsd';
 *
 * // Set individual padding values
 * setPadding(world, entity, { left: 1, top: 2, right: 1, bottom: 2 });
 *
 * // Set all sides at once
 * setPaddingAll(world, entity, 2);
 *
 * const padding = getPadding(world, entity);
 * console.log(padding.left); // 1
 * ```
 */
export const Padding = {
	/** Left padding in cells */
	left: new Uint8Array(DEFAULT_CAPACITY),
	/** Top padding in cells */
	top: new Uint8Array(DEFAULT_CAPACITY),
	/** Right padding in cells */
	right: new Uint8Array(DEFAULT_CAPACITY),
	/** Bottom padding in cells */
	bottom: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Padding configuration options.
 */
export interface PaddingOptions {
	/** Left padding */
	left?: number;
	/** Top padding */
	top?: number;
	/** Right padding */
	right?: number;
	/** Bottom padding */
	bottom?: number;
}

/**
 * Padding data returned by getPadding.
 */
export interface PaddingData {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

/**
 * Initializes a Padding component with default values.
 */
function initPadding(eid: Entity): void {
	Padding.left[eid] = 0;
	Padding.top[eid] = 0;
	Padding.right[eid] = 0;
	Padding.bottom[eid] = 0;
}

/**
 * Ensures an entity has the Padding component, initializing if needed.
 */
function ensurePadding(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Padding)) {
		addComponent(world, eid, Padding);
		initPadding(eid);
	}
}

/**
 * Sets the padding of an entity.
 * Adds the Padding component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Padding options (individual sides)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setPadding } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Set individual sides
 * setPadding(world, entity, { left: 1, top: 2, right: 1, bottom: 2 });
 *
 * // Set only some sides (others remain unchanged)
 * setPadding(world, entity, { left: 3 });
 * ```
 */
export function setPadding(world: World, eid: Entity, options: PaddingOptions): Entity {
	ensurePadding(world, eid);

	if (options.left !== undefined) Padding.left[eid] = options.left;
	if (options.top !== undefined) Padding.top[eid] = options.top;
	if (options.right !== undefined) Padding.right[eid] = options.right;
	if (options.bottom !== undefined) Padding.bottom[eid] = options.bottom;

	return eid;
}

/**
 * Sets all padding sides to the same value.
 * Adds the Padding component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - Padding value for all sides
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setPaddingAll } from 'blecsd';
 *
 * // Set uniform padding of 2 on all sides
 * setPaddingAll(world, entity, 2);
 * ```
 */
export function setPaddingAll(world: World, eid: Entity, value: number): Entity {
	ensurePadding(world, eid);
	Padding.left[eid] = value;
	Padding.top[eid] = value;
	Padding.right[eid] = value;
	Padding.bottom[eid] = value;
	return eid;
}

/**
 * Sets horizontal (left/right) and vertical (top/bottom) padding.
 * Adds the Padding component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param horizontal - Left and right padding
 * @param vertical - Top and bottom padding
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setPaddingHV } from 'blecsd';
 *
 * // Set horizontal=2, vertical=1
 * setPaddingHV(world, entity, 2, 1);
 * ```
 */
export function setPaddingHV(
	world: World,
	eid: Entity,
	horizontal: number,
	vertical: number,
): Entity {
	ensurePadding(world, eid);
	Padding.left[eid] = horizontal;
	Padding.right[eid] = horizontal;
	Padding.top[eid] = vertical;
	Padding.bottom[eid] = vertical;
	return eid;
}

/**
 * Gets the padding data of an entity.
 * Returns undefined if the entity doesn't have a Padding component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Padding data or undefined
 *
 * @example
 * ```typescript
 * import { getPadding } from 'blecsd';
 *
 * const padding = getPadding(world, entity);
 * if (padding) {
 *   console.log(`Left: ${padding.left}, Top: ${padding.top}`);
 * }
 * ```
 */
export function getPadding(world: World, eid: Entity): PaddingData | undefined {
	if (!hasComponent(world, eid, Padding)) {
		return undefined;
	}
	return {
		left: Padding.left[eid] as number,
		top: Padding.top[eid] as number,
		right: Padding.right[eid] as number,
		bottom: Padding.bottom[eid] as number,
	};
}

/**
 * Checks if an entity has a Padding component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Padding component
 */
export function hasPadding(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Padding);
}

/**
 * Gets the total horizontal padding (left + right).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Total horizontal padding or 0 if no Padding component
 */
export function getHorizontalPadding(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Padding)) {
		return 0;
	}
	return (Padding.left[eid] as number) + (Padding.right[eid] as number);
}

/**
 * Gets the total vertical padding (top + bottom).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Total vertical padding or 0 if no Padding component
 */
export function getVerticalPadding(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Padding)) {
		return 0;
	}
	return (Padding.top[eid] as number) + (Padding.bottom[eid] as number);
}

/**
 * Checks if an entity has any padding (any side > 0).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if any padding side is greater than 0
 */
export function hasPaddingValue(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Padding)) {
		return false;
	}
	return (
		(Padding.left[eid] as number) > 0 ||
		(Padding.top[eid] as number) > 0 ||
		(Padding.right[eid] as number) > 0 ||
		(Padding.bottom[eid] as number) > 0
	);
}
