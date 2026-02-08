/**
 * Tests for event descendants propagation.
 */

import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { appendChild } from '../components/hierarchy';
import { addEntity } from './ecs';
import { type EmitDescendantsOptions, emitDescendants } from './eventDescendants';
import {
	createEntityEventBusStore,
	createEventBus,
	type EventMap,
	type GetEntityEventBus,
} from './events';
import type { Entity, World } from './types';
import { createWorld } from './world';

interface TestEvents extends EventMap {
	action: { type: string; value: number };
	custom: { message: string };
}

describe('emitDescendants', () => {
	it('should emit event to root entity only', () => {
		const world = createWorld();
		const root = addEntity(world);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);

		const handler = vi.fn();
		rootBus.on('action', handler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 42 }, getEventBus);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({ type: 'test', value: 42 });
		expect(result.dispatchCount).toBe(1);
		expect(result.maxDepth).toBe(0);
		expect(result.circularReferenceDetected).toBe(false);
	});

	it('should emit event to root and all descendants', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child1 = addEntity(world);
		const child2 = addEntity(world);
		const grandchild = addEntity(world);

		appendChild(world, root, child1);
		appendChild(world, root, child2);
		appendChild(world, child1, grandchild);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		const child1Bus = createEventBus<TestEvents>();
		const child2Bus = createEventBus<TestEvents>();
		const grandchildBus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);
		eventBuses.set(child1, child1Bus);
		eventBuses.set(child2, child2Bus);
		eventBuses.set(grandchild, grandchildBus);

		const rootHandler = vi.fn();
		const child1Handler = vi.fn();
		const child2Handler = vi.fn();
		const grandchildHandler = vi.fn();
		rootBus.on('action', rootHandler);
		child1Bus.on('action', child1Handler);
		child2Bus.on('action', child2Handler);
		grandchildBus.on('action', grandchildHandler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(
			world,
			root,
			'action',
			{ type: 'activate', value: 100 },
			getEventBus,
		);

		expect(rootHandler).toHaveBeenCalledTimes(1);
		expect(child1Handler).toHaveBeenCalledTimes(1);
		expect(child2Handler).toHaveBeenCalledTimes(1);
		expect(grandchildHandler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(4);
		expect(result.maxDepth).toBe(2);
		expect(result.circularReferenceDetected).toBe(false);
	});

	it('should skip root when includeRoot is false', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child = addEntity(world);

		appendChild(world, root, child);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		const childBus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);
		eventBuses.set(child, childBus);

		const rootHandler = vi.fn();
		const childHandler = vi.fn();
		rootBus.on('action', rootHandler);
		childBus.on('action', childHandler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus, {
			includeRoot: false,
		});

		expect(rootHandler).not.toHaveBeenCalled();
		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(1);
		expect(result.maxDepth).toBe(1);
	});

	it('should respect maxDepth option', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child = addEntity(world);
		const grandchild = addEntity(world);
		const greatGrandchild = addEntity(world);

		appendChild(world, root, child);
		appendChild(world, child, grandchild);
		appendChild(world, grandchild, greatGrandchild);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		const childBus = createEventBus<TestEvents>();
		const grandchildBus = createEventBus<TestEvents>();
		const greatGrandchildBus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);
		eventBuses.set(child, childBus);
		eventBuses.set(grandchild, grandchildBus);
		eventBuses.set(greatGrandchild, greatGrandchildBus);

		const rootHandler = vi.fn();
		const childHandler = vi.fn();
		const grandchildHandler = vi.fn();
		const greatGrandchildHandler = vi.fn();
		rootBus.on('action', rootHandler);
		childBus.on('action', childHandler);
		grandchildBus.on('action', grandchildHandler);
		greatGrandchildBus.on('action', greatGrandchildHandler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus, {
			maxDepth: 1,
		});

		expect(rootHandler).toHaveBeenCalledTimes(1);
		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(grandchildHandler).not.toHaveBeenCalled();
		expect(greatGrandchildHandler).not.toHaveBeenCalled();
		expect(result.dispatchCount).toBe(2);
		expect(result.maxDepth).toBe(1);
	});

	it('should handle entities without event buses', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child1 = addEntity(world);
		const child2 = addEntity(world);

		appendChild(world, root, child1);
		appendChild(world, root, child2);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		const child2Bus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);
		eventBuses.set(child2, child2Bus); // child1 has no bus

		const rootHandler = vi.fn();
		const child2Handler = vi.fn();
		rootBus.on('action', rootHandler);
		child2Bus.on('action', child2Handler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus);

		expect(rootHandler).toHaveBeenCalledTimes(1);
		expect(child2Handler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(2); // Only root and child2
	});

	it('should handle entities without hierarchy component', () => {
		const world = createWorld();
		const standalone = addEntity(world);

		const eventBuses = new Map();
		const standaloneBus = createEventBus<TestEvents>();
		eventBuses.set(standalone, standaloneBus);

		const handler = vi.fn();
		standaloneBus.on('action', handler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(
			world,
			standalone,
			'action',
			{ type: 'test', value: 1 },
			getEventBus,
		);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(1);
		expect(result.maxDepth).toBe(0);
	});

	it('should not detect circular references in normal hierarchies', () => {
		// Circular reference detection is defensive programming for corrupted data.
		// In normal usage with appendChild/removeChild, circular refs cannot happen.
		// This test verifies that normal hierarchies don't trigger false positives.
		const world = createWorld();
		const root = addEntity(world);
		const child = addEntity(world);
		const grandchild = addEntity(world);

		appendChild(world, root, child);
		appendChild(world, child, grandchild);

		const eventBuses = new Map();
		eventBuses.set(root, createEventBus<TestEvents>());
		eventBuses.set(child, createEventBus<TestEvents>());
		eventBuses.set(grandchild, createEventBus<TestEvents>());

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus);

		expect(result.circularReferenceDetected).toBe(false);
		expect(result.dispatchCount).toBe(3);
	});

	it('should emit different event types', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child = addEntity(world);

		appendChild(world, root, child);

		const eventBuses = new Map();
		const rootBus = createEventBus<TestEvents>();
		const childBus = createEventBus<TestEvents>();
		eventBuses.set(root, rootBus);
		eventBuses.set(child, childBus);

		const actionHandler = vi.fn();
		const customHandler = vi.fn();
		rootBus.on('action', actionHandler);
		rootBus.on('custom', customHandler);
		childBus.on('action', actionHandler);
		childBus.on('custom', customHandler);

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		// Emit action event
		emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus);
		expect(actionHandler).toHaveBeenCalledTimes(2);
		expect(customHandler).not.toHaveBeenCalled();

		// Emit custom event
		emitDescendants(world, root, 'custom', { message: 'hello' }, getEventBus);
		expect(customHandler).toHaveBeenCalledTimes(2);
	});

	it('should validate options schema', () => {
		const world = createWorld();
		const root = addEntity(world);

		const eventBuses = new Map();
		eventBuses.set(root, createEventBus<TestEvents>());

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		// Invalid maxDepth (not positive)
		expect(() =>
			emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus, {
				maxDepth: 0,
			} as EmitDescendantsOptions),
		).toThrow(ZodError);

		// Invalid maxDepth (negative)
		expect(() =>
			emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus, {
				maxDepth: -1,
			} as EmitDescendantsOptions),
		).toThrow(ZodError);

		// Invalid maxDepth (not integer)
		expect(() =>
			emitDescendants(world, root, 'action', { type: 'test', value: 1 }, getEventBus, {
				maxDepth: 1.5,
			} as EmitDescendantsOptions),
		).toThrow(ZodError);
	});

	it('should handle deep hierarchies', () => {
		const world = createWorld();
		const entities: Entity[] = [];

		// Create 10-level deep hierarchy
		for (let i = 0; i < 10; i++) {
			entities.push(addEntity(world));
		}

		for (let i = 0; i < 9; i++) {
			appendChild(world, entities[i] as Entity, entities[i + 1] as Entity);
		}

		const eventBuses = new Map();
		for (const entity of entities) {
			eventBuses.set(entity, createEventBus<TestEvents>());
		}

		const handlers = entities.map(() => vi.fn());
		for (let i = 0; i < entities.length; i++) {
			const bus = eventBuses.get(entities[i]);
			if (bus) {
				bus.on('action', handlers[i] as (event: { type: string; value: number }) => void);
			}
		}

		const getEventBus: GetEntityEventBus<TestEvents> = (_w: World, eid: Entity) =>
			eventBuses.get(eid);

		const result = emitDescendants(
			world,
			entities[0] as Entity,
			'action',
			{ type: 'test', value: 1 },
			getEventBus,
		);

		// All 10 entities should receive the event
		for (const handler of handlers) {
			expect(handler).toHaveBeenCalledTimes(1);
		}
		expect(result.dispatchCount).toBe(10);
		expect(result.maxDepth).toBe(9);
	});
});

