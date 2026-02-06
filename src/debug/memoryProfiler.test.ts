import { beforeEach, describe, expect, it } from 'vitest';
import { Position } from '../components/position';
import { addComponent, addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { createMemoryProfiler } from './memoryProfiler';

describe('MemoryProfiler', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
	});

	describe('snapshot', () => {
		it('takes a snapshot of current state', () => {
			const profiler = createMemoryProfiler();

			addEntity(world);
			addEntity(world);

			const snap = profiler.snapshot(world);

			expect(snap.entityCount).toBe(2);
			expect(snap.heapUsed).toBeGreaterThan(0);
			expect(snap.rss).toBeGreaterThan(0);
			expect(snap.timestamp).toBeGreaterThan(0);
		});

		it('tracks component counts when configured', () => {
			const profiler = createMemoryProfiler({
				trackedComponents: [{ component: Position, name: 'Position' }],
			});

			const e1 = addEntity(world);
			addComponent(world, e1, Position);

			const snap = profiler.snapshot(world);
			expect(snap.componentCounts.Position).toBe(1);
		});
	});

	describe('diff', () => {
		it('computes difference between snapshots', () => {
			const profiler = createMemoryProfiler();

			const snap1 = profiler.snapshot(world);

			addEntity(world);
			addEntity(world);
			addEntity(world);

			const snap2 = profiler.snapshot(world);
			const diff = profiler.diff(snap1, snap2);

			expect(diff.entityCountDelta).toBe(3);
			expect(diff.elapsed).toBeGreaterThanOrEqual(0);
		});

		it('detects possible entity leaks', () => {
			const profiler = createMemoryProfiler({
				entityLeakThreshold: 1,
			});

			const snap1: ReturnType<typeof profiler.snapshot> = {
				timestamp: Date.now() - 1000,
				entityCount: 0,
				componentCounts: {},
				heapUsed: 1000,
				heapTotal: 2000,
				rss: 3000,
				external: 0,
			};

			const snap2: ReturnType<typeof profiler.snapshot> = {
				timestamp: Date.now(),
				entityCount: 100,
				componentCounts: {},
				heapUsed: 1000,
				heapTotal: 2000,
				rss: 3000,
				external: 0,
			};

			const diff = profiler.diff(snap1, snap2);
			expect(diff.possibleLeaks.length).toBeGreaterThan(0);
			expect(diff.possibleLeaks[0]!.type).toBe('entity');
		});
	});

	describe('getReport', () => {
		it('generates a formatted report', () => {
			const profiler = createMemoryProfiler();

			addEntity(world);

			const report = profiler.getReport(world);
			expect(report).toContain('Memory Profile Report');
			expect(report).toContain('Entities:');
			expect(report).toContain('Heap Used:');
		});
	});

	describe('getSnapshots', () => {
		it('returns all taken snapshots', () => {
			const profiler = createMemoryProfiler();

			profiler.snapshot(world);
			profiler.snapshot(world);
			profiler.snapshot(world);

			expect(profiler.getSnapshots().length).toBe(3);
		});

		it('respects maxSnapshots limit', () => {
			const profiler = createMemoryProfiler({ maxSnapshots: 2 });

			profiler.snapshot(world);
			profiler.snapshot(world);
			profiler.snapshot(world);

			expect(profiler.getSnapshots().length).toBe(2);
		});
	});

	describe('reset', () => {
		it('clears all data', () => {
			const profiler = createMemoryProfiler();

			profiler.snapshot(world);
			profiler.snapshot(world);
			profiler.reset();

			expect(profiler.getSnapshots().length).toBe(0);
			expect(profiler.getLatestSnapshot()).toBeNull();
		});
	});
});
