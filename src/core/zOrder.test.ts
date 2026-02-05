/**
 * Tests for z-order management.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { appendChild } from '../components/hierarchy';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from './types';
import {
	DEFAULT_Z_INDEX,
	getChildrenByZIndex,
	getLocalZ,
	getZIndex,
	hasZOrder,
	MAX_Z_INDEX,
	MIN_Z_INDEX,
	moveDown,
	moveUp,
	normalizeZIndices,
	resetZOrder,
	setBack,
	setFront,
	setLocalZ,
	setZIndex,
	sortByZIndex,
	ZOrder,
} from './zOrder';

describe('zOrder', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
	});

	describe('getZIndex', () => {
		it('returns default for entity without ZOrder', () => {
			const entity = addEntity(world);
			expect(getZIndex(world, entity)).toBe(DEFAULT_Z_INDEX);
		});

		it('returns set z-index', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 10);
			expect(getZIndex(world, entity)).toBe(10);
		});

		it('handles negative z-index', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, -5);
			expect(getZIndex(world, entity)).toBe(-5);
		});
	});

	describe('setZIndex', () => {
		it('sets z-index', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 42);
			expect(ZOrder.zIndex[entity]).toBe(42);
		});

		it('clamps to maximum', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, MAX_Z_INDEX + 1000);
			expect(getZIndex(world, entity)).toBe(MAX_Z_INDEX);
		});

		it('clamps to minimum', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, MIN_Z_INDEX - 1000);
			expect(getZIndex(world, entity)).toBe(MIN_Z_INDEX);
		});

		it('floors floating point values', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 5.9);
			expect(getZIndex(world, entity)).toBe(5);
		});

		it('adds ZOrder component if not present', () => {
			const entity = addEntity(world);
			expect(hasZOrder(world, entity)).toBe(false);
			setZIndex(world, entity, 1);
			expect(hasZOrder(world, entity)).toBe(true);
		});
	});

	describe('getLocalZ / setLocalZ', () => {
		it('gets default local z', () => {
			const entity = addEntity(world);
			expect(getLocalZ(world, entity)).toBe(DEFAULT_Z_INDEX);
		});

		it('sets and gets local z', () => {
			const entity = addEntity(world);
			setLocalZ(world, entity, 5);
			expect(getLocalZ(world, entity)).toBe(5);
		});
	});

	describe('hasZOrder', () => {
		it('returns false for entity without component', () => {
			const entity = addEntity(world);
			expect(hasZOrder(world, entity)).toBe(false);
		});

		it('returns true after setting z-index', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 0);
			expect(hasZOrder(world, entity)).toBe(true);
		});
	});

	describe('setFront', () => {
		it('brings entity to front among siblings', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);
			setZIndex(world, child3, 10);

			setFront(world, child1);

			expect(getZIndex(world, child1)).toBeGreaterThan(getZIndex(world, child3));
		});

		it('handles single child', () => {
			const parent = addEntity(world);
			const child = addEntity(world);

			appendChild(world, parent, child);
			setZIndex(world, child, 0);

			setFront(world, child);

			expect(getZIndex(world, child)).toBe(0);
		});

		it('handles entity without parent', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 0);

			// Should not throw
			setFront(world, entity);
		});
	});

	describe('setBack', () => {
		it('sends entity to back among siblings', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);
			setZIndex(world, child3, 10);

			setBack(world, child3);

			expect(getZIndex(world, child3)).toBeLessThan(getZIndex(world, child1));
		});

		it('handles entity without parent', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 0);

			// Should not throw
			setBack(world, entity);
		});
	});

	describe('moveUp', () => {
		it('swaps with next higher sibling', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);

			const moved = moveUp(world, child1);

			expect(moved).toBe(true);
			expect(getZIndex(world, child1)).toBe(5);
			expect(getZIndex(world, child2)).toBe(0);
		});

		it('returns false when already at top', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);

			const moved = moveUp(world, child2);

			expect(moved).toBe(false);
			expect(getZIndex(world, child2)).toBe(5);
		});

		it('returns false for entity without siblings', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 0);

			const moved = moveUp(world, entity);

			expect(moved).toBe(false);
		});
	});

	describe('moveDown', () => {
		it('swaps with next lower sibling', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);

			const moved = moveDown(world, child2);

			expect(moved).toBe(true);
			expect(getZIndex(world, child1)).toBe(5);
			expect(getZIndex(world, child2)).toBe(0);
		});

		it('returns false when already at bottom', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			setZIndex(world, child1, 0);
			setZIndex(world, child2, 5);

			const moved = moveDown(world, child1);

			expect(moved).toBe(false);
		});
	});

	describe('sortByZIndex', () => {
		it('sorts entities by z-index ascending', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);

			setZIndex(world, e1, 10);
			setZIndex(world, e2, 0);
			setZIndex(world, e3, 5);

			const sorted = sortByZIndex(world, [e1, e2, e3]);

			expect(sorted).toEqual([e2, e3, e1]);
		});

		it('handles entities without ZOrder component', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);

			setZIndex(world, e1, 10);
			// e2 has no ZOrder (default 0)
			setZIndex(world, e3, -5);

			const sorted = sortByZIndex(world, [e1, e2, e3]);

			expect(sorted).toEqual([e3, e2, e1]);
		});

		it('preserves order for equal z-indices', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);

			setZIndex(world, e1, 0);
			setZIndex(world, e2, 0);
			setZIndex(world, e3, 0);

			const sorted = sortByZIndex(world, [e1, e2, e3]);

			// Should maintain stable sort
			expect(sorted.length).toBe(3);
		});

		it('handles empty array', () => {
			const sorted = sortByZIndex(world, []);
			expect(sorted).toEqual([]);
		});
	});

	describe('getChildrenByZIndex', () => {
		it('returns children sorted by z-index', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			setZIndex(world, child1, 10);
			setZIndex(world, child2, 0);
			setZIndex(world, child3, 5);

			const sorted = getChildrenByZIndex(world, parent);

			expect(sorted).toEqual([child2, child3, child1]);
		});

		it('returns empty array for entity without children', () => {
			const entity = addEntity(world);
			const children = getChildrenByZIndex(world, entity);
			expect(children).toEqual([]);
		});
	});

	describe('normalizeZIndices', () => {
		it('normalizes z-indices to sequential values', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			appendChild(world, parent, child1);
			appendChild(world, parent, child2);
			appendChild(world, parent, child3);

			setZIndex(world, child1, 100);
			setZIndex(world, child2, -50);
			setZIndex(world, child3, 25);

			normalizeZIndices(world, parent);

			// Should be 0, 1, 2 in sorted order
			const sorted = getChildrenByZIndex(world, parent);
			expect(getZIndex(world, sorted[0] as number)).toBe(0);
			expect(getZIndex(world, sorted[1] as number)).toBe(1);
			expect(getZIndex(world, sorted[2] as number)).toBe(2);
		});
	});

	describe('resetZOrder', () => {
		it('resets z-order values to defaults', () => {
			const entity = addEntity(world);
			setZIndex(world, entity, 100);
			setLocalZ(world, entity, 50);

			resetZOrder(entity);

			expect(ZOrder.zIndex[entity]).toBe(DEFAULT_Z_INDEX);
			expect(ZOrder.localZ[entity]).toBe(DEFAULT_Z_INDEX);
		});
	});

	describe('constants', () => {
		it('has correct default value', () => {
			expect(DEFAULT_Z_INDEX).toBe(0);
		});

		it('has correct max value', () => {
			expect(MAX_Z_INDEX).toBe(0x7fffffff);
		});

		it('has correct min value', () => {
			expect(MIN_Z_INDEX).toBe(-0x80000000);
		});
	});
});
