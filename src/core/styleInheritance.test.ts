/**
 * Style inheritance system tests.
 */

import { addComponent, addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { appendChild, Hierarchy } from '../components/hierarchy';
import { DEFAULT_FG, Renderable } from '../components/renderable';
import {
	clearStyleCache,
	computeInheritedStyle,
	doesPropertyInherit,
	findPropertySource,
	getCacheGeneration,
	getComputedStyles,
	getDefaultStyle,
	getInheritedProperty,
	getLocalStyle,
	hasValidStyleCache,
	INHERITING_PROPERTIES,
	invalidateAllStyleCaches,
	invalidateStyleCache,
	isDefaultColor,
	mergeStyles,
	NON_INHERITING_PROPERTIES,
	precomputeStyles,
	resolveStyle,
} from './styleInheritance';

describe('styleInheritance', () => {
	beforeEach(() => {
		clearStyleCache();
	});

	describe('INHERITING_PROPERTIES', () => {
		it('includes fg', () => {
			expect(INHERITING_PROPERTIES).toContain('fg');
		});

		it('includes bold', () => {
			expect(INHERITING_PROPERTIES).toContain('bold');
		});

		it('includes underline', () => {
			expect(INHERITING_PROPERTIES).toContain('underline');
		});

		it('includes blink', () => {
			expect(INHERITING_PROPERTIES).toContain('blink');
		});

		it('includes inverse', () => {
			expect(INHERITING_PROPERTIES).toContain('inverse');
		});

		it('does not include bg', () => {
			expect(INHERITING_PROPERTIES).not.toContain('bg');
		});

		it('does not include transparent', () => {
			expect(INHERITING_PROPERTIES).not.toContain('transparent');
		});
	});

	describe('NON_INHERITING_PROPERTIES', () => {
		it('includes bg', () => {
			expect(NON_INHERITING_PROPERTIES).toContain('bg');
		});

		it('includes transparent', () => {
			expect(NON_INHERITING_PROPERTIES).toContain('transparent');
		});
	});

	describe('getDefaultStyle', () => {
		it('returns default values', () => {
			const style = getDefaultStyle();

			expect(style.fg).toBe(DEFAULT_FG);
			expect(style.bg).toBe(0);
			expect(style.bold).toBe(false);
			expect(style.underline).toBe(false);
			expect(style.blink).toBe(false);
			expect(style.inverse).toBe(false);
			expect(style.transparent).toBe(false);
		});
	});

	describe('getLocalStyle', () => {
		it('returns default for entity without Renderable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const style = getLocalStyle(world, entity);

			expect(style.fg).toBe(DEFAULT_FG);
		});

		it('returns entity style for entity with Renderable', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;
			Renderable.bold[entity] = 1;

			const style = getLocalStyle(world, entity);

			expect(style.fg).toBe(0xff0000ff);
			expect(style.bold).toBe(true);
		});
	});

	describe('isDefaultColor', () => {
		it('returns true for DEFAULT_FG', () => {
			expect(isDefaultColor(DEFAULT_FG)).toBe(true);
		});

		it('returns true for 0', () => {
			expect(isDefaultColor(0)).toBe(true);
		});

		it('returns false for non-default color', () => {
			expect(isDefaultColor(0xff0000ff)).toBe(false);
		});
	});

	describe('mergeStyles', () => {
		it('uses child fg if set', () => {
			const parent = { ...getDefaultStyle(), fg: 0xff0000ff };
			const child = { ...getDefaultStyle(), fg: 0x00ff00ff };

			const merged = mergeStyles(parent, child);

			expect(merged.fg).toBe(0x00ff00ff);
		});

		it('inherits parent fg if child is default', () => {
			const parent = { ...getDefaultStyle(), fg: 0xff0000ff };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.fg).toBe(0xff0000ff);
		});

		it('inherits bold from parent', () => {
			const parent = { ...getDefaultStyle(), bold: true };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.bold).toBe(true);
		});

		it('inherits underline from parent', () => {
			const parent = { ...getDefaultStyle(), underline: true };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.underline).toBe(true);
		});

		it('inherits blink from parent', () => {
			const parent = { ...getDefaultStyle(), blink: true };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.blink).toBe(true);
		});

		it('inherits inverse from parent', () => {
			const parent = { ...getDefaultStyle(), inverse: true };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.inverse).toBe(true);
		});

		it('does not inherit bg', () => {
			const parent = { ...getDefaultStyle(), bg: 0xff0000ff };
			const child = { ...getDefaultStyle(), bg: 0x111111ff };

			const merged = mergeStyles(parent, child);

			expect(merged.bg).toBe(0x111111ff);
		});

		it('does not inherit transparent', () => {
			const parent = { ...getDefaultStyle(), transparent: true };
			const child = { ...getDefaultStyle(), transparent: false };

			const merged = mergeStyles(parent, child);

			expect(merged.transparent).toBe(false);
		});
	});

	describe('computeInheritedStyle', () => {
		it('returns local style for entity without hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			const style = computeInheritedStyle(world, entity);

			expect(style.fg).toBe(0xff0000ff);
		});

		it('inherits fg from parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = 0xff0000ff;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(0xff0000ff);
		});

		it('child fg overrides parent fg', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = 0xff0000ff;
			Renderable.fg[child] = 0x00ff00ff;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(0x00ff00ff);
		});

		it('inherits bold from parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.bold[parent] = 1;
			Renderable.bold[child] = 0;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.bold).toBe(true);
		});

		it('does not inherit bg', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.bg[parent] = 0xff0000ff;
			Renderable.bg[child] = 0x111111ff;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.bg).toBe(0x111111ff);
		});

		it('inherits through multiple levels', () => {
			const world = createWorld();
			const grandparent = addEntity(world);
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, grandparent, Renderable);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, grandparent, Hierarchy);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[grandparent] = 0xff0000ff;
			Renderable.fg[parent] = DEFAULT_FG;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, grandparent, parent);
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(0xff0000ff);
		});

		it('caches computed style', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			computeInheritedStyle(world, entity);

			expect(hasValidStyleCache(entity)).toBe(true);
		});

		it('uses cached style on subsequent calls', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			const style1 = computeInheritedStyle(world, entity);
			// Change style (but don't invalidate cache)
			Renderable.fg[entity] = 0x00ff00ff;
			const style2 = computeInheritedStyle(world, entity);

			// Should return cached value
			expect(style2.fg).toBe(style1.fg);
		});
	});

	describe('resolveStyle', () => {
		it('is alias for computeInheritedStyle', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			const style1 = computeInheritedStyle(world, entity);
			clearStyleCache();
			const style2 = resolveStyle(world, entity);

			expect(style2.fg).toBe(style1.fg);
		});
	});

	describe('cache operations', () => {
		it('invalidateStyleCache removes entity cache', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);

			computeInheritedStyle(world, entity);
			invalidateStyleCache(entity);

			expect(hasValidStyleCache(entity)).toBe(false);
		});

		it('invalidateAllStyleCaches increments generation', () => {
			const gen1 = getCacheGeneration();
			invalidateAllStyleCaches();
			const gen2 = getCacheGeneration();

			expect(gen2).toBe(gen1 + 1);
		});

		it('invalidateAllStyleCaches invalidates all caches', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);

			computeInheritedStyle(world, entity1);
			computeInheritedStyle(world, entity2);
			invalidateAllStyleCaches();

			expect(hasValidStyleCache(entity1)).toBe(false);
			expect(hasValidStyleCache(entity2)).toBe(false);
		});

		it('cache recomputes after invalidation', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			computeInheritedStyle(world, entity);
			invalidateStyleCache(entity);
			Renderable.fg[entity] = 0x00ff00ff;
			const style = computeInheritedStyle(world, entity);

			expect(style.fg).toBe(0x00ff00ff);
		});
	});

	describe('doesPropertyInherit', () => {
		it('returns true for fg', () => {
			expect(doesPropertyInherit('fg')).toBe(true);
		});

		it('returns true for bold', () => {
			expect(doesPropertyInherit('bold')).toBe(true);
		});

		it('returns false for bg', () => {
			expect(doesPropertyInherit('bg')).toBe(false);
		});

		it('returns false for transparent', () => {
			expect(doesPropertyInherit('transparent')).toBe(false);
		});
	});

	describe('getInheritedProperty', () => {
		it('returns inherited value', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = 0xff0000ff;
			appendChild(world, parent, child);

			const fg = getInheritedProperty(world, child, 'fg');

			expect(fg).toBe(0xff0000ff);
		});
	});

	describe('findPropertySource', () => {
		it('returns entity if it has the property set', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xff0000ff;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(entity);
		});

		it('returns parent if child has default', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = 0xff0000ff;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, parent, child);

			const source = findPropertySource(world, child, 'fg');

			expect(source).toBe(parent);
		});

		it('returns 0 if no source found', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = DEFAULT_FG;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(0);
		});

		it('returns 0 for entity without hierarchy', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = DEFAULT_FG;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(0);
		});

		it('finds source for bold', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.bold[parent] = 1;
			Renderable.bold[child] = 0;
			appendChild(world, parent, child);

			const source = findPropertySource(world, child, 'bold');

			expect(source).toBe(parent);
		});
	});

	describe('precomputeStyles', () => {
		it('caches styles for all entities', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);

			precomputeStyles(world, [entity1, entity2]);

			expect(hasValidStyleCache(entity1)).toBe(true);
			expect(hasValidStyleCache(entity2)).toBe(true);
		});
	});

	describe('getComputedStyles', () => {
		it('returns map of computed styles', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);
			Renderable.fg[entity1] = 0xff0000ff;
			Renderable.fg[entity2] = 0x00ff00ff;

			const styles = getComputedStyles(world, [entity1, entity2]);

			expect(styles.get(entity1)?.fg).toBe(0xff0000ff);
			expect(styles.get(entity2)?.fg).toBe(0x00ff00ff);
		});
	});
});
