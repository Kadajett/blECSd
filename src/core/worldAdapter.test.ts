import { beforeEach, describe, expect, it } from 'vitest';
import { Focusable } from '../components/focusable';
import { Interactive } from '../components/interactive';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { addComponent, addEntity, removeComponent, removeEntity } from './ecs';
import type { Entity, World } from './types';
import { createWorld } from './world';
import {
	clearWorldAdapter,
	createPackedQueryAdapter,
	createWorldAdapter,
	DEFAULT_WORLD_ADAPTER,
	getWorldAdapter,
	isPackedQueryAdapter,
	type PackedQueryAdapter,
	PackedQueryAdapterConfigSchema,
	PackedQueryRegistrationSchema,
	setWorldAdapter,
} from './worldAdapter';

// =============================================================================
// DEFAULT ADAPTER (backwards compatibility)
// =============================================================================

describe('default WorldAdapter', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		clearWorldAdapter(world);
	});

	it('returns default adapter when none is registered', () => {
		const adapter = getWorldAdapter(world);
		expect(adapter).toBe(DEFAULT_WORLD_ADAPTER);
		expect(adapter.type).toBe('bitecs');
	});

	it('queryRenderables returns entities with Position and Renderable', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Position);
		addComponent(world, eid, Renderable);

		const result = DEFAULT_WORLD_ADAPTER.queryRenderables(world);
		expect(result).toContain(eid);
	});

	it('queryRenderables excludes entities missing components', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Position);
		// No Renderable

		const result = DEFAULT_WORLD_ADAPTER.queryRenderables(world);
		expect(result).not.toContain(eid);
	});

	it('default adapter has no queryByName', () => {
		expect(DEFAULT_WORLD_ADAPTER.queryByName).toBeUndefined();
	});

	it('isPackedQueryAdapter returns false for default adapter', () => {
		expect(isPackedQueryAdapter(DEFAULT_WORLD_ADAPTER)).toBe(false);
	});
});

describe('createWorldAdapter', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
	});

	it('creates adapter with default queryRenderables', () => {
		const adapter = createWorldAdapter();
		expect(adapter.type).toBe('bitecs');
		expect(typeof adapter.queryRenderables).toBe('function');
	});

	it('overrides queryRenderables', () => {
		const custom: Entity[] = [];
		const adapter = createWorldAdapter({
			type: 'custom',
			queryRenderables: () => custom,
		});
		expect(adapter.type).toBe('custom');
		expect(adapter.queryRenderables(world)).toBe(custom);
	});

	it('preserves queryByName override', () => {
		const adapter = createWorldAdapter({
			queryByName: (name) => (name === 'test' ? [] : undefined),
		});
		expect(adapter.queryByName).toBeDefined();
		expect(adapter.queryByName?.('test', world)).toEqual([]);
		expect(adapter.queryByName?.('unknown', world)).toBeUndefined();
	});
});

describe('adapter registry', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		clearWorldAdapter(world);
	});

	it('set and get adapter', () => {
		const adapter = createWorldAdapter({ type: 'custom' });
		setWorldAdapter(world, adapter);
		expect(getWorldAdapter(world)).toBe(adapter);
	});

	it('clear adapter reverts to default', () => {
		setWorldAdapter(world, createWorldAdapter({ type: 'custom' }));
		clearWorldAdapter(world);
		expect(getWorldAdapter(world)).toBe(DEFAULT_WORLD_ADAPTER);
	});

	it('different worlds have independent adapters', () => {
		const world2 = createWorld();
		const adapter1 = createWorldAdapter({ type: 'custom' });
		setWorldAdapter(world, adapter1);

		expect(getWorldAdapter(world)).toBe(adapter1);
		expect(getWorldAdapter(world2)).toBe(DEFAULT_WORLD_ADAPTER);
	});
});

// =============================================================================
// PACKED QUERY ADAPTER
// =============================================================================

describe('createPackedQueryAdapter', () => {
	it('creates adapter with type custom', () => {
		const adapter = createPackedQueryAdapter({ queries: [] });
		expect(adapter.type).toBe('custom');
	});

	it('auto-registers renderables query', () => {
		const adapter = createPackedQueryAdapter({ queries: [] });
		expect(adapter.getRegisteredQueries()).toContain('renderables');
	});

	it('does not duplicate renderables when explicitly registered', () => {
		const adapter = createPackedQueryAdapter({
			queries: [{ name: 'renderables', components: [Position, Renderable] }],
		});
		const names = adapter.getRegisteredQueries();
		const renderablesCount = names.filter((n) => n === 'renderables').length;
		expect(renderablesCount).toBe(1);
	});

	it('registers multiple queries', () => {
		const adapter = createPackedQueryAdapter({
			queries: [
				{ name: 'focusable', components: [Focusable] },
				{ name: 'interactive', components: [Interactive] },
			],
		});
		const names = adapter.getRegisteredQueries();
		expect(names).toContain('renderables');
		expect(names).toContain('focusable');
		expect(names).toContain('interactive');
	});

	it('isPackedQueryAdapter returns true', () => {
		const adapter = createPackedQueryAdapter({ queries: [] });
		expect(isPackedQueryAdapter(adapter)).toBe(true);
	});

	it('accepts initialCapacity config', () => {
		const adapter = createPackedQueryAdapter({
			queries: [{ name: 'test', components: [Focusable] }],
			initialCapacity: 256,
		});
		expect(adapter.getRegisteredQueries()).toContain('test');
	});
});

