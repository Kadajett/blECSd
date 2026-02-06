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
 * Type-safe EventBus interface.
 *
 * @typeParam T - Event map defining event names and payload types
 */
export interface EventBus<T extends EventMap> {
	on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe;
	once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe;
	off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): EventBus<T>;
	emit<K extends keyof T>(event: K, payload: T[K]): boolean;
	removeAllListeners<K extends keyof T>(event?: K): EventBus<T>;
	listenerCount<K extends keyof T>(event: K): number;
	eventNames(): Array<keyof T>;
	hasListeners<K extends keyof T>(event: K): boolean;
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
	const listeners = new Map<keyof T, Set<ListenerEntry<unknown>>>();

	function addListener<K extends keyof T>(
		event: K,
		handler: EventHandler<T[K]>,
		once: boolean,
	): Unsubscribe {
		let eventListeners = listeners.get(event);
		if (!eventListeners) {
			eventListeners = new Set();
			listeners.set(event, eventListeners);
		}

		const entry: ListenerEntry<unknown> = {
			handler: handler as EventHandler<unknown>,
			once,
		};
		eventListeners.add(entry);

		return () => {
			eventListeners.delete(entry);
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
		};
	}

	const bus: EventBus<T> = {
		on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
			return addListener(event, handler, false);
		},
		once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
			return addListener(event, handler, true);
		},
		off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): EventBus<T> {
			const eventListeners = listeners.get(event);
			if (!eventListeners) {
				return bus;
			}
			for (const entry of eventListeners) {
				if (entry.handler === handler) {
					eventListeners.delete(entry);
					break;
				}
			}
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
			return bus;
		},
		emit<K extends keyof T>(event: K, payload: T[K]): boolean {
			const eventListeners = listeners.get(event);
			if (!eventListeners || eventListeners.size === 0) {
				return false;
			}
			const toRemove: ListenerEntry<unknown>[] = [];
			for (const entry of eventListeners) {
				(entry.handler as EventHandler<T[K]>)(payload);
				if (entry.once) {
					toRemove.push(entry);
				}
			}
			for (const entry of toRemove) {
				eventListeners.delete(entry);
			}
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
			return true;
		},
		removeAllListeners<K extends keyof T>(event?: K): EventBus<T> {
			if (event === undefined) {
				listeners.clear();
			} else {
				listeners.delete(event);
			}
			return bus;
		},
		listenerCount<K extends keyof T>(event: K): number {
			const eventListeners = listeners.get(event);
			return eventListeners?.size ?? 0;
		},
		eventNames(): Array<keyof T> {
			return Array.from(listeners.keys());
		},
		hasListeners<K extends keyof T>(event: K): boolean {
			return bus.listenerCount(event) > 0;
		},
	};

	return bus;
}
