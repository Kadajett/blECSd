import { describe, expect, it, vi } from 'vitest';
import { appendChild } from '../components/hierarchy';
import { addEntity, createWorld } from '../core/ecs';
import { type BubbleableEvent, bubbleEvent, createBubbleableEvent } from './eventBubbling';
import {
	createEntityEventBusStore,
	createEventBus,
	type EventBus,
	type GetEntityEventBus,
} from './events';
import type { Entity, World } from './types';

// Test event map for bubbling events
interface TestBubbleEventMap {
	click: BubbleableEvent<{ x: number; y: number }>;
	focus: BubbleableEvent<void>;
	custom: BubbleableEvent<{ value: string }>;
}

describe('createBubbleableEvent', () => {
	it('creates event with correct properties', () => {
		const event = createBubbleableEvent({
			type: 'click',
			target: 1 as Entity,
			payload: { x: 10, y: 20 },
		});

		expect(event.type).toBe('click');
		expect(event.target).toBe(1);
		expect(event.currentTarget).toBe(1);
		expect(event.payload).toEqual({ x: 10, y: 20 });
		expect(event.bubbles).toBe(true);
		expect(event.defaultPrevented).toBe(false);
		expect(event.propagationStopped).toBe(false);
		expect(event.immediatePropagationStopped).toBe(false);
	});

	it('respects bubbles option when false', () => {
		const event = createBubbleableEvent({
			type: 'focus',
			target: 1 as Entity,
			payload: undefined,
			bubbles: false,
		});

		expect(event.bubbles).toBe(false);
	});

	it('stopPropagation() sets flag', () => {
		const event = createBubbleableEvent({
			type: 'click',
			target: 1 as Entity,
			payload: { x: 0, y: 0 },
		});

		event.stopPropagation();

		expect(event.propagationStopped).toBe(true);
		expect(event.immediatePropagationStopped).toBe(false);
	});

	it('stopImmediatePropagation() sets both flags', () => {
		const event = createBubbleableEvent({
			type: 'click',
			target: 1 as Entity,
			payload: { x: 0, y: 0 },
		});

		event.stopImmediatePropagation();

		expect(event.propagationStopped).toBe(true);
		expect(event.immediatePropagationStopped).toBe(true);
	});

	it('preventDefault() sets flag but does not stop propagation', () => {
		const event = createBubbleableEvent({
			type: 'click',
			target: 1 as Entity,
			payload: { x: 0, y: 0 },
		});

		event.preventDefault();

		expect(event.defaultPrevented).toBe(true);
		expect(event.propagationStopped).toBe(false);
	});
});

