/**
 * Z-order management for entity layering.
 *
 * Controls the rendering order of entities within their parent context.
 * Higher z-index entities render on top of lower z-index entities.
 *
 * @module core/zOrder
 *
 * @example
 * ```typescript
 * import { setFront, setBack, setZIndex, getZIndex } from 'blecsd';
 *
 * // Bring entity to front
 * setFront(world, entity);
 *
 * // Send to back
 * setBack(world, entity);
 *
 * // Set specific z-index
 * setZIndex(world, entity, 10);
 *
 * // Get current z-index
 * const z = getZIndex(world, entity);
 * ```
 */

import { getChildren, getParent, Hierarchy, NULL_ENTITY } from '../components/hierarchy';
import { addComponent, hasComponent } from './ecs';
import type { Entity, World } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default z-index for new entities */
export const DEFAULT_Z_INDEX = 0;

/** Maximum z-index value */
export const MAX_Z_INDEX = 0x7fffffff; // Max signed 32-bit int

/** Minimum z-index value */
export const MIN_Z_INDEX = -0x80000000; // Min signed 32-bit int

/** Default entity capacity */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Z-order component for entity layering.
 *
 * - `zIndex`: Absolute z-index within the rendering context
 * - `localZ`: Z-index relative to siblings (child index)
 *
 * @example
 * ```typescript
 * import { ZOrder, getZIndex } from 'blecsd';
 *
 * // Direct component access (low-level)
 * const z = ZOrder.zIndex[entity];
 *
 * // Recommended: use helper functions
 * const z = getZIndex(world, entity);
 * ```
 */
export const ZOrder = {
	/** Absolute z-index for global ordering */
	zIndex: new Int32Array(DEFAULT_CAPACITY),
	/** Local z-index within siblings */
	localZ: new Int32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initializes z-order with default values.
 */
function initZOrder(eid: Entity): void {
	ZOrder.zIndex[eid] = DEFAULT_Z_INDEX;
	ZOrder.localZ[eid] = DEFAULT_Z_INDEX;
}

/**
 * Ensures an entity has the ZOrder component.
 */
function ensureZOrder(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, ZOrder)) {
		addComponent(world, eid, ZOrder);
		initZOrder(eid);
	}
}

// =============================================================================
// GETTER FUNCTIONS
// =============================================================================

/**
 * Gets the z-index of an entity.
 *
 * @param world - The ECS world
 * @param entity - The entity
 * @returns The z-index (default: 0)
 *
 * @example
 * ```typescript
 * import { getZIndex } from 'blecsd';
 *
 * const z = getZIndex(world, entity);
 * console.log(`Entity is at z-index ${z}`);
 * ```
 */
export function getZIndex(world: World, entity: Entity): number {
	if (!hasComponent(world, entity, ZOrder)) {
		return DEFAULT_Z_INDEX;
	}
	return ZOrder.zIndex[entity] ?? DEFAULT_Z_INDEX;
}

/**
 * Gets the local z-index (relative to siblings).
 *
 * @param world - The ECS world
 * @param entity - The entity
 * @returns The local z-index
 */
export function getLocalZ(world: World, entity: Entity): number {
	if (!hasComponent(world, entity, ZOrder)) {
		return DEFAULT_Z_INDEX;
	}
	return ZOrder.localZ[entity] ?? DEFAULT_Z_INDEX;
}

/**
 * Checks if an entity has a z-order component.
 *
 * @param world - The ECS world
 * @param entity - The entity
 * @returns true if entity has ZOrder component
 */
export function hasZOrder(world: World, entity: Entity): boolean {
	return hasComponent(world, entity, ZOrder);
}

// =============================================================================
// SETTER FUNCTIONS
// =============================================================================

/**
 * Sets the z-index of an entity.
 *
 * @param world - The ECS world
 * @param entity - The entity
 * @param zIndex - The new z-index
 *
 * @example
 * ```typescript
 * import { setZIndex } from 'blecsd';
 *
 * // Set specific z-index
 * setZIndex(world, entity, 100);
 *
 * // Negative values for background elements
 * setZIndex(world, background, -10);
 * ```
 */
