/**
 * Tests for Cell type and Screen Buffer functionality
 */

import { describe, expect, it } from 'vitest';
import {
	Attr,
	cellIndex,
	cellsEqual,
	clearBuffer,
	cloneCell,
	copyRegion,
	createCell,
	createScreenBuffer,
	DEFAULT_BG,
	DEFAULT_CHAR,
	DEFAULT_FG,
	diffBuffers,
	fillRect,
	getCell,
	hasAttr,
	isInBounds,
	resizeBuffer,
	setCell,
	setChar,
	withAttr,
	withoutAttr,
	writeString,
} from './cell';

describe('Cell', () => {
	describe('Attr flags', () => {
		it('defines all attribute flags', () => {
			expect(Attr.NONE).toBe(0);
			expect(Attr.BOLD).toBe(1);
			expect(Attr.DIM).toBe(2);
			expect(Attr.ITALIC).toBe(4);
			expect(Attr.UNDERLINE).toBe(8);
			expect(Attr.BLINK).toBe(16);
			expect(Attr.INVERSE).toBe(32);
			expect(Attr.HIDDEN).toBe(64);
			expect(Attr.STRIKETHROUGH).toBe(128);
		});

		it('allows combining flags', () => {
			const combined = Attr.BOLD | Attr.UNDERLINE;
			expect(combined).toBe(9);
			expect((combined & Attr.BOLD) !== 0).toBe(true);
			expect((combined & Attr.UNDERLINE) !== 0).toBe(true);
			expect((combined & Attr.ITALIC) !== 0).toBe(false);
		});
	});

	describe('createCell', () => {
		it('creates cell with default values', () => {
			const cell = createCell();
			expect(cell.char).toBe(DEFAULT_CHAR);
			expect(cell.fg).toBe(DEFAULT_FG);
			expect(cell.bg).toBe(DEFAULT_BG);
			expect(cell.attrs).toBe(Attr.NONE);
		});

		it('creates cell with custom values', () => {
			const cell = createCell('X', 0xff0000ff, 0x0000ffff, Attr.BOLD | Attr.UNDERLINE);
			expect(cell.char).toBe('X');
			expect(cell.fg).toBe(0xff0000ff);
			expect(cell.bg).toBe(0x0000ffff);
			expect(cell.attrs).toBe(Attr.BOLD | Attr.UNDERLINE);
		});

		it('handles Unicode characters', () => {
			const cell = createCell('\u2588'); // Full block character
			expect(cell.char).toBe('\u2588');
		});

		it('handles emoji', () => {
			const cell = createCell('\u{1F600}'); // Grinning face
			expect(cell.char).toBe('\u{1F600}');
		});
	});

	describe('cloneCell', () => {
		it('creates an independent copy', () => {
			const original = createCell('A', 0xff0000ff, 0x000000ff, Attr.BOLD);
			const copy = cloneCell(original);

			expect(copy).toEqual(original);
			expect(copy).not.toBe(original);

			// Modifying copy doesn't affect original
			copy.char = 'B';
			expect(original.char).toBe('A');
		});
	});

	describe('cellsEqual', () => {
		it('returns true for identical cells', () => {
			const a = createCell('X', 0xff0000ff, 0x000000ff, Attr.BOLD);
			const b = createCell('X', 0xff0000ff, 0x000000ff, Attr.BOLD);
			expect(cellsEqual(a, b)).toBe(true);
		});

		it('returns false for different characters', () => {
			const a = createCell('X');
			const b = createCell('Y');
			expect(cellsEqual(a, b)).toBe(false);
		});

		it('returns false for different foreground colors', () => {
			const a = createCell('X', 0xff0000ff);
			const b = createCell('X', 0x00ff00ff);
			expect(cellsEqual(a, b)).toBe(false);
		});

		it('returns false for different background colors', () => {
			const a = createCell('X', DEFAULT_FG, 0xff0000ff);
			const b = createCell('X', DEFAULT_FG, 0x0000ffff);
			expect(cellsEqual(a, b)).toBe(false);
		});

		it('returns false for different attributes', () => {
			const a = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD);
			const b = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.UNDERLINE);
			expect(cellsEqual(a, b)).toBe(false);
		});
	});

	describe('hasAttr', () => {
		it('returns true when attribute is set', () => {
			const cell = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD | Attr.UNDERLINE);
			expect(hasAttr(cell, Attr.BOLD)).toBe(true);
			expect(hasAttr(cell, Attr.UNDERLINE)).toBe(true);
		});

		it('returns false when attribute is not set', () => {
			const cell = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD);
			expect(hasAttr(cell, Attr.UNDERLINE)).toBe(false);
			expect(hasAttr(cell, Attr.ITALIC)).toBe(false);
		});

		it('returns false for no attributes', () => {
			const cell = createCell();
			expect(hasAttr(cell, Attr.BOLD)).toBe(false);
		});
	});

	describe('withAttr', () => {
		it('adds an attribute', () => {
			const cell = createCell('X');
			const bold = withAttr(cell, Attr.BOLD);
			expect(hasAttr(bold, Attr.BOLD)).toBe(true);
			expect(hasAttr(cell, Attr.BOLD)).toBe(false); // Original unchanged
		});

		it('preserves existing attributes', () => {
			const cell = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD);
			const boldUnderline = withAttr(cell, Attr.UNDERLINE);
			expect(hasAttr(boldUnderline, Attr.BOLD)).toBe(true);
			expect(hasAttr(boldUnderline, Attr.UNDERLINE)).toBe(true);
		});
	});

	describe('withoutAttr', () => {
		it('removes an attribute', () => {
			const cell = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD | Attr.UNDERLINE);
			const underlineOnly = withoutAttr(cell, Attr.BOLD);
			expect(hasAttr(underlineOnly, Attr.BOLD)).toBe(false);
			expect(hasAttr(underlineOnly, Attr.UNDERLINE)).toBe(true);
		});

		it('does nothing if attribute not set', () => {
			const cell = createCell('X', DEFAULT_FG, DEFAULT_BG, Attr.BOLD);
			const result = withoutAttr(cell, Attr.UNDERLINE);
			expect(result.attrs).toBe(Attr.BOLD);
		});
	});
});

