/**
 * Tests for ANSI text styling functions.
 * @module terminal/ansi/text.test
 */

import { describe, expect, it } from 'vitest';
import { CSI } from './constants';
import { style } from './text';

describe('style', () => {
	describe('reset', () => {
		it('generates reset escape sequence', () => {
			const seq = style.reset();

			expect(seq).toContain(CSI);
			expect(seq).toContain('0m');
		});
	});

	describe('bold', () => {
		it('generates bold escape sequence', () => {
			const seq = style.bold();

			expect(seq).toContain(CSI);
			expect(seq).toContain('1m');
		});
	});

	describe('dim', () => {
		it('generates dim escape sequence', () => {
			const seq = style.dim();

			expect(seq).toContain(CSI);
			expect(seq).toContain('2m');
		});
	});

	describe('italic', () => {
		it('generates italic escape sequence', () => {
			const seq = style.italic();

			expect(seq).toContain(CSI);
			expect(seq).toContain('3m');
		});
	});

	describe('underline', () => {
		it('generates underline escape sequence', () => {
			const seq = style.underline();

			expect(seq).toContain(CSI);
			expect(seq).toContain('4m');
		});
	});

	describe('blink', () => {
		it('generates blink escape sequence', () => {
			const seq = style.blink();

			expect(seq).toContain(CSI);
			expect(seq).toContain('5m');
		});
	});

	describe('inverse', () => {
		it('generates inverse escape sequence', () => {
			const seq = style.inverse();

			expect(seq).toContain(CSI);
			expect(seq).toContain('7m');
		});
	});

	describe('hidden', () => {
		it('generates hidden escape sequence', () => {
			const seq = style.hidden();

			expect(seq).toContain(CSI);
			expect(seq).toContain('8m');
		});
	});

	describe('strikethrough', () => {
		it('generates strikethrough escape sequence', () => {
			const seq = style.strikethrough();

			expect(seq).toContain(CSI);
			expect(seq).toContain('9m');
		});
	});

	describe('fg', () => {
		it('sets foreground color from basic color', () => {
			const seq = style.fg('red');

			expect(seq).toContain(CSI);
			expect(seq).toMatch(/3[0-7]m/);
		});

		it('handles RGB color object', () => {
			const seq = style.fg({ r: 255, g: 0, b: 0 });

			expect(seq).toContain(CSI);
			expect(seq).toContain('38;2;');
		});

		it('handles 256-color index', () => {
			const seq = style.fg(42);

			expect(seq).toContain(CSI);
			expect(seq).toContain('38;5;42');
		});
	});

	describe('bg', () => {
		it('sets background color from basic color', () => {
			const seq = style.bg('blue');

			expect(seq).toContain(CSI);
			expect(seq).toMatch(/4[0-7]m/);
		});

		it('handles RGB color object', () => {
			const seq = style.bg({ r: 0, g: 255, b: 0 });

			expect(seq).toContain(CSI);
			expect(seq).toContain('48;2;');
		});

		it('handles 256-color index', () => {
			const seq = style.bg(100);

			expect(seq).toContain(CSI);
			expect(seq).toContain('48;5;100');
		});
	});

	it('all methods return strings', () => {
		expect(typeof style.reset()).toBe('string');
		expect(typeof style.bold()).toBe('string');
		expect(typeof style.dim()).toBe('string');
		expect(typeof style.italic()).toBe('string');
		expect(typeof style.underline()).toBe('string');
		expect(typeof style.blink()).toBe('string');
		expect(typeof style.inverse()).toBe('string');
		expect(typeof style.hidden()).toBe('string');
		expect(typeof style.strikethrough()).toBe('string');
		expect(typeof style.fg('red')).toBe('string');
		expect(typeof style.bg('blue')).toBe('string');
	});

	it('all methods return non-empty strings', () => {
		expect(style.reset().length).toBeGreaterThan(0);
		expect(style.bold().length).toBeGreaterThan(0);
		expect(style.dim().length).toBeGreaterThan(0);
		expect(style.italic().length).toBeGreaterThan(0);
		expect(style.underline().length).toBeGreaterThan(0);
		expect(style.blink().length).toBeGreaterThan(0);
		expect(style.inverse().length).toBeGreaterThan(0);
		expect(style.hidden().length).toBeGreaterThan(0);
		expect(style.strikethrough().length).toBeGreaterThan(0);
		expect(style.fg('red').length).toBeGreaterThan(0);
		expect(style.bg('blue').length).toBeGreaterThan(0);
	});

	it('generates different sequences for different styles', () => {
		const sequences = [
			style.reset(),
			style.bold(),
			style.dim(),
			style.italic(),
			style.underline(),
			style.blink(),
			style.inverse(),
			style.hidden(),
			style.strikethrough(),
		];

		// All sequences should be unique
		const uniqueSequences = new Set(sequences);
		expect(uniqueSequences.size).toBe(sequences.length);
	});
});
