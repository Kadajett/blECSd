/**
 * Tests for Widget Registry System.
 *
 * @module widgets/registry.test
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { World } from '../core/types';
import {
	createWidgetRegistry,
	defaultRegistry,
	getWidgetsByTag,
	getWidgetTypes,
	isWidgetType,
	registerBuiltinWidgets,
	type WidgetFactory,
	type WidgetRegistry,
} from './registry';

describe('Widget Registry', () => {
	let world: World;
	let registry: WidgetRegistry;

	beforeEach(() => {
		world = createWorld();
		registry = createWidgetRegistry();
	});

	afterEach(() => {
		registry.clear();
	});

	describe('createWidgetRegistry', () => {
		it('creates an empty registry', () => {
			expect(registry.list()).toHaveLength(0);
		});

		it('returns a registry interface', () => {
			expect(typeof registry.register).toBe('function');
			expect(typeof registry.alias).toBe('function');
			expect(typeof registry.has).toBe('function');
			expect(typeof registry.get).toBe('function');
			expect(typeof registry.create).toBe('function');
			expect(typeof registry.createWithEntity).toBe('function');
			expect(typeof registry.list).toBe('function');
			expect(typeof registry.listByTag).toBe('function');
			expect(typeof registry.unregister).toBe('function');
			expect(typeof registry.clear).toBe('function');
		});
	});

	describe('register', () => {
		it('registers a widget factory', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));

			registry.register('test', { factory });

			expect(registry.has('test')).toBe(true);
		});

		it('supports chaining', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));

			const result = registry.register('test', { factory });

			expect(result).toBe(registry);
		});

		it('stores description and tags', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));

			registry.register('test', {
				factory,
				description: 'Test widget',
				tags: ['test', 'example'],
			});

			const registration = registry.get('test');
			expect(registration?.description).toBe('Test widget');
			expect(registration?.tags).toEqual(['test', 'example']);
		});

		it('is case-insensitive', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));

			registry.register('TestWidget', { factory });

			expect(registry.has('testwidget')).toBe(true);
			expect(registry.has('TESTWIDGET')).toBe(true);
			expect(registry.has('TestWidget')).toBe(true);
		});

		it('overwrites existing registration with same name', () => {
			const factory1: WidgetFactory = vi.fn(() => ({ version: 1 }));
			const factory2: WidgetFactory = vi.fn(() => ({ version: 2 }));

			registry.register('test', { factory: factory1 });
			registry.register('test', { factory: factory2 });

			const eid = addEntity(world);
			const widget = registry.createWithEntity(world, eid, 'test');
			expect(widget).toEqual({ version: 2 });
		});
	});

	describe('alias', () => {
		it('creates an alias for an existing widget', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });

			registry.alias('shortname', 'original');

			expect(registry.has('shortname')).toBe(true);
		});

		it('throws if target does not exist', () => {
			expect(() => {
				registry.alias('alias', 'nonexistent');
			}).toThrow("Cannot create alias 'alias' for non-existent widget type 'nonexistent'");
		});

		it('supports chaining', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });

			const result = registry.alias('shortname', 'original');

			expect(result).toBe(registry);
		});

		it('resolves through alias when creating', () => {
			const factory: WidgetFactory = vi.fn((_w, _e, config) => ({ config }));
			registry.register('original', { factory });
			registry.alias('short', 'original');

			const eid = addEntity(world);
			const widget = registry.createWithEntity(world, eid, 'short', { test: true });

			expect(factory).toHaveBeenCalledWith(world, eid, { test: true });
			expect(widget).toEqual({ config: { test: true } });
		});

		it('is case-insensitive', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('Original', { factory });

			registry.alias('SHORTNAME', 'original');

			expect(registry.has('shortname')).toBe(true);
			expect(registry.has('Shortname')).toBe(true);
		});
	});

	describe('has', () => {
		it('returns true for registered widgets', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('test', { factory });

			expect(registry.has('test')).toBe(true);
		});

		it('returns false for unregistered widgets', () => {
			expect(registry.has('nonexistent')).toBe(false);
		});

		it('returns true for aliased widgets', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });
			registry.alias('alias', 'original');

			expect(registry.has('alias')).toBe(true);
		});
	});

	describe('get', () => {
		it('returns registration for registered widgets', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('test', { factory, description: 'Test' });

			const registration = registry.get('test');

			expect(registration).toBeDefined();
			expect(registration?.factory).toBe(factory);
			expect(registration?.description).toBe('Test');
		});

		it('returns undefined for unregistered widgets', () => {
			expect(registry.get('nonexistent')).toBeUndefined();
		});

		it('resolves through aliases', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });
			registry.alias('alias', 'original');

			const registration = registry.get('alias');

			expect(registration?.factory).toBe(factory);
		});
	});

	describe('create', () => {
		it('creates a widget with a new entity', () => {
			const factory: WidgetFactory = vi.fn((_w, eid) => ({ eid }));
			registry.register('test', { factory });

			const widget = registry.create(world, 'test');

			expect(factory).toHaveBeenCalled();
			expect(widget).toHaveProperty('eid');
		});

		it('passes config to factory', () => {
			const factory: WidgetFactory = vi.fn((_w, _e, config) => ({ config }));
			registry.register('test', { factory });

			const config = { width: 20, height: 10 };
			const widget = registry.create(world, 'test', config);

			expect(widget).toEqual({ config });
		});

		it('throws for unregistered widget type', () => {
			expect(() => {
				registry.create(world, 'nonexistent');
			}).toThrow(/Unknown widget type 'nonexistent'/);
		});

		it('includes available types in error message', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory });
			registry.register('text', { factory });

			expect(() => {
				registry.create(world, 'nonexistent');
			}).toThrow(/Available types: box, text/);
		});
	});

	describe('createWithEntity', () => {
		it('creates a widget with specific entity', () => {
			const factory: WidgetFactory = vi.fn((_w, eid) => ({ eid }));
			registry.register('test', { factory });

			const eid = addEntity(world);
			const widget = registry.createWithEntity(world, eid, 'test');

			expect(factory).toHaveBeenCalledWith(world, eid, undefined);
			expect(widget).toEqual({ eid });
		});

		it('passes config to factory', () => {
			const factory: WidgetFactory = vi.fn((_w, eid, config) => ({ eid, config }));
			registry.register('test', { factory });

			const eid = addEntity(world);
			const config = { title: 'Test' };
			const widget = registry.createWithEntity(world, eid, 'test', config);

			expect(factory).toHaveBeenCalledWith(world, eid, config);
			expect(widget).toEqual({ eid, config });
		});
	});

	describe('list', () => {
		it('returns empty array for empty registry', () => {
			expect(registry.list()).toEqual([]);
		});

		it('returns all registered widget names', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory });
			registry.register('text', { factory });
			registry.register('panel', { factory });

			const list = registry.list();

			expect(list).toEqual(['box', 'panel', 'text']); // sorted
		});

		it('does not include aliases', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });
			registry.alias('alias', 'original');

			const list = registry.list();

			expect(list).toEqual(['original']);
			expect(list).not.toContain('alias');
		});

		it('returns sorted list', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('zebra', { factory });
			registry.register('alpha', { factory });
			registry.register('middle', { factory });

			const list = registry.list();

			expect(list).toEqual(['alpha', 'middle', 'zebra']);
		});
	});

	describe('listByTag', () => {
		it('returns widgets with matching tag', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory, tags: ['container', 'basic'] });
			registry.register('text', { factory, tags: ['display', 'basic'] });
			registry.register('panel', { factory, tags: ['container', 'advanced'] });

			const containers = registry.listByTag('container');

			expect(containers).toEqual(['box', 'panel']);
		});

		it('returns empty array if no widgets have tag', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory, tags: ['container'] });

			const result = registry.listByTag('nonexistent');

			expect(result).toEqual([]);
		});

		it('is case-insensitive', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory, tags: ['Container'] });

			const result = registry.listByTag('CONTAINER');

			expect(result).toEqual(['box']);
		});
	});

	describe('unregister', () => {
		it('removes a registered widget', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('test', { factory });

			const result = registry.unregister('test');

			expect(result).toBe(true);
			expect(registry.has('test')).toBe(false);
		});

		it('returns false for non-existent widget', () => {
			const result = registry.unregister('nonexistent');

			expect(result).toBe(false);
		});

		it('removes aliases pointing to the widget', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });
			registry.alias('alias1', 'original');
			registry.alias('alias2', 'original');

			registry.unregister('original');

			expect(registry.has('alias1')).toBe(false);
			expect(registry.has('alias2')).toBe(false);
		});
	});

	describe('clear', () => {
		it('removes all registrations', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('box', { factory });
			registry.register('text', { factory });

			registry.clear();

			expect(registry.list()).toHaveLength(0);
		});

		it('removes all aliases', () => {
			const factory: WidgetFactory = vi.fn(() => ({ eid: 0 }));
			registry.register('original', { factory });
			registry.alias('alias', 'original');

			registry.clear();

			expect(registry.has('alias')).toBe(false);
		});
	});

	describe('registerBuiltinWidgets', () => {
		it('registers all builtin widgets', () => {
			registerBuiltinWidgets(registry);

			expect(registry.has('box')).toBe(true);
			expect(registry.has('text')).toBe(true);
			expect(registry.has('line')).toBe(true);
			expect(registry.has('layout')).toBe(true);
			expect(registry.has('panel')).toBe(true);
			expect(registry.has('tabs')).toBe(true);
			expect(registry.has('scrollableBox')).toBe(true);
			expect(registry.has('scrollableText')).toBe(true);
			expect(registry.has('list')).toBe(true);
			expect(registry.has('listbar')).toBe(true);
			expect(registry.has('table')).toBe(true);
			expect(registry.has('listTable')).toBe(true);
			expect(registry.has('tree')).toBe(true);
			expect(registry.has('loading')).toBe(true);
		});

		it('registers aliases', () => {
			registerBuiltinWidgets(registry);

			// scrollableBox aliases
			expect(registry.has('scrollbox')).toBe(true);
			expect(registry.has('scroll')).toBe(true);

			// scrollableText aliases
			expect(registry.has('log')).toBe(true);
			expect(registry.has('textarea')).toBe(true);

			// listbar aliases
			expect(registry.has('menubar')).toBe(true);
			expect(registry.has('menu')).toBe(true);

			// listTable aliases
			expect(registry.has('datatable')).toBe(true);
			expect(registry.has('grid')).toBe(true);

			// loading aliases
			expect(registry.has('spinner')).toBe(true);
			expect(registry.has('progress')).toBe(true);
		});

		it('returns registry for chaining', () => {
			const result = registerBuiltinWidgets(registry);

			expect(result).toBe(registry);
		});
	});

	describe('defaultRegistry', () => {
		it('has builtin widgets pre-registered', () => {
			expect(defaultRegistry.has('box')).toBe(true);
			expect(defaultRegistry.has('text')).toBe(true);
			expect(defaultRegistry.has('panel')).toBe(true);
		});

		it('can create widgets', () => {
			const widget = defaultRegistry.create(world, 'box', { width: 10, height: 5 });

			expect(widget).toBeDefined();
			expect(widget).toHaveProperty('eid');
		});
	});

	describe('utility functions', () => {
		describe('getWidgetTypes', () => {
			it('returns list of widget types', () => {
				const types = getWidgetTypes();

				expect(types).toContain('box');
				expect(types).toContain('text');
				expect(types).toContain('panel');
			});

			it('returns sorted list', () => {
				const types = getWidgetTypes();

				const sorted = [...types].sort();
				expect(types).toEqual(sorted);
			});
		});

		describe('isWidgetType', () => {
			it('returns true for valid widget types', () => {
				expect(isWidgetType('box')).toBe(true);
				expect(isWidgetType('text')).toBe(true);
			});

			it('returns false for invalid widget types', () => {
				expect(isWidgetType('nonexistent')).toBe(false);
				expect(isWidgetType('custom')).toBe(false);
			});

			it('is case-insensitive', () => {
				expect(isWidgetType('BOX')).toBe(true);
				expect(isWidgetType('Box')).toBe(true);
			});

			it('works with aliases', () => {
				expect(isWidgetType('log')).toBe(true);
				expect(isWidgetType('spinner')).toBe(true);
			});
		});

		describe('getWidgetsByTag', () => {
			it('returns widgets with container tag', () => {
				const containers = getWidgetsByTag('container');

				expect(containers).toContain('box');
				expect(containers).toContain('layout');
				expect(containers).toContain('panel');
			});

			it('returns widgets with interactive tag', () => {
				const interactive = getWidgetsByTag('interactive');

				expect(interactive).toContain('list');
				expect(interactive).toContain('panel');
				expect(interactive).toContain('tabs');
			});

			it('returns empty array for unknown tag', () => {
				const result = getWidgetsByTag('nonexistenttag');

				expect(result).toEqual([]);
			});
		});
	});
});