describe('ScreenBuffer', () => {
	describe('createScreenBuffer', () => {
		it('creates buffer with correct dimensions', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(buffer.width).toBe(80);
			expect(buffer.height).toBe(24);
			expect(buffer.cells.length).toBe(80 * 24);
		});

		it('fills with default cells', () => {
			const buffer = createScreenBuffer(10, 10);
			const cell = buffer.cells[0];
			expect(cell?.char).toBe(DEFAULT_CHAR);
			expect(cell?.fg).toBe(DEFAULT_FG);
			expect(cell?.bg).toBe(DEFAULT_BG);
		});

		it('fills with custom default cell', () => {
			const defaultCell = createCell('#', 0xff0000ff, 0x0000ffff);
			const buffer = createScreenBuffer(10, 10, defaultCell);
			const cell = buffer.cells[0];
			expect(cell?.char).toBe('#');
			expect(cell?.fg).toBe(0xff0000ff);
			expect(cell?.bg).toBe(0x0000ffff);
		});

		it('throws for non-positive width', () => {
			expect(() => createScreenBuffer(0, 24)).toThrow('width must be positive');
			expect(() => createScreenBuffer(-1, 24)).toThrow('width must be positive');
		});

		it('throws for non-positive height', () => {
			expect(() => createScreenBuffer(80, 0)).toThrow('height must be positive');
			expect(() => createScreenBuffer(80, -1)).toThrow('height must be positive');
		});
	});

	describe('cellIndex', () => {
		it('calculates correct index', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(cellIndex(buffer, 0, 0)).toBe(0);
			expect(cellIndex(buffer, 1, 0)).toBe(1);
			expect(cellIndex(buffer, 0, 1)).toBe(80);
			expect(cellIndex(buffer, 10, 5)).toBe(5 * 80 + 10);
		});

		it('returns -1 for out of bounds', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(cellIndex(buffer, -1, 0)).toBe(-1);
			expect(cellIndex(buffer, 0, -1)).toBe(-1);
			expect(cellIndex(buffer, 80, 0)).toBe(-1);
			expect(cellIndex(buffer, 0, 24)).toBe(-1);
		});
	});

	describe('isInBounds', () => {
		it('returns true for valid coordinates', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(isInBounds(buffer, 0, 0)).toBe(true);
			expect(isInBounds(buffer, 79, 23)).toBe(true);
			expect(isInBounds(buffer, 40, 12)).toBe(true);
		});

		it('returns false for invalid coordinates', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(isInBounds(buffer, -1, 0)).toBe(false);
			expect(isInBounds(buffer, 0, -1)).toBe(false);
			expect(isInBounds(buffer, 80, 0)).toBe(false);
			expect(isInBounds(buffer, 0, 24)).toBe(false);
		});
	});

	describe('getCell', () => {
		it('returns cell at position', () => {
			const buffer = createScreenBuffer(80, 24);
			const cell = getCell(buffer, 10, 5);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe(DEFAULT_CHAR);
		});

		it('returns undefined for out of bounds', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(getCell(buffer, -1, 0)).toBeUndefined();
			expect(getCell(buffer, 80, 0)).toBeUndefined();
		});
	});

	describe('setCell', () => {
		it('sets cell at position', () => {
			const buffer = createScreenBuffer(80, 24);
			const cell = createCell('X', 0xff0000ff, 0x0000ffff);
			const result = setCell(buffer, 10, 5, cell);
			expect(result).toBe(true);

			const retrieved = getCell(buffer, 10, 5);
			expect(retrieved?.char).toBe('X');
			expect(retrieved?.fg).toBe(0xff0000ff);
		});

		it('returns false for out of bounds', () => {
			const buffer = createScreenBuffer(80, 24);
			const cell = createCell('X');
			expect(setCell(buffer, -1, 0, cell)).toBe(false);
			expect(setCell(buffer, 80, 0, cell)).toBe(false);
		});
	});

	describe('setChar', () => {
		it('sets character preserving other properties', () => {
			const buffer = createScreenBuffer(80, 24);
			setCell(buffer, 10, 5, createCell('A', 0xff0000ff, 0x0000ffff, Attr.BOLD));
			setChar(buffer, 10, 5, 'B');

			const cell = getCell(buffer, 10, 5);
			expect(cell?.char).toBe('B');
			expect(cell?.fg).toBe(0xff0000ff);
			expect(cell?.bg).toBe(0x0000ffff);
			expect(cell?.attrs).toBe(Attr.BOLD);
		});

		it('returns false for out of bounds', () => {
			const buffer = createScreenBuffer(80, 24);
			expect(setChar(buffer, -1, 0, 'X')).toBe(false);
		});
	});

	describe('clearBuffer', () => {
		it('clears to default cells', () => {
			const buffer = createScreenBuffer(10, 10);
			setCell(buffer, 5, 5, createCell('X', 0xff0000ff));
			clearBuffer(buffer);

			const cell = getCell(buffer, 5, 5);
			expect(cell?.char).toBe(DEFAULT_CHAR);
			expect(cell?.fg).toBe(DEFAULT_FG);
		});

		it('clears to custom cell', () => {
			const buffer = createScreenBuffer(10, 10);
			clearBuffer(buffer, createCell('#', 0x00ff00ff));

			const cell = getCell(buffer, 5, 5);
			expect(cell?.char).toBe('#');
			expect(cell?.fg).toBe(0x00ff00ff);
		});
	});

	describe('fillRect', () => {
		it('fills rectangular region', () => {
			const buffer = createScreenBuffer(20, 10);
			fillRect(buffer, 5, 2, 10, 5, createCell('X', 0xff0000ff));

			// Inside region
			expect(getCell(buffer, 5, 2)?.char).toBe('X');
			expect(getCell(buffer, 14, 6)?.char).toBe('X');

			// Outside region
			expect(getCell(buffer, 4, 2)?.char).toBe(DEFAULT_CHAR);
			expect(getCell(buffer, 15, 2)?.char).toBe(DEFAULT_CHAR);
		});

		it('clamps to buffer bounds', () => {
			const buffer = createScreenBuffer(10, 10);
			fillRect(buffer, -5, -5, 20, 20, createCell('X'));

			// All cells should be filled
			expect(getCell(buffer, 0, 0)?.char).toBe('X');
			expect(getCell(buffer, 9, 9)?.char).toBe('X');
		});
	});

	describe('resizeBuffer', () => {
		it('grows buffer preserving content', () => {
			const buffer = createScreenBuffer(10, 10);
			setCell(buffer, 5, 5, createCell('X', 0xff0000ff));

			const larger = resizeBuffer(buffer, 20, 20);
			expect(larger.width).toBe(20);
			expect(larger.height).toBe(20);
			expect(getCell(larger, 5, 5)?.char).toBe('X');
			expect(getCell(larger, 15, 15)?.char).toBe(DEFAULT_CHAR);
		});

		it('shrinks buffer preserving overlapping content', () => {
			const buffer = createScreenBuffer(20, 20);
			setCell(buffer, 5, 5, createCell('X'));
			setCell(buffer, 15, 15, createCell('Y'));

			const smaller = resizeBuffer(buffer, 10, 10);
			expect(smaller.width).toBe(10);
			expect(smaller.height).toBe(10);
			expect(getCell(smaller, 5, 5)?.char).toBe('X');
			expect(getCell(smaller, 9, 9)?.char).toBe(DEFAULT_CHAR);
		});

		it('fills new area with custom cell', () => {
			const buffer = createScreenBuffer(10, 10);
			const larger = resizeBuffer(buffer, 20, 20, createCell('#', 0x00ff00ff));
			expect(getCell(larger, 15, 15)?.char).toBe('#');
		});

		it('throws for non-positive dimensions', () => {
			const buffer = createScreenBuffer(10, 10);
			expect(() => resizeBuffer(buffer, 0, 10)).toThrow('width must be positive');
			expect(() => resizeBuffer(buffer, 10, 0)).toThrow('height must be positive');
		});
	});

	describe('writeString', () => {
		it('writes string to buffer', () => {
			const buffer = createScreenBuffer(80, 24);
			const written = writeString(buffer, 10, 5, 'Hello');

			expect(written).toBe(5);
			expect(getCell(buffer, 10, 5)?.char).toBe('H');
			expect(getCell(buffer, 11, 5)?.char).toBe('e');
			expect(getCell(buffer, 14, 5)?.char).toBe('o');
		});

		it('applies colors and attributes', () => {
			const buffer = createScreenBuffer(80, 24);
			writeString(buffer, 0, 0, 'Test', 0xff0000ff, 0x0000ffff, Attr.BOLD);

			const cell = getCell(buffer, 0, 0);
			expect(cell?.fg).toBe(0xff0000ff);
			expect(cell?.bg).toBe(0x0000ffff);
			expect(cell?.attrs).toBe(Attr.BOLD);
		});

		it('clips at buffer edge', () => {
			const buffer = createScreenBuffer(10, 10);
			const written = writeString(buffer, 8, 0, 'Hello');

			expect(written).toBe(2); // Only 'He' fits
			expect(getCell(buffer, 8, 0)?.char).toBe('H');
			expect(getCell(buffer, 9, 0)?.char).toBe('e');
		});

		it('handles negative start position', () => {
			const buffer = createScreenBuffer(10, 10);
			const written = writeString(buffer, -2, 0, 'Hello');

			expect(written).toBe(3); // 'llo' fits
			expect(getCell(buffer, 0, 0)?.char).toBe('l');
			expect(getCell(buffer, 1, 0)?.char).toBe('l');
			expect(getCell(buffer, 2, 0)?.char).toBe('o');
		});

		it('returns 0 for out of bounds row', () => {
			const buffer = createScreenBuffer(10, 10);
			expect(writeString(buffer, 0, -1, 'Test')).toBe(0);
			expect(writeString(buffer, 0, 10, 'Test')).toBe(0);
		});

		it('handles Unicode correctly', () => {
			const buffer = createScreenBuffer(80, 24);
			writeString(buffer, 0, 0, '\u{1F600}\u{1F601}'); // Two emoji

			expect(getCell(buffer, 0, 0)?.char).toBe('\u{1F600}');
			expect(getCell(buffer, 1, 0)?.char).toBe('\u{1F601}');
		});
	});

	describe('copyRegion', () => {
		it('copies region between buffers', () => {
			const src = createScreenBuffer(20, 20);
			const dst = createScreenBuffer(20, 20);

			fillRect(src, 0, 0, 5, 5, createCell('X', 0xff0000ff));
			copyRegion(src, dst, 0, 0, 10, 10, 5, 5);

			expect(getCell(dst, 10, 10)?.char).toBe('X');
			expect(getCell(dst, 14, 14)?.char).toBe('X');
			expect(getCell(dst, 9, 10)?.char).toBe(DEFAULT_CHAR);
		});

		it('handles partial overlap with source bounds', () => {
			const src = createScreenBuffer(10, 10);
			const dst = createScreenBuffer(20, 20);

			fillRect(src, 0, 0, 10, 10, createCell('X'));
			copyRegion(src, dst, 5, 5, 0, 0, 10, 10);

			// Only 5x5 region should be copied
			expect(getCell(dst, 0, 0)?.char).toBe('X');
			expect(getCell(dst, 4, 4)?.char).toBe('X');
			expect(getCell(dst, 5, 0)?.char).toBe(DEFAULT_CHAR);
		});
	});

	describe('diffBuffers', () => {
		it('returns empty array for identical buffers', () => {
			const a = createScreenBuffer(10, 10);
			const b = createScreenBuffer(10, 10);
			expect(diffBuffers(a, b)).toEqual([]);
		});

		it('detects changed cells', () => {
			const old = createScreenBuffer(10, 10);
			const current = createScreenBuffer(10, 10);
			setCell(current, 5, 5, createCell('X', 0xff0000ff));

			const diff = diffBuffers(old, current);
			expect(diff.length).toBe(1);
			expect(diff[0]?.x).toBe(5);
			expect(diff[0]?.y).toBe(5);
			expect(diff[0]?.cell.char).toBe('X');
		});

		it('detects multiple changes', () => {
			const old = createScreenBuffer(10, 10);
			const current = createScreenBuffer(10, 10);
			setCell(current, 0, 0, createCell('A'));
			setCell(current, 9, 9, createCell('B'));

			const diff = diffBuffers(old, current);
			expect(diff.length).toBe(2);
		});

		it('handles different sized buffers', () => {
			const old = createScreenBuffer(10, 10);
			const current = createScreenBuffer(15, 15);
			setCell(current, 12, 12, createCell('X'));

			const diff = diffBuffers(old, current);
			// Should include the new cell at (12, 12) plus other cells in expanded area
			const hasNewCell = diff.some((d) => d.x === 12 && d.y === 12 && d.cell.char === 'X');
			expect(hasNewCell).toBe(true);
		});
	});
});
