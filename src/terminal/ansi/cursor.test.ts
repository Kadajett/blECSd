/**
 * Tests for ANSI cursor control functions.
 * @module terminal/ansi/cursor.test
 */

import { describe, expect, it } from 'vitest';
import { CSI } from './constants';
import { cursor } from './cursor';

describe('cursor', () => {
	describe('move', () => {
		it('generates cursor position escape sequence', () => {
			const seq = cursor.move(10, 5);

			expect(seq).toContain(CSI);
			expect(seq).toContain('5');
			expect(seq).toContain('10');
			expect(seq).toContain('H');
		});

		it('uses 1-indexed coordinates', () => {
			const seq = cursor.move(1, 1);

			expect(seq).toBe(`${CSI}1;1H`);
		});

		it('handles large coordinates', () => {
			const seq = cursor.move(999, 999);

			expect(seq).toContain('999');
		});
	});

	describe('column', () => {
		it('generates column position escape sequence', () => {
			const seq = cursor.column(1);

			expect(seq).toContain(CSI);
			expect(seq).toContain('1');
			expect(seq).toContain('G');
		});

		it('handles different column values', () => {
			expect(cursor.column(1)).toBe(`${CSI}1G`);
			expect(cursor.column(10)).toBe(`${CSI}10G`);
			expect(cursor.column(80)).toBe(`${CSI}80G`);
		});
	});

	describe('up', () => {
		it('moves cursor up', () => {
			const seq = cursor.up(3);

			expect(seq).toContain(CSI);
			expect(seq).toContain('3');
			expect(seq).toContain('A');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.up();

			expect(seq).toBe(`${CSI}1A`);
		});

		it('handles different move amounts', () => {
			expect(cursor.up(1)).toBe(`${CSI}1A`);
			expect(cursor.up(5)).toBe(`${CSI}5A`);
			expect(cursor.up(100)).toBe(`${CSI}100A`);
		});
	});

	describe('down', () => {
		it('moves cursor down', () => {
			const seq = cursor.down(2);

			expect(seq).toContain(CSI);
			expect(seq).toContain('2');
			expect(seq).toContain('B');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.down();

			expect(seq).toBe(`${CSI}1B`);
		});

		it('handles different move amounts', () => {
			expect(cursor.down(1)).toBe(`${CSI}1B`);
			expect(cursor.down(5)).toBe(`${CSI}5B`);
			expect(cursor.down(50)).toBe(`${CSI}50B`);
		});
	});

	describe('forward', () => {
		it('moves cursor forward (right)', () => {
			const seq = cursor.forward(5);

			expect(seq).toContain(CSI);
			expect(seq).toContain('5');
			expect(seq).toContain('C');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.forward();

			expect(seq).toBe(`${CSI}1C`);
		});

		it('handles different move amounts', () => {
			expect(cursor.forward(1)).toBe(`${CSI}1C`);
			expect(cursor.forward(10)).toBe(`${CSI}10C`);
			expect(cursor.forward(80)).toBe(`${CSI}80C`);
		});
	});

	describe('back', () => {
		it('moves cursor back (left)', () => {
			const seq = cursor.back(3);

			expect(seq).toContain(CSI);
			expect(seq).toContain('3');
			expect(seq).toContain('D');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.back();

			expect(seq).toBe(`${CSI}1D`);
		});

		it('handles different move amounts', () => {
			expect(cursor.back(1)).toBe(`${CSI}1D`);
			expect(cursor.back(5)).toBe(`${CSI}5D`);
			expect(cursor.back(20)).toBe(`${CSI}20D`);
		});
	});

	describe('nextLine', () => {
		it('moves cursor to beginning of next line', () => {
			const seq = cursor.nextLine(2);

			expect(seq).toContain(CSI);
			expect(seq).toContain('2');
			expect(seq).toContain('E');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.nextLine();

			expect(seq).toBe(`${CSI}1E`);
		});
	});

	describe('prevLine', () => {
		it('moves cursor to beginning of previous line', () => {
			const seq = cursor.prevLine(2);

			expect(seq).toContain(CSI);
			expect(seq).toContain('2');
			expect(seq).toContain('F');
		});

		it('defaults to 1 when n not provided', () => {
			const seq = cursor.prevLine();

			expect(seq).toBe(`${CSI}1F`);
		});
	});

	describe('save', () => {
		it('saves cursor position', () => {
			const seq = cursor.save();

			expect(seq).toContain(CSI);
			expect(seq).toContain('s');
		});
	});

	describe('restore', () => {
		it('restores cursor position', () => {
			const seq = cursor.restore();

			expect(seq).toContain(CSI);
			expect(seq).toContain('u');
		});
	});

	describe('hide', () => {
		it('hides cursor', () => {
			const seq = cursor.hide();

			expect(seq).toContain(CSI);
			expect(seq).toContain('?25l');
		});
	});

	describe('show', () => {
		it('shows cursor', () => {
			const seq = cursor.show();

			expect(seq).toContain(CSI);
			expect(seq).toContain('?25h');
		});
	});

	it('all methods return strings', () => {
		expect(typeof cursor.move(1, 1)).toBe('string');
		expect(typeof cursor.column(1)).toBe('string');
		expect(typeof cursor.up()).toBe('string');
		expect(typeof cursor.down()).toBe('string');
		expect(typeof cursor.forward()).toBe('string');
		expect(typeof cursor.back()).toBe('string');
		expect(typeof cursor.nextLine()).toBe('string');
		expect(typeof cursor.prevLine()).toBe('string');
		expect(typeof cursor.save()).toBe('string');
		expect(typeof cursor.restore()).toBe('string');
		expect(typeof cursor.hide()).toBe('string');
		expect(typeof cursor.show()).toBe('string');
	});

	it('all methods return non-empty strings', () => {
		expect(cursor.move(1, 1).length).toBeGreaterThan(0);
		expect(cursor.column(1).length).toBeGreaterThan(0);
		expect(cursor.up().length).toBeGreaterThan(0);
		expect(cursor.down().length).toBeGreaterThan(0);
		expect(cursor.forward().length).toBeGreaterThan(0);
		expect(cursor.back().length).toBeGreaterThan(0);
		expect(cursor.nextLine().length).toBeGreaterThan(0);
		expect(cursor.prevLine().length).toBeGreaterThan(0);
		expect(cursor.save().length).toBeGreaterThan(0);
		expect(cursor.restore().length).toBeGreaterThan(0);
		expect(cursor.hide().length).toBeGreaterThan(0);
		expect(cursor.show().length).toBeGreaterThan(0);
	});
});
