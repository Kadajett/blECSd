/**
 * Tests for signal primitives and computed properties.
 * @module core/signals.test
 */

import { describe, expect, it } from 'vitest';
import { isDirty, markClean } from '../components/renderable';
import { addEntity } from './ecs';
import {
	createBatch,
	createComputed,
	createEntitySignal,
	createSignal,
	disposeSignal,
	type Signal,
} from './signals';
import { createWorld } from './world';

describe('createSignal', () => {
	it('creates a signal with initial value', () => {
		const [count] = createSignal(0);
		expect(count()).toBe(0);
	});

	it('updates signal value with setter', () => {
		const [count, setCount] = createSignal(0);
		setCount(1);
		expect(count()).toBe(1);
	});

	it('supports functional updates', () => {
		const [count, setCount] = createSignal(0);
		setCount((prev) => prev + 1);
		expect(count()).toBe(1);
		setCount((prev) => prev + 1);
		expect(count()).toBe(2);
	});

	it('does not notify if value unchanged', () => {
		const [count, setCount] = createSignal(0);
		const double = createComputed(() => count() * 2);

		let computeCount = 0;
		const tracked = createComputed(() => {
			computeCount++;
			return double();
		});

		expect(tracked()).toBe(0);
		expect(computeCount).toBe(1);

		// Set to same value
		setCount(0);
		tracked(); // Access to trigger recomputation if dirty
		expect(computeCount).toBe(1); // Should not recompute
	});
});

describe('createComputed', () => {
	it('computes initial value immediately', () => {
		const [count] = createSignal(5);
		const doubled = createComputed(() => count() * 2);
		expect(doubled()).toBe(10);
	});

	it('recomputes when dependency changes', () => {
		const [count, setCount] = createSignal(0);
		const doubled = createComputed(() => count() * 2);

		expect(doubled()).toBe(0);
		setCount(5);
		expect(doubled()).toBe(10);
	});

	it('only recomputes when dependency actually changes', () => {
		const [count, setCount] = createSignal(0);
		let computeCount = 0;
		const doubled = createComputed(() => {
			computeCount++;
			return count() * 2;
		});

		expect(doubled()).toBe(0);
		expect(computeCount).toBe(1);

		// Set to same value
		setCount(0);
		doubled(); // Access to check if recomputed
		expect(computeCount).toBe(1); // Should not recompute
	});

	it('handles diamond dependencies correctly', () => {
		const [source, setSource] = createSignal(1);
		const left = createComputed(() => source() * 2);
		const right = createComputed(() => source() * 3);

		let computeCount = 0;
		const combined = createComputed(() => {
			computeCount++;
			return left() + right();
		});

		expect(combined()).toBe(5); // 2 + 3
		expect(computeCount).toBe(1);

		setSource(2);
		expect(combined()).toBe(10); // 4 + 6
		expect(computeCount).toBe(2); // Should only compute once, not twice
	});

	it('handles nested computed chains', () => {
		const [a, setA] = createSignal(1);
		const b = createComputed(() => a() * 2);
		const c = createComputed(() => b() * 2);
		const d = createComputed(() => c() * 2);

		expect(d()).toBe(8); // 1 * 2 * 2 * 2
		setA(2);
		expect(d()).toBe(16); // 2 * 2 * 2 * 2
	});

	it('detects circular dependencies', () => {
		// Create a computed that tries to read itself
		const [count, setCount] = createSignal(0);

		expect(() => {
			let circular: (() => number) | null = null;
			circular = createComputed((): number => {
				// This will trigger during recomputation
				if (count() > 0 && circular) {
					return circular() + 1; // Circular reference
				}
				return 0;
			});

			// Initial computation is fine
			expect(circular()).toBe(0);

			// This update will trigger circular reference
			setCount(1);
			circular(); // This should throw
		}).toThrow('Circular dependency detected');
	});

	it('tracks multiple dependencies', () => {
		const [a, setA] = createSignal(1);
		const [b, setB] = createSignal(2);
		const sum = createComputed(() => a() + b());

		expect(sum()).toBe(3);
		setA(5);
		expect(sum()).toBe(7);
		setB(10);
		expect(sum()).toBe(15);
	});
});

describe('createBatch', () => {
	it('batches multiple updates', () => {
		const [a, setA] = createSignal(0);
		const [b, setB] = createSignal(0);

		let computeCount = 0;
		const sum = createComputed(() => {
			computeCount++;
			return a() + b();
		});

		expect(sum()).toBe(0);
		expect(computeCount).toBe(1);

		createBatch(() => {
			setA(1);
			setB(2);
		});

		expect(sum()).toBe(3);
		expect(computeCount).toBe(2); // Only computed once after batch
	});

	it('handles nested batches', () => {
		const [a, setA] = createSignal(0);
		const [b, setB] = createSignal(0);

		let computeCount = 0;
		const sum = createComputed(() => {
			computeCount++;
			return a() + b();
		});

		expect(sum()).toBe(0);
		expect(computeCount).toBe(1);

		createBatch(() => {
			setA(1);
			createBatch(() => {
				setB(2);
			});
		});

		expect(sum()).toBe(3);
		expect(computeCount).toBe(2); // Only computed once after outer batch
	});
});

