import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BORDER_SINGLE, BorderType, setBorder, setBorderChars } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition, setZIndex } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { renderText } from '../systems/renderSystem';
import type { ScreenBufferData } from '../terminal/screen/cell';
import type { TestBufferContext } from './snapshot';
import {
	assertSnapshotMatch,
	captureTestScreen,
	cleanupTestBuffer,
	compareScreenshots,
	compareSnapshots,
	createTestBuffer,
	createVisualDiff,
	getCellBg,
	getCellChar,
	getCellFg,
	getRowText,
	normalizeSnapshot,
	renderBox,
	renderRegionToString,
	renderToString,
	renderWithColors,
	runRender,
} from './snapshot';

describe('Snapshot Testing Utilities', () => {
	let ctx: TestBufferContext;
	let world: World;
	let buffer: ScreenBufferData;

	beforeEach(() => {
		ctx = createTestBuffer(20, 5);
		world = ctx.world;
		buffer = ctx.buffer;
	});

	afterEach(() => {
		cleanupTestBuffer();
	});

	describe('createTestBuffer', () => {
		it('creates a valid test context', () => {
			expect(ctx.world).toBeDefined();
			expect(ctx.buffer).toBeDefined();
			expect(ctx.screenEid).toBeDefined();
		});
	});

	describe('renderToString', () => {
		it('returns empty string for blank buffer', () => {
			runRender(world);
			const text = renderToString(buffer);
			// All empty lines should be trimmed
			expect(text).toBe('');
		});

		it('captures rendered text', () => {
			renderText(buffer, 0, 0, 'Hello', 0xffffffff, 0x000000ff);

			const text = renderToString(buffer);
			expect(text).toContain('Hello');
		});
	});

	describe('renderRegionToString', () => {
		it('captures a sub-region', () => {
			renderText(buffer, 5, 2, 'World', 0xffffffff, 0x000000ff);

			const region = renderRegionToString(buffer, 5, 2, 5, 1);
			expect(region).toBe('World');
		});
	});

	describe('captureTestScreen', () => {
		it('captures screenshot with correct dimensions', () => {
			const screenshot = captureTestScreen(buffer);
			expect(screenshot.width).toBe(20);
			expect(screenshot.height).toBe(5);
		});
	});

	describe('getRowText', () => {
		it('gets text content of a row', () => {
			renderText(buffer, 0, 0, 'Row 0', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 1, 'Row 1', 0xffffffff, 0x000000ff);

			expect(getRowText(buffer, 0)).toBe('Row 0');
			expect(getRowText(buffer, 1)).toBe('Row 1');
		});
	});

	describe('getCellChar / getCellFg / getCellBg', () => {
		it('reads cell properties', () => {
			renderText(buffer, 0, 0, 'A', 0xff0000ff, 0x0000ffff);

			expect(getCellChar(buffer, 0, 0)).toBe('A');
			expect(getCellFg(buffer, 0, 0)).toBe(0xff0000ff);
			expect(getCellBg(buffer, 0, 0)).toBe(0x0000ffff);
		});

		it('returns undefined for out of bounds', () => {
			expect(getCellChar(buffer, 100, 100)).toBeUndefined();
		});
	});

	describe('renderBox', () => {
		it('creates an entity with position and dimensions', () => {
			const eid = renderBox(ctx, 2, 1, 10, 3, { bg: '#ff0000' });
			runRender(world);

			// Entity should be rendered — check that the area has content
			expect(getCellBg(buffer, 5, 2)).toBeDefined();
			expect(eid).toBeDefined();
		});
	});
});

