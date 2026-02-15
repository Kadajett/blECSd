/**
 * Style inheritance system tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { appendChild, Hierarchy } from '../components/hierarchy';
import { DEFAULT_FG, Renderable } from '../components/renderable';
import { addComponent, addEntity } from '../core/ecs';
import { COLORS_RGBA, createTestWorld } from '../testing';
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
			const world = createTestWorld();
			const entity = addEntity(world);

			const style = getLocalStyle(world, entity);

			expect(style.fg).toBe(DEFAULT_FG);
		});

		it('returns entity style for entity with Renderable', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;
			Renderable.bold[entity] = 1;

			const style = getLocalStyle(world, entity);

			expect(style.fg).toBe(COLORS_RGBA.RED);
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
			expect(isDefaultColor(COLORS_RGBA.RED)).toBe(false);
		});
	});

	describe('mergeStyles', () => {
		it('uses child fg if set', () => {
			const parent = { ...getDefaultStyle(), fg: COLORS_RGBA.RED };
			const child = { ...getDefaultStyle(), fg: COLORS_RGBA.GREEN };

			const merged = mergeStyles(parent, child);

			expect(merged.fg).toBe(COLORS_RGBA.GREEN);
		});

		it('inherits parent fg if child is default', () => {
			const parent = { ...getDefaultStyle(), fg: COLORS_RGBA.RED };
			const child = getDefaultStyle();

			const merged = mergeStyles(parent, child);

			expect(merged.fg).toBe(COLORS_RGBA.RED);
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
			const parent = { ...getDefaultStyle(), bg: COLORS_RGBA.RED };
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
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			const style = computeInheritedStyle(world, entity);

			expect(style.fg).toBe(COLORS_RGBA.RED);
		});

		it('inherits fg from parent', () => {
			const world = createTestWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = COLORS_RGBA.RED;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(COLORS_RGBA.RED);
		});

		it('child fg overrides parent fg', () => {
			const world = createTestWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = COLORS_RGBA.RED;
			Renderable.fg[child] = COLORS_RGBA.GREEN;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(COLORS_RGBA.GREEN);
		});

		it('inherits bold from parent', () => {
			const world = createTestWorld();
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
			const world = createTestWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.bg[parent] = COLORS_RGBA.RED;
			Renderable.bg[child] = 0x111111ff;
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.bg).toBe(0x111111ff);
		});

		it('inherits through multiple levels', () => {
			const world = createTestWorld();
			const grandparent = addEntity(world);
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, grandparent, Renderable);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, grandparent, Hierarchy);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[grandparent] = COLORS_RGBA.RED;
			Renderable.fg[parent] = DEFAULT_FG;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, grandparent, parent);
			appendChild(world, parent, child);

			const style = computeInheritedStyle(world, child);

			expect(style.fg).toBe(COLORS_RGBA.RED);
		});

		it('caches computed style', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			computeInheritedStyle(world, entity);

			expect(hasValidStyleCache(world, entity)).toBe(true);
		});

		it('uses cached style on subsequent calls', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			const style1 = computeInheritedStyle(world, entity);
			// Change style (but don't invalidate cache)
			Renderable.fg[entity] = COLORS_RGBA.GREEN;
			const style2 = computeInheritedStyle(world, entity);

			// Should return cached value
			expect(style2.fg).toBe(style1.fg);
		});
	});

	describe('resolveStyle', () => {
		it('is alias for computeInheritedStyle', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			const style1 = computeInheritedStyle(world, entity);
			clearStyleCache();
			const style2 = resolveStyle(world, entity);

			expect(style2.fg).toBe(style1.fg);
		});
	});

	describe('cache operations', () => {
		it('invalidateStyleCache removes entity cache', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);

			computeInheritedStyle(world, entity);
			invalidateStyleCache(world, entity);

			expect(hasValidStyleCache(world, entity)).toBe(false);
		});

		it('invalidateAllStyleCaches increments generation', () => {
			const gen1 = getCacheGeneration();
			invalidateAllStyleCaches();
			const gen2 = getCacheGeneration();

			expect(gen2).toBe(gen1 + 1);
		});

		it('invalidateAllStyleCaches invalidates all caches', () => {
			const world = createTestWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);

			computeInheritedStyle(world, entity1);
			computeInheritedStyle(world, entity2);
			invalidateAllStyleCaches();

			expect(hasValidStyleCache(world, entity1)).toBe(false);
			expect(hasValidStyleCache(world, entity2)).toBe(false);
		});

		it('cache recomputes after invalidation', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			computeInheritedStyle(world, entity);
			invalidateStyleCache(world, entity);
			Renderable.fg[entity] = COLORS_RGBA.GREEN;
			const style = computeInheritedStyle(world, entity);

			expect(style.fg).toBe(COLORS_RGBA.GREEN);
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
			const world = createTestWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = COLORS_RGBA.RED;
			appendChild(world, parent, child);

			const fg = getInheritedProperty(world, child, 'fg');

			expect(fg).toBe(COLORS_RGBA.RED);
		});
	});

	describe('findPropertySource', () => {
		it('returns entity if it has the property set', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = COLORS_RGBA.RED;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(entity);
		});

		it('returns parent if child has default', () => {
			const world = createTestWorld();
			const parent = addEntity(world);
			const child = addEntity(world);
			addComponent(world, parent, Renderable);
			addComponent(world, child, Renderable);
			addComponent(world, parent, Hierarchy);
			addComponent(world, child, Hierarchy);
			Renderable.fg[parent] = COLORS_RGBA.RED;
			Renderable.fg[child] = DEFAULT_FG;
			appendChild(world, parent, child);

			const source = findPropertySource(world, child, 'fg');

			expect(source).toBe(parent);
		});

		it('returns 0 if no source found', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = DEFAULT_FG;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(0);
		});

		it('returns 0 for entity without hierarchy', () => {
			const world = createTestWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = DEFAULT_FG;

			const source = findPropertySource(world, entity, 'fg');

			expect(source).toBe(0);
		});

		it('finds source for bold', () => {
			const world = createTestWorld();
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
			const world = createTestWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);

			precomputeStyles(world, [entity1, entity2]);

			expect(hasValidStyleCache(world, entity1)).toBe(true);
			expect(hasValidStyleCache(world, entity2)).toBe(true);
		});
	});

	describe('getComputedStyles', () => {
		it('returns map of computed styles', () => {
			const world = createTestWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);
			Renderable.fg[entity1] = COLORS_RGBA.RED;
			Renderable.fg[entity2] = COLORS_RGBA.GREEN;

			const styles = getComputedStyles(world, [entity1, entity2]);

			expect(styles.get(entity1)?.fg).toBe(COLORS_RGBA.RED);
			expect(styles.get(entity2)?.fg).toBe(COLORS_RGBA.GREEN);
		});
	});
});
