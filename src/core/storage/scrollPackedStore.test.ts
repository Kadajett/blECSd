/**
 * Tests for scrollPackedStore.
 * @module core/storage/scrollPackedStore.test
 */

import { describe, expect, it } from 'vitest';
import {
	createScrollStore,
	forEachScrollEntity,
	getScrollPosition,
	getScrollStoreSize,
	hasScrollEntity,
	removeScrollEntity,
	setScrollPosition,
} from './scrollPackedStore';

describe('scrollPackedStore', () => {
	describe('createScrollStore', () => {
		it('creates an empty scroll store', () => {
			const store = createScrollStore();
			expect(getScrollStoreSize(store)).toBe(0);
		});

		it('accepts initial capacity hint', () => {
			const store = createScrollStore(128);
			expect(store.store.capacity).toBeGreaterThanOrEqual(128);
		});
	});

	describe('setScrollPosition', () => {
		it('adds new scroll position', () => {
			const store = createScrollStore();
			const result = setScrollPosition(store, 1, 10, 20);

			expect(result).toBe(true);
			expect(getScrollStoreSize(store)).toBe(1);
		});

		it('updates existing scroll position', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 1, 30, 40);

			const data = getScrollPosition(store, 1);
			expect(data).toEqual({ entityId: 1, scrollX: 30, scrollY: 40 });
			expect(getScrollStoreSize(store)).toBe(1); // Size should remain 1
		});

		it('handles multiple entities', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 2, 30, 40);
			setScrollPosition(store, 3, 50, 60);

			expect(getScrollStoreSize(store)).toBe(3);
			expect(getScrollPosition(store, 1)).toEqual({ entityId: 1, scrollX: 10, scrollY: 20 });
			expect(getScrollPosition(store, 2)).toEqual({ entityId: 2, scrollX: 30, scrollY: 40 });
			expect(getScrollPosition(store, 3)).toEqual({ entityId: 3, scrollX: 50, scrollY: 60 });
		});

		it('handles zero scroll values', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 0, 0);

			const data = getScrollPosition(store, 1);
			expect(data).toEqual({ entityId: 1, scrollX: 0, scrollY: 0 });
		});

		it('handles negative scroll values', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, -10, -20);

			const data = getScrollPosition(store, 1);
			expect(data).toEqual({ entityId: 1, scrollX: -10, scrollY: -20 });
		});

		it('handles large scroll values', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 999999, 888888);

			const data = getScrollPosition(store, 1);
			expect(data).toEqual({ entityId: 1, scrollX: 999999, scrollY: 888888 });
		});
	});

	describe('getScrollPosition', () => {
		it('returns undefined for non-existent entity', () => {
			const store = createScrollStore();
			const data = getScrollPosition(store, 999);

			expect(data).toBeUndefined();
		});

		it('returns scroll data for existing entity', () => {
			const store = createScrollStore();
			setScrollPosition(store, 42, 100, 200);

			const data = getScrollPosition(store, 42);
			expect(data).toEqual({ entityId: 42, scrollX: 100, scrollY: 200 });
		});

		it('cleans up invalid handles', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);

			// Force handle to become invalid by removing from underlying store
			const handle = store.entityToHandle.get(1);
			if (handle) {
				// Remove from store but not from map
				store.store.dataIndex[handle.index] = -1;
			}

			const data = getScrollPosition(store, 1);
			expect(data).toBeUndefined();
			expect(store.entityToHandle.has(1)).toBe(false); // Should clean up map entry
		});
	});

	describe('removeScrollEntity', () => {
		it('removes existing entity', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);

			const removed = removeScrollEntity(store, 1);
			expect(removed).toBe(true);
			expect(getScrollStoreSize(store)).toBe(0);
			expect(getScrollPosition(store, 1)).toBeUndefined();
		});

		it('returns false for non-existent entity', () => {
			const store = createScrollStore();
			const removed = removeScrollEntity(store, 999);

			expect(removed).toBe(false);
		});

		it('cleans up map entry', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);

			removeScrollEntity(store, 1);
			expect(store.entityToHandle.has(1)).toBe(false);
		});

		it('handles swap-and-pop correctly', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 2, 30, 40);
			setScrollPosition(store, 3, 50, 60);

			// Remove middle entity
			removeScrollEntity(store, 2);

			// Other entities should still be accessible
			expect(getScrollPosition(store, 1)).toEqual({ entityId: 1, scrollX: 10, scrollY: 20 });
			expect(getScrollPosition(store, 3)).toEqual({ entityId: 3, scrollX: 50, scrollY: 60 });
			expect(getScrollStoreSize(store)).toBe(2);
		});
	});

	describe('forEachScrollEntity', () => {
		it('iterates over all entities', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 2, 30, 40);
			setScrollPosition(store, 3, 50, 60);

			const seen: number[] = [];
			forEachScrollEntity(store, (data) => {
				seen.push(data.entityId);
			});

			expect(seen).toHaveLength(3);
			expect(seen).toContain(1);
			expect(seen).toContain(2);
			expect(seen).toContain(3);
		});

		it('handles empty store', () => {
			const store = createScrollStore();
			let count = 0;

			forEachScrollEntity(store, () => {
				count++;
			});

			expect(count).toBe(0);
		});

		it('provides correct data in callback', () => {
			const store = createScrollStore();
			setScrollPosition(store, 5, 123, 456);

			forEachScrollEntity(store, (data) => {
				expect(data.entityId).toBe(5);
				expect(data.scrollX).toBe(123);
				expect(data.scrollY).toBe(456);
			});
		});

		it('iteration is cache-friendly (dense array order)', () => {
			const store = createScrollStore();

			// Add entities
			for (let i = 0; i < 100; i++) {
				setScrollPosition(store, i, i * 10, i * 20);
			}

			// Remove some entities
			for (let i = 10; i < 20; i++) {
				removeScrollEntity(store, i);
			}

			// Iteration should still be efficient (no gaps in iteration)
			let count = 0;
			forEachScrollEntity(store, () => {
				count++;
			});

			expect(count).toBe(90); // 100 - 10 removed
		});
	});

	describe('hasScrollEntity', () => {
		it('returns true for existing entity', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);

			expect(hasScrollEntity(store, 1)).toBe(true);
		});

		it('returns false for non-existent entity', () => {
			const store = createScrollStore();
			expect(hasScrollEntity(store, 999)).toBe(false);
		});

		it('returns false after removal', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			removeScrollEntity(store, 1);

			expect(hasScrollEntity(store, 1)).toBe(false);
		});

		it('validates handle generation', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);

			// Force handle to become invalid by bumping generation
			const handle = store.entityToHandle.get(1);
			if (handle) {
				store.store.generations[handle.index] = handle.gen + 1;
			}

			expect(hasScrollEntity(store, 1)).toBe(false);
		});
	});

	describe('getScrollStoreSize', () => {
		it('returns 0 for empty store', () => {
			const store = createScrollStore();
			expect(getScrollStoreSize(store)).toBe(0);
		});

		it('returns correct size after additions', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 2, 30, 40);

			expect(getScrollStoreSize(store)).toBe(2);
		});

		it('returns correct size after removals', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 2, 30, 40);
			setScrollPosition(store, 3, 50, 60);

			removeScrollEntity(store, 2);

			expect(getScrollStoreSize(store)).toBe(2);
		});

		it('does not count updates as new entries', () => {
			const store = createScrollStore();
			setScrollPosition(store, 1, 10, 20);
			setScrollPosition(store, 1, 30, 40);
			setScrollPosition(store, 1, 50, 60);

			expect(getScrollStoreSize(store)).toBe(1);
		});
	});

	describe('stress test', () => {
		it('handles many entities efficiently', () => {
			const store = createScrollStore();
			const entityCount = 1000;

			// Add many entities
			for (let i = 0; i < entityCount; i++) {
				setScrollPosition(store, i, i * 10, i * 20);
			}

			expect(getScrollStoreSize(store)).toBe(entityCount);

			// Random access
			for (let i = 0; i < 100; i++) {
				const entityId = Math.floor(Math.random() * entityCount);
				const data = getScrollPosition(store, entityId);
				expect(data).toEqual({ entityId, scrollX: entityId * 10, scrollY: entityId * 20 });
			}

			// Remove half
			for (let i = 0; i < entityCount; i += 2) {
				removeScrollEntity(store, i);
			}

			expect(getScrollStoreSize(store)).toBe(entityCount / 2);

			// Verify remaining entities
			for (let i = 1; i < entityCount; i += 2) {
				const data = getScrollPosition(store, i);
				expect(data).toEqual({ entityId: i, scrollX: i * 10, scrollY: i * 20 });
			}
		});

		it('handles rapid updates', () => {
			const store = createScrollStore();
			const entityId = 42;

			// Rapid updates to same entity
			for (let i = 0; i < 1000; i++) {
				setScrollPosition(store, entityId, i, i * 2);
			}

			// Should only have one entry
			expect(getScrollStoreSize(store)).toBe(1);

			// Should have final value
			const data = getScrollPosition(store, entityId);
			expect(data).toEqual({ entityId, scrollX: 999, scrollY: 1998 });
		});
	});
});
