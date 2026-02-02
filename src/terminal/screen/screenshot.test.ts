/**
 * Tests for Screenshot Capture System
 */

import { describe, expect, it } from 'vitest';
import { Attr, createCell, createScreenBuffer, setCell } from './cell';
import {
	captureRegion,
	captureRow,
	captureScreen,
	countNonEmptyCells,
	createEmptyScreenshot,
	diffScreenshots,
	extractRegion,
	getScreenshotCell,
	getScreenshotColumn,
	getScreenshotRow,
	isScreenshotEmpty,
	screenshotFromJson,
	screenshotsEqual,
	screenshotToAnsi,
	screenshotToJson,
	screenshotToText,
} from './screenshot';

describe('Screenshot Capture', () => {
	describe('captureScreen', () => {
		it('captures entire buffer', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 0, 0, createCell('A'));
			setCell(buffer, 9, 4, createCell('Z'));

			const screenshot = captureScreen(buffer);

			expect(screenshot.width).toBe(10);
			expect(screenshot.height).toBe(5);
			expect(screenshot.offsetX).toBe(0);
			expect(screenshot.offsetY).toBe(0);
			expect(screenshot.cells[0]?.[0]?.char).toBe('A');
			expect(screenshot.cells[4]?.[9]?.char).toBe('Z');
		});

		it('includes timestamp', () => {
			const buffer = createScreenBuffer(10, 5);
			const before = Date.now();
			const screenshot = captureScreen(buffer);
			const after = Date.now();

			expect(screenshot.timestamp).toBeGreaterThanOrEqual(before);
			expect(screenshot.timestamp).toBeLessThanOrEqual(after);
		});

		it('uses custom timestamp when provided', () => {
			const buffer = createScreenBuffer(10, 5);
			const screenshot = captureScreen(buffer, { timestamp: 12345 });

			expect(screenshot.timestamp).toBe(12345);
		});

		it('captures colors and attributes', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff, 0x00ff00ff, Attr.BOLD | Attr.UNDERLINE));

			const screenshot = captureScreen(buffer);
			const cell = screenshot.cells[0]?.[0];

			expect(cell?.fg).toBe(0xff0000ff);
			expect(cell?.bg).toBe(0x00ff00ff);
			expect(cell?.attrs).toBe(Attr.BOLD | Attr.UNDERLINE);
		});

		it('strips attributes when includeAttributes is false', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff, 0x00ff00ff, Attr.BOLD));

			const screenshot = captureScreen(buffer, { includeAttributes: false });
			const cell = screenshot.cells[0]?.[0];

			expect(cell?.attrs).toBe(Attr.NONE);
			expect(cell?.fg).toBe(0xff0000ff); // Colors preserved
		});

		it('strips colors when includeColors is false', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff, 0x00ff00ff, Attr.BOLD));

			const screenshot = captureScreen(buffer, { includeColors: false });
			const cell = screenshot.cells[0]?.[0];

			expect(cell?.fg).toBe(0xffffffff); // Default white
			expect(cell?.bg).toBe(0x000000ff); // Default black
			expect(cell?.attrs).toBe(Attr.BOLD); // Attrs preserved
		});
	});

	describe('captureRegion', () => {
		it('captures specified region', () => {
			const buffer = createScreenBuffer(20, 10);
			setCell(buffer, 5, 3, createCell('A'));
			setCell(buffer, 14, 7, createCell('Z'));

			const screenshot = captureRegion(buffer, 5, 3, 10, 5);

			expect(screenshot.width).toBe(10);
			expect(screenshot.height).toBe(5);
			expect(screenshot.offsetX).toBe(5);
			expect(screenshot.offsetY).toBe(3);
			expect(screenshot.cells[0]?.[0]?.char).toBe('A');
			expect(screenshot.cells[4]?.[9]?.char).toBe('Z');
		});

		it('clamps to buffer bounds', () => {
			const buffer = createScreenBuffer(10, 5);

			const screenshot = captureRegion(buffer, -5, -5, 20, 15);

			expect(screenshot.width).toBe(10);
			expect(screenshot.height).toBe(5);
			expect(screenshot.offsetX).toBe(0);
			expect(screenshot.offsetY).toBe(0);
		});

		it('handles partial out-of-bounds region', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 8, 3, createCell('X'));

			const screenshot = captureRegion(buffer, 5, 2, 10, 10);

			expect(screenshot.width).toBe(5);
			expect(screenshot.height).toBe(3);
			expect(screenshot.cells[1]?.[3]?.char).toBe('X');
		});
	});

	describe('captureRow', () => {
		it('captures single row', () => {
			const buffer = createScreenBuffer(10, 5);
			setCell(buffer, 0, 2, createCell('A'));
			setCell(buffer, 5, 2, createCell('B'));
			setCell(buffer, 9, 2, createCell('C'));

			const screenshot = captureRow(buffer, 2);

			expect(screenshot.width).toBe(10);
			expect(screenshot.height).toBe(1);
			expect(screenshot.offsetY).toBe(2);
			expect(screenshot.cells[0]?.[0]?.char).toBe('A');
			expect(screenshot.cells[0]?.[5]?.char).toBe('B');
			expect(screenshot.cells[0]?.[9]?.char).toBe('C');
		});
	});

	describe('createEmptyScreenshot', () => {
		it('creates empty screenshot with dimensions', () => {
			const screenshot = createEmptyScreenshot(20, 10);

			expect(screenshot.width).toBe(20);
			expect(screenshot.height).toBe(10);
			expect(screenshot.cells.length).toBe(10);
			expect(screenshot.cells[0]?.length).toBe(20);
			expect(screenshot.cells[0]?.[0]?.char).toBe(' ');
		});
	});
});

