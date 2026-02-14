import { describe, expect, it } from 'vitest';
import { BORDER_SINGLE } from '../components/border';
import {
	BOX_ASCII,
	BOX_BOLD,
	BOX_DASHED,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
	type BoxChars,
	boxFillRect,
	bufferToString,
	charsetToBoxChars,
	createCellBuffer,
	renderBox,
	renderHLine,
	renderText,
	renderVLine,
} from './box';

describe('charsetToBoxChars', () => {
	it('converts BorderCharset to BoxChars', () => {
		const chars = charsetToBoxChars(BORDER_SINGLE);

		expect(chars.topLeft).toBe('┌');
		expect(chars.topRight).toBe('┐');
		expect(chars.bottomLeft).toBe('└');
		expect(chars.bottomRight).toBe('┘');
		expect(chars.horizontal).toBe('─');
		expect(chars.vertical).toBe('│');
	});
});

describe('preset box styles', () => {
	it('BOX_SINGLE has correct characters', () => {
		expect(BOX_SINGLE.topLeft).toBe('┌');
		expect(BOX_SINGLE.horizontal).toBe('─');
		expect(BOX_SINGLE.vertical).toBe('│');
	});

	it('BOX_DOUBLE has correct characters', () => {
		expect(BOX_DOUBLE.topLeft).toBe('╔');
		expect(BOX_DOUBLE.horizontal).toBe('═');
		expect(BOX_DOUBLE.vertical).toBe('║');
	});

	it('BOX_ROUNDED has correct characters', () => {
		expect(BOX_ROUNDED.topLeft).toBe('╭');
		expect(BOX_ROUNDED.topRight).toBe('╮');
		expect(BOX_ROUNDED.bottomLeft).toBe('╰');
		expect(BOX_ROUNDED.bottomRight).toBe('╯');
	});

	it('BOX_BOLD has correct characters', () => {
		expect(BOX_BOLD.topLeft).toBe('┏');
		expect(BOX_BOLD.horizontal).toBe('━');
		expect(BOX_BOLD.vertical).toBe('┃');
	});

	it('BOX_ASCII has correct characters', () => {
		expect(BOX_ASCII.topLeft).toBe('+');
		expect(BOX_ASCII.horizontal).toBe('-');
		expect(BOX_ASCII.vertical).toBe('|');
	});

	it('BOX_DASHED has correct characters', () => {
		expect(BOX_DASHED.horizontal).toBe('╌');
		expect(BOX_DASHED.vertical).toBe('╎');
	});
});

describe('createCellBuffer', () => {
	it('creates buffer with correct dimensions', () => {
		const buffer = createCellBuffer(80, 24);

		expect(buffer.width).toBe(80);
		expect(buffer.height).toBe(24);
		expect(buffer.cells.length).toBe(24);
		expect(buffer.cells[0]?.length).toBe(80);
	});

	it('initializes cells with defaults', () => {
		const buffer = createCellBuffer(10, 5);

		const cell = buffer.cells[0]?.[0];
		expect(cell?.char).toBe(' ');
		expect(cell?.fg).toBe(0xffffffff);
		expect(cell?.bg).toBe(0x00000000);
	});

	it('uses custom default colors', () => {
		const buffer = createCellBuffer(10, 5, 0x00ff00ff, 0x0000aaff);

		const cell = buffer.cells[0]?.[0];
		expect(cell?.fg).toBe(0x00ff00ff);
		expect(cell?.bg).toBe(0x0000aaff);
	});

	it('setCell updates cell values', () => {
		const buffer = createCellBuffer(10, 5);

		buffer.setCell(3, 2, 'X', 0xff0000ff, 0x00ff00ff);

		const cell = buffer.cells[2]?.[3];
		expect(cell?.char).toBe('X');
		expect(cell?.fg).toBe(0xff0000ff);
		expect(cell?.bg).toBe(0x00ff00ff);
	});

	it('setCell ignores out of bounds', () => {
		const buffer = createCellBuffer(10, 5);

		// These should not throw
		buffer.setCell(-1, 0, 'X');
		buffer.setCell(0, -1, 'X');
		buffer.setCell(10, 0, 'X');
		buffer.setCell(0, 5, 'X');

		// Verify nothing changed
		expect(buffer.cells[0]?.[0]?.char).toBe(' ');
	});
});

