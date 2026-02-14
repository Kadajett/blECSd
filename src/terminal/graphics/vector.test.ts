/**
 * Tests for vector graphics primitives with braille rendering.
 */

import { describe, expect, it } from 'vitest';
import {
	canvasToCells,
	canvasToString,
	cellToDot,
	clearBrailleCanvas,
	clearDot,
	createBrailleCanvas,
	dotToCell,
	drawArc,
	drawBezier,
	drawCircle,
	drawEllipse,
	drawLine,
	drawRect,
	fillCircle,
	fillRect,
	getDot,
	setCellColor,
	setDot,
} from './vector';

// =============================================================================
// CANVAS CREATION
// =============================================================================

describe('createBrailleCanvas', () => {
	it('creates a canvas with correct dimensions', () => {
		const canvas = createBrailleCanvas(40, 20);

		expect(canvas.widthCells).toBe(40);
		expect(canvas.heightCells).toBe(20);
		expect(canvas.widthDots).toBe(80); // 40 * 2
		expect(canvas.heightDots).toBe(80); // 20 * 4
	});

	it('creates buffers of correct size', () => {
		const canvas = createBrailleCanvas(10, 10);

		const totalDots = 20 * 40; // 10*2 * 10*4
		const expectedBytes = Math.ceil(totalDots / 8);
		const totalCells = 100; // 10 * 10

		expect(canvas.dots.length).toBe(expectedBytes);
		expect(canvas.colors.length).toBe(totalCells);
	});

	it('initializes with all dots cleared', () => {
		const canvas = createBrailleCanvas(10, 10);

		for (let y = 0; y < canvas.heightDots; y++) {
			for (let x = 0; x < canvas.widthDots; x++) {
				expect(getDot(canvas, x, y)).toBe(false);
			}
		}
	});
});

describe('clearBrailleCanvas', () => {
	it('clears all dots', () => {
		const canvas = createBrailleCanvas(10, 10);
		setDot(canvas, 5, 5);
		setDot(canvas, 10, 10);

		clearBrailleCanvas(canvas);

		expect(getDot(canvas, 5, 5)).toBe(false);
		expect(getDot(canvas, 10, 10)).toBe(false);
	});

	it('clears all colors', () => {
		const canvas = createBrailleCanvas(10, 10);
		setCellColor(canvas, 5, 5, 0xff0000);

		clearBrailleCanvas(canvas);

		expect(canvas.colors[55]).toBe(0);
	});
});

// =============================================================================
// DOT-LEVEL OPERATIONS
// =============================================================================

describe('setDot', () => {
	it('sets a dot at valid coordinates', () => {
		const canvas = createBrailleCanvas(10, 10);

		setDot(canvas, 5, 5);

		expect(getDot(canvas, 5, 5)).toBe(true);
	});

	it('ignores coordinates outside canvas bounds', () => {
		const canvas = createBrailleCanvas(10, 10);

		setDot(canvas, -1, 5);
		setDot(canvas, 5, -1);
		setDot(canvas, 100, 5);
		setDot(canvas, 5, 100);

		// Should not crash
		expect(true).toBe(true);
	});

	it('sets multiple dots independently', () => {
		const canvas = createBrailleCanvas(10, 10);

		setDot(canvas, 0, 0);
		setDot(canvas, 1, 0);
		setDot(canvas, 0, 1);

		expect(getDot(canvas, 0, 0)).toBe(true);
		expect(getDot(canvas, 1, 0)).toBe(true);
		expect(getDot(canvas, 0, 1)).toBe(true);
		expect(getDot(canvas, 1, 1)).toBe(false);
	});
});

describe('clearDot', () => {
	it('clears a previously set dot', () => {
		const canvas = createBrailleCanvas(10, 10);

		setDot(canvas, 5, 5);
		expect(getDot(canvas, 5, 5)).toBe(true);

		clearDot(canvas, 5, 5);
		expect(getDot(canvas, 5, 5)).toBe(false);
	});

	it('handles clearing already-clear dots', () => {
		const canvas = createBrailleCanvas(10, 10);

		clearDot(canvas, 5, 5);

		expect(getDot(canvas, 5, 5)).toBe(false);
	});

	it('ignores out-of-bounds coordinates', () => {
		const canvas = createBrailleCanvas(10, 10);

		clearDot(canvas, -1, 5);
		clearDot(canvas, 100, 100);

		// Should not crash
		expect(true).toBe(true);
	});
});

