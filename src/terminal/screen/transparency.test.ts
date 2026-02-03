/**
 * Tests for transparency and alpha blending utilities.
 */

import { addComponent, addEntity, createWorld, type World } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendChild, Hierarchy } from '../../components/hierarchy';
import { packColor, Renderable, setStyle, unpackColor } from '../../components/renderable';
import type { Entity } from '../../core/types';
import {
	blendCellColors,
	blendColors,
	blendPremultiplied,
	fromPremultiplied,
	getEffectiveOpacity,
	getOpacity,
	getParentBackground,
	hasPartialOpacity,
	isTransparent,
	needsBlending,
	setOpacity,
	setTransparent,
	toPremultiplied,
} from './transparency';

describe('transparency', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld();
		entity = addEntity(world) as Entity;
	});

	afterEach(() => {
		// Reset world
	});

	describe('isTransparent', () => {
		it('returns false for entity without Renderable', () => {
			expect(isTransparent(world, entity)).toBe(false);
		});

		it('returns false by default', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			expect(isTransparent(world, entity)).toBe(false);
		});

		it('returns true when transparent is set', () => {
			setStyle(world, entity, { transparent: true });
			expect(isTransparent(world, entity)).toBe(true);
		});
	});

	describe('hasPartialOpacity', () => {
		it('returns false for entity without Renderable', () => {
			expect(hasPartialOpacity(world, entity)).toBe(false);
		});

		it('returns false for fully opaque entity', () => {
			setStyle(world, entity, { opacity: 1 });
			expect(hasPartialOpacity(world, entity)).toBe(false);
		});

		it('returns true for partially opaque entity', () => {
			setStyle(world, entity, { opacity: 0.5 });
			expect(hasPartialOpacity(world, entity)).toBe(true);
		});

		it('returns true for fully transparent entity', () => {
			setStyle(world, entity, { opacity: 0 });
			expect(hasPartialOpacity(world, entity)).toBe(true);
		});
	});

	describe('getOpacity / setOpacity', () => {
		it('returns 1 for entity without Renderable', () => {
			expect(getOpacity(world, entity)).toBe(1);
		});

		it('returns 1 by default', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			expect(getOpacity(world, entity)).toBe(1);
		});

		it('sets and gets opacity correctly', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			setOpacity(world, entity, 0.5);
			expect(getOpacity(world, entity)).toBeCloseTo(0.5, 2);
		});

		it('clamps opacity to 0-1 range', () => {
			setStyle(world, entity, { fg: '#ffffff' });

			setOpacity(world, entity, -0.5);
			expect(getOpacity(world, entity)).toBe(0);

			setOpacity(world, entity, 1.5);
			expect(getOpacity(world, entity)).toBe(1);
		});

		it('marks entity as dirty when setting opacity', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			Renderable.dirty[entity] = 0;

			setOpacity(world, entity, 0.5);
			expect(Renderable.dirty[entity]).toBe(1);
		});
	});

	describe('setTransparent', () => {
		it('sets transparent flag', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			expect(isTransparent(world, entity)).toBe(false);

			setTransparent(world, entity, true);
			expect(isTransparent(world, entity)).toBe(true);

			setTransparent(world, entity, false);
			expect(isTransparent(world, entity)).toBe(false);
		});

		it('marks entity as dirty', () => {
			setStyle(world, entity, { fg: '#ffffff' });
			Renderable.dirty[entity] = 0;

			setTransparent(world, entity, true);
			expect(Renderable.dirty[entity]).toBe(1);
		});
	});

	describe('getEffectiveOpacity', () => {
		it('returns entity opacity when no parent', () => {
			setStyle(world, entity, { opacity: 0.5 });
			expect(getEffectiveOpacity(world, entity)).toBeCloseTo(0.5, 2);
		});

		it('compounds opacity through hierarchy', () => {
			// Create parent with 50% opacity
			const parent = addEntity(world) as Entity;
			setStyle(world, parent, { opacity: 0.5 });
			addComponent(world, parent, Hierarchy);

			// Create child with 50% opacity
			setStyle(world, entity, { opacity: 0.5 });
			addComponent(world, entity, Hierarchy);
			appendChild(world, parent, entity);

			// Effective opacity should be 0.5 * 0.5 = 0.25
			const effective = getEffectiveOpacity(world, entity);
			expect(effective).toBeCloseTo(0.25, 2);
		});

		it('compounds through multiple ancestors', () => {
			// Grandparent -> Parent -> Child
			const grandparent = addEntity(world) as Entity;
			const parent = addEntity(world) as Entity;

			setStyle(world, grandparent, { opacity: 0.5 });
			setStyle(world, parent, { opacity: 0.5 });
			setStyle(world, entity, { opacity: 0.5 });

			addComponent(world, grandparent, Hierarchy);
			addComponent(world, parent, Hierarchy);
			addComponent(world, entity, Hierarchy);

			appendChild(world, grandparent, parent);
			appendChild(world, parent, entity);

			// Effective: 0.5 * 0.5 * 0.5 = 0.125
			const effective = getEffectiveOpacity(world, entity);
			expect(effective).toBeCloseTo(0.125, 2);
		});
	});

	describe('blendColors', () => {
		it('returns foreground when opacity is 1', () => {
			const fg = packColor(255, 0, 0, 255);
			const bg = packColor(0, 0, 255, 255);

			const result = blendColors(fg, bg, 1);
			const { r, g, b } = unpackColor(result);

			expect(r).toBe(255);
			expect(g).toBe(0);
			expect(b).toBe(0);
		});

		it('returns background when opacity is 0', () => {
			const fg = packColor(255, 0, 0, 255);
			const bg = packColor(0, 0, 255, 255);

			const result = blendColors(fg, bg, 0);
			const { r, g, b } = unpackColor(result);

			expect(r).toBe(0);
			expect(g).toBe(0);
			expect(b).toBe(255);
		});

		it('blends colors at 50% opacity', () => {
			const fg = packColor(255, 0, 0, 255);
			const bg = packColor(0, 0, 255, 255);

			const result = blendColors(fg, bg, 0.5);
			const { r, g, b } = unpackColor(result);

			// 50% blend should give purple-ish
			expect(r).toBeCloseTo(128, -1);
			expect(g).toBe(0);
			expect(b).toBeCloseTo(128, -1);
		});

		it('handles foreground with alpha', () => {
			const fg = packColor(255, 0, 0, 128); // 50% alpha red
			const bg = packColor(0, 0, 255, 255);

			const result = blendColors(fg, bg);
			const { r, b } = unpackColor(result);

			// Should blend considering fg alpha
			expect(r).toBeLessThan(255);
			expect(b).toBeGreaterThan(0);
		});
	});

	describe('blendCellColors', () => {
		it('returns original colors when opacity is 1', () => {
			const fg = packColor(255, 255, 255, 255);
			const bg = packColor(100, 100, 100, 255);

			const { fg: blendedFg, bg: blendedBg } = blendCellColors(fg, bg, 1);

			expect(blendedFg).toBe(fg);
			expect(blendedBg).toBe(bg);
		});

		it('blends with parent background at partial opacity', () => {
			const fg = packColor(255, 255, 255, 255);
			const bg = packColor(100, 100, 100, 255);
			const parentBg = packColor(0, 0, 0, 255);

			const { bg: blendedBg } = blendCellColors(fg, bg, 0.5, parentBg);
			const { r, g, b } = unpackColor(blendedBg);

			// Background should be darker due to blending with black parent
			expect(r).toBeLessThan(100);
			expect(g).toBeLessThan(100);
			expect(b).toBeLessThan(100);
		});
	});

	describe('getParentBackground', () => {
		it('returns black when no parent', () => {
			setStyle(world, entity, { transparent: true });
			const bg = getParentBackground(world, entity);
			const { r, g, b, a } = unpackColor(bg);

			expect(r).toBe(0);
			expect(g).toBe(0);
			expect(b).toBe(0);
			expect(a).toBe(255);
		});

		it('returns parent background color', () => {
			const parent = addEntity(world) as Entity;
			setStyle(world, parent, { bg: '#ff0000' });
			addComponent(world, parent, Hierarchy);

			setStyle(world, entity, { transparent: true });
			addComponent(world, entity, Hierarchy);
			appendChild(world, parent, entity);

			const bg = getParentBackground(world, entity);
			const { r, g, b } = unpackColor(bg);

			expect(r).toBe(255);
			expect(g).toBe(0);
			expect(b).toBe(0);
		});

		it('skips transparent parents', () => {
			const grandparent = addEntity(world) as Entity;
			const parent = addEntity(world) as Entity;

			setStyle(world, grandparent, { bg: '#00ff00' });
			setStyle(world, parent, { bg: '#ff0000', transparent: true });
			setStyle(world, entity, { transparent: true });

			addComponent(world, grandparent, Hierarchy);
			addComponent(world, parent, Hierarchy);
			addComponent(world, entity, Hierarchy);

			appendChild(world, grandparent, parent);
			appendChild(world, parent, entity);

			const bg = getParentBackground(world, entity);
			const { r, g, b } = unpackColor(bg);

			// Should get grandparent's green, not parent's red
			expect(r).toBe(0);
			expect(g).toBe(255);
			expect(b).toBe(0);
		});
	});

	describe('needsBlending', () => {
		it('returns false for fully opaque entity', () => {
			setStyle(world, entity, { opacity: 1 });
			expect(needsBlending(world, entity)).toBe(false);
		});

		it('returns true for partially opaque entity', () => {
			setStyle(world, entity, { opacity: 0.5 });
			expect(needsBlending(world, entity)).toBe(true);
		});

		it('returns true for transparent entity', () => {
			setStyle(world, entity, { transparent: true });
			expect(needsBlending(world, entity)).toBe(true);
		});

		it('returns true when parent has partial opacity', () => {
			const parent = addEntity(world) as Entity;
			setStyle(world, parent, { opacity: 0.5 });
			addComponent(world, parent, Hierarchy);

			setStyle(world, entity, { opacity: 1 });
			addComponent(world, entity, Hierarchy);
			appendChild(world, parent, entity);

			expect(needsBlending(world, entity)).toBe(true);
		});
	});

	describe('premultiplied alpha', () => {
		describe('toPremultiplied', () => {
			it('converts to premultiplied alpha', () => {
				const color = packColor(255, 0, 0, 128); // 50% red
				const premult = toPremultiplied(color);
				const { r, g, b, a } = unpackColor(premult);

				expect(r).toBeCloseTo(128, -1); // 255 * 0.5
				expect(g).toBe(0);
				expect(b).toBe(0);
				expect(a).toBe(128);
			});

			it('keeps fully opaque colors unchanged', () => {
				const color = packColor(255, 100, 50, 255);
				const premult = toPremultiplied(color);
				expect(premult).toBe(color);
			});

			it('zeros RGB for fully transparent', () => {
				const color = packColor(255, 100, 50, 0);
				const premult = toPremultiplied(color);
				const { r, g, b, a } = unpackColor(premult);

				expect(r).toBe(0);
				expect(g).toBe(0);
				expect(b).toBe(0);
				expect(a).toBe(0);
			});
		});

		describe('fromPremultiplied', () => {
			it('converts from premultiplied alpha', () => {
				const premult = packColor(128, 0, 0, 128); // Premultiplied 50% red
				const straight = fromPremultiplied(premult);
				const { r, g, b, a } = unpackColor(straight);

				expect(r).toBeCloseTo(255, -1);
				expect(g).toBe(0);
				expect(b).toBe(0);
				expect(a).toBe(128);
			});

			it('returns 0 for fully transparent', () => {
				const premult = packColor(0, 0, 0, 0);
				const straight = fromPremultiplied(premult);
				expect(straight).toBe(0);
			});
		});

		describe('blendPremultiplied', () => {
			it('blends premultiplied colors', () => {
				// 50% opaque red over blue
				const fg = toPremultiplied(packColor(255, 0, 0, 128));
				const bg = toPremultiplied(packColor(0, 0, 255, 255));

				const result = blendPremultiplied(fg, bg);
				const { r, b } = unpackColor(result);

				// Should have some red and blue
				expect(r).toBeGreaterThan(0);
				expect(b).toBeGreaterThan(0);
			});
		});
	});
});
