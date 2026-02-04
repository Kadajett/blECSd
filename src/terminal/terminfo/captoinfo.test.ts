/**
 * Tests for captoinfo converter.
 *
 * @module terminal/terminfo/captoinfo.test
 */

import { describe, expect, it } from 'vitest';
import { captoinfo, convertTermcapStrings, needsConversion } from './captoinfo';

describe('captoinfo', () => {
	describe('basic conversions', () => {
		it('passes through literal percent', () => {
			expect(captoinfo('%%')).toBe('%');
		});

		it('passes through %i unchanged', () => {
			expect(captoinfo('%i')).toBe('%i');
		});

		it('converts %d to use parameter', () => {
			expect(captoinfo('%d')).toBe('%p1%d');
		});

		it('converts %. to %c', () => {
			expect(captoinfo('%.')).toBe('%p1%c');
		});

		it('converts %2 to %2d with parameter', () => {
			expect(captoinfo('%2')).toBe('%p1%2d');
		});

		it('converts %3 to %3d with parameter', () => {
			expect(captoinfo('%3')).toBe('%p1%3d');
		});

		it('handles %02 format', () => {
			expect(captoinfo('%02')).toBe('%p1%2d');
		});

		it('handles %03 format', () => {
			expect(captoinfo('%03')).toBe('%p1%3d');
		});

		it('converts %s with parameter', () => {
			expect(captoinfo('%s')).toBe('%p1%s');
		});

		it('converts %\\ to %\\', () => {
			expect(captoinfo('%\\')).toBe('%\\');
		});
	});

	describe('parameter handling', () => {
		it('increments parameter for each conversion', () => {
			expect(captoinfo('%d;%d')).toBe('%p1%d;%p2%d');
		});

		it('uses %i for incrementing', () => {
			expect(captoinfo('%i%d;%d')).toBe('%i%p1%d;%p2%d');
		});

		it('handles %f to skip parameter', () => {
			expect(captoinfo('%f%d')).toBe('%p2%d');
		});

		it('handles %b to go back a parameter', () => {
			expect(captoinfo('%d%b%d')).toBe('%p1%d%p1%d');
		});
	});

	describe('reversal with %r', () => {
		it('reverses parameters 1 and 2', () => {
			expect(captoinfo('%r%d;%d')).toBe('%p2%d;%p1%d');
		});

		it('does not affect parameters beyond 2', () => {
			expect(captoinfo('%r%d;%d;%d')).toBe('%p2%d;%p1%d;%p3%d');
		});
	});

	describe('%m and %n transformations', () => {
		it('applies mask with %m', () => {
			const result = captoinfo('%m%d');
			expect(result).toContain('%{127}%^');
		});

		it('applies XOR with %n', () => {
			const result = captoinfo('%n%d');
			expect(result).toContain('%{96}%^');
		});
	});

	describe('BCD and difference encoding', () => {
		it('converts %B to BCD encoding', () => {
			const result = captoinfo('%B');
			expect(result).toContain('%{10}%/');
			expect(result).toContain('%{16}%*');
		});

		it('converts %6 same as %B', () => {
			const result = captoinfo('%6');
			expect(result).toContain('%{10}%/');
		});

		it('converts %D to difference encoding', () => {
			const result = captoinfo('%D');
			expect(result).toContain('%{2}%*%-');
		});

		it('converts %8 same as %D', () => {
			const result = captoinfo('%8');
			expect(result).toContain('%{2}%*%-');
		});
	});

	describe('character addition (%+)', () => {
		it('converts %+c to add and output char', () => {
			// %+  means add space (32) and output as char
			const result = captoinfo('%+ ');
			expect(result).toContain('%p1');
			expect(result).toContain('%+%c');
		});
	});

	describe('character subtraction (%-)', () => {
		it('converts %-c to subtract and output char', () => {
			const result = captoinfo('%- ');
			expect(result).toContain('%-%c');
		});
	});

	describe('conditional (%>)', () => {
		it('converts %> to conditional', () => {
			const result = captoinfo('%>xy');
			expect(result).toContain('%?');
			expect(result).toContain('%>%t');
			expect(result).toContain('%+%;');
		});
	});

	describe('padding', () => {
		it('skips initial padding digits', () => {
			expect(captoinfo('50\\E[H')).toBe('\\E[H');
		});

		it('skips padding with asterisk', () => {
			expect(captoinfo('50*\\E[H')).toBe('\\E[H');
		});

		it('preserves padding when disabled', () => {
			expect(captoinfo('50\\E[H', { convertPadding: false })).toBe('50\\E[H');
		});
	});

	describe('non-parameterized mode', () => {
		it('passes through % codes unchanged', () => {
			expect(captoinfo('%d;%d', { parameterized: false })).toBe('%d;%d');
		});
	});

	describe('real-world examples', () => {
		it('converts cursor_address (cm)', () => {
			// Termcap: cm=\E[%i%d;%dH
			const result = captoinfo('\\E[%i%d;%dH');
			expect(result).toBe('\\E[%i%p1%d;%p2%dH');
		});

		it('converts cursor_address with addition', () => {
			// Some terminals use %+  (add space)
			const result = captoinfo('\\E[%i%+ ;%+ H');
			expect(result).toContain('%p1');
			expect(result).toContain('%+%c');
		});

		it('converts clear_screen (cl)', () => {
			// Termcap: cl=\E[H\E[2J (no parameters)
			expect(captoinfo('\\E[H\\E[2J')).toBe('\\E[H\\E[2J');
		});

		it('handles empty string', () => {
			expect(captoinfo('')).toBe('');
		});
	});
});

describe('convertTermcapStrings', () => {
	it('converts all string capabilities', () => {
		const termcap = {
			cm: '\\E[%i%d;%dH',
			cl: '\\E[H\\E[2J',
		};

		const result = convertTermcapStrings(termcap);

		expect(result.cm).toBe('\\E[%i%p1%d;%p2%dH');
		expect(result.cl).toBe('\\E[H\\E[2J');
	});

	it('handles empty record', () => {
		expect(convertTermcapStrings({})).toEqual({});
	});
});

describe('needsConversion', () => {
	it('detects %d that needs conversion', () => {
		expect(needsConversion('%d;%dH')).toBe(true);
	});

	it('detects %. that needs conversion', () => {
		expect(needsConversion('%.')).toBe(true);
	});

	it('detects %+ that needs conversion', () => {
		expect(needsConversion('%+ ')).toBe(true);
	});

	it('detects %r that needs conversion', () => {
		expect(needsConversion('%r%d')).toBe(true);
	});

	it('detects %B that needs conversion', () => {
		expect(needsConversion('%B')).toBe(true);
	});

	it('does not flag strings without termcap codes', () => {
		expect(needsConversion('\\E[H\\E[2J')).toBe(false);
	});

	it('does not flag terminfo-style %p codes', () => {
		expect(needsConversion('%p1%d')).toBe(false);
	});

	it('flags %> conditional', () => {
		expect(needsConversion('%>xy')).toBe(true);
	});

	it('flags %a arithmetic', () => {
		expect(needsConversion('%a+pA')).toBe(true);
	});
});
