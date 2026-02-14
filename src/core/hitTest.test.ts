/**
 * Tests for hit test system with z-order aware clickable sorting.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import { setInteractive } from '../systems/interactiveSystem';
import {
	createClickableCache,
	getAllClickablesAt,
	getAllHoverablesAt,
	getClickableAt,
	getClickableCount,
	getClickableEntities,
	getHoverableAt,
	hasClickableAt,
	hasHoverableAt,
	hitTest,
	hitTestAll,
	hitTestDetailed,
	invalidateClickableCache,
	isCacheDirty,
	updateClickableCache,
} from './hitTest';
import { setPositionCache } from './positionCache';
import type { World } from './types';
import { setZIndex } from './zOrder';

describe('hitTest', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
	});

	/**
	 * Helper to create a clickable entity at position with dimensions.
	 */
	function createClickableEntity(
		x: number,
		y: number,
		width: number,
		height: number,
		zIndex: number = 0,
	): number {
		const eid = addEntity(world);
		setPosition(world, eid, x, y);
		setDimensions(world, eid, width, height);
		setInteractive(world, eid, { clickable: true });
		setZIndex(world, eid, zIndex);
		// Set up position cache for hit testing
		setPositionCache(world, eid, {
			xi: x,
			yi: y,
			xl: x + width,
			yl: y + height,
			base: 0,
		});
		return eid;
	}

	/**
	 * Helper to create a hoverable entity.
	 */
	function createHoverableEntity(
		x: number,
		y: number,
		width: number,
		height: number,
		zIndex: number = 0,
	): number {
		const eid = addEntity(world);
		setPosition(world, eid, x, y);
		setDimensions(world, eid, width, height);
		setInteractive(world, eid, { hoverable: true });
		setZIndex(world, eid, zIndex);
		setPositionCache(world, eid, {
			xi: x,
			yi: y,
			xl: x + width,
			yl: y + height,
			base: 0,
		});
		return eid;
	}

	describe('createClickableCache', () => {
		it('creates a dirty cache', () => {
			const cache = createClickableCache();
			expect(cache.dirty).toBe(true);
			expect(cache.entities).toEqual([]);
			expect(cache.lastCount).toBe(0);
		});
	});

	describe('invalidateClickableCache', () => {
		it('marks cache as dirty', () => {
			const cache = createClickableCache();
			cache.dirty = false;
			invalidateClickableCache(cache);
			expect(cache.dirty).toBe(true);
		});
	});

	describe('isCacheDirty', () => {
		it('returns cache dirty state', () => {
			const cache = createClickableCache();
			expect(isCacheDirty(cache)).toBe(true);

			cache.dirty = false;
			expect(isCacheDirty(cache)).toBe(false);
		});
	});

	describe('updateClickableCache', () => {
		it('populates cache with clickable entities', () => {
			const e1 = createClickableEntity(0, 0, 10, 10);
			const e2 = createClickableEntity(20, 0, 10, 10);
			const cache = createClickableCache();

			updateClickableCache(world, cache);

			expect(cache.dirty).toBe(false);
			expect(cache.entities).toContain(e1);
			expect(cache.entities).toContain(e2);
			expect(cache.lastCount).toBe(2);
		});

		it('includes hoverable entities', () => {
			const e1 = createClickableEntity(0, 0, 10, 10);
			const e2 = createHoverableEntity(20, 0, 10, 10);
			const cache = createClickableCache();

			updateClickableCache(world, cache);

			expect(cache.entities).toContain(e1);
			expect(cache.entities).toContain(e2);
		});

		it('sorts by z-index descending', () => {
			const e1 = createClickableEntity(0, 0, 10, 10, 0);
			const e2 = createClickableEntity(0, 0, 10, 10, 10);
			const e3 = createClickableEntity(0, 0, 10, 10, 5);
			const cache = createClickableCache();

			updateClickableCache(world, cache);

			// Highest z-index first
			expect(cache.entities[0]).toBe(e2);
			expect(cache.entities[1]).toBe(e3);
			expect(cache.entities[2]).toBe(e1);
		});

		it('does not rebuild if not dirty', () => {
			createClickableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			updateClickableCache(world, cache);
			const firstEntities = [...cache.entities];

			// Add another entity but don't invalidate
			createClickableEntity(20, 0, 10, 10);
			updateClickableCache(world, cache);

			// Should be same as before (not rebuilt)
			expect(cache.entities).toEqual(firstEntities);
		});
	});

	describe('getClickableEntities', () => {
		it('returns sorted clickable entities', () => {
			const e1 = createClickableEntity(0, 0, 10, 10, 5);
			const e2 = createClickableEntity(0, 0, 10, 10, 10);
			const cache = createClickableCache();

			const entities = getClickableEntities(world, cache);

			expect(entities[0]).toBe(e2);
			expect(entities[1]).toBe(e1);
		});
	});

	describe('getClickableCount', () => {
		it('returns count of clickable entities', () => {
			createClickableEntity(0, 0, 10, 10);
			createClickableEntity(20, 0, 10, 10);
			const cache = createClickableCache();

			const count = getClickableCount(world, cache);

			expect(count).toBe(2);
		});
	});

	describe('hitTest', () => {
		it('returns topmost entity at point', () => {
			createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 10, 10, 10); // overlapping, higher z
			const cache = createClickableCache();

			const result = hitTest(world, 8, 8, cache);

			expect(result).toBe(e2); // Higher z-index
		});

		it('returns null if no entity at point', () => {
			createClickableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			const result = hitTest(world, 50, 50, cache);

			expect(result).toBeNull();
		});

		it('respects clickableOnly filter', () => {
			const _clickable = createClickableEntity(0, 0, 10, 10, 0);
			const hoverable = createHoverableEntity(0, 0, 10, 10, 10); // higher z but hoverable only
			const cache = createClickableCache();

			// Only clickables
			const result = hitTest(world, 5, 5, cache, { clickableOnly: true });
			expect(result).toBe(_clickable);

			// Only hoverables
			const resultHover = hitTest(world, 5, 5, cache, {
				hoverableOnly: true,
				clickableOnly: false,
			});
			expect(resultHover).toBe(hoverable);
		});

		it('works without cache', () => {
			createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 10, 10, 10);

			const result = hitTest(world, 8, 8, undefined);

			expect(result).toBe(e2);
		});

		it('handles entities with same z-index', () => {
			const e1 = createClickableEntity(0, 0, 20, 20, 5);
			const e2 = createClickableEntity(5, 5, 10, 10, 5);
			const cache = createClickableCache();

			const result = hitTest(world, 8, 8, cache);

			// Should return one of them (order may vary for same z)
			expect(result === e1 || result === e2).toBe(true);
		});
	});

	describe('hitTestAll', () => {
		it('returns all entities at point sorted by z-index', () => {
			const e1 = createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 15, 15, 10);
			const e3 = createClickableEntity(8, 8, 10, 10, 5);
			const cache = createClickableCache();

			const results = hitTestAll(world, 10, 10, cache);

			expect(results).toHaveLength(3);
			expect(results[0]).toBe(e2); // z=10
			expect(results[1]).toBe(e3); // z=5
			expect(results[2]).toBe(e1); // z=0
		});

		it('returns empty array if no entities at point', () => {
			createClickableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			const results = hitTestAll(world, 50, 50, cache);

			expect(results).toEqual([]);
		});

		it('works without cache', () => {
			const e1 = createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 10, 10, 10);

			const results = hitTestAll(world, 8, 8, undefined);

			expect(results).toHaveLength(2);
			expect(results[0]).toBe(e2);
			expect(results[1]).toBe(e1);
		});
	});

	describe('hitTestDetailed', () => {
		it('returns detailed results with z-index', () => {
			const e1 = createClickableEntity(0, 0, 20, 20, 5);
			const e2 = createClickableEntity(5, 5, 10, 10, 15);
			const cache = createClickableCache();

			const results = hitTestDetailed(world, 8, 8, cache);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({ entity: e2, zIndex: 15 });
			expect(results[1]).toEqual({ entity: e1, zIndex: 5 });
		});
	});

	describe('hasClickableAt', () => {
		it('returns true if clickable entity at point', () => {
			createClickableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			expect(hasClickableAt(world, 5, 5, cache)).toBe(true);
			expect(hasClickableAt(world, 50, 50, cache)).toBe(false);
		});
	});

	describe('hasHoverableAt', () => {
		it('returns true if hoverable entity at point', () => {
			createHoverableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			expect(hasHoverableAt(world, 5, 5, cache)).toBe(true);
			expect(hasHoverableAt(world, 50, 50, cache)).toBe(false);
		});
	});

	describe('getClickableAt', () => {
		it('returns topmost clickable at point', () => {
			createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 10, 10, 10);
			const cache = createClickableCache();

			const result = getClickableAt(world, 8, 8, cache);

			expect(result).toBe(e2);
		});
	});

	describe('getHoverableAt', () => {
		it('returns topmost hoverable at point', () => {
			createHoverableEntity(0, 0, 20, 20, 0);
			const e2 = createHoverableEntity(5, 5, 10, 10, 10);
			const cache = createClickableCache();

			const result = getHoverableAt(world, 8, 8, cache);

			expect(result).toBe(e2);
		});
	});

	describe('getAllClickablesAt', () => {
		it('returns all clickables at point', () => {
			const e1 = createClickableEntity(0, 0, 20, 20, 0);
			const e2 = createClickableEntity(5, 5, 10, 10, 10);
			createHoverableEntity(8, 8, 5, 5, 20); // Not clickable
			const cache = createClickableCache();

			const results = getAllClickablesAt(world, 9, 9, cache);

			expect(results).toHaveLength(2);
			expect(results).toContain(e1);
			expect(results).toContain(e2);
		});
	});

	describe('getAllHoverablesAt', () => {
		it('returns all hoverables at point', () => {
			const e1 = createHoverableEntity(0, 0, 20, 20, 0);
			const e2 = createHoverableEntity(5, 5, 10, 10, 10);
			createClickableEntity(8, 8, 5, 5, 20); // Not hoverable (clickable only)
			const cache = createClickableCache();

			const results = getAllHoverablesAt(world, 9, 9, cache);

			expect(results).toHaveLength(2);
			expect(results).toContain(e1);
			expect(results).toContain(e2);
		});
	});

	describe('z-order priority', () => {
		it('higher z-index always wins in hit test', () => {
			// Background at z=0
			const background = createClickableEntity(0, 0, 100, 100, 0);
			// Dialog at z=100
			const dialog = createClickableEntity(25, 25, 50, 50, 100);
			// Button in dialog at z=101
			const button = createClickableEntity(40, 40, 20, 20, 101);
			const cache = createClickableCache();

			// Click on button area
			expect(hitTest(world, 45, 45, cache)).toBe(button);

			// Click on dialog but not button
			expect(hitTest(world, 30, 30, cache)).toBe(dialog);

			// Click on background
			expect(hitTest(world, 5, 5, cache)).toBe(background);
		});

		it('handles negative z-indices', () => {
			const background = createClickableEntity(0, 0, 100, 100, -100);
			const content = createClickableEntity(0, 0, 100, 100, 0);
			const overlay = createClickableEntity(0, 0, 100, 100, 100);
			const cache = createClickableCache();

			const results = hitTestAll(world, 50, 50, cache);

			expect(results[0]).toBe(overlay); // z=100
			expect(results[1]).toBe(content); // z=0
			expect(results[2]).toBe(background); // z=-100
		});
	});

	describe('edge cases', () => {
		it('handles empty world', () => {
			const cache = createClickableCache();

			expect(hitTest(world, 0, 0, cache)).toBeNull();
			expect(hitTestAll(world, 0, 0, cache)).toEqual([]);
		});

		it('handles entity with invalid position cache', () => {
			const eid = addEntity(world);
			setInteractive(world, eid, { clickable: true });
			// No position cache set - test with useCachedPositions: false
			// to use computedPosition which also returns false for no position
			const cache = createClickableCache();

			// Use a point that won't match any possible default position
			// Entity has no proper position component data, so it won't match
			const result = hitTest(world, 50000, 50000, cache, { useCachedPositions: false });
			expect(result).toBeNull();
		});

		it('handles point at entity boundary', () => {
			// Entity at (0,0) with size 10x10 covers 0-9 inclusive
			createClickableEntity(0, 0, 10, 10);
			const cache = createClickableCache();

			// Inside
			expect(hitTest(world, 0, 0, cache)).not.toBeNull();
			expect(hitTest(world, 9, 9, cache)).not.toBeNull();

			// Outside (exclusive boundary)
			expect(hitTest(world, 10, 5, cache)).toBeNull();
			expect(hitTest(world, 5, 10, cache)).toBeNull();
		});
	});
});
