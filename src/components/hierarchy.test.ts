import { addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import {
	appendChild,
	getAncestors,
	getChildren,
	getDepth,
	getDescendants,
	getHierarchy,
	getNextSibling,
	getParent,
	getPrevSibling,
	Hierarchy,
	hasHierarchy,
	isLeaf,
	isRoot,
	NULL_ENTITY,
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
});
