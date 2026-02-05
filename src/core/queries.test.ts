import { beforeEach, describe, expect, it } from 'vitest';
import { Border } from '../components/border';
import { Content } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable } from '../components/focusable';
import { Hierarchy, setParent } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import {
	filterClickable,
	filterDirty,
	filterFocusable,
	filterVisible,
	filterVisibleDirty,
	getChildEntities,
	getDescendantEntities,
	getRootEntities,
	queryBorder,
	queryContent,
	queryFocusable,
	queryHierarchy,
	queryInteractive,
	queryPadding,
	queryRenderable,
	queryScrollable,
	sortByDepth,
	sortByTabIndex,
	sortByZIndex,
} from './queries';
import type { Entity, World } from './types';

describe('Common Queries', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
	});

	/**
	 * Helper to create a renderable entity with base components.
	 */
	function createRenderableEntity(): Entity {
		const eid = addEntity(world) as Entity;
		addComponent(world, eid, Position);
		addComponent(world, eid, Dimensions);
		addComponent(world, eid, Renderable);
		Renderable.visible[eid] = 1;
		Renderable.dirty[eid] = 1;
		return eid;
	}

	describe('queryRenderable', () => {
		it('returns entities with Position, Dimensions, and Renderable', () => {
			const eid = createRenderableEntity();

			const results = queryRenderable(world);

			expect(results).toContain(eid);
		});

		it('does not return entities missing components', () => {
			const eid = addEntity(world) as Entity;
			addComponent(world, eid, Position);
			// Missing Dimensions and Renderable

			const results = queryRenderable(world);

			expect(results).not.toContain(eid);
		});

		it('returns multiple renderable entities', () => {
			const eid1 = createRenderableEntity();
			const eid2 = createRenderableEntity();
			const eid3 = createRenderableEntity();

			const results = queryRenderable(world);

			expect(results).toContain(eid1);
			expect(results).toContain(eid2);
			expect(results).toContain(eid3);
			expect(results.length).toBe(3);
		});
	});

	describe('queryFocusable', () => {
		it('returns entities with Focusable component', () => {
			const eid = addEntity(world) as Entity;
			addComponent(world, eid, Focusable);

			const results = queryFocusable(world);

			expect(results).toContain(eid);
		});

		it('does not return entities without Focusable', () => {
			const eid = createRenderableEntity();

			const results = queryFocusable(world);

			expect(results).not.toContain(eid);
		});
	});

	describe('queryInteractive', () => {
		it('returns entities with Interactive component', () => {
			const eid = addEntity(world) as Entity;
			addComponent(world, eid, Interactive);

			const results = queryInteractive(world);

			expect(results).toContain(eid);
		});
	});

	describe('queryScrollable', () => {
		it('returns entities with Scrollable component', () => {
			const eid = addEntity(world) as Entity;
			addComponent(world, eid, Scrollable);

			const results = queryScrollable(world);

			expect(results).toContain(eid);
		});
	});

	describe('queryContent', () => {
		it('returns entities with Position, Dimensions, Renderable, and Content', () => {
			const eid = createRenderableEntity();
			addComponent(world, eid, Content);

			const results = queryContent(world);

			expect(results).toContain(eid);
		});

		it('does not return entities without Content', () => {
			const eid = createRenderableEntity();

			const results = queryContent(world);

			expect(results).not.toContain(eid);
		});
	});

	describe('queryBorder', () => {
		it('returns entities with Border component', () => {
			const eid = createRenderableEntity();
			addComponent(world, eid, Border);

			const results = queryBorder(world);

			expect(results).toContain(eid);
		});
	});

	describe('queryPadding', () => {
		it('returns entities with Padding component', () => {
			const eid = createRenderableEntity();
			addComponent(world, eid, Padding);

			const results = queryPadding(world);

			expect(results).toContain(eid);
		});
	});

	describe('queryHierarchy', () => {
		it('returns entities with Hierarchy component', () => {
			const eid = addEntity(world) as Entity;
			addComponent(world, eid, Hierarchy);

			const results = queryHierarchy(world);

			expect(results).toContain(eid);
		});
	});

	describe('filterVisible', () => {
		it('returns only visible entities', () => {
			const visible = createRenderableEntity();
			Renderable.visible[visible] = 1;

			const hidden = createRenderableEntity();
			Renderable.visible[hidden] = 0;

			const entities = queryRenderable(world);
			const results = filterVisible(world, entities);

			expect(results).toContain(visible);
			expect(results).not.toContain(hidden);
		});

		it('returns empty array when no visible entities', () => {
			const hidden = createRenderableEntity();
			Renderable.visible[hidden] = 0;

			const entities = queryRenderable(world);
			const results = filterVisible(world, entities);

			expect(results).toHaveLength(0);
		});
	});

	describe('filterDirty', () => {
		it('returns only dirty entities', () => {
			const dirty = createRenderableEntity();
			Renderable.dirty[dirty] = 1;

			const clean = createRenderableEntity();
			Renderable.dirty[clean] = 0;

			const entities = queryRenderable(world);
			const results = filterDirty(world, entities);

			expect(results).toContain(dirty);
			expect(results).not.toContain(clean);
		});
	});

	describe('filterVisibleDirty', () => {
		it('returns only entities that are both visible and dirty', () => {
			const visibleDirty = createRenderableEntity();
			Renderable.visible[visibleDirty] = 1;
			Renderable.dirty[visibleDirty] = 1;

			const visibleClean = createRenderableEntity();
			Renderable.visible[visibleClean] = 1;
			Renderable.dirty[visibleClean] = 0;

			const hiddenDirty = createRenderableEntity();
			Renderable.visible[hiddenDirty] = 0;
			Renderable.dirty[hiddenDirty] = 1;

			const entities = queryRenderable(world);
			const results = filterVisibleDirty(world, entities);

			expect(results).toContain(visibleDirty);
			expect(results).not.toContain(visibleClean);
			expect(results).not.toContain(hiddenDirty);
		});
	});

	describe('getChildEntities', () => {
		it('returns child entities of a parent', () => {
			const parent = addEntity(world) as Entity;
			addComponent(world, parent, Hierarchy);
			Hierarchy.parent[parent] = 0;
			Hierarchy.firstChild[parent] = 0;
			Hierarchy.childCount[parent] = 0;

			const child1 = addEntity(world) as Entity;
			addComponent(world, child1, Hierarchy);
			setParent(world, child1, parent);

			const child2 = addEntity(world) as Entity;
			addComponent(world, child2, Hierarchy);
			setParent(world, child2, parent);

			const children = getChildEntities(world, parent);

			expect(children).toContain(child1);
			expect(children).toContain(child2);
			expect(children.length).toBe(2);
		});

		it('returns empty array for entity with no children', () => {
			const parent = addEntity(world) as Entity;
			addComponent(world, parent, Hierarchy);
			Hierarchy.parent[parent] = 0;
			Hierarchy.firstChild[parent] = 0;
			Hierarchy.childCount[parent] = 0;

			const children = getChildEntities(world, parent);

			expect(children).toHaveLength(0);
		});
	});

	describe('getDescendantEntities', () => {
		it('returns all descendants including grandchildren', () => {
			const root = addEntity(world) as Entity;
			addComponent(world, root, Hierarchy);
			Hierarchy.parent[root] = 0;
			Hierarchy.firstChild[root] = 0;
			Hierarchy.childCount[root] = 0;
			Hierarchy.nextSibling[root] = 0;
			Hierarchy.prevSibling[root] = 0;

			const child = addEntity(world) as Entity;
			addComponent(world, child, Hierarchy);
			Hierarchy.parent[child] = 0;
			Hierarchy.firstChild[child] = 0;
			Hierarchy.childCount[child] = 0;
			Hierarchy.nextSibling[child] = 0;
			Hierarchy.prevSibling[child] = 0;
			setParent(world, child, root);

			const grandchild = addEntity(world) as Entity;
			addComponent(world, grandchild, Hierarchy);
			Hierarchy.parent[grandchild] = 0;
			Hierarchy.firstChild[grandchild] = 0;
			Hierarchy.childCount[grandchild] = 0;
			Hierarchy.nextSibling[grandchild] = 0;
			Hierarchy.prevSibling[grandchild] = 0;
			setParent(world, grandchild, child);

			const descendants = getDescendantEntities(world, root);

			expect(descendants).toContain(child);
			expect(descendants).toContain(grandchild);
			expect(descendants.length).toBe(2);
		});
	});

	describe('getRootEntities', () => {
		it('returns entities with no parent', () => {
			const root1 = addEntity(world) as Entity;
			addComponent(world, root1, Hierarchy);
			Hierarchy.parent[root1] = 0;

			const root2 = addEntity(world) as Entity;
			addComponent(world, root2, Hierarchy);
			Hierarchy.parent[root2] = 0;

			const child = addEntity(world) as Entity;
			addComponent(world, child, Hierarchy);
			Hierarchy.parent[child] = root1;

			const roots = getRootEntities(world);

			expect(roots).toContain(root1);
			expect(roots).toContain(root2);
			expect(roots).not.toContain(child);
		});
	});

	describe('filterFocusable', () => {
		it('returns only entities with focusable enabled', () => {
			const enabled = addEntity(world) as Entity;
			addComponent(world, enabled, Focusable);
			Focusable.focusable[enabled] = 1;

			const disabled = addEntity(world) as Entity;
			addComponent(world, disabled, Focusable);
			Focusable.focusable[disabled] = 0;

			const entities = queryFocusable(world);
			const results = filterFocusable(world, entities);

			expect(results).toContain(enabled);
			expect(results).not.toContain(disabled);
		});
	});

	describe('filterClickable', () => {
		it('returns only clickable entities', () => {
			const clickable = addEntity(world) as Entity;
			addComponent(world, clickable, Interactive);
			Interactive.clickable[clickable] = 1;

			const notClickable = addEntity(world) as Entity;
			addComponent(world, notClickable, Interactive);
			Interactive.clickable[notClickable] = 0;

			const entities = queryInteractive(world);
			const results = filterClickable(world, entities);

			expect(results).toContain(clickable);
			expect(results).not.toContain(notClickable);
		});
	});

	describe('sortByZIndex', () => {
		it('sorts entities by z position ascending', () => {
			const eid1 = createRenderableEntity();
			Position.z[eid1] = 10;

			const eid2 = createRenderableEntity();
			Position.z[eid2] = 5;

			const eid3 = createRenderableEntity();
			Position.z[eid3] = 15;

			const entities = queryRenderable(world);
			const sorted = sortByZIndex(world, entities);

			expect(sorted[0]).toBe(eid2); // z=5
			expect(sorted[1]).toBe(eid1); // z=10
			expect(sorted[2]).toBe(eid3); // z=15
		});

		it('does not modify the original array', () => {
			const eid1 = createRenderableEntity();
			Position.z[eid1] = 10;

			const eid2 = createRenderableEntity();
			Position.z[eid2] = 5;

			const entities = queryRenderable(world);
			const originalFirst = entities[0];

			sortByZIndex(world, entities);

			expect(entities[0]).toBe(originalFirst);
		});
	});

	describe('sortByTabIndex', () => {
		it('sorts entities by tab index', () => {
			const tab1 = addEntity(world) as Entity;
			addComponent(world, tab1, Focusable);
			Focusable.tabIndex[tab1] = 1;

			const tab2 = addEntity(world) as Entity;
			addComponent(world, tab2, Focusable);
			Focusable.tabIndex[tab2] = 2;

			const tab3 = addEntity(world) as Entity;
			addComponent(world, tab3, Focusable);
			Focusable.tabIndex[tab3] = 3;

			const entities = queryFocusable(world);
			const sorted = sortByTabIndex(world, entities);

			expect(sorted[0]).toBe(tab1);
			expect(sorted[1]).toBe(tab2);
			expect(sorted[2]).toBe(tab3);
		});

		it('puts tabIndex 0 after positive tabIndices', () => {
			const tab0 = addEntity(world) as Entity;
			addComponent(world, tab0, Focusable);
			Focusable.tabIndex[tab0] = 0;

			const tab1 = addEntity(world) as Entity;
			addComponent(world, tab1, Focusable);
			Focusable.tabIndex[tab1] = 1;

			const entities = queryFocusable(world);
			const sorted = sortByTabIndex(world, entities);

			expect(sorted[0]).toBe(tab1);
			expect(sorted[1]).toBe(tab0);
		});
	});

	describe('sortByDepth', () => {
		it('sorts entities by hierarchy depth ascending', () => {
			const root = addEntity(world) as Entity;
			addComponent(world, root, Hierarchy);
			Hierarchy.depth[root] = 0;

			const child = addEntity(world) as Entity;
			addComponent(world, child, Hierarchy);
			Hierarchy.depth[child] = 1;

			const grandchild = addEntity(world) as Entity;
			addComponent(world, grandchild, Hierarchy);
			Hierarchy.depth[grandchild] = 2;

			const entities = queryHierarchy(world);
			const sorted = sortByDepth(world, entities);

			expect(sorted[0]).toBe(root);
			expect(sorted[1]).toBe(child);
			expect(sorted[2]).toBe(grandchild);
		});
	});

	describe('Query performance', () => {
		it('handles many entities efficiently', () => {
			const COUNT = 1000;

			// Create many entities
			for (let i = 0; i < COUNT; i++) {
				createRenderableEntity();
			}

			const start = performance.now();
			const results = queryRenderable(world);
			const elapsed = performance.now() - start;

			expect(results.length).toBe(COUNT);
			// Should complete in reasonable time (less than 100ms)
			expect(elapsed).toBeLessThan(100);
		});

		it('filter operations are efficient', () => {
			const COUNT = 1000;

			for (let i = 0; i < COUNT; i++) {
				const eid = createRenderableEntity();
				Renderable.visible[eid] = i % 2 === 0 ? 1 : 0;
				Renderable.dirty[eid] = i % 3 === 0 ? 1 : 0;
			}

			const entities = queryRenderable(world);

			const start = performance.now();
			filterVisibleDirty(world, entities);
			const elapsed = performance.now() - start;

			// Should complete in reasonable time (less than 50ms)
			expect(elapsed).toBeLessThan(50);
		});
	});
});
