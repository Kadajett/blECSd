import { beforeEach, describe, expect, it } from 'vitest';
import { Position } from '../../components/position';
import { Velocity } from '../../components/velocity';
import { hasComponent } from '../ecs';
import type { Entity, World } from '../types';
import { createWorld } from '../world';
import {
	acquireEntity,
	clearAllArchetypePools,
	clearArchetypePool,
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

	// =========================================================================
	// PackedStore-backed behavior tests
	// =========================================================================

	describe('PackedStore integration', () => {
		it('handles rapid acquire/release cycles without leaking handles', () => {
			registerArchetype({
				name: 'bullet',
				components: [Position],
				resetFns: [
					(_w, e) => {
						Position.x[e] = 0;
						Position.y[e] = 0;
					},
				],
			});

			for (let cycle = 0; cycle < 50; cycle++) {
				const eid = acquireEntity(world, 'bullet')!;
				Position.x[eid] = cycle;
				releaseEntity(world, 'bullet', eid);
			}

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(1);
			expect(stats.active).toBe(0);
			expect(stats.totalAllocations).toBe(50);
			expect(stats.totalRecycles).toBe(49); // First allocation is fresh
		});

		it('supports multiple concurrent entities from same pool', () => {
			registerArchetype({ name: 'bullet', components: [Position, Velocity] });

			const entities: Entity[] = [];
			for (let i = 0; i < 20; i++) {
				const eid = acquireEntity(world, 'bullet')!;
				Position.x[eid] = i;
				entities.push(eid);
			}

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.active).toBe(20);
			expect(stats.pooled).toBe(0);

			// Release half
			for (let i = 0; i < 10; i++) {
				releaseEntity(world, 'bullet', entities[i]!);
			}

			const stats2 = getArchetypePoolStats('bullet')!;
			expect(stats2.active).toBe(10);
			expect(stats2.pooled).toBe(10);
		});

		it('recycles entities in dense order from PackedStore', () => {
			registerArchetype({
				name: 'bullet',
				components: [Position],
				resetFns: [
					(_w, e) => {
						Position.x[e] = 0;
					},
				],
			});

			// Acquire 3 entities
			const e1 = acquireEntity(world, 'bullet')!;
			const e2 = acquireEntity(world, 'bullet')!;
			const e3 = acquireEntity(world, 'bullet')!;

			// Release in non-sequential order
			releaseEntity(world, 'bullet', e2);
			releaseEntity(world, 'bullet', e1);
			releaseEntity(world, 'bullet', e3);

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(3);
			expect(stats.active).toBe(0);

			// Re-acquire all 3 - they should come from the pool
			const r1 = acquireEntity(world, 'bullet')!;
			const r2 = acquireEntity(world, 'bullet')!;
			const r3 = acquireEntity(world, 'bullet')!;

			// All recycled entities should be from the original 3
			const originalIds = new Set([e1, e2, e3]);
			expect(originalIds.has(r1)).toBe(true);
			expect(originalIds.has(r2)).toBe(true);
			expect(originalIds.has(r3)).toBe(true);

			const stats2 = getArchetypePoolStats('bullet')!;
			expect(stats2.pooled).toBe(0);
			expect(stats2.active).toBe(3);
			expect(stats2.totalRecycles).toBe(3);
		});

		it('preallocated entities are reusable via PackedStore', () => {
			registerArchetype({
				name: 'bullet',
				components: [Position],
				resetFns: [
					(_w, e) => {
						Position.x[e] = 0;
					},
				],
			});

			preallocateEntities(world, 'bullet', 5);

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(5);

			// Acquire all preallocated
			const entities: Entity[] = [];
			for (let i = 0; i < 5; i++) {
				entities.push(acquireEntity(world, 'bullet')!);
			}

			const stats2 = getArchetypePoolStats('bullet')!;
			expect(stats2.pooled).toBe(0);
			expect(stats2.active).toBe(5);
			expect(stats2.totalRecycles).toBe(5);
		});

		it('clearArchetypePool resets PackedStore state', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const eid = acquireEntity(world, 'bullet')!;
			releaseEntity(world, 'bullet', eid);

			clearArchetypePool('bullet');

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(0);
			expect(stats.active).toBe(0);
		});

		it('handles release of double-released entity gracefully', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const eid = acquireEntity(world, 'bullet')!;
			expect(releaseEntity(world, 'bullet', eid)).toBe(true);
			expect(releaseEntity(world, 'bullet', eid)).toBe(false);

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(1);
		});

		it('maxPoolSize stat tracks the high watermark', () => {
			registerArchetype({ name: 'bullet', components: [Position] });

			const entities: Entity[] = [];
			for (let i = 0; i < 10; i++) {
				entities.push(acquireEntity(world, 'bullet')!);
			}

			// Release all to pool
			for (const eid of entities) {
				releaseEntity(world, 'bullet', eid);
			}

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.maxPoolSize).toBe(10);

			// Acquire some back
			acquireEntity(world, 'bullet');
			acquireEntity(world, 'bullet');

			const stats2 = getArchetypePoolStats('bullet')!;
			expect(stats2.maxPoolSize).toBe(10); // High watermark unchanged
		});

		it('maxSize limit removes components when pool is full', () => {
			registerArchetype({ name: 'bullet', components: [Position] }, { maxSize: 1 });

			const e1 = acquireEntity(world, 'bullet')!;
			const e2 = acquireEntity(world, 'bullet')!;

			releaseEntity(world, 'bullet', e1); // Goes to pool (size 1)
			const released = releaseEntity(world, 'bullet', e2); // Pool full

			expect(released).toBe(false);
			expect(hasComponent(world, e2, Position)).toBe(false);

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.pooled).toBe(1);
		});

		it('interleaved acquire/release maintains consistent state', () => {
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

			// Simulate a game loop: acquire some, release some, acquire more
			const active = new Set<Entity>();

			// Frame 1: spawn 5
			for (let i = 0; i < 5; i++) {
				active.add(acquireEntity(world, 'bullet')!);
			}
			expect(getArchetypePoolStats('bullet')!.active).toBe(5);

			// Frame 2: kill 2, spawn 3
			let count = 0;
			for (const eid of active) {
				if (count < 2) {
					releaseEntity(world, 'bullet', eid);
					active.delete(eid);
				}
				count++;
			}
			for (let i = 0; i < 3; i++) {
				active.add(acquireEntity(world, 'bullet')!);
			}

			const stats = getArchetypePoolStats('bullet')!;
			expect(stats.active).toBe(6); // 5 - 2 + 3
			expect(stats.pooled).toBe(0); // 2 released, 2 reused by the 3 spawns
		});
	});
});