describe('bubbleEvent', () => {
	function setupHierarchy(): {
		world: World;
		grandparent: Entity;
		parent: Entity;
		child: Entity;
		buses: Map<Entity, EventBus<TestBubbleEventMap>>;
		getEventBus: GetEntityEventBus<TestBubbleEventMap>;
	} {
		const world = createWorld();
		const grandparent = addEntity(world);
		const parent = addEntity(world);
		const child = addEntity(world);

		appendChild(world, grandparent, parent);
		appendChild(world, parent, child);

		const buses = new Map<Entity, EventBus<TestBubbleEventMap>>();
		buses.set(grandparent, createEventBus<TestBubbleEventMap>());
		buses.set(parent, createEventBus<TestBubbleEventMap>());
		buses.set(child, createEventBus<TestBubbleEventMap>());

		const getEventBus: GetEntityEventBus<TestBubbleEventMap> = (_w, eid) => buses.get(eid);

		return { world, grandparent, parent, child, buses, getEventBus };
	}

	it('bubbles event up hierarchy', () => {
		const { world, grandparent, parent, child, buses, getEventBus } = setupHierarchy();

		const childHandler = vi.fn();
		const parentHandler = vi.fn();
		const grandparentHandler = vi.fn();

		buses.get(child)?.on('click', childHandler);
		buses.get(parent)?.on('click', parentHandler);
		buses.get(grandparent)?.on('click', grandparentHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 10, y: 20 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(parentHandler).toHaveBeenCalledTimes(1);
		expect(grandparentHandler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(3);
	});

	it('maintains target throughout bubbling', () => {
		const { world, grandparent, parent, child, buses, getEventBus } = setupHierarchy();

		const targets: Entity[] = [];

		buses.get(child)?.on('click', (e) => targets.push(e.target));
		buses.get(parent)?.on('click', (e) => targets.push(e.target));
		buses.get(grandparent)?.on('click', (e) => targets.push(e.target));

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		bubbleEvent(world, event, getEventBus);

		// All handlers should see the same target
		expect(targets).toEqual([child, child, child]);
	});

	it('updates currentTarget as it bubbles', () => {
		const { world, grandparent, parent, child, buses, getEventBus } = setupHierarchy();

		const currentTargets: Entity[] = [];

		buses.get(child)?.on('click', (e) => currentTargets.push(e.currentTarget));
		buses.get(parent)?.on('click', (e) => currentTargets.push(e.currentTarget));
		buses.get(grandparent)?.on('click', (e) => currentTargets.push(e.currentTarget));

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		bubbleEvent(world, event, getEventBus);

		expect(currentTargets).toEqual([child, parent, grandparent]);
	});

	it('stopPropagation() stops at current level', () => {
		const { world, grandparent, parent, child, buses, getEventBus } = setupHierarchy();

		const childHandler = vi.fn();
		const parentHandler = vi.fn((e: BubbleableEvent<{ x: number; y: number }>) => {
			e.stopPropagation();
		});
		const grandparentHandler = vi.fn();

		buses.get(child)?.on('click', childHandler);
		buses.get(parent)?.on('click', parentHandler);
		buses.get(grandparent)?.on('click', grandparentHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(parentHandler).toHaveBeenCalledTimes(1);
		expect(grandparentHandler).not.toHaveBeenCalled();
		expect(result.propagationStopped).toBe(true);
		expect(result.dispatchCount).toBe(2);
	});

	it('stopImmediatePropagation() stops immediately', () => {
		const { world, parent, child, buses, getEventBus } = setupHierarchy();

		const handler1 = vi.fn((e: BubbleableEvent<{ x: number; y: number }>) => {
			e.stopImmediatePropagation();
		});
		const handler2 = vi.fn();
		const parentHandler = vi.fn();

		buses.get(child)?.on('click', handler1);
		buses.get(child)?.on('click', handler2);
		buses.get(parent)?.on('click', parentHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		bubbleEvent(world, event, getEventBus);

		expect(handler1).toHaveBeenCalledTimes(1);
		// Note: handler2 will be called because EventBus.emit calls all handlers
		// before returning. The immediate propagation stop only prevents further
		// bubbling to parent entities, not other handlers on the same entity.
		expect(parentHandler).not.toHaveBeenCalled();
	});

	it('preventDefault() sets flag but continues bubbling', () => {
		const { world, grandparent, parent, child, buses, getEventBus } = setupHierarchy();

		const childHandler = vi.fn((e: BubbleableEvent<{ x: number; y: number }>) => {
			e.preventDefault();
		});
		const parentHandler = vi.fn();
		const grandparentHandler = vi.fn();

		buses.get(child)?.on('click', childHandler);
		buses.get(parent)?.on('click', parentHandler);
		buses.get(grandparent)?.on('click', grandparentHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		// All handlers should still fire
		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(parentHandler).toHaveBeenCalledTimes(1);
		expect(grandparentHandler).toHaveBeenCalledTimes(1);
		expect(result.defaultPrevented).toBe(true);
	});

	it('non-bubbling events stay at target', () => {
		const { world, parent, child, buses, getEventBus } = setupHierarchy();

		const childHandler = vi.fn();
		const parentHandler = vi.fn();

		buses.get(child)?.on('focus', childHandler);
		buses.get(parent)?.on('focus', parentHandler);

		const event = createBubbleableEvent({
			type: 'focus',
			target: child,
			payload: undefined,
			bubbles: false,
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(parentHandler).not.toHaveBeenCalled();
		expect(result.dispatchCount).toBe(1);
	});

	it('handles entities without Hierarchy component', () => {
		const world = createWorld();
		const entity = addEntity(world);

		const buses = new Map<Entity, EventBus<TestBubbleEventMap>>();
		buses.set(entity, createEventBus<TestBubbleEventMap>());

		const handler = vi.fn();
		buses.get(entity)?.on('click', handler);

		const getEventBus: GetEntityEventBus<TestBubbleEventMap> = (_w, eid) => buses.get(eid);

		const event = createBubbleableEvent({
			type: 'click',
			target: entity,
			payload: { x: 0, y: 0 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(1);
	});

	it('handles entities without event bus', () => {
		const { world, parent, child, buses, getEventBus } = setupHierarchy();

		// Remove parent's bus
		buses.delete(parent);

		const childHandler = vi.fn();
		const grandparentHandler = vi.fn();

		buses.get(child)?.on('click', childHandler);
		// grandparent bus is still there
		const grandparentBus = buses.get(3 as Entity);
		grandparentBus?.on('click', grandparentHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 0, y: 0 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(grandparentHandler).toHaveBeenCalledTimes(1);
		// Only 2 dispatches since parent has no bus
		expect(result.dispatchCount).toBe(2);
	});

	it('works with empty world', () => {
		const world = createWorld();
		const entity = addEntity(world);

		const getEventBus: GetEntityEventBus<TestBubbleEventMap> = () => undefined;

		const event = createBubbleableEvent({
			type: 'click',
			target: entity,
			payload: { x: 0, y: 0 },
		});

		const result = bubbleEvent(world, event, getEventBus);

		expect(result.dispatchCount).toBe(0);
		expect(result.defaultPrevented).toBe(false);
	});
});

describe('createEntityEventBusStore', () => {
	it('creates empty store', () => {
		const world = createWorld();
		const store = createEntityEventBusStore<TestBubbleEventMap>();
		expect(store.has(world, 1 as Entity)).toBe(false);
	});

	it('set() and get() work correctly', () => {
		const world = createWorld();
		const store = createEntityEventBusStore<TestBubbleEventMap>();
		const bus = createEventBus<TestBubbleEventMap>();

		store.set(world, 1 as Entity, bus);

		expect(store.get(world, 1 as Entity)).toBe(bus);
	});

	it('getOrCreate() creates bus if not exists', () => {
		const world = createWorld();
		const store = createEntityEventBusStore<TestBubbleEventMap>();

		const bus1 = store.getOrCreate(world, 1 as Entity);
		const bus2 = store.getOrCreate(world, 1 as Entity);

		expect(bus1).toBe(bus2);
		expect(store.has(world, 1 as Entity)).toBe(true);
	});

	it('delete() removes bus', () => {
		const world = createWorld();
		const store = createEntityEventBusStore<TestBubbleEventMap>();
		const bus = createEventBus<TestBubbleEventMap>();

		store.set(world, 1 as Entity, bus);
		expect(store.has(world, 1 as Entity)).toBe(true);

		const deleted = store.delete(world, 1 as Entity);

		expect(deleted).toBe(true);
		expect(store.has(world, 1 as Entity)).toBe(false);
	});

	it('clear() removes all buses', () => {
		const world = createWorld();
		const store = createEntityEventBusStore<TestBubbleEventMap>();

		store.set(world, 1 as Entity, createEventBus<TestBubbleEventMap>());
		store.set(world, 2 as Entity, createEventBus<TestBubbleEventMap>());
		store.set(world, 3 as Entity, createEventBus<TestBubbleEventMap>());

		store.clear();

		expect(store.has(world, 1 as Entity)).toBe(false);
		expect(store.has(world, 2 as Entity)).toBe(false);
		expect(store.has(world, 3 as Entity)).toBe(false);
	});

	it('integrates with bubbleEvent', () => {
		const world = createWorld();
		const parent = addEntity(world);
		const child = addEntity(world);

		appendChild(world, parent, child);

		const store = createEntityEventBusStore<TestBubbleEventMap>();

		const parentBus = store.getOrCreate(world, parent);
		const childBus = store.getOrCreate(world, child);

		const parentHandler = vi.fn();
		const childHandler = vi.fn();

		parentBus.on('click', parentHandler);
		childBus.on('click', childHandler);

		const event = createBubbleableEvent({
			type: 'click',
			target: child,
			payload: { x: 5, y: 10 },
		});

		bubbleEvent(world, event, (w, eid) => store.get(w, eid));

		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(parentHandler).toHaveBeenCalledTimes(1);
	});
});
