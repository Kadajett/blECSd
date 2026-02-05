import { describe, expect, it } from 'vitest';
import {
	addToStore,
	clearStore,
	createPackedStore,
	forEachInStore,
	getFromStore,
	getStoreCapacity,
	getStoreData,
	getStoreSize,
	isValidHandle,
	mapStore,
	type PackedHandle,
	removeFromStore,
	setInStore,
} from './packedStore';

describe('PackedStore', () => {
	describe('createPackedStore', () => {
		it('creates an empty store with default capacity', () => {
			const store = createPackedStore<number>();
			expect(getStoreSize(store)).toBe(0);
			expect(getStoreCapacity(store)).toBeGreaterThan(0);
		});

		it('creates a store with specified initial capacity', () => {
			const store = createPackedStore<number>(128);
			expect(getStoreSize(store)).toBe(0);
			expect(getStoreCapacity(store)).toBe(128);
		});
	});

	describe('addToStore', () => {
		it('adds elements and returns stable handles', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'a');
			const h2 = addToStore(store, 'b');
			const h3 = addToStore(store, 'c');

			expect(getStoreSize(store)).toBe(3);
			expect(h1.index).toBe(0);
			expect(h2.index).toBe(1);
			expect(h3.index).toBe(2);
			expect(h1.gen).toBe(0);
		});

		it('reuses freed slots', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'a');
			const h2 = addToStore(store, 'b');
			addToStore(store, 'c');

			// Remove middle element
			removeFromStore(store, h2);
			expect(getStoreSize(store)).toBe(2);

			// Add new element - should reuse freed slot
			const h4 = addToStore(store, 'd');
			expect(getStoreSize(store)).toBe(3);

			// The slot index should be reused but with bumped generation
			expect(h4.index).toBe(h2.index);
			expect(h4.gen).toBe(h2.gen + 1);

			// Old handle should be invalid, new one valid
			expect(isValidHandle(store, h2)).toBe(false);
			expect(isValidHandle(store, h4)).toBe(true);
			expect(isValidHandle(store, h1)).toBe(true);
		});

		it('grows capacity when needed', () => {
			const store = createPackedStore<number>(4);
			expect(getStoreCapacity(store)).toBe(4);

			for (let i = 0; i < 10; i++) {
				addToStore(store, i);
			}

			expect(getStoreSize(store)).toBe(10);
			expect(getStoreCapacity(store)).toBeGreaterThanOrEqual(10);
		});
	});

	describe('getFromStore', () => {
		it('retrieves values by handle', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'hello');
			const h2 = addToStore(store, 'world');

			expect(getFromStore(store, h1)).toBe('hello');
			expect(getFromStore(store, h2)).toBe('world');
		});

		it('returns undefined for invalid handles', () => {
			const store = createPackedStore<string>();
			const handle = addToStore(store, 'test');
			removeFromStore(store, handle);

			expect(getFromStore(store, handle)).toBeUndefined();
		});

		it('returns undefined for out-of-bounds handles', () => {
			const store = createPackedStore<string>();
			expect(getFromStore(store, { index: 999, gen: 0 })).toBeUndefined();
			expect(getFromStore(store, { index: -1, gen: 0 })).toBeUndefined();
		});
	});

	describe('setInStore', () => {
		it('updates values in place', () => {
			const store = createPackedStore<number>();
			const handle = addToStore(store, 10);

			expect(setInStore(store, handle, 20)).toBe(true);
			expect(getFromStore(store, handle)).toBe(20);
		});

		it('returns false for invalid handles', () => {
			const store = createPackedStore<number>();
			const handle = addToStore(store, 10);
			removeFromStore(store, handle);

			expect(setInStore(store, handle, 20)).toBe(false);
		});
	});

	describe('removeFromStore', () => {
		it('removes elements and invalidates handles', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'a');
			const h2 = addToStore(store, 'b');
			const h3 = addToStore(store, 'c');

			expect(removeFromStore(store, h2)).toBe(true);
			expect(getStoreSize(store)).toBe(2);
			expect(isValidHandle(store, h2)).toBe(false);
			expect(isValidHandle(store, h1)).toBe(true);
			expect(isValidHandle(store, h3)).toBe(true);
		});

		it('maintains data integrity after swap-and-pop', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'a');
			const h2 = addToStore(store, 'b');
			const h3 = addToStore(store, 'c');

			// Remove first element - c should swap into position 0
			removeFromStore(store, h1);

			// h1 is invalid, h2 and h3 still work
			expect(isValidHandle(store, h1)).toBe(false);
			expect(getFromStore(store, h2)).toBe('b');
			expect(getFromStore(store, h3)).toBe('c');

			// Dense data should now be ['c', 'b'] (c swapped to front)
			const data = getStoreData(store);
			expect(data.slice(0, store.size)).toEqual(['c', 'b']);
		});

		it('returns false for already-removed handles', () => {
			const store = createPackedStore<string>();
			const handle = addToStore(store, 'test');

			expect(removeFromStore(store, handle)).toBe(true);
			expect(removeFromStore(store, handle)).toBe(false);
		});

		it('handles removing the last element', () => {
			const store = createPackedStore<string>();
			const h1 = addToStore(store, 'a');
			const h2 = addToStore(store, 'b');

			// Remove last element - no swap needed
			removeFromStore(store, h2);

			expect(getStoreSize(store)).toBe(1);
			expect(getFromStore(store, h1)).toBe('a');
		});
	});

	describe('isValidHandle', () => {
		it('validates live handles', () => {
			const store = createPackedStore<string>();
			const handle = addToStore(store, 'test');

			expect(isValidHandle(store, handle)).toBe(true);
		});

		it('rejects handles with wrong generation', () => {
			const store = createPackedStore<string>();
			const handle = addToStore(store, 'test');
			removeFromStore(store, handle);

			// Old handle has wrong generation now
			expect(isValidHandle(store, handle)).toBe(false);
		});

		it('rejects out-of-bounds handles', () => {
			const store = createPackedStore<string>();

			expect(isValidHandle(store, { index: -1, gen: 0 })).toBe(false);
			expect(isValidHandle(store, { index: 1000, gen: 0 })).toBe(false);
		});
	});

	describe('clearStore', () => {
		it('removes all elements', () => {
			const store = createPackedStore<number>();
			const handles: PackedHandle[] = [];

			for (let i = 0; i < 10; i++) {
				handles.push(addToStore(store, i));
			}

			clearStore(store);

			expect(getStoreSize(store)).toBe(0);

			// All old handles should be invalid
			for (const handle of handles) {
				expect(isValidHandle(store, handle)).toBe(false);
			}
		});
	});

	describe('forEachInStore', () => {
		it('iterates over all elements', () => {
			const store = createPackedStore<number>();
			addToStore(store, 1);
			addToStore(store, 2);
			addToStore(store, 3);

			const values: number[] = [];
			forEachInStore(store, (value) => {
				values.push(value);
			});

			expect(values.sort()).toEqual([1, 2, 3]);
		});

		it('provides valid handles during iteration', () => {
			const store = createPackedStore<string>();
			addToStore(store, 'a');
			addToStore(store, 'b');

			forEachInStore(store, (value, handle) => {
				expect(isValidHandle(store, handle)).toBe(true);
				expect(getFromStore(store, handle)).toBe(value);
			});
		});
	});

	describe('mapStore', () => {
		it('transforms all elements', () => {
			const store = createPackedStore<number>();
			addToStore(store, 1);
			addToStore(store, 2);
			addToStore(store, 3);

			const doubled = mapStore(store, (v) => v * 2);
			expect(doubled.sort()).toEqual([2, 4, 6]);
		});
	});

	describe('getStoreData', () => {
		it('returns dense data array for direct iteration', () => {
			const store = createPackedStore<number>();
			addToStore(store, 10);
			addToStore(store, 20);
			addToStore(store, 30);

			const data = getStoreData(store);
			expect(data.slice(0, store.size)).toEqual([10, 20, 30]);
		});
	});

	describe('complex scenarios', () => {
		function addElementsToStore(
			store: ReturnType<typeof createPackedStore<number>>,
			count: number,
			startValue: number,
		): PackedHandle[] {
			const handles: PackedHandle[] = [];
			for (let i = 0; i < count; i++) {
				handles.push(addToStore(store, startValue + i));
			}
			return handles;
		}

		function removeEveryOtherElement(
			store: ReturnType<typeof createPackedStore<number>>,
			handles: PackedHandle[],
		): void {
			for (let i = 0; i < handles.length; i += 2) {
				const handle = handles[i];
				if (handle) {
					removeFromStore(store, handle);
				}
			}
		}

		function verifyOddHandlesValid(
			store: ReturnType<typeof createPackedStore<number>>,
			handles: PackedHandle[],
		): void {
			for (let i = 1; i < handles.length; i += 2) {
				const handle = handles[i];
				if (handle) {
					expect(isValidHandle(store, handle)).toBe(true);
					expect(getFromStore(store, handle)).toBe(i);
				}
			}
		}

		it('handles interleaved add/remove operations', () => {
			const store = createPackedStore<number>();

			const handles = addElementsToStore(store, 10, 0);
			removeEveryOtherElement(store, handles);

			expect(getStoreSize(store)).toBe(5);
			verifyOddHandlesValid(store, handles);

			addElementsToStore(store, 5, 100);
			expect(getStoreSize(store)).toBe(10);
		});

		function performRandomAdd(
			store: ReturnType<typeof createPackedStore<number>>,
			liveHandles: Set<PackedHandle>,
			value: number,
		): void {
			const handle = addToStore(store, value);
			liveHandles.add(handle);
		}

		function performRandomRemove(
			store: ReturnType<typeof createPackedStore<number>>,
			liveHandles: Set<PackedHandle>,
		): void {
			const handles = Array.from(liveHandles);
			const idx = Math.floor(Math.random() * handles.length);
			const handle = handles[idx];
			if (handle) {
				removeFromStore(store, handle);
				liveHandles.delete(handle);
			}
		}

		function verifyStoreConsistency(
			store: ReturnType<typeof createPackedStore<number>>,
			liveHandles: Set<PackedHandle>,
		): void {
			expect(getStoreSize(store)).toBe(liveHandles.size);
			for (const handle of liveHandles) {
				expect(isValidHandle(store, handle)).toBe(true);
			}
		}

		it('maintains consistency under stress', () => {
			const store = createPackedStore<number>(8);
			const liveHandles = new Set<PackedHandle>();

			for (let op = 0; op < 1000; op++) {
				const shouldAdd = Math.random() < 0.6 || liveHandles.size === 0;
				if (shouldAdd) {
					performRandomAdd(store, liveHandles, op);
				} else {
					performRandomRemove(store, liveHandles);
				}
				verifyStoreConsistency(store, liveHandles);
			}
		});
	});
});