describe('getDot', () => {
	it('returns false for unset dots', () => {
		const canvas = createBrailleCanvas(10, 10);

		expect(getDot(canvas, 5, 5)).toBe(false);
	});

	it('returns true for set dots', () => {
		const canvas = createBrailleCanvas(10, 10);

		setDot(canvas, 5, 5);

		expect(getDot(canvas, 5, 5)).toBe(true);
	});

	it('returns false for out-of-bounds coordinates', () => {
		const canvas = createBrailleCanvas(10, 10);

		expect(getDot(canvas, -1, 5)).toBe(false);
		expect(getDot(canvas, 100, 100)).toBe(false);
	});
});

describe('setCellColor', () => {
	it('sets color for a valid cell', () => {
		const canvas = createBrailleCanvas(10, 10);

		setCellColor(canvas, 5, 5, 0xff0000);

		const cellIndex = 5 * 10 + 5;
		expect(canvas.colors[cellIndex]).toBe(0xff0000);
	});

	it('ignores out-of-bounds cell coordinates', () => {
		const canvas = createBrailleCanvas(10, 10);

		setCellColor(canvas, -1, 5, 0xff0000);
		setCellColor(canvas, 100, 100, 0xff0000);

		// Should not crash
		expect(true).toBe(true);
	});
});

// =============================================================================
// DRAWING PRIMITIVES - LINES
// =============================================================================

describe('drawLine', () => {
	it('draws horizontal line correctly', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawLine(canvas, 0, 5, 10, 5);

		for (let x = 0; x <= 10; x++) {
			expect(getDot(canvas, x, 5)).toBe(true);
		}
		expect(getDot(canvas, 0, 4)).toBe(false);
		expect(getDot(canvas, 0, 6)).toBe(false);
	});

	it('draws vertical line correctly', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawLine(canvas, 5, 0, 5, 10);

		for (let y = 0; y <= 10; y++) {
			expect(getDot(canvas, 5, y)).toBe(true);
		}
		expect(getDot(canvas, 4, 0)).toBe(false);
		expect(getDot(canvas, 6, 0)).toBe(false);
	});

	it('draws diagonal line (45 degrees)', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawLine(canvas, 0, 0, 10, 10);

		// Check some points along the diagonal
		expect(getDot(canvas, 0, 0)).toBe(true);
		expect(getDot(canvas, 5, 5)).toBe(true);
		expect(getDot(canvas, 10, 10)).toBe(true);
	});

	it('draws line from right to left', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawLine(canvas, 10, 5, 0, 5);

		for (let x = 0; x <= 10; x++) {
			expect(getDot(canvas, x, 5)).toBe(true);
		}
	});

	it('applies color to affected cells', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawLine(canvas, 0, 0, 4, 0, 0xff0000);

		// Cell (0, 0) contains dots 0-1, 0
		// Cell (1, 0) contains dots 2-3, 0
		// Cell (2, 0) contains dots 4, 0
		const cellIndex0 = 0;
		const cellIndex1 = 1;
		const cellIndex2 = 2;

		expect(canvas.colors[cellIndex0]).toBe(0xff0000);
		expect(canvas.colors[cellIndex1]).toBe(0xff0000);
		expect(canvas.colors[cellIndex2]).toBe(0xff0000);
	});
});

// =============================================================================
// DRAWING PRIMITIVES - RECTANGLES
// =============================================================================

describe('drawRect', () => {
	it('draws rectangle outline', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawRect(canvas, 5, 5, 10, 8);

		// Check corners
		expect(getDot(canvas, 5, 5)).toBe(true); // Top-left
		expect(getDot(canvas, 14, 5)).toBe(true); // Top-right
		expect(getDot(canvas, 5, 12)).toBe(true); // Bottom-left
		expect(getDot(canvas, 14, 12)).toBe(true); // Bottom-right

		// Check interior is empty
		expect(getDot(canvas, 10, 10)).toBe(false);
	});

	it('handles zero width gracefully', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawRect(canvas, 5, 5, 0, 10);

		// Should not crash and should not draw anything
		expect(getDot(canvas, 5, 5)).toBe(false);
	});

	it('handles zero height gracefully', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawRect(canvas, 5, 5, 10, 0);

		// Should not crash and should not draw anything
		expect(getDot(canvas, 5, 5)).toBe(false);
	});
});

