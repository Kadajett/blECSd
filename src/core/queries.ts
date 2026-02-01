/**
 * Common ECS queries for filtering and selecting entities.
 *
 * Queries use bitecs to efficiently find entities with specific
 * component combinations. Use these pre-defined query functions for common
 * operations or call bitecs.query directly for custom queries.
 *
 * @module core/queries
 */

import { query } from 'bitecs';

import { Border } from '../components/border';
import { Content } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable } from '../components/focusable';
import { Hierarchy } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import type { Entity, World } from './types';

// =============================================================================
// BASE QUERY FUNCTIONS
// =============================================================================

/**
 * Queries for entities with rendering components (Position, Dimensions, Renderable).
 *
 * Use this query to find all entities that can be rendered to the screen.
 * This is the foundation for the render system.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with rendering components
 *
 * @example
 * ```typescript
 * import { createWorld, queryRenderable, Position, Renderable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create entities ...
 *
 * const entities = queryRenderable(world);
 * for (const eid of entities) {
 *   // Process renderable entity
 *   const x = Position.x[eid];
 *   const y = Position.y[eid];
 *   const visible = Renderable.visible[eid];
 * }
 * ```
 */
export function queryRenderable(world: World): Entity[] {
	return query(world, [Position, Dimensions, Renderable]) as Entity[];
}

/**
 * Queries for entities with the Focusable component.
 *
 * Use this query to find all entities that can receive focus, such as
 * buttons, inputs, and lists.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with Focusable component
 *
 * @example
 * ```typescript
 * import { createWorld, queryFocusable, Focusable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create focusable entities ...
 *
 * const focusables = queryFocusable(world);
 * for (const eid of focusables) {
 *   if (Focusable.focusable[eid] === 1) {
 *     console.log(`Entity ${eid} is focusable`);
 *   }
 * }
 * ```
 */
export function queryFocusable(world: World): Entity[] {
	return query(world, [Focusable]) as Entity[];
}

/**
 * Queries for entities with the Interactive component.
 *
 * Use this query to find all entities that can respond to user input,
 * including clicks, hover, and keyboard events.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with Interactive component
 *
 * @example
 * ```typescript
 * import { createWorld, queryInteractive, Interactive } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create interactive entities ...
 *
 * const interactives = queryInteractive(world);
 * for (const eid of interactives) {
 *   if (Interactive.clickable[eid] === 1) {
 *     // Handle clickable entity
 *   }
 * }
 * ```
 */
export function queryInteractive(world: World): Entity[] {
	return query(world, [Interactive]) as Entity[];
}

/**
 * Queries for entities with the Scrollable component.
 *
 * Use this query to find all entities that support scrolling content,
 * such as lists and text areas.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with Scrollable component
 *
 * @example
 * ```typescript
 * import { createWorld, queryScrollable, Scrollable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create scrollable entities ...
 *
 * const scrollables = queryScrollable(world);
 * for (const eid of scrollables) {
 *   const scrollY = Scrollable.scrollY[eid];
 *   const scrollHeight = Scrollable.scrollHeight[eid];
 * }
 * ```
 */
export function queryScrollable(world: World): Entity[] {
	return query(world, [Scrollable]) as Entity[];
}

/**
 * Queries for entities with content (Position, Dimensions, Renderable, Content).
 *
 * Use this query to find all text and content-bearing entities.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with content components
 *
 * @example
 * ```typescript
 * import { createWorld, queryContent, getContent } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create text entities ...
 *
 * const contentEntities = queryContent(world);
 * for (const eid of contentEntities) {
 *   const text = getContent(world, eid);
 *   console.log(`Entity ${eid} has content: ${text}`);
 * }
 * ```
 */
export function queryContent(world: World): Entity[] {
	return query(world, [Position, Dimensions, Renderable, Content]) as Entity[];
}

/**
 * Queries for entities with borders (Position, Dimensions, Renderable, Border).
 *
 * Use this query to find all entities that have border styling.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with border components
 *
 * @example
 * ```typescript
 * import { createWorld, queryBorder, Border } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create bordered entities ...
 *
 * const borderedEntities = queryBorder(world);
 * for (const eid of borderedEntities) {
 *   const borderType = Border.type[eid];
 *   const hasBorder = Border.left[eid] || Border.right[eid] ||
 *                     Border.top[eid] || Border.bottom[eid];
 * }
 * ```
 */
export function queryBorder(world: World): Entity[] {
	return query(world, [Position, Dimensions, Renderable, Border]) as Entity[];
}

/**
 * Queries for entities with padding (Position, Dimensions, Renderable, Padding).
 *
 * Use this query to find all entities that have padding applied.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with padding components
 *
 * @example
 * ```typescript
 * import { createWorld, queryPadding, Padding } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create padded entities ...
 *
 * const paddedEntities = queryPadding(world);
 * for (const eid of paddedEntities) {
 *   const totalHorizontal = Padding.left[eid] + Padding.right[eid];
 *   const totalVertical = Padding.top[eid] + Padding.bottom[eid];
 * }
 * ```
 */
