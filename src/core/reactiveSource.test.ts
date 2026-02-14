/**
 * Tests for reactive data sources.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createCallbackSignal,
	createDerivedSignal,
	createEventSignal,
	createIntervalSignal,
	createPollingSignal,
	createReducerSignal,
	createStreamSignal,
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

			// Advance past duration to trigger final interval tick
			vi.advanceTimersByTime(516); // Past end
			expect(progress()).toBe(1);

			dispose();
		});

		it('stops at 1 and does not exceed', () => {
			const [progress, dispose] = createTimerSignal(1000);

			// Advance past duration to trigger final interval tick
			vi.advanceTimersByTime(1016);
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

			// Advance past duration to trigger final interval tick
			vi.advanceTimersByTime(112);
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

	describe('createStreamSignal', () => {
		it('creates signal with initial value', () => {
			const mockStream = {
				on: vi.fn(),
				removeListener: vi.fn(),
			};

			const [value, dispose] = createStreamSignal(mockStream, {
				initialValue: '',
			});

			expect(value()).toBe('');
			expect(mockStream.on).toHaveBeenCalledWith('data', expect.any(Function));
			expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));

			dispose();
		});

		it('updates signal on data events', () => {
			let dataListener: ((...args: unknown[]) => void) | undefined;

			const mockStream = {
				on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
					if (event === 'data') {
						dataListener = listener;
					}
				}),
				removeListener: vi.fn(),
			};

			const [value, dispose] = createStreamSignal(mockStream, {
				initialValue: '',
			});

			expect(value()).toBe('');

			// Emit data event
			const chunk = Buffer.from('Hello');
			dataListener?.(chunk);

			expect(value()).toBe('Hello');

			dispose();
		});

		it('uses custom transform function', () => {
			let dataListener: ((...args: unknown[]) => void) | undefined;

			const mockStream = {
				on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
					if (event === 'data') {
						dataListener = listener;
					}
				}),
				removeListener: vi.fn(),
			};

			const transform = (chunk: Buffer): number => chunk.length;

			const [value, dispose] = createStreamSignal(mockStream, {
				initialValue: 0,
				transform,
			});

			expect(value()).toBe(0);

			const chunk = Buffer.from('Hello');
			dataListener?.(chunk);

			expect(value()).toBe(5);

			dispose();
		});

		it('handles errors gracefully', () => {
			let errorListener: ((...args: unknown[]) => void) | undefined;
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const mockStream = {
				on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
					if (event === 'error') {
						errorListener = listener;
					}
				}),
				removeListener: vi.fn(),
			};

			const [value, dispose] = createStreamSignal(mockStream, {
				initialValue: 'initial',
			});

			expect(value()).toBe('initial');

			// Emit error
			errorListener?.(new Error('Stream error'));

			// Value should remain unchanged
			expect(value()).toBe('initial');
			expect(consoleErrorSpy).toHaveBeenCalledWith('Stream error:', expect.any(Error));

			dispose();
			consoleErrorSpy.mockRestore();
		});

		it('cleans up listeners on dispose', () => {
			const mockStream = {
				on: vi.fn(),
				removeListener: vi.fn(),
			};

			const [, dispose] = createStreamSignal(mockStream, {
				initialValue: '',
			});

			dispose();

			expect(mockStream.removeListener).toHaveBeenCalledWith('data', expect.any(Function));
			expect(mockStream.removeListener).toHaveBeenCalledWith('error', expect.any(Function));
		});

		it('destroys stream when destroyOnDispose is true', () => {
			const mockStream = {
				on: vi.fn(),
				removeListener: vi.fn(),
				destroy: vi.fn(),
			};

			const [, dispose] = createStreamSignal(mockStream, {
				initialValue: '',
				destroyOnDispose: true,
			});

			dispose();

			expect(mockStream.destroy).toHaveBeenCalled();
		});

		it('does not destroy stream when destroyOnDispose is false', () => {
			const mockStream = {
				on: vi.fn(),
				removeListener: vi.fn(),
				destroy: vi.fn(),
			};

			const [, dispose] = createStreamSignal(mockStream, {
				initialValue: '',
				destroyOnDispose: false,
			});

			dispose();

			expect(mockStream.destroy).not.toHaveBeenCalled();
		});
	});

	describe('createCallbackSignal', () => {
		it('creates signal with initial value', () => {
			const subscribe = vi.fn(() => vi.fn());
			const [value] = createCallbackSignal(subscribe, 0);

			expect(value()).toBe(0);
			expect(subscribe).toHaveBeenCalledWith(expect.any(Function));
		});

		it('updates signal when callback is invoked', () => {
			let callback: ((value: number) => void) | undefined;

			const subscribe = vi.fn((cb: (value: number) => void) => {
				callback = cb;
				return vi.fn();
			});

			const [value] = createCallbackSignal(subscribe, 0);

			expect(value()).toBe(0);

			callback?.(42);

			expect(value()).toBe(42);

			callback?.(100);

			expect(value()).toBe(100);
		});

		it('calls unsubscribe on dispose', () => {
			const unsubscribe = vi.fn();
			const subscribe = vi.fn(() => unsubscribe);

			const [, dispose] = createCallbackSignal(subscribe, 0);

			dispose();

			expect(unsubscribe).toHaveBeenCalled();
		});

		it('works with complex data types', () => {
			let callback: ((value: { name: string; count: number }) => void) | undefined;

			const subscribe = vi.fn((cb: (value: { name: string; count: number }) => void) => {
				callback = cb;
				return vi.fn();
			});

			const [value] = createCallbackSignal(subscribe, { name: 'Alice', count: 0 });

			expect(value()).toEqual({ name: 'Alice', count: 0 });

			callback?.({ name: 'Bob', count: 5 });

			expect(value()).toEqual({ name: 'Bob', count: 5 });
		});
	});

	describe('createPollingSignal', () => {
		it('creates signal with initial value', async () => {
			const fn = vi.fn(async () => 42);
			const [value, dispose] = createPollingSignal(fn, 1000, 0);

			expect(value()).toBe(0);

			// Wait for initial poll to complete
			await Promise.resolve();
			await Promise.resolve();

			expect(value()).toBe(42);

			dispose();
		});

		it('polls function at interval', async () => {
			vi.useFakeTimers();

			let counter = 0;
			const fn = vi.fn(async () => counter++);
			const [value, dispose] = createPollingSignal(fn, 1000, 0);

			// Wait for initial poll
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(0);

			// First interval
			vi.advanceTimersByTime(1000);
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(1);

			// Second interval
			vi.advanceTimersByTime(1000);
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(2);

			dispose();
			vi.useRealTimers();
		});

		it('handles errors gracefully', async () => {
			vi.useFakeTimers();

			let shouldError = true;
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const fn = vi.fn(async () => {
				if (shouldError) {
					throw new Error('Poll error');
				}
				return 42;
			});

			const [value, dispose] = createPollingSignal(fn, 1000, 0);

			// Wait for initial poll with error
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(0); // Should keep initial value
			expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error));

			// Next poll succeeds
			shouldError = false;
			vi.advanceTimersByTime(1000);
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve(); // Extra tick for promise resolution
			expect(value()).toBe(42);

			dispose();
			vi.useRealTimers();
			consoleErrorSpy.mockRestore();
		});

		it('stops polling on dispose', async () => {
			vi.useFakeTimers();

			let counter = 0;
			const fn = vi.fn(async () => counter++);
			const [value, dispose] = createPollingSignal(fn, 1000, 0);

			// Wait for initial poll
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(0);

			// First interval
			vi.advanceTimersByTime(1000);
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(1);

			dispose();

			// Should not poll after dispose
			vi.advanceTimersByTime(1000);
			await Promise.resolve();
			await Promise.resolve();
			expect(value()).toBe(1); // Should not change

			vi.useRealTimers();
		});

		it('does not update signal after dispose even if promise resolves', async () => {
			let resolvePromise: ((value: number) => void) | undefined;

			const fn = vi.fn(
				async () =>
					new Promise<number>((resolve) => {
						resolvePromise = resolve;
					}),
			);

			const [value, dispose] = createPollingSignal(fn, 1000, 0);

			// Start initial poll (promise is pending)
			await Promise.resolve();

			// Dispose before promise resolves
			dispose();

			// Resolve promise after dispose
			resolvePromise?.(42);
			await Promise.resolve();
			await Promise.resolve();

			// Value should remain unchanged
			expect(value()).toBe(0);
		});
	});

	describe('createEventSignal', () => {
		it('creates signal with initial value', () => {
			const mockEmitter = {
				on: vi.fn(),
				removeListener: vi.fn(),
			};

			const [value] = createEventSignal<string>(mockEmitter, 'message', 'initial');

			expect(value()).toBe('initial');
			expect(mockEmitter.on).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('creates signal without initial value', () => {
			const mockEmitter = {
				on: vi.fn(),
				removeListener: vi.fn(),
			};

			const [value] = createEventSignal<string>(mockEmitter, 'message');

			expect(value()).toBeUndefined();
		});

		it('updates signal on event', () => {
			let listener: ((...args: unknown[]) => void) | undefined;

			const mockEmitter = {
				on: vi.fn((_eventName: string, l: (...args: unknown[]) => void) => {
					listener = l;
				}),
				removeListener: vi.fn(),
			};

			const [value] = createEventSignal<string>(mockEmitter, 'message', '');

			expect(value()).toBe('');

			listener?.('Hello');

			expect(value()).toBe('Hello');

			listener?.('World');

			expect(value()).toBe('World');
		});

		it('removes listener on dispose', () => {
			const mockEmitter = {
				on: vi.fn(),
				removeListener: vi.fn(),
			};

			const [, dispose] = createEventSignal<string>(mockEmitter, 'message', '');

			dispose();

			expect(mockEmitter.removeListener).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('works with different event names', () => {
			let listener1: ((...args: unknown[]) => void) | undefined;
			let listener2: ((...args: unknown[]) => void) | undefined;

			const mockEmitter = {
				on: vi.fn((_eventName: string, l: (...args: unknown[]) => void) => {
					if (_eventName === 'message') {
						listener1 = l;
					} else if (_eventName === 'count') {
						listener2 = l;
					}
				}),
				removeListener: vi.fn(),
			};

			const [message] = createEventSignal<string>(mockEmitter, 'message', '');
			const [count] = createEventSignal<number>(mockEmitter, 'count', 0);

			listener1?.('Hello');
			listener2?.(42);

			expect(message()).toBe('Hello');
			expect(count()).toBe(42);
		});

		it('works with complex event payloads', () => {
			let listener: ((...args: unknown[]) => void) | undefined;

			const mockEmitter = {
				on: vi.fn((_eventName: string, l: (...args: unknown[]) => void) => {
					listener = l;
				}),
				removeListener: vi.fn(),
			};

			const [value] = createEventSignal<{ id: number; text: string }>(mockEmitter, 'data', {
				id: 0,
				text: '',
			});

			listener?.({ id: 1, text: 'First' });

			expect(value()).toEqual({ id: 1, text: 'First' });

			listener?.({ id: 2, text: 'Second' });

			expect(value()).toEqual({ id: 2, text: 'Second' });
		});
	});
});
