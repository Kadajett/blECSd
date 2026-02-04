/**
 * Tests for color name mappings
 */

import { describe, expect, it } from 'vitest';
import {
	COLOR_ALIASES,
	COLOR_NAMES,
	ColorNameSchema,
	CSS_COLORS,
	colorToName,
	cssNameToColor,
	getColorNames,
	getCssColorNames,
	isColorName,
	isSpecialColor,
	nameToColor,
} from './names';
import type { Color256 } from './palette';

describe('names', () => {
	describe('COLOR_NAMES', () => {
		it('maps basic colors to indices 0-7', () => {
			expect(COLOR_NAMES.black).toBe(0);
			expect(COLOR_NAMES.red).toBe(1);
			expect(COLOR_NAMES.green).toBe(2);
			expect(COLOR_NAMES.yellow).toBe(3);
			expect(COLOR_NAMES.blue).toBe(4);
			expect(COLOR_NAMES.magenta).toBe(5);
			expect(COLOR_NAMES.cyan).toBe(6);
			expect(COLOR_NAMES.white).toBe(7);
		});

		it('maps bright colors to indices 8-15', () => {
			expect(COLOR_NAMES.lightblack).toBe(8);
			expect(COLOR_NAMES.lightred).toBe(9);
			expect(COLOR_NAMES.lightgreen).toBe(10);
			expect(COLOR_NAMES.lightyellow).toBe(11);
			expect(COLOR_NAMES.lightblue).toBe(12);
			expect(COLOR_NAMES.lightmagenta).toBe(13);
			expect(COLOR_NAMES.lightcyan).toBe(14);
			expect(COLOR_NAMES.lightwhite).toBe(15);
		});

		it('has bright aliases', () => {
			expect(COLOR_NAMES.brightred).toBe(9);
			expect(COLOR_NAMES.brightgreen).toBe(10);
		});

		it('has HTML color names', () => {
			expect(COLOR_NAMES.maroon).toBe(1);
			expect(COLOR_NAMES.navy).toBe(4);
			expect(COLOR_NAMES.teal).toBe(6);
			expect(COLOR_NAMES.aqua).toBe(14);
		});
	});

	describe('COLOR_ALIASES', () => {
		it('maps grey to gray', () => {
			expect(COLOR_ALIASES.grey).toBe('gray');
		});
	});

	describe('nameToColor', () => {
		it('converts basic color names', () => {
			expect(nameToColor('red')).toBe(1);
			expect(nameToColor('green')).toBe(2);
			expect(nameToColor('blue')).toBe(4);
		});

		it('is case-insensitive', () => {
			expect(nameToColor('RED')).toBe(1);
			expect(nameToColor('Red')).toBe(1);
			expect(nameToColor('rEd')).toBe(1);
		});

		it('handles whitespace', () => {
			expect(nameToColor('  red  ')).toBe(1);
		});

		it('converts bright variants', () => {
			expect(nameToColor('lightred')).toBe(9);
			expect(nameToColor('brightred')).toBe(9);
		});

		it('converts compound names with separators', () => {
			expect(nameToColor('light-red')).toBe(9);
			expect(nameToColor('light_red')).toBe(9);
			expect(nameToColor('light red')).toBe(9);
		});

		it('returns null for special values', () => {
			expect(nameToColor('default')).toBeNull();
			expect(nameToColor('transparent')).toBeNull();
			expect(nameToColor('inherit')).toBeNull();
		});

		it('returns null for unknown names', () => {
			expect(nameToColor('notacolor')).toBeNull();
			expect(nameToColor('')).toBeNull();
		});
	});

	describe('colorToName', () => {
		it('converts basic indices to names', () => {
			expect(colorToName(0 as Color256)).toBe('black');
			expect(colorToName(1 as Color256)).toBe('red');
			expect(colorToName(2 as Color256)).toBe('green');
		});

		it('converts bright indices to names', () => {
			expect(colorToName(9 as Color256)).toBe('brightred');
			expect(colorToName(10 as Color256)).toBe('brightgreen');
		});

		it('returns null for indices without names', () => {
			expect(colorToName(100 as Color256)).toBeNull();
			expect(colorToName(200 as Color256)).toBeNull();
		});
	});

	describe('isColorName', () => {
		it('returns true for valid names', () => {
			expect(isColorName('red')).toBe(true);
			expect(isColorName('lightblue')).toBe(true);
			expect(isColorName('default')).toBe(true);
		});

		it('returns false for invalid names', () => {
			expect(isColorName('notacolor')).toBe(false);
		});
	});

	describe('isSpecialColor', () => {
		it('returns true for special values', () => {
			expect(isSpecialColor('default')).toBe(true);
			expect(isSpecialColor('transparent')).toBe(true);
			expect(isSpecialColor('inherit')).toBe(true);
		});

		it('returns false for regular colors', () => {
			expect(isSpecialColor('red')).toBe(false);
			expect(isSpecialColor('blue')).toBe(false);
		});
	});

	describe('ColorNameSchema', () => {
		it('validates known color names', () => {
			expect(ColorNameSchema.safeParse('red').success).toBe(true);
			expect(ColorNameSchema.safeParse('lightblue').success).toBe(true);
		});

		it('validates special values', () => {
			expect(ColorNameSchema.safeParse('default').success).toBe(true);
			expect(ColorNameSchema.safeParse('transparent').success).toBe(true);
		});

		it('normalizes case', () => {
			const result = ColorNameSchema.safeParse('RED');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('red');
			}
		});

		it('rejects invalid names', () => {
			expect(ColorNameSchema.safeParse('notacolor').success).toBe(false);
		});
	});

	describe('CSS_COLORS', () => {
		it('contains common CSS colors', () => {
			expect(CSS_COLORS.coral).toBeDefined();
			expect(CSS_COLORS.coral?.r).toBe(255);
			expect(CSS_COLORS.coral?.g).toBe(127);
			expect(CSS_COLORS.coral?.b).toBe(80);
		});

		it('has proper RGB structure', () => {
			for (const [_name, rgb] of Object.entries(CSS_COLORS)) {
				expect(rgb.r).toBeGreaterThanOrEqual(0);
				expect(rgb.r).toBeLessThanOrEqual(255);
				expect(rgb.g).toBeGreaterThanOrEqual(0);
				expect(rgb.g).toBeLessThanOrEqual(255);
				expect(rgb.b).toBeGreaterThanOrEqual(0);
				expect(rgb.b).toBeLessThanOrEqual(255);
			}
		});
	});

	describe('cssNameToColor', () => {
		it('converts basic names via nameToColor', () => {
			expect(cssNameToColor('red')).toBe(1);
			expect(cssNameToColor('blue')).toBe(4);
		});

		it('converts CSS-specific names', () => {
			const coral = cssNameToColor('coral');
			expect(coral).toBeDefined();
			expect(coral).toBeGreaterThanOrEqual(0);
			expect(coral).toBeLessThanOrEqual(255);
		});

		it('returns null for unknown names', () => {
			expect(cssNameToColor('notacolor')).toBeNull();
		});

		it('caches results', () => {
			// First call
			const first = cssNameToColor('coral');
			// Second call should hit cache
			const second = cssNameToColor('coral');
			expect(first).toBe(second);
		});
	});

	describe('getColorNames', () => {
		it('returns array of names', () => {
			const names = getColorNames();
			expect(Array.isArray(names)).toBe(true);
			expect(names.length).toBeGreaterThan(0);
		});

		it('includes basic colors', () => {
			const names = getColorNames();
			expect(names).toContain('red');
			expect(names).toContain('green');
			expect(names).toContain('blue');
		});
	});

	describe('getCssColorNames', () => {
		it('returns array of CSS color names', () => {
			const names = getCssColorNames();
			expect(Array.isArray(names)).toBe(true);
			expect(names.length).toBeGreaterThan(0);
		});

		it('includes CSS-specific colors', () => {
			const names = getCssColorNames();
			expect(names).toContain('coral');
			expect(names).toContain('salmon');
			expect(names).toContain('turquoise');
		});
	});
});
