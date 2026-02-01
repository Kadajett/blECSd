import { describe, expect, it, vi } from 'vitest';
import type { EventHandler, ScreenEventMap, UIEventMap } from './events';
import { createEventBus, EventBus } from './events';

// Test event map for type safety verification
interface TestEventMap {
	'test:simple': { value: number };
	'test:complex': { name: string; count: number; active: boolean };
	'test:empty': Record<string, never>;
}

describe('EventBus', () => {
	describe('on()', () => {
		it('registers a listener and calls it on emit', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.on('test:simple', handler);
			events.emit('test:simple', { value: 42 });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith({ value: 42 });
		});

		it('allows multiple listeners for same event', () => {
			const events = new EventBus<TestEventMap>();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			events.on('test:simple', handler1);
			events.on('test:simple', handler2);
			events.emit('test:simple', { value: 1 });

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('returns unsubscribe function', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			const unsubscribe = events.on('test:simple', handler);
			events.emit('test:simple', { value: 1 });
			unsubscribe();
			events.emit('test:simple', { value: 2 });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith({ value: 1 });
		});

		it('preserves listener order', () => {
			const events = new EventBus<TestEventMap>();
			const order: number[] = [];

			events.on('test:simple', () => order.push(1));
			events.on('test:simple', () => order.push(2));
			events.on('test:simple', () => order.push(3));
			events.emit('test:simple', { value: 0 });

			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe('once()', () => {
		it('only fires once then removes itself', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.once('test:simple', handler);
			events.emit('test:simple', { value: 1 });
			events.emit('test:simple', { value: 2 });
			events.emit('test:simple', { value: 3 });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith({ value: 1 });
		});

		it('returns unsubscribe function that works before firing', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			const unsubscribe = events.once('test:simple', handler);
			unsubscribe();
			events.emit('test:simple', { value: 1 });

			expect(handler).not.toHaveBeenCalled();
		});

		it('can coexist with regular listeners', () => {
			const events = new EventBus<TestEventMap>();
			const onceHandler = vi.fn();
			const regularHandler = vi.fn();

			events.once('test:simple', onceHandler);
			events.on('test:simple', regularHandler);
			events.emit('test:simple', { value: 1 });
			events.emit('test:simple', { value: 2 });

			expect(onceHandler).toHaveBeenCalledTimes(1);
			expect(regularHandler).toHaveBeenCalledTimes(2);
		});
	});

	describe('off()', () => {
		it('removes specific listener', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.on('test:simple', handler);
			events.off('test:simple', handler);
			events.emit('test:simple', { value: 1 });

			expect(handler).not.toHaveBeenCalled();
		});

		it('only removes the specified handler', () => {
			const events = new EventBus<TestEventMap>();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			events.on('test:simple', handler1);
			events.on('test:simple', handler2);
			events.off('test:simple', handler1);
			events.emit('test:simple', { value: 1 });

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('does nothing when removing non-existent handler', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			// Should not throw
			events.off('test:simple', handler);
			expect(events.listenerCount('test:simple')).toBe(0);
		});

		it('does nothing when removing from non-existent event', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.on('test:simple', handler);
			events.off('test:complex', handler as EventHandler<TestEventMap['test:complex']>);

			expect(events.listenerCount('test:simple')).toBe(1);
		});

		it('returns this for chaining', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			const result = events.off('test:simple', handler);
			expect(result).toBe(events);
		});
	});

	describe('emit()', () => {
		it('returns true when listeners were called', () => {
			const events = new EventBus<TestEventMap>();
			events.on('test:simple', () => {});

			const result = events.emit('test:simple', { value: 1 });
			expect(result).toBe(true);
		});

		it('returns false when no listeners exist', () => {
			const events = new EventBus<TestEventMap>();

			const result = events.emit('test:simple', { value: 1 });
			expect(result).toBe(false);
		});

		it('passes correct payload to handlers', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.on('test:complex', handler);
			events.emit('test:complex', { name: 'test', count: 5, active: true });

			expect(handler).toHaveBeenCalledWith({ name: 'test', count: 5, active: true });
		});

		it('handles empty event payload', () => {
			const events = new EventBus<TestEventMap>();
			const handler = vi.fn();

			events.on('test:empty', handler);
			events.emit('test:empty', {});

			expect(handler).toHaveBeenCalledWith({});
		});
	});

	describe('removeAllListeners()', () => {
		it('removes all listeners for specific event', () => {
			const events = new EventBus<TestEventMap>();
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			const handler3 = vi.fn();

			events.on('test:simple', handler1);
			events.on('test:simple', handler2);
			events.on('test:complex', handler3);

			events.removeAllListeners('test:simple');

			events.emit('test:simple', { value: 1 });
			events.emit('test:complex', { name: 'test', count: 1, active: true });

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
			expect(handler3).toHaveBeenCalledTimes(1);
		});

		it('removes all listeners when no event specified', () => {
			const events = new EventBus<TestEventMap>();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			events.on('test:simple', handler1);
			events.on('test:complex', handler2);

			events.removeAllListeners();

			events.emit('test:simple', { value: 1 });
			events.emit('test:complex', { name: 'test', count: 1, active: true });

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
		});

		it('returns this for chaining', () => {
			const events = new EventBus<TestEventMap>();
			const result = events.removeAllListeners();
			expect(result).toBe(events);
		});
	});

	describe('listenerCount()', () => {
		it('returns 0 for event with no listeners', () => {
			const events = new EventBus<TestEventMap>();
			expect(events.listenerCount('test:simple')).toBe(0);
		});

		it('returns correct count', () => {
			const events = new EventBus<TestEventMap>();
			events.on('test:simple', () => {});
			events.on('test:simple', () => {});
			events.once('test:simple', () => {});

			expect(events.listenerCount('test:simple')).toBe(3);
		});

		it('decrements after unsubscribe', () => {
			const events = new EventBus<TestEventMap>();
			const unsubscribe = events.on('test:simple', () => {});
			events.on('test:simple', () => {});

			expect(events.listenerCount('test:simple')).toBe(2);
			unsubscribe();
			expect(events.listenerCount('test:simple')).toBe(1);
		});
	});

	describe('eventNames()', () => {
		it('returns empty array when no listeners', () => {
			const events = new EventBus<TestEventMap>();
			expect(events.eventNames()).toEqual([]);
		});

		it('returns all events with listeners', () => {
			const events = new EventBus<TestEventMap>();
			events.on('test:simple', () => {});
			events.on('test:complex', () => {});

			const names = events.eventNames();
			expect(names).toHaveLength(2);
			expect(names).toContain('test:simple');
			expect(names).toContain('test:complex');
		});

		it('removes event name when all listeners removed', () => {
			const events = new EventBus<TestEventMap>();
			const unsubscribe = events.on('test:simple', () => {});

			expect(events.eventNames()).toContain('test:simple');
			unsubscribe();
			expect(events.eventNames()).not.toContain('test:simple');
		});
	});

	describe('hasListeners()', () => {
		it('returns false when no listeners', () => {
			const events = new EventBus<TestEventMap>();
			expect(events.hasListeners('test:simple')).toBe(false);
		});

		it('returns true when listeners exist', () => {
			const events = new EventBus<TestEventMap>();
			events.on('test:simple', () => {});
			expect(events.hasListeners('test:simple')).toBe(true);
		});
	});
});

