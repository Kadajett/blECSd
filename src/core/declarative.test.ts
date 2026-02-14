/**
 * Tests for declarative widget composition API.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	bind,
	el,
	elRef,
	hbox,
	mount,
	registerPropSetter,
	registerWidgetFactory,
	resetDeclarativeRegistrations,
	unmount,
	vbox,
} from './declarative';
import { addEntity } from './ecs';
import { createSignal } from './signals';
import type { Entity, World } from './types';
import { createWorld } from './world';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestWorld(): World {
	return createWorld();
}

/**
 * Simple factory that creates an entity and stores config in a Map.
 */
const entityConfigs = new Map<Entity, Record<string, unknown>>();

function testBoxFactory(world: World, config: Record<string, unknown>): Entity {
	const eid = addEntity(world);
	entityConfigs.set(eid, { ...config });
	return eid;
}

function testTextFactory(world: World, config: Record<string, unknown>): Entity {
	const eid = addEntity(world);
	entityConfigs.set(eid, { ...config });
	return eid;
}

function testGaugeFactory(world: World, config: Record<string, unknown>): Entity {
	const eid = addEntity(world);
	entityConfigs.set(eid, { ...config });
	return eid;
}

/** Tracks prop setter calls for assertions. */
const propSetterCalls: Array<{ eid: Entity; prop: string; value: unknown }> = [];

function trackingPropSetter(prop: string) {
	return (_world: World, eid: Entity, value: unknown): void => {
		propSetterCalls.push({ eid, prop, value });
		const config = entityConfigs.get(eid);
		if (config) {
			config[prop] = value;
		}
	};
}

// =============================================================================
// TESTS
// =============================================================================