describe('PackedQueryAdapter sync and query', () => {
	let world: World;
	let adapter: PackedQueryAdapter;

	beforeEach(() => {
		world = createWorld();
		adapter = createPackedQueryAdapter({
			queries: [
				{ name: 'focusable', components: [Focusable] },
				{ name: 'interactive', components: [Interactive] },
			],
		});
	});

	it('returns empty results before sync', () => {
		expect(adapter.getQuerySize('renderables')).toBe(0);
		expect(adapter.getQuerySize('focusable')).toBe(0);
		expect(adapter.queryRenderables(world)).toEqual([]);
	});

	it('sync populates renderables query', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Position);
		addComponent(world, eid, Renderable);

		adapter.sync(world);

		expect(adapter.getQuerySize('renderables')).toBe(1);
		const data = adapter.getQueryData('renderables');
		expect(data[0]).toBe(eid as number);
	});

	it('sync populates focusable query', () => {
		const e1 = addEntity(world);
		addComponent(world, e1, Focusable);
		const e2 = addEntity(world);
		addComponent(world, e2, Focusable);

		adapter.sync(world);

		expect(adapter.getQuerySize('focusable')).toBe(2);
		const data = adapter.getQueryData('focusable');
		const entities = [data[0], data[1]].sort();
		expect(entities).toContain(e1 as number);
		expect(entities).toContain(e2 as number);
	});

	it('queryRenderables returns Entity[] after sync', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Position);
		addComponent(world, eid, Renderable);

		adapter.sync(world);

		const result = adapter.queryRenderables(world);
		expect(result).toContain(eid);
	});

	it('queryByName returns entities for registered query', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Focusable);

		adapter.sync(world);

		const result = adapter.queryByName('focusable', world);
		expect(result).toBeDefined();
		expect(result).toContain(eid);
	});

	it('queryByName returns undefined for unknown query', () => {
		expect(adapter.queryByName('nonexistent', world)).toBeUndefined();
	});

	it('getQueryData returns frozen empty array for unknown query', () => {
		const d1 = adapter.getQueryData('nonexistent');
		const d2 = adapter.getQueryData('nonexistent');
		expect(d1).toEqual([]);
		expect(d1).toBe(d2); // same reference
		expect(Object.isFrozen(d1)).toBe(true);
	});

	it('getQuerySize returns 0 for unknown query', () => {
		expect(adapter.getQuerySize('nonexistent')).toBe(0);
	});
});

describe('PackedQueryAdapter entity removal', () => {
	let world: World;
	let adapter: PackedQueryAdapter;

	beforeEach(() => {
		world = createWorld();
		adapter = createPackedQueryAdapter({
			queries: [{ name: 'focusable', components: [Focusable] }],
		});
	});

	it('removes entity after component removal and re-sync', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Focusable);

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(1);

		removeComponent(world, eid, Focusable);
		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(0);
	});

	it('removes entity after entity removal and re-sync', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Focusable);

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(1);

		removeEntity(world, eid);
		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(0);
	});

	it('handles add then remove then re-add across syncs', () => {
		const eid = addEntity(world);
		addComponent(world, eid, Focusable);

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(1);

		removeComponent(world, eid, Focusable);
		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(0);

		addComponent(world, eid, Focusable);
		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(1);
	});

	it('handles multiple entities with interleaved add/remove', () => {
		const e1 = addEntity(world);
		const e2 = addEntity(world);
		const e3 = addEntity(world);
		addComponent(world, e1, Focusable);
		addComponent(world, e2, Focusable);
		addComponent(world, e3, Focusable);

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(3);

		removeComponent(world, e2, Focusable);
		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(2);

		const data = adapter.getQueryData('focusable');
		const live = [data[0], data[1]].sort();
		expect(live).toContain(e1 as number);
		expect(live).toContain(e3 as number);
	});
});