export function queryPadding(world: World): Entity[] {
	return query(world, [Position, Dimensions, Renderable, Padding]) as Entity[];
}

/**
 * Queries for entities with hierarchy (part of the entity tree).
 *
 * Use this query to find all entities that participate in the parent-child
 * hierarchy system.
 *
 * @param world - The ECS world to query
 * @returns Array of entity IDs with Hierarchy component
 *
 * @example
 * ```typescript
 * import { createWorld, queryHierarchy, Hierarchy, NULL_ENTITY } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create hierarchical entities ...
 *
 * const hierarchicalEntities = queryHierarchy(world);
 * for (const eid of hierarchicalEntities) {
 *   const parent = Hierarchy.parent[eid];
 *   if (parent === NULL_ENTITY) {
 *     console.log(`Entity ${eid} is a root entity`);
 *   }
 * }
 * ```
 */
export function queryHierarchy(world: World): Entity[] {
	return query(world, [Hierarchy]) as Entity[];
}

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

/**
 * Filters entities to only those that are visible.
 *
 * Returns entities where Renderable.visible === 1.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to filter
 * @returns Filtered array of visible entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, queryRenderable, filterVisible } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create entities ...
 *
 * const allRenderables = queryRenderable(world);
 * const visibleOnly = filterVisible(world, allRenderables);
 *
 * for (const eid of visibleOnly) {
 *   // Only process visible entities
 * }
 * ```
 */
export function filterVisible(_world: World, entities: readonly Entity[]): Entity[] {
	return entities.filter((eid) => Renderable.visible[eid] === 1);
}

/**
 * Filters entities to only those marked as dirty.
 *
 * Returns entities where Renderable.dirty === 1.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to filter
 * @returns Filtered array of dirty entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, queryRenderable, filterDirty } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create entities, modify some ...
 *
 * const allRenderables = queryRenderable(world);
 * const needsRedraw = filterDirty(world, allRenderables);
 *
 * for (const eid of needsRedraw) {
 *   // Only redraw dirty entities
 * }
 * ```
 */
export function filterDirty(_world: World, entities: readonly Entity[]): Entity[] {
	return entities.filter((eid) => Renderable.dirty[eid] === 1);
}

/**
 * Filters entities to only those that are visible AND dirty.
 *
 * Combines filterVisible and filterDirty for render optimization.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to filter
 * @returns Filtered array of visible and dirty entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, queryRenderable, filterVisibleDirty } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create entities ...
 *
 * // In render system:
 * const allRenderables = queryRenderable(world);
 * const toRender = filterVisibleDirty(world, allRenderables);
 *
 * for (const eid of toRender) {
 *   // Render only visible entities that need redrawing
 * }
 * ```
 */
export function filterVisibleDirty(_world: World, entities: readonly Entity[]): Entity[] {
	return entities.filter((eid) => Renderable.visible[eid] === 1 && Renderable.dirty[eid] === 1);
}

/**
 * Gets all child entities of a parent entity.
 *
 * Uses the Hierarchy component to traverse the child linked list.
 *
 * @param world - The ECS world
 * @param parent - The parent entity ID
 * @returns Array of child entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, createBoxEntity, getChildEntities } from 'blecsd';
 *
 * const world = createWorld();
 * const parent = createBoxEntity(world, { x: 0, y: 0 });
 * const child1 = createBoxEntity(world, { parent, x: 1, y: 1 });
 * const child2 = createBoxEntity(world, { parent, x: 2, y: 2 });
 *
 * const children = getChildEntities(world, parent);
 * // children = [child1, child2]
 * ```
 */
export function getChildEntities(_world: World, parent: Entity): Entity[] {
	const children: Entity[] = [];
	let current = Hierarchy.firstChild[parent] as Entity;

	while (current !== 0) {
		children.push(current);
		current = Hierarchy.nextSibling[current] as Entity;
	}

	return children;
}

/**
 * Gets all descendant entities of a parent entity (children, grandchildren, etc.).
 *
 * Recursively traverses the hierarchy to collect all descendants.
 *
 * @param world - The ECS world
 * @param parent - The parent entity ID
 * @returns Array of all descendant entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, createBoxEntity, getDescendantEntities } from 'blecsd';
 *
 * const world = createWorld();
 * const root = createBoxEntity(world, { x: 0, y: 0 });
 * const child = createBoxEntity(world, { parent: root, x: 1, y: 1 });
 * const grandchild = createBoxEntity(world, { parent: child, x: 2, y: 2 });
 *
 * const descendants = getDescendantEntities(world, root);
 * // descendants = [child, grandchild]
 * ```
 */
export function getDescendantEntities(world: World, parent: Entity): Entity[] {
	const descendants: Entity[] = [];
	const stack: Entity[] = [parent];

	while (stack.length > 0) {
		const current = stack.pop() as Entity;
		const children = getChildEntities(world, current);

		for (const child of children) {
			descendants.push(child);
			stack.push(child);
		}
	}

	return descendants;
}

