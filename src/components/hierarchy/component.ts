/**
 * Hierarchy component definition.
 * @module components/hierarchy/component
 */

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
