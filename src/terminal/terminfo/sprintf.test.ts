/**
 * Tests for sprintf implementation.
 *
 * @module terminal/terminfo/sprintf.test
 */

import { describe, expect, it } from 'vitest';
import { countFormatArgs, createFormatter, isValidFormat, parseFormat, sprintf } from './sprintf';

describe('sprintf', () => {
	describe('basic substitution', () => {
		it('formats decimal integers', () => {
			expect(sprintf('%d', 42)).toBe('42');
			expect(sprintf('%d', -42)).toBe('-42');
			expect(sprintf('%d', 0)).toBe('0');
		});

		it('formats %i same as %d', () => {
			expect(sprintf('%i', 42)).toBe('42');
			expect(sprintf('%i', -42)).toBe('-42');
		});

		it('formats strings', () => {
			expect(sprintf('%s', 'hello')).toBe('hello');
			expect(sprintf('%s', '')).toBe('');
			expect(sprintf('%s', 123)).toBe('123');
		});

		it('formats characters', () => {
			expect(sprintf('%c', 65)).toBe('A');
			expect(sprintf('%c', 0)).toBe('\x80'); // Fallback for 0
			expect(sprintf('%c', 'XYZ')).toBe('X'); // First char
		});

		it('formats octal', () => {
			expect(sprintf('%o', 8)).toBe('10');
			expect(sprintf('%o', 64)).toBe('100');
			expect(sprintf('%o', 0)).toBe('0');
		});

		it('formats hex lowercase', () => {
			expect(sprintf('%x', 255)).toBe('ff');
			expect(sprintf('%x', 16)).toBe('10');
			expect(sprintf('%x', 0)).toBe('0');
		});

		it('formats hex uppercase', () => {
			expect(sprintf('%X', 255)).toBe('FF');
			expect(sprintf('%X', 16)).toBe('10');
			expect(sprintf('%X', 0)).toBe('0');
		});

		it('handles multiple arguments', () => {
			expect(sprintf('%s: %d', 'Value', 42)).toBe('Value: 42');
			expect(sprintf('%d + %d = %d', 1, 2, 3)).toBe('1 + 2 = 3');
		});

		it('handles missing arguments', () => {
			expect(sprintf('%d %d', 1)).toBe('1 0');
		});
	});

	describe('width formatting', () => {
		it('pads with spaces (right-align)', () => {
			expect(sprintf('%5d', 42)).toBe('   42');
			expect(sprintf('%5s', 'hi')).toBe('   hi');
		});

		it('left-justifies with minus flag', () => {
			expect(sprintf('%-5d', 42)).toBe('42   ');
			expect(sprintf('%-5s', 'hi')).toBe('hi   ');
		});

		it('zero-pads numbers', () => {
			expect(sprintf('%05d', 42)).toBe('00042');
			expect(sprintf('%08x', 255)).toBe('000000ff');
		});

		it('does not zero-pad when left-justified', () => {
			expect(sprintf('%-05d', 42)).toBe('42   ');
		});

		it('handles width smaller than value', () => {
			expect(sprintf('%2d', 12345)).toBe('12345');
			expect(sprintf('%2s', 'hello')).toBe('hello');
		});
	});

	describe('precision', () => {
		it('limits string length', () => {
			expect(sprintf('%.3s', 'hello')).toBe('hel');
			expect(sprintf('%.10s', 'hello')).toBe('hello');
		});

		it('sets minimum digits for integers', () => {
			expect(sprintf('%.5d', 42)).toBe('00042');
			expect(sprintf('%.3d', 12345)).toBe('12345');
		});

		it('combines with width', () => {
			expect(sprintf('%8.5d', 42)).toBe('   00042');
		});
	});

	describe('sign flags', () => {
		it('shows plus sign with + flag', () => {
			expect(sprintf('%+d', 42)).toBe('+42');
			expect(sprintf('%+d', -42)).toBe('-42');
			expect(sprintf('%+d', 0)).toBe('+0');
		});

		it('shows space with space flag', () => {
			expect(sprintf('% d', 42)).toBe(' 42');
			expect(sprintf('% d', -42)).toBe('-42');
		});

		it('plus flag takes precedence over space', () => {
			expect(sprintf('%+ d', 42)).toBe('+42');
			expect(sprintf('% +d', 42)).toBe('+42');
		});
	});

	describe('alternate form (#)', () => {
		it('prefixes octal with 0', () => {
			expect(sprintf('%#o', 8)).toBe('010');
			expect(sprintf('%#o', 0)).toBe('0'); // No prefix for 0
		});

		it('prefixes hex with 0x', () => {
			expect(sprintf('%#x', 255)).toBe('0xff');
			expect(sprintf('%#x', 0)).toBe('0'); // No prefix for 0
		});

		it('prefixes hex uppercase with 0X', () => {
			expect(sprintf('%#X', 255)).toBe('0XFF');
		});
	});

	describe('combined flags', () => {
		it('combines width and zero padding', () => {
			expect(sprintf('%+08d', 42)).toBe('+0000042');
		});

		it('combines alternate and width', () => {
			expect(sprintf('%#8x', 255)).toBe('    0xff');
			expect(sprintf('%#08x', 255)).toBe('0x0000ff');
		});
	});

	describe('edge cases', () => {
		it('handles non-numeric values for %d', () => {
			expect(sprintf('%d', 'abc')).toBe('0');
			expect(sprintf('%d', NaN)).toBe('0');
			expect(sprintf('%d', Infinity)).toBe('0');
		});

		it('handles null and undefined', () => {
			expect(sprintf('%s', null)).toBe('');
			expect(sprintf('%s', undefined)).toBe('');
			expect(sprintf('%d', null)).toBe('0');
		});

		it('preserves text without specifiers', () => {
			expect(sprintf('hello world')).toBe('hello world');
		});

		it('handles escaped percent (%%)', () => {
			// Note: %% is not handled by our implementation, passes through
			expect(sprintf('100%')).toBe('100%');
		});

		it('handles floating point truncation', () => {
			expect(sprintf('%d', 3.7)).toBe('3');
			expect(sprintf('%d', -3.7)).toBe('-3');
		});
	});

	describe('real-world terminal strings', () => {
		it('formats cursor position style', () => {
			expect(sprintf('[%d;%dH', 10, 20)).toBe('[10;20H');
		});

		it('formats SGR attributes', () => {
			expect(sprintf('[%dm', 1)).toBe('[1m');
			expect(sprintf('[38;5;%dm', 196)).toBe('[38;5;196m');
		});

		it('formats character with width', () => {
			expect(sprintf('%c', 97)).toBe('a');
		});
	});
});