describe('createEventBus()', () => {
	it('creates a new EventBus instance', () => {
		const events = createEventBus<TestEventMap>();
		expect(events).toBeInstanceOf(EventBus);
	});

	it('works with UIEventMap', () => {
		const events = createEventBus<UIEventMap>();
		const handler = vi.fn();

		events.on('click', handler);
		events.emit('click', { x: 10, y: 20, button: 0 });

		expect(handler).toHaveBeenCalledWith({ x: 10, y: 20, button: 0 });
	});

	it('works with ScreenEventMap', () => {
		const events = createEventBus<ScreenEventMap>();
		const handler = vi.fn();

		events.on('resize', handler);
		events.emit('resize', { width: 80, height: 24 });

		expect(handler).toHaveBeenCalledWith({ width: 80, height: 24 });
	});
});

describe('type safety (compile-time tests)', () => {
	it('enforces correct event names and payloads', () => {
		const events = createEventBus<TestEventMap>();
		const received: unknown[] = [];

		// These should compile without errors
		events.on('test:simple', (e) => {
			received.push(e.value satisfies number);
		});

		events.on('test:complex', (e) => {
			received.push(e.name satisfies string);
			received.push(e.count satisfies number);
			received.push(e.active satisfies boolean);
		});

		// Type inference should work
		events.emit('test:simple', { value: 42 });
		events.emit('test:complex', { name: 'test', count: 1, active: true });

		expect(received).toEqual([42, 'test', 1, true]);
	});
});