describe('Screenshot Output', () => {
	describe('screenshotToText', () => {
		it('converts screenshot to plain text', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('H'));
			setCell(buffer, 1, 0, createCell('i'));
			setCell(buffer, 0, 1, createCell('T'));
			setCell(buffer, 1, 1, createCell('h'));
			setCell(buffer, 2, 1, createCell('e'));
			setCell(buffer, 3, 1, createCell('r'));
			setCell(buffer, 4, 1, createCell('e'));

			const screenshot = captureScreen(buffer);
			const text = screenshotToText(screenshot);

			expect(text).toBe('Hi\nThere\n');
		});

		it('preserves trailing spaces when requested', () => {
			const buffer = createScreenBuffer(5, 1);
			setCell(buffer, 0, 0, createCell('A'));

			const screenshot = captureScreen(buffer);
			const text = screenshotToText(screenshot, { preserveTrailingSpaces: true });

			expect(text).toBe('A    ');
		});

		it('uses custom line separator', () => {
			const buffer = createScreenBuffer(3, 2);
			setCell(buffer, 0, 0, createCell('A'));
			setCell(buffer, 0, 1, createCell('B'));

			const screenshot = captureScreen(buffer);
			const text = screenshotToText(screenshot, { lineSeparator: '\r\n' });

			expect(text).toBe('A\r\nB');
		});
	});

	describe('screenshotToAnsi', () => {
		it('includes ANSI escape sequences', () => {
			const buffer = createScreenBuffer(3, 1);
			setCell(buffer, 0, 0, createCell('A', 0xff0000ff, 0x000000ff));

			const screenshot = captureScreen(buffer);
			const ansi = screenshotToAnsi(screenshot);

			// Should contain color codes
			expect(ansi).toContain('\x1b[');
			expect(ansi).toContain('m');
			expect(ansi).toContain('A');
		});

		it('resets at end of line when requested', () => {
			const buffer = createScreenBuffer(3, 2);
			setCell(buffer, 0, 0, createCell('A', 0xff0000ff));
			setCell(buffer, 0, 1, createCell('B', 0x00ff00ff));

			const screenshot = captureScreen(buffer);
			const ansi = screenshotToAnsi(screenshot, { resetPerLine: true });

			// Should have reset sequence at end of each line
			const lines = ansi.split('\n');
			expect(lines[0]).toContain('\x1b[0m');
		});
	});

	describe('screenshotToJson / screenshotFromJson', () => {
		it('round-trips screenshot data', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff, 0x00ff00ff, Attr.BOLD));
			setCell(buffer, 4, 2, createCell('Y', 0x0000ffff, 0xffff00ff, Attr.UNDERLINE));

			const original = captureScreen(buffer);
			const json = screenshotToJson(original);
			const restored = screenshotFromJson(json);

			expect(restored.width).toBe(original.width);
			expect(restored.height).toBe(original.height);
			expect(restored.offsetX).toBe(original.offsetX);
			expect(restored.offsetY).toBe(original.offsetY);
			expect(restored.timestamp).toBe(original.timestamp);

			expect(restored.cells[0]?.[0]?.char).toBe('X');
			expect(restored.cells[0]?.[0]?.fg).toBe(0xff0000ff);
			expect(restored.cells[0]?.[0]?.bg).toBe(0x00ff00ff);
			expect(restored.cells[0]?.[0]?.attrs).toBe(Attr.BOLD);

			expect(restored.cells[2]?.[4]?.char).toBe('Y');
		});

		it('produces valid JSON', () => {
			const buffer = createScreenBuffer(5, 3);
			const screenshot = captureScreen(buffer);
			const json = screenshotToJson(screenshot);

			// Should be serializable
			const str = JSON.stringify(json);
			expect(() => JSON.parse(str)).not.toThrow();
		});
	});
});

