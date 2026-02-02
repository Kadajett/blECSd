/**
 * Tests for Double Buffering System
 */

import { describe, expect, it } from 'vitest';
import { createCell, getCell, setCell } from './cell';
import {
	clearBackBuffer,
	clearDirtyRegions,
	coalesceDirtyRegions,
	copyFrontToBack,
	createDoubleBuffer,
	getBackBuffer,
	getDirtyRegions,
	getDoubleBufferStats,
	getFrontBuffer,
	getMinimalUpdates,
	hasDirtyRegions,
	markDirtyRegion,
	markFullRedraw,
	needsFullRedraw,
	resizeDoubleBuffer,
	swapBuffers,
} from './doubleBuffer';

describe('DoubleBuffer', () => {
	describe('createDoubleBuffer', () => {
		it('creates buffer with correct dimensions', () => {
			const db = createDoubleBuffer(80, 24);
			expect(db.width).toBe(80);
			expect(db.height).toBe(24);
		});

		it('creates both front and back buffers', () => {
			const db = createDoubleBuffer(80, 24);
			expect(db.frontBuffer).toBeDefined();
			expect(db.backBuffer).toBeDefined();
			expect(db.frontBuffer.width).toBe(80);
			expect(db.backBuffer.width).toBe(80);
		});

		it('initializes with full redraw flag set', () => {
			const db = createDoubleBuffer(80, 24);
			expect(db.fullRedraw).toBe(true);
		});

		it('uses custom default cell', () => {
			const customCell = createCell('#', 0xff0000ff);
			const db = createDoubleBuffer(10, 10, customCell);
			const back = getBackBuffer(db);
			expect(getCell(back, 0, 0)?.char).toBe('#');
		});
	});

	describe('getBackBuffer/getFrontBuffer', () => {
		it('returns the back buffer', () => {
			const db = createDoubleBuffer(80, 24);
			const back = getBackBuffer(db);
			expect(back).toBe(db.backBuffer);
		});

		it('returns the front buffer', () => {
			const db = createDoubleBuffer(80, 24);
			const front = getFrontBuffer(db);
			expect(front).toBe(db.frontBuffer);
		});
	});

	describe('swapBuffers', () => {
		it('swaps front and back buffers', () => {
			const db = createDoubleBuffer(80, 24);
			const originalFront = db.frontBuffer;
			const originalBack = db.backBuffer;

			swapBuffers(db);

			expect(db.frontBuffer).toBe(originalBack);
			expect(db.backBuffer).toBe(originalFront);
		});

		it('double swap restores original', () => {
			const db = createDoubleBuffer(80, 24);
			const originalFront = db.frontBuffer;
			const originalBack = db.backBuffer;

			swapBuffers(db);
			swapBuffers(db);

			expect(db.frontBuffer).toBe(originalFront);
			expect(db.backBuffer).toBe(originalBack);
		});
	});

	describe('Dirty region tracking', () => {
		it('marks dirty region', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db); // Clear initial full redraw

			markDirtyRegion(db, 10, 5, 20, 10);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 10, y: 5, w: 20, h: 10 });
		});

		it('clamps region to buffer bounds', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, -5, -5, 100, 50);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(1);
			expect(regions[0]?.x).toBe(0);
			expect(regions[0]?.y).toBe(0);
			expect(regions[0]?.w).toBe(80);
			expect(regions[0]?.h).toBe(24);
		});

		it('ignores empty regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 100, 100, 10, 10); // Completely out of bounds

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(0);
		});

		it('tracks multiple regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 0, 0, 10, 10);
			markDirtyRegion(db, 50, 10, 20, 5);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(2);
		});

		it('hasDirtyRegions returns true when dirty', () => {
			const db = createDoubleBuffer(80, 24);
			expect(hasDirtyRegions(db)).toBe(true); // Full redraw initially

			clearDirtyRegions(db);
			expect(hasDirtyRegions(db)).toBe(false);

			markDirtyRegion(db, 0, 0, 10, 10);
			expect(hasDirtyRegions(db)).toBe(true);
		});

		it('clearDirtyRegions clears all tracking', () => {
			const db = createDoubleBuffer(80, 24);
			markDirtyRegion(db, 0, 0, 10, 10);
			markDirtyRegion(db, 20, 20, 10, 10);

			clearDirtyRegions(db);

			expect(getDirtyRegions(db).length).toBe(0);
			expect(db.fullRedraw).toBe(false);
		});
	});

	describe('Full redraw', () => {
		it('markFullRedraw sets flag', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);
			expect(needsFullRedraw(db)).toBe(false);

			markFullRedraw(db);
			expect(needsFullRedraw(db)).toBe(true);
		});

		it('hasDirtyRegions returns true for full redraw', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);
			markFullRedraw(db);

			expect(hasDirtyRegions(db)).toBe(true);
			expect(getDirtyRegions(db).length).toBe(0);
		});
	});

	describe('coalesceDirtyRegions', () => {
		it('merges overlapping regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 0, 0, 10, 10);
			markDirtyRegion(db, 5, 5, 10, 10); // Overlaps with first

			coalesceDirtyRegions(db);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 0, y: 0, w: 15, h: 15 });
		});

		it('merges adjacent regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 0, 0, 10, 10);
			markDirtyRegion(db, 10, 0, 10, 10); // Adjacent to first

			coalesceDirtyRegions(db);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 0, y: 0, w: 20, h: 10 });
		});

		it('keeps separate non-adjacent regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 0, 0, 5, 5);
			markDirtyRegion(db, 50, 10, 5, 5); // Far from first

			coalesceDirtyRegions(db);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(2);
		});

		it('handles single region', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 10, 10, 20, 20);
			coalesceDirtyRegions(db);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(1);
		});

		it('handles empty regions', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			coalesceDirtyRegions(db);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBe(0);
		});
	});

	describe('getMinimalUpdates', () => {
		it('returns all cells for full redraw', () => {
			const db = createDoubleBuffer(10, 10);
			// fullRedraw is true by default

			const updates = getMinimalUpdates(db);
			expect(updates.length).toBe(100); // 10 * 10
		});

		it('returns empty for no dirty regions', () => {
			const db = createDoubleBuffer(10, 10);
			clearDirtyRegions(db);

			const updates = getMinimalUpdates(db);
			expect(updates.length).toBe(0);
		});

		it('returns only changed cells in dirty region', () => {
			const db = createDoubleBuffer(10, 10);
			clearDirtyRegions(db);

			// Modify a cell in back buffer
			const back = getBackBuffer(db);
			setCell(back, 5, 5, createCell('X', 0xff0000ff));

			// Mark just that cell as dirty
			markDirtyRegion(db, 5, 5, 1, 1);

			const updates = getMinimalUpdates(db);
			expect(updates.length).toBe(1);
			expect(updates[0]?.x).toBe(5);
			expect(updates[0]?.y).toBe(5);
			expect(updates[0]?.cell.char).toBe('X');
		});

		it('skips unchanged cells in dirty region', () => {
			const db = createDoubleBuffer(10, 10);

			// Copy front to back to make them identical
			copyFrontToBack(db);
			clearDirtyRegions(db);

			// Mark a region as dirty but don't change anything
			markDirtyRegion(db, 0, 0, 5, 5);

			const updates = getMinimalUpdates(db);
			expect(updates.length).toBe(0);
		});

		it('returns cloned cells', () => {
			const db = createDoubleBuffer(10, 10);
			clearDirtyRegions(db);

			const back = getBackBuffer(db);
			setCell(back, 0, 0, createCell('Y'));
			markDirtyRegion(db, 0, 0, 1, 1);

			const updates = getMinimalUpdates(db);

			// Modify back buffer cell
			setCell(back, 0, 0, createCell('Z'));

			// Update should still have original value
			expect(updates[0]?.cell.char).toBe('Y');
		});
	});

	describe('clearBackBuffer', () => {
		it('clears to default cell', () => {
			const db = createDoubleBuffer(10, 10);
			const back = getBackBuffer(db);
			setCell(back, 5, 5, createCell('X'));

			clearBackBuffer(db);

			expect(getCell(back, 5, 5)?.char).toBe(' ');
		});

		it('clears to custom cell', () => {
			const db = createDoubleBuffer(10, 10);
			clearBackBuffer(db, createCell('#', 0x00ff00ff));

			const back = getBackBuffer(db);
			expect(getCell(back, 0, 0)?.char).toBe('#');
			expect(getCell(back, 0, 0)?.fg).toBe(0x00ff00ff);
		});

		it('sets full redraw flag', () => {
			const db = createDoubleBuffer(10, 10);
			clearDirtyRegions(db);

			clearBackBuffer(db);

			expect(db.fullRedraw).toBe(true);
		});
	});

	describe('copyFrontToBack', () => {
		it('copies front buffer content to back', () => {
			const db = createDoubleBuffer(10, 10);

			// Modify front buffer
			const front = getFrontBuffer(db);
			setCell(front, 3, 3, createCell('F', 0xaabbccdd));

			// Initially back buffer is different
			const backBefore = getBackBuffer(db);
			expect(getCell(backBefore, 3, 3)?.char).toBe(' ');

			copyFrontToBack(db);

			// Now back buffer should match
			const backAfter = getBackBuffer(db);
			expect(getCell(backAfter, 3, 3)?.char).toBe('F');
			expect(getCell(backAfter, 3, 3)?.fg).toBe(0xaabbccdd);
		});
	});

	describe('resizeDoubleBuffer', () => {
		it('creates new buffer with new dimensions', () => {
			const db = createDoubleBuffer(10, 10);
			const resized = resizeDoubleBuffer(db, 20, 15);

			expect(resized.width).toBe(20);
			expect(resized.height).toBe(15);
			expect(resized.frontBuffer.width).toBe(20);
			expect(resized.backBuffer.width).toBe(20);
		});

		it('preserves existing content', () => {
			const db = createDoubleBuffer(10, 10);
			const back = getBackBuffer(db);
			setCell(back, 5, 5, createCell('X'));

			const resized = resizeDoubleBuffer(db, 20, 20);
			const resizedBack = getBackBuffer(resized);

			expect(getCell(resizedBack, 5, 5)?.char).toBe('X');
		});

		it('sets full redraw after resize', () => {
			const db = createDoubleBuffer(10, 10);
			clearDirtyRegions(db);

			const resized = resizeDoubleBuffer(db, 20, 20);

			expect(resized.fullRedraw).toBe(true);
		});

		it('fills new area with custom cell', () => {
			const db = createDoubleBuffer(10, 10);
			const resized = resizeDoubleBuffer(db, 20, 20, createCell('#'));

			const back = getBackBuffer(resized);
			expect(getCell(back, 15, 15)?.char).toBe('#');
		});
	});

	describe('getDoubleBufferStats', () => {
		it('returns correct statistics', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);

			markDirtyRegion(db, 0, 0, 10, 10);
			markDirtyRegion(db, 50, 10, 5, 5); // Use coords that don't get clamped

			const stats = getDoubleBufferStats(db);

			expect(stats.width).toBe(80);
			expect(stats.height).toBe(24);
			expect(stats.totalCells).toBe(80 * 24);
			expect(stats.dirtyRegionCount).toBe(2);
			expect(stats.dirtyAreaTotal).toBe(125); // 100 + 25
			expect(stats.needsFullRedraw).toBe(false);
		});

		it('reflects full redraw state', () => {
			const db = createDoubleBuffer(80, 24);
			const stats = getDoubleBufferStats(db);

			expect(stats.needsFullRedraw).toBe(true);
		});
	});
});