/**
 * Gets all root entities (entities with no parent).
 *
 * Filters queryHierarchy to entities where parent === 0 (NULL_ENTITY).
 *
 * @param world - The ECS world
 * @returns Array of root entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, createBoxEntity, getRootEntities } from 'blecsd';
 *
 * const world = createWorld();
 * const root1 = createBoxEntity(world, { x: 0, y: 0 });
 * const root2 = createBoxEntity(world, { x: 10, y: 0 });
 * const child = createBoxEntity(world, { parent: root1, x: 1, y: 1 });
 *
 * const roots = getRootEntities(world);
 * // roots = [root1, root2]
 * ```
 */
export function getRootEntities(world: World): Entity[] {
	const entities = queryHierarchy(world);
	return entities.filter((eid) => Hierarchy.parent[eid] === 0);
}

/**
 * Filters entities to only those that are focusable and enabled.
 *
 * Returns entities where Focusable.focusable === 1.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to filter
 * @returns Filtered array of focusable entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, queryFocusable, filterFocusable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create focusable entities, some disabled ...
 *
 * const allFocusables = queryFocusable(world);
 * const enabledFocusables = filterFocusable(world, allFocusables);
 *
 * for (const eid of enabledFocusables) {
 *   // Process only enabled focusable entities
 * }
 * ```
 */
export function filterFocusable(_world: World, entities: readonly Entity[]): Entity[] {
	return entities.filter((eid) => Focusable.focusable[eid] === 1);
}

/**
 * Filters entities to only those that are clickable.
 *
 * Returns entities where Interactive.clickable === 1.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to filter
 * @returns Filtered array of clickable entity IDs
 *
 * @example
 * ```typescript
 * import { createWorld, queryInteractive, filterClickable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create interactive entities ...
 *
 * const allInteractives = queryInteractive(world);
 * const clickables = filterClickable(world, allInteractives);
 *
 * for (const eid of clickables) {
 *   // Process only clickable entities
 * }
 * ```
 */
export function filterClickable(_world: World, entities: readonly Entity[]): Entity[] {
	return entities.filter((eid) => Interactive.clickable[eid] === 1);
}

/**
 * Sorts entities by z-index for proper layering during rendering.
 *
 * Higher z-index entities are rendered later (on top of lower z-index entities).
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to sort
 * @returns New array of entity IDs sorted by z-index (ascending)
 *
 * @example
 * ```typescript
 * import { createWorld, queryRenderable, sortByZIndex } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create entities with different z positions ...
 *
 * const renderables = queryRenderable(world);
 * const sortedForRender = sortByZIndex(world, renderables);
 *
 * for (const eid of sortedForRender) {
 *   // Render in correct z-order
 * }
 * ```
 */
export function sortByZIndex(_world: World, entities: readonly Entity[]): Entity[] {
	return [...entities].sort((a, b) => Position.z[a] - Position.z[b]);
}

/**
 * Sorts entities by tab index for focus navigation.
 *
 * Entities with lower tabIndex are focused first. Entities with tabIndex 0
 * follow DOM-like ordering.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to sort
 * @returns New array of entity IDs sorted by tab index
 *
 * @example
 * ```typescript
 * import { createWorld, queryFocusable, sortByTabIndex, filterFocusable } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create focusable entities with different tab indices ...
 *
 * const focusables = queryFocusable(world);
 * const enabled = filterFocusable(world, focusables);
 * const tabOrder = sortByTabIndex(world, enabled);
 *
 * // tabOrder is now in correct focus navigation order
 * ```
 */
export function sortByTabIndex(_world: World, entities: readonly Entity[]): Entity[] {
	return [...entities].sort((a, b) => {
		const tabA = Focusable.tabIndex[a];
		const tabB = Focusable.tabIndex[b];

		// Entities with tabIndex 0 go after positive tabIndices
		if (tabA === 0 && tabB !== 0) return 1;
		if (tabB === 0 && tabA !== 0) return -1;

		return tabA - tabB;
	});
}

/**
 * Sorts entities by depth in the hierarchy (ancestors first).
 *
 * Useful for processing entities in parent-to-child order.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to sort
 * @returns New array of entity IDs sorted by depth (ascending)
 *
 * @example
 * ```typescript
 * import { createWorld, queryHierarchy, sortByDepth } from 'blecsd';
 *
 * const world = createWorld();
 * // ... create hierarchical entities ...
 *
 * const hierarchical = queryHierarchy(world);
 * const topDown = sortByDepth(world, hierarchical);
 *
 * for (const eid of topDown) {
 *   // Process parent before children
 * }
 * ```
 */
export function sortByDepth(_world: World, entities: readonly Entity[]): Entity[] {
	return [...entities].sort((a, b) => Hierarchy.depth[a] - Hierarchy.depth[b]);
}
