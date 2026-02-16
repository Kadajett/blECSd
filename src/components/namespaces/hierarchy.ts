/**
 * Hierarchy component namespace.
 *
 * Provides all operations for entity parent-child relationships and tree traversal.
 *
 * @example
 * ```typescript
 * import { hierarchy } from 'blecsd/components';
 * hierarchy.appendChild(world, parent, child);
 * const children = hierarchy.getChildren(world, parent);
 * hierarchy.forDescendants(world, root, (eid) => { ... });
 * ```
 */
import {
	appendChild,
	detach,
	forAncestors,
	forDescendants,
	getAncestors,
	getChildAt,
	getChildIndex,
	getChildren,
	getCommonAncestor,
	getDepth,
	getDescendants,
	getFirstChild,
	getHierarchy,
	getLastChild,
	getNextSibling,
	getParent,
	getPrevSibling,
	getRoot,
	getSiblings,
	hasAncestor,
	hasDescendant,
	hasHierarchy,
	insertAfter,
	insertAt,
	insertBefore,
	isLeaf,
	isRoot,
	prepend,
	removeChild,
	setParent,
} from '../hierarchy';

export const hierarchy = Object.freeze({
	get: getHierarchy,
	has: hasHierarchy,

	appendChild,
	removeChild,
	prepend,
	detach,
	setParent,

	insertAt,
	insertBefore,
	insertAfter,

	getParent,
	getChildren,
	getFirstChild,
	getLastChild,
	getChildAt,
	getChildIndex,
	getSiblings,
	getNextSibling,
	getPrevSibling,
	getRoot,
	getDepth,

	getAncestors,
	getDescendants,
	getCommonAncestor,
	hasAncestor,
	hasDescendant,

	forAncestors,
	forDescendants,

	isRoot,
	isLeaf,
});

export type HierarchyModule = typeof hierarchy;