describe('fillRect', () => {
	it('fills rectangle completely', () => {
		const canvas = createBrailleCanvas(10, 10);

		fillRect(canvas, 5, 5, 4, 4);

		// Check all dots in rectangle are set
		for (let y = 5; y < 9; y++) {
			for (let x = 5; x < 9; x++) {
				expect(getDot(canvas, x, y)).toBe(true);
			}
		}

		// Check dots outside are not set
		expect(getDot(canvas, 4, 5)).toBe(false);
		expect(getDot(canvas, 9, 5)).toBe(false);
		expect(getDot(canvas, 5, 4)).toBe(false);
		expect(getDot(canvas, 5, 9)).toBe(false);
	});

	it('applies color to all affected cells', () => {
		const canvas = createBrailleCanvas(10, 10);

		fillRect(canvas, 0, 0, 2, 4, 0x00ff00);

		// Dots 0-1, 0-3 span cell (0, 0)
		const cellIndex = 0;
		expect(canvas.colors[cellIndex]).toBe(0x00ff00);
	});
});

// =============================================================================
// DRAWING PRIMITIVES - CIRCLES
// =============================================================================

describe('drawCircle', () => {
	it('draws circle with correct symmetry', () => {
		const canvas = createBrailleCanvas(30, 30); // 60x120 dots
		const cx = 30;
		const cy = 30;
		const r = 10;

		drawCircle(canvas, cx, cy, r);

		// Check cardinal points (approximately - may be off by 1 due to rounding)
		const east = getDot(canvas, cx + r, cy) || getDot(canvas, cx + r - 1, cy);
		const west = getDot(canvas, cx - r, cy) || getDot(canvas, cx - r + 1, cy);
		const south = getDot(canvas, cx, cy + r) || getDot(canvas, cx, cy + r - 1);
		const north = getDot(canvas, cx, cy - r) || getDot(canvas, cx, cy - r + 1);

		expect(east).toBe(true); // East
		expect(west).toBe(true); // West
		expect(south).toBe(true); // South
		expect(north).toBe(true); // North
	});

	it('draws circle that does not fill interior', () => {
		const canvas = createBrailleCanvas(20, 20);

		drawCircle(canvas, 20, 20, 10);

		// Center should be empty
		expect(getDot(canvas, 20, 20)).toBe(false);
	});

	it('handles zero radius gracefully', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawCircle(canvas, 20, 20, 0);

		// Should not crash
		expect(true).toBe(true);
	});
});

describe('fillCircle', () => {
	it('fills circle completely', () => {
		const canvas = createBrailleCanvas(30, 30); // 60x120 dots
		const cx = 30;
		const cy = 30;
		const r = 5;

		fillCircle(canvas, cx, cy, r);

		// Center should be filled
		expect(getDot(canvas, cx, cy)).toBe(true);

		// Points on radius should be filled (or very close due to rounding)
		const east = getDot(canvas, cx + r, cy) || getDot(canvas, cx + r - 1, cy);
		const west = getDot(canvas, cx - r, cy) || getDot(canvas, cx - r + 1, cy);

		expect(east).toBe(true);
		expect(west).toBe(true);
	});

	it('does not set dots outside radius', () => {
		const canvas = createBrailleCanvas(30, 30);
		const cx = 30;
		const cy = 30;
		const r = 5;

		fillCircle(canvas, cx, cy, r);

		// Points well outside radius should not be set
		expect(getDot(canvas, cx + r + 5, cy)).toBe(false);
		expect(getDot(canvas, cx, cy + r + 5)).toBe(false);
	});
});

// =============================================================================
// DRAWING PRIMITIVES - ARCS
// =============================================================================

describe('drawArc', () => {
	it('draws quarter circle arc', () => {
		const canvas = createBrailleCanvas(30, 30); // 60x120 dots
		const cx = 30;
		const cy = 30;
		const r = 10;

		// Draw top-right quadrant (0 to π/2)
		drawArc(canvas, cx, cy, r, 0, Math.PI / 2);

		// Start point (rightmost) - allow for rounding
		const startX = cx + r;
		const start = getDot(canvas, startX, cy) || getDot(canvas, startX - 1, cy);
		expect(start).toBe(true);

		// End point (bottom) - allow for rounding
		const endY = cy + r;
		const end = getDot(canvas, cx, endY) || getDot(canvas, cx, endY - 1);
		expect(end).toBe(true);

		// Point in arc (approx 45 degrees)
		const x45 = cx + Math.round(r * Math.cos(Math.PI / 4));
		const y45 = cy + Math.round(r * Math.sin(Math.PI / 4));
		const mid =
			getDot(canvas, x45, y45) ||
			getDot(canvas, x45 - 1, y45) ||
			getDot(canvas, x45, y45 - 1) ||
			getDot(canvas, x45 + 1, y45) ||
			getDot(canvas, x45, y45 + 1);
		expect(mid).toBe(true);
	});

	it('handles zero radius gracefully', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawArc(canvas, 20, 20, 0, 0, Math.PI);

		// Should not crash
		expect(true).toBe(true);
	});
});

