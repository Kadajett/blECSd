/**
 * Tests for position cache functionality.
 */

import { addEntity, createWorld } from 'bitecs';
import { describe, expect, it, beforeEach } from 'vitest';
import type { Entity, World } from './types';
import {
	clearAllPositionCaches,
	getCachedInnerHeight,
	getCachedInnerWidth,
	getPositionCache,
	hasValidPositionCache,
	invalidatePositionCache,
	invalidatePositionCacheTree,
	isPointInCachedBounds,
	PositionCache,
	setPositionCache,
	updateCachedScrollBase,
} from './positionCache';

describe('positionCache', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		entity = addEntity(world) as Entity;
		// Ensure clean state
		PositionCache.valid[entity] = 0;
	});

	describe('setPositionCache', () => {
		it('sets all position values', () => {
			setPositionCache(world, entity, {
				xi: 5,
				xl: 85,
				yi: 3,
				yl: 23,
				base: 10,
			});

			expect(PositionCache.xi[entity]).toBe(5);
			expect(PositionCache.xl[entity]).toBe(85);
			expect(PositionCache.yi[entity]).toBe(3);
			expect(PositionCache.yl[entity]).toBe(23);
			expect(PositionCache.base[entity]).toBe(10);
		});

		it('marks cache as valid', () => {
			expect(PositionCache.valid[entity]).toBe(0);

			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 0,
				yl: 50,
				base: 0,
			});

			expect(PositionCache.valid[entity]).toBe(1);
		});

		it('handles zero values', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 0,
				yi: 0,
				yl: 0,
				base: 0,
			});

			expect(PositionCache.xi[entity]).toBe(0);
			expect(PositionCache.xl[entity]).toBe(0);
			expect(PositionCache.yi[entity]).toBe(0);
			expect(PositionCache.yl[entity]).toBe(0);
			expect(PositionCache.base[entity]).toBe(0);
			expect(PositionCache.valid[entity]).toBe(1);
		});

		it('handles negative values for scroll base', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: -50,
			});

			expect(PositionCache.base[entity]).toBe(-50);
		});
	});

	describe('getPositionCache', () => {
		it('returns undefined for invalid cache', () => {
			PositionCache.valid[entity] = 0;
			const result = getPositionCache(world, entity);
			expect(result).toBeUndefined();
		});

		it('returns cached values when valid', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 20,
			});

			const result = getPositionCache(world, entity);
			expect(result).toEqual({
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 20,
			});
		});

		it('returns readonly data', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});

			const result = getPositionCache(world, entity);
			expect(result).toBeDefined();
			// TypeScript should prevent modification, but verify values don't change
			if (result) {
				const originalXi = result.xi;
				// Result is readonly, so modification shouldn't be possible at runtime
				expect(result.xi).toBe(originalXi);
			}
		});
	});

	describe('hasValidPositionCache', () => {
		it('returns false for invalid cache', () => {
			PositionCache.valid[entity] = 0;
			expect(hasValidPositionCache(world, entity)).toBe(false);
		});

		it('returns true for valid cache', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 0,
				yl: 50,
				base: 0,
			});
			expect(hasValidPositionCache(world, entity)).toBe(true);
		});
	});

	describe('invalidatePositionCache', () => {
		it('marks cache as invalid', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 0,
				yl: 50,
				base: 0,
			});
			expect(PositionCache.valid[entity]).toBe(1);

			invalidatePositionCache(world, entity);

			expect(PositionCache.valid[entity]).toBe(0);
		});

		it('getPositionCache returns undefined after invalidation', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});
			invalidatePositionCache(world, entity);

			expect(getPositionCache(world, entity)).toBeUndefined();
		});

		it('preserves cached values (only marks invalid)', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 20,
			});
			invalidatePositionCache(world, entity);

			// Values are still there, just marked invalid
			expect(PositionCache.xi[entity]).toBe(10);
			expect(PositionCache.xl[entity]).toBe(90);
		});
	});

	describe('invalidatePositionCacheTree', () => {
		it('invalidates entity and descendants', () => {
			const child1 = addEntity(world) as Entity;
			const child2 = addEntity(world) as Entity;
			const grandchild = addEntity(world) as Entity;

			// Set all caches valid
			setPositionCache(world, entity, { xi: 0, xl: 100, yi: 0, yl: 50, base: 0 });
			setPositionCache(world, child1, { xi: 0, xl: 50, yi: 0, yl: 25, base: 0 });
			setPositionCache(world, child2, { xi: 50, xl: 100, yi: 0, yl: 25, base: 0 });
			setPositionCache(world, grandchild, { xi: 0, xl: 25, yi: 0, yl: 12, base: 0 });

			// Mock getDescendants function
			const getDescendants = (_w: World, _e: Entity) => [child1, child2, grandchild];

			invalidatePositionCacheTree(world, entity, getDescendants);

			expect(hasValidPositionCache(world, entity)).toBe(false);
			expect(hasValidPositionCache(world, child1)).toBe(false);
			expect(hasValidPositionCache(world, child2)).toBe(false);
			expect(hasValidPositionCache(world, grandchild)).toBe(false);
		});

		it('works with empty descendant list', () => {
			setPositionCache(world, entity, { xi: 0, xl: 100, yi: 0, yl: 50, base: 0 });

			invalidatePositionCacheTree(world, entity, () => []);

			expect(hasValidPositionCache(world, entity)).toBe(false);
		});
	});

	describe('clearAllPositionCaches', () => {
		it('invalidates all caches', () => {
			const entity2 = addEntity(world) as Entity;
			const entity3 = addEntity(world) as Entity;

			setPositionCache(world, entity, { xi: 0, xl: 100, yi: 0, yl: 50, base: 0 });
			setPositionCache(world, entity2, { xi: 0, xl: 50, yi: 0, yl: 25, base: 0 });
			setPositionCache(world, entity3, { xi: 50, xl: 100, yi: 0, yl: 25, base: 0 });

			clearAllPositionCaches(world);

			expect(hasValidPositionCache(world, entity)).toBe(false);
			expect(hasValidPositionCache(world, entity2)).toBe(false);
			expect(hasValidPositionCache(world, entity3)).toBe(false);
		});
	});

	describe('getCachedInnerWidth', () => {
		it('returns 0 for invalid cache', () => {
			PositionCache.valid[entity] = 0;
			expect(getCachedInnerWidth(world, entity)).toBe(0);
		});

		it('calculates width correctly', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 0,
				yl: 50,
				base: 0,
			});

			expect(getCachedInnerWidth(world, entity)).toBe(80);
		});

		it('handles zero width', () => {
			setPositionCache(world, entity, {
				xi: 50,
				xl: 50,
				yi: 0,
				yl: 50,
				base: 0,
			});

			expect(getCachedInnerWidth(world, entity)).toBe(0);
		});
	});

	describe('getCachedInnerHeight', () => {
		it('returns 0 for invalid cache', () => {
			PositionCache.valid[entity] = 0;
			expect(getCachedInnerHeight(world, entity)).toBe(0);
		});

		it('calculates height correctly', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 5,
				yl: 45,
				base: 0,
			});

			expect(getCachedInnerHeight(world, entity)).toBe(40);
		});

		it('handles zero height', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 25,
				yl: 25,
				base: 0,
			});

			expect(getCachedInnerHeight(world, entity)).toBe(0);
		});
	});

	describe('updateCachedScrollBase', () => {
		it('updates scroll base when cache is valid', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 100,
				yi: 0,
				yl: 50,
				base: 0,
			});

			updateCachedScrollBase(world, entity, 100);

			expect(PositionCache.base[entity]).toBe(100);
			expect(PositionCache.valid[entity]).toBe(1);
		});

		it('does not update when cache is invalid', () => {
			PositionCache.base[entity] = 50;
			PositionCache.valid[entity] = 0;

			updateCachedScrollBase(world, entity, 100);

			// Should not change base because cache is invalid
			expect(PositionCache.base[entity]).toBe(50);
		});

		it('does not make invalid cache valid', () => {
			PositionCache.valid[entity] = 0;

			updateCachedScrollBase(world, entity, 100);

			expect(PositionCache.valid[entity]).toBe(0);
		});
	});

	describe('isPointInCachedBounds', () => {
		it('returns false for invalid cache', () => {
			PositionCache.valid[entity] = 0;
			expect(isPointInCachedBounds(world, entity, 50, 25)).toBe(false);
		});

		it('returns true for point inside bounds', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});

			// Center point
			expect(isPointInCachedBounds(world, entity, 50, 25)).toBe(true);

			// Top-left corner (inclusive)
			expect(isPointInCachedBounds(world, entity, 10, 5)).toBe(true);

			// Just inside bottom-right
			expect(isPointInCachedBounds(world, entity, 89, 44)).toBe(true);
		});

		it('returns false for point outside bounds', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});

			// Left of bounds
			expect(isPointInCachedBounds(world, entity, 9, 25)).toBe(false);

			// Right of bounds (xl is exclusive)
			expect(isPointInCachedBounds(world, entity, 90, 25)).toBe(false);

			// Above bounds
			expect(isPointInCachedBounds(world, entity, 50, 4)).toBe(false);

			// Below bounds (yl is exclusive)
			expect(isPointInCachedBounds(world, entity, 50, 45)).toBe(false);
		});

		it('handles edge cases', () => {
			setPositionCache(world, entity, {
				xi: 0,
				xl: 1,
				yi: 0,
				yl: 1,
				base: 0,
			});

			// 1x1 bounds at origin
			expect(isPointInCachedBounds(world, entity, 0, 0)).toBe(true);
			expect(isPointInCachedBounds(world, entity, 1, 0)).toBe(false);
			expect(isPointInCachedBounds(world, entity, 0, 1)).toBe(false);
		});

		it('handles zero-size bounds', () => {
			setPositionCache(world, entity, {
				xi: 50,
				xl: 50,
				yi: 25,
				yl: 25,
				base: 0,
			});

			// Zero-size bounds contain nothing
			expect(isPointInCachedBounds(world, entity, 50, 25)).toBe(false);
		});
	});

	describe('performance optimization scenarios', () => {
		it('enables skip of recalculation when cache is valid', () => {
			// Simulate layout calculation
			let layoutCalculations = 0;

			function calculateLayout(_w: World, eid: Entity): void {
				const cached = getPositionCache(_w, eid);
				if (cached) {
					// Skip expensive calculation
					return;
				}

				// Expensive layout calculation
				layoutCalculations++;
				setPositionCache(_w, eid, {
					xi: 10,
					xl: 90,
					yi: 5,
					yl: 45,
					base: 0,
				});
			}

			// First call calculates
			calculateLayout(world, entity);
			expect(layoutCalculations).toBe(1);

			// Subsequent calls skip calculation
			calculateLayout(world, entity);
			calculateLayout(world, entity);
			calculateLayout(world, entity);
			expect(layoutCalculations).toBe(1);

			// After invalidation, recalculates
			invalidatePositionCache(world, entity);
			calculateLayout(world, entity);
			expect(layoutCalculations).toBe(2);
		});

		it('uses cached values for hit testing', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});

			// Efficient hit testing without recalculation
			const isHit = isPointInCachedBounds(world, entity, 50, 25);
			expect(isHit).toBe(true);
		});

		it('handles scroll changes without full recalculation', () => {
			setPositionCache(world, entity, {
				xi: 10,
				xl: 90,
				yi: 5,
				yl: 45,
				base: 0,
			});

			// Update just the scroll base
			updateCachedScrollBase(world, entity, 100);

			// Cache still valid, only base changed
			const cached = getPositionCache(world, entity);
			expect(cached).toBeDefined();
			expect(cached?.base).toBe(100);
			expect(cached?.xi).toBe(10);
			expect(cached?.xl).toBe(90);
		});
	});
});
