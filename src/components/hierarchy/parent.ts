/**
 * Parent/child relationship operations for Hierarchy component.
 * @module components/hierarchy/parent
 */

import { hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';
import { addToParent, ensureHierarchy, removeFromParent, updateDepths } from './internal';

/**
 * Sets the parent of an entity, removing it from any current parent.
 *
 * @param world - The ECS world
 * @param child - The child entity
 * @param parent - The new parent entity (0 or NULL_ENTITY for no parent)
 * @returns The child entity for chaining
 *
 * @example
 * ```typescript
 * import { setParent } from 'blecsd';
 *
 * setParent(world, child, parent);
 * setParent(world, child, 0); // Make orphan
 * ```
 */
export function setParent(world: World, child: Entity, parent: Entity): Entity {
	ensureHierarchy(world, child);
	if (parent !== NULL_ENTITY) {
		ensureHierarchy(world, parent);
	}

	const currentParent = Hierarchy.parent[child] as Entity;

	// If already has this parent, nothing to do
	if (currentParent === parent) {
		return child;
	}

	// Remove from current parent if any
	if (currentParent !== NULL_ENTITY) {
		removeFromParent(child, currentParent);
	}

	// Add to new parent
	if (parent !== NULL_ENTITY) {
		addToParent(child, parent);
	} else {
		// Orphaned, reset depth
		Hierarchy.parent[child] = NULL_ENTITY;
		updateDepths(child, 0);
	}

	return child;
}

/**
 * Appends a child to a parent entity.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param child - The child entity to append
 * @returns The parent entity for chaining
 *
 * @example
 * ```typescript
 * import { appendChild } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child2);
 * ```
 */
export function appendChild(world: World, parent: Entity, child: Entity): Entity {
	setParent(world, child, parent);
	return parent;
}

/**
 * Removes a child from a parent entity.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param child - The child entity to remove
 * @returns The parent entity for chaining
 *
 * @example
 * ```typescript
 * import { removeChild } from 'blecsd';
 *
 * removeChild(world, parent, child);
 * ```
 */
export function removeChild(world: World, parent: Entity, child: Entity): Entity {
	if (!hasComponent(world, child, Hierarchy)) {
		return parent;
	}

	const currentParent = Hierarchy.parent[child] as Entity;
	if (currentParent !== parent) {
		return parent;
	}

	setParent(world, child, NULL_ENTITY as Entity);
	return parent;
}

/**
 * Detaches an entity from its parent.
 * Convenience method equivalent to setParent(world, eid, NULL_ENTITY).
 *
 * @param world - The ECS world
 * @param eid - The entity to detach
 * @returns The entity for chaining
 *
 * @example
 * ```typescript
 * import { detach, getParent, NULL_ENTITY } from 'blecsd';
 *
 * appendChild(world, parent, child);
 * detach(world, child);
 * getParent(world, child); // NULL_ENTITY
 * ```
 */
export function detach(world: World, eid: Entity): Entity {
	return setParent(world, eid, NULL_ENTITY as Entity);
}