describe('createEntitySignal', () => {
	it('creates a signal scoped to an entity', () => {
		const world = createWorld();
		const eid = addEntity(world);
		const [health, setHealth] = createEntitySignal(world, eid, 100);

		expect(health()).toBe(100);
		setHealth(80);
		expect(health()).toBe(80);
	});

	it('marks entity dirty when signal changes', () => {
		const world = createWorld();
		const eid = addEntity(world);
		const [, setHealth] = createEntitySignal(world, eid, 100);

		// Start clean
		markClean(world, eid);
		expect(isDirty(world, eid)).toBe(false);

		// Update signal
		setHealth(80);

		// Should be dirty now
		expect(isDirty(world, eid)).toBe(true);
	});

	it('does not mark dirty if value unchanged', () => {
		const world = createWorld();
		const eid = addEntity(world);
		const [, setHealth] = createEntitySignal(world, eid, 100);

		markClean(world, eid);
		expect(isDirty(world, eid)).toBe(false);

		// Set to same value
		setHealth(100);

		// Should still be clean
		expect(isDirty(world, eid)).toBe(false);
	});

	it('works with computed signals', () => {
		const world = createWorld();
		const eid = addEntity(world);
		const [health, setHealth] = createEntitySignal(world, eid, 100);
		const isLowHealth = createComputed(() => health() < 30);

		expect(isLowHealth()).toBe(false);
		setHealth(20);
		expect(isLowHealth()).toBe(true);
	});
});

describe('disposeSignal', () => {
	it('disposes computed signal and cleans up dependencies', () => {
		const [count, setCount] = createSignal(0);
		const doubled = createComputed(() => count() * 2);

		expect(doubled()).toBe(0);
		disposeSignal(doubled);

		// After disposal, we can still access the value
		setCount(5);
		expect(() => doubled()).not.toThrow();
	});

	it('handles disposal of non-computed signals gracefully', () => {
		const [count] = createSignal(0);

		// Disposing a non-computed should not throw
		expect(() => disposeSignal(count)).not.toThrow();
	});
});

describe('performance', () => {
	it('handles 10000 signal updates efficiently', () => {
		const signals: Signal<number>[] = [];
		for (let i = 0; i < 10000; i++) {
			signals.push(createSignal(i));
		}

		// Update all signals
		for (let i = 0; i < signals.length; i++) {
			const signal = signals[i];
			if (signal) {
				const [, set] = signal;
				set(i * 2);
			}
		}

		// Verify values
		for (let i = 0; i < signals.length; i++) {
			const signal = signals[i];
			if (signal) {
				const [get] = signal;
				expect(get()).toBe(i * 2);
			}
		}
	});

	it('handles large computed dependency graphs', () => {
		const [source, setSource] = createSignal(1);

		// Create a chain of 100 computeds
		let current = createComputed(() => source());
		for (let i = 0; i < 99; i++) {
			const prev = current;
			current = createComputed(() => prev() + 1);
		}

		expect(current()).toBe(100); // 1 + 99
		setSource(2);
		expect(current()).toBe(101); // 2 + 99
	});
});

describe('edge cases', () => {
	it('handles undefined initial values', () => {
		const [value, setValue] = createSignal<number | undefined>(undefined);
		expect(value()).toBeUndefined();
		setValue(42);
		expect(value()).toBe(42);
	});

	it('handles null initial values', () => {
		const [value, setValue] = createSignal<number | null>(null);
		expect(value()).toBeNull();
		setValue(42);
		expect(value()).toBe(42);
	});

	it('handles object values', () => {
		const [obj, setObj] = createSignal({ count: 0 });
		expect(obj().count).toBe(0);

		// Reference equality check - same object reference should not trigger update
		const sameObj = obj();
		setObj(sameObj);

		let computeCount = 0;
		const tracked = createComputed(() => {
			computeCount++;
			return obj().count;
		});

		expect(tracked()).toBe(0);
		expect(computeCount).toBe(1);

		// Set to same reference again
		setObj(sameObj);
		tracked();
		expect(computeCount).toBe(1); // Should not recompute
	});

	it('handles array values', () => {
		const [arr, setArr] = createSignal([1, 2, 3]);
		expect(arr()).toEqual([1, 2, 3]);
		setArr([4, 5, 6]);
		expect(arr()).toEqual([4, 5, 6]);
	});

	it('handles computed that returns undefined', () => {
		const [show, setShow] = createSignal(false);
		const value = createComputed(() => (show() ? 42 : undefined));

		expect(value()).toBeUndefined();
		setShow(true);
		expect(value()).toBe(42);
	});

	it('handles multiple simultaneous computeds depending on same signal', () => {
		const [source, setSource] = createSignal(1);
		const double = createComputed(() => source() * 2);
		const triple = createComputed(() => source() * 3);
		const quad = createComputed(() => source() * 4);

		expect(double()).toBe(2);
		expect(triple()).toBe(3);
		expect(quad()).toBe(4);

		setSource(5);

		expect(double()).toBe(10);
		expect(triple()).toBe(15);
		expect(quad()).toBe(20);
	});
});
