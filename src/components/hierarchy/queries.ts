/**
 * Query and status check functions for Hierarchy component.
 * @module components/hierarchy/queries
 */

import { hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';
import type { HierarchyData } from './types';

/**
 * Gets the parent of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Parent entity or NULL_ENTITY if no parent
 *
 * @example
 * ```typescript
 * import { getParent, NULL_ENTITY } from 'blecsd';
 *
 * const parent = getParent(world, entity);
 * if (parent !== NULL_ENTITY) {
 *   // Has a parent
 * }
 * ```
 */
export function getParent(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}
	return Hierarchy.parent[eid] as Entity;
}

/**
 * Gets the hierarchy data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Hierarchy data or undefined if no Hierarchy component
 */
export function getHierarchy(world: World, eid: Entity): HierarchyData | undefined {
	if (!hasComponent(world, eid, Hierarchy)) {
		return undefined;
	}
	return {
		parent: Hierarchy.parent[eid] as Entity,
		firstChild: Hierarchy.firstChild[eid] as Entity,
		nextSibling: Hierarchy.nextSibling[eid] as Entity,
		prevSibling: Hierarchy.prevSibling[eid] as Entity,
		childCount: Hierarchy.childCount[eid] as number,
		depth: Hierarchy.depth[eid] as number,
	};
}

/**
 * Checks if an entity has a Hierarchy component.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns true if entity has Hierarchy component
 */
export function hasHierarchy(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Hierarchy);
}

/**
 * Checks if an entity is a root (has no parent).
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns true if entity has no parent
 */
export function isRoot(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Hierarchy)) {
		return true;
	}
	return Hierarchy.parent[eid] === NULL_ENTITY;
}

/**
 * Checks if an entity is a leaf (has no children).
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns true if entity has no children
 */
export function isLeaf(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Hierarchy)) {
		return true;
	}
	return Hierarchy.childCount[eid] === 0;
}

/**
 * Gets the depth of an entity in the tree.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Tree depth (0 = root level)
 */
export function getDepth(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Hierarchy)) {
		return 0;
	}
	return Hierarchy.depth[eid] as number;
}

/**
 * Gets the next sibling of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Next sibling entity or NULL_ENTITY
 */
export function getNextSibling(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}
	return Hierarchy.nextSibling[eid] as Entity;
}

/**
 * Gets the previous sibling of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Previous sibling entity or NULL_ENTITY
 */
export function getPrevSibling(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}
	return Hierarchy.prevSibling[eid] as Entity;
}

/**
 * Gets all siblings of an entity (excluding itself).
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Array of sibling entities
 *
 * @example
 * ```typescript
 * import { getSiblings } from 'blecsd';
 *
 * const siblings = getSiblings(world, entity);
 * console.log(`Entity has ${siblings.length} siblings`);
 * ```
 */
export function getSiblings(world: World, eid: Entity): Entity[] {
	if (!hasComponent(world, eid, Hierarchy)) {
		return [];
	}

	const parent = Hierarchy.parent[eid] as Entity;
	if (parent === NULL_ENTITY) {
		return []; // Root entities have no siblings
	}

	const siblings: Entity[] = [];
	let child = Hierarchy.firstChild[parent] as Entity;
	while (child !== NULL_ENTITY) {
		if (child !== eid) {
			siblings.push(child);
		}
		child = Hierarchy.nextSibling[child] as Entity;
	}

	return siblings;
}
