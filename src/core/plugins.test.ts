/**
 * Tests for Plugin/Module System.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Plugin } from './plugins';
import {
	activatePlugin,
	clearPlugins,
	createPluginRegistry,
	deactivatePlugin,
	definePlugin,
	getPluginCount,
	getPlugins,
	hasPlugin,
	isPluginActive,
	PluginSchema,
	registerPlugin,
	unregisterPlugin,
	validatePluginConfig,
} from './plugins';
import { createScheduler } from './scheduler';
import type { System, World } from './types';
import { LoopPhase } from './types';
import { createWorld } from './world';

function makeSystem(label: string): System {
	const sys: System = (world: World): World => world;
	Object.defineProperty(sys, 'name', { value: label });
	return sys;
}

describe('createPluginRegistry', () => {
	it('creates an empty registry', () => {
		const registry = createPluginRegistry();
		expect(getPluginCount(registry)).toBe(0);
		expect(getPlugins(registry)).toEqual([]);
	});
});

describe('registerPlugin', () => {
	it('registers a minimal plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const result = registerPlugin(registry, scheduler, world, {
			name: 'test-plugin',
			version: '1.0.0',
		});

		expect(result.success).toBe(true);
		expect(result.systemsRegistered).toBe(0);
		expect(result.componentsRegistered).toBe(0);
		expect(hasPlugin(registry, 'test-plugin')).toBe(true);
		expect(getPluginCount(registry)).toBe(1);
	});

	it('registers systems with the scheduler', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const updateSys = makeSystem('updateSys');
		const renderSys = makeSystem('renderSys');

		const result = registerPlugin(registry, scheduler, world, {
			name: 'sys-plugin',
			version: '1.0.0',
			systems: [
				{ system: updateSys, phase: LoopPhase.UPDATE, priority: 5 },
				{ system: renderSys, phase: LoopPhase.RENDER },
			],
		});

		expect(result.success).toBe(true);
		expect(result.systemsRegistered).toBe(2);
		expect(scheduler.hasSystem(updateSys)).toBe(true);
		expect(scheduler.hasSystem(renderSys)).toBe(true);
		expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(1);
		expect(scheduler.getSystemCount(LoopPhase.RENDER)).toBe(1);
	});

	it('calls init hook on registration', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		let initCalled = false;
		const plugin: Plugin = {
			name: 'init-plugin',
			version: '1.0.0',
			init: (w: World): World => {
				initCalled = true;
				return w;
			},
		};

		registerPlugin(registry, scheduler, world, plugin);
		expect(initCalled).toBe(true);
	});

	it('rejects duplicate plugin names', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'dup',
			version: '1.0.0',
		});

		const result = registerPlugin(registry, scheduler, world, {
			name: 'dup',
			version: '2.0.0',
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('already registered');
		expect(getPluginCount(registry)).toBe(1);
	});

	it('rejects plugin with missing dependencies', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const result = registerPlugin(registry, scheduler, world, {
			name: 'dependent',
			version: '1.0.0',
			dependencies: ['missing-dep'],
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('Missing dependency');
		expect(result.error).toContain('missing-dep');
	});

	it('accepts plugin when dependencies are met', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'base',
			version: '1.0.0',
		});

		const result = registerPlugin(registry, scheduler, world, {
			name: 'dependent',
			version: '1.0.0',
			dependencies: ['base'],
		});

		expect(result.success).toBe(true);
	});

	it('rejects invalid plugin manifest', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const result = registerPlugin(registry, scheduler, world, {
			name: '',
			version: '1.0.0',
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('Invalid plugin manifest');
	});

	it('tracks components count', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const result = registerPlugin(registry, scheduler, world, {
			name: 'comp-plugin',
			version: '1.0.0',
			components: [
				{ name: 'Health', store: {} },
				{ name: 'Mana', store: {} },
			],
		});

		expect(result.success).toBe(true);
		expect(result.componentsRegistered).toBe(2);

		const plugins = getPlugins(registry);
		expect(plugins[0]?.componentCount).toBe(2);
	});
});

describe('unregisterPlugin', () => {
	it('removes a registered plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const sys = makeSystem('sys');

		registerPlugin(registry, scheduler, world, {
			name: 'removable',
			version: '1.0.0',
			systems: [{ system: sys, phase: LoopPhase.UPDATE }],
		});

		expect(hasPlugin(registry, 'removable')).toBe(true);

		const removed = unregisterPlugin(registry, scheduler, world, 'removable');
		expect(removed).toBe(true);
		expect(hasPlugin(registry, 'removable')).toBe(false);
		expect(scheduler.hasSystem(sys)).toBe(false);
	});

	it('calls cleanup hook', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		let cleanupCalled = false;

		registerPlugin(registry, scheduler, world, {
			name: 'cleanup-test',
			version: '1.0.0',
			cleanup: (w: World): World => {
				cleanupCalled = true;
				return w;
			},
		});

		unregisterPlugin(registry, scheduler, world, 'cleanup-test');
		expect(cleanupCalled).toBe(true);
	});

	it('returns false for non-existent plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const removed = unregisterPlugin(registry, scheduler, world, 'nonexistent');
		expect(removed).toBe(false);
	});

	it('prevents removing a plugin that others depend on', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'base',
			version: '1.0.0',
		});

		registerPlugin(registry, scheduler, world, {
			name: 'dependent',
			version: '1.0.0',
			dependencies: ['base'],
		});

		const removed = unregisterPlugin(registry, scheduler, world, 'base');
		expect(removed).toBe(false);
		expect(hasPlugin(registry, 'base')).toBe(true);
	});

	it('allows removing a dependency after dependent is removed', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'base',
			version: '1.0.0',
		});

		registerPlugin(registry, scheduler, world, {
			name: 'dependent',
			version: '1.0.0',
			dependencies: ['base'],
		});

		unregisterPlugin(registry, scheduler, world, 'dependent');
		const removed = unregisterPlugin(registry, scheduler, world, 'base');
		expect(removed).toBe(true);
		expect(getPluginCount(registry)).toBe(0);
	});
});

describe('getPlugins', () => {
	it('returns info for all registered plugins', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const sys = makeSystem('sys');

		registerPlugin(registry, scheduler, world, {
			name: 'alpha',
			version: '1.0.0',
			systems: [{ system: sys, phase: LoopPhase.UPDATE }],
		});

		registerPlugin(registry, scheduler, world, {
			name: 'beta',
			version: '2.0.0',
			dependencies: ['alpha'],
			components: [{ name: 'Foo', store: {} }],
		});

		const plugins = getPlugins(registry);
		expect(plugins).toHaveLength(2);

		const alpha = plugins.find((p) => p.name === 'alpha');
		expect(alpha).toBeDefined();
		expect(alpha?.version).toBe('1.0.0');
		expect(alpha?.systemCount).toBe(1);
		expect(alpha?.componentCount).toBe(0);
		expect(alpha?.dependencies).toEqual([]);

		const beta = plugins.find((p) => p.name === 'beta');
		expect(beta).toBeDefined();
		expect(beta?.version).toBe('2.0.0');
		expect(beta?.systemCount).toBe(0);
		expect(beta?.componentCount).toBe(1);
		expect(beta?.dependencies).toEqual(['alpha']);
	});
});

describe('clearPlugins', () => {
	it('removes all plugins and calls cleanup hooks', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const cleanupOrder: string[] = [];

		registerPlugin(registry, scheduler, world, {
			name: 'first',
			version: '1.0.0',
			cleanup: (w: World): World => {
				cleanupOrder.push('first');
				return w;
			},
		});

		registerPlugin(registry, scheduler, world, {
			name: 'second',
			version: '1.0.0',
			cleanup: (w: World): World => {
				cleanupOrder.push('second');
				return w;
			},
		});

		clearPlugins(registry, scheduler, world);

		expect(getPluginCount(registry)).toBe(0);
		// Should clean up in reverse order
		expect(cleanupOrder).toEqual(['second', 'first']);
	});

	it('unregisters all systems from scheduler', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const sys1 = makeSystem('sys1');
		const sys2 = makeSystem('sys2');

		registerPlugin(registry, scheduler, world, {
			name: 'p1',
			version: '1.0.0',
			systems: [{ system: sys1, phase: LoopPhase.UPDATE }],
		});

		registerPlugin(registry, scheduler, world, {
			name: 'p2',
			version: '1.0.0',
			systems: [{ system: sys2, phase: LoopPhase.RENDER }],
		});

		expect(scheduler.getTotalSystemCount()).toBe(2);

		clearPlugins(registry, scheduler, world);

		expect(scheduler.getTotalSystemCount()).toBe(0);
	});
});

describe('PluginSchema', () => {
	it('validates a valid plugin manifest', () => {
		const result = PluginSchema.safeParse({
			name: 'valid',
			version: '1.0.0',
			dependencies: ['dep1'],
			components: [{ name: 'Foo', store: {} }],
			systems: [
				{
					system: (w: World): World => w,
					phase: LoopPhase.UPDATE,
					priority: 5,
				},
			],
			init: (w: World): World => w,
			cleanup: (w: World): World => w,
		});

		expect(result.success).toBe(true);
	});

	it('rejects empty name', () => {
		const result = PluginSchema.safeParse({
			name: '',
			version: '1.0.0',
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty version', () => {
		const result = PluginSchema.safeParse({
			name: 'test',
			version: '',
		});
		expect(result.success).toBe(false);
	});

	it('accepts minimal manifest', () => {
		const result = PluginSchema.safeParse({
			name: 'minimal',
			version: '0.1.0',
		});
		expect(result.success).toBe(true);
	});
});

describe('hasPlugin', () => {
	it('returns false for empty registry', () => {
		const registry = createPluginRegistry();
		expect(hasPlugin(registry, 'anything')).toBe(false);
	});

	it('returns true for registered plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'exists',
			version: '1.0.0',
		});

		expect(hasPlugin(registry, 'exists')).toBe(true);
		expect(hasPlugin(registry, 'nope')).toBe(false);
	});
});

describe('scheduler phase integration', () => {
	it('plugin systems execute in correct phases', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const executionOrder: string[] = [];

		const earlyUpdateSys: System = (w: World): World => {
			executionOrder.push('early_update');
			return w;
		};

		const updateSys: System = (w: World): World => {
			executionOrder.push('update');
			return w;
		};

		const renderSys: System = (w: World): World => {
			executionOrder.push('render');
			return w;
		};

		registerPlugin(registry, scheduler, world, {
			name: 'ordered',
			version: '1.0.0',
			systems: [
				{ system: renderSys, phase: LoopPhase.RENDER },
				{ system: earlyUpdateSys, phase: LoopPhase.EARLY_UPDATE },
				{ system: updateSys, phase: LoopPhase.UPDATE },
			],
		});

		scheduler.run(world, 0.016);

		expect(executionOrder).toEqual(['early_update', 'update', 'render']);
	});

	it('plugin systems respect priority within a phase', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const executionOrder: string[] = [];

		const highPriSys: System = (w: World): World => {
			executionOrder.push('high');
			return w;
		};

		const lowPriSys: System = (w: World): World => {
			executionOrder.push('low');
			return w;
		};

		registerPlugin(registry, scheduler, world, {
			name: 'priority-test',
			version: '1.0.0',
			systems: [
				{ system: lowPriSys, phase: LoopPhase.UPDATE, priority: 10 },
				{ system: highPriSys, phase: LoopPhase.UPDATE, priority: 1 },
			],
		});

		scheduler.run(world, 0.016);

		// Lower priority number = runs first
		expect(executionOrder).toEqual(['high', 'low']);
	});
});

describe('definePlugin', () => {
	it('creates a plugin from config', () => {
		const plugin = definePlugin({
			name: 'test',
			version: '1.0.0',
		});

		expect(plugin.name).toBe('test');
		expect(plugin.version).toBe('1.0.0');
	});

	it('preserves all fields', () => {
		const initFn = (w: World): World => w;
		const activateFn = (_w: World): void => {};
		const deactivateFn = (_w: World): void => {};
		const cleanupFn = (w: World): World => w;

		const plugin = definePlugin({
			name: 'full',
			version: '2.0.0',
			dependencies: ['base'],
			components: [{ name: 'Foo', store: {} }],
			systems: [{ system: makeSystem('sys'), phase: LoopPhase.UPDATE }],
			widgets: [{ name: 'my-widget', factory: () => 0, tags: ['ui'] }],
			themes: [{ name: 'dark', theme: { bg: '#000' } }],
			init: initFn,
			onActivate: activateFn,
			onDeactivate: deactivateFn,
			cleanup: cleanupFn,
		});

		expect(plugin.dependencies).toEqual(['base']);
		expect(plugin.components).toHaveLength(1);
		expect(plugin.systems).toHaveLength(1);
		expect(plugin.widgets).toHaveLength(1);
		expect(plugin.themes).toHaveLength(1);
		expect(plugin.init).toBe(initFn);
		expect(plugin.onActivate).toBe(activateFn);
		expect(plugin.onDeactivate).toBe(deactivateFn);
		expect(plugin.cleanup).toBe(cleanupFn);
	});
});

describe('lifecycle hooks', () => {
	it('calls onActivate on registration', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		let activated = false;
		registerPlugin(registry, scheduler, world, {
			name: 'activate-test',
			version: '1.0.0',
			onActivate: () => {
				activated = true;
			},
		});

		expect(activated).toBe(true);
	});

	it('calls onDeactivate on unregister', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		let deactivated = false;
		registerPlugin(registry, scheduler, world, {
			name: 'deactivate-test',
			version: '1.0.0',
			onDeactivate: () => {
				deactivated = true;
			},
		});

		unregisterPlugin(registry, scheduler, world, 'deactivate-test');
		expect(deactivated).toBe(true);
	});

	it('calls onDeactivate before cleanup on unregister', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const order: string[] = [];
		registerPlugin(registry, scheduler, world, {
			name: 'order-test',
			version: '1.0.0',
			onDeactivate: () => {
				order.push('deactivate');
			},
			cleanup: (w: World): World => {
				order.push('cleanup');
				return w;
			},
		});

		unregisterPlugin(registry, scheduler, world, 'order-test');
		expect(order).toEqual(['deactivate', 'cleanup']);
	});

	it('calls onDeactivate during clearPlugins', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		let deactivated = false;
		registerPlugin(registry, scheduler, world, {
			name: 'clear-test',
			version: '1.0.0',
			onDeactivate: () => {
				deactivated = true;
			},
		});

		clearPlugins(registry, scheduler, world);
		expect(deactivated).toBe(true);
	});
});

describe('activatePlugin / deactivatePlugin', () => {
	it('deactivates a plugin without removing it', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const sys = makeSystem('sys');
		registerPlugin(registry, scheduler, world, {
			name: 'toggleable',
			version: '1.0.0',
			systems: [{ system: sys, phase: LoopPhase.UPDATE }],
		});

		expect(isPluginActive(registry, 'toggleable')).toBe(true);
		expect(scheduler.hasSystem(sys)).toBe(true);

		deactivatePlugin(registry, scheduler, world, 'toggleable');

		expect(isPluginActive(registry, 'toggleable')).toBe(false);
		expect(hasPlugin(registry, 'toggleable')).toBe(true);
		expect(scheduler.hasSystem(sys)).toBe(false);
	});

	it('reactivates a deactivated plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const sys = makeSystem('sys');
		registerPlugin(registry, scheduler, world, {
			name: 'reactivatable',
			version: '1.0.0',
			systems: [{ system: sys, phase: LoopPhase.UPDATE }],
		});

		deactivatePlugin(registry, scheduler, world, 'reactivatable');
		expect(isPluginActive(registry, 'reactivatable')).toBe(false);

		activatePlugin(registry, scheduler, world, 'reactivatable');
		expect(isPluginActive(registry, 'reactivatable')).toBe(true);
		expect(scheduler.hasSystem(sys)).toBe(true);
	});

	it('calls onActivate/onDeactivate hooks', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		const calls: string[] = [];
		registerPlugin(registry, scheduler, world, {
			name: 'hooks',
			version: '1.0.0',
			onActivate: () => {
				calls.push('activate');
			},
			onDeactivate: () => {
				calls.push('deactivate');
			},
		});

		expect(calls).toEqual(['activate']); // Called on register

		deactivatePlugin(registry, scheduler, world, 'hooks');
		expect(calls).toEqual(['activate', 'deactivate']);

		activatePlugin(registry, scheduler, world, 'hooks');
		expect(calls).toEqual(['activate', 'deactivate', 'activate']);
	});

	it('is idempotent for already-active plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'idempotent',
			version: '1.0.0',
		});

		expect(activatePlugin(registry, scheduler, world, 'idempotent')).toBe(true);
		expect(isPluginActive(registry, 'idempotent')).toBe(true);
	});

	it('is idempotent for already-deactivated plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'idempotent2',
			version: '1.0.0',
		});

		deactivatePlugin(registry, scheduler, world, 'idempotent2');
		expect(deactivatePlugin(registry, scheduler, world, 'idempotent2')).toBe(true);
	});

	it('returns false for non-existent plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		expect(activatePlugin(registry, scheduler, world, 'nope')).toBe(false);
		expect(deactivatePlugin(registry, scheduler, world, 'nope')).toBe(false);
	});
});

describe('isPluginActive', () => {
	it('returns false for non-existent plugin', () => {
		const registry = createPluginRegistry();
		expect(isPluginActive(registry, 'nope')).toBe(false);
	});

	it('returns true for registered plugin', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'active',
			version: '1.0.0',
		});

		expect(isPluginActive(registry, 'active')).toBe(true);
	});
});

describe('plugin widgets and themes', () => {
	it('tracks widget declarations in plugin info', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'widget-plugin',
			version: '1.0.0',
			widgets: [
				{ name: 'bar-chart', factory: () => 0, tags: ['chart'] },
				{ name: 'pie-chart', factory: () => 0, tags: ['chart'] },
			],
		});

		const plugins = getPlugins(registry);
		expect(plugins[0]?.widgetCount).toBe(2);
	});

	it('tracks theme declarations in plugin info', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'theme-plugin',
			version: '1.0.0',
			themes: [{ name: 'ocean', theme: { bg: '#006' } }],
		});

		const plugins = getPlugins(registry);
		expect(plugins[0]?.themeCount).toBe(1);
	});

	it('reports active status in plugin info', () => {
		const registry = createPluginRegistry();
		const scheduler = createScheduler();
		const world = createWorld();

		registerPlugin(registry, scheduler, world, {
			name: 'status-test',
			version: '1.0.0',
		});

		let plugins = getPlugins(registry);
		expect(plugins[0]?.active).toBe(true);

		deactivatePlugin(registry, scheduler, world, 'status-test');
		plugins = getPlugins(registry);
		expect(plugins[0]?.active).toBe(false);
	});
});

describe('validatePluginConfig', () => {
	it('returns config when no schema is defined', () => {
		const plugin = definePlugin({ name: 'no-schema', version: '1.0.0' });
		const config = { anything: true };
		expect(validatePluginConfig(plugin, config)).toBe(config);
	});

	it('validates config against schema', () => {
		const plugin = definePlugin({
			name: 'with-schema',
			version: '1.0.0',
			configSchema: z.object({
				maxItems: z.number().positive(),
				label: z.string(),
			}),
		});

		const result = validatePluginConfig(plugin, { maxItems: 10, label: 'test' });
		expect(result).toEqual({ maxItems: 10, label: 'test' });
	});

	it('throws for invalid config', () => {
		const plugin = definePlugin({
			name: 'strict',
			version: '1.0.0',
			configSchema: z.object({
				maxItems: z.number().positive(),
			}),
		});

		expect(() => validatePluginConfig(plugin, { maxItems: -1 })).toThrow();
	});
});

describe('PluginSchema v2', () => {
	it('validates plugin with widgets and themes', () => {
		const result = PluginSchema.safeParse({
			name: 'full-v2',
			version: '1.0.0',
			widgets: [{ name: 'chart', factory: () => 0 }],
			themes: [{ name: 'dark', theme: { bg: '#000' } }],
			onActivate: () => {},
			onDeactivate: () => {},
		});

		expect(result.success).toBe(true);
	});

	it('rejects invalid widget declaration', () => {
		const result = PluginSchema.safeParse({
			name: 'bad-widget',
			version: '1.0.0',
			widgets: [{ name: '' }], // missing factory, empty name
		});

		expect(result.success).toBe(false);
	});
});
