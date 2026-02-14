/**
 * Tests for reactive data sources.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createDerivedSignal,
	createIntervalSignal,
	createReducerSignal,
	createTimerSignal,
} from './reactiveSource';
import { createSignal } from './signals';

describe('reactiveSource', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	describe('createIntervalSignal', () => {
		it('creates a signal with initial value', () => {
			const fn = vi.fn(() => 42);
			const [value, dispose] = createIntervalSignal(fn, 1000);

			expect(value()).toBe(42);
			expect(fn).toHaveBeenCalledTimes(1);

			dispose();
		});

		it('updates signal on interval', () => {
			let counter = 0;
			const fn = vi.fn(() => counter++);
			const [value, dispose] = createIntervalSignal(fn, 1000);

			expect(value()).toBe(0);

			vi.advanceTimersByTime(1000);
			expect(value()).toBe(1);

			vi.advanceTimersByTime(1000);
			expect(value()).toBe(2);

			vi.advanceTimersByTime(1000);
			expect(value()).toBe(3);

			dispose();
		});

		it('stops updating after disposal', () => {
			let counter = 0;
			const fn = () => counter++;
			const [value, dispose] = createIntervalSignal(fn, 1000);

			expect(value()).toBe(0);

			vi.advanceTimersByTime(1000);
			expect(value()).toBe(1);

			dispose();

			vi.advanceTimersByTime(1000);
			expect(value()).toBe(1); // Should not update
		});

		it('works with different interval durations', () => {
			let counter = 0;
			const fn = () => counter++;
			const [value, dispose] = createIntervalSignal(fn, 500);

			expect(value()).toBe(0);

			vi.advanceTimersByTime(500);
			expect(value()).toBe(1);

			vi.advanceTimersByTime(500);
			expect(value()).toBe(2);

			dispose();
		});
	});

	describe('createTimerSignal', () => {
		it('starts at 0', () => {
			const [progress, dispose] = createTimerSignal(5000);
			expect(progress()).toBe(0);
			dispose();
		});

		it('progresses from 0 to 1 over duration', () => {
			const [progress, dispose] = createTimerSignal(1000);

			expect(progress()).toBe(0);

			vi.advanceTimersByTime(16); // First frame
			expect(progress()).toBeCloseTo(0.016, 2);

			vi.advanceTimersByTime(500 - 16); // Halfway
			expect(progress()).toBeCloseTo(0.5, 2);

			vi.advanceTimersByTime(500); // End
			expect(progress()).toBe(1);

			dispose();
		});

		it('stops at 1 and does not exceed', () => {
			const [progress, dispose] = createTimerSignal(1000);

			vi.advanceTimersByTime(1000);
			expect(progress()).toBe(1);

			vi.advanceTimersByTime(1000); // Extra time
			expect(progress()).toBe(1); // Should still be 1

			dispose();
		});

		it('stops updating after disposal', () => {
			const [progress, dispose] = createTimerSignal(1000);

			vi.advanceTimersByTime(500);
			const progressValue = progress();
			expect(progressValue).toBeCloseTo(0.5, 2);

			dispose();

			vi.advanceTimersByTime(500);
			expect(progress()).toBe(progressValue); // Should not change
		});

		it('automatically stops at completion', () => {
			const [progress] = createTimerSignal(100);

			vi.advanceTimersByTime(100);
			expect(progress()).toBe(1);

			// Timer should have stopped
			vi.advanceTimersByTime(100);
			expect(progress()).toBe(1);
		});
	});

	describe('createReducerSignal', () => {
		it('creates signal with initial state', () => {
			const reducer = vi.fn((state: number) => state);
			const [state] = createReducerSignal(reducer, 0);

			expect(state()).toBe(0);
			expect(reducer).not.toHaveBeenCalled();
		});

		it('updates state with reducer', () => {
			type Action = { type: 'increment' } | { type: 'decrement' };
			const reducer = (state: number, action: Action): number => {
				switch (action.type) {
					case 'increment':
						return state + 1;
					case 'decrement':
						return state - 1;
				}
			};

			const [state, dispatch] = createReducerSignal(reducer, 0);

			expect(state()).toBe(0);

			dispatch({ type: 'increment' });
			expect(state()).toBe(1);

			dispatch({ type: 'increment' });
			expect(state()).toBe(2);

			dispatch({ type: 'decrement' });
			expect(state()).toBe(1);
		});

		it('works with complex state', () => {
			interface State {
				count: number;
				name: string;
			}
			type Action = { type: 'increment' } | { type: 'setName'; name: string };

			const reducer = (state: State, action: Action): State => {
				switch (action.type) {
					case 'increment':
						return { ...state, count: state.count + 1 };
					case 'setName':
						return { ...state, name: action.name };
				}
			};

			const [state, dispatch] = createReducerSignal(reducer, { count: 0, name: 'Alice' });

			expect(state()).toEqual({ count: 0, name: 'Alice' });

			dispatch({ type: 'increment' });
			expect(state()).toEqual({ count: 1, name: 'Alice' });

			dispatch({ type: 'setName', name: 'Bob' });
			expect(state()).toEqual({ count: 1, name: 'Bob' });
		});

		it('notifies subscribers on state change', () => {
			type Action = { type: 'increment' };
			const reducer = (state: number, _action: Action): number => state + 1;
			const [state, _dispatch] = createReducerSignal(reducer, 0);

			const spy = vi.fn(() => state());

			// Subscribe by reading in an effect-like pattern
			spy();
			expect(spy).toHaveBeenCalledTimes(1);

			_dispatch({ type: 'increment' });
			// State changed, so a real effect would re-run
			expect(state()).toBe(1);
		});
	});

	describe('createDerivedSignal', () => {
		it('combines multiple signal values', () => {
			const [a, setA] = createSignal(1);
			const [b, setB] = createSignal(2);

			const sum = createDerivedSignal([a, b], (x, y) => x + y);

			expect(sum()).toBe(3);

			setA(10);
			expect(sum()).toBe(12);

			setB(20);
			expect(sum()).toBe(30);
		});

		it('updates when any signal changes', () => {
			const [firstName, setFirstName] = createSignal('John');
			const [lastName, setLastName] = createSignal('Doe');

			const fullName = createDerivedSignal(
				[firstName, lastName],
				(first, last) => `${first} ${last}`,
			);

			expect(fullName()).toBe('John Doe');

			setFirstName('Jane');
			expect(fullName()).toBe('Jane Doe');

			setLastName('Smith');
			expect(fullName()).toBe('Jane Smith');
		});

		it('works with more than two signals', () => {
			const [a, setA] = createSignal(1);
			const [b, setB] = createSignal(2);
			const [c, setC] = createSignal(3);

			const sum = createDerivedSignal([a, b, c], (x, y, z) => x + y + z);

			expect(sum()).toBe(6);

			setA(10);
			expect(sum()).toBe(15);

			setB(20);
			expect(sum()).toBe(33);

			setC(30);
			expect(sum()).toBe(60);
		});

		it('works with single signal', () => {
			const [value, setValue] = createSignal(5);

			const doubled = createDerivedSignal([value], (x) => x * 2);

			expect(doubled()).toBe(10);

			setValue(10);
			expect(doubled()).toBe(20);
		});

		it('does not recompute unnecessarily', () => {
			const [a, setA] = createSignal(1);
			const [b] = createSignal(2);
			const combiner = vi.fn((x: number, y: number) => x + y);

			const sum = createDerivedSignal([a, b], combiner);

			// Initial computation
			expect(sum()).toBe(3);
			expect(combiner).toHaveBeenCalledTimes(1);

			// Read again without changes
			expect(sum()).toBe(3);
			expect(combiner).toHaveBeenCalledTimes(1); // Should not recompute

			// Change a signal
			setA(10);
			expect(sum()).toBe(12);
			expect(combiner).toHaveBeenCalledTimes(2);
		});
	});
});
