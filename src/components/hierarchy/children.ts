/**
 * Child access and manipulation functions for Hierarchy component.
 * @module components/hierarchy/children
 */

import { hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';

/**
 * Gets all direct children of an entity.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @returns Array of child entities
 *
 * @example
 * ```typescript
 * import { getChildren } from 'blecsd';
 *
 * const children = getChildren(world, parent);
 * for (const child of children) {
 *   // Process child
 * }
 * ```
 */
export function getChildren(world: World, parent: Entity): Entity[] {
	if (!hasComponent(world, parent, Hierarchy)) {
		return [];
	}

	const children: Entity[] = [];
	let child = Hierarchy.firstChild[parent] as Entity;
	while (child !== NULL_ENTITY) {
		children.push(child);
		child = Hierarchy.nextSibling[child] as Entity;
	}
	return children;
}

/**
 * Gets all ancestors of an entity (parent, grandparent, etc.).
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Array of ancestor entities (immediate parent first)
 *
 * @example
 * ```typescript
 * import { getAncestors } from 'blecsd';
 *
 * const ancestors = getAncestors(world, entity);
 * const parent = ancestors[0];
 * const grandparent = ancestors[1];
 * ```
 */
export function getAncestors(world: World, eid: Entity): Entity[] {
	if (!hasComponent(world, eid, Hierarchy)) {
		return [];
	}

	const ancestors: Entity[] = [];
	let current = Hierarchy.parent[eid] as Entity;
	while (current !== NULL_ENTITY) {
		ancestors.push(current);
		current = Hierarchy.parent[current] as Entity;
	}
	return ancestors;
}

/**
 * Gets all descendants of an entity (children, grandchildren, etc.).
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns Array of descendant entities (depth-first order)
 *
 * @example
 * ```typescript
 * import { getDescendants } from 'blecsd';
 *
 * const descendants = getDescendants(world, entity);
 * for (const desc of descendants) {
 *   // Process descendant
 * }
 * ```
 */
export function getDescendants(world: World, eid: Entity): Entity[] {
	if (!hasComponent(world, eid, Hierarchy)) {
		return [];
	}

	const descendants: Entity[] = [];
	const stack: Entity[] = [];

	// Start with children
	let child = Hierarchy.firstChild[eid] as Entity;
	while (child !== NULL_ENTITY) {
		stack.push(child);
		child = Hierarchy.nextSibling[child] as Entity;
	}

	// Depth-first traversal
	while (stack.length > 0) {
		const current = stack.pop() as Entity;
		descendants.push(current);

		// Add children to stack (in reverse order for correct output)
		const children: Entity[] = [];
		let c = Hierarchy.firstChild[current] as Entity;
		while (c !== NULL_ENTITY) {
			children.push(c);
			c = Hierarchy.nextSibling[c] as Entity;
		}
		for (let i = children.length - 1; i >= 0; i--) {
			stack.push(children[i] as Entity);
		}
	}

	return descendants;
}

/**
 * Gets the last child of an entity.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @returns Last child entity or NULL_ENTITY
 *
 * @example
 * ```typescript
 * import { getLastChild, NULL_ENTITY } from 'blecsd';
 *
 * const lastChild = getLastChild(world, parent);
 * if (lastChild !== NULL_ENTITY) {
 *   // Process last child
 * }
 * ```
 */
export function getLastChild(world: World, parent: Entity): Entity {
	if (!hasComponent(world, parent, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}

	let child = Hierarchy.firstChild[parent] as Entity;
	if (child === NULL_ENTITY) {
		return NULL_ENTITY as Entity;
	}

	while (Hierarchy.nextSibling[child] !== NULL_ENTITY) {
		child = Hierarchy.nextSibling[child] as Entity;
	}

	return child;
}

/**
 * Gets the first child of an entity.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @returns First child entity or NULL_ENTITY
 *
 * @example
 * ```typescript
 * import { getFirstChild, NULL_ENTITY } from 'blecsd';
 *
 * const firstChild = getFirstChild(world, parent);
 * if (firstChild !== NULL_ENTITY) {
 *   // Process first child
 * }
 * ```
 */
export function getFirstChild(world: World, parent: Entity): Entity {
	if (!hasComponent(world, parent, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}
	return Hierarchy.firstChild[parent] as Entity;
}

/**
 * Gets the index of a child within its parent's children list.
 *
 * @param world - The ECS world
 * @param child - The child entity
 * @returns Index (0-based) or -1 if not a child
 *
 * @example
 * ```typescript
 * import { getChildIndex } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child2);
 * getChildIndex(world, child1); // 0
 * getChildIndex(world, child2); // 1
 * ```
 */
export function getChildIndex(world: World, child: Entity): number {
	if (!hasComponent(world, child, Hierarchy)) {
		return -1;
	}

	const parent = Hierarchy.parent[child] as Entity;
	if (parent === NULL_ENTITY) {
		return -1;
	}

	let index = 0;
	let sibling = Hierarchy.firstChild[parent] as Entity;
	while (sibling !== NULL_ENTITY) {
		if (sibling === child) {
			return index;
		}
		index++;
		sibling = Hierarchy.nextSibling[sibling] as Entity;
	}

	return -1;
}

/**
 * Gets a child at a specific index.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param index - The index (0-based)
 * @returns Child entity or NULL_ENTITY if out of bounds
 *
 * @example
 * ```typescript
 * import { getChildAt, NULL_ENTITY } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child2);
 * getChildAt(world, parent, 0); // child1
 * getChildAt(world, parent, 1); // child2
 * getChildAt(world, parent, 5); // NULL_ENTITY
 * ```
 */
export function getChildAt(world: World, parent: Entity, index: number): Entity {
	if (!hasComponent(world, parent, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}

	if (index < 0) {
		return NULL_ENTITY as Entity;
	}

	let child = Hierarchy.firstChild[parent] as Entity;
	for (let i = 0; i < index && child !== NULL_ENTITY; i++) {
		child = Hierarchy.nextSibling[child] as Entity;
	}

	return child;
}