export function setZIndex(world: World, entity: Entity, zIndex: number): void {
	ensureZOrder(world, entity);
	ZOrder.zIndex[entity] = Math.max(MIN_Z_INDEX, Math.min(MAX_Z_INDEX, Math.floor(zIndex)));
}

/**
 * Sets the local z-index (relative to siblings).
 *
 * @param world - The ECS world
 * @param entity - The entity
 * @param localZ - The local z-index
 */
export function setLocalZ(world: World, entity: Entity, localZ: number): void {
	ensureZOrder(world, entity);
	ZOrder.localZ[entity] = Math.max(MIN_Z_INDEX, Math.min(MAX_Z_INDEX, Math.floor(localZ)));
}

// =============================================================================
// ORDERING FUNCTIONS
// =============================================================================

/**
 * Brings an entity to the front (highest z-index among siblings).
 *
 * @param world - The ECS world
 * @param entity - The entity to bring to front
 *
 * @example
 * ```typescript
 * import { setFront } from 'blecsd';
 *
 * // Bring dialog to front
 * setFront(world, dialogEntity);
 * ```
 */
export function setFront(world: World, entity: Entity): void {
	ensureZOrder(world, entity);

	const siblings = getSiblings(world, entity);
	if (siblings.length === 0) {
		return;
	}

	// Find max z-index among siblings
	let maxZ = ZOrder.zIndex[entity] ?? DEFAULT_Z_INDEX;
	for (const sibling of siblings) {
		if (hasComponent(world, sibling, ZOrder)) {
			const siblingZ = ZOrder.zIndex[sibling] ?? DEFAULT_Z_INDEX;
			if (siblingZ >= maxZ) {
				maxZ = siblingZ + 1;
			}
		}
	}

	ZOrder.zIndex[entity] = maxZ;
}

/**
 * Sends an entity to the back (lowest z-index among siblings).
 *
 * @param world - The ECS world
 * @param entity - The entity to send to back
 *
 * @example
 * ```typescript
 * import { setBack } from 'blecsd';
 *
 * // Send background to back
 * setBack(world, backgroundEntity);
 * ```
 */
export function setBack(world: World, entity: Entity): void {
	ensureZOrder(world, entity);

	const siblings = getSiblings(world, entity);
	if (siblings.length === 0) {
		return;
	}

	// Find min z-index among siblings
	let minZ = ZOrder.zIndex[entity] ?? DEFAULT_Z_INDEX;
	for (const sibling of siblings) {
		if (hasComponent(world, sibling, ZOrder)) {
			const siblingZ = ZOrder.zIndex[sibling] ?? DEFAULT_Z_INDEX;
			if (siblingZ <= minZ) {
				minZ = siblingZ - 1;
			}
		}
	}

	ZOrder.zIndex[entity] = minZ;
}

/**
 * Moves an entity up one level in z-order (swap with next higher).
 *
 * @param world - The ECS world
 * @param entity - The entity to move up
 * @returns true if entity was moved
 *
 * @example
 * ```typescript
 * import { moveUp } from 'blecsd';
 *
 * // Move entity up one level
 * if (moveUp(world, entity)) {
 *   console.log('Entity moved up');
 * }
 * ```
 */
export function moveUp(world: World, entity: Entity): boolean {
	ensureZOrder(world, entity);

	const siblings = getSiblings(world, entity);
	const currentZ = ZOrder.zIndex[entity] ?? DEFAULT_Z_INDEX;

	// Find the sibling with the next higher z-index
	let nextHigher: Entity | null = null;
	let nextHigherZ = MAX_Z_INDEX;

	for (const sibling of siblings) {
		if (hasComponent(world, sibling, ZOrder)) {
			const siblingZ = ZOrder.zIndex[sibling] ?? DEFAULT_Z_INDEX;
			if (siblingZ > currentZ && siblingZ < nextHigherZ) {
				nextHigher = sibling;
				nextHigherZ = siblingZ;
			}
		}
	}

	if (nextHigher !== null) {
		// Swap z-indices
		ZOrder.zIndex[entity] = nextHigherZ;
		ZOrder.zIndex[nextHigher] = currentZ;
		return true;
	}

	return false;
}