describe('declarative', () => {
	afterEach(() => {
		resetDeclarativeRegistrations();
		entityConfigs.clear();
		propSetterCalls.length = 0;
	});

	describe('el', () => {
		it('creates a descriptor with type and config', () => {
			const desc = el('box', { width: 20, height: 10 });
			expect(desc.type).toBe('box');
			expect(desc.config).toEqual({ width: 20, height: 10 });
			expect(desc.children).toEqual([]);
		});

		it('creates a descriptor with children', () => {
			const child1 = el('text', { content: 'hello' });
			const child2 = el('text', { content: 'world' });
			const parent = el('box', {}, [child1, child2]);

			expect(parent.children).toHaveLength(2);
			expect(parent.children[0]).toBe(child1);
			expect(parent.children[1]).toBe(child2);
		});

		it('accepts reactive config values', () => {
			const [count] = createSignal(42);
			const desc = el('text', { content: count });

			expect(typeof desc.config.content).toBe('function');
		});

		it('defaults to empty config and children', () => {
			const desc = el('box');
			expect(desc.config).toEqual({});
			expect(desc.children).toEqual([]);
		});
	});

	describe('elRef', () => {
		it('creates a descriptor with a ref callback', () => {
			const ref = vi.fn();
			const desc = elRef('box', { width: 10 }, ref);

			expect(desc.ref).toBe(ref);
			expect(desc.type).toBe('box');
			expect(desc.config).toEqual({ width: 10 });
		});
	});

	describe('vbox', () => {
		it('creates a box descriptor with vertical layout', () => {
			const desc = vbox({ width: 100 }, [el('text', { content: 'hi' })]);

			expect(desc.type).toBe('box');
			expect(desc.config.layout).toBe('vertical');
			expect(desc.config.width).toBe(100);
			expect(desc.children).toHaveLength(1);
		});
	});

	describe('hbox', () => {
		it('creates a box descriptor with horizontal layout', () => {
			const desc = hbox({ height: 50 });

			expect(desc.type).toBe('box');
			expect(desc.config.layout).toBe('horizontal');
			expect(desc.config.height).toBe(50);
		});
	});

	describe('mount', () => {
		it('creates an entity from a descriptor', () => {
			registerWidgetFactory('box', testBoxFactory);
			const world = createTestWorld();

			const tree = mount(world, el('box', { width: 20 }));

			expect(tree.root).toBeDefined();
			expect(tree.entities).toHaveLength(1);
			expect(entityConfigs.get(tree.root)).toEqual({ width: 20 });

			tree.dispose();
		});

		it('creates nested entities with parent-child relationships', () => {
			registerWidgetFactory('box', testBoxFactory);
			registerWidgetFactory('text', testTextFactory);
			const world = createTestWorld();

			const tree = mount(
				world,
				el('box', { width: 100 }, [
					el('text', { content: 'child 1' }),
					el('text', { content: 'child 2' }),
				]),
			);

			expect(tree.entities).toHaveLength(3);
			// Root is first entity
			expect(tree.root).toBe(tree.entities[0]);

			tree.dispose();
		});

		it('resolves static config values at mount time', () => {
			registerWidgetFactory('text', testTextFactory);
			const world = createTestWorld();

			const tree = mount(world, el('text', { content: 'hello', x: 10, y: 5 }));

			expect(entityConfigs.get(tree.root)).toEqual({
				content: 'hello',
				x: 10,
				y: 5,
			});

			tree.dispose();
		});

		it('resolves reactive config values at mount time', () => {
			registerWidgetFactory('text', testTextFactory);
			const world = createTestWorld();

			const [text] = createSignal('initial');
			const tree = mount(world, el('text', { content: text }));

			// Factory receives the resolved (current) value
			expect(entityConfigs.get(tree.root)?.content).toBe('initial');

			tree.dispose();
		});

		it('creates reactive effects for signal-backed properties', () => {
			registerWidgetFactory('text', testTextFactory);
			registerPropSetter('text', 'content', trackingPropSetter('content'));
			const world = createTestWorld();

			const [text, setText] = createSignal('hello');
			const tree = mount(world, el('text', { content: text }));

			// Effect runs once at mount
			expect(propSetterCalls).toHaveLength(1);
			expect(propSetterCalls[0]?.value).toBe('hello');

			// Update signal triggers re-application
			setText('world');
			expect(propSetterCalls).toHaveLength(2);
			expect(propSetterCalls[1]?.value).toBe('world');

			tree.dispose();
		});

		it('does not create effects for static properties', () => {
			registerWidgetFactory('text', testTextFactory);
			registerPropSetter('text', 'content', trackingPropSetter('content'));
			const world = createTestWorld();

			const tree = mount(world, el('text', { content: 'static' }));

			// No effect calls for static values
			expect(propSetterCalls).toHaveLength(0);

			tree.dispose();
		});

		it('disposes reactive effects on unmount', () => {
			registerWidgetFactory('text', testTextFactory);
			registerPropSetter('text', 'content', trackingPropSetter('content'));
			const world = createTestWorld();

			const [text, setText] = createSignal('hello');
			const tree = mount(world, el('text', { content: text }));

			expect(propSetterCalls).toHaveLength(1);

			tree.dispose();

			// Signal change after dispose should not trigger setter
			setText('world');
			expect(propSetterCalls).toHaveLength(1);
		});

		it('calls ref callback with entity ID', () => {
			registerWidgetFactory('box', testBoxFactory);
			const world = createTestWorld();

			let refEntity: Entity | undefined;
			const tree = mount(
				world,
				elRef('box', { width: 10 }, (eid) => {
					refEntity = eid;
				}),
			);

			expect(refEntity).toBe(tree.root);

			tree.dispose();
		});

		it('mounts with optional parent entity', () => {
			registerWidgetFactory('box', testBoxFactory);
			const world = createTestWorld();
			const parentEid = addEntity(world);

			const tree = mount(world, el('box', { width: 10 }), parentEid);

			expect(tree.root).toBeDefined();
			// Entity was created as child of parentEid
			expect(tree.entities).toHaveLength(1);

			tree.dispose();
		});

		it('throws when no factory is registered', () => {
			const world = createTestWorld();

			expect(() => mount(world, el('box', {}))).toThrow(
				"No factory registered for widget type 'box'",
			);
		});

		it('supports multiple reactive properties on one widget', () => {
			registerWidgetFactory('box', testBoxFactory);
			registerPropSetter('box', 'width', trackingPropSetter('width'));
			registerPropSetter('box', 'height', trackingPropSetter('height'));
			const world = createTestWorld();

			const [w, setW] = createSignal(10);
			const [h, setH] = createSignal(20);

			const tree = mount(world, el('box', { width: w, height: h }));

			// Initial effect runs
			expect(propSetterCalls).toHaveLength(2);

			// Update width
			setW(50);
			const widthCalls = propSetterCalls.filter((c) => c.prop === 'width');
			expect(widthCalls).toHaveLength(2);
			expect(widthCalls[1]?.value).toBe(50);

			// Update height
			setH(100);
			const heightCalls = propSetterCalls.filter((c) => c.prop === 'height');
			expect(heightCalls).toHaveLength(2);
			expect(heightCalls[1]?.value).toBe(100);

			tree.dispose();
		});

		it('mounts deeply nested trees', () => {
			registerWidgetFactory('box', testBoxFactory);
			registerWidgetFactory('text', testTextFactory);
			const world = createTestWorld();

			const tree = mount(
				world,
				el('box', {}, [
					el('box', {}, [el('text', { content: 'deep' })]),
					el('text', { content: 'sibling' }),
				]),
			);

			expect(tree.entities).toHaveLength(4);

			tree.dispose();
		});
	});

	describe('unmount', () => {
		it('disposes all reactive bindings', () => {
			registerWidgetFactory('text', testTextFactory);
			registerPropSetter('text', 'content', trackingPropSetter('content'));
			const world = createTestWorld();

			const [text, setText] = createSignal('hello');
			const tree = mount(world, el('text', { content: text }));

			unmount(tree);

			setText('world');
			// Should not have triggered after unmount
			expect(propSetterCalls).toHaveLength(1);
		});
	});

	describe('bind', () => {
		it('creates a reactive binding between signal and entity', () => {
			const world = createTestWorld();
			const eid = addEntity(world);
			const [value, setValue] = createSignal('initial');
			const spy = vi.fn();

			const cleanup = bind(world, eid, value, (_w, _e, v) => {
				spy(v);
			});

			// Runs immediately
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith('initial');

			// Updates on signal change
			setValue('updated');
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenCalledWith('updated');

			// Stops after dispose
			cleanup.dispose();
			setValue('ignored');
			expect(spy).toHaveBeenCalledTimes(2);
		});
	});

	describe('registerWidgetFactory', () => {
		it('registers a factory for a widget type', () => {
			registerWidgetFactory('gauge', testGaugeFactory);
			const world = createTestWorld();

			const tree = mount(world, el('gauge', { value: 50 }));
			expect(tree.root).toBeDefined();
			expect(entityConfigs.get(tree.root)?.value).toBe(50);

			tree.dispose();
		});

		it('overwrites previous factory registration', () => {
			const factory1 = vi.fn(testBoxFactory);
			const factory2 = vi.fn(testBoxFactory);

			registerWidgetFactory('box', factory1);
			registerWidgetFactory('box', factory2);

			const world = createTestWorld();
			mount(world, el('box', {})).dispose();

			expect(factory1).not.toHaveBeenCalled();
			expect(factory2).toHaveBeenCalledTimes(1);
		});
	});

	describe('composition patterns', () => {
		it('supports layout with reactive children', () => {
			registerWidgetFactory('box', testBoxFactory);
			registerWidgetFactory('text', testTextFactory);
			registerPropSetter('text', 'content', trackingPropSetter('content'));
			const world = createTestWorld();

			const [title, setTitle] = createSignal('Dashboard');
			const [status, setStatus] = createSignal('OK');

			const tree = mount(
				world,
				vbox({}, [el('text', { content: title }), el('text', { content: status })]),
			);

			expect(tree.entities).toHaveLength(3); // vbox + 2 text

			// Both text widgets react to signal changes
			setTitle('Updated Dashboard');
			setStatus('Error');

			const contentCalls = propSetterCalls.filter((c) => c.prop === 'content');
			expect(contentCalls).toHaveLength(4); // 2 initial + 2 updates

			tree.dispose();
		});

		it('supports nested reactive layouts', () => {
			registerWidgetFactory('box', testBoxFactory);
			registerWidgetFactory('text', testTextFactory);
			registerWidgetFactory('gauge', testGaugeFactory);
			registerPropSetter('gauge', 'value', trackingPropSetter('value'));
			const world = createTestWorld();

			const [cpu, setCpu] = createSignal(42);
			const [mem, setMem] = createSignal(68);

			const tree = mount(
				world,
				vbox({}, [
					el('text', { content: 'System Monitor' }),
					hbox({}, [
						el('gauge', { value: cpu, label: 'CPU' }),
						el('gauge', { value: mem, label: 'Memory' }),
					]),
				]),
			);

			expect(tree.entities).toHaveLength(5); // vbox + text + hbox + 2 gauges

			setCpu(87);
			setMem(92);

			const valueCalls = propSetterCalls.filter((c) => c.prop === 'value');
			expect(valueCalls).toHaveLength(4); // 2 initial + 2 updates

			tree.dispose();
		});
	});
});
