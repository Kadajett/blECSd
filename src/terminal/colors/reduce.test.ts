/**
 * Tests for color reduction functions
 */

import { describe, expect, it } from 'vitest';
import type { Color256 } from './palette';
import {
	COLOR_DEPTH_BITS,
	createColorMap,
	createReducedPalette,
	getCachedColorMap,
	getMinimumDepth,
	getReducedPaletteRGB,
	isAccurateAtDepth,
	reduceBright,
	reduceColor,
	reduceColors,
	reduceFast,
	reduceRgb,
	reduceTo2,
	reduceTo8,
	reduceTo16,
	rgbTo2,
	rgbTo8,
	rgbTo16,
} from './reduce';

describe('reduce', () => {
	describe('COLOR_DEPTH_BITS', () => {
		it('has correct bit counts', () => {
			expect(COLOR_DEPTH_BITS.truecolor).toBe(24);
			expect(COLOR_DEPTH_BITS['256']).toBe(8);
			expect(COLOR_DEPTH_BITS['16']).toBe(4);
			expect(COLOR_DEPTH_BITS['8']).toBe(3);
			expect(COLOR_DEPTH_BITS['2']).toBe(1);
		});
	});

	describe('reduceTo16', () => {
		it('keeps standard colors unchanged', () => {
			for (let i = 0; i < 16; i++) {
				expect(reduceTo16(i as Color256)).toBe(i);
			}
		});

		it('reduces color cube colors to nearest 16', () => {
			// Bright red in cube (196) should map to bright red ANSI (9)
			const result = reduceTo16(196 as Color256);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(15);
		});

		it('reduces grayscale to nearest 16', () => {
			// Light gray (252) should map to white or silver
			const result = reduceTo16(252 as Color256);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(15);
		});
	});

	describe('rgbTo16', () => {
		it('reduces RGB to 16-color palette', () => {
			const result = rgbTo16({ r: 255, g: 0, b: 0 });
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(15);
		});
	});

	describe('reduceTo8', () => {
		it('keeps basic colors unchanged', () => {
			for (let i = 0; i < 8; i++) {
				expect(reduceTo8(i as Color256)).toBe(i);
			}
		});

		it('maps bright colors to base colors', () => {
			expect(reduceTo8(8 as Color256)).toBe(0); // bright black -> black
			expect(reduceTo8(9 as Color256)).toBe(1); // bright red -> red
			expect(reduceTo8(10 as Color256)).toBe(2); // bright green -> green
			expect(reduceTo8(15 as Color256)).toBe(7); // bright white -> white
		});

		it('reduces cube colors to nearest 8', () => {
			const result = reduceTo8(196 as Color256);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(7);
		});
	});

	describe('rgbTo8', () => {
		it('reduces RGB to 8-color palette', () => {
			const result = rgbTo8({ r: 255, g: 0, b: 0 });
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(7);
		});
	});

	describe('reduceTo2', () => {
		it('reduces dark colors to black', () => {
			expect(reduceTo2(0 as Color256)).toBe(0); // black -> black
			expect(reduceTo2(1 as Color256)).toBe(0); // dark red -> black
			expect(reduceTo2(4 as Color256)).toBe(0); // dark blue -> black
		});

		it('reduces light colors to white', () => {
			expect(reduceTo2(15 as Color256)).toBe(15); // white -> white
			expect(reduceTo2(11 as Color256)).toBe(15); // yellow -> white
		});
	});

	describe('rgbTo2', () => {
		it('reduces RGB to monochrome', () => {
			expect(rgbTo2({ r: 0, g: 0, b: 0 })).toBe(0);
			expect(rgbTo2({ r: 255, g: 255, b: 255 })).toBe(15);
		});

		it('uses luminance for mid tones', () => {
			// Green has high luminance, should map to white
			expect(rgbTo2({ r: 0, g: 255, b: 0 })).toBe(15);
			// Dark red has low luminance, should map to black
			expect(rgbTo2({ r: 128, g: 0, b: 0 })).toBe(0);
		});
	});

	describe('createReducedPalette', () => {
		it('creates full 256-color palette for truecolor', () => {
			const palette = createReducedPalette('truecolor');
			expect(palette).toHaveLength(256);
		});

		it('creates full 256-color palette for 256', () => {
			const palette = createReducedPalette('256');
			expect(palette).toHaveLength(256);
		});

		it('creates 16-color palette', () => {
			const palette = createReducedPalette('16');
			expect(palette).toHaveLength(16);
			expect(palette[0]).toBe(0);
			expect(palette[15]).toBe(15);
		});

		it('creates 8-color palette', () => {
			const palette = createReducedPalette('8');
			expect(palette).toHaveLength(8);
			expect(palette[0]).toBe(0);
			expect(palette[7]).toBe(7);
		});

		it('creates monochrome palette', () => {
			const palette = createReducedPalette('2');
			expect(palette).toHaveLength(2);
			expect(palette).toContain(0);
			expect(palette).toContain(15);
		});
	});

	describe('getReducedPaletteRGB', () => {
		it('returns correct palette sizes', () => {
			expect(getReducedPaletteRGB('256')).toHaveLength(256);
			expect(getReducedPaletteRGB('16')).toHaveLength(16);
			expect(getReducedPaletteRGB('8')).toHaveLength(8);
			expect(getReducedPaletteRGB('2')).toHaveLength(2);
		});
	});

	describe('reduceColor', () => {
		it('passes through for 256/truecolor', () => {
			expect(reduceColor(196 as Color256, '256')).toBe(196);
			expect(reduceColor(196 as Color256, 'truecolor')).toBe(196);
		});

		it('reduces to 16', () => {
			const result = reduceColor(196 as Color256, '16');
			expect(result).toBeLessThanOrEqual(15);
		});

		it('reduces to 8', () => {
			const result = reduceColor(196 as Color256, '8');
			expect(result).toBeLessThanOrEqual(7);
		});

		it('reduces to monochrome', () => {
			const result = reduceColor(196 as Color256, '2');
			expect([0, 15]).toContain(result);
		});
	});

	describe('reduceRgb', () => {
		it('reduces RGB to target depth', () => {
			const red = { r: 255, g: 0, b: 0 };
			expect(reduceRgb(red, '16')).toBeLessThanOrEqual(15);
			expect(reduceRgb(red, '8')).toBeLessThanOrEqual(7);
			expect([0, 15]).toContain(reduceRgb(red, '2'));
		});
	});

	describe('reduceColors', () => {
		it('reduces array of colors', () => {
			const colors = [196, 46, 21] as Color256[];
			const reduced = reduceColors(colors, '16');
			expect(reduced).toHaveLength(3);
			for (const c of reduced) {
				expect(c).toBeLessThanOrEqual(15);
			}
		});
	});

	describe('createColorMap', () => {
		it('creates map with 256 entries', () => {
			const map = createColorMap('16');
			expect(map.size).toBe(256);
		});

		it('maps all colors to valid reduced colors', () => {
			const map = createColorMap('16');
			for (const [_, reduced] of map) {
				expect(reduced).toBeLessThanOrEqual(15);
			}
		});
	});

	describe('getCachedColorMap', () => {
		it('returns cached maps', () => {
			const map1 = getCachedColorMap('16');
			const map2 = getCachedColorMap('16');
			expect(map1).toBe(map2); // Same instance
		});

		it('creates maps for all cached depths', () => {
			expect(getCachedColorMap('16').size).toBe(256);
			expect(getCachedColorMap('8').size).toBe(256);
			expect(getCachedColorMap('2').size).toBe(256);
		});
	});

	describe('reduceFast', () => {
		it('uses cached maps for fast reduction', () => {
			expect(reduceFast(196 as Color256, '16')).toBeLessThanOrEqual(15);
			expect(reduceFast(196 as Color256, '8')).toBeLessThanOrEqual(7);
			expect([0, 15]).toContain(reduceFast(196 as Color256, '2'));
		});

		it('matches reduceColor results', () => {
			for (let i = 0; i < 256; i++) {
				const color = i as Color256;
				expect(reduceFast(color, '16')).toBe(reduceTo16(color));
				expect(reduceFast(color, '8')).toBe(reduceTo8(color));
				expect(reduceFast(color, '2')).toBe(reduceTo2(color));
			}
		});
	});

	describe('reduceBright', () => {
		it('keeps bright colors in 16-color mode', () => {
			expect(reduceBright(9 as Color256, '16')).toBe(9);
			expect(reduceBright(14 as Color256, '16')).toBe(14);
		});

		it('maps bright to base in 8-color mode', () => {
			expect(reduceBright(9 as Color256, '8')).toBe(1); // bright red -> red
			expect(reduceBright(14 as Color256, '8')).toBe(6); // bright cyan -> cyan
		});

		it('maps bright to white in mono mode', () => {
			expect(reduceBright(9 as Color256, '2')).toBe(15);
			expect(reduceBright(14 as Color256, '2')).toBe(15);
		});

		it('handles non-bright colors normally', () => {
			const result = reduceBright(196 as Color256, '16');
			expect(result).toBeLessThanOrEqual(15);
		});
	});

	describe('getMinimumDepth', () => {
		it('returns 8 for basic colors', () => {
			expect(getMinimumDepth(0 as Color256)).toBe('8');
			expect(getMinimumDepth(7 as Color256)).toBe('8');
		});

		it('returns 16 for bright colors', () => {
			expect(getMinimumDepth(8 as Color256)).toBe('16');
			expect(getMinimumDepth(15 as Color256)).toBe('16');
		});

		it('returns 256 for cube/grayscale colors', () => {
			expect(getMinimumDepth(16 as Color256)).toBe('256');
			expect(getMinimumDepth(196 as Color256)).toBe('256');
			expect(getMinimumDepth(240 as Color256)).toBe('256');
		});
	});

	describe('isAccurateAtDepth', () => {
		it('all colors accurate at 256/truecolor', () => {
			expect(isAccurateAtDepth(196 as Color256, '256')).toBe(true);
			expect(isAccurateAtDepth(196 as Color256, 'truecolor')).toBe(true);
		});

		it('only 0-15 accurate at 16', () => {
			expect(isAccurateAtDepth(0 as Color256, '16')).toBe(true);
			expect(isAccurateAtDepth(15 as Color256, '16')).toBe(true);
			expect(isAccurateAtDepth(16 as Color256, '16')).toBe(false);
		});

		it('only 0-7 accurate at 8', () => {
			expect(isAccurateAtDepth(0 as Color256, '8')).toBe(true);
			expect(isAccurateAtDepth(7 as Color256, '8')).toBe(true);
			expect(isAccurateAtDepth(8 as Color256, '8')).toBe(false);
		});

		it('only black/white accurate at 2', () => {
			expect(isAccurateAtDepth(0 as Color256, '2')).toBe(true);
			expect(isAccurateAtDepth(15 as Color256, '2')).toBe(true);
			expect(isAccurateAtDepth(1 as Color256, '2')).toBe(false);
		});
	});
});
