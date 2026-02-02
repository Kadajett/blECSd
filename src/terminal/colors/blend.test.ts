/**
 * Tests for color blending functions
 */

import { describe, expect, it } from 'vitest';
import {
	blend,
	blendAlpha,
	blendWithAlpha,
	complement,
	contrastRatio,
	darken,
	darken256,
	desaturate,
	gradient,
	gradient256,
	grayscale,
	invert,
	isReadable,
	lighten,
	lighten256,
	luminance,
	mix,
	rotateHue,
	saturate,
} from './blend';
import { COLORS } from './palette';

describe('blend', () => {
	describe('mix', () => {
		it('mixes colors at 50%', () => {
			const red = { r: 255, g: 0, b: 0 };
			const blue = { r: 0, g: 0, b: 255 };
			const result = mix(red, blue);
			expect(result.r).toBe(128);
			expect(result.g).toBe(0);
			expect(result.b).toBe(128);
		});

		it('returns first color at ratio 0', () => {
			const red = { r: 255, g: 0, b: 0 };
			const blue = { r: 0, g: 0, b: 255 };
			const result = mix(red, blue, 0);
			expect(result).toEqual(red);
		});

		it('returns second color at ratio 1', () => {
			const red = { r: 255, g: 0, b: 0 };
			const blue = { r: 0, g: 0, b: 255 };
			const result = mix(red, blue, 1);
			expect(result).toEqual(blue);
		});

		it('clamps ratio to 0-1', () => {
			const red = { r: 255, g: 0, b: 0 };
			const blue = { r: 0, g: 0, b: 255 };
			expect(mix(red, blue, -1)).toEqual(red);
			expect(mix(red, blue, 2)).toEqual(blue);
		});
	});

	describe('blend (Color256)', () => {
		it('blends palette colors', () => {
			const result = blend(COLORS.RED, COLORS.BLUE);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(255);
		});
	});

	describe('lighten', () => {
		it('lightens colors', () => {
			const red = { r: 200, g: 0, b: 0 };
			const result = lighten(red, 0.5);
			expect(result.r).toBeGreaterThan(red.r);
		});

		it('returns white at amount 1', () => {
			const dark = { r: 50, g: 50, b: 50 };
			const result = lighten(dark, 1);
			expect(result).toEqual({ r: 255, g: 255, b: 255 });
		});

		it('returns original at amount 0', () => {
			const color = { r: 100, g: 150, b: 200 };
			const result = lighten(color, 0);
			expect(result).toEqual(color);
		});
	});

	describe('darken', () => {
		it('darkens colors', () => {
			const red = { r: 200, g: 100, b: 100 };
			const result = darken(red, 0.5);
			expect(result.r).toBeLessThan(red.r);
			expect(result.g).toBeLessThan(red.g);
			expect(result.b).toBeLessThan(red.b);
		});

		it('returns black at amount 1', () => {
			const light = { r: 200, g: 200, b: 200 };
			const result = darken(light, 1);
			expect(result).toEqual({ r: 0, g: 0, b: 0 });
		});

		it('returns original at amount 0', () => {
			const color = { r: 100, g: 150, b: 200 };
			const result = darken(color, 0);
			expect(result).toEqual(color);
		});
	});

	describe('lighten256 / darken256', () => {
		it('returns valid palette indices', () => {
			const lightened = lighten256(COLORS.RED, 0.3);
			const darkened = darken256(COLORS.RED, 0.3);
			expect(lightened).toBeGreaterThanOrEqual(0);
			expect(lightened).toBeLessThanOrEqual(255);
			expect(darkened).toBeGreaterThanOrEqual(0);
			expect(darkened).toBeLessThanOrEqual(255);
		});
	});

	describe('saturate', () => {
		it('increases saturation', () => {
			const muted = { r: 150, g: 100, b: 100 };
			const result = saturate(muted, 0.5);
			// Result should have more difference between channels
			const originalRange =
				Math.max(muted.r, muted.g, muted.b) - Math.min(muted.r, muted.g, muted.b);
			const resultRange =
				Math.max(result.r, result.g, result.b) - Math.min(result.r, result.g, result.b);
			expect(resultRange).toBeGreaterThanOrEqual(originalRange);
		});
	});

	describe('desaturate', () => {
		it('decreases saturation', () => {
			const saturated = { r: 255, g: 0, b: 0 };
			const result = desaturate(saturated, 0.5);
			// Result should be more gray-ish
			expect(result.g).toBeGreaterThan(saturated.g);
			expect(result.b).toBeGreaterThan(saturated.b);
		});
	});

	describe('grayscale', () => {
		it('converts to grayscale', () => {
			const red = { r: 255, g: 0, b: 0 };
			const gray = grayscale(red);
			expect(gray.r).toBe(gray.g);
			expect(gray.g).toBe(gray.b);
		});

		it('preserves already gray colors', () => {
			const gray = { r: 128, g: 128, b: 128 };
			const result = grayscale(gray);
			expect(result).toEqual(gray);
		});
	});

	describe('blendWithAlpha', () => {
		it('blends foreground with alpha over background', () => {
			const fg = { r: 255, g: 0, b: 0, a: 0.5 };
			const bg = { r: 0, g: 0, b: 255 };
			const result = blendWithAlpha(fg, bg);
			expect(result.r).toBe(128);
			expect(result.g).toBe(0);
			expect(result.b).toBe(128);
		});

		it('returns foreground at alpha 1', () => {
			const fg = { r: 255, g: 0, b: 0, a: 1 };
			const bg = { r: 0, g: 0, b: 255 };
			const result = blendWithAlpha(fg, bg);
			expect(result).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('returns background at alpha 0', () => {
			const fg = { r: 255, g: 0, b: 0, a: 0 };
			const bg = { r: 0, g: 0, b: 255 };
			const result = blendWithAlpha(fg, bg);
			expect(result).toEqual(bg);
		});
	});

	describe('blendAlpha', () => {
		it('blends two RGBA colors', () => {
			const src = { r: 255, g: 0, b: 0, a: 0.5 };
			const dst = { r: 0, g: 0, b: 255, a: 0.5 };
			const result = blendAlpha(src, dst);
			expect(result.a).toBeGreaterThan(0);
			expect(result.a).toBeLessThanOrEqual(1);
		});

		it('handles zero alpha', () => {
			const src = { r: 255, g: 0, b: 0, a: 0 };
			const dst = { r: 0, g: 0, b: 255, a: 0 };
			const result = blendAlpha(src, dst);
			expect(result.a).toBe(0);
		});
	});

	describe('rotateHue', () => {
		it('rotates hue by degrees', () => {
			const red = { r: 255, g: 0, b: 0 };
			const green = rotateHue(red, 120);
			// Should be approximately green
			expect(green.g).toBeGreaterThan(green.r);
			expect(green.g).toBeGreaterThan(green.b);
		});

		it('handles negative rotation', () => {
			const red = { r: 255, g: 0, b: 0 };
			const result = rotateHue(red, -120);
			expect(result.r).toBeDefined();
			expect(result.g).toBeDefined();
			expect(result.b).toBeDefined();
		});

		it('handles full rotation', () => {
			const red = { r: 255, g: 0, b: 0 };
			const result = rotateHue(red, 360);
			// Should be back to red
			expect(result.r).toBeGreaterThan(200);
		});
	});

	describe('complement', () => {
		it('returns complementary color', () => {
			const red = { r: 255, g: 0, b: 0 };
			const comp = complement(red);
			// Complement of red is cyan
			expect(comp.r).toBeLessThan(comp.g);
			expect(comp.r).toBeLessThan(comp.b);
		});
	});

	describe('invert', () => {
		it('inverts colors', () => {
			const red = { r: 255, g: 0, b: 0 };
			const inverted = invert(red);
			expect(inverted).toEqual({ r: 0, g: 255, b: 255 });
		});

		it('double invert returns original', () => {
			const color = { r: 100, g: 150, b: 200 };
			const result = invert(invert(color));
			expect(result).toEqual(color);
		});
	});

	describe('gradient', () => {
		it('generates gradient with correct number of steps', () => {
			const from = { r: 0, g: 0, b: 0 };
			const to = { r: 255, g: 255, b: 255 };
			const result = gradient(from, to, 5);
			expect(result).toHaveLength(5);
		});

		it('starts and ends with input colors', () => {
			const from = { r: 255, g: 0, b: 0 };
			const to = { r: 0, g: 0, b: 255 };
			const result = gradient(from, to, 5);
			expect(result[0]).toEqual(from);
			expect(result[4]).toEqual(to);
		});

		it('handles steps < 2', () => {
			const from = { r: 255, g: 0, b: 0 };
			const to = { r: 0, g: 0, b: 255 };
			const result = gradient(from, to, 1);
			expect(result).toEqual([from]);
		});
	});

	describe('gradient256', () => {
		it('generates palette gradient', () => {
			const result = gradient256(COLORS.RED, COLORS.BLUE, 5);
			expect(result).toHaveLength(5);
			for (const color of result) {
				expect(color).toBeGreaterThanOrEqual(0);
				expect(color).toBeLessThanOrEqual(255);
			}
		});
	});

	describe('luminance', () => {
		it('returns 0 for black', () => {
			expect(luminance({ r: 0, g: 0, b: 0 })).toBe(0);
		});

		it('returns 1 for white', () => {
			expect(luminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 2);
		});

		it('green has higher luminance than red', () => {
			const red = luminance({ r: 255, g: 0, b: 0 });
			const green = luminance({ r: 0, g: 255, b: 0 });
			expect(green).toBeGreaterThan(red);
		});
	});

	describe('contrastRatio', () => {
		it('returns 21 for black/white', () => {
			const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
			expect(ratio).toBeCloseTo(21, 0);
		});

		it('returns 1 for identical colors', () => {
			const ratio = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 });
			expect(ratio).toBe(1);
		});

		it('is symmetric', () => {
			const c1 = { r: 255, g: 0, b: 0 };
			const c2 = { r: 0, g: 255, b: 0 };
			expect(contrastRatio(c1, c2)).toBe(contrastRatio(c2, c1));
		});
	});

	describe('isReadable', () => {
		it('returns true for high contrast', () => {
			expect(isReadable({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(true);
		});

		it('returns false for low contrast', () => {
			expect(isReadable({ r: 128, g: 128, b: 128 }, { r: 130, g: 130, b: 130 })).toBe(false);
		});

		it('respects custom threshold', () => {
			const c1 = { r: 0, g: 0, b: 0 };
			const c2 = { r: 180, g: 180, b: 180 };
			// Default threshold (4.5) should pass (black vs light gray)
			expect(isReadable(c1, c2)).toBe(true);
			// High threshold should fail
			expect(isReadable(c1, c2, 15)).toBe(false);
		});
	});
});
