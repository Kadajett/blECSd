import { beforeEach, describe, expect, it } from 'vitest';
import { Position } from '../../components/position';
import { Velocity } from '../../components/velocity';
import { hasComponent } from '../ecs';
import type { Entity, World } from '../types';
import { createWorld } from '../world';
import {
	acquireEntity,
	clearAllArchetypePools,
	getArchetypePoolStats,
	getRecyclingStats,
	preallocateEntities,
	registerArchetype,
	releaseEntity,
	unregisterArchetype,
} from './archetypePool';

describe('ArchetypePool', () => {
	let world: World;

	beforeEach(() => {
		clearAllArchetypePools();
		world = createWorld() as World;
	});

	describe('registerArchetype', () => {
		it('registers a new archetype', () => {
			registerArchetype({
				name: 'bullet',
				components: [Position, Velocity],
			});

			const stats = getArchetypePoolStats('bullet');
			expect(stats).not.toBeNull();
			expect(stats!.name).toBe('bullet');
			expect(stats!.pooled).toBe(0);
			expect(stats!.active).toBe(0);
		});

		it('does not overwrite existing archetype', () => {
			registerArchetype({ name: 'test', components: [Position] });
			registerArchetype({ name: 'test', components: [Position, Velocity] });

			// Should still be the first registration
			const stats = getArchetypePoolStats('test');
			expect(stats).not.toBeNull();
		});
	});

	describe('preallocateEntities', () => {
		it('preallocates entities in the pool', () => {
			registerArchetype({ name: 'bullet', components: [Position, Velocity] });
			preallocateEntities(world, 'bullet', 10);

			const stats = getArchetypePoolStats('bullet');
			expect(stats!.pooled).toBe(10);
			expect(stats!.active).toBe(0);
		});
	});

	describe('acquireEntity', () => {
		it('returns null for unregistered archetype', () => {
			const eid = acquireEntity(world, 'nonexistent');
			expect(eid).toBeNull();
		});

		it('creates new entity when pool is empty', () => {
			registerArchetype({ name: 'bullet', components: [Position, Velocity] });

			const eid = acquireEntity(world, 'bullet');
			expect(eid).not.toBeNull();
			expect(hasComponent(world, eid!, Position)).toBe(true);
			expect(hasComponent(world, eid!, Velocity)).toBe(true);
		});

		it('reuses pooled entity', () => {
			registerArchetype({
				name: 'bullet',
				components: [Position, Velocity],
				resetFns: [
					(_w, e) => {
						Position.x[e] = 0;
						Position.y[e] = 0;
					},
					(_w, e) => {
						Velocity.x[e] = 0;
						Velocity.y[e] = 0;
					},
				],
			});

			const eid1 = acquireEntity(world, 'bullet')!;
			Position.x[eid1] = 100;
			releaseEntity(world, 'bullet', eid1);

			const eid2 = acquireEntity(world, 'bullet')!;
			expect(eid2).toBe(eid1); // Same entity reused
			expect(Position.x[eid2]).toBe(0); // Reset was applied
		});

		it('tracks allocation stats', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			acquireEntity(world, 'bullet');
			acquireEntity(world, 'bullet');

			const stats = getArchetypePoolStats('bullet');
			expect(stats!.totalAllocations).toBe(2);
			expect(stats!.active).toBe(2);
		});
	});

	describe('releaseEntity', () => {
		it('returns entity to pool', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const eid = acquireEntity(world, 'bullet')!;
			const released = releaseEntity(world, 'bullet', eid);

			expect(released).toBe(true);

			const stats = getArchetypePoolStats('bullet');
			expect(stats!.pooled).toBe(1);
			expect(stats!.active).toBe(0);
		});

		it('returns false for unknown entity', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const fakeEntity = 999 as Entity;
			const released = releaseEntity(world, 'bullet', fakeEntity);
			expect(released).toBe(false);
		});

		it('respects maxSize limit', () => {
			registerArchetype({ name: 'bullet', components: [Position] }, { maxSize: 2 });

			const e1 = acquireEntity(world, 'bullet')!;
			const e2 = acquireEntity(world, 'bullet')!;
			const e3 = acquireEntity(world, 'bullet')!;

			releaseEntity(world, 'bullet', e1);
			releaseEntity(world, 'bullet', e2);
			const released = releaseEntity(world, 'bullet', e3);

			expect(released).toBe(false); // Pool is full

			const stats = getArchetypePoolStats('bullet');
			expect(stats!.pooled).toBe(2);
		});
	});

	describe('getRecyclingStats', () => {
		it('returns overall statistics', () => {
			registerArchetype({ name: 'a', components: [Position] });
			registerArchetype({ name: 'b', components: [Velocity] });

			acquireEntity(world, 'a');
			acquireEntity(world, 'b');
			acquireEntity(world, 'b');

			const stats = getRecyclingStats();
			expect(stats.totalActive).toBe(3);
			expect(stats.totalPooled).toBe(0);
			expect(stats.archetypes.length).toBe(2);
		});

		it('tracks hit rate', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const e1 = acquireEntity(world, 'bullet')!;
			releaseEntity(world, 'bullet', e1);
			acquireEntity(world, 'bullet'); // Reuse from pool

			const stats = getArchetypePoolStats('bullet');
			expect(stats!.hitRate).toBe(0.5); // 1 recycle / 2 allocations
		});
	});

	describe('unregisterArchetype', () => {
		it('removes archetype registration', () => {
			registerArchetype({ name: 'test', components: [Position] });
			unregisterArchetype('test');

			expect(getArchetypePoolStats('test')).toBeNull();
		});
	});
});
