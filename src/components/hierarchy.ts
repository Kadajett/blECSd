/**
 * Hierarchy component for parent/child entity relationships.
 * Uses a linked list structure for efficient traversal.
 * @module components/hierarchy
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Null entity value (no parent/child/sibling) */
export const NULL_ENTITY = 0;

/**
 * Hierarchy component store using SoA (Structure of Arrays) for performance.
 *
 * Uses a doubly-linked list for siblings and parent pointers for tree structure:
 * - `parent`: Parent entity ID (0 = no parent, root level)
 * - `firstChild`: First child entity in the children list
 * - `nextSibling`: Next sibling in the parent's children list
 * - `prevSibling`: Previous sibling in the parent's children list
 * - `childCount`: Number of direct children
 * - `depth`: Tree depth (0 = root level)
 *
 * @example
 * ```typescript
 * import { Hierarchy, appendChild, getChildren } from 'blecsd';
 *
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child2);
 *
 * const children = getChildren(world, parent);
 * console.log(children); // [child1, child2]
 * ```
 */
export const Hierarchy = {
	/** Parent entity ID (0 = no parent) */
	parent: new Uint32Array(DEFAULT_CAPACITY),
	/** First child entity */
	firstChild: new Uint32Array(DEFAULT_CAPACITY),
	/** Next sibling entity */
	nextSibling: new Uint32Array(DEFAULT_CAPACITY),
	/** Previous sibling entity */
	prevSibling: new Uint32Array(DEFAULT_CAPACITY),
	/** Number of children */
	childCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Tree depth (0 = root) */
	depth: new Uint16Array(DEFAULT_CAPACITY),
};

/**
 * Hierarchy data returned by getHierarchy.
 */
export interface HierarchyData {
	readonly parent: Entity;
	readonly firstChild: Entity;
	readonly nextSibling: Entity;
	readonly prevSibling: Entity;
	readonly childCount: number;
	readonly depth: number;
}

/**
 * Initializes a Hierarchy component with default values.
 */
function initHierarchy(eid: Entity): void {
	Hierarchy.parent[eid] = NULL_ENTITY;
	Hierarchy.firstChild[eid] = NULL_ENTITY;
	Hierarchy.nextSibling[eid] = NULL_ENTITY;
	Hierarchy.prevSibling[eid] = NULL_ENTITY;
	Hierarchy.childCount[eid] = 0;
	Hierarchy.depth[eid] = 0;
}

/**
 * Ensures an entity has the Hierarchy component, initializing if needed.
 */
function ensureHierarchy(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Hierarchy)) {
		addComponent(world, eid, Hierarchy);
		initHierarchy(eid);
	}
}

/**
 * Updates the depth of an entity and all its descendants.
 */
function updateDepths(eid: Entity, newDepth: number): void {
	Hierarchy.depth[eid] = newDepth;
	let child = Hierarchy.firstChild[eid] as Entity;
	while (child !== NULL_ENTITY) {
		updateDepths(child, newDepth + 1);
		child = Hierarchy.nextSibling[child] as Entity;
	}
}

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
 * Removes a child from its current parent's child list.
 */
function removeFromParent(child: Entity, parent: Entity): void {
	const prev = Hierarchy.prevSibling[child] as Entity;
	const next = Hierarchy.nextSibling[child] as Entity;

	// Update sibling links
	if (prev !== NULL_ENTITY) {
		Hierarchy.nextSibling[prev] = next;
	} else {
		// Child was first child
		Hierarchy.firstChild[parent] = next;
	}

	if (next !== NULL_ENTITY) {
		Hierarchy.prevSibling[next] = prev;
	}

	// Clear child's links
	Hierarchy.prevSibling[child] = NULL_ENTITY;
	Hierarchy.nextSibling[child] = NULL_ENTITY;

	// Decrement parent's child count
	Hierarchy.childCount[parent] = (Hierarchy.childCount[parent] as number) - 1;
}

/**
 * Adds a child to a parent's child list (at the end).
 */
function addToParent(child: Entity, parent: Entity): void {
	Hierarchy.parent[child] = parent;

	const firstChild = Hierarchy.firstChild[parent] as Entity;
	if (firstChild === NULL_ENTITY) {
		// First child
		Hierarchy.firstChild[parent] = child;
	} else {
		// Find last child and append
		let lastChild = firstChild;
		while (Hierarchy.nextSibling[lastChild] !== NULL_ENTITY) {
			lastChild = Hierarchy.nextSibling[lastChild] as Entity;
		}
		Hierarchy.nextSibling[lastChild] = child;
		Hierarchy.prevSibling[child] = lastChild;
	}

	// Increment parent's child count
	Hierarchy.childCount[parent] = (Hierarchy.childCount[parent] as number) + 1;

	// Update depth
	const parentDepth = Hierarchy.depth[parent] as number;
	updateDepths(child, parentDepth + 1);
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
	updateDepths(child, parentDepth + 1);

	return parent;
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
	return insertBefore(world, child, sibling);
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
	updateDepths(child, parentDepth + 1);

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
	updateDepths(child, parentDepth + 1);

	return child;
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
