import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColliderType, setCollider } from '../components/collision';
import { setPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import {
	areColliding,
	collisionSystem,
	detectCollisions,
	getActiveCollisionCount,
	getActiveCollisions,
	getActiveTriggerCount,
	getActiveTriggers,
	getCollidingEntities,
	getCollisionEventBus,
	getTriggerZones,
	isColliding,
	isInTrigger,
	queryColliders,
	resetCollisionState,
} from './collisionSystem';

describe('Collision System', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		resetCollisionState();
	});

	afterEach(() => {
		resetCollisionState();
	});

	describe('queryColliders', () => {
		it('should return empty array for world with no colliders', () => {
			const result = queryColliders(world);
			expect(result).toEqual([]);
		});

		it('should return entities with colliders', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);
			setCollider(world, e1);
			setCollider(world, e3);

			const result = queryColliders(world);
			expect(result).toContain(e1);
			expect(result).toContain(e3);
			expect(result).not.toContain(e2);
		});
	});

	describe('detectCollisions', () => {
		it('should return empty array when no entities', () => {
			const pairs = detectCollisions(world);
			expect(pairs).toEqual([]);
		});

		it('should return empty array when entities have no position', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setCollider(world, e1);
			setCollider(world, e2);

			const pairs = detectCollisions(world);
			expect(pairs).toEqual([]);
		});

		it('should detect collision between overlapping entities', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0.5, 0.5);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			const pairs = detectCollisions(world);
			expect(pairs.length).toBe(1);
			expect(pairs[0]?.entityA).toBeLessThan(pairs[0]?.entityB ?? 0);
		});

		it('should not detect collision between non-overlapping entities', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 100, 100);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			const pairs = detectCollisions(world);
			expect(pairs).toEqual([]);
		});

		it('should respect layer filtering', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			// e1 on layer 1, only collides with layer 2
			setCollider(world, e1, { width: 2, height: 2, layer: 0b0001, mask: 0b0010 });
			// e2 on layer 4, only collides with layer 8
			setCollider(world, e2, { width: 2, height: 2, layer: 0b0100, mask: 0b1000 });

			const pairs = detectCollisions(world);
			expect(pairs).toEqual([]);
		});

		it('should detect collision when layers match', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			// e1 on layer 1, collides with layer 2
			setCollider(world, e1, { width: 2, height: 2, layer: 0b0001, mask: 0b0010 });
			// e2 on layer 2, collides with layer 1
			setCollider(world, e2, { width: 2, height: 2, layer: 0b0010, mask: 0b0001 });

			const pairs = detectCollisions(world);
			expect(pairs.length).toBe(1);
		});

		it('should mark collision as trigger when either entity is trigger', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			const pairs = detectCollisions(world);
			expect(pairs.length).toBe(1);
			expect(pairs[0]?.isTrigger).toBe(true);
		});

		it('should detect multiple collisions', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0.5, 0);
			setPosition(world, e3, 1, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });
			setCollider(world, e3, { width: 2, height: 2 });

			const pairs = detectCollisions(world);
			// e1-e2, e1-e3, e2-e3 all overlap
			expect(pairs.length).toBe(3);
		});
	});

	describe('collisionSystem', () => {
		it('should emit collisionStart event on new collision', () => {
			const bus = getCollisionEventBus();
			const handler = vi.fn();
			bus.on('collisionStart', handler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith({
				entityA: Math.min(e1, e2),
				entityB: Math.max(e1, e2),
			});

			bus.off('collisionStart', handler);
		});

		it('should not re-emit collisionStart for ongoing collision', () => {
			const bus = getCollisionEventBus();
			const handler = vi.fn();
			bus.on('collisionStart', handler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);
			collisionSystem(world);
			collisionSystem(world);

			expect(handler).toHaveBeenCalledTimes(1);

			bus.off('collisionStart', handler);
		});

		it('should emit collisionEnd when entities separate', () => {
			const bus = getCollisionEventBus();
			const endHandler = vi.fn();
			bus.on('collisionEnd', endHandler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);
			expect(endHandler).not.toHaveBeenCalled();

			// Move entities apart
			setPosition(world, e2, 100, 100);
			collisionSystem(world);

			expect(endHandler).toHaveBeenCalledTimes(1);

			bus.off('collisionEnd', endHandler);
		});

		it('should emit triggerEnter for trigger collisions', () => {
			const bus = getCollisionEventBus();
			const handler = vi.fn();
			bus.on('triggerEnter', handler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			expect(handler).toHaveBeenCalledTimes(1);

			bus.off('triggerEnter', handler);
		});

		it('should emit triggerExit when leaving trigger', () => {
			const bus = getCollisionEventBus();
			const exitHandler = vi.fn();
			bus.on('triggerExit', exitHandler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);
			expect(exitHandler).not.toHaveBeenCalled();

			// Move out of trigger
			setPosition(world, e1, 100, 100);
			collisionSystem(world);

			expect(exitHandler).toHaveBeenCalledTimes(1);

			bus.off('triggerExit', exitHandler);
		});

		it('should return the world', () => {
			const result = collisionSystem(world);
			expect(result).toBe(world);
		});
	});

	describe('getActiveCollisions', () => {
		it('should return store with size 0 when no collisions', () => {
			expect(getActiveCollisions().size).toBe(0);
			expect(getActiveCollisionCount()).toBe(0);
		});

		it('should track active collisions', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			expect(getActiveCollisions().size).toBe(1);
			expect(getActiveCollisionCount()).toBe(1);
		});

		it('should provide dense data array for iteration', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			const store = getActiveCollisions();
			expect(store.data.length).toBeGreaterThanOrEqual(1);
			const pair = store.data[0];
			expect(pair).toBeDefined();
			expect(pair?.entityA).toBe(Math.min(e1, e2));
			expect(pair?.entityB).toBe(Math.max(e1, e2));
		});
	});

	describe('getActiveTriggers', () => {
		it('should return store with size 0 when no triggers', () => {
			expect(getActiveTriggers().size).toBe(0);
			expect(getActiveTriggerCount()).toBe(0);
		});

		it('should track active triggers', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			expect(getActiveTriggers().size).toBe(1);
			expect(getActiveTriggerCount()).toBe(1);
		});
	});

	describe('isColliding', () => {
		it('should return false when entity is not colliding', () => {
			const e1 = addEntity(world);
			expect(isColliding(e1)).toBe(false);
		});

		it('should return true when entity is colliding', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			expect(isColliding(e1)).toBe(true);
			expect(isColliding(e2)).toBe(true);
		});
	});

	describe('isInTrigger', () => {
		it('should return false when entity is not in trigger', () => {
			const e1 = addEntity(world);
			expect(isInTrigger(e1)).toBe(false);
		});

		it('should return true when entity is in trigger', () => {
			const e1 = addEntity(world);
			const trigger = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, trigger, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, trigger, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			expect(isInTrigger(e1)).toBe(true);
		});
	});

	describe('getCollidingEntities', () => {
		it('should return empty array when not colliding', () => {
			const e1 = addEntity(world);
			expect(getCollidingEntities(e1)).toEqual([]);
		});

		it('should return colliding entities', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setPosition(world, e3, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });
			setCollider(world, e3, { width: 2, height: 2 });

			collisionSystem(world);

			const colliding = getCollidingEntities(e1);
			expect(colliding).toContain(e2);
			expect(colliding).toContain(e3);
			expect(colliding).not.toContain(e1);
		});
	});

	describe('getTriggerZones', () => {
		it('should return empty array when not in any trigger', () => {
			const e1 = addEntity(world);
			expect(getTriggerZones(e1)).toEqual([]);
		});

		it('should return trigger zones entity is in', () => {
			const player = addEntity(world);
			const zone1 = addEntity(world);
			const zone2 = addEntity(world);
			setPosition(world, player, 0, 0);
			setPosition(world, zone1, 0, 0);
			setPosition(world, zone2, 0, 0);
			setCollider(world, player, { width: 1, height: 1 });
			setCollider(world, zone1, { width: 10, height: 10, isTrigger: true });
			setCollider(world, zone2, { width: 10, height: 10, isTrigger: true });

			collisionSystem(world);

			const zones = getTriggerZones(player);
			expect(zones).toContain(zone1);
			expect(zones).toContain(zone2);
		});
	});

	describe('areColliding', () => {
		it('should return false when entities are not colliding', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 100, 100);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			expect(areColliding(e1, e2)).toBe(false);
		});

		it('should return true when entities are colliding', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			collisionSystem(world);

			expect(areColliding(e1, e2)).toBe(true);
			expect(areColliding(e2, e1)).toBe(true); // Order shouldn't matter
		});

		it('should return true for trigger collisions', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			expect(areColliding(e1, e2)).toBe(true);
		});
	});

	describe('resetCollisionState', () => {
		it('should clear all active collisions and triggers', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			expect(getActiveTriggers().size).toBe(1);

			resetCollisionState();

			expect(getActiveCollisions().size).toBe(0);
			expect(getActiveTriggers().size).toBe(0);
		});
	});

	describe('PackedStore collision lifecycle', () => {
		it('should correctly handle add-remove-add cycle for same pair', () => {
			const bus = getCollisionEventBus();
			const startHandler = vi.fn();
			const endHandler = vi.fn();
			bus.on('collisionStart', startHandler);
			bus.on('collisionEnd', endHandler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });

			// Frame 1: collision starts
			collisionSystem(world);
			expect(startHandler).toHaveBeenCalledTimes(1);
			expect(getActiveCollisionCount()).toBe(1);

			// Frame 2: entities separate
			setPosition(world, e2, 100, 100);
			collisionSystem(world);
			expect(endHandler).toHaveBeenCalledTimes(1);
			expect(getActiveCollisionCount()).toBe(0);

			// Frame 3: entities collide again (reuses freed slot in PackedStore)
			setPosition(world, e2, 0, 0);
			collisionSystem(world);
			expect(startHandler).toHaveBeenCalledTimes(2);
			expect(getActiveCollisionCount()).toBe(1);

			bus.off('collisionStart', startHandler);
			bus.off('collisionEnd', endHandler);
		});

		it('should correctly handle multiple pairs with interleaved removal', () => {
			const bus = getCollisionEventBus();
			const endHandler = vi.fn();
			bus.on('collisionEnd', endHandler);

			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setPosition(world, e3, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });
			setCollider(world, e3, { width: 2, height: 2 });

			// Frame 1: all three pairs active
			collisionSystem(world);
			expect(getActiveCollisionCount()).toBe(3);

			// Frame 2: e2 moves away (e1-e2 and e2-e3 end, e1-e3 stays)
			setPosition(world, e2, 100, 100);
			collisionSystem(world);
			expect(endHandler).toHaveBeenCalledTimes(2);
			expect(getActiveCollisionCount()).toBe(1);
			expect(areColliding(e1, e3)).toBe(true);
			expect(areColliding(e1, e2)).toBe(false);

			bus.off('collisionEnd', endHandler);
		});

		it('should handle mixed trigger and solid pairs correctly', () => {
			const bus = getCollisionEventBus();
			const collisionStart = vi.fn();
			const triggerEnter = vi.fn();
			bus.on('collisionStart', collisionStart);
			bus.on('triggerEnter', triggerEnter);

			const solid1 = addEntity(world);
			const solid2 = addEntity(world);
			const trigger1 = addEntity(world);
			setPosition(world, solid1, 0, 0);
			setPosition(world, solid2, 0, 0);
			setPosition(world, trigger1, 0, 0);
			setCollider(world, solid1, { width: 2, height: 2 });
			setCollider(world, solid2, { width: 2, height: 2 });
			setCollider(world, trigger1, { width: 2, height: 2, isTrigger: true });

			collisionSystem(world);

			// solid1-solid2 is a solid collision
			expect(collisionStart).toHaveBeenCalledTimes(1);
			// solid1-trigger1 and solid2-trigger1 are triggers
			expect(triggerEnter).toHaveBeenCalledTimes(2);
			expect(getActiveCollisionCount()).toBe(1);
			expect(getActiveTriggerCount()).toBe(2);

			bus.off('collisionStart', collisionStart);
			bus.off('triggerEnter', triggerEnter);
		});

		it('should provide dense data for cache-friendly iteration', () => {
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 0, 0);
			setPosition(world, e3, 0, 0);
			setCollider(world, e1, { width: 2, height: 2 });
			setCollider(world, e2, { width: 2, height: 2 });
			setCollider(world, e3, { width: 2, height: 2 });

			collisionSystem(world);

			const store = getActiveCollisions();
			// Dense data array should contain exactly 3 pairs (no gaps)
			expect(store.size).toBe(3);
			for (let i = 0; i < store.size; i++) {
				const pair = store.data[i];
				expect(pair).toBeDefined();
				expect(pair?.entityA).toBeDefined();
				expect(pair?.entityB).toBeDefined();
				expect(pair?.isTrigger).toBe(false);
			}
		});
	});
});