describe('createEntityEventBusStore', () => {
	it('should get and set event buses', () => {
		const world = createWorld();
		const entity = addEntity(world);
		const store = createEntityEventBusStore<TestEvents>();
		const bus = createEventBus<TestEvents>();

		expect(store.get(world, entity)).toBeUndefined();

		store.set(world, entity, bus);
		expect(store.get(world, entity)).toBe(bus);
	});

	it('should check if entity has event bus', () => {
		const world = createWorld();
		const entity = addEntity(world);
		const store = createEntityEventBusStore<TestEvents>();

		expect(store.has(world, entity)).toBe(false);

		store.set(world, entity, createEventBus<TestEvents>());
		expect(store.has(world, entity)).toBe(true);
	});

	it('should delete event bus', () => {
		const world = createWorld();
		const entity = addEntity(world);
		const store = createEntityEventBusStore<TestEvents>();
		const bus = createEventBus<TestEvents>();

		store.set(world, entity, bus);
		expect(store.has(world, entity)).toBe(true);

		const deleted = store.delete(world, entity);
		expect(deleted).toBe(true);
		expect(store.has(world, entity)).toBe(false);

		// Deleting again should return false
		expect(store.delete(world, entity)).toBe(false);
	});

	it('should clear all event buses', () => {
		const world = createWorld();
		const entity1 = addEntity(world);
		const entity2 = addEntity(world);
		const store = createEntityEventBusStore<TestEvents>();

		store.set(world, entity1, createEventBus<TestEvents>());
		store.set(world, entity2, createEventBus<TestEvents>());

		expect(store.has(world, entity1)).toBe(true);
		expect(store.has(world, entity2)).toBe(true);

		store.clear();

		expect(store.has(world, entity1)).toBe(false);
		expect(store.has(world, entity2)).toBe(false);
	});

	it('should work with emitDescendants', () => {
		const world = createWorld();
		const root = addEntity(world);
		const child = addEntity(world);

		appendChild(world, root, child);

		const store = createEntityEventBusStore<TestEvents>();
		const rootBus = createEventBus<TestEvents>();
		const childBus = createEventBus<TestEvents>();

		store.set(world, root, rootBus);
		store.set(world, child, childBus);

		const rootHandler = vi.fn();
		const childHandler = vi.fn();
		rootBus.on('action', rootHandler);
		childBus.on('action', childHandler);

		const result = emitDescendants(world, root, 'action', { type: 'test', value: 1 }, store.get);

		expect(rootHandler).toHaveBeenCalledTimes(1);
		expect(childHandler).toHaveBeenCalledTimes(1);
		expect(result.dispatchCount).toBe(2);
	});
});
