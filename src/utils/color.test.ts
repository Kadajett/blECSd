/**
 * Tests for color utilities.
 * @module utils/color.test
 */

import { describe, expect, it } from 'vitest';
import { colorToHex, hexToColor, packColor, unpackColor } from './color';

describe('packColor', () => {
	it('packs RGBA components into 32-bit integer', () => {
		const color = packColor(255, 0, 0, 255);

		expect(typeof color).toBe('number');
		expect(color).toBeGreaterThanOrEqual(0);
	});

	it('defaults alpha to 255 when not provided', () => {
		const colorWithAlpha = packColor(255, 0, 0, 255);
		const colorWithoutAlpha = packColor(255, 0, 0);

		expect(colorWithAlpha).toBe(colorWithoutAlpha);
	});

	it('packs pure red correctly', () => {
		const red = packColor(255, 0, 0, 255);
		const { r, g, b, a } = unpackColor(red);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it('packs pure green correctly', () => {
		const green = packColor(0, 255, 0, 255);
		const { r, g, b, a } = unpackColor(green);

		expect(r).toBe(0);
		expect(g).toBe(255);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it('packs pure blue correctly', () => {
		const blue = packColor(0, 0, 255, 255);
		const { r, g, b, a } = unpackColor(blue);

		expect(r).toBe(0);
		expect(g).toBe(0);
		expect(b).toBe(255);
		expect(a).toBe(255);
	});

	it('handles semi-transparent colors', () => {
		const semiTransparent = packColor(255, 0, 0, 128);
		const { r, g, b, a } = unpackColor(semiTransparent);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(128);
	});

	it('handles black', () => {
		const black = packColor(0, 0, 0, 255);
		const { r, g, b, a } = unpackColor(black);

		expect(r).toBe(0);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it('handles white', () => {
		const white = packColor(255, 255, 255, 255);
		const { r, g, b, a } = unpackColor(white);

		expect(r).toBe(255);
		expect(g).toBe(255);
		expect(b).toBe(255);
		expect(a).toBe(255);
	});

	it('clamps values to 8 bits', () => {
		// Values > 255 should be clamped by bitwise AND
		const color = packColor(300, 300, 300, 300);
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBeLessThanOrEqual(255);
		expect(g).toBeLessThanOrEqual(255);
		expect(b).toBeLessThanOrEqual(255);
		expect(a).toBeLessThanOrEqual(255);
	});
});

describe('unpackColor', () => {
	it('unpacks 32-bit color into RGBA components', () => {
		const color = 0xff0000ff; // Red with full alpha
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(0);
		expect(g).toBe(0);
		expect(b).toBe(255);
		expect(a).toBe(255);
	});

	it('returns object with r, g, b, a properties', () => {
		const result = unpackColor(0);

		expect(result).toHaveProperty('r');
		expect(result).toHaveProperty('g');
		expect(result).toHaveProperty('b');
		expect(result).toHaveProperty('a');
	});

	it('handles zero', () => {
		const { r, g, b, a } = unpackColor(0);

		expect(r).toBe(0);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(0);
	});

	it('handles maximum value', () => {
		const { r, g, b, a } = unpackColor(0xffffffff);

		expect(r).toBe(255);
		expect(g).toBe(255);
		expect(b).toBe(255);
		expect(a).toBe(255);
	});

	it('round-trips with packColor', () => {
		const original = { r: 123, g: 45, b: 67, a: 200 };
		const packed = packColor(original.r, original.g, original.b, original.a);
		const unpacked = unpackColor(packed);

		expect(unpacked.r).toBe(original.r);
		expect(unpacked.g).toBe(original.g);
		expect(unpacked.b).toBe(original.b);
		expect(unpacked.a).toBe(original.a);
	});
});

describe('hexToColor', () => {
	it('converts 6-digit hex to color', () => {
		const color = hexToColor('#ff0000');
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255); // Default alpha
	});

	it('converts 8-digit hex with alpha to color', () => {
		const color = hexToColor('#ff000080');
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(128);
	});

	it('converts 3-digit shorthand hex', () => {
		const color = hexToColor('#f00');
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it('converts 4-digit shorthand hex with alpha', () => {
		const color = hexToColor('#f008');
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(136); // 0x88
	});

	it('handles hex without # prefix', () => {
		const color = hexToColor('ff0000');
		const { r, g, b, a } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it('handles lowercase hex', () => {
		const color = hexToColor('#ff0000');
		const colorLower = hexToColor('#ff0000');

		expect(color).toBe(colorLower);
	});

	it('handles uppercase hex', () => {
		const color = hexToColor('#FF0000');
		const { r, g, b } = unpackColor(color);

		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
	});

	it('returns 0 for invalid hex lengths', () => {
		expect(hexToColor('#f')).toBe(0);
		expect(hexToColor('#ff')).toBe(0);
		expect(hexToColor('#fffff')).toBe(0);
		expect(hexToColor('#fffffff')).toBe(0);
	});

	it('handles common colors', () => {
		const white = hexToColor('#ffffff');
		const black = hexToColor('#000000');
		const red = hexToColor('#ff0000');
		const green = hexToColor('#00ff00');
		const blue = hexToColor('#0000ff');

		expect(unpackColor(white)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
		expect(unpackColor(black)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
		expect(unpackColor(red)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
		expect(unpackColor(green)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
		expect(unpackColor(blue)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
	});
});

describe('colorToHex', () => {
	it('converts packed color to hex string', () => {
		const color = packColor(255, 0, 0, 255);
		const hex = colorToHex(color);

		expect(hex).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('excludes alpha by default', () => {
		const color = packColor(255, 0, 0, 128);
		const hex = colorToHex(color);

		expect(hex.length).toBe(7); // #RRGGBB
	});

	it('includes alpha when requested', () => {
		const color = packColor(255, 0, 0, 128);
		const hex = colorToHex(color, true);

		expect(hex.length).toBe(9); // #RRGGBBAA
	});

	it('round-trips with hexToColor', () => {
		const original = '#ff00ff';
		const color = hexToColor(original);
		const hex = colorToHex(color);

		expect(hex.toLowerCase()).toBe(original);
	});

	it('handles black', () => {
		const black = packColor(0, 0, 0, 255);
		const hex = colorToHex(black);

		expect(hex.toLowerCase()).toBe('#000000');
	});

	it('handles white', () => {
		const white = packColor(255, 255, 255, 255);
		const hex = colorToHex(white);

		expect(hex.toLowerCase()).toBe('#ffffff');
	});
});