describe('renderBox', () => {
	it('renders a 3x3 box', () => {
		const buffer = createCellBuffer(10, 5);
		renderBox(buffer, 0, 0, 3, 3, BOX_SINGLE);

		const result = bufferToString(buffer);
		const lines = result.split('\n');

		expect(lines[0]).toBe('┌─┐       ');
		expect(lines[1]).toBe('│ │       ');
		expect(lines[2]).toBe('└─┘       ');
	});

	it('renders a 1x1 box (single corner)', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 1, 1, 1, 1, BOX_SINGLE);

		expect(buffer.cells[1]?.[1]?.char).toBe('┌');
	});

	it('renders a 2x1 box (two corners)', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 2, 1, BOX_SINGLE);

		expect(buffer.cells[0]?.[0]?.char).toBe('┌');
		expect(buffer.cells[0]?.[1]?.char).toBe('┐');
	});

	it('renders a 1x2 box (two corners)', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 1, 2, BOX_SINGLE);

		expect(buffer.cells[0]?.[0]?.char).toBe('┌');
		expect(buffer.cells[1]?.[0]?.char).toBe('└');
	});

	it('renders with fill option', () => {
		const buffer = createCellBuffer(10, 5);
		renderBox(buffer, 0, 0, 5, 4, BOX_SINGLE, { fill: true, bg: 0x0000aaff });

		// Interior cells should have background color
		const interior = buffer.cells[1]?.[1];
		expect(interior?.char).toBe(' ');
		expect(interior?.bg).toBe(0x0000aaff);
	});

	it('renders with custom fill character', () => {
		const buffer = createCellBuffer(10, 5);
		renderBox(buffer, 0, 0, 5, 4, BOX_SINGLE, { fill: true, fillChar: '.' });

		const interior = buffer.cells[1]?.[1];
		expect(interior?.char).toBe('.');
	});

	it('applies foreground color to border', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 3, 3, BOX_SINGLE, { fg: 0xff0000ff });

		expect(buffer.cells[0]?.[0]?.fg).toBe(0xff0000ff);
		expect(buffer.cells[0]?.[1]?.fg).toBe(0xff0000ff);
	});

	it('handles zero width', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 0, 3, BOX_SINGLE);

		// Should not render anything
		expect(buffer.cells[0]?.[0]?.char).toBe(' ');
	});

	it('handles zero height', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 3, 0, BOX_SINGLE);

		// Should not render anything
		expect(buffer.cells[0]?.[0]?.char).toBe(' ');
	});

	it('renders each box style correctly', () => {
		const styles: [string, BoxChars, string][] = [
			['single', BOX_SINGLE, '┌─┐'],
			['double', BOX_DOUBLE, '╔═╗'],
			['rounded', BOX_ROUNDED, '╭─╮'],
			['bold', BOX_BOLD, '┏━┓'],
			['ascii', BOX_ASCII, '+-+'],
			['dashed', BOX_DASHED, '┌╌┐'],
		];

		for (const [_name, style, expected] of styles) {
			const buffer = createCellBuffer(5, 3);
			renderBox(buffer, 0, 0, 3, 1, style);

			const row = buffer.cells[0];
			const actual = (row?.[0]?.char ?? '') + (row?.[1]?.char ?? '') + (row?.[2]?.char ?? '');
			expect(actual).toBe(expected);
		}
	});
});

describe('renderHLine', () => {
	it('renders horizontal line', () => {
		const buffer = createCellBuffer(10, 3);
		renderHLine(buffer, 2, 1, 5, '─');

		const row = buffer.cells[1];
		expect(row?.[0]?.char).toBe(' ');
		expect(row?.[1]?.char).toBe(' ');
		expect(row?.[2]?.char).toBe('─');
		expect(row?.[3]?.char).toBe('─');
		expect(row?.[6]?.char).toBe('─');
		expect(row?.[7]?.char).toBe(' ');
	});

	it('applies colors', () => {
		const buffer = createCellBuffer(10, 3);
		renderHLine(buffer, 0, 0, 3, '═', 0xff0000ff, 0x00ff00ff);

		expect(buffer.cells[0]?.[0]?.fg).toBe(0xff0000ff);
		expect(buffer.cells[0]?.[0]?.bg).toBe(0x00ff00ff);
	});
});

