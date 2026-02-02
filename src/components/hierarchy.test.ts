import { addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
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
	Hierarchy,
	insertAfter,
	insertAt,
	insertBefore,
	isLeaf,
	isRoot,
	NULL_ENTITY,
	prepend,
	removeChild,
	setParent,
} from './hierarchy';

describe('Hierarchy component', () => {
	describe('setParent', () => {
		it('sets parent correctly', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setParent(world, child, parent);

			expect(Hierarchy.parent[child]).toBe(parent);
		});

		it('updates depth correctly', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setParent(world, child, parent);

			expect(Hierarchy.depth[child]).toBe(1);
		});

		it('updates parent child count', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setParent(world, child, parent);

			expect(Hierarchy.childCount[parent]).toBe(1);
		});

		it('removes from previous parent', () => {
			const world = createWorld();
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const child = addEntity(world);

			setParent(world, child, parent1);
			setParent(world, child, parent2);

			expect(Hierarchy.parent[child]).toBe(parent2);
			expect(Hierarchy.childCount[parent1]).toBe(0);
			expect(Hierarchy.childCount[parent2]).toBe(1);
		});

		it('orphans when parent is NULL_ENTITY', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setParent(world, child, parent);
			setParent(world, child, NULL_ENTITY);

			expect(Hierarchy.parent[child]).toBe(NULL_ENTITY);
			expect(Hierarchy.depth[child]).toBe(0);
		});

		it('returns child for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const result = setParent(world, child, parent);

			expect(result).toBe(child);
		});
	});

	describe('appendChild', () => {
		it('appends child to parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getParent(world, child)).toBe(parent);
		});

		it('maintains sibling order', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			const children = getChildren(world, parent);
			expect(children).toEqual([child1, child2, child3]);
		});

		it('returns parent for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const result = appendChild(world, parent, child);

			expect(result).toBe(parent);
		});
	});

	describe('removeChild', () => {
		it('removes child from parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			removeChild(world, parent, child);

			expect(getParent(world, child)).toBe(NULL_ENTITY);
			expect(Hierarchy.childCount[parent]).toBe(0);
		});

		it('maintains sibling links after removal', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			removeChild(world, parent, child2);

			const children = getChildren(world, parent);
			expect(children).toEqual([child1, child3]);
		});

		it('handles first child removal', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			removeChild(world, parent, child1);

			expect(Hierarchy.firstChild[parent]).toBe(child2);
			expect(getChildren(world, parent)).toEqual([child2]);
		});

		it('handles last child removal', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			removeChild(world, parent, child2);

			expect(getChildren(world, parent)).toEqual([child1]);
		});

		it('returns parent for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			const result = removeChild(world, parent, child);

			expect(result).toBe(parent);
		});
	});

	describe('getChildren', () => {
		it('returns empty array for entity without children', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const children = getChildren(world, entity);

			expect(children).toEqual([]);
		});

		it('returns all children in order', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			const children = getChildren(world, parent);

			expect(children).toEqual([child1, child2, child3]);
		});
	});

	describe('getAncestors', () => {
		it('returns empty array for root', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const ancestors = getAncestors(world, entity);

			expect(ancestors).toEqual([]);
		});

		it('returns ancestors in order', () => {
			const world = createWorld();
			const grandparent = addEntity(world);
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, grandparent, parent);
			appendChild(world, parent, child);

			const ancestors = getAncestors(world, child);

			expect(ancestors).toEqual([parent, grandparent]);
		});
	});

	describe('getDescendants', () => {
		it('returns empty array for leaf', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const descendants = getDescendants(world, entity);

			expect(descendants).toEqual([]);
		});

		it('returns all descendants', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child1);
			appendChild(world, root, child2);
			appendChild(world, child1, grandchild);

			const descendants = getDescendants(world, root);

			expect(descendants).toContain(child1);
			expect(descendants).toContain(child2);
			expect(descendants).toContain(grandchild);
			expect(descendants.length).toBe(3);
		});
	});

	describe('getParent', () => {
		it('returns NULL_ENTITY for root', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getParent(world, entity)).toBe(NULL_ENTITY);
		});

		it('returns parent entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getParent(world, child)).toBe(parent);
		});
	});

	describe('getHierarchy', () => {
		it('returns undefined for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getHierarchy(world, entity)).toBeUndefined();
		});

		it('returns hierarchy data', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			const data = getHierarchy(world, child);
			expect(data).toBeDefined();
			expect(data?.parent).toBe(parent);
			expect(data?.depth).toBe(1);
		});
	});

	describe('hasHierarchy', () => {
		it('returns true when entity has Hierarchy', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(hasHierarchy(world, child)).toBe(true);
		});

		it('returns false when entity lacks Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasHierarchy(world, entity)).toBe(false);
		});
	});

	describe('isRoot', () => {
		it('returns true for entity without parent', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isRoot(world, entity)).toBe(true);
		});

		it('returns false for entity with parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(isRoot(world, child)).toBe(false);
		});
	});

	describe('isLeaf', () => {
		it('returns true for entity without children', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isLeaf(world, entity)).toBe(true);
		});

		it('returns false for entity with children', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(isLeaf(world, parent)).toBe(false);
		});
	});

	describe('getDepth', () => {
		it('returns 0 for root', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getDepth(world, entity)).toBe(0);
		});

		it('returns correct depth for nested entities', () => {
			const world = createWorld();
			const level0 = addEntity(world);
			const level1 = addEntity(world);
			const level2 = addEntity(world);
			const level3 = addEntity(world);

			appendChild(world, level0, level1);
			appendChild(world, level1, level2);
			appendChild(world, level2, level3);

			expect(getDepth(world, level0)).toBe(0);
			expect(getDepth(world, level1)).toBe(1);
			expect(getDepth(world, level2)).toBe(2);
			expect(getDepth(world, level3)).toBe(3);
		});

		it('updates depth when reparenting', () => {
			const world = createWorld();
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, parent1, parent2);
			appendChild(world, parent2, child);
			appendChild(world, child, grandchild);

			expect(getDepth(world, grandchild)).toBe(3);

			// Reparent child to parent1
			setParent(world, child, parent1);

			expect(getDepth(world, child)).toBe(1);
			expect(getDepth(world, grandchild)).toBe(2);
		});
	});

	describe('sibling navigation', () => {
		it('getNextSibling returns next sibling', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			expect(getNextSibling(world, child1)).toBe(child2);
			expect(getNextSibling(world, child2)).toBe(child3);
			expect(getNextSibling(world, child3)).toBe(NULL_ENTITY);
		});

		it('getPrevSibling returns previous sibling', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			expect(getPrevSibling(world, child1)).toBe(NULL_ENTITY);
			expect(getPrevSibling(world, child2)).toBe(child1);
			expect(getPrevSibling(world, child3)).toBe(child2);
		});
	});

	describe('prepend', () => {
		it('inserts child at beginning', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child2);
			prepend(world, parent, child1);

			const children = getChildren(world, parent);
			expect(children).toEqual([child1, child2]);
		});

		it('works with empty parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			prepend(world, parent, child);

			expect(getChildren(world, parent)).toEqual([child]);
		});

		it('updates sibling links correctly', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child2);
			appendChild(world, parent, child3);
			prepend(world, parent, child1);

			expect(getNextSibling(world, child1)).toBe(child2);
			expect(getPrevSibling(world, child2)).toBe(child1);
		});

		it('removes from previous parent', () => {
			const world = createWorld();
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent1, child);
			prepend(world, parent2, child);

			expect(getParent(world, child)).toBe(parent2);
			expect(Hierarchy.childCount[parent1]).toBe(0);
		});

		it('returns parent for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const result = prepend(world, parent, child);

			expect(result).toBe(parent);
		});

		it('updates depth correctly', () => {
			const world = createWorld();
			const grandparent = addEntity(world);
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, grandparent, parent);
			prepend(world, parent, child);

			expect(getDepth(world, child)).toBe(2);
		});
	});

	describe('insertAt', () => {
		it('inserts at specific index', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertAt(world, parent, child2, 1);

			expect(getChildren(world, parent)).toEqual([child1, child2, child3]);
		});

		it('inserts at beginning when index is 0', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child2);
			insertAt(world, parent, child1, 0);

			expect(getChildren(world, parent)).toEqual([child1, child2]);
		});

		it('appends when index exceeds child count', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			insertAt(world, parent, child2, 10);

			expect(getChildren(world, parent)).toEqual([child1, child2]);
		});

		it('handles negative indices', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertAt(world, parent, child2, -1);

			expect(getChildren(world, parent)).toEqual([child1, child2, child3]);
		});

		it('returns parent for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const result = insertAt(world, parent, child, 0);

			expect(result).toBe(parent);
		});
	});

	describe('insertBefore', () => {
		it('inserts before sibling', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertBefore(world, child2, child3);

			expect(getChildren(world, parent)).toEqual([child1, child2, child3]);
		});

		it('inserts at beginning when before first child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child2);
			insertBefore(world, child1, child2);

			expect(getChildren(world, parent)).toEqual([child1, child2]);
			expect(Hierarchy.firstChild[parent]).toBe(child1);
		});

		it('updates sibling links correctly', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertBefore(world, child2, child3);

			expect(getNextSibling(world, child1)).toBe(child2);
			expect(getNextSibling(world, child2)).toBe(child3);
			expect(getPrevSibling(world, child2)).toBe(child1);
			expect(getPrevSibling(world, child3)).toBe(child2);
		});

		it('removes from previous parent', () => {
			const world = createWorld();
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent1, child1);
			appendChild(world, parent2, child2);
			insertBefore(world, child1, child2);

			expect(getParent(world, child1)).toBe(parent2);
			expect(Hierarchy.childCount[parent1]).toBe(0);
		});

		it('returns child for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child2);
			const result = insertBefore(world, child1, child2);

			expect(result).toBe(child1);
		});

		it('returns child when sibling has no Hierarchy', () => {
			const world = createWorld();
			const child = addEntity(world);
			const sibling = addEntity(world);

			const result = insertBefore(world, child, sibling);

			expect(result).toBe(child);
		});

		it('returns child when sibling has no parent', () => {
			const world = createWorld();
			const child = addEntity(world);
			const sibling = addEntity(world);

			setParent(world, sibling, NULL_ENTITY);
			const result = insertBefore(world, child, sibling);

			expect(result).toBe(child);
		});
	});

	describe('insertAfter', () => {
		it('inserts after sibling', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertAfter(world, child2, child1);

			expect(getChildren(world, parent)).toEqual([child1, child2, child3]);
		});

		it('inserts at end when after last child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			insertAfter(world, child2, child1);

			expect(getChildren(world, parent)).toEqual([child1, child2]);
		});

		it('updates sibling links correctly', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child3);
			insertAfter(world, child2, child1);

			expect(getNextSibling(world, child1)).toBe(child2);
			expect(getNextSibling(world, child2)).toBe(child3);
			expect(getPrevSibling(world, child2)).toBe(child1);
			expect(getPrevSibling(world, child3)).toBe(child2);
		});

		it('removes from previous parent', () => {
			const world = createWorld();
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent1, child1);
			appendChild(world, parent2, child2);
			insertAfter(world, child1, child2);

			expect(getParent(world, child1)).toBe(parent2);
			expect(Hierarchy.childCount[parent1]).toBe(0);
		});

		it('returns child for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			const result = insertAfter(world, child2, child1);

			expect(result).toBe(child2);
		});

		it('returns child when sibling has no Hierarchy', () => {
			const world = createWorld();
			const child = addEntity(world);
			const sibling = addEntity(world);

			const result = insertAfter(world, child, sibling);

			expect(result).toBe(child);
		});
	});

	describe('detach', () => {
		it('removes entity from parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			detach(world, child);

			expect(getParent(world, child)).toBe(NULL_ENTITY);
			expect(Hierarchy.childCount[parent]).toBe(0);
		});

		it('resets depth to 0', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			detach(world, child);

			expect(getDepth(world, child)).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			const result = detach(world, child);

			expect(result).toBe(child);
		});

		it('handles already detached entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = detach(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('getFirstChild', () => {
		it('returns first child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			expect(getFirstChild(world, parent)).toBe(child1);
		});

		it('returns NULL_ENTITY for entity without children', () => {
			const world = createWorld();
			const parent = addEntity(world);

			setParent(world, parent, NULL_ENTITY);

			expect(getFirstChild(world, parent)).toBe(NULL_ENTITY);
		});

		it('returns NULL_ENTITY for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getFirstChild(world, entity)).toBe(NULL_ENTITY);
		});
	});

	describe('getLastChild', () => {
		it('returns last child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			expect(getLastChild(world, parent)).toBe(child3);
		});

		it('returns NULL_ENTITY for entity without children', () => {
			const world = createWorld();
			const parent = addEntity(world);

			setParent(world, parent, NULL_ENTITY);

			expect(getLastChild(world, parent)).toBe(NULL_ENTITY);
		});

		it('returns NULL_ENTITY for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getLastChild(world, entity)).toBe(NULL_ENTITY);
		});

		it('returns same entity when only one child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getFirstChild(world, parent)).toBe(child);
			expect(getLastChild(world, parent)).toBe(child);
		});
	});

	describe('getChildIndex', () => {
		it('returns correct index', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			expect(getChildIndex(world, child1)).toBe(0);
			expect(getChildIndex(world, child2)).toBe(1);
			expect(getChildIndex(world, child3)).toBe(2);
		});

		it('returns -1 for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getChildIndex(world, entity)).toBe(-1);
		});

		it('returns -1 for orphan entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setParent(world, entity, NULL_ENTITY);

			expect(getChildIndex(world, entity)).toBe(-1);
		});
	});

	describe('getChildAt', () => {
		it('returns child at index', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			expect(getChildAt(world, parent, 0)).toBe(child1);
			expect(getChildAt(world, parent, 1)).toBe(child2);
			expect(getChildAt(world, parent, 2)).toBe(child3);
		});

		it('returns NULL_ENTITY for out of bounds index', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getChildAt(world, parent, 5)).toBe(NULL_ENTITY);
		});

		it('returns NULL_ENTITY for negative index', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getChildAt(world, parent, -1)).toBe(NULL_ENTITY);
		});

		it('returns NULL_ENTITY for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getChildAt(world, entity, 0)).toBe(NULL_ENTITY);
		});
	});

	describe('forDescendants', () => {
		it('iterates over all descendants in depth-first order', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const grandchild1 = addEntity(world);
			const grandchild2 = addEntity(world);

			appendChild(world, root, child1);
			appendChild(world, root, child2);
			appendChild(world, child1, grandchild1);
			appendChild(world, child1, grandchild2);

			const visited: number[] = [];
			forDescendants(world, root, (entity) => {
				visited.push(entity);
			});

			expect(visited).toEqual([child1, grandchild1, grandchild2, child2]);
		});

		it('provides relative depth in callback', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			const depths: number[] = [];
			forDescendants(world, root, (_, depth) => {
				depths.push(depth);
			});

			expect(depths).toEqual([1, 2]);
		});

		it('stops early when callback returns false', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, root, child1);
			appendChild(world, root, child2);
			appendChild(world, root, child3);

			const visited: number[] = [];
			const result = forDescendants(world, root, (entity) => {
				visited.push(entity);
				if (entity === child2) return false;
			});

			expect(result).toBe(false);
			expect(visited).toEqual([child1, child2]);
		});

		it('returns true when entity has no Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = forDescendants(world, entity, () => {});
			expect(result).toBe(true);
		});
	});

	describe('forAncestors', () => {
		it('iterates over all ancestors from parent to root', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			const visited: number[] = [];
			forAncestors(world, grandchild, (entity) => {
				visited.push(entity);
			});

			expect(visited).toEqual([child, root]);
		});

		it('provides level (distance from starting entity) in callback', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			const levels: number[] = [];
			forAncestors(world, grandchild, (_, level) => {
				levels.push(level);
			});

			expect(levels).toEqual([1, 2]);
		});

		it('stops early when callback returns false', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			const visited: number[] = [];
			const result = forAncestors(world, grandchild, (entity) => {
				visited.push(entity);
				return false; // Stop at first ancestor
			});

			expect(result).toBe(false);
			expect(visited).toEqual([child]);
		});
	});

	describe('hasDescendant', () => {
		it('returns true when target is a direct child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(hasDescendant(world, parent, child)).toBe(true);
		});

		it('returns true when target is a grandchild', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			expect(hasDescendant(world, root, grandchild)).toBe(true);
		});

		it('returns false when target is not a descendant', () => {
			const world = createWorld();
			const a = addEntity(world);
			const b = addEntity(world);

			setParent(world, a, NULL_ENTITY);
			setParent(world, b, NULL_ENTITY);

			expect(hasDescendant(world, a, b)).toBe(false);
		});

		it('returns false when checking entity against itself', () => {
			const world = createWorld();
			const entity = addEntity(world);
			setParent(world, entity, NULL_ENTITY);

			expect(hasDescendant(world, entity, entity)).toBe(false);
		});
	});

	describe('hasAncestor', () => {
		it('returns true when target is the parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(hasAncestor(world, child, parent)).toBe(true);
		});

		it('returns true when target is a grandparent', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			expect(hasAncestor(world, grandchild, root)).toBe(true);
		});

		it('returns false when target is not an ancestor', () => {
			const world = createWorld();
			const a = addEntity(world);
			const b = addEntity(world);

			setParent(world, a, NULL_ENTITY);
			setParent(world, b, NULL_ENTITY);

			expect(hasAncestor(world, a, b)).toBe(false);
		});
	});

	describe('getRoot', () => {
		it('returns root ancestor', () => {
			const world = createWorld();
			const root = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			appendChild(world, root, child);
			appendChild(world, child, grandchild);

			expect(getRoot(world, grandchild)).toBe(root);
		});

		it('returns entity itself if it has no parent', () => {
			const world = createWorld();
			const entity = addEntity(world);
			setParent(world, entity, NULL_ENTITY);

			expect(getRoot(world, entity)).toBe(entity);
		});

		it('returns entity if it has no Hierarchy component', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getRoot(world, entity)).toBe(entity);
		});
	});

	describe('getCommonAncestor', () => {
		it('returns common ancestor of two siblings', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			expect(getCommonAncestor(world, child1, child2)).toBe(parent);
		});

		it('returns common ancestor of cousins', () => {
			const world = createWorld();
			const grandparent = addEntity(world);
			const parent1 = addEntity(world);
			const parent2 = addEntity(world);
			const cousin1 = addEntity(world);
			const cousin2 = addEntity(world);

			appendChild(world, grandparent, parent1);
			appendChild(world, grandparent, parent2);
			appendChild(world, parent1, cousin1);
			appendChild(world, parent2, cousin2);

			expect(getCommonAncestor(world, cousin1, cousin2)).toBe(grandparent);
		});

		it('returns ancestor when one is ancestor of the other', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getCommonAncestor(world, parent, child)).toBe(parent);
			expect(getCommonAncestor(world, child, parent)).toBe(parent);
		});

		it('returns NULL_ENTITY when entities have no common ancestor', () => {
			const world = createWorld();
			const a = addEntity(world);
			const b = addEntity(world);

			setParent(world, a, NULL_ENTITY);
			setParent(world, b, NULL_ENTITY);

			expect(getCommonAncestor(world, a, b)).toBe(NULL_ENTITY);
		});
	});

	describe('getSiblings', () => {
		it('returns all siblings of an entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			const siblings = getSiblings(world, child2);
			expect(siblings).toContain(child1);
			expect(siblings).toContain(child3);
			expect(siblings).not.toContain(child2);
			expect(siblings.length).toBe(2);
		});

		it('returns empty array for root entity', () => {
			const world = createWorld();
			const root = addEntity(world);
			setParent(world, root, NULL_ENTITY);

			expect(getSiblings(world, root)).toEqual([]);
		});

		it('returns empty array for only child', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);

			expect(getSiblings(world, child)).toEqual([]);
		});

		it('returns empty array for entity without Hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getSiblings(world, entity)).toEqual([]);
		});
	});
});
