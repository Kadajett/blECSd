/**
 * Hierarchy component for parent/child entity relationships.
 * Uses a linked list structure for efficient traversal.
 * @module components/hierarchy
 */

// Child access and queries
export {
	getAncestors,
	getChildAt,
	getChildIndex,
	getChildren,
	getDescendants,
	getFirstChild,
	getLastChild,
} from './children';
// Component definition
export { Hierarchy, NULL_ENTITY } from './component';
// Insertion functions
export { insertAfter, insertAt, insertBefore, prepend } from './insertion';
// Parent/child operations
export { appendChild, detach, removeChild, setParent } from './parent';

// Status and query functions
export {
	getDepth,
	getHierarchy,
	getNextSibling,
	getParent,
	getPrevSibling,
	getSiblings,
	hasHierarchy,
	isLeaf,
	isRoot,
} from './queries';
// Traversal functions
export {
	forAncestors,
	forDescendants,
	getCommonAncestor,
	getRoot,
	hasAncestor,
	hasDescendant,
} from './traversal';
// Types
export type { HierarchyData, TraversalCallback, TraversalStackItem } from './types';
