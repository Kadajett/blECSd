/**
 * Tests for DevTools widget
 */

import { describe, expect, it } from 'vitest';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import { createScheduler } from '../core/scheduler';
import type { World } from '../core/types';
import { LoopPhase } from '../core/types';
import { createDevTools, type DevToolsConfig, resetDevToolsStore } from './devTools';

describe('DevTools widget', () => {
	let world: World;

	function setup(config: DevToolsConfig = {}) {
		resetDevToolsStore();
		world = createWorld();
		const eid = addEntity(world);
		return createDevTools(world, eid, config);
	}

	describe('creation', () => {
		it('creates devtools with default values', () => {
			const devTools = setup();
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
			expect(devTools.isVisible()).toBe(false);
			expect(devTools.getTab()).toBe('entities');
		});

		it('creates devtools with position preset', () => {
			const devTools = setup({ position: 'bottom' });
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates devtools at right position', () => {
			const devTools = setup({ position: 'right' });
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates devtools in floating position', () => {
			const devTools = setup({ position: 'floating' });
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates devtools with initial tab', () => {
			const devTools = setup({ initialTab: 'systems' });
			expect(devTools.getTab()).toBe('systems');
		});

		it('creates devtools with custom dimensions', () => {
			const devTools = setup({
				left: 10,
				top: 5,
				width: 60,
				height: 20,
			});
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates devtools with theme', () => {
			const devTools = setup({
				theme: {
					fg: '#00ff00',
					bg: '#000000',
					tabActiveFg: '#ffffff',
					tabActiveBg: '#0000ff',
				},
			});
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates devtools with scheduler', () => {
			const scheduler = createScheduler();
			const devTools = setup({ scheduler });
			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('starts hidden by default', () => {
			const devTools = setup();
			expect(devTools.isVisible()).toBe(false);
		});

		it('shows the devtools', () => {
			const devTools = setup();
			devTools.show();
			expect(devTools.isVisible()).toBe(true);
		});

		it('hides the devtools', () => {
			const devTools = setup();
			devTools.show();
			expect(devTools.isVisible()).toBe(true);
			devTools.hide();
			expect(devTools.isVisible()).toBe(false);
		});

		it('toggles visibility', () => {
			const devTools = setup();
			expect(devTools.isVisible()).toBe(false);

			devTools.toggle();
			expect(devTools.isVisible()).toBe(true);

			devTools.toggle();
			expect(devTools.isVisible()).toBe(false);
		});

		it('chains visibility methods', () => {
			const devTools = setup();
			const result = devTools.show().hide().toggle();
			expect(result).toBe(devTools);
		});
	});

	describe('focus', () => {
		it('focuses the devtools', () => {
			const devTools = setup();
			const result = devTools.focus();
			expect(result).toBe(devTools);
		});

		it('blurs the devtools', () => {
			const devTools = setup();
			const result = devTools.blur();
			expect(result).toBe(devTools);
		});
	});

	describe('tab management', () => {
		it('starts with initial tab', () => {
			const devTools = setup({ initialTab: 'components' });
			expect(devTools.getTab()).toBe('components');
		});

		it('sets active tab', () => {
			const devTools = setup();
			devTools.setTab('systems');
			expect(devTools.getTab()).toBe('systems');
		});

		it('switches between tabs', () => {
			const devTools = setup();

			devTools.setTab('entities');
			expect(devTools.getTab()).toBe('entities');

			devTools.setTab('components');
			expect(devTools.getTab()).toBe('components');

			devTools.setTab('systems');
			expect(devTools.getTab()).toBe('systems');

			devTools.setTab('events');
			expect(devTools.getTab()).toBe('events');
		});

		it('chains tab operations', () => {
			const devTools = setup();
			const result = devTools.setTab('systems');
			expect(result).toBe(devTools);
		});
	});

	describe('entity inspection', () => {
		it('gets empty entity list initially', () => {
			const devTools = setup();
			const entities = devTools.getEntities();
			// Will have some entities (tabs content, etc)
			expect(Array.isArray(entities)).toBe(true);
		});

		it('detects entities in world', () => {
			const devTools = setup();

			// Add some test entities
			addEntity(world);
			addEntity(world);

			devTools.refreshEntities();
			const entities = devTools.getEntities();

			// Should have at least our test entities
			expect(entities.length).toBeGreaterThanOrEqual(2);
		});

		it('gets entity by ID', () => {
			const devTools = setup();

			const testEid = addEntity(world);
			devTools.refreshEntities();

			const entity = devTools.getEntity(testEid);
			expect(entity).toBeDefined();
			expect(entity?.eid).toBe(testEid);
		});

		it('returns undefined for non-existent entity', () => {
			const devTools = setup();
			const entity = devTools.getEntity(99999);
			expect(entity).toBeUndefined();
		});

		it('chains refresh operations', () => {
			const devTools = setup();
			const result = devTools.refreshEntities();
			expect(result).toBe(devTools);
		});
	});

	describe('component filtering', () => {
		it('filters entities by component name', () => {
			const devTools = setup();

			const e1 = addEntity(world);
			addComponent(world, e1, Position);

			const e2 = addEntity(world);
			addComponent(world, e2, Renderable);

			devTools.filterByComponent('Position');
			// Filter applied, should still return results
			const entities = devTools.getEntities();
			expect(Array.isArray(entities)).toBe(true);
		});

		it('clears component filter', () => {
			const devTools = setup();

			devTools.filterByComponent('Position');
			devTools.clearFilter();

			const entities = devTools.getEntities();
			expect(Array.isArray(entities)).toBe(true);
		});

		it('chains filter operations', () => {
			const devTools = setup();
			const result = devTools.filterByComponent('Position').clearFilter();
			expect(result).toBe(devTools);
		});
	});

	describe('system monitoring', () => {
		it('gets empty system list without scheduler', () => {
			const devTools = setup();
			const systems = devTools.getSystems();
			expect(systems).toEqual([]);
		});

		it('gets system information with scheduler', () => {
			const scheduler = createScheduler();
			const devTools = setup({ scheduler });

			const systems = devTools.getSystems();
			expect(Array.isArray(systems)).toBe(true);
			expect(systems.length).toBeGreaterThan(0);
		});

		it('shows system counts per phase', () => {
			const scheduler = createScheduler();

			// Register some test systems
			scheduler.registerSystem(LoopPhase.UPDATE, () => world);
			scheduler.registerSystem(LoopPhase.RENDER, () => world);

			const devTools = setup({ scheduler });
			devTools.refreshSystems();

			const systems = devTools.getSystems();
			const updatePhase = systems.find((s) => s.phase === LoopPhase.UPDATE);
			const renderPhase = systems.find((s) => s.phase === LoopPhase.RENDER);

			expect(updatePhase?.systemCount).toBeGreaterThanOrEqual(1);
			expect(renderPhase?.systemCount).toBeGreaterThanOrEqual(1);
		});

		it('refreshes system stats', () => {
			const scheduler = createScheduler();
			const devTools = setup({ scheduler });

			const result = devTools.refreshSystems();
			expect(result).toBe(devTools);

			const systems = devTools.getSystems();
			expect(Array.isArray(systems)).toBe(true);
		});

		it('chains system refresh', () => {
			const scheduler = createScheduler();
			const devTools = setup({ scheduler });
			const result = devTools.refreshSystems();
			expect(result).toBe(devTools);
		});
	});

	describe('event logging', () => {
		it('starts with empty event log', () => {
			const devTools = setup();
			const log = devTools.getEventLog();
			expect(log).toEqual([]);
		});

		it('logs events', () => {
			const devTools = setup();

			devTools.logEvent('test_event', { foo: 'bar' });
			devTools.logEvent('another_event', { baz: 123 });

			const log = devTools.getEventLog();
			expect(log.length).toBe(2);
			expect(log[0]?.type).toBe('test_event');
			expect(log[1]?.type).toBe('another_event');
		});

		it('includes timestamp in log entries', () => {
			const devTools = setup();
			const before = Date.now();

			devTools.logEvent('test', {});

			const after = Date.now();
			const log = devTools.getEventLog();

			expect(log[0]?.timestamp).toBeGreaterThanOrEqual(before);
			expect(log[0]?.timestamp).toBeLessThanOrEqual(after);
		});

		it('includes event data', () => {
			const devTools = setup();
			const data = { x: 10, y: 20, name: 'test' };

			devTools.logEvent('move', data);

			const log = devTools.getEventLog();
			expect(log[0]?.data).toEqual(data);
		});

		it('limits event log to 100 entries', () => {
			const devTools = setup();

			// Log 150 events
			for (let i = 0; i < 150; i++) {
				devTools.logEvent(`event_${i}`, { index: i });
			}

			const log = devTools.getEventLog();
			expect(log.length).toBe(100);

			// Should keep the most recent 100
			expect(log[0]?.type).toBe('event_50');
			expect(log[99]?.type).toBe('event_149');
		});

		it('clears event log', () => {
			const devTools = setup();

			devTools.logEvent('test1', {});
			devTools.logEvent('test2', {});

			expect(devTools.getEventLog().length).toBe(2);

			devTools.clearEventLog();

			expect(devTools.getEventLog()).toEqual([]);
		});

		it('chains event logging operations', () => {
			const devTools = setup();
			const result = devTools.logEvent('test', {}).clearEventLog();
			expect(result).toBe(devTools);
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const devTools = setup();
			expect(() => devTools.destroy()).not.toThrow();
		});

		it('cleans up state on destroy', () => {
			const devTools = setup();
			devTools.logEvent('test', {});

			devTools.destroy();

			// After destroy, operations should not crash
			// (though they may not have effect)
			expect(() => devTools.getEventLog()).not.toThrow();
		});
	});

	describe('integration scenarios', () => {
		it('handles complete inspection workflow', () => {
			const scheduler = createScheduler();
			scheduler.registerSystem(LoopPhase.UPDATE, () => world);

			const devTools = setup({
				position: 'bottom',
				initialTab: 'entities',
				scheduler,
			});

			// Start hidden
			expect(devTools.isVisible()).toBe(false);

			// Toggle to show
			devTools.toggle();
			expect(devTools.isVisible()).toBe(true);

			// Add some entities
			const e1 = addEntity(world);
			addComponent(world, e1, Position);

			// Inspect entities
			devTools.refreshEntities();
			const entities = devTools.getEntities();
			expect(entities.length).toBeGreaterThan(0);

			// Check systems
			devTools.setTab('systems');
			const systems = devTools.getSystems();
			expect(systems.length).toBeGreaterThan(0);

			// Log events
			devTools.setTab('events');
			devTools.logEvent('player_moved', { x: 10, y: 20 });
			expect(devTools.getEventLog().length).toBe(1);
		});

		it('handles theme customization', () => {
			const devTools = setup({
				theme: {
					fg: '#00ff00',
					bg: '#000000',
					borderFg: '#ffffff',
					tabActiveFg: '#ffff00',
					tabActiveBg: '#0000ff',
					tabInactiveFg: '#888888',
					tabInactiveBg: '#222222',
				},
			});

			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('handles custom position and dimensions', () => {
			const devTools = setup({
				position: 'floating',
				left: 20,
				top: 10,
				width: 60,
				height: 15,
			});

			expect(devTools.eid).toBeGreaterThanOrEqual(0);
		});

		it('handles rapid toggle operations', () => {
			const devTools = setup();

			for (let i = 0; i < 10; i++) {
				devTools.toggle();
			}

			// Should end up hidden (started hidden, 10 toggles = even number)
			expect(devTools.isVisible()).toBe(false);
		});

		it('handles multiple event logs', () => {
			const devTools = setup();

			// Log various event types
			devTools.logEvent('init', { app: 'test' });
			devTools.logEvent('user_action', { action: 'click', x: 10, y: 20 });
			devTools.logEvent('network', { url: '/api/data', status: 200 });
			devTools.logEvent('error', { message: 'test error', code: 500 });

			const log = devTools.getEventLog();
			expect(log.length).toBe(4);
			expect(log.map((e) => e.type)).toEqual(['init', 'user_action', 'network', 'error']);
		});

		it('handles filter and refresh together', () => {
			const devTools = setup();

			// Add entities with components
			const e1 = addEntity(world);
			addComponent(world, e1, Position);

			const e2 = addEntity(world);
			addComponent(world, e2, Renderable);

			// Filter and refresh
			devTools.filterByComponent('Position').refreshEntities();

			const entities = devTools.getEntities();
			expect(Array.isArray(entities)).toBe(true);

			// Clear filter and refresh again
			devTools.clearFilter().refreshEntities();
		});
	});

	describe('chainability', () => {
		it('chains all operations', () => {
			const scheduler = createScheduler();
			const devTools = setup({ scheduler });

			const result = devTools
				.show()
				.focus()
				.setTab('systems')
				.refreshSystems()
				.setTab('entities')
				.refreshEntities()
				.logEvent('test', {})
				.filterByComponent('Position')
				.clearFilter()
				.clearEventLog()
				.hide()
				.blur();

			expect(result).toBe(devTools);
		});
	});
});