/**
 * Moves an entity down one level in z-order (swap with next lower).
 *
 * @param world - The ECS world
 * @param entity - The entity to move down
 * @returns true if entity was moved
 *
 * @example
 * ```typescript
 * import { moveDown } from 'blecsd';
 *
 * // Move entity down one level
 * if (moveDown(world, entity)) {
 *   console.log('Entity moved down');
 * }
 * ```
 */
export function moveDown(world: World, entity: Entity): boolean {
	ensureZOrder(world, entity);

	const siblings = getSiblings(world, entity);
	const currentZ = ZOrder.zIndex[entity] ?? DEFAULT_Z_INDEX;

	// Find the sibling with the next lower z-index
	let nextLower: Entity | null = null;
	let nextLowerZ = MIN_Z_INDEX;

	for (const sibling of siblings) {
		if (hasComponent(world, sibling, ZOrder)) {
			const siblingZ = ZOrder.zIndex[sibling] ?? DEFAULT_Z_INDEX;
			if (siblingZ < currentZ && siblingZ > nextLowerZ) {
				nextLower = sibling;
				nextLowerZ = siblingZ;
			}
		}
	}

	if (nextLower !== null) {
		// Swap z-indices
		ZOrder.zIndex[entity] = nextLowerZ;
		ZOrder.zIndex[nextLower] = currentZ;
		return true;
	}

	return false;
}

// =============================================================================
// SORTING FUNCTIONS
// =============================================================================

/**
 * Sorts entities by z-index for rendering order.
 *
 * @param world - The ECS world
 * @param entities - Entities to sort
 * @returns Sorted array (lowest z first = rendered first = behind)
 *
 * @example
 * ```typescript
 * import { sortByZIndex, getChildren } from 'blecsd';
 *
 * const children = getChildren(world, parent);
 * const sorted = sortByZIndex(world, children);
 *
 * // Render in order (lowest z first)
 * for (const entity of sorted) {
 *   render(entity);
 * }
 * ```
 */
export function sortByZIndex(world: World, entities: readonly Entity[]): Entity[] {
	return [...entities].sort((a, b) => {
		const zA = hasComponent(world, a, ZOrder)
			? (ZOrder.zIndex[a] ?? DEFAULT_Z_INDEX)
			: DEFAULT_Z_INDEX;
		const zB = hasComponent(world, b, ZOrder)
			? (ZOrder.zIndex[b] ?? DEFAULT_Z_INDEX)
			: DEFAULT_Z_INDEX;
		return zA - zB;
	});
}

/**
 * Gets children of a parent sorted by z-index.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @returns Children sorted by z-index (lowest first)
 *
 * @example
 * ```typescript
 * import { getChildrenByZIndex } from 'blecsd';
 *
 * // Get children in render order
 * const children = getChildrenByZIndex(world, container);
 * ```
 */
export function getChildrenByZIndex(world: World, parent: Entity): Entity[] {
	const children = getChildren(world, parent);
	return sortByZIndex(world, children);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets siblings of an entity (excluding itself).
 */
function getSiblings(world: World, entity: Entity): Entity[] {
	if (!hasComponent(world, entity, Hierarchy)) {
		return [];
	}

	const parent = getParent(world, entity);
	if (parent === NULL_ENTITY) {
		return [];
	}

	const children = getChildren(world, parent);
	return children.filter((child) => child !== entity);
}

/**
 * Normalizes z-indices among siblings to sequential values.
 *
 * Useful after many operations to prevent z-index drift.
 *
 * @param world - The ECS world
 * @param parent - The parent entity whose children to normalize
 *
 * @example
 * ```typescript
 * import { normalizeZIndices } from 'blecsd';
 *
 * // After many z-order changes, normalize to 0, 1, 2, 3...
 * normalizeZIndices(world, container);
 * ```
 */
export function normalizeZIndices(world: World, parent: Entity): void {
	const children = getChildrenByZIndex(world, parent);

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child !== undefined) {
			ensureZOrder(world, child);
			ZOrder.zIndex[child] = i;
		}
	}
}

/**
 * Resets z-order component values.
 * Primarily for testing.
 */
export function resetZOrder(entity: Entity): void {
	ZOrder.zIndex[entity] = DEFAULT_Z_INDEX;
	ZOrder.localZ[entity] = DEFAULT_Z_INDEX;
}