describe('Collision with different collider types', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		resetCollisionState();
	});

	afterEach(() => {
		resetCollisionState();
	});

	it('should detect circle vs circle collision', () => {
		const e1 = addEntity(world);
		const e2 = addEntity(world);
		setPosition(world, e1, 0, 0);
		setPosition(world, e2, 2, 0);
		setCollider(world, e1, { type: ColliderType.CIRCLE, width: 4 }); // radius 2
		setCollider(world, e2, { type: ColliderType.CIRCLE, width: 4 }); // radius 2

		collisionSystem(world);

		expect(areColliding(e1, e2)).toBe(true);
	});

	it('should detect circle vs box collision', () => {
		const circle = addEntity(world);
		const box = addEntity(world);
		setPosition(world, circle, 0, 0);
		setPosition(world, box, 2, 0);
		setCollider(world, circle, { type: ColliderType.CIRCLE, width: 4 }); // radius 2
		setCollider(world, box, { type: ColliderType.BOX, width: 2, height: 2 });

		collisionSystem(world);

		expect(areColliding(circle, box)).toBe(true);
	});

	it('should not detect circle vs box collision when far apart', () => {
		const circle = addEntity(world);
		const box = addEntity(world);
		setPosition(world, circle, 0, 0);
		setPosition(world, box, 20, 0);
		setCollider(world, circle, { type: ColliderType.CIRCLE, width: 4 }); // radius 2
		setCollider(world, box, { type: ColliderType.BOX, width: 2, height: 2 });

		collisionSystem(world);

		expect(areColliding(circle, box)).toBe(false);
	});
});
