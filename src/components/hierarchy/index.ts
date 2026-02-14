/**
 * Hierarchy component for parent/child entity relationships.
 * Uses a linked list structure for efficient traversal.
 * @module components/hierarchy
 */

// Component definition
export { Hierarchy, NULL_ENTITY } from './component';

// Types
export type { HierarchyData, TraversalCallback, TraversalStackItem } from './types';

// Parent/child operations
export { appendChild, detach, removeChild, setParent } from './parent';

// Child access and queries
export {
	getAncestors,
	getChildAt,
	getChildren,
	getChildIndex,
	getDescendants,
	getFirstChild,
	getLastChild,
} from './children';

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

// Insertion functions
export { insertAfter, insertAt, insertBefore, prepend } from './insertion';

// Traversal functions
export {
	forAncestors,
	forDescendants,
	getCommonAncestor,
	getRoot,
	hasAncestor,
	hasDescendant,
} from './traversal';
