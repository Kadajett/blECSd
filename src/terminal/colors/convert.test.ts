/**
 * Tests for color conversion functions
 */

import { describe, expect, it } from 'vitest';
import {
	color256ToHex,
	color256ToRgb,
	color256ToTruecolor,
	hexToColor256,
	hexToRgb,
	hexToTruecolor,
	hslaToRgba,
	hslToRgb,
	parseColor,
	rgbaToHex,
	rgbaToHsla,
	rgbToColor256,
	rgbToColorCube,
	rgbToGrayscale256,
	rgbToHex,
	rgbToHsl,
	rgbToTruecolor,
	sgrBg256,
	sgrBgRgb,
	sgrFg256,
	sgrFgRgb,
	toColor256,
	toHex,
	toTruecolor,
	truecolorToColor256,
	truecolorToHex,
	truecolorToRgb,
} from './convert';
import type { Color256 } from './palette';

describe('convert', () => {
	describe('hexToRgb', () => {
		it('converts 6-digit hex', () => {
			expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
			expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
			expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
			expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
			expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
		});

		it('converts 3-digit hex', () => {
			expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
			expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
			expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 });
			expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
		});

		it('converts 8-digit hex with alpha', () => {
			const result = hexToRgb('#ff000080');
			expect(result).toEqual({ r: 255, g: 0, b: 0, a: expect.closeTo(0.5, 1) });
		});

		it('handles uppercase', () => {
			expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
			expect(hexToRgb('#ABCDEF')).toEqual({ r: 171, g: 205, b: 239 });
		});

		it('works without # prefix', () => {
			expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('throws for invalid hex', () => {
			expect(() => hexToRgb('#gg0000')).toThrow();
			expect(() => hexToRgb('#ff00')).toThrow();
			expect(() => hexToRgb('#ff00000')).toThrow();
		});
	});

	describe('rgbToHex', () => {
		it('converts RGB to hex', () => {
			expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
			expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
			expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
			expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
			expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
		});

		it('clamps out of range values', () => {
			expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
		});

		it('rounds fractional values', () => {
			expect(rgbToHex({ r: 127.6, g: 127.4, b: 128 })).toBe('#807f80');
		});
	});

	describe('rgbaToHex', () => {
		it('converts RGBA to 8-digit hex', () => {
			expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000ff');
			expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 0 })).toBe('#ff000000');
			expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
		});
	});

	describe('rgbToHsl', () => {
		it('converts primary colors', () => {
			expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
			expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 });
			expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 });
		});

		it('converts grayscale', () => {
			expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
			expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
			expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 });
		});

		it('converts secondary colors', () => {
			expect(rgbToHsl({ r: 255, g: 255, b: 0 })).toEqual({ h: 60, s: 100, l: 50 });
			expect(rgbToHsl({ r: 0, g: 255, b: 255 })).toEqual({ h: 180, s: 100, l: 50 });
			expect(rgbToHsl({ r: 255, g: 0, b: 255 })).toEqual({ h: 300, s: 100, l: 50 });
		});
	});

	describe('hslToRgb', () => {
		it('converts primary colors', () => {
			expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
			expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 });
			expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
		});

		it('converts grayscale', () => {
			expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
			expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({ r: 255, g: 255, b: 255 });
			expect(hslToRgb({ h: 180, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 });
		});
	});

	describe('RGB to HSL round-trip', () => {
		it('preserves colors through conversion', () => {
			const colors = [
				{ r: 255, g: 0, b: 0 },
				{ r: 0, g: 255, b: 0 },
				{ r: 0, g: 0, b: 255 },
				{ r: 128, g: 64, b: 192 },
			];

			for (const rgb of colors) {
				const hsl = rgbToHsl(rgb);
				const back = hslToRgb(hsl);
				// Allow tolerance of 1 due to rounding in HSL conversion
				expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
				expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
				expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
			}
		});
	});

	describe('RGBA/HSLA conversions', () => {
		it('rgbaToHsla preserves alpha', () => {
			const result = rgbaToHsla({ r: 255, g: 0, b: 0, a: 0.5 });
			expect(result).toEqual({ h: 0, s: 100, l: 50, a: 0.5 });
		});

		it('hslaToRgba preserves alpha', () => {
			const result = hslaToRgba({ h: 0, s: 100, l: 50, a: 0.5 });
			expect(result).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
		});
	});

	describe('rgbToColor256', () => {
		it('matches exact palette colors', () => {
			// Standard red (index 9)
			expect(rgbToColor256({ r: 255, g: 0, b: 0 })).toBe(9);
			// Black (index 0)
			expect(rgbToColor256({ r: 0, g: 0, b: 0 })).toBe(0);
			// White (index 15)
			expect(rgbToColor256({ r: 255, g: 255, b: 255 })).toBe(15);
		});

		it('finds nearest color for non-exact matches', () => {
			// Near-red should match red
			const nearRed = rgbToColor256({ r: 250, g: 5, b: 5 });
			expect(nearRed).toBe(9);
		});
	});

	describe('color256ToRgb', () => {
		it('returns correct RGB for palette indices', () => {
			expect(color256ToRgb(0 as Color256)).toEqual({ r: 0, g: 0, b: 0 });
			expect(color256ToRgb(9 as Color256)).toEqual({ r: 255, g: 0, b: 0 });
			expect(color256ToRgb(15 as Color256)).toEqual({ r: 255, g: 255, b: 255 });
		});
	});

	describe('hex to/from Color256', () => {
		it('hexToColor256 finds nearest match', () => {
			expect(hexToColor256('#ff0000')).toBe(9);
			expect(hexToColor256('#000000')).toBe(0);
		});

		it('color256ToHex returns correct hex', () => {
			expect(color256ToHex(9 as Color256)).toBe('#ff0000');
			expect(color256ToHex(0 as Color256)).toBe('#000000');
		});
	});

	describe('truecolor conversions', () => {
		describe('rgbToTruecolor', () => {
			it('packs RGB into 24-bit integer', () => {
				expect(rgbToTruecolor({ r: 255, g: 0, b: 0 })).toBe(0xff0000);
				expect(rgbToTruecolor({ r: 0, g: 255, b: 0 })).toBe(0x00ff00);
				expect(rgbToTruecolor({ r: 0, g: 0, b: 255 })).toBe(0x0000ff);
				expect(rgbToTruecolor({ r: 255, g: 255, b: 255 })).toBe(0xffffff);
				expect(rgbToTruecolor({ r: 0, g: 0, b: 0 })).toBe(0x000000);
			});

			it('clamps values', () => {
				expect(rgbToTruecolor({ r: 300, g: -10, b: 128 })).toBe(0xff0080);
			});
		});

		describe('truecolorToRgb', () => {
			it('unpacks 24-bit integer to RGB', () => {
				expect(truecolorToRgb(0xff0000)).toEqual({ r: 255, g: 0, b: 0 });
				expect(truecolorToRgb(0x00ff00)).toEqual({ r: 0, g: 255, b: 0 });
				expect(truecolorToRgb(0x0000ff)).toEqual({ r: 0, g: 0, b: 255 });
			});
		});

		describe('hexToTruecolor', () => {
			it('converts hex to 24-bit integer', () => {
				expect(hexToTruecolor('#ff0000')).toBe(0xff0000);
				expect(hexToTruecolor('#abcdef')).toBe(0xabcdef);
			});
		});

		describe('truecolorToHex', () => {
			it('converts 24-bit integer to hex', () => {
				expect(truecolorToHex(0xff0000)).toBe('#ff0000');
				expect(truecolorToHex(0xabcdef)).toBe('#abcdef');
			});
		});

		describe('truecolorToColor256', () => {
			it('finds nearest 256-color', () => {
				expect(truecolorToColor256(0xff0000)).toBe(9);
			});
		});

		describe('color256ToTruecolor', () => {
			it('converts palette index to truecolor', () => {
				expect(color256ToTruecolor(9 as Color256)).toBe(0xff0000);
			});
		});
	});

	describe('SGR helpers', () => {
		describe('sgrFg256', () => {
			it('generates foreground SGR params', () => {
				expect(sgrFg256(196 as Color256)).toBe('38;5;196');
				expect(sgrFg256(0 as Color256)).toBe('38;5;0');
			});
		});

		describe('sgrBg256', () => {
			it('generates background SGR params', () => {
				expect(sgrBg256(196 as Color256)).toBe('48;5;196');
			});
		});

		describe('sgrFgRgb', () => {
			it('generates truecolor foreground SGR params from RGB', () => {
				expect(sgrFgRgb({ r: 255, g: 128, b: 64 })).toBe('38;2;255;128;64');
			});

			it('generates truecolor foreground SGR params from packed int', () => {
				expect(sgrFgRgb(0xff8040)).toBe('38;2;255;128;64');
			});
		});

		describe('sgrBgRgb', () => {
			it('generates truecolor background SGR params', () => {
				expect(sgrBgRgb({ r: 255, g: 128, b: 64 })).toBe('48;2;255;128;64');
			});
		});
	});

	describe('color cube matching', () => {
		describe('rgbToColorCube', () => {
			it('matches to nearest cube color', () => {
				// Pure red -> cube index for (5,0,0)
				expect(rgbToColorCube({ r: 255, g: 0, b: 0 })).toBe(196);
				// Pure green -> cube index for (0,5,0)
				expect(rgbToColorCube({ r: 0, g: 255, b: 0 })).toBe(46);
				// Black -> cube index for (0,0,0)
				expect(rgbToColorCube({ r: 0, g: 0, b: 0 })).toBe(16);
				// White -> cube index for (5,5,5)
				expect(rgbToColorCube({ r: 255, g: 255, b: 255 })).toBe(231);
			});
		});

		describe('rgbToGrayscale256', () => {
			it('matches to nearest grayscale', () => {
				// Very dark
				const dark = rgbToGrayscale256({ r: 8, g: 8, b: 8 });
				expect(dark).toBe(232);
				// Mid gray
				const mid = rgbToGrayscale256({ r: 128, g: 128, b: 128 });
				expect(mid).toBeGreaterThanOrEqual(232);
				expect(mid).toBeLessThanOrEqual(255);
				// Light
				const light = rgbToGrayscale256({ r: 238, g: 238, b: 238 });
				expect(light).toBe(255);
			});
		});
	});

	describe('parseColor', () => {
		it('parses hex strings', () => {
			expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
			expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('parses RGB objects', () => {
			expect(parseColor({ r: 255, g: 0, b: 0 })).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('parses 256-color indices', () => {
			expect(parseColor(9)).toEqual({ r: 255, g: 0, b: 0 });
			expect(parseColor(0)).toEqual({ r: 0, g: 0, b: 0 });
		});

		it('parses truecolor integers', () => {
			expect(parseColor(0xff0000)).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('throws for invalid input', () => {
			// @ts-expect-error: Testing invalid input
			expect(() => parseColor({})).toThrow();
		});
	});

	describe('toColor256', () => {
		it('returns valid 256-color indices unchanged', () => {
			expect(toColor256(9)).toBe(9);
			expect(toColor256(0)).toBe(0);
			expect(toColor256(255)).toBe(255);
		});

		it('converts other formats', () => {
			expect(toColor256('#ff0000')).toBe(9);
			expect(toColor256({ r: 255, g: 0, b: 0 })).toBe(9);
		});
	});

	describe('toTruecolor', () => {
		it('converts all formats to truecolor', () => {
			expect(toTruecolor('#ff0000')).toBe(0xff0000);
			expect(toTruecolor({ r: 255, g: 0, b: 0 })).toBe(0xff0000);
			expect(toTruecolor(9)).toBe(0xff0000);
		});
	});

	describe('toHex', () => {
		it('converts all formats to hex', () => {
			expect(toHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
			expect(toHex(9)).toBe('#ff0000');
			expect(toHex(0xff0000)).toBe('#ff0000');
		});
	});
});
