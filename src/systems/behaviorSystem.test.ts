/**
 * Tests for the Behavior system.
 * @module systems/behaviorSystem.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BehaviorType,
	resetBehaviorStore,
	setBehavior,
	setChase,
	setCustomBehavior,
	setFlee,
	setPatrol,
} from '../components/behavior';
import { Position, setPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createBehaviorSystem } from './behaviorSystem';

describe('behaviorSystem', () => {
	let world: World;
	let entity: Entity;
	let target: Entity;

	beforeEach(() => {
		world = createWorld();
		entity = addEntity(world);
		target = addEntity(world);
		resetBehaviorStore();
	});

	function runSystem(
		entities: readonly Entity[],
		delta = 1,
	): ReturnType<typeof createBehaviorSystem> {
		const system = createBehaviorSystem({ getDelta: () => delta }, () => entities);
		system(world);
		return system;
	}

	describe('createBehaviorSystem', () => {
		it('returns a system function', () => {
			const system = createBehaviorSystem({ getDelta: () => 0.016 }, () => []);
			expect(typeof system).toBe('function');
		});

		it('returns world from system call', () => {
			const system = createBehaviorSystem({ getDelta: () => 0.016 }, () => []);
			const result = system(world);
			expect(result).toBe(world);
		});
	});

	describe('patrol integration', () => {
		it('moves entity toward patrol waypoint', () => {
			setPosition(world, entity, 0, 0);
			setBehavior(world, entity, { speed: 5 });
			setPatrol(world, entity, [
				{ x: 10, y: 0 },
				{ x: 0, y: 0 },
			]);

			runSystem([entity], 1);

			const x = Position.x[entity] as number;
			expect(x).toBeGreaterThan(0);
		});

		it('skips entities without behavior', () => {
			setPosition(world, entity, 0, 0);
			// No behavior set
			expect(() => runSystem([entity])).not.toThrow();
		});
	});

	describe('chase integration', () => {
		it('moves entity toward target', () => {
			setPosition(world, entity, 0, 0);
			setPosition(world, target, 10, 0);
			setBehavior(world, entity, { speed: 2 });
			setChase(world, entity, target);

			runSystem([entity], 1);

			const x = Position.x[entity] as number;
			expect(x).toBeGreaterThan(0);
		});

		it('does not move when target has no position', () => {
			setPosition(world, entity, 5, 5);
			setBehavior(world, entity, { speed: 2 });
			setChase(world, entity, target); // target has no position

			runSystem([entity], 1);

			expect(Position.x[entity]).toBe(5);
			expect(Position.y[entity]).toBe(5);
		});
	});

	describe('flee integration', () => {
		it('moves entity away from target', () => {
			setPosition(world, entity, 5, 0);
			setPosition(world, target, 10, 0);
			setBehavior(world, entity, { speed: 2, fleeRange: 20 });
			setFlee(world, entity, target);

			runSystem([entity], 1);

			const x = Position.x[entity] as number;
			expect(x).toBeLessThan(5);
		});
	});

	describe('custom behavior integration', () => {
		it('executes custom callback', () => {
			const cb = vi.fn();
			setBehavior(world, entity);
			setCustomBehavior(world, entity, cb);

			runSystem([entity], 0.5);

			expect(cb).toHaveBeenCalledWith(world, entity, 0.5);
		});
	});

	describe('idle behavior', () => {
		it('does not move idle entities', () => {
			setPosition(world, entity, 5, 5);
			setBehavior(world, entity, { type: BehaviorType.Idle });

			runSystem([entity], 1);

			expect(Position.x[entity]).toBe(5);
			expect(Position.y[entity]).toBe(5);
		});
	});

	describe('custom position resolver', () => {
		it('uses custom position resolver', () => {
			const positions = new Map<number, { x: number; y: number }>();
			positions.set(entity, { x: 0, y: 0 });
			positions.set(target, { x: 10, y: 0 });

			const moved = { dx: 0, dy: 0 };

			const system = createBehaviorSystem(
				{
					getDelta: () => 1,
					getPosition: (_w, e) => positions.get(e),
					applyMovement: (_w, _e, dx, dy) => {
						moved.dx = dx;
						moved.dy = dy;
					},
				},
				() => [entity],
			);

			setBehavior(world, entity, { speed: 3 });
			setChase(world, entity, target);

			system(world);

			expect(moved.dx).toBeGreaterThan(0);
		});
	});

	describe('multiple entities', () => {
		it('processes multiple entities', () => {
			const e1 = entity;
			const e2 = addEntity(world);
			setPosition(world, e1, 0, 0);
			setPosition(world, e2, 20, 0);
			setPosition(world, target, 10, 0);

			setBehavior(world, e1, { speed: 2 });
			setChase(world, e1, target);

			setBehavior(world, e2, { speed: 2, fleeRange: 20 });
			setFlee(world, e2, target);

			runSystem([e1, e2], 1);

			// e1 should move right (toward target at 10)
			expect(Position.x[e1] as number).toBeGreaterThan(0);
			// e2 should move right (away from target at 10)
			expect(Position.x[e2] as number).toBeGreaterThan(20);
		});
	});
});
