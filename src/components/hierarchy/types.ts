/**
 * Hierarchy type definitions.
 * @module components/hierarchy/types
 */

import type { Entity } from '../../core/types';

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
 * Callback function for tree traversal.
 * Return `false` to stop traversal early.
 */
export type TraversalCallback = (entity: Entity, depth: number) => boolean | undefined;

/** Stack item for depth-first traversal */
export interface TraversalStackItem {
	entity: Entity;
	depth: number;
}
