import { describe, expect, it } from 'vitest';
import type { Entity } from '../core/types';
import { createSpatialHash, insertEntity } from './spatialHash';
import {
	clearPositionCache,
	createPositionCache,
	performCulling,
	queryVisibleEntities,
	removeFromCache,
	updateEntityIfMoved,
} from './visibilityCulling';

describe('VisibilityCulling', () => {
	describe('PositionCache', () => {
		it('creates an empty cache', () => {
			const cache = createPositionCache();
			expect(cache.prevX.size).toBe(0);
		});

		it('detects entity movement', () => {
			const grid = createSpatialHash({ cellSize: 8 });
			const cache = createPositionCache();
			const eid = 1 as Entity;

			// First insert - always updates
			const updated1 = updateEntityIfMoved(grid, cache, eid, 10, 20, 4, 4);
			expect(updated1).toBe(true);

			// Same position - no update
			const updated2 = updateEntityIfMoved(grid, cache, eid, 10, 20, 4, 4);
			expect(updated2).toBe(false);

			// Moved - updates
			const updated3 = updateEntityIfMoved(grid, cache, eid, 15, 20, 4, 4);
			expect(updated3).toBe(true);
		});

		it('removes entity from cache', () => {
			const grid = createSpatialHash({ cellSize: 8 });
			const cache = createPositionCache();
			const eid = 1 as Entity;

			updateEntityIfMoved(grid, cache, eid, 10, 20, 4, 4);
			removeFromCache(cache, eid);

			// After removal, inserting same position counts as new
			const updated = updateEntityIfMoved(grid, cache, eid, 10, 20, 4, 4);
			expect(updated).toBe(true);
		});

		it('clears entire cache', () => {
			const grid = createSpatialHash({ cellSize: 8 });
			const cache = createPositionCache();

			updateEntityIfMoved(grid, cache, 1 as Entity, 10, 20, 4, 4);
			updateEntityIfMoved(grid, cache, 2 as Entity, 30, 40, 4, 4);

			clearPositionCache(cache);
			expect(cache.prevX.size).toBe(0);
		});
	});

	describe('queryVisibleEntities', () => {
		it('returns entities in viewport', () => {
			const grid = createSpatialHash({ cellSize: 8 });

			insertEntity(grid, 1 as Entity, 10, 10, 4, 4);
			insertEntity(grid, 2 as Entity, 50, 50, 4, 4);
			insertEntity(grid, 3 as Entity, 200, 200, 4, 4);

			const visible = queryVisibleEntities(grid, {
				x: 0,
				y: 0,
				width: 80,
				height: 24,
			});

			expect(visible.has(1)).toBe(true);
			expect(visible.has(3)).toBe(false);
		});

		it('returns empty set for empty viewport', () => {
			const grid = createSpatialHash({ cellSize: 8 });

			insertEntity(grid, 1 as Entity, 100, 100, 4, 4);

			const visible = queryVisibleEntities(grid, {
				x: 0,
				y: 0,
				width: 10,
				height: 10,
			});

			expect(visible.size).toBe(0);
		});
	});

	describe('performCulling', () => {
		it('returns categorized result', () => {
			const grid = createSpatialHash({ cellSize: 8 });

			insertEntity(grid, 1 as Entity, 5, 5, 2, 2);
			insertEntity(grid, 2 as Entity, 100, 100, 2, 2);

			const result = performCulling(grid, { x: 0, y: 0, width: 80, height: 24 }, 2);

			expect(result.visible.length).toBe(1);
			expect(result.culled).toBe(1);
			expect(result.total).toBe(2);
		});
	});
});