// =============================================================================
// DRAWING PRIMITIVES - BEZIER
// =============================================================================

describe('drawBezier', () => {
	it('draws cubic bezier curve', () => {
		const canvas = createBrailleCanvas(40, 20);

		drawBezier(canvas, [
			[0, 0],
			[20, 40],
			[60, 40],
			[79, 0],
		]);

		// Start and end points should be set
		expect(getDot(canvas, 0, 0)).toBe(true);
		expect(getDot(canvas, 79, 0)).toBe(true);
	});

	it('requires exactly 4 points', () => {
		const canvas = createBrailleCanvas(40, 20);

		// Should not draw with wrong number of points
		drawBezier(canvas, [
			[0, 0],
			[10, 10],
		]);

		expect(getDot(canvas, 0, 0)).toBe(false);
	});

	it('connects curve smoothly without gaps', () => {
		const canvas = createBrailleCanvas(40, 20);

		drawBezier(canvas, [
			[0, 0],
			[10, 20],
			[30, 20],
			[40, 0],
		]);

		// The curve should have many dots set (continuous)
		let dotCount = 0;
		for (let y = 0; y < canvas.heightDots; y++) {
			for (let x = 0; x < canvas.widthDots; x++) {
				if (getDot(canvas, x, y)) {
					dotCount++;
				}
			}
		}

		expect(dotCount).toBeGreaterThan(10); // Should have drawn a visible curve
	});
});

// =============================================================================
// DRAWING PRIMITIVES - ELLIPSE
// =============================================================================

describe('drawEllipse', () => {
	it('draws ellipse with correct radii', () => {
		const canvas = createBrailleCanvas(40, 20);
		const cx = 40;
		const cy = 40;
		const rx = 20;
		const ry = 10;

		drawEllipse(canvas, cx, cy, rx, ry);

		// Check cardinal points
		expect(getDot(canvas, cx + rx, cy)).toBe(true); // East
		expect(getDot(canvas, cx - rx, cy)).toBe(true); // West
		expect(getDot(canvas, cx, cy + ry)).toBe(true); // South
		expect(getDot(canvas, cx, cy - ry)).toBe(true); // North
	});

	it('handles zero radius gracefully', () => {
		const canvas = createBrailleCanvas(10, 10);

		drawEllipse(canvas, 20, 20, 0, 10);
		drawEllipse(canvas, 20, 20, 10, 0);

		// Should not crash
		expect(true).toBe(true);
	});
});

// =============================================================================
// OUTPUT CONVERSION
// =============================================================================

describe('canvasToString', () => {
	it('produces valid braille characters', () => {
		const canvas = createBrailleCanvas(2, 2);

		setDot(canvas, 0, 0); // Top-left dot of first cell

		const output = canvasToString(canvas);

		// Should contain a braille character
		expect(output).toMatch(/[\u2800-\u28FF]/);
	});

	it('produces correct braille pattern for specific dots', () => {
		const canvas = createBrailleCanvas(1, 1);

		// Set dot at position (0, 0) - should be bit 0x01
		setDot(canvas, 0, 0);

		const cells = canvasToCells(canvas);
		const char = cells[0]?.[0]?.char;

		expect(char).toBe(String.fromCharCode(0x2800 + 0x01));
	});

	it('produces multiline output for multi-row canvas', () => {
		const canvas = createBrailleCanvas(2, 3);

		const output = canvasToString(canvas);
		const lines = output.split('\n');

		expect(lines.length).toBe(3); // 3 rows
	});

	it('includes ANSI color codes when colors are set', () => {
		const canvas = createBrailleCanvas(2, 2);

		setDot(canvas, 0, 0);
		setCellColor(canvas, 0, 0, 0xff0000);

		const output = canvasToString(canvas);

		// Should contain ANSI 24-bit color code
		expect(output).toContain('\x1b[38;2;255;0;0m');
	});
});