describe('Widget Snapshot Tests', () => {
	let ctx: TestBufferContext;
	let world: World;
	let buffer: ScreenBufferData;

	beforeEach(() => {
		ctx = createTestBuffer(30, 10);
		world = ctx.world;
		buffer = ctx.buffer;
	});

	afterEach(() => {
		cleanupTestBuffer();
	});

	describe('Box rendering', () => {
		it('renders a simple box with background', () => {
			renderBox(ctx, 0, 0, 10, 3, { bg: '#ff0000' });
			runRender(world);

			// Background should be filled in the box area
			const bg = getCellBg(buffer, 5, 1);
			expect(bg).toBe(0xffff0000); // ARGB format for #ff0000
		});

		it('renders overlapping boxes with z-order', () => {
			const back = renderBox(ctx, 0, 0, 15, 5, { bg: '#ff0000' });
			setZIndex(world, back, 0);

			const front = renderBox(ctx, 5, 2, 15, 5, { bg: '#0000ff' });
			setZIndex(world, front, 10);

			runRender(world);

			// Non-overlapping area of back box should be red
			expect(getCellBg(buffer, 2, 1)).toBe(0xffff0000);

			// Overlapping area should be blue (front entity wins)
			expect(getCellBg(buffer, 10, 3)).toBe(0xff0000ff);
		});
	});

	describe('Border rendering', () => {
		it('renders single-line border', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 5);
			setStyle(world, eid, { fg: '#ffffff', bg: '#000000' });
			setBorder(world, eid, { type: BorderType.Line });
			setBorderChars(world, eid, BORDER_SINGLE);

			runRender(world);

			// Corners
			expect(getCellChar(buffer, 0, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.topLeft));
			expect(getCellChar(buffer, 9, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.topRight));
			expect(getCellChar(buffer, 0, 4)).toBe(String.fromCodePoint(BORDER_SINGLE.bottomLeft));
			expect(getCellChar(buffer, 9, 4)).toBe(String.fromCodePoint(BORDER_SINGLE.bottomRight));

			// Edges
			expect(getCellChar(buffer, 5, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.horizontal));
			expect(getCellChar(buffer, 0, 2)).toBe(String.fromCodePoint(BORDER_SINGLE.vertical));
		});
	});

	describe('Color rendering', () => {
		it('renders foreground and background colors', () => {
			renderBox(ctx, 0, 0, 10, 3, { fg: '#ff0000', bg: '#00ff00' });
			runRender(world);

			expect(getCellFg(buffer, 5, 1)).toBe(0xffff0000); // #ff0000 in ARGB
			expect(getCellBg(buffer, 5, 1)).toBe(0xff00ff00); // #00ff00 in ARGB
		});
	});

	describe('Layout rendering', () => {
		it('renders nested entities with correct positions', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 2, 1);
			setDimensions(world, parent, 20, 8);
			setStyle(world, parent, { bg: '#333333' });

			const child = addEntity(world);
			setPosition(world, child, 2, 1);
			setDimensions(world, child, 10, 3);
			setStyle(world, child, { bg: '#ff0000' });
			appendChild(world, parent, child);

			runRender(world);

			// Parent at (2,1) should have its bg
			expect(getCellBg(buffer, 2, 1)).toBe(0xff333333);

			// Child at parent(2,1) + local(2,1) = (4,2) should have red bg
			expect(getCellBg(buffer, 4, 2)).toBe(0xffff0000);
		});
	});

	describe('Text rendering', () => {
		it('renders text directly to buffer', () => {
			renderText(buffer, 5, 3, 'Hello World', 0xffffffff, 0x000000ff);

			expect(getRowText(buffer, 3)).toContain('Hello World');
			expect(getCellChar(buffer, 5, 3)).toBe('H');
			expect(getCellChar(buffer, 15, 3)).toBe('d');
		});
	});

	describe('Snapshot integration', () => {
		it('produces stable text output for simple box', () => {
			renderText(buffer, 0, 0, '+---------+', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 1, '|  Hello  |', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 2, '+---------+', 0xffffffff, 0x000000ff);

			const text = renderToString(buffer);
			expect(text).toMatchInlineSnapshot(`
				"+---------+
				|  Hello  |
				+---------+"
			`);
		});

		it('produces stable text for bordered entity', () => {
			const tl = String.fromCodePoint(BORDER_SINGLE.topLeft);
			const tr = String.fromCodePoint(BORDER_SINGLE.topRight);
			const bl = String.fromCodePoint(BORDER_SINGLE.bottomLeft);
			const br = String.fromCodePoint(BORDER_SINGLE.bottomRight);
			const h = String.fromCodePoint(BORDER_SINGLE.horizontal);
			const v = String.fromCodePoint(BORDER_SINGLE.vertical);

			renderText(
				buffer,
				0,
				0,
				`${tl}${h}${h}${h}${h}${h}${h}${h}${h}${tr}`,
				0xffffffff,
				0x000000ff,
			);
			renderText(buffer, 0, 1, `${v}        ${v}`, 0xffffffff, 0x000000ff);
			renderText(
				buffer,
				0,
				2,
				`${bl}${h}${h}${h}${h}${h}${h}${h}${h}${br}`,
				0xffffffff,
				0x000000ff,
			);

			const text = renderToString(buffer);
			expect(text).toMatchInlineSnapshot(`
				"┌────────┐
				│        │
				└────────┘"
			`);
		});

		it('captures region snapshots', () => {
			renderText(buffer, 5, 2, 'REGION', 0xffffffff, 0x000000ff);

			const region = renderRegionToString(buffer, 5, 2, 6, 1);
			expect(region).toMatchInlineSnapshot(`"REGION"`);
		});
	});

	describe('compareSnapshots', () => {
		it('returns no differences for identical strings', () => {
			const text = 'Hello\nWorld';
			const result = compareSnapshots(text, text);

			expect(result.hasDifferences).toBe(false);
			expect(result.diffCount).toBe(0);
		});

		it('detects line differences', () => {
			const expected = 'Hello\nWorld';
			const actual = 'Hello\nEarth';

			const result = compareSnapshots(expected, actual);

			expect(result.hasDifferences).toBe(true);
			expect(result.diffCount).toBe(1);
			expect(result.report).toContain('- 2 | World');
			expect(result.report).toContain('+ 2 | Earth');
		});

		it('handles different line counts', () => {
			const expected = 'Line 1\nLine 2';
			const actual = 'Line 1\nLine 2\nLine 3';

			const result = compareSnapshots(expected, actual);

			expect(result.hasDifferences).toBe(true);
			expect(result.diffCount).toBe(1);
			expect(result.report).toContain('+ 3 | Line 3');
		});

		it('shows matching lines without diff markers', () => {
			const expected = 'Same\nDifferent\nSame';
			const actual = 'Same\nChanged\nSame';

			const result = compareSnapshots(expected, actual);

			expect(result.report).toContain('  1 | Same');
			expect(result.report).toContain('  3 | Same');
		});
	});

	describe('compareScreenshots', () => {
		it('returns identical for same screenshots', () => {
			renderText(buffer, 0, 0, 'Test', 0xffffffff, 0x000000ff);
			const screenshot = captureTestScreen(buffer);

			const result = compareScreenshots(screenshot, screenshot);

			expect(result.isIdentical).toBe(true);
			expect(result.pixelDifferences).toBe(0);
			expect(result.dimensionMismatch).toBe(false);
		});

		it('detects character differences', () => {
			renderText(buffer, 0, 0, 'ABC', 0xffffffff, 0x000000ff);
			const expected = captureTestScreen(buffer);

			// Clear and render different text
			renderText(buffer, 0, 0, 'XYZ', 0xffffffff, 0x000000ff);
			const actual = captureTestScreen(buffer);

			const result = compareScreenshots(expected, actual);

			expect(result.isIdentical).toBe(false);
			expect(result.pixelDifferences).toBeGreaterThan(0);
			expect(result.differences.some((d) => d.type === 'char')).toBe(true);
		});

		it('detects color differences', () => {
			renderText(buffer, 0, 0, 'A', 0xff0000ff, 0x000000ff);
			const expected = captureTestScreen(buffer);

			// Same char, different color
			renderText(buffer, 0, 0, 'A', 0x00ff00ff, 0x000000ff);
			const actual = captureTestScreen(buffer);

			const result = compareScreenshots(expected, actual);

			expect(result.isIdentical).toBe(false);
			expect(result.differences.some((d) => d.type === 'fg')).toBe(true);
		});

		it('detects dimension mismatches', () => {
			const buffer1 = createTestBuffer(10, 5).buffer;
			const buffer2 = createTestBuffer(20, 10).buffer;

			const screenshot1 = captureTestScreen(buffer1);
			const screenshot2 = captureTestScreen(buffer2);

			const result = compareScreenshots(screenshot1, screenshot2);

			expect(result.dimensionMismatch).toBe(true);
			expect(result.isIdentical).toBe(false);
		});
	});

	describe('createVisualDiff', () => {
		it('returns no differences message for identical screenshots', () => {
			renderText(buffer, 0, 0, 'Test', 0xffffffff, 0x000000ff);
			const screenshot = captureTestScreen(buffer);

			const diff = createVisualDiff(screenshot, screenshot);

			expect(diff).toContain('(no differences)');
		});

		it('marks character differences with !', () => {
			renderText(buffer, 0, 0, 'ABC', 0xffffffff, 0x000000ff);
			const expected = captureTestScreen(buffer);

			renderText(buffer, 0, 0, 'AXC', 0xffffffff, 0x000000ff);
			const actual = captureTestScreen(buffer);

			const diff = createVisualDiff(expected, actual);

			expect(diff).toContain('!'); // Marks the difference
		});

		it('marks foreground differences with F', () => {
			renderText(buffer, 0, 0, 'A', 0xff0000ff, 0x000000ff);
			const expected = captureTestScreen(buffer);

			renderText(buffer, 0, 0, 'A', 0x00ff00ff, 0x000000ff);
			const actual = captureTestScreen(buffer);

			const diff = createVisualDiff(expected, actual);

			expect(diff).toContain('F');
		});

		it('reports dimension mismatches', () => {
			const buffer1 = createTestBuffer(10, 5).buffer;
			const buffer2 = createTestBuffer(20, 10).buffer;

			const screenshot1 = captureTestScreen(buffer1);
			const screenshot2 = captureTestScreen(buffer2);

			const diff = createVisualDiff(screenshot1, screenshot2);

			expect(diff).toContain('Dimension mismatch');
			expect(diff).toContain('10x5');
			expect(diff).toContain('20x10');
		});
	});

	describe('assertSnapshotMatch', () => {
		it('does not throw for matching strings', () => {
			expect(() => assertSnapshotMatch('Hello', 'Hello')).not.toThrow();
		});

		it('throws with diff report for mismatches', () => {
			expect(() => assertSnapshotMatch('Hello', 'World')).toThrow('Snapshot mismatch');
		});

		it('includes custom message in error', () => {
			expect(() => assertSnapshotMatch('A', 'B', 'Custom message')).toThrow('Custom message');
		});
	});

	describe('normalizeSnapshot', () => {
		it('trims trailing whitespace from lines', () => {
			const input = 'Line 1   \nLine 2  \n';
			const normalized = normalizeSnapshot(input);

			expect(normalized).toBe('Line 1\nLine 2');
		});

		it('removes trailing empty lines', () => {
			const input = 'Line 1\nLine 2\n\n\n';
			const normalized = normalizeSnapshot(input);

			expect(normalized).toBe('Line 1\nLine 2');
		});

		it('normalizes line endings to LF', () => {
			const input = 'Line 1\r\nLine 2\r\n';
			const normalized = normalizeSnapshot(input);

			expect(normalized).toBe('Line 1\nLine 2');
		});

		it('handles mixed line endings', () => {
			const input = 'Line 1\r\nLine 2\nLine 3\r\n';
			const normalized = normalizeSnapshot(input);

			expect(normalized).toBe('Line 1\nLine 2\nLine 3');
		});
	});

	describe('renderWithColors', () => {
		it('captures color information as hex strings', () => {
			renderText(buffer, 0, 0, 'A', 0xffff0000, 0xff00ff00);

			const colorSnapshot = renderWithColors(buffer);

			const firstRow = colorSnapshot[0];
			const firstCell = firstRow?.[0];

			expect(firstCell?.char).toBe('A');
			expect(firstCell?.fg).toBe('#ff0000');
			expect(firstCell?.bg).toBe('#00ff00');
		});

		it('returns correct dimensions', () => {
			const { buffer: smallBuffer } = createTestBuffer(5, 3);
			const colorSnapshot = renderWithColors(smallBuffer);

			expect(colorSnapshot.length).toBe(3); // height
			expect(colorSnapshot[0]?.length).toBe(5); // width
		});

		it('handles empty cells with default colors', () => {
			const colorSnapshot = renderWithColors(buffer);

			const firstRow = colorSnapshot[0];
			const firstCell = firstRow?.[0];

			expect(firstCell?.char).toBe(' ');
			// Empty cells have white fg by default
			expect(firstCell?.fg).toBeDefined();
			expect(firstCell?.bg).toBeDefined();
		});
	});
});