describe('Screenshot Comparison', () => {
	describe('screenshotsEqual', () => {
		it('returns true for identical screenshots', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X'));

			const a = captureScreen(buffer);
			const b = captureScreen(buffer);

			expect(screenshotsEqual(a, b)).toBe(true);
		});

		it('returns false for different dimensions', () => {
			const a = createEmptyScreenshot(5, 3);
			const b = createEmptyScreenshot(5, 4);

			expect(screenshotsEqual(a, b)).toBe(false);
		});

		it('returns false for different content', () => {
			const buffer = createScreenBuffer(5, 3);
			const a = captureScreen(buffer);

			setCell(buffer, 0, 0, createCell('X'));
			const b = captureScreen(buffer);

			expect(screenshotsEqual(a, b)).toBe(false);
		});

		it('returns false for different colors', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff));
			const a = captureScreen(buffer);

			setCell(buffer, 0, 0, createCell('X', 0x00ff00ff));
			const b = captureScreen(buffer);

			expect(screenshotsEqual(a, b)).toBe(false);
		});

		it('returns false for different attributes', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X', 0xffffffff, 0x000000ff, Attr.BOLD));
			const a = captureScreen(buffer);

			setCell(buffer, 0, 0, createCell('X', 0xffffffff, 0x000000ff, Attr.UNDERLINE));
			const b = captureScreen(buffer);

			expect(screenshotsEqual(a, b)).toBe(false);
		});
	});

	describe('diffScreenshots', () => {
		it('returns empty array for identical screenshots', () => {
			const buffer = createScreenBuffer(5, 3);
			const a = captureScreen(buffer);
			const b = captureScreen(buffer);

			const diffs = diffScreenshots(a, b);
			expect(diffs).toHaveLength(0);
		});

		it('returns changed cells', () => {
			const buffer = createScreenBuffer(5, 3);
			const before = captureScreen(buffer);

			setCell(buffer, 2, 1, createCell('X'));
			const after = captureScreen(buffer);

			const diffs = diffScreenshots(before, after);

			expect(diffs).toHaveLength(1);
			expect(diffs[0]?.x).toBe(2);
			expect(diffs[0]?.y).toBe(1);
			expect(diffs[0]?.before.char).toBe(' ');
			expect(diffs[0]?.after.char).toBe('X');
		});

		it('handles multiple changes', () => {
			const buffer = createScreenBuffer(5, 3);
			const before = captureScreen(buffer);

			setCell(buffer, 0, 0, createCell('A'));
			setCell(buffer, 4, 2, createCell('Z'));
			const after = captureScreen(buffer);

			const diffs = diffScreenshots(before, after);

			expect(diffs).toHaveLength(2);
		});

		it('detects color changes', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X', 0xff0000ff));
			const before = captureScreen(buffer);

			setCell(buffer, 0, 0, createCell('X', 0x00ff00ff));
			const after = captureScreen(buffer);

			const diffs = diffScreenshots(before, after);

			expect(diffs).toHaveLength(1);
			expect(diffs[0]?.before.fg).toBe(0xff0000ff);
			expect(diffs[0]?.after.fg).toBe(0x00ff00ff);
		});
	});
});