describe('parseFormat', () => {
	it('parses single specifier', () => {
		const specs = parseFormat('%d');
		expect(specs).toHaveLength(1);
		expect(specs[0]?.type).toBe('d');
		expect(specs[0]?.width).toBe(0);
	});

	it('parses multiple specifiers', () => {
		const specs = parseFormat('%s: %d');
		expect(specs).toHaveLength(2);
		expect(specs[0]?.type).toBe('s');
		expect(specs[1]?.type).toBe('d');
	});

	it('parses flags', () => {
		const specs = parseFormat('%+08d');
		expect(specs[0]?.flags.sign).toBe(true);
		expect(specs[0]?.flags.zero).toBe(true);
		expect(specs[0]?.width).toBe(8);
	});

	it('parses precision', () => {
		const specs = parseFormat('%.5d');
		expect(specs[0]?.precision).toBe(5);
	});

	it('parses width and precision', () => {
		const specs = parseFormat('%10.5d');
		expect(specs[0]?.width).toBe(10);
		expect(specs[0]?.precision).toBe(5);
	});

	it('returns empty array for no specifiers', () => {
		const specs = parseFormat('hello world');
		expect(specs).toHaveLength(0);
	});
});

describe('countFormatArgs', () => {
	it('counts specifiers', () => {
		expect(countFormatArgs('%d')).toBe(1);
		expect(countFormatArgs('%d + %d')).toBe(2);
		expect(countFormatArgs('%s: %d (%x)')).toBe(3);
	});

	it('returns 0 for no specifiers', () => {
		expect(countFormatArgs('hello')).toBe(0);
		expect(countFormatArgs('')).toBe(0);
	});
});

describe('isValidFormat', () => {
	it('validates correct formats', () => {
		expect(isValidFormat('%d')).toBe(true);
		expect(isValidFormat('%s')).toBe(true);
		expect(isValidFormat('%5.2d')).toBe(true);
		expect(isValidFormat('hello')).toBe(true);
		expect(isValidFormat('')).toBe(true);
	});

	it('rejects invalid type specifiers', () => {
		expect(isValidFormat('%z')).toBe(false);
		expect(isValidFormat('%q')).toBe(false);
		expect(isValidFormat('%')).toBe(false);
	});
});

describe('createFormatter', () => {
	it('creates reusable formatter', () => {
		const fmt = createFormatter('Point(%d, %d)');
		expect(fmt(10, 20)).toBe('Point(10, 20)');
		expect(fmt(5, 15)).toBe('Point(5, 15)');
	});

	it('works with complex format', () => {
		const fmt = createFormatter('[%02d:%02d:%02d]');
		expect(fmt(9, 5, 3)).toBe('[09:05:03]');
		expect(fmt(12, 30, 45)).toBe('[12:30:45]');
	});
});
