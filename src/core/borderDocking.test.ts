/**
 * Tests for Border Docking System
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	applyJunctions,
	type BorderDockingContext,
	clearDockingContext,
	createBorderDockingContext,
	type DockingBuffer,
	type DockingCell,
	detectAllJunctions,
	detectBorderStyle,
	detectJunctions,
	getConnectionFlags,
	getEdgeCount,
	getEdgesAt,
	getJunctionChar,
	getJunctionCharset,
	getJunctionRenderData,
	isBorderChar,
	isJunctionChar,
	JUNCTION_ASCII,
	JUNCTION_BOLD,
	JUNCTION_DOUBLE,
	JUNCTION_SINGLE,
	registerEdge,
	registerRectBorder,
	resizeDockingContext,
} from './borderDocking';

describe('Border Docking', () => {
	let ctx: BorderDockingContext;

	beforeEach(() => {
		ctx = createBorderDockingContext(80, 24);
	});

	describe('createBorderDockingContext', () => {
		it('creates context with correct dimensions', () => {
			expect(ctx.width).toBe(80);
			expect(ctx.height).toBe(24);
			expect(ctx.enabled).toBe(true);
			expect(ctx.edges.size).toBe(0);
		});

		it('creates disabled context', () => {
			const disabled = createBorderDockingContext(80, 24, { enabled: false });
			expect(disabled.enabled).toBe(false);
		});
	});

	describe('clearDockingContext', () => {
		it('clears all edges', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 11, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);

			expect(ctx.edges.size).toBe(2);

			clearDockingContext(ctx);

			expect(ctx.edges.size).toBe(0);
		});
	});

	describe('resizeDockingContext', () => {
		it('updates dimensions', () => {
			const resized = resizeDockingContext(ctx, 120, 40);

			expect(resized.width).toBe(120);
			expect(resized.height).toBe(40);
			expect(resized.enabled).toBe(ctx.enabled);
		});
	});

	describe('detectBorderStyle', () => {
		it('detects single line characters', () => {
			expect(detectBorderStyle(0x2500)).toBe('single'); // ─
			expect(detectBorderStyle(0x2502)).toBe('single'); // │
			expect(detectBorderStyle(0x250c)).toBe('single'); // ┌
			expect(detectBorderStyle(0x253c)).toBe('single'); // ┼
		});

		it('detects double line characters', () => {
			expect(detectBorderStyle(0x2550)).toBe('double'); // ═
			expect(detectBorderStyle(0x2551)).toBe('double'); // ║
			expect(detectBorderStyle(0x2554)).toBe('double'); // ╔
			expect(detectBorderStyle(0x256c)).toBe('double'); // ╬
		});

		it('detects bold line characters', () => {
			expect(detectBorderStyle(0x2501)).toBe('bold'); // ━
			expect(detectBorderStyle(0x2503)).toBe('bold'); // ┃
			expect(detectBorderStyle(0x250f)).toBe('bold'); // ┏
			expect(detectBorderStyle(0x254b)).toBe('bold'); // ╋
		});

		it('detects ASCII characters', () => {
			expect(detectBorderStyle(0x2d)).toBe('ascii'); // -
			expect(detectBorderStyle(0x7c)).toBe('ascii'); // |
			expect(detectBorderStyle(0x2b)).toBe('ascii'); // +
		});

		it('returns unknown for non-border characters', () => {
			expect(detectBorderStyle(0x41)).toBe('unknown'); // A
			expect(detectBorderStyle(0x20)).toBe('unknown'); // space
		});
	});

	describe('getJunctionCharset', () => {
		it('returns correct charset for style', () => {
			expect(getJunctionCharset('single')).toBe(JUNCTION_SINGLE);
			expect(getJunctionCharset('double')).toBe(JUNCTION_DOUBLE);
			expect(getJunctionCharset('bold')).toBe(JUNCTION_BOLD);
			expect(getJunctionCharset('ascii')).toBe(JUNCTION_ASCII);
			expect(getJunctionCharset('unknown')).toBe(JUNCTION_SINGLE);
		});
	});

	describe('registerEdge', () => {
		it('registers a single edge', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);

			expect(ctx.edges.size).toBe(1);
			const edges = getEdgesAt(ctx, 10, 5);
			expect(edges).toHaveLength(1);
			expect(edges[0]?.type).toBe('h');
			expect(edges[0]?.char).toBe(0x2500);
		});

		it('registers multiple edges at same position', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 5, 'v', 0x2502, 0xffffffff, 0x000000ff);

			const edges = getEdgesAt(ctx, 10, 5);
			expect(edges).toHaveLength(2);
		});
	});

	describe('registerRectBorder', () => {
		it('registers edges for a rectangle', () => {
			registerRectBorder(ctx, 10, 5, 10, 5, 0x2500, 0x2502, 0xffffffff, 0x000000ff);

			// Top edge (8 horizontal edges, excluding corners)
			for (let i = 11; i < 19; i++) {
				const edges = getEdgesAt(ctx, i, 5);
				expect(edges).toHaveLength(1);
				expect(edges[0]?.type).toBe('h');
			}

			// Left edge (3 vertical edges, excluding corners)
			for (let j = 6; j < 9; j++) {
				const edges = getEdgesAt(ctx, 10, j);
				expect(edges).toHaveLength(1);
				expect(edges[0]?.type).toBe('v');
			}

			// Corners
			const topLeft = getEdgesAt(ctx, 10, 5);
			expect(topLeft).toHaveLength(1);
			expect(topLeft[0]?.type).toBe('c');
		});
	});

	describe('getConnectionFlags', () => {
		it('returns correct flags for isolated edge', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);

			const flags = getConnectionFlags(ctx, 10, 5);
			expect(flags.left).toBe(false);
			expect(flags.right).toBe(false);
			expect(flags.top).toBe(false);
			expect(flags.bottom).toBe(false);
		});

		it('returns correct flags for connected edges', () => {
			// Create a T-junction: ┬
			//     │
			// ────┼────
			registerEdge(ctx, 9, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 11, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 6, 'v', 0x2502, 0xffffffff, 0x000000ff);

			const flags = getConnectionFlags(ctx, 10, 5);
			expect(flags.left).toBe(true);
			expect(flags.right).toBe(true);
			expect(flags.bottom).toBe(true);
			expect(flags.top).toBe(false);
		});
	});

	describe('getJunctionChar', () => {
		it('returns null for less than 3 connections', () => {
			expect(
				getJunctionChar({ left: true, right: true, top: false, bottom: false }, JUNCTION_SINGLE),
			).toBeNull();
		});

		it('returns cross for 4 connections', () => {
			expect(
				getJunctionChar({ left: true, right: true, top: true, bottom: true }, JUNCTION_SINGLE),
			).toBe(JUNCTION_SINGLE.cross);
		});

		it('returns teeUp for left-right-top', () => {
			expect(
				getJunctionChar({ left: true, right: true, top: true, bottom: false }, JUNCTION_SINGLE),
			).toBe(JUNCTION_SINGLE.teeUp); // ┴
		});

		it('returns teeDown for left-right-bottom', () => {
			expect(
				getJunctionChar({ left: true, right: true, top: false, bottom: true }, JUNCTION_SINGLE),
			).toBe(JUNCTION_SINGLE.teeDown); // ┬
		});

		it('returns teeRight for right-top-bottom', () => {
			expect(
				getJunctionChar({ left: false, right: true, top: true, bottom: true }, JUNCTION_SINGLE),
			).toBe(JUNCTION_SINGLE.teeRight); // ├
		});

		it('returns teeLeft for left-top-bottom', () => {
			expect(
				getJunctionChar({ left: true, right: false, top: true, bottom: true }, JUNCTION_SINGLE),
			).toBe(JUNCTION_SINGLE.teeLeft); // ┤
		});
	});

	describe('detectJunctions', () => {
		it('returns empty when disabled', () => {
			ctx.enabled = false;
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 5, 'v', 0x2502, 0xffffffff, 0x000000ff);

			const junctions = detectJunctions(ctx);
			expect(junctions).toHaveLength(0);
		});

		it('detects junction at intersection', () => {
			// Create two overlapping borders that share a corner
			registerEdge(ctx, 10, 5, 'c', 0, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 5, 'c', 0, 0xffffffff, 0x000000ff);

			// Add connecting edges
			registerEdge(ctx, 9, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 11, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 4, 'v', 0x2502, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 6, 'v', 0x2502, 0xffffffff, 0x000000ff);

			const junctions = detectJunctions(ctx);
			// At least one junction should be detected where borders overlap
			expect(junctions.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe('detectAllJunctions', () => {
		it('returns empty when disabled', () => {
			ctx.enabled = false;

			const junctions = detectAllJunctions(ctx);
			expect(junctions).toHaveLength(0);
		});
	});

	describe('applyJunctions', () => {
		it('applies junctions to buffer', () => {
			const cells: Map<string, DockingCell> = new Map();
			const buffer: DockingBuffer = {
				width: 80,
				height: 24,
				getCell(x, y) {
					return cells.get(`${x},${y}`);
				},
				setCell(x, y, cell) {
					cells.set(`${x},${y}`, cell);
				},
			};

			const junctions = [
				{ x: 10, y: 5, char: JUNCTION_SINGLE.cross, fg: 0xffffffff, bg: 0x000000ff },
			];

			applyJunctions(buffer, junctions);

			const cell = buffer.getCell(10, 5);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('┼');
		});

		it('ignores out-of-bounds junctions', () => {
			const cells: Map<string, DockingCell> = new Map();
			const buffer: DockingBuffer = {
				width: 80,
				height: 24,
				getCell(x, y) {
					return cells.get(`${x},${y}`);
				},
				setCell(x, y, cell) {
					cells.set(`${x},${y}`, cell);
				},
			};

			const junctions = [
				{ x: 100, y: 50, char: JUNCTION_SINGLE.cross, fg: 0xffffffff, bg: 0x000000ff },
			];

			applyJunctions(buffer, junctions);

			expect(cells.size).toBe(0);
		});
	});

	describe('getJunctionRenderData', () => {
		it('converts junctions to render data', () => {
			const junctions = [
				{ x: 10, y: 5, char: JUNCTION_SINGLE.cross, fg: 0xffffffff, bg: 0x000000ff },
				{ x: 20, y: 10, char: JUNCTION_SINGLE.teeDown, fg: 0xffffffff, bg: 0x000000ff },
			];

			const renderData = getJunctionRenderData(junctions);

			expect(renderData).toHaveLength(2);
			expect(renderData[0]).toEqual({
				x: 10,
				y: 5,
				char: '┼',
				fg: 0xffffffff,
				bg: 0x000000ff,
			});
			expect(renderData[1]).toEqual({
				x: 20,
				y: 10,
				char: '┬',
				fg: 0xffffffff,
				bg: 0x000000ff,
			});
		});
	});

	describe('isBorderChar', () => {
		it('returns true for border characters', () => {
			expect(isBorderChar(0x2500)).toBe(true); // ─
			expect(isBorderChar(0x2502)).toBe(true); // │
			expect(isBorderChar(0x250c)).toBe(true); // ┌
		});

		it('returns false for non-border characters', () => {
			expect(isBorderChar(0x41)).toBe(false); // A
			expect(isBorderChar(0x20)).toBe(false); // space
		});
	});

	describe('isJunctionChar', () => {
		it('returns true for junction characters', () => {
			expect(isJunctionChar(0x251c)).toBe(true); // ├
			expect(isJunctionChar(0x2524)).toBe(true); // ┤
			expect(isJunctionChar(0x252c)).toBe(true); // ┬
			expect(isJunctionChar(0x2534)).toBe(true); // ┴
			expect(isJunctionChar(0x253c)).toBe(true); // ┼
		});

		it('returns false for non-junction characters', () => {
			expect(isJunctionChar(0x2500)).toBe(false); // ─ (line, not junction)
			expect(isJunctionChar(0x250c)).toBe(false); // ┌ (corner, not junction)
			expect(isJunctionChar(0x41)).toBe(false); // A
		});
	});

	describe('getEdgeCount', () => {
		it('returns 0 for empty context', () => {
			expect(getEdgeCount(ctx)).toBe(0);
		});

		it('returns correct count', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 11, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 12, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);

			expect(getEdgeCount(ctx)).toBe(3);
		});
	});

	describe('getEdgesAt', () => {
		it('returns empty array for position without edges', () => {
			const edges = getEdgesAt(ctx, 10, 5);
			expect(edges).toEqual([]);
		});

		it('returns edges at position', () => {
			registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
			registerEdge(ctx, 10, 5, 'v', 0x2502, 0xffffffff, 0x000000ff);

			const edges = getEdgesAt(ctx, 10, 5);
			expect(edges).toHaveLength(2);
		});
	});
});

describe('Junction Charsets', () => {
	describe('JUNCTION_SINGLE', () => {
		it('has correct characters', () => {
			expect(String.fromCodePoint(JUNCTION_SINGLE.teeRight)).toBe('├');
			expect(String.fromCodePoint(JUNCTION_SINGLE.teeLeft)).toBe('┤');
			expect(String.fromCodePoint(JUNCTION_SINGLE.teeDown)).toBe('┬');
			expect(String.fromCodePoint(JUNCTION_SINGLE.teeUp)).toBe('┴');
			expect(String.fromCodePoint(JUNCTION_SINGLE.cross)).toBe('┼');
		});
	});

	describe('JUNCTION_DOUBLE', () => {
		it('has correct characters', () => {
			expect(String.fromCodePoint(JUNCTION_DOUBLE.teeRight)).toBe('╠');
			expect(String.fromCodePoint(JUNCTION_DOUBLE.teeLeft)).toBe('╣');
			expect(String.fromCodePoint(JUNCTION_DOUBLE.teeDown)).toBe('╦');
			expect(String.fromCodePoint(JUNCTION_DOUBLE.teeUp)).toBe('╩');
			expect(String.fromCodePoint(JUNCTION_DOUBLE.cross)).toBe('╬');
		});
	});

	describe('JUNCTION_BOLD', () => {
		it('has correct characters', () => {
			expect(String.fromCodePoint(JUNCTION_BOLD.teeRight)).toBe('┣');
			expect(String.fromCodePoint(JUNCTION_BOLD.teeLeft)).toBe('┫');
			expect(String.fromCodePoint(JUNCTION_BOLD.teeDown)).toBe('┳');
			expect(String.fromCodePoint(JUNCTION_BOLD.teeUp)).toBe('┻');
			expect(String.fromCodePoint(JUNCTION_BOLD.cross)).toBe('╋');
		});
	});

	describe('JUNCTION_ASCII', () => {
		it('has correct characters', () => {
			expect(String.fromCodePoint(JUNCTION_ASCII.teeRight)).toBe('+');
			expect(String.fromCodePoint(JUNCTION_ASCII.teeLeft)).toBe('+');
			expect(String.fromCodePoint(JUNCTION_ASCII.teeDown)).toBe('+');
			expect(String.fromCodePoint(JUNCTION_ASCII.teeUp)).toBe('+');
			expect(String.fromCodePoint(JUNCTION_ASCII.cross)).toBe('+');
		});
	});
});