describe('PackedQueryAdapter multi-query isolation', () => {
	let world: World;
	let adapter: PackedQueryAdapter;

	beforeEach(() => {
		world = createWorld();
		adapter = createPackedQueryAdapter({
			queries: [
				{ name: 'focusable', components: [Focusable] },
				{ name: 'interactive', components: [Interactive] },
			],
		});
	});

	it('queries track independent component sets', () => {
		const focusOnly = addEntity(world);
		addComponent(world, focusOnly, Focusable);

		const interactiveOnly = addEntity(world);
		addComponent(world, interactiveOnly, Interactive);

		const both = addEntity(world);
		addComponent(world, both, Focusable);
		addComponent(world, both, Interactive);

		adapter.sync(world);

		expect(adapter.getQuerySize('focusable')).toBe(2);
		expect(adapter.getQuerySize('interactive')).toBe(2);

		const focusData = adapter.getQueryData('focusable');
		const focusEntities: number[] = [];
		for (let i = 0; i < adapter.getQuerySize('focusable'); i++) {
			focusEntities.push(focusData[i] as number);
		}
		expect(focusEntities).toContain(focusOnly as number);
		expect(focusEntities).toContain(both as number);
		expect(focusEntities).not.toContain(interactiveOnly as number);

		const interData = adapter.getQueryData('interactive');
		const interEntities: number[] = [];
		for (let i = 0; i < adapter.getQuerySize('interactive'); i++) {
			interEntities.push(interData[i] as number);
		}
		expect(interEntities).toContain(interactiveOnly as number);
		expect(interEntities).toContain(both as number);
		expect(interEntities).not.toContain(focusOnly as number);
	});
});

describe('PackedQueryAdapter stress test', () => {
	it('handles many entities across multiple syncs', () => {
		const world = createWorld();
		const adapter = createPackedQueryAdapter({
			queries: [{ name: 'focusable', components: [Focusable] }],
			initialCapacity: 16,
		});

		const entities: Entity[] = [];
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			addComponent(world, eid, Focusable);
			entities.push(eid);
		}

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(100);

		// Remove half
		for (let i = 0; i < 50; i++) {
			const eid = entities[i];
			if (eid !== undefined) {
				removeComponent(world, eid, Focusable);
			}
		}

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(50);

		// Add 25 new
		for (let i = 0; i < 25; i++) {
			const eid = addEntity(world);
			addComponent(world, eid, Focusable);
		}

		adapter.sync(world);
		expect(adapter.getQuerySize('focusable')).toBe(75);
	});
});

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

describe('Zod schemas', () => {
	it('PackedQueryRegistrationSchema validates valid registration', () => {
		const result = PackedQueryRegistrationSchema.safeParse({
			name: 'test',
			components: [Position],
		});
		expect(result.success).toBe(true);
	});

	it('PackedQueryRegistrationSchema rejects empty name', () => {
		const result = PackedQueryRegistrationSchema.safeParse({
			name: '',
			components: [Position],
		});
		expect(result.success).toBe(false);
	});

	it('PackedQueryRegistrationSchema rejects empty components', () => {
		const result = PackedQueryRegistrationSchema.safeParse({
			name: 'test',
			components: [],
		});
		expect(result.success).toBe(false);
	});

	it('PackedQueryAdapterConfigSchema validates valid config', () => {
		const result = PackedQueryAdapterConfigSchema.safeParse({
			queries: [{ name: 'test', components: [Position] }],
			initialCapacity: 128,
		});
		expect(result.success).toBe(true);
	});

	it('PackedQueryAdapterConfigSchema validates config without initialCapacity', () => {
		const result = PackedQueryAdapterConfigSchema.safeParse({
			queries: [],
		});
		expect(result.success).toBe(true);
	});

	it('PackedQueryAdapterConfigSchema rejects negative initialCapacity', () => {
		const result = PackedQueryAdapterConfigSchema.safeParse({
			queries: [],
			initialCapacity: -1,
		});
		expect(result.success).toBe(false);
	});

	it('PackedQueryAdapterConfigSchema rejects non-integer initialCapacity', () => {
		const result = PackedQueryAdapterConfigSchema.safeParse({
			queries: [],
			initialCapacity: 3.5,
		});
		expect(result.success).toBe(false);
	});

	it('createPackedQueryAdapter throws on invalid config', () => {
		expect(() =>
			createPackedQueryAdapter({
				queries: [{ name: '', components: [Position] }],
			}),
		).toThrow();
	});
});

// =============================================================================
// TYPE GUARD
// =============================================================================

describe('isPackedQueryAdapter', () => {
	it('returns true for packed adapter', () => {
		const adapter = createPackedQueryAdapter({ queries: [] });
		expect(isPackedQueryAdapter(adapter)).toBe(true);
	});

	it('returns false for default adapter', () => {
		expect(isPackedQueryAdapter(DEFAULT_WORLD_ADAPTER)).toBe(false);
	});

	it('returns false for custom adapter without packed methods', () => {
		const adapter = createWorldAdapter({ type: 'custom' });
		expect(isPackedQueryAdapter(adapter)).toBe(false);
	});
});