describe('renderVLine', () => {
	it('renders vertical line', () => {
		const buffer = createCellBuffer(5, 10);
		renderVLine(buffer, 2, 1, 5, '│');

		expect(buffer.cells[0]?.[2]?.char).toBe(' ');
		expect(buffer.cells[1]?.[2]?.char).toBe('│');
		expect(buffer.cells[5]?.[2]?.char).toBe('│');
		expect(buffer.cells[6]?.[2]?.char).toBe(' ');
	});

	it('applies colors', () => {
		const buffer = createCellBuffer(5, 5);
		renderVLine(buffer, 0, 0, 3, '║', 0xff0000ff, 0x00ff00ff);

		expect(buffer.cells[0]?.[0]?.fg).toBe(0xff0000ff);
		expect(buffer.cells[0]?.[0]?.bg).toBe(0x00ff00ff);
	});
});

describe('fillRect', () => {
	it('fills rectangular region', () => {
		const buffer = createCellBuffer(10, 5);
		boxFillRect(buffer, 1, 1, 3, 2, '#');

		expect(buffer.cells[0]?.[1]?.char).toBe(' ');
		expect(buffer.cells[1]?.[1]?.char).toBe('#');
		expect(buffer.cells[1]?.[3]?.char).toBe('#');
		expect(buffer.cells[2]?.[1]?.char).toBe('#');
		expect(buffer.cells[3]?.[1]?.char).toBe(' ');
	});

	it('applies colors', () => {
		const buffer = createCellBuffer(5, 5);
		boxFillRect(buffer, 0, 0, 2, 2, ' ', 0xff0000ff, 0x00ff00ff);

		expect(buffer.cells[0]?.[0]?.fg).toBe(0xff0000ff);
		expect(buffer.cells[0]?.[0]?.bg).toBe(0x00ff00ff);
	});
});

describe('renderText', () => {
	it('renders text', () => {
		const buffer = createCellBuffer(20, 3);
		renderText(buffer, 2, 1, 'Hello');

		const row = buffer.cells[1];
		expect(row?.[2]?.char).toBe('H');
		expect(row?.[3]?.char).toBe('e');
		expect(row?.[4]?.char).toBe('l');
		expect(row?.[5]?.char).toBe('l');
		expect(row?.[6]?.char).toBe('o');
	});

	it('applies colors', () => {
		const buffer = createCellBuffer(10, 3);
		renderText(buffer, 0, 0, 'AB', 0xff0000ff, 0x00ff00ff);

		expect(buffer.cells[0]?.[0]?.fg).toBe(0xff0000ff);
		expect(buffer.cells[0]?.[0]?.bg).toBe(0x00ff00ff);
	});
});

describe('bufferToString', () => {
	it('converts buffer to string', () => {
		const buffer = createCellBuffer(5, 3);
		renderBox(buffer, 0, 0, 5, 3, BOX_SINGLE);

		const result = bufferToString(buffer);

		expect(result).toBe('┌───┐\n│   │\n└───┘');
	});

	it('preserves empty cells as spaces', () => {
		const buffer = createCellBuffer(3, 1);
		const result = bufferToString(buffer);

		expect(result).toBe('   ');
	});
});

describe('integration', () => {
	it('renders nested boxes', () => {
		const buffer = createCellBuffer(12, 7);

		// Outer box
		renderBox(buffer, 0, 0, 12, 7, BOX_DOUBLE);

		// Inner box
		renderBox(buffer, 2, 1, 8, 5, BOX_SINGLE);

		const result = bufferToString(buffer);
		const lines = result.split('\n');

		expect(lines[0]).toBe('╔══════════╗');
		expect(lines[1]).toBe('║ ┌──────┐ ║');
		expect(lines[2]).toBe('║ │      │ ║');
	});

	it('renders box with centered text', () => {
		const buffer = createCellBuffer(10, 5);

		renderBox(buffer, 0, 0, 10, 5, BOX_ROUNDED, { fill: true });
		renderText(buffer, 2, 2, 'Hello');

		const result = bufferToString(buffer);
		const lines = result.split('\n');

		expect(lines[2]).toBe('│ Hello  │');
	});
});
