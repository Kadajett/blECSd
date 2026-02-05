/**
 * Tests for debug overlay widget.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Content } from '../components/content';
import { Position } from '../components/position';
import { createWorld, hasComponent } from '../core/ecs';
import type { World } from '../core/types';
import {
	createDebugOverlay,
	createFrameRateGraph,
	createInputLogger,
	createMiniProfiler,
} from './overlay';

describe('debug overlay', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
	});

	describe('createDebugOverlay', () => {
		it('creates overlay with default config', () => {
			const overlay = createDebugOverlay(world);

			expect(overlay.visible).toBe(false);
			expect(overlay.entity).toBe(null);
			expect(overlay.config.toggleKey).toBe('F12');
			expect(overlay.config.showFPS).toBe(true);
		});

		it('accepts custom config', () => {
			const overlay = createDebugOverlay(world, {
				x: 10,
				y: 5,
				toggleKey: 'F11',
				showMemory: false,
			});

			expect(overlay.config.x).toBe(10);
			expect(overlay.config.y).toBe(5);
			expect(overlay.config.toggleKey).toBe('F11');
			expect(overlay.config.showMemory).toBe(false);
		});

		it('creates entity when visible on start', () => {
			const overlay = createDebugOverlay(world, {
				visibleOnStart: true,
			});

			expect(overlay.visible).toBe(true);
			expect(overlay.entity).not.toBe(null);
		});

		it('show creates entity', () => {
			const overlay = createDebugOverlay(world);
			expect(overlay.entity).toBe(null);

			overlay.show();

			expect(overlay.visible).toBe(true);
			expect(overlay.entity).not.toBe(null);
		});

		it('hide sets visibility to false', () => {
			const overlay = createDebugOverlay(world, { visibleOnStart: true });
			expect(overlay.visible).toBe(true);

			overlay.hide();

			expect(overlay.visible).toBe(false);
		});

		it('toggle switches visibility', () => {
			const overlay = createDebugOverlay(world);
			expect(overlay.visible).toBe(false);

			overlay.toggle();
			expect(overlay.visible).toBe(true);

			overlay.toggle();
			expect(overlay.visible).toBe(false);
		});

		it('update sets content when visible', () => {
			const overlay = createDebugOverlay(world, { visibleOnStart: true });
			const entity = overlay.entity!;

			overlay.update(world);

			expect(hasComponent(world, entity, Content)).toBe(true);
		});

		it('update does nothing when hidden', () => {
			const overlay = createDebugOverlay(world);

			// Should not throw
			overlay.update(world);
		});

		it('destroy removes entity', () => {
			const overlay = createDebugOverlay(world, { visibleOnStart: true });
			expect(overlay.entity).not.toBe(null);

			overlay.destroy();

			expect(overlay.entity).toBe(null);
			expect(overlay.visible).toBe(false);
		});

		it('entity has high z-index', () => {
			const overlay = createDebugOverlay(world, { visibleOnStart: true });
			const entity = overlay.entity!;

			expect(Position.z[entity]).toBe(9999);
		});
	});

	describe('createInputLogger', () => {
		it('creates logger with default max entries', () => {
			const logger = createInputLogger();

			expect(logger.maxEntries).toBe(20);
			expect(logger.entries.length).toBe(0);
		});

		it('creates logger with custom max entries', () => {
			const logger = createInputLogger(10);

			expect(logger.maxEntries).toBe(10);
		});

		it('logs entries', () => {
			const logger = createInputLogger();

			logger.log('key', 'a');
			logger.log('mouse', 'click @ 10,20');

			expect(logger.entries.length).toBe(2);
			expect(logger.entries[0]?.type).toBe('key');
			expect(logger.entries[0]?.detail).toBe('a');
			expect(logger.entries[1]?.type).toBe('mouse');
		});

		it('trims to max entries', () => {
			const logger = createInputLogger(3);

			logger.log('key', '1');
			logger.log('key', '2');
			logger.log('key', '3');
			logger.log('key', '4');

			expect(logger.entries.length).toBe(3);
			expect(logger.entries[0]?.detail).toBe('2');
			expect(logger.entries[2]?.detail).toBe('4');
		});

		it('getRecentEntries returns last N entries', () => {
			const logger = createInputLogger();

			logger.log('key', '1');
			logger.log('key', '2');
			logger.log('key', '3');
			logger.log('key', '4');
			logger.log('key', '5');

			const recent = logger.getRecentEntries(3);
			expect(recent.length).toBe(3);
			expect(recent[0]?.detail).toBe('3');
			expect(recent[2]?.detail).toBe('5');
		});

		it('clear removes all entries', () => {
			const logger = createInputLogger();

			logger.log('key', '1');
			logger.log('key', '2');
			logger.clear();

			expect(logger.entries.length).toBe(0);
		});
	});

	describe('createMiniProfiler', () => {
		it('measures section time', () => {
			const profiler = createMiniProfiler();

			profiler.start('test');
			// Small delay to ensure measurable time
			const start = performance.now();
			while (performance.now() - start < 1) {
				// busy wait
			}
			const elapsed = profiler.end('test');

			expect(elapsed).toBeGreaterThan(0);
		});

		it('calculates average time', () => {
			const profiler = createMiniProfiler();

			// Record known times via multiple start/end cycles
			profiler.start('test');
			profiler.end('test');
			profiler.start('test');
			profiler.end('test');

			const avg = profiler.getAverage('test');
			expect(avg).toBeGreaterThanOrEqual(0);
		});

		it('returns 0 for unknown section', () => {
			const profiler = createMiniProfiler();

			expect(profiler.getAverage('unknown')).toBe(0);
		});

		it('getAll returns all timings', () => {
			const profiler = createMiniProfiler();

			profiler.start('a');
			profiler.end('a');
			profiler.start('b');
			profiler.end('b');

			const all = profiler.getAll();
			expect(all.a).toBeDefined();
			expect(all.b).toBeDefined();
			expect(all.a?.count).toBe(1);
		});

		it('reset clears all data', () => {
			const profiler = createMiniProfiler();

			profiler.start('test');
			profiler.end('test');
			profiler.reset();

			expect(profiler.getAverage('test')).toBe(0);
			expect(Object.keys(profiler.getAll()).length).toBe(0);
		});

		it('tracks min/max times', () => {
			const profiler = createMiniProfiler();

			// Multiple samples
			profiler.start('test');
			profiler.end('test');
			profiler.start('test');
			profiler.end('test');
			profiler.start('test');
			profiler.end('test');

			const all = profiler.getAll();
			if (!all.test) {
				throw new Error('Expected profiling stats for test');
			}
			expect(all.test.min).toBeLessThanOrEqual(all.test.max);
		});
	});

	describe('createFrameRateGraph', () => {
		it('creates graph with default sample count', () => {
			const graph = createFrameRateGraph();

			expect(graph.getSamples().length).toBe(0);
		});

		it('creates graph with custom sample count', () => {
			const graph = createFrameRateGraph(30);

			// Add more samples than limit
			for (let i = 0; i < 50; i++) {
				graph.addSample(16.67);
			}

			expect(graph.getSamples().length).toBe(30);
		});

		it('addSample adds frame time', () => {
			const graph = createFrameRateGraph();

			graph.addSample(16.67);
			graph.addSample(16.67);

			expect(graph.getSamples().length).toBe(2);
		});

		it('getCurrentFPS calculates from last sample', () => {
			const graph = createFrameRateGraph();

			graph.addSample(16.67); // ~60fps

			const fps = graph.getCurrentFPS();
			expect(fps).toBeCloseTo(60, 0);
		});

		it('getAverageFPS calculates average', () => {
			const graph = createFrameRateGraph();

			// Add samples at 60fps
			for (let i = 0; i < 10; i++) {
				graph.addSample(16.67);
			}

			const avgFps = graph.getAverageFPS();
			expect(avgFps).toBeCloseTo(60, 0);
		});

		it('getMinMaxFPS returns range', () => {
			const graph = createFrameRateGraph();

			graph.addSample(16.67); // ~60fps
			graph.addSample(33.33); // ~30fps
			graph.addSample(8.33); // ~120fps

			const { min, max } = graph.getMinMaxFPS();
			expect(min).toBeCloseTo(30, 0);
			expect(max).toBeCloseTo(120, 0);
		});

		it('reset clears all samples', () => {
			const graph = createFrameRateGraph();

			graph.addSample(16.67);
			graph.addSample(16.67);
			graph.reset();

			expect(graph.getSamples().length).toBe(0);
			expect(graph.getCurrentFPS()).toBe(0);
		});

		it('handles empty graph gracefully', () => {
			const graph = createFrameRateGraph();

			expect(graph.getCurrentFPS()).toBe(0);
			expect(graph.getAverageFPS()).toBe(0);
			expect(graph.getMinMaxFPS()).toEqual({ min: 0, max: 0 });
		});
	});
});
