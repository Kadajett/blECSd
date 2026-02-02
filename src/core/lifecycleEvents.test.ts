/**
 * Lifecycle events tests.
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus, type EventBus } from './events';
import {
	clearLifecycleEventBuses,
	emitAdopt,
	emitAttach,
	emitDestroy,
	emitDetach,
	emitRemove,
	emitReparent,
	getLifecycleEventBus,
	type LifecycleEventMap,
	onAdopt,
	onAttach,
	onDestroy,
	onDetach,
	onRemove,
	onReparent,
	removeLifecycleEventBus,
} from './lifecycleEvents';
import type { Entity } from './types';

describe('lifecycleEvents', () => {
	beforeEach(() => {
		clearLifecycleEventBuses();
	});

	const createBus = (): EventBus<LifecycleEventMap> => createEventBus<LifecycleEventMap>();

	describe('getLifecycleEventBus', () => {
		it('creates new event bus for entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const bus = getLifecycleEventBus(entity, createBus);

			expect(bus).toBeDefined();
		});

		it('returns same bus on subsequent calls', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const bus1 = getLifecycleEventBus(entity, createBus);
			const bus2 = getLifecycleEventBus(entity, createBus);

			expect(bus1).toBe(bus2);
		});

		it('creates different buses for different entities', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			const bus1 = getLifecycleEventBus(entity1, createBus);
			const bus2 = getLifecycleEventBus(entity2, createBus);

			expect(bus1).not.toBe(bus2);
		});
	});

	describe('removeLifecycleEventBus', () => {
		it('removes entity event bus', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const bus1 = getLifecycleEventBus(entity, createBus);
			removeLifecycleEventBus(entity);
			const bus2 = getLifecycleEventBus(entity, createBus);

			expect(bus1).not.toBe(bus2);
		});
	});

	describe('emitReparent', () => {
		it('emits reparent event with correct data', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const oldParent = addEntity(world);
			const newParent = addEntity(world);

			const bus = getLifecycleEventBus(entity, createBus);
			const handler = vi.fn();
			bus.on('reparent', handler);

			emitReparent(bus, entity, oldParent, newParent);

			expect(handler).toHaveBeenCalledWith({
				entity,
				oldParent,
				newParent,
			});
		});
	});

	describe('emitAdopt', () => {
		it('emits adopt event with correct data', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const bus = getLifecycleEventBus(parent, createBus);
			const handler = vi.fn();
			bus.on('adopt', handler);

			emitAdopt(bus, parent, child);

			expect(handler).toHaveBeenCalledWith({
				parent,
				child,
			});
		});
	});

	describe('emitAttach', () => {
		it('emits attach event with correct data', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const screen = addEntity(world) as Entity;

			const bus = getLifecycleEventBus(entity, createBus);
			const handler = vi.fn();
			bus.on('attach', handler);

			emitAttach(bus, entity, screen);

			expect(handler).toHaveBeenCalledWith({
				entity,
				screen,
			});
		});
	});

	describe('emitDetach', () => {
		it('emits detach event with correct data', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const screen = addEntity(world) as Entity;

			const bus = getLifecycleEventBus(entity, createBus);
			const handler = vi.fn();
			bus.on('detach', handler);

			emitDetach(bus, entity, screen);

			expect(handler).toHaveBeenCalledWith({
				entity,
				screen,
			});
		});
	});

	describe('emitRemove', () => {
		it('emits remove event with correct data', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const bus = getLifecycleEventBus(parent, createBus);
			const handler = vi.fn();
			bus.on('remove', handler);

			emitRemove(bus, parent, child);

			expect(handler).toHaveBeenCalledWith({
				parent,
				child,
			});
		});
	});

	describe('emitDestroy', () => {
		it('emits destroy event with correct data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const bus = getLifecycleEventBus(entity, createBus);
			const handler = vi.fn();
			bus.on('destroy', handler);

			emitDestroy(bus, entity);

			expect(handler).toHaveBeenCalledWith({
				entity,
			});
		});
	});

	describe('onReparent', () => {
		it('subscribes to reparent events', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const oldParent = addEntity(world);
			const newParent = addEntity(world);

			const handler = vi.fn();
			onReparent(entity, handler, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitReparent(bus, entity, oldParent, newParent);

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('returns unsubscribe function', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const oldParent = addEntity(world);
			const newParent = addEntity(world);

			const handler = vi.fn();
			const unsubscribe = onReparent(entity, handler, createBus);

			unsubscribe();

			const bus = getLifecycleEventBus(entity, createBus);
			emitReparent(bus, entity, oldParent, newParent);

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('onAdopt', () => {
		it('subscribes to adopt events', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const handler = vi.fn();
			onAdopt(parent, handler, createBus);

			const bus = getLifecycleEventBus(parent, createBus);
			emitAdopt(bus, parent, child);

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('returns unsubscribe function', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const handler = vi.fn();
			const unsubscribe = onAdopt(parent, handler, createBus);

			unsubscribe();

			const bus = getLifecycleEventBus(parent, createBus);
			emitAdopt(bus, parent, child);

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('onAttach', () => {
		it('subscribes to attach events', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const screen = addEntity(world) as Entity;

			const handler = vi.fn();
			onAttach(entity, handler, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitAttach(bus, entity, screen);

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('onDetach', () => {
		it('subscribes to detach events', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const screen = addEntity(world) as Entity;

			const handler = vi.fn();
			onDetach(entity, handler, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitDetach(bus, entity, screen);

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('onRemove', () => {
		it('subscribes to remove events', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			const handler = vi.fn();
			onRemove(parent, handler, createBus);

			const bus = getLifecycleEventBus(parent, createBus);
			emitRemove(bus, parent, child);

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('onDestroy', () => {
		it('subscribes to destroy events', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const handler = vi.fn();
			onDestroy(entity, handler, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitDestroy(bus, entity);

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('multiple listeners', () => {
		it('supports multiple listeners for same event', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const handler1 = vi.fn();
			const handler2 = vi.fn();
			onDestroy(entity, handler1, createBus);
			onDestroy(entity, handler2, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitDestroy(bus, entity);

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('supports multiple event types', () => {
			const world = createWorld();
			const entity = addEntity(world);
			const parent = addEntity(world);
			const screen = addEntity(world) as Entity;

			const reparentHandler = vi.fn();
			const attachHandler = vi.fn();
			const destroyHandler = vi.fn();

			onReparent(entity, reparentHandler, createBus);
			onAttach(entity, attachHandler, createBus);
			onDestroy(entity, destroyHandler, createBus);

			const bus = getLifecycleEventBus(entity, createBus);
			emitReparent(bus, entity, 0 as Entity, parent);
			emitAttach(bus, entity, screen);
			emitDestroy(bus, entity);

			expect(reparentHandler).toHaveBeenCalledTimes(1);
			expect(attachHandler).toHaveBeenCalledTimes(1);
			expect(destroyHandler).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearLifecycleEventBuses', () => {
		it('clears all event buses', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			const bus1 = getLifecycleEventBus(entity1, createBus);
			const bus2 = getLifecycleEventBus(entity2, createBus);

			clearLifecycleEventBuses();

			const newBus1 = getLifecycleEventBus(entity1, createBus);
			const newBus2 = getLifecycleEventBus(entity2, createBus);

			expect(newBus1).not.toBe(bus1);
			expect(newBus2).not.toBe(bus2);
		});
	});
});