describe('canvasToCells', () => {
	it('returns correct grid dimensions', () => {
		const canvas = createBrailleCanvas(10, 5);

		const cells = canvasToCells(canvas);

		expect(cells.length).toBe(5); // 5 rows
		expect(cells[0]?.length).toBe(10); // 10 columns
	});

	it('produces cells with correct braille characters', () => {
		const canvas = createBrailleCanvas(2, 2);

		setDot(canvas, 0, 0); // First cell, top-left dot

		const cells = canvasToCells(canvas);
		const cell = cells[0]?.[0];

		expect(cell?.char).toBe(String.fromCharCode(0x2800 + 0x01));
		expect(cell?.fg).toBe(0);
	});

	it('includes color information', () => {
		const canvas = createBrailleCanvas(2, 2);

		setDot(canvas, 0, 0);
		setCellColor(canvas, 0, 0, 0x00ff00);

		const cells = canvasToCells(canvas);
		const cell = cells[0]?.[0];

		expect(cell?.fg).toBe(0x00ff00);
	});
});

// =============================================================================
// COORDINATE HELPERS
// =============================================================================

describe('dotToCell', () => {
	it('converts dot coordinates to cell coordinates', () => {
		expect(dotToCell(0, 0)).toEqual({ cellX: 0, cellY: 0 });
		expect(dotToCell(1, 0)).toEqual({ cellX: 0, cellY: 0 }); // Still in first cell
		expect(dotToCell(2, 0)).toEqual({ cellX: 1, cellY: 0 }); // Second cell
		expect(dotToCell(0, 4)).toEqual({ cellX: 0, cellY: 1 }); // Second row
	});

	it('handles large coordinates', () => {
		expect(dotToCell(100, 200)).toEqual({ cellX: 50, cellY: 50 });
	});
});

describe('cellToDot', () => {
	it('converts cell coordinates to dot coordinates', () => {
		expect(cellToDot(0, 0)).toEqual({ dotX: 0, dotY: 0 });
		expect(cellToDot(1, 0)).toEqual({ dotX: 2, dotY: 0 });
		expect(cellToDot(0, 1)).toEqual({ dotX: 0, dotY: 4 });
		expect(cellToDot(5, 5)).toEqual({ dotX: 10, dotY: 20 });
	});
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration: Complex drawing', () => {
	it('can draw multiple shapes on same canvas', () => {
		const canvas = createBrailleCanvas(40, 20);

		// Draw a rectangle
		drawRect(canvas, 10, 10, 20, 20, 0xff0000);

		// Draw a circle
		drawCircle(canvas, 40, 40, 15, 0x00ff00);

		// Draw a line
		drawLine(canvas, 0, 0, 79, 79, 0x0000ff);

		// Convert to string (should not crash)
		const output = canvasToString(canvas);
		expect(output.length).toBeGreaterThan(0);
	});

	it('handles overlapping shapes correctly', () => {
		const canvas = createBrailleCanvas(20, 20);

		// Draw overlapping circles
		fillCircle(canvas, 20, 20, 10, 0xff0000);
		fillCircle(canvas, 30, 20, 10, 0x00ff00);

		// Overlap point should have second color
		const { cellX, cellY } = dotToCell(25, 20);
		const cellIndex = cellY * canvas.widthCells + cellX;
		expect(canvas.colors[cellIndex]).toBe(0x00ff00);
	});
});

describe('Integration: Braille character correctness', () => {
	it('produces correct braille pattern for all 8 dots', () => {
		const canvas = createBrailleCanvas(1, 1);

		// Set all 8 dots in a cell
		setDot(canvas, 0, 0); // 0x01
		setDot(canvas, 1, 0); // 0x08
		setDot(canvas, 0, 1); // 0x02
		setDot(canvas, 1, 1); // 0x10
		setDot(canvas, 0, 2); // 0x04
		setDot(canvas, 1, 2); // 0x20
		setDot(canvas, 0, 3); // 0x40
		setDot(canvas, 1, 3); // 0x80

		const cells = canvasToCells(canvas);
		const char = cells[0]?.[0]?.char;

		// All dots set = 0xFF pattern
		expect(char).toBe(String.fromCharCode(0x2800 + 0xff));
	});

	it('produces empty braille for empty cell', () => {
		const canvas = createBrailleCanvas(1, 1);

		const cells = canvasToCells(canvas);
		const char = cells[0]?.[0]?.char;

		// Empty braille character
		expect(char).toBe(String.fromCharCode(0x2800));
	});
});
