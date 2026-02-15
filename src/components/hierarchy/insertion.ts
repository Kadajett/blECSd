/**
 * Child insertion functions for Hierarchy component.
 * @module components/hierarchy/insertion
 */

import { hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';
import { ensureHierarchy, removeFromParent, updateDepths } from './internal';
import { appendChild } from './parent';

/**
 * Prepends a child to a parent entity (inserts at the beginning).
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param child - The child entity to prepend
 * @returns The parent entity for chaining
 *
 * @example
 * ```typescript
 * import { prepend, getChildren } from 'blecsd';
 *
 * appendChild(world, parent, child2);
 * prepend(world, parent, child1);
 * getChildren(world, parent); // [child1, child2]
 * ```
 */
export function prepend(world: World, parent: Entity, child: Entity): Entity {
	ensureHierarchy(world, child);
	ensureHierarchy(world, parent);

	const currentParent = Hierarchy.parent[child] as Entity;

	// Remove from current parent if any
	if (currentParent !== NULL_ENTITY) {
		removeFromParent(child, currentParent);
	}

	// Insert at beginning
	const firstChild = Hierarchy.firstChild[parent] as Entity;
	Hierarchy.parent[child] = parent;
	Hierarchy.firstChild[parent] = child;
	Hierarchy.prevSibling[child] = NULL_ENTITY;
	Hierarchy.nextSibling[child] = firstChild;

	if (firstChild !== NULL_ENTITY) {
		Hierarchy.prevSibling[firstChild] = child;
	}

	// Increment child count
	Hierarchy.childCount[parent] = (Hierarchy.childCount[parent] as number) + 1;

	// Update depth
	const parentDepth = Hierarchy.depth[parent] as number;
	updateDepths(world, child, parentDepth + 1);

	return parent;
}

/**
 * Inserts a child before a sibling entity.
 *
 * @param world - The ECS world
 * @param child - The child entity to insert
 * @param sibling - The sibling to insert before
 * @returns The child entity for chaining
 *
 * @example
 * ```typescript
 * import { insertBefore, getChildren } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child3);
 * insertBefore(world, child2, child3);
 * getChildren(world, parent); // [child1, child2, child3]
 * ```
 */
export function insertBefore(world: World, child: Entity, sibling: Entity): Entity {
	if (!hasComponent(world, sibling, Hierarchy)) {
		return child;
	}

	const parent = Hierarchy.parent[sibling] as Entity;
	if (parent === NULL_ENTITY) {
		return child;
	}

	ensureHierarchy(world, child);

	// Remove from current parent if any
	const currentParent = Hierarchy.parent[child] as Entity;
	if (currentParent !== NULL_ENTITY) {
		removeFromParent(child, currentParent);
	}

	// Get sibling's prev
	const prevSibling = Hierarchy.prevSibling[sibling] as Entity;

	// Insert between prevSibling and sibling
	Hierarchy.parent[child] = parent;
	Hierarchy.prevSibling[child] = prevSibling;
	Hierarchy.nextSibling[child] = sibling;
	Hierarchy.prevSibling[sibling] = child;

	if (prevSibling !== NULL_ENTITY) {
		Hierarchy.nextSibling[prevSibling] = child;
	} else {
		// child becomes first child
		Hierarchy.firstChild[parent] = child;
	}

	// Increment child count
	Hierarchy.childCount[parent] = (Hierarchy.childCount[parent] as number) + 1;

	// Update depth
	const parentDepth = Hierarchy.depth[parent] as number;
	updateDepths(world, child, parentDepth + 1);

	return child;
}

/**
 * Inserts a child after a sibling entity.
 *
 * @param world - The ECS world
 * @param child - The child entity to insert
 * @param sibling - The sibling to insert after
 * @returns The child entity for chaining
 *
 * @example
 * ```typescript
 * import { insertAfter, getChildren } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child3);
 * insertAfter(world, child2, child1);
 * getChildren(world, parent); // [child1, child2, child3]
 * ```
 */
export function insertAfter(world: World, child: Entity, sibling: Entity): Entity {
	if (!hasComponent(world, sibling, Hierarchy)) {
		return child;
	}

	const parent = Hierarchy.parent[sibling] as Entity;
	if (parent === NULL_ENTITY) {
		return child;
	}

	ensureHierarchy(world, child);

	// Remove from current parent if any
	const currentParent = Hierarchy.parent[child] as Entity;
	if (currentParent !== NULL_ENTITY) {
		removeFromParent(child, currentParent);
	}

	// Get sibling's next
	const nextSibling = Hierarchy.nextSibling[sibling] as Entity;

	// Insert between sibling and nextSibling
	Hierarchy.parent[child] = parent;
	Hierarchy.prevSibling[child] = sibling;
	Hierarchy.nextSibling[child] = nextSibling;
	Hierarchy.nextSibling[sibling] = child;

	if (nextSibling !== NULL_ENTITY) {
		Hierarchy.prevSibling[nextSibling] = child;
	}

	// Increment child count
	Hierarchy.childCount[parent] = (Hierarchy.childCount[parent] as number) + 1;

	// Update depth
	const parentDepth = Hierarchy.depth[parent] as number;
	updateDepths(world, child, parentDepth + 1);

	return child;
}

/**
 * Inserts a child at a specific index in the parent's children list.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param child - The child entity to insert
 * @param index - The index to insert at (0 = first, negative counts from end)
 * @returns The parent entity for chaining
 *
 * @example
 * ```typescript
 * import { insertAt, getChildren } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child3);
 * insertAt(world, parent, child2, 1);
 * getChildren(world, parent); // [child1, child2, child3]
 * ```
 */
export function insertAt(world: World, parent: Entity, child: Entity, index: number): Entity {
	ensureHierarchy(world, parent);
	const childCount = Hierarchy.childCount[parent] as number;

	// Handle negative indices (count from end, -1 = before last)
	let targetIndex = index;
	if (targetIndex < 0) {
		targetIndex = Math.max(0, childCount + targetIndex);
	}

	// If index >= childCount, append at end
	if (targetIndex >= childCount) {
		return appendChild(world, parent, child);
	}

	// If index === 0, prepend
	if (targetIndex === 0) {
		return prepend(world, parent, child);
	}

	// Find the sibling at the target index
	let sibling = Hierarchy.firstChild[parent] as Entity;
	for (let i = 0; i < targetIndex; i++) {
		sibling = Hierarchy.nextSibling[sibling] as Entity;
	}

	// Insert before the sibling at the target index
	insertBefore(world, child, sibling);
	return parent;
}
