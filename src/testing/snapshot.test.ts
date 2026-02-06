import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BORDER_SINGLE, BorderType, setBorder, setBorderChars } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition, setZIndex } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { renderText } from '../systems/renderSystem';
import type { DoubleBufferData } from '../terminal/screen/doubleBuffer';
import { getBackBuffer } from '../terminal/screen/doubleBuffer';
import type { TestBufferContext } from './snapshot';
import {
	captureTestScreen,
	cleanupTestBuffer,
	createTestBuffer,
	getCellBg,
	getCellChar,
	getCellFg,
	getRowText,
	renderBox,
	renderRegionToString,
	renderToString,
	runRender,
} from './snapshot';

describe('Snapshot Testing Utilities', () => {
	let ctx: TestBufferContext;
	let world: World;
	let db: DoubleBufferData;

	beforeEach(() => {
		ctx = createTestBuffer(20, 5);
		world = ctx.world;
		db = ctx.db;
	});

	afterEach(() => {
		cleanupTestBuffer();
	});

	describe('createTestBuffer', () => {
		it('creates a valid test context', () => {
			expect(ctx.world).toBeDefined();
			expect(ctx.db).toBeDefined();
			expect(ctx.screenEid).toBeDefined();
		});
	});

	describe('renderToString', () => {
		it('returns empty string for blank buffer', () => {
			runRender(world);
			const text = renderToString(db);
			// All empty lines should be trimmed
			expect(text).toBe('');
		});

		it('captures rendered text', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 0, 0, 'Hello', 0xffffffff, 0x000000ff);

			const text = renderToString(db);
			expect(text).toContain('Hello');
		});
	});

	describe('renderRegionToString', () => {
		it('captures a sub-region', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 5, 2, 'World', 0xffffffff, 0x000000ff);

			const region = renderRegionToString(db, 5, 2, 5, 1);
			expect(region).toBe('World');
		});
	});

	describe('captureTestScreen', () => {
		it('captures screenshot with correct dimensions', () => {
			const screenshot = captureTestScreen(db);
			expect(screenshot.width).toBe(20);
			expect(screenshot.height).toBe(5);
		});
	});

	describe('getRowText', () => {
		it('gets text content of a row', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 0, 0, 'Row 0', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 1, 'Row 1', 0xffffffff, 0x000000ff);

			expect(getRowText(db, 0)).toBe('Row 0');
			expect(getRowText(db, 1)).toBe('Row 1');
		});
	});

	describe('getCellChar / getCellFg / getCellBg', () => {
		it('reads cell properties', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 0, 0, 'A', 0xff0000ff, 0x0000ffff);

			expect(getCellChar(db, 0, 0)).toBe('A');
			expect(getCellFg(db, 0, 0)).toBe(0xff0000ff);
			expect(getCellBg(db, 0, 0)).toBe(0x0000ffff);
		});

		it('returns undefined for out of bounds', () => {
			expect(getCellChar(db, 100, 100)).toBeUndefined();
		});
	});

	describe('renderBox', () => {
		it('creates an entity with position and dimensions', () => {
			const eid = renderBox(ctx, 2, 1, 10, 3, { bg: '#ff0000' });
			runRender(world);

			// Entity should be rendered — check that the area has content
			expect(getCellBg(db, 5, 2)).toBeDefined();
			expect(eid).toBeDefined();
		});
	});
});

describe('Widget Snapshot Tests', () => {
	let ctx: TestBufferContext;
	let world: World;
	let db: DoubleBufferData;

	beforeEach(() => {
		ctx = createTestBuffer(30, 10);
		world = ctx.world;
		db = ctx.db;
	});

	afterEach(() => {
		cleanupTestBuffer();
	});

	describe('Box rendering', () => {
		it('renders a simple box with background', () => {
			renderBox(ctx, 0, 0, 10, 3, { bg: '#ff0000' });
			runRender(world);

			// Background should be filled in the box area
			const bg = getCellBg(db, 5, 1);
			expect(bg).toBe(0xffff0000); // ARGB format for #ff0000
		});

		it('renders overlapping boxes with z-order', () => {
			const back = renderBox(ctx, 0, 0, 15, 5, { bg: '#ff0000' });
			setZIndex(world, back, 0);

			const front = renderBox(ctx, 5, 2, 15, 5, { bg: '#0000ff' });
			setZIndex(world, front, 10);

			runRender(world);

			// Non-overlapping area of back box should be red
			expect(getCellBg(db, 2, 1)).toBe(0xffff0000);

			// Overlapping area should be blue (front entity wins)
			expect(getCellBg(db, 10, 3)).toBe(0xff0000ff);
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
			expect(getCellChar(db, 0, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.topLeft));
			expect(getCellChar(db, 9, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.topRight));
			expect(getCellChar(db, 0, 4)).toBe(String.fromCodePoint(BORDER_SINGLE.bottomLeft));
			expect(getCellChar(db, 9, 4)).toBe(String.fromCodePoint(BORDER_SINGLE.bottomRight));

			// Edges
			expect(getCellChar(db, 5, 0)).toBe(String.fromCodePoint(BORDER_SINGLE.horizontal));
			expect(getCellChar(db, 0, 2)).toBe(String.fromCodePoint(BORDER_SINGLE.vertical));
		});
	});

	describe('Color rendering', () => {
		it('renders foreground and background colors', () => {
			renderBox(ctx, 0, 0, 10, 3, { fg: '#ff0000', bg: '#00ff00' });
			runRender(world);

			expect(getCellFg(db, 5, 1)).toBe(0xffff0000); // #ff0000 in ARGB
			expect(getCellBg(db, 5, 1)).toBe(0xff00ff00); // #00ff00 in ARGB
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
			expect(getCellBg(db, 2, 1)).toBe(0xff333333);

			// Child at parent(2,1) + local(2,1) = (4,2) should have red bg
			expect(getCellBg(db, 4, 2)).toBe(0xffff0000);
		});
	});

	describe('Text rendering', () => {
		it('renders text directly to buffer', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 5, 3, 'Hello World', 0xffffffff, 0x000000ff);

			expect(getRowText(db, 3)).toContain('Hello World');
			expect(getCellChar(db, 5, 3)).toBe('H');
			expect(getCellChar(db, 15, 3)).toBe('d');
		});
	});

	describe('Snapshot integration', () => {
		it('produces stable text output for simple box', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 0, 0, '+---------+', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 1, '|  Hello  |', 0xffffffff, 0x000000ff);
			renderText(buffer, 0, 2, '+---------+', 0xffffffff, 0x000000ff);

			const text = renderToString(db);
			expect(text).toMatchInlineSnapshot(`
				"+---------+
				|  Hello  |
				+---------+"
			`);
		});

		it('produces stable text for bordered entity', () => {
			const buffer = getBackBuffer(db);
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

			const text = renderToString(db);
			expect(text).toMatchInlineSnapshot(`
				"┌────────┐
				│        │
				└────────┘"
			`);
		});

		it('captures region snapshots', () => {
			const buffer = getBackBuffer(db);
			renderText(buffer, 5, 2, 'REGION', 0xffffffff, 0x000000ff);

			const region = renderRegionToString(db, 5, 2, 6, 1);
			expect(region).toMatchInlineSnapshot(`"REGION"`);
		});
	});
});
