/**
 * Typed EventEmitter implementation for type-safe event handling
 * @module core/events
 */

import type { Unsubscribe } from './types';

/**
 * Generic event handler type.
 * Takes the event payload and returns nothing.
 */
export type EventHandler<T> = (event: T) => void;

/**
 * Base event map type constraint.
 * Any object type mapping event names to payload types satisfies this constraint.
 * You don't need to explicitly extend this; any interface with string keys works.
 *
 * @example
 * ```typescript
 * // This works automatically:
 * interface MyEvents {
 *   'player:moved': { x: number; y: number };
 *   'game:over': { score: number };
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for flexible event map constraint
export type EventMap = Record<string, any>;

/**
 * UI events emitted by interactive elements.
 */
export interface UIEventMap {
	click: { x: number; y: number; button: number };
	keypress: { key: string; ctrl: boolean; meta: boolean; shift: boolean };
	focus: { target: unknown };
	blur: { target: unknown };
	mouseenter: { x: number; y: number };
	mouseleave: { x: number; y: number };
	mousemove: { x: number; y: number };
	mousedown: { x: number; y: number; button: number };
	mouseup: { x: number; y: number; button: number };
	scroll: { direction: 'up' | 'down'; amount: number };
}

/**
 * Screen-level events.
 */
export interface ScreenEventMap {
	resize: { width: number; height: number };
	render: { frameTime: number };
	destroy: Record<string, never>;
}

/**
 * Internal listener entry with handler and once flag.
 */
interface ListenerEntry<T> {
	handler: EventHandler<T>;
	once: boolean;
}

/**
 * Type-safe EventEmitter class.
 * Generic over an event map type that defines event names and their payload types.
 *
 * @typeParam T - Event map defining event names and payload types
 *
 * @example
 * ```typescript
 * import { EventBus } from 'blecsd';
 *
 * interface MyEvents {
 *   'player:moved': { x: number; y: number };
 *   'game:over': { score: number };
 * }
 *
 * const events = new EventBus<MyEvents>();
 *
 * const unsubscribe = events.on('player:moved', (e) => {
 *   console.log(`Player at ${e.x}, ${e.y}`);
 * });
 *
 * events.emit('player:moved', { x: 10, y: 20 });
 * unsubscribe(); // Stop listening
 * ```
 */
export class EventBus<T extends EventMap> {
	private listeners = new Map<keyof T, Set<ListenerEntry<unknown>>>();

	/**
	 * Register an event listener.
	 *
	 * @param event - The event name to listen for
	 * @param handler - The handler function to call when the event is emitted
	 * @returns An unsubscribe function to remove the listener
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = events.on('resize', ({ width, height }) => {
	 *   console.log(`New size: ${width}x${height}`);
	 * });
	 * ```
	 */
	on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
		return this.addListener(event, handler, false);
	}

	/**
	 * Register a one-time event listener.
	 * The handler will be automatically removed after being called once.
	 *
	 * @param event - The event name to listen for
	 * @param handler - The handler function to call when the event is emitted
	 * @returns An unsubscribe function to remove the listener before it fires
	 *
	 * @example
	 * ```typescript
	 * events.once('game:over', ({ score }) => {
	 *   console.log(`Final score: ${score}`);
	 * });
	 * ```
	 */
	once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
		return this.addListener(event, handler, true);
	}

	/**
	 * Remove a specific event listener.
	 *
	 * @param event - The event name
	 * @param handler - The handler function to remove
	 * @returns This EventBus for chaining
	 *
	 * @example
	 * ```typescript
	 * const handler = (e) => console.log(e);
	 * events.on('click', handler);
	 * events.off('click', handler);
	 * ```
	 */
	off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this {
		const listeners = this.listeners.get(event);
		if (!listeners) {
			return this;
		}

		for (const entry of listeners) {
			if (entry.handler === handler) {
				listeners.delete(entry);
				break;
			}
		}

		if (listeners.size === 0) {
			this.listeners.delete(event);
		}

		return this;
	}

	/**
	 * Emit an event to all registered listeners.
	 *
	 * @param event - The event name to emit
	 * @param payload - The event payload
	 * @returns True if any listeners were called, false otherwise
	 *
	 * @example
	 * ```typescript
	 * const hadListeners = events.emit('player:moved', { x: 5, y: 10 });
	 * ```
	 */
	emit<K extends keyof T>(event: K, payload: T[K]): boolean {
		const listeners = this.listeners.get(event);
		if (!listeners || listeners.size === 0) {
			return false;
		}

		const toRemove: ListenerEntry<unknown>[] = [];

		for (const entry of listeners) {
			(entry.handler as EventHandler<T[K]>)(payload);
			if (entry.once) {
				toRemove.push(entry);
			}
		}

		for (const entry of toRemove) {
			listeners.delete(entry);
		}

		if (listeners.size === 0) {
			this.listeners.delete(event);
		}

		return true;
	}

	/**
	 * Remove all listeners for a specific event or all events.
	 *
	 * @param event - Optional event name. If omitted, removes all listeners.
	 * @returns This EventBus for chaining
	 *
	 * @example
	 * ```typescript
	 * events.removeAllListeners('click'); // Remove all click listeners
	 * events.removeAllListeners(); // Remove all listeners for all events
	 * ```
	 */
	removeAllListeners<K extends keyof T>(event?: K): this {
		if (event === undefined) {
			this.listeners.clear();
		} else {
			this.listeners.delete(event);
		}
		return this;
	}

	/**
	 * Get the number of listeners for a specific event.
	 *
	 * @param event - The event name
	 * @returns The number of registered listeners
	 *
	 * @example
	 * ```typescript
	 * const count = events.listenerCount('click');
	 * ```
	 */
	listenerCount<K extends keyof T>(event: K): number {
		const listeners = this.listeners.get(event);
		return listeners?.size ?? 0;
	}

	/**
	 * Get all event names that have listeners.
	 *
	 * @returns Array of event names with active listeners
	 *
	 * @example
	 * ```typescript
	 * const activeEvents = events.eventNames();
	 * ```
	 */
	eventNames(): Array<keyof T> {
		return Array.from(this.listeners.keys());
	}

	/**
	 * Check if an event has any listeners.
	 *
	 * @param event - The event name
	 * @returns True if the event has listeners
	 */
	hasListeners<K extends keyof T>(event: K): boolean {
		return this.listenerCount(event) > 0;
	}

	private addListener<K extends keyof T>(
		event: K,
		handler: EventHandler<T[K]>,
		once: boolean,
	): Unsubscribe {
		let listeners = this.listeners.get(event);
		if (!listeners) {
			listeners = new Set();
			this.listeners.set(event, listeners);
		}

		const entry: ListenerEntry<unknown> = {
			handler: handler as EventHandler<unknown>,
			once,
		};
		listeners.add(entry);

		return () => {
			listeners.delete(entry);
			if (listeners.size === 0) {
				this.listeners.delete(event);
			}
		};
	}
}

/**
 * Create a new type-safe event bus.
 *
 * @typeParam T - Event map defining event names and payload types
 * @returns A new EventBus instance
 *
 * @example
 * ```typescript
 * import { createEventBus } from 'blecsd';
 *
 * interface GameEvents {
 *   'enemy:spawn': { type: string; x: number; y: number };
 *   'player:death': { cause: string };
 * }
 *
 * const events = createEventBus<GameEvents>();
 * events.on('enemy:spawn', (e) => console.log(`${e.type} at ${e.x}, ${e.y}`));
 * ```
 */
export function createEventBus<T extends EventMap>(): EventBus<T> {
	return new EventBus<T>();
}
