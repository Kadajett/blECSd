import { addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import {
	colorToHex,
	DEFAULT_BG,
	DEFAULT_FG,
	getRenderable,
	getStyle,
	hasRenderable,
	hexToColor,
	hide,
	isDirty,
	isVisible,
	markClean,
	markDirty,
	packColor,
	Renderable,
	setStyle,
	setVisible,
	show,
	unpackColor,
} from './renderable';

describe('Renderable component', () => {
	describe('color utilities', () => {
		describe('packColor', () => {
			it('packs RGB correctly', () => {
				const color = packColor(255, 128, 64);
				const { r, g, b, a } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(128);
				expect(b).toBe(64);
				expect(a).toBe(255);
			});

			it('packs RGBA correctly', () => {
				const color = packColor(100, 150, 200, 128);
				const { r, g, b, a } = unpackColor(color);
				expect(r).toBe(100);
				expect(g).toBe(150);
				expect(b).toBe(200);
				expect(a).toBe(128);
			});
		});

		describe('hexToColor', () => {
			it('converts 6-digit hex', () => {
				const color = hexToColor('#ff8040');
				const { r, g, b, a } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(128);
				expect(b).toBe(64);
				expect(a).toBe(255);
			});

			it('converts 8-digit hex with alpha', () => {
				const color = hexToColor('#ff804080');
				const { r, g, b, a } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(128);
				expect(b).toBe(64);
				expect(a).toBe(128);
			});

			it('converts 3-digit hex', () => {
				const color = hexToColor('#f84');
				const { r, g, b } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(136);
				expect(b).toBe(68);
			});

			it('converts 4-digit hex with alpha', () => {
				const color = hexToColor('#f848');
				const { r, g, b, a } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(136);
				expect(b).toBe(68);
				expect(a).toBe(136);
			});

			it('handles without hash', () => {
				const color = hexToColor('ff0000');
				const { r, g, b } = unpackColor(color);
				expect(r).toBe(255);
				expect(g).toBe(0);
				expect(b).toBe(0);
			});
		});

		describe('colorToHex', () => {
			it('converts to 6-digit hex', () => {
				const color = packColor(255, 128, 64);
				expect(colorToHex(color)).toBe('#ff8040');
			});

			it('converts to 8-digit hex with alpha', () => {
				const color = packColor(255, 128, 64, 128);
				expect(colorToHex(color, true)).toBe('#ff804080');
			});
		});
	});

	describe('setStyle', () => {
		it('sets foreground color from hex', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { fg: '#ff0000' });

			const { r, g, b } = unpackColor(Renderable.fg[eid] as number);
			expect(r).toBe(255);
			expect(g).toBe(0);
			expect(b).toBe(0);
		});

		it('sets background color from hex', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { bg: '#00ff00' });

			const { r, g, b } = unpackColor(Renderable.bg[eid] as number);
			expect(r).toBe(0);
			expect(g).toBe(255);
			expect(b).toBe(0);
		});

		it('sets color from packed number', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const red = packColor(255, 0, 0);

			setStyle(world, eid, { fg: red });

			// Use unsigned comparison (Uint32Array stores unsigned values)
			expect(Renderable.fg[eid]).toBe(red >>> 0);
		});

		it('sets bold style', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { bold: true });

			expect(Renderable.bold[eid]).toBe(1);
		});

		it('sets underline style', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { underline: true });

			expect(Renderable.underline[eid]).toBe(1);
		});

		it('sets multiple styles', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, {
				fg: '#ffffff',
				bold: true,
				underline: true,
				blink: true,
			});

			expect(Renderable.bold[eid]).toBe(1);
			expect(Renderable.underline[eid]).toBe(1);
			expect(Renderable.blink[eid]).toBe(1);
		});

		it('marks entity as dirty', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { fg: '#ff0000' });

			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('initializes visible to true', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setStyle(world, eid, { fg: '#ff0000' });

			expect(Renderable.visible[eid]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setStyle(world, eid, { fg: '#ff0000' });

			expect(result).toBe(eid);
		});
	});

	describe('getStyle', () => {
		it('returns style data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, {
				fg: '#ff0000',
				bg: '#00ff00',
				bold: true,
				underline: false,
			});

			const style = getStyle(world, eid);

			expect(style).toBeDefined();
			expect(style?.bold).toBe(true);
			expect(style?.underline).toBe(false);
		});

		it('returns undefined for entity without Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const style = getStyle(world, eid);

			expect(style).toBeUndefined();
		});
	});

	describe('getRenderable', () => {
		it('returns full renderable data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000', bold: true });

			const data = getRenderable(world, eid);

			expect(data).toBeDefined();
			expect(data?.visible).toBe(true);
			expect(data?.dirty).toBe(true);
			expect(data?.bold).toBe(true);
		});

		it('returns undefined for entity without Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const data = getRenderable(world, eid);

			expect(data).toBeUndefined();
		});
	});

	describe('markDirty', () => {
		it('sets dirty flag', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });
			markClean(world, eid);

			markDirty(world, eid);

			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = markDirty(world, eid);

			expect(result).toBe(eid);
		});
	});

	describe('markClean', () => {
		it('clears dirty flag', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			markClean(world, eid);

			expect(Renderable.dirty[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			const result = markClean(world, eid);

			expect(result).toBe(eid);
		});
	});

	describe('isDirty', () => {
		it('returns true when dirty', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			expect(isDirty(world, eid)).toBe(true);
		});

		it('returns false when clean', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });
			markClean(world, eid);

			expect(isDirty(world, eid)).toBe(false);
		});

		it('returns false for entity without Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isDirty(world, eid)).toBe(false);
		});
	});

	describe('setVisible', () => {
		it('sets visible to true', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });
			setVisible(world, eid, false);

			setVisible(world, eid, true);

			expect(Renderable.visible[eid]).toBe(1);
		});

		it('sets visible to false', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			setVisible(world, eid, false);

			expect(Renderable.visible[eid]).toBe(0);
		});

		it('marks dirty when visibility changes', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });
			markClean(world, eid);

			setVisible(world, eid, false);

			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setVisible(world, eid, true);

			expect(result).toBe(eid);
		});
	});

	describe('isVisible', () => {
		it('returns true when visible', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			expect(isVisible(world, eid)).toBe(true);
		});

		it('returns false when hidden', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });
			setVisible(world, eid, false);

			expect(isVisible(world, eid)).toBe(false);
		});

		it('returns false for entity without Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isVisible(world, eid)).toBe(false);
		});
	});

	describe('show/hide', () => {
		it('show sets visible to true', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setVisible(world, eid, false);

			show(world, eid);

			expect(isVisible(world, eid)).toBe(true);
		});

		it('hide sets visible to false', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			hide(world, eid);

			expect(isVisible(world, eid)).toBe(false);
		});
	});

	describe('hasRenderable', () => {
		it('returns true when entity has Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setStyle(world, eid, { fg: '#ff0000' });

			expect(hasRenderable(world, eid)).toBe(true);
		});

		it('returns false when entity lacks Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(hasRenderable(world, eid)).toBe(false);
		});
	});

	describe('default values', () => {
		it('DEFAULT_FG is white', () => {
			const { r, g, b, a } = unpackColor(DEFAULT_FG);
			expect(r).toBe(255);
			expect(g).toBe(255);
			expect(b).toBe(255);
			expect(a).toBe(255);
		});

		it('DEFAULT_BG is transparent black', () => {
			const { r, g, b, a } = unpackColor(DEFAULT_BG);
			expect(r).toBe(0);
			expect(g).toBe(0);
			expect(b).toBe(0);
			expect(a).toBe(0);
		});
	});
});
