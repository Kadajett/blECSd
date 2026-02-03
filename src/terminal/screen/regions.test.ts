/**
 * Tests for screen region operations.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createCell, createScreenBuffer, getCell, type ScreenBufferData, setCell } from './cell';
import {
	blankLine,
	blankLines,
	clearRegion,
	clipToBuffer,
	copyRegionInBuffer,
	createRegion,
	deleteLines,
	fillRegion,
	insertLines,
	intersectRegions,
	isPointInRegion,
	isRegionEmpty,
	scrollRegionDown,
	scrollRegionUp,
	unionRegions,
} from './regions';

describe('regions', () => {
	let buffer: ScreenBufferData;

	beforeEach(() => {
		buffer = createScreenBuffer(10, 10);
	});

	describe('clearRegion', () => {
		it('clears a region with default colors', () => {
			// Fill buffer with X characters first
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell('X', 0xff0000ff, 0x00ff00ff));
				}
			}

			// Clear a 3x3 region at (2, 2)
			clearRegion(buffer, 2, 2, 3, 3);

			// Check cleared region
			for (let y = 2; y < 5; y++) {
				for (let x = 2; x < 5; x++) {
					const cell = getCell(buffer, x, y);
					expect(cell?.char).toBe(' ');
					expect(cell?.fg).toBe(0xffffffff); // default white
					expect(cell?.bg).toBe(0x000000ff); // default black
				}
			}

			// Check that surrounding cells are unchanged
			expect(getCell(buffer, 1, 2)?.char).toBe('X');
			expect(getCell(buffer, 5, 2)?.char).toBe('X');
		});

		it('clears with custom colors', () => {
			clearRegion(buffer, 0, 0, 5, 5, 0xff0000ff, 0x0000ffff);

			const cell = getCell(buffer, 2, 2);
			expect(cell?.char).toBe(' ');
			expect(cell?.fg).toBe(0xff0000ff);
			expect(cell?.bg).toBe(0x0000ffff);
		});

		it('handles out of bounds gracefully', () => {
			// Region extends past buffer
			clearRegion(buffer, 8, 8, 10, 10);

			// Should only clear valid cells
			expect(getCell(buffer, 8, 8)?.char).toBe(' ');
			expect(getCell(buffer, 9, 9)?.char).toBe(' ');
		});

		it('handles negative coordinates', () => {
			clearRegion(buffer, -2, -2, 5, 5);

			// Should clear cells within bounds
			expect(getCell(buffer, 0, 0)?.char).toBe(' ');
			expect(getCell(buffer, 2, 2)?.char).toBe(' ');
		});

		it('handles empty region', () => {
			// Fill first
			setCell(buffer, 0, 0, createCell('X'));

			// Empty width
			clearRegion(buffer, 0, 0, 0, 5);
			expect(getCell(buffer, 0, 0)?.char).toBe('X');

			// Empty height
			clearRegion(buffer, 0, 0, 5, 0);
			expect(getCell(buffer, 0, 0)?.char).toBe('X');
		});
	});

	describe('fillRegion', () => {
		it('fills a region with a specific cell', () => {
			const fillCell = createCell('#', 0x00ff00ff, 0xff0000ff);
			fillRegion(buffer, 1, 1, 3, 3, fillCell);

			for (let y = 1; y < 4; y++) {
				for (let x = 1; x < 4; x++) {
					const cell = getCell(buffer, x, y);
					expect(cell?.char).toBe('#');
					expect(cell?.fg).toBe(0x00ff00ff);
					expect(cell?.bg).toBe(0xff0000ff);
				}
			}
		});

		it('clamps to buffer bounds', () => {
			const fillCell = createCell('*');
			fillRegion(buffer, -5, -5, 20, 20, fillCell);

			// All cells should be filled
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					expect(getCell(buffer, x, y)?.char).toBe('*');
				}
			}
		});
	});

	describe('copyRegionInBuffer', () => {
		it('copies a region to a new location', () => {
			// Set up source pattern
			setCell(buffer, 0, 0, createCell('A'));
			setCell(buffer, 1, 0, createCell('B'));
			setCell(buffer, 0, 1, createCell('C'));
			setCell(buffer, 1, 1, createCell('D'));

			// Copy to (5, 5)
			copyRegionInBuffer(buffer, 0, 0, 5, 5, 2, 2);

			// Check destination
			expect(getCell(buffer, 5, 5)?.char).toBe('A');
			expect(getCell(buffer, 6, 5)?.char).toBe('B');
			expect(getCell(buffer, 5, 6)?.char).toBe('C');
			expect(getCell(buffer, 6, 6)?.char).toBe('D');

			// Source should be unchanged
			expect(getCell(buffer, 0, 0)?.char).toBe('A');
		});

		it('handles overlapping regions (scroll up)', () => {
			// Fill lines 1-4 with A, B, C, D
			for (let x = 0; x < 10; x++) {
				setCell(buffer, x, 1, createCell('A'));
				setCell(buffer, x, 2, createCell('B'));
				setCell(buffer, x, 3, createCell('C'));
				setCell(buffer, x, 4, createCell('D'));
			}

			// Copy lines 1-4 to 0-3 (scroll up simulation)
			copyRegionInBuffer(buffer, 0, 1, 0, 0, 10, 4);

			// Check results
			expect(getCell(buffer, 0, 0)?.char).toBe('A');
			expect(getCell(buffer, 0, 1)?.char).toBe('B');
			expect(getCell(buffer, 0, 2)?.char).toBe('C');
			expect(getCell(buffer, 0, 3)?.char).toBe('D');
		});

		it('handles overlapping regions (scroll down)', () => {
			// Fill lines 0-3 with A, B, C, D
			for (let x = 0; x < 10; x++) {
				setCell(buffer, x, 0, createCell('A'));
				setCell(buffer, x, 1, createCell('B'));
				setCell(buffer, x, 2, createCell('C'));
				setCell(buffer, x, 3, createCell('D'));
			}

			// Copy lines 0-3 to 1-4 (scroll down simulation)
			copyRegionInBuffer(buffer, 0, 0, 0, 1, 10, 4);

			// Check results
			expect(getCell(buffer, 0, 1)?.char).toBe('A');
			expect(getCell(buffer, 0, 2)?.char).toBe('B');
			expect(getCell(buffer, 0, 3)?.char).toBe('C');
			expect(getCell(buffer, 0, 4)?.char).toBe('D');
		});

		it('handles empty source region', () => {
			setCell(buffer, 0, 0, createCell('X'));
			copyRegionInBuffer(buffer, 0, 0, 5, 5, 0, 0);
			// Should not crash, destination unchanged
			expect(getCell(buffer, 5, 5)?.char).toBe(' ');
		});
	});

	describe('blankLine', () => {
		it('blanks a single line', () => {
			// Fill line 5 with X
			for (let x = 0; x < 10; x++) {
				setCell(buffer, x, 5, createCell('X', 0xff0000ff));
			}

			blankLine(buffer, 5);

			// All cells in line 5 should be blank
			for (let x = 0; x < 10; x++) {
				const cell = getCell(buffer, x, 5);
				expect(cell?.char).toBe(' ');
				expect(cell?.fg).toBe(0xffffffff);
			}
		});

		it('blanks with custom colors', () => {
			blankLine(buffer, 3, 0x00ff00ff, 0x0000ffff);

			const cell = getCell(buffer, 5, 3);
			expect(cell?.char).toBe(' ');
			expect(cell?.fg).toBe(0x00ff00ff);
			expect(cell?.bg).toBe(0x0000ffff);
		});

		it('handles out of bounds line numbers', () => {
			// Should not crash
			blankLine(buffer, -1);
			blankLine(buffer, 100);
		});
	});

	describe('blankLines', () => {
		it('blanks multiple lines', () => {
			// Fill all lines with X
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell('X'));
				}
			}

			blankLines(buffer, 3, 4); // Blank lines 3, 4, 5, 6

			// Lines 3-6 should be blank
			for (let y = 3; y < 7; y++) {
				expect(getCell(buffer, 0, y)?.char).toBe(' ');
			}

			// Lines 2 and 7 should be unchanged
			expect(getCell(buffer, 0, 2)?.char).toBe('X');
			expect(getCell(buffer, 0, 7)?.char).toBe('X');
		});

		it('clamps to buffer bounds', () => {
			blankLines(buffer, 8, 10); // Would go to line 18, but buffer is only 10 high
			// Should blank lines 8-9 without error
			expect(getCell(buffer, 0, 8)?.char).toBe(' ');
			expect(getCell(buffer, 0, 9)?.char).toBe(' ');
		});
	});

	describe('scrollRegionUp', () => {
		it('scrolls content up', () => {
			// Fill each line with its line number
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Scroll entire buffer up by 2 lines
			scrollRegionUp(buffer, 0, 0, 10, 10, 2);

			// Line 0 should now have what was line 2
			expect(getCell(buffer, 0, 0)?.char).toBe('2');
			expect(getCell(buffer, 0, 7)?.char).toBe('9');

			// Bottom 2 lines should be blank
			expect(getCell(buffer, 0, 8)?.char).toBe(' ');
			expect(getCell(buffer, 0, 9)?.char).toBe(' ');
		});

		it('scrolls within a sub-region', () => {
			// Fill with pattern
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Scroll only region (2, 3) to (7, 8) up by 1
			scrollRegionUp(buffer, 2, 3, 5, 5, 1);

			// Outside region should be unchanged
			expect(getCell(buffer, 0, 3)?.char).toBe('3');
			expect(getCell(buffer, 0, 4)?.char).toBe('4');

			// Inside region should be shifted
			expect(getCell(buffer, 3, 3)?.char).toBe('4'); // was line 4
			expect(getCell(buffer, 3, 6)?.char).toBe('7'); // was line 7
			expect(getCell(buffer, 3, 7)?.char).toBe(' '); // blank
		});

		it('handles scroll amount >= region height', () => {
			for (let x = 0; x < 10; x++) {
				setCell(buffer, x, 0, createCell('X'));
			}

			scrollRegionUp(buffer, 0, 0, 10, 5, 10);

			// Entire region should be cleared
			for (let y = 0; y < 5; y++) {
				expect(getCell(buffer, 0, y)?.char).toBe(' ');
			}
		});

		it('uses custom fill cell', () => {
			const fillCell = createCell('*', 0x00ff00ff);
			scrollRegionUp(buffer, 0, 0, 10, 10, 1, fillCell);

			// Bottom line should have custom fill
			expect(getCell(buffer, 0, 9)?.char).toBe('*');
			expect(getCell(buffer, 0, 9)?.fg).toBe(0x00ff00ff);
		});
	});

	describe('scrollRegionDown', () => {
		it('scrolls content down', () => {
			// Fill each line with its line number
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Scroll entire buffer down by 2 lines
			scrollRegionDown(buffer, 0, 0, 10, 10, 2);

			// Line 2 should now have what was line 0
			expect(getCell(buffer, 0, 2)?.char).toBe('0');
			expect(getCell(buffer, 0, 9)?.char).toBe('7');

			// Top 2 lines should be blank
			expect(getCell(buffer, 0, 0)?.char).toBe(' ');
			expect(getCell(buffer, 0, 1)?.char).toBe(' ');
		});

		it('scrolls within a sub-region', () => {
			// Fill with pattern
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Scroll only region (2, 3) to (7, 8) down by 1
			scrollRegionDown(buffer, 2, 3, 5, 5, 1);

			// Outside region should be unchanged
			expect(getCell(buffer, 0, 3)?.char).toBe('3');
			expect(getCell(buffer, 0, 4)?.char).toBe('4');

			// Inside region should be shifted
			expect(getCell(buffer, 3, 4)?.char).toBe('3'); // was line 3
			expect(getCell(buffer, 3, 7)?.char).toBe('6'); // was line 6
			expect(getCell(buffer, 3, 3)?.char).toBe(' '); // blank
		});

		it('handles zero or negative scroll amount', () => {
			setCell(buffer, 0, 0, createCell('X'));
			scrollRegionDown(buffer, 0, 0, 10, 10, 0);
			expect(getCell(buffer, 0, 0)?.char).toBe('X'); // unchanged

			scrollRegionDown(buffer, 0, 0, 10, 10, -1);
			expect(getCell(buffer, 0, 0)?.char).toBe('X'); // unchanged
		});
	});

	describe('insertLines', () => {
		it('inserts blank lines pushing content down', () => {
			// Fill with line numbers
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Insert 2 lines at line 3
			insertLines(buffer, 3, 2);

			// Lines 0-2 unchanged
			expect(getCell(buffer, 0, 0)?.char).toBe('0');
			expect(getCell(buffer, 0, 2)?.char).toBe('2');

			// Lines 3-4 should be blank (inserted)
			expect(getCell(buffer, 0, 3)?.char).toBe(' ');
			expect(getCell(buffer, 0, 4)?.char).toBe(' ');

			// Lines 5+ should have old content
			expect(getCell(buffer, 0, 5)?.char).toBe('3');
			expect(getCell(buffer, 0, 9)?.char).toBe('7');
			// Lines 8-9 (old content) are pushed out
		});

		it('respects region bottom', () => {
			// Fill with line numbers
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Insert 1 line at line 3, but only within region ending at line 7
			insertLines(buffer, 3, 1, 7);

			// Line 3 should be blank
			expect(getCell(buffer, 0, 3)?.char).toBe(' ');
			// Line 4 should have old line 3
			expect(getCell(buffer, 0, 4)?.char).toBe('3');
			// Line 6 should have old line 5
			expect(getCell(buffer, 0, 6)?.char).toBe('5');
			// Line 7 onwards should be unchanged (outside region)
			expect(getCell(buffer, 0, 7)?.char).toBe('7');
		});
	});

	describe('deleteLines', () => {
		it('deletes lines pulling content up', () => {
			// Fill with line numbers
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Delete 2 lines at line 3
			deleteLines(buffer, 3, 2);

			// Lines 0-2 unchanged
			expect(getCell(buffer, 0, 0)?.char).toBe('0');
			expect(getCell(buffer, 0, 2)?.char).toBe('2');

			// Lines 3+ should have old lines 5+
			expect(getCell(buffer, 0, 3)?.char).toBe('5');
			expect(getCell(buffer, 0, 7)?.char).toBe('9');

			// Bottom 2 lines should be blank
			expect(getCell(buffer, 0, 8)?.char).toBe(' ');
			expect(getCell(buffer, 0, 9)?.char).toBe(' ');
		});

		it('respects region bottom', () => {
			// Fill with line numbers
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setCell(buffer, x, y, createCell(String(y)));
				}
			}

			// Delete 1 line at line 3, but only within region ending at line 7
			deleteLines(buffer, 3, 1, 7);

			// Line 3 should have old line 4
			expect(getCell(buffer, 0, 3)?.char).toBe('4');
			// Line 6 should be blank
			expect(getCell(buffer, 0, 6)?.char).toBe(' ');
			// Line 7 onwards should be unchanged (outside region)
			expect(getCell(buffer, 0, 7)?.char).toBe('7');
		});
	});

	describe('intersectRegions', () => {
		it('returns intersection of overlapping regions', () => {
			const a = { x: 0, y: 0, width: 20, height: 10 };
			const b = { x: 10, y: 5, width: 20, height: 10 };

			const result = intersectRegions(a, b);

			expect(result).toEqual({ x: 10, y: 5, width: 10, height: 5 });
		});

		it('returns null for non-overlapping regions', () => {
			const a = { x: 0, y: 0, width: 10, height: 10 };
			const b = { x: 20, y: 0, width: 10, height: 10 };

			const result = intersectRegions(a, b);

			expect(result).toBeNull();
		});

		it('handles adjacent regions (no overlap)', () => {
			const a = { x: 0, y: 0, width: 10, height: 10 };
			const b = { x: 10, y: 0, width: 10, height: 10 };

			const result = intersectRegions(a, b);

			expect(result).toBeNull();
		});
	});

	describe('unionRegions', () => {
		it('returns bounding box of two regions', () => {
			const a = { x: 0, y: 0, width: 10, height: 10 };
			const b = { x: 15, y: 5, width: 10, height: 10 };

			const result = unionRegions(a, b);

			expect(result).toEqual({ x: 0, y: 0, width: 25, height: 15 });
		});

		it('handles nested regions', () => {
			const a = { x: 0, y: 0, width: 100, height: 100 };
			const b = { x: 10, y: 10, width: 10, height: 10 };

			const result = unionRegions(a, b);

			expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
		});
	});

	describe('isPointInRegion', () => {
		const region = { x: 10, y: 5, width: 20, height: 10 };

		it('returns true for point inside', () => {
			expect(isPointInRegion(region, 15, 8)).toBe(true);
			expect(isPointInRegion(region, 10, 5)).toBe(true); // top-left corner
			expect(isPointInRegion(region, 29, 14)).toBe(true); // bottom-right inner
		});

		it('returns false for point outside', () => {
			expect(isPointInRegion(region, 5, 8)).toBe(false); // left of region
			expect(isPointInRegion(region, 15, 2)).toBe(false); // above region
			expect(isPointInRegion(region, 30, 8)).toBe(false); // right edge (exclusive)
			expect(isPointInRegion(region, 15, 15)).toBe(false); // bottom edge (exclusive)
		});
	});

	describe('isRegionEmpty', () => {
		it('returns true for zero dimensions', () => {
			expect(isRegionEmpty({ x: 0, y: 0, width: 0, height: 10 })).toBe(true);
			expect(isRegionEmpty({ x: 0, y: 0, width: 10, height: 0 })).toBe(true);
			expect(isRegionEmpty({ x: 0, y: 0, width: 0, height: 0 })).toBe(true);
		});

		it('returns true for negative dimensions', () => {
			expect(isRegionEmpty({ x: 0, y: 0, width: -5, height: 10 })).toBe(true);
			expect(isRegionEmpty({ x: 0, y: 0, width: 10, height: -5 })).toBe(true);
		});

		it('returns false for positive dimensions', () => {
			expect(isRegionEmpty({ x: 0, y: 0, width: 10, height: 10 })).toBe(false);
		});
	});

	describe('createRegion', () => {
		it('creates a region bounds object', () => {
			const region = createRegion(10, 5, 20, 15);
			expect(region).toEqual({ x: 10, y: 5, width: 20, height: 15 });
		});
	});

	describe('clipToBuffer', () => {
		it('clips region to buffer bounds', () => {
			const region = { x: -5, y: -5, width: 100, height: 100 };
			const clipped = clipToBuffer(buffer, region);

			expect(clipped).toEqual({ x: 0, y: 0, width: 10, height: 10 });
		});

		it('handles region entirely within buffer', () => {
			const region = { x: 2, y: 2, width: 5, height: 5 };
			const clipped = clipToBuffer(buffer, region);

			expect(clipped).toEqual({ x: 2, y: 2, width: 5, height: 5 });
		});

		it('handles region entirely outside buffer', () => {
			const region = { x: 50, y: 50, width: 10, height: 10 };
			const clipped = clipToBuffer(buffer, region);

			expect(clipped.width).toBe(0);
			expect(clipped.height).toBe(0);
		});
	});
});
