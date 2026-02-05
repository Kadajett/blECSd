/**
 * Tests for entity disposal and cleanup system.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendChild, getChildren } from '../components/hierarchy';
import { addEntity, createWorld, entityExists } from '../core/ecs';
import {
	clearCleanupCallbacks,
	clearDestroyQueue,
	destroyAllChildren,
	destroyEntity,
	flushDestroyQueue,
	getDestroyQueueSize,
	isMarkedForDestruction,
	registerCleanupCallback,
	resetDisposalState,
} from './disposal';
import { createEventBus } from './events';
import { getLifecycleEventBus, type LifecycleEventMap } from './lifecycleEvents';
import type { World } from './types';

describe('disposal', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetDisposalState();
	});

	describe('destroyEntity', () => {
		it('queues entity for deferred destruction', () => {
			const entity = addEntity(world);

			destroyEntity(world, entity);

			expect(isMarkedForDestruction(entity)).toBe(true);
			expect(entityExists(world, entity)).toBe(true); // Still exists until flushed
		});

		it('destroys entity immediately when immediate option is true', () => {
			const entity = addEntity(world);

			destroyEntity(world, entity, { immediate: true });

			expect(isMarkedForDestruction(entity)).toBe(false);
			expect(entityExists(world, entity)).toBe(false);
		});

		it('queues children for destruction by default', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			destroyEntity(world, parent);

			expect(isMarkedForDestruction(parent)).toBe(true);
			expect(isMarkedForDestruction(child1)).toBe(true);
			expect(isMarkedForDestruction(child2)).toBe(true);
		});

		it('does not queue children when destroyChildren is false', () => {
			const parent = addEntity(world);
			const child = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child);

			destroyEntity(world, parent, { destroyChildren: false });

			expect(isMarkedForDestruction(parent)).toBe(true);
			expect(isMarkedForDestruction(child)).toBe(false);
		});

		it('emits destroy event', () => {
			const entity = addEntity(world);
			const handler = vi.fn();

			const bus = getLifecycleEventBus(entity, () => createEventBus<LifecycleEventMap>());
			bus.on('destroy', handler);

			destroyEntity(world, entity, { immediate: true });

			expect(handler).toHaveBeenCalledWith({ entity });
		});

		it('does not emit event when emitEvent is false', () => {
			const entity = addEntity(world);
			const handler = vi.fn();

			const bus = getLifecycleEventBus(entity, () => createEventBus<LifecycleEventMap>());
			bus.on('destroy', handler);

			destroyEntity(world, entity, { immediate: true, emitEvent: false });

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('destroyAllChildren', () => {
		it('queues all children for destruction', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			destroyAllChildren(world, parent);

			expect(isMarkedForDestruction(parent)).toBe(false);
			expect(isMarkedForDestruction(child1)).toBe(true);
			expect(isMarkedForDestruction(child2)).toBe(true);
		});

		it('destroys children immediately when immediate option is true', () => {
			const parent = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child1);
			appendChild(world, parent, child2);

			destroyAllChildren(world, parent, { immediate: true });

			expect(entityExists(world, child1)).toBe(false);
			expect(entityExists(world, child2)).toBe(false);
			expect(entityExists(world, parent)).toBe(true);
		});

		it('handles entity without hierarchy component', () => {
			const entity = addEntity(world);

			// Should not throw
			destroyAllChildren(world, entity);

			expect(isMarkedForDestruction(entity)).toBe(false);
		});
	});

	describe('flushDestroyQueue', () => {
		it('destroys all queued entities', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			destroyEntity(world, entity1);
			destroyEntity(world, entity2);

			const count = flushDestroyQueue(world);

			expect(count).toBe(2);
			expect(entityExists(world, entity1)).toBe(false);
			expect(entityExists(world, entity2)).toBe(false);
		});

		it('returns 0 when queue is empty', () => {
			const count = flushDestroyQueue(world);
			expect(count).toBe(0);
		});

		it('destroys children before parents (depth-first)', () => {
			const parent = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child);
			appendChild(world, child, grandchild);

			const destroyOrder: number[] = [];
			registerCleanupCallback((_, entity) => {
				destroyOrder.push(entity);
			});

			destroyEntity(world, parent);
			flushDestroyQueue(world);

			// Grandchild should be destroyed before child, child before parent
			expect(destroyOrder.indexOf(grandchild)).toBeLessThan(destroyOrder.indexOf(child));
			expect(destroyOrder.indexOf(child)).toBeLessThan(destroyOrder.indexOf(parent));
		});

		it('clears the queue after processing', () => {
			const entity = addEntity(world);
			destroyEntity(world, entity);

			flushDestroyQueue(world);

			expect(getDestroyQueueSize(world)).toBe(0);
		});

		it('skips already destroyed entities', () => {
			const parent = addEntity(world);
			const child = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child);

			// Queue both but child will be destroyed when parent is processed
			destroyEntity(world, child);
			destroyEntity(world, parent);

			// Should not throw
			const count = flushDestroyQueue(world);

			expect(count).toBe(2);
		});
	});

	describe('registerCleanupCallback', () => {
		it('calls cleanup callback when entity is destroyed', () => {
			const callback = vi.fn();
			registerCleanupCallback(callback);

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(callback).toHaveBeenCalledWith(world, entity);
		});

		it('returns unregister function', () => {
			const callback = vi.fn();
			const unregister = registerCleanupCallback(callback);

			unregister();

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(callback).not.toHaveBeenCalled();
		});

		it('calls multiple callbacks in order', () => {
			const order: number[] = [];
			registerCleanupCallback(() => order.push(1));
			registerCleanupCallback(() => order.push(2));
			registerCleanupCallback(() => order.push(3));

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(order).toEqual([1, 2, 3]);
		});

		it('continues if callback throws', () => {
			const callback1 = vi.fn(() => {
				throw new Error('Test error');
			});
			const callback2 = vi.fn();

			registerCleanupCallback(callback1);
			registerCleanupCallback(callback2);

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});
	});

	describe('clearCleanupCallbacks', () => {
		it('clears all registered callbacks', () => {
			const callback = vi.fn();
			registerCleanupCallback(callback);

			clearCleanupCallbacks();

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('isMarkedForDestruction', () => {
		it('returns true for queued entities', () => {
			const entity = addEntity(world);
			destroyEntity(world, entity);

			expect(isMarkedForDestruction(entity)).toBe(true);
		});

		it('returns false for non-queued entities', () => {
			const entity = addEntity(world);

			expect(isMarkedForDestruction(entity)).toBe(false);
		});

		it('returns false after flush', () => {
			const entity = addEntity(world);
			destroyEntity(world, entity);
			flushDestroyQueue(world);

			expect(isMarkedForDestruction(entity)).toBe(false);
		});
	});

	describe('getDestroyQueueSize', () => {
		it('returns 0 for empty queue', () => {
			expect(getDestroyQueueSize(world)).toBe(0);
		});

		it('returns count of queued entities', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			destroyEntity(world, entity1);
			destroyEntity(world, entity2);

			expect(getDestroyQueueSize(world)).toBe(2);
		});

		it('returns global count when world not provided', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			destroyEntity(world, entity1);
			destroyEntity(world, entity2);

			expect(getDestroyQueueSize()).toBe(2);
		});
	});

	describe('clearDestroyQueue', () => {
		it('clears queue without destroying entities', () => {
			const entity = addEntity(world);
			destroyEntity(world, entity);

			clearDestroyQueue(world);

			expect(getDestroyQueueSize(world)).toBe(0);
			expect(entityExists(world, entity)).toBe(true);
			expect(isMarkedForDestruction(entity)).toBe(false);
		});
	});

	describe('hierarchy cleanup', () => {
		it('removes entity from parent on destruction', () => {
			const parent = addEntity(world);
			const child = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child);

			destroyEntity(world, child, { immediate: true, destroyChildren: false });

			const children = getChildren(world, parent);
			expect(children).not.toContain(child);
		});

		it('destroys nested children recursively', () => {
			const parent = addEntity(world);
			const child = addEntity(world);
			const grandchild = addEntity(world);
			const greatGrandchild = addEntity(world);

			// appendChild automatically sets up hierarchy
			appendChild(world, parent, child);
			appendChild(world, child, grandchild);
			appendChild(world, grandchild, greatGrandchild);

			destroyEntity(world, parent, { immediate: true });

			expect(entityExists(world, parent)).toBe(false);
			expect(entityExists(world, child)).toBe(false);
			expect(entityExists(world, grandchild)).toBe(false);
			expect(entityExists(world, greatGrandchild)).toBe(false);
		});
	});

	describe('resetDisposalState', () => {
		it('clears destroy queue', () => {
			const entity = addEntity(world);
			destroyEntity(world, entity);

			resetDisposalState();

			expect(getDestroyQueueSize()).toBe(0);
		});

		it('clears cleanup callbacks', () => {
			const callback = vi.fn();
			registerCleanupCallback(callback);

			resetDisposalState();

			const entity = addEntity(world);
			destroyEntity(world, entity, { immediate: true });

			expect(callback).not.toHaveBeenCalled();
		});
	});
});
