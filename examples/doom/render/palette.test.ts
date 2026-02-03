import { describe, expect, it } from 'vitest';
import { parsePlaypal, parseColormap, shadeColor, paletteToRgba } from './palette.js';

describe('parsePlaypal', () => {
	it('parses 14 palettes of 256 colors', () => {
		// Build a minimal PLAYPAL: 14 * 768 = 10752 bytes
		const data = new Uint8Array(10752);
		// Set palette 0, color 0 to red
		data[0] = 255;
		data[1] = 0;
		data[2] = 0;
		// Set palette 0, color 1 to green
		data[3] = 0;
		data[4] = 255;
		data[5] = 0;
		// Set palette 1, color 0 to blue
		data[768] = 0;
		data[769] = 0;
		data[770] = 255;

		const palettes = parsePlaypal(data);

		expect(palettes.length).toBe(14);
		expect(palettes[0]?.length).toBe(256);

		expect(palettes[0]?.[0]).toEqual({ r: 255, g: 0, b: 0 });
		expect(palettes[0]?.[1]).toEqual({ r: 0, g: 255, b: 0 });
		expect(palettes[1]?.[0]).toEqual({ r: 0, g: 0, b: 255 });
	});

	it('throws on too-small data', () => {
		expect(() => parsePlaypal(new Uint8Array(100))).toThrow('PLAYPAL too small');
	});
});

describe('parseColormap', () => {
	it('parses 34 colormaps of 256 entries', () => {
		// Build minimal COLORMAP: 34 * 256 = 8704 bytes
		const data = new Uint8Array(8704);
		// Colormap 0 = identity (index N -> N)
		for (let i = 0; i < 256; i++) {
			data[i] = i;
		}
		// Colormap 31 = all black (every index -> 0)
		// (already zero-filled)

		const colormaps = parseColormap(data);

		expect(colormaps.length).toBe(34);
		expect(colormaps[0]?.length).toBe(256);

		// Colormap 0 should be identity
		expect(colormaps[0]?.[0]).toBe(0);
		expect(colormaps[0]?.[100]).toBe(100);
		expect(colormaps[0]?.[255]).toBe(255);

		// Colormap 31 should map everything to 0 (we left it zeroed)
		expect(colormaps[31]?.[100]).toBe(0);
	});

	it('throws on too-small data', () => {
		expect(() => parseColormap(new Uint8Array(100))).toThrow('COLORMAP too small');
	});
});

describe('shadeColor', () => {
	it('returns identity at full brightness (level 0)', () => {
		const colormaps = Array.from({ length: 34 }, () => {
			const map = new Uint8Array(256);
			for (let i = 0; i < 256; i++) map[i] = i;
			return map;
		});

		expect(shadeColor(colormaps, 0, 100)).toBe(100);
	});

	it('clamps level to valid range', () => {
		const colormaps = Array.from({ length: 34 }, () => new Uint8Array(256));
		// Should not throw for out-of-range levels
		expect(shadeColor(colormaps, -5, 100)).toBe(0);
		expect(shadeColor(colormaps, 50, 100)).toBe(0);
	});
});

describe('paletteToRgba', () => {
	it('converts palette index to RGBA', () => {
		const palette = Array.from({ length: 256 }, (_, i) => ({
			r: i,
			g: 255 - i,
			b: 128,
		}));

		const identityMap = new Uint8Array(256);
		for (let i = 0; i < 256; i++) identityMap[i] = i;
		const colormaps = Array.from({ length: 34 }, () => identityMap);

		const rgba = paletteToRgba(palette, colormaps, 50, 0);
		expect(rgba).toEqual({ r: 50, g: 205, b: 128, a: 255 });
	});
});
