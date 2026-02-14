/**
 * Tree traversal functions for Hierarchy component.
 * @module components/hierarchy/traversal
 */

import { hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';
import type { TraversalCallback, TraversalStackItem } from './types';

/** Collect all children of an entity into an array */
function collectChildren(eid: Entity, depth: number): TraversalStackItem[] {
	const children: TraversalStackItem[] = [];
	let child = Hierarchy.firstChild[eid] as Entity;
	while (child !== NULL_ENTITY) {
		children.push({ entity: child, depth });
		child = Hierarchy.nextSibling[child] as Entity;
	}
	return children;
}

/** Push children to stack in reverse order for correct DFS traversal */
function pushChildrenToStack(children: TraversalStackItem[], stack: TraversalStackItem[]): void {
	for (let i = children.length - 1; i >= 0; i--) {
		const item = children[i];
		if (item) stack.push(item);
	}
}

/**
 * Iterates over all descendants of an entity, calling a callback for each.
 * Uses depth-first traversal order.
 *
 * @param world - The ECS world
 * @param eid - The root entity (not included in iteration)
 * @param callback - Function called for each descendant. Return false to stop.
 * @returns true if traversal completed, false if stopped early
 *
 * @example
 * ```typescript
 * import { forDescendants } from 'blecsd';
 *
 * // Process all descendants
 * forDescendants(world, root, (entity, depth) => {
 *   console.log(`Entity ${entity} at depth ${depth}`);
 * });
 *
 * // Stop early when condition met
 * forDescendants(world, root, (entity) => {
 *   if (entity === target) return false; // stop
 * });
 * ```
 */
export function forDescendants(world: World, eid: Entity, callback: TraversalCallback): boolean {
	if (!hasComponent(world, eid, Hierarchy)) {
		return true;
	}

	const stack: TraversalStackItem[] = [];
	const rootDepth = Hierarchy.depth[eid] ?? 0;

	// Start with children
	const initialChildren = collectChildren(eid, rootDepth + 1);
	pushChildrenToStack(initialChildren, stack);

	// Depth-first traversal
	while (stack.length > 0) {
		const item = stack.pop();
		if (!item) continue;

		const { entity: current, depth } = item;
		const result = callback(current, depth - rootDepth);
		if (result === false) return false;

		// Add children to stack
		const children = collectChildren(current, depth + 1);
		pushChildrenToStack(children, stack);
	}

	return true;
}

/**
 * Iterates over all ancestors of an entity, calling a callback for each.
 * Starts with the immediate parent and works up to the root.
 *
 * @param world - The ECS world
 * @param eid - The starting entity (not included in iteration)
 * @param callback - Function called for each ancestor. Return false to stop.
 * @returns true if traversal completed, false if stopped early
 *
 * @example
 * ```typescript
 * import { forAncestors } from 'blecsd';
 *
 * // Process all ancestors
 * forAncestors(world, entity, (ancestor, level) => {
 *   console.log(`Ancestor ${ancestor} at level ${level}`);
 * });
 *
 * // Find first ancestor matching condition
 * let found: Entity | null = null;
 * forAncestors(world, entity, (ancestor) => {
 *   if (hasComponent(world, ancestor, SomeComponent)) {
 *     found = ancestor;
 *     return false; // stop
 *   }
 * });
 * ```
 */
export function forAncestors(world: World, eid: Entity, callback: TraversalCallback): boolean {
	if (!hasComponent(world, eid, Hierarchy)) {
		return true;
	}

	let level = 1;
	let current = Hierarchy.parent[eid] as Entity;

	while (current !== NULL_ENTITY) {
		const result = callback(current, level);
		if (result === false) {
			return false;
		}
		current = Hierarchy.parent[current] as Entity;
		level++;
	}

	return true;
}

/**
 * Checks if an entity is a descendant of another.
 *
 * @param world - The ECS world
 * @param ancestor - The potential ancestor entity
 * @param descendant - The potential descendant entity
 * @returns true if descendant is a descendant of ancestor
 *
 * @example
 * ```typescript
 * import { hasDescendant } from 'blecsd';
 *
 * if (hasDescendant(world, container, widget)) {
 *   console.log('widget is inside container');
 * }
 * ```
 */
export function hasDescendant(world: World, ancestor: Entity, descendant: Entity): boolean {
	if (!hasComponent(world, ancestor, Hierarchy)) {
		return false;
	}
	if (!hasComponent(world, descendant, Hierarchy)) {
		return false;
	}
	if (ancestor === descendant) {
		return false;
	}

	// Walk up from descendant to see if we reach ancestor
	let current = Hierarchy.parent[descendant] as Entity;
	while (current !== NULL_ENTITY) {
		if (current === ancestor) {
			return true;
		}
		current = Hierarchy.parent[current] as Entity;
	}

	return false;
}

/**
 * Checks if an entity is an ancestor of another.
 *
 * @param world - The ECS world
 * @param descendant - The potential descendant entity
 * @param ancestor - The potential ancestor entity
 * @returns true if ancestor is an ancestor of descendant
 *
 * @example
 * ```typescript
 * import { hasAncestor } from 'blecsd';
 *
 * if (hasAncestor(world, widget, container)) {
 *   console.log('widget is inside container');
 * }
 * ```
 */
export function hasAncestor(world: World, descendant: Entity, ancestor: Entity): boolean {
	// hasAncestor is the inverse of hasDescendant
	return hasDescendant(world, ancestor, descendant);
}

/**
 * Gets the root ancestor of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity
 * @returns The root ancestor, or the entity itself if it has no parent
 *
 * @example
 * ```typescript
 * import { getRoot } from 'blecsd';
 *
 * const root = getRoot(world, deeplyNestedEntity);
 * // root is the topmost ancestor
 * ```
 */
export function getRoot(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Hierarchy)) {
		return eid;
	}

	let current = eid;
	let parent = Hierarchy.parent[current] as Entity;
	while (parent !== NULL_ENTITY) {
		current = parent;
		parent = Hierarchy.parent[current] as Entity;
	}

	return current;
}

/**
 * Gets the common ancestor of two entities.
 *
 * @param world - The ECS world
 * @param a - First entity
 * @param b - Second entity
 * @returns The common ancestor, or NULL_ENTITY if none exists
 *
 * @example
 * ```typescript
 * import { getCommonAncestor, NULL_ENTITY } from 'blecsd';
 *
 * const common = getCommonAncestor(world, entityA, entityB);
 * if (common !== NULL_ENTITY) {
 *   console.log('Found common ancestor:', common);
 * }
 * ```
 */
export function getCommonAncestor(world: World, a: Entity, b: Entity): Entity {
	if (!hasComponent(world, a, Hierarchy) || !hasComponent(world, b, Hierarchy)) {
		return NULL_ENTITY as Entity;
	}

	// Get all ancestors of a (including a itself)
	const ancestorsA = new Set<Entity>();
	ancestorsA.add(a);
	let current = Hierarchy.parent[a] as Entity;
	while (current !== NULL_ENTITY) {
		ancestorsA.add(current);
		current = Hierarchy.parent[current] as Entity;
	}

	// Walk up from b until we find a match
	if (ancestorsA.has(b)) {
		return b;
	}
	current = Hierarchy.parent[b] as Entity;
	while (current !== NULL_ENTITY) {
		if (ancestorsA.has(current)) {
			return current;
		}
		current = Hierarchy.parent[current] as Entity;
	}

	return NULL_ENTITY as Entity;
}
