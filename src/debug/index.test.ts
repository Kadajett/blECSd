/**
 * Tests for debug utilities.
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setDimensions } from '../components/dimensions';
import { focus, makeFocusable } from '../components/focusable';
import { setParent } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { setEntityData } from '../core/entityData';
import type { World } from '../core/types';
import {
	enableDebugBounds,
	enableSystemTiming,
	formatEntityInspection,
	formatWorldInspection,
	getDebugBoundsConfig,
	getDebugBoundsEntities,
	getEntitySummary,
	getPerformanceStats,
	getSystemTimings,
	inspectEntity,
	inspectWorld,
	isDebugBoundsEnabled,
	isSystemTimingEnabled,
	logEntity,
	logWorld,
	recordSystemTime,
	resetPerformanceStatsCache,
	resetSystemTimings,
	timedSystem,
} from './index';

describe('debug utilities', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		enableSystemTiming(false);
		resetSystemTimings();
		resetPerformanceStatsCache();
	});

	afterEach(() => {
		enableSystemTiming(false);
		resetSystemTimings();
		resetPerformanceStatsCache();
		enableDebugBounds(false);
	});

	describe('inspectEntity', () => {
		it('returns entity info with components', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20, 5);
			setDimensions(world, eid, 40, 10);

			const info = inspectEntity(world, eid);

			expect(info.entity).toBe(eid);
			expect(info.components.length).toBeGreaterThan(0);

			const posComp = info.components.find((c) => c.name === 'Position');
			expect(posComp).toBeDefined();
			expect(posComp?.data['x']).toBe(10);
			expect(posComp?.data['y']).toBe(20);
		});

		it('includes entity name if set', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setEntityData(eid, 'name', 'TestEntity');

			const info = inspectEntity(world, eid);

			expect(info.name).toBe('TestEntity');
		});

		it('includes parent and children', () => {
			const parent = addEntity(world);
			const child = addEntity(world);
			setPosition(world, parent, 0, 0);
			setPosition(world, child, 0, 0);
			setParent(world, child, parent);

			const childInfo = inspectEntity(world, child);
			const parentInfo = inspectEntity(world, parent);

			expect(childInfo.parent).toBe(parent);
			expect(parentInfo.children).toContain(child);
		});

		it('handles entity with no components', () => {
			const eid = addEntity(world);

			const info = inspectEntity(world, eid);

			expect(info.entity).toBe(eid);
			expect(info.components.length).toBe(0);
		});
	});

	describe('formatEntityInspection', () => {
		it('formats entity info as string', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setEntityData(eid, 'name', 'MyBox');

			const info = inspectEntity(world, eid);
			const formatted = formatEntityInspection(info);

			expect(formatted).toContain('Entity');
			expect(formatted).toContain('MyBox');
			expect(formatted).toContain('Position');
		});

		it('includes parent/children info', () => {
			const parent = addEntity(world);
			const child = addEntity(world);
			setPosition(world, parent, 0, 0);
			setPosition(world, child, 0, 0);
			setParent(world, child, parent);

			const info = inspectEntity(world, child);
			const formatted = formatEntityInspection(info);

			expect(formatted).toContain('Parent');
		});
	});

	describe('inspectWorld', () => {
		it('returns world statistics', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setPosition(world, eid2, 10, 10);
			setDimensions(world, eid1, 10, 10);

			const info = inspectWorld(world);

			expect(info.entityCount).toBe(2);
			expect(info.componentCounts['Position']).toBe(2);
			expect(info.componentCounts['Dimensions']).toBe(1);
		});

		it('identifies hierarchy roots', () => {
			const root = addEntity(world);
			const child = addEntity(world);
			setPosition(world, root, 0, 0);
			setPosition(world, child, 0, 0);
			setParent(world, child, root);

			const info = inspectWorld(world);

			expect(info.hierarchyRoots).toContain(root);
			expect(info.hierarchyRoots).not.toContain(child);
		});
	});

	describe('formatWorldInspection', () => {
		it('formats world info as string', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			const info = inspectWorld(world);
			const formatted = formatWorldInspection(info);

			expect(formatted).toContain('World Statistics');
			expect(formatted).toContain('Entities: 1');
			expect(formatted).toContain('Position');
		});
	});

	describe('system timing', () => {
		it('tracks system execution time when enabled', () => {
			enableSystemTiming(true);
			expect(isSystemTimingEnabled()).toBe(true);

			recordSystemTime('testSystem', 5.5);
			recordSystemTime('testSystem', 4.5);

			const timings = getSystemTimings();
			expect(timings['testSystem']).toBe(5); // Average of 5.5 and 4.5
		});

		it('does not track when disabled', () => {
			enableSystemTiming(false);

			recordSystemTime('testSystem', 5);

			const timings = getSystemTimings();
			expect(timings['testSystem']).toBeUndefined();
		});

		it('clears timings when disabled', () => {
			enableSystemTiming(true);
			recordSystemTime('testSystem', 5);

			enableSystemTiming(false);

			const timings = getSystemTimings();
			expect(Object.keys(timings).length).toBe(0);
		});

		it('timedSystem wraps system with timing', () => {
			enableSystemTiming(true);

			const system = timedSystem('mySystem', (w) => w);
			system(world);

			const timings = getSystemTimings();
			expect(timings['mySystem']).toBeDefined();
			expect(timings['mySystem']).toBeGreaterThanOrEqual(0);
		});
	});

	describe('getPerformanceStats', () => {
		it('returns performance statistics', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			const stats = getPerformanceStats(world);

			expect(stats.entityCount).toBe(1);
			expect(typeof stats.fps).toBe('number');
			expect(typeof stats.frameTime).toBe('number');
		});

		it('uses loop stats when provided', () => {
			const mockLoop = {
				getStats: () => ({
					fps: 60,
					frameTime: 16.67,
					frameCount: 100,
					runningTime: 1.67,
				}),
			};

			const stats = getPerformanceStats(world, mockLoop);

			expect(stats.fps).toBe(60);
			expect(stats.frameTime).toBe(16.67);
			expect(stats.frameCount).toBe(100);
		});

		it('includes system timings', () => {
			enableSystemTiming(true);
			recordSystemTime('render', 2);
			recordSystemTime('update', 1);

			const stats = getPerformanceStats(world);

			expect(stats.systemTimings['render']).toBe(2);
			expect(stats.systemTimings['update']).toBe(1);
		});
	});

	describe('debug bounds', () => {
		it('is disabled by default', () => {
			expect(isDebugBoundsEnabled()).toBe(false);
		});

		it('can be enabled', () => {
			enableDebugBounds(true);
			expect(isDebugBoundsEnabled()).toBe(true);
		});

		it('accepts custom options', () => {
			enableDebugBounds(true, {
				showHitboxes: false,
				showPadding: true,
				color: 0xff0000ff,
			});

			const config = getDebugBoundsConfig();
			expect(config.showHitboxes).toBe(false);
			expect(config.showPadding).toBe(true);
			expect(config.color).toBe(0xff0000ff);
		});

		it('returns entities with position and dimensions', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setPosition(world, eid1, 0, 0);
			setDimensions(world, eid1, 10, 10);

			setPosition(world, eid2, 20, 20);
			setDimensions(world, eid2, 10, 10);

			// eid3 has no dimensions
			setPosition(world, eid3, 30, 30);

			enableDebugBounds(true);
			const entities = getDebugBoundsEntities(world);

			expect(entities).toContain(eid1);
			expect(entities).toContain(eid2);
			expect(entities).not.toContain(eid3);
		});

		it('returns empty array when disabled', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);

			enableDebugBounds(false);
			const entities = getDebugBoundsEntities(world);

			expect(entities.length).toBe(0);
		});
	});

	describe('getEntitySummary', () => {
		it('returns single-line summary', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 40, 10);
			setEntityData(eid, 'name', 'TestBox');

			const summary = getEntitySummary(world, eid);

			expect(summary).toContain('Entity');
			expect(summary).toContain('TestBox');
			expect(summary).toContain('10,20');
			expect(summary).toContain('40x10');
		});

		it('includes state flags', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);
			makeFocusable(world, eid, true);
			focus(world, eid);

			const summary = getEntitySummary(world, eid);

			expect(summary).toContain('focused');
		});
	});

	describe('logging', () => {
		it('logEntity outputs to console', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			logEntity(world, eid);

			expect(consoleSpy).toHaveBeenCalled();
			const output = consoleSpy.mock.calls[0]?.[0] as string;
			expect(output).toContain('[DEBUG]');
			expect(output).toContain('Entity');

			consoleSpy.mockRestore();
		});

		it('logWorld outputs to console', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			logWorld(world);

			expect(consoleSpy).toHaveBeenCalled();
			const output = consoleSpy.mock.calls[0]?.[0] as string;
			expect(output).toContain('[DEBUG]');
			expect(output).toContain('World Statistics');

			consoleSpy.mockRestore();
		});
	});
});
