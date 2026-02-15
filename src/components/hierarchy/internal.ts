/**
 * Internal helper functions for Hierarchy component.
 * @module components/hierarchy/internal
 */

import { addComponent, hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Hierarchy, NULL_ENTITY } from './component';

/**
 * Initializes a Hierarchy component with default values.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 */
export function initHierarchy(_world: World, eid: Entity): void {
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
export function ensureHierarchy(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Hierarchy)) {
		addComponent(world, eid, Hierarchy);
		initHierarchy(world, eid);
	}
}

/**
 * Updates the depth of an entity and all its descendants.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param newDepth - The new depth value
 */
export function updateDepths(_world: World, eid: Entity, newDepth: number): void {
	Hierarchy.depth[eid] = newDepth;
	let child = Hierarchy.firstChild[eid] as Entity;
	while (child !== NULL_ENTITY) {
		updateDepths(_world, child, newDepth + 1);
		child = Hierarchy.nextSibling[child] as Entity;
	}
}

/**
 * Removes a child from its current parent's child list.
 */
export function removeFromParent(child: Entity, parent: Entity): void {
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
export function addToParent(child: Entity, parent: Entity): void {
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

	// Update depth (world not available in this internal function - use NULL_ENTITY as placeholder)
	const parentDepth = Hierarchy.depth[parent] as number;
	updateDepths({} as World, child, parentDepth + 1);
}
