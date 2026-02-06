import { describe, expect, it } from 'vitest';
import type { Entity } from '../core/types';
import type { ComponentStore } from './componentStorage';
import { createComponentStore } from './componentStorage';

/** Helper to create a fake Entity ID (Entity is a branded number type). */
function eid(n: number): Entity {
	return n as Entity;
}

/**
 * Simple seeded PRNG (mulberry32) for deterministic test sequences.
 * Returns a function that yields numbers in [0, 1).
 */
function seededRng(seed: number): () => number {
	let state = seed | 0;
	return (): number => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// =============================================================================
// Shared behavior tests that apply to BOTH modes
// =============================================================================

function describeCommonBehavior(mode: string, factory: <T>() => ComponentStore<T>): void {
	describe(`common behavior (${mode})`, () => {
		it('starts empty', () => {
			const store = factory<number>();
			expect(store.size).toBe(0);
			expect(store.has(eid(1))).toBe(false);
			expect(store.get(eid(1))).toBeUndefined();
		});

		it('sets and gets a value', () => {
			const store = factory<string>();
			store.set(eid(1), 'hello');
			expect(store.has(eid(1))).toBe(true);
			expect(store.get(eid(1))).toBe('hello');
			expect(store.size).toBe(1);
		});

		it('overwrites an existing value', () => {
			const store = factory<number>();
			store.set(eid(5), 10);
			store.set(eid(5), 20);
			expect(store.get(eid(5))).toBe(20);
			expect(store.size).toBe(1);
		});

		it('deletes an existing entry', () => {
			const store = factory<string>();
			store.set(eid(1), 'a');
			store.set(eid(2), 'b');

			expect(store.delete(eid(1))).toBe(true);
			expect(store.has(eid(1))).toBe(false);
			expect(store.get(eid(1))).toBeUndefined();
			expect(store.size).toBe(1);
			expect(store.get(eid(2))).toBe('b');
		});

		it('returns false when deleting a missing entry', () => {
			const store = factory<number>();
			expect(store.delete(eid(99))).toBe(false);
		});

		it('clears all entries', () => {
			const store = factory<number>();
			store.set(eid(1), 10);
			store.set(eid(2), 20);
			store.set(eid(3), 30);
			store.clear();

			expect(store.size).toBe(0);
			expect(store.has(eid(1))).toBe(false);
			expect(store.has(eid(2))).toBe(false);
			expect(store.has(eid(3))).toBe(false);
		});

		it('handles many entities', () => {
			const store = factory<number>();
			for (let i = 0; i < 200; i++) {
				store.set(eid(i), i * 2);
			}
			expect(store.size).toBe(200);
			expect(store.get(eid(0))).toBe(0);
			expect(store.get(eid(199))).toBe(398);
		});

		it('forEach visits all entries', () => {
			const store = factory<string>();
			store.set(eid(10), 'x');
			store.set(eid(20), 'y');
			store.set(eid(30), 'z');

			const visited = new Map<number, string>();
			store.forEach((value, entity) => {
				visited.set(entity as number, value);
			});

			expect(visited.size).toBe(3);
			expect(visited.get(10)).toBe('x');
			expect(visited.get(20)).toBe('y');
			expect(visited.get(30)).toBe('z');
		});

		it('forEach sees updated values', () => {
			const store = factory<number>();
			store.set(eid(1), 100);
			store.set(eid(1), 200);

			const values: number[] = [];
			store.forEach((v) => {
				values.push(v);
			});
			expect(values).toEqual([200]);
		});

		it('forEach skips deleted entries', () => {
			const store = factory<string>();
			store.set(eid(1), 'a');
			store.set(eid(2), 'b');
			store.set(eid(3), 'c');
			store.delete(eid(2));

			const visited: string[] = [];
			store.forEach((v) => {
				visited.push(v);
			});
			expect(visited).toHaveLength(2);
			expect(visited).toContain('a');
			expect(visited).toContain('c');
		});

		it('supports object values', () => {
			interface WidgetState {
				readonly label: string;
				readonly active: boolean;
			}
			const store = factory<WidgetState>();
			store.set(eid(1), { label: 'Tab 1', active: true });
			store.set(eid(2), { label: 'Tab 2', active: false });

			expect(store.get(eid(1))).toEqual({ label: 'Tab 1', active: true });
			expect(store.get(eid(2))).toEqual({ label: 'Tab 2', active: false });
		});

		it('handles interleaved add and remove', () => {
			const store = factory<number>();
			store.set(eid(1), 10);
			store.set(eid(2), 20);
			store.delete(eid(1));
			store.set(eid(3), 30);
			store.delete(eid(2));
			store.set(eid(4), 40);

			expect(store.size).toBe(2);
			expect(store.has(eid(1))).toBe(false);
			expect(store.has(eid(2))).toBe(false);
			expect(store.get(eid(3))).toBe(30);
			expect(store.get(eid(4))).toBe(40);
		});

		it('can re-add after delete', () => {
			const store = factory<string>();
			store.set(eid(1), 'first');
			store.delete(eid(1));
			store.set(eid(1), 'second');

			expect(store.get(eid(1))).toBe('second');
			expect(store.size).toBe(1);
		});

		it('clear then re-add works', () => {
			const store = factory<number>();
			store.set(eid(1), 10);
			store.set(eid(2), 20);
			store.clear();

			store.set(eid(3), 30);
			expect(store.size).toBe(1);
			expect(store.get(eid(3))).toBe(30);
			expect(store.has(eid(1))).toBe(false);
		});
	});
}

// =============================================================================
// Non-iterable (Map-backed) mode
// =============================================================================

describe('createComponentStore (non-iterable / Map-backed)', () => {
	const factory = <T>(): ComponentStore<T> => createComponentStore<T>({ iterable: false });

	describeCommonBehavior('non-iterable', factory);

	it('defaults to non-iterable mode', () => {
		const store = createComponentStore<number>();
		store.set(eid(1), 42);
		expect(store.get(eid(1))).toBe(42);
		// data() returns empty array in non-iterable mode
		expect(store.data()).toEqual([]);
	});

	it('data() returns a shared frozen empty array', () => {
		const store = factory<number>();
		store.set(eid(1), 1);
		store.set(eid(2), 2);
		const d1 = store.data();
		const d2 = store.data();
		expect(d1).toEqual([]);
		expect(d1).toBe(d2); // same reference, no allocation
		expect(Object.isFrozen(d1)).toBe(true);
	});
});

// =============================================================================
// Iterable (PackedStore-backed) mode
// =============================================================================

describe('createComponentStore (iterable / PackedStore-backed)', () => {
	const factory = <T>(): ComponentStore<T> => createComponentStore<T>({ iterable: true });

	describeCommonBehavior('iterable', factory);

	it('data() returns dense array of values', () => {
		const store = factory<string>();
		store.set(eid(1), 'a');
		store.set(eid(2), 'b');
		store.set(eid(3), 'c');

		const d = store.data();
		expect(d).toHaveLength(3);
		expect([...d].sort()).toEqual(['a', 'b', 'c']);
	});

	it('data() stays dense after deletion (swap-and-pop)', () => {
		const store = factory<number>();
		store.set(eid(1), 10);
		store.set(eid(2), 20);
		store.set(eid(3), 30);

		store.delete(eid(2));

		// After swap-and-pop, data should be dense with 2 elements
		const d = store.data();
		// Only the first store.size elements are live
		expect(store.size).toBe(2);
		const liveData = d.slice(0, store.size);
		expect(liveData).toHaveLength(2);
		expect(liveData).toContain(10);
		expect(liveData).toContain(30);
	});

	it('accepts initialCapacity config', () => {
		const store = createComponentStore<number>({
			iterable: true,
			initialCapacity: 256,
		});
		// Should work fine with larger capacity
		store.set(eid(1), 42);
		expect(store.get(eid(1))).toBe(42);
	});

	it('handles stale entity access after delete', () => {
		const store = factory<string>();
		store.set(eid(1), 'hello');
		store.delete(eid(1));

		// Stale access should return undefined
		expect(store.get(eid(1))).toBeUndefined();
		expect(store.has(eid(1))).toBe(false);
	});

	it('forEach iterates in dense order', () => {
		const store = factory<number>();
		store.set(eid(10), 100);
		store.set(eid(20), 200);
		store.set(eid(30), 300);
		store.delete(eid(20));

		const pairs: Array<[number, number]> = [];
		store.forEach((value, entity) => {
			pairs.push([entity as number, value]);
		});

		expect(pairs).toHaveLength(2);
		const entities = pairs.map(([e]) => e).sort((a, b) => a - b);
		const values = pairs.map(([, v]) => v).sort((a, b) => a - b);
		expect(entities).toEqual([10, 30]);
		expect(values).toEqual([100, 300]);
	});

	it('stress test: interleaved operations maintain consistency', () => {
		const store = factory<number>();
		const reference = new Map<number, number>();
		const rng = seededRng(42);

		// Perform 500 deterministic operations
		for (let i = 0; i < 500; i++) {
			const entity = eid(Math.floor(rng() * 50));
			const op = rng();

			if (op < 0.5) {
				// Add/update
				const value = Math.floor(rng() * 1000);
				store.set(entity, value);
				reference.set(entity as number, value);
			} else if (op < 0.8) {
				// Delete
				store.delete(entity);
				reference.delete(entity as number);
			} else {
				// Read
				const storeVal = store.get(entity);
				const refVal = reference.get(entity as number);
				expect(storeVal).toBe(refVal);
			}
		}

		// Verify final state matches
		expect(store.size).toBe(reference.size);

		for (const [entityNum, value] of reference) {
			expect(store.get(eid(entityNum))).toBe(value);
		}

		// Verify forEach visits all entries
		const forEachEntities = new Set<number>();
		store.forEach((_value, entity) => {
			forEachEntities.add(entity as number);
		});
		expect(forEachEntities.size).toBe(reference.size);
		for (const entityNum of reference.keys()) {
			expect(forEachEntities.has(entityNum)).toBe(true);
		}
	});

	it('data() reflects current state after mutations', () => {
		const store = factory<string>();
		store.set(eid(1), 'a');
		store.set(eid(2), 'b');

		let d = store.data();
		expect(d.slice(0, store.size)).toHaveLength(2);

		store.delete(eid(1));
		d = store.data();
		expect(d.slice(0, store.size)).toHaveLength(1);

		store.set(eid(3), 'c');
		d = store.data();
		expect(d.slice(0, store.size)).toHaveLength(2);
	});
});