describe('Screenshot Utilities', () => {
	describe('getScreenshotCell', () => {
		it('returns cell at position', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 2, 1, createCell('X'));

			const screenshot = captureScreen(buffer);
			const cell = getScreenshotCell(screenshot, 2, 1);

			expect(cell?.char).toBe('X');
		});

		it('returns undefined for out of bounds', () => {
			const screenshot = createEmptyScreenshot(5, 3);

			expect(getScreenshotCell(screenshot, -1, 0)).toBeUndefined();
			expect(getScreenshotCell(screenshot, 5, 0)).toBeUndefined();
			expect(getScreenshotCell(screenshot, 0, 3)).toBeUndefined();
		});
	});

	describe('getScreenshotRow', () => {
		it('returns row as text', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 1, createCell('H'));
			setCell(buffer, 1, 1, createCell('e'));
			setCell(buffer, 2, 1, createCell('l'));
			setCell(buffer, 3, 1, createCell('l'));
			setCell(buffer, 4, 1, createCell('o'));

			const screenshot = captureScreen(buffer);
			const row = getScreenshotRow(screenshot, 1);

			expect(row).toBe('Hello');
		});

		it('returns empty string for out of bounds', () => {
			const screenshot = createEmptyScreenshot(5, 3);

			expect(getScreenshotRow(screenshot, -1)).toBe('');
			expect(getScreenshotRow(screenshot, 5)).toBe('');
		});
	});

	describe('getScreenshotColumn', () => {
		it('returns column as text', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 2, 0, createCell('A'));
			setCell(buffer, 2, 1, createCell('B'));
			setCell(buffer, 2, 2, createCell('C'));

			const screenshot = captureScreen(buffer);
			const col = getScreenshotColumn(screenshot, 2);

			expect(col).toBe('ABC');
		});

		it('returns empty string for out of bounds', () => {
			const screenshot = createEmptyScreenshot(5, 3);

			expect(getScreenshotColumn(screenshot, -1)).toBe('');
			expect(getScreenshotColumn(screenshot, 10)).toBe('');
		});
	});

	describe('extractRegion', () => {
		it('extracts sub-region from screenshot', () => {
			const buffer = createScreenBuffer(10, 10);
			setCell(buffer, 5, 5, createCell('X'));

			const full = captureScreen(buffer);
			const region = extractRegion(full, 3, 3, 5, 5);

			expect(region.width).toBe(5);
			expect(region.height).toBe(5);
			expect(region.offsetX).toBe(3);
			expect(region.offsetY).toBe(3);
			expect(region.cells[2]?.[2]?.char).toBe('X');
		});

		it('clamps to screenshot bounds', () => {
			const screenshot = createEmptyScreenshot(10, 10);

			const region = extractRegion(screenshot, 8, 8, 5, 5);

			expect(region.width).toBe(2);
			expect(region.height).toBe(2);
		});
	});

	describe('isScreenshotEmpty', () => {
		it('returns true for empty screenshot', () => {
			const screenshot = createEmptyScreenshot(5, 3);
			expect(isScreenshotEmpty(screenshot)).toBe(true);
		});

		it('returns false for screenshot with content', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('X'));

			const screenshot = captureScreen(buffer);
			expect(isScreenshotEmpty(screenshot)).toBe(false);
		});
	});

	describe('countNonEmptyCells', () => {
		it('counts non-space cells', () => {
			const buffer = createScreenBuffer(5, 3);
			setCell(buffer, 0, 0, createCell('A'));
			setCell(buffer, 1, 0, createCell('B'));
			setCell(buffer, 2, 0, createCell('C'));

			const screenshot = captureScreen(buffer);
			expect(countNonEmptyCells(screenshot)).toBe(3);
		});

		it('returns 0 for empty screenshot', () => {
			const screenshot = createEmptyScreenshot(5, 3);
			expect(countNonEmptyCells(screenshot)).toBe(0);
		});
	});
});
