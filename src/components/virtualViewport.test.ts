/**
 * Tests for VirtualViewport component
 */

import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	clearViewportDirty,
	ensureCursorVisible,
	getCursorLine,
	getScrollInfo,
	getSelectedLine,
	getVirtualViewport,
	getVisibleRange,
	hasVirtualViewport,
	invalidateViewport,
	isLineInRenderRange,
	isLineVisible,
	isViewportDirty,
	moveCursor,
	scrollByLines,
	scrollByPages,
	scrollToBottom,
	scrollToLine,
	scrollToTop,
	setCursorLine,
	setOverscan,
	setSelectedLine,
	setTotalLineCount,
	setVirtualViewport,
	setVisibleLineCount,
} from './virtualViewport';

describe('VirtualViewport', () => {
	describe('setVirtualViewport', () => {
		it('creates component with defaults', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {});

			expect(hasVirtualViewport(world, eid)).toBe(true);

			const data = getVirtualViewport(world, eid);
			expect(data?.firstVisibleLine).toBe(0);
			expect(data?.visibleLineCount).toBe(0);
			expect(data?.totalLineCount).toBe(0);
			expect(data?.overscanBefore).toBe(5);
			expect(data?.overscanAfter).toBe(5);
			expect(data?.isDirty).toBe(true);
		});

		it('creates component with options', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 100,
				overscanBefore: 10,
				overscanAfter: 10,
			});

			const data = getVirtualViewport(world, eid);
			expect(data?.totalLineCount).toBe(1000);
			expect(data?.visibleLineCount).toBe(25);
			expect(data?.firstVisibleLine).toBe(100);
			expect(data?.overscanBefore).toBe(10);
			expect(data?.overscanAfter).toBe(10);
		});

		it('clamps firstVisibleLine to valid bounds', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
				firstVisibleLine: 90, // Would show past end
			});

			const data = getVirtualViewport(world, eid);
			expect(data?.firstVisibleLine).toBe(75); // Clamped to 100 - 25
		});
	});

	describe('getVisibleRange', () => {
		it('returns range with overscan', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 100,
				overscanBefore: 5,
				overscanAfter: 5,
			});

			const range = getVisibleRange(world, eid);

			expect(range?.start).toBe(95); // 100 - 5
			expect(range?.end).toBe(130); // 100 + 25 + 5
			expect(range?.visibleStart).toBe(100);
			expect(range?.visibleEnd).toBe(125);
			expect(range?.count).toBe(35);
		});

		it('clamps at boundaries', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
				firstVisibleLine: 0,
				overscanBefore: 10,
				overscanAfter: 10,
			});

			const range = getVisibleRange(world, eid);

			expect(range?.start).toBe(0); // Clamped, not -10
			expect(range?.end).toBe(35); // 0 + 25 + 10
		});

		it('returns undefined for entity without component', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getVisibleRange(world, eid)).toBeUndefined();
		});
	});

	describe('isLineVisible / isLineInRenderRange', () => {
		it('checks visibility correctly', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 100,
				overscanBefore: 5,
				overscanAfter: 5,
			});

			// Visible lines (100-124)
			expect(isLineVisible(world, eid, 100)).toBe(true);
			expect(isLineVisible(world, eid, 112)).toBe(true);
			expect(isLineVisible(world, eid, 124)).toBe(true);

			// Not visible (in overscan)
			expect(isLineVisible(world, eid, 95)).toBe(false);
			expect(isLineVisible(world, eid, 125)).toBe(false);

			// In render range (95-129)
			expect(isLineInRenderRange(world, eid, 95)).toBe(true);
			expect(isLineInRenderRange(world, eid, 129)).toBe(true);
			expect(isLineInRenderRange(world, eid, 94)).toBe(false);
			expect(isLineInRenderRange(world, eid, 130)).toBe(false);
		});
	});

	describe('scrolling', () => {
		describe('scrollToLine', () => {
			it('centers line in viewport', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
				});

				scrollToLine(world, eid, 500);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(488); // 500 - floor(25/2)
			});

			it('clamps at start', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
				});

				scrollToLine(world, eid, 5);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(0);
			});
		});

		describe('scrollByLines', () => {
			it('scrolls down', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 100,
				});

				scrollByLines(world, eid, 10);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(110);
			});

			it('scrolls up', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 100,
				});

				scrollByLines(world, eid, -20);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(80);
			});

			it('clamps at boundaries', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
					firstVisibleLine: 50,
				});

				scrollByLines(world, eid, -100);
				expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(0);

				scrollByLines(world, eid, 200);
				expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(75);
			});
		});

		describe('scrollByPages', () => {
			it('scrolls by page size', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 100,
				});

				scrollByPages(world, eid, 1);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(124); // 100 + (25 - 1)
			});

			it('scrolls up by pages', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 100,
				});

				scrollByPages(world, eid, -1);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(76); // 100 - (25 - 1)
			});
		});

		describe('scrollToTop / scrollToBottom', () => {
			it('scrolls to top', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 500,
				});

				scrollToTop(world, eid);

				expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(0);
			});

			it('scrolls to bottom', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 1000,
					visibleLineCount: 25,
					firstVisibleLine: 0,
				});

				scrollToBottom(world, eid);

				expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(975);
			});
		});
	});

	describe('getScrollInfo', () => {
		it('returns scroll information', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 487, // ~50%
			});

			const info = getScrollInfo(world, eid);

			expect(info?.currentLine).toBe(487);
			expect(info?.totalLines).toBe(1000);
			expect(info?.viewportSize).toBe(25);
			expect(info?.maxScrollLine).toBe(975);
			expect(info?.scrollPercent).toBeCloseTo(50, 0);
			expect(info?.atTop).toBe(false);
			expect(info?.atBottom).toBe(false);
		});

		it('reports atTop correctly', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 0,
			});

			const info = getScrollInfo(world, eid);
			expect(info?.atTop).toBe(true);
			expect(info?.atBottom).toBe(false);
		});

		it('reports atBottom correctly', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 1000,
				visibleLineCount: 25,
				firstVisibleLine: 975,
			});

			const info = getScrollInfo(world, eid);
			expect(info?.atTop).toBe(false);
			expect(info?.atBottom).toBe(true);
		});
	});

	describe('content updates', () => {
		it('updates total line count', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
				firstVisibleLine: 80, // At position that will be invalid after update
			});

			// Reduce content - should clamp scroll position
			setTotalLineCount(world, eid, 50);

			expect(getVirtualViewport(world, eid)?.totalLineCount).toBe(50);
			expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(25); // Clamped
		});

		it('updates visible line count', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
				firstVisibleLine: 80,
			});

			setVisibleLineCount(world, eid, 50);

			expect(getVirtualViewport(world, eid)?.visibleLineCount).toBe(50);
			expect(getVirtualViewport(world, eid)?.firstVisibleLine).toBe(50); // Clamped
		});

		it('updates overscan', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
			});

			setOverscan(world, eid, 10, 15);

			const data = getVirtualViewport(world, eid);
			expect(data?.overscanBefore).toBe(10);
			expect(data?.overscanAfter).toBe(15);
		});
	});

	describe('selection / cursor (interactive lists)', () => {
		describe('selection', () => {
			it('sets and gets selected line', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, { totalLineCount: 100 });

				setSelectedLine(world, eid, 50);
				expect(getSelectedLine(world, eid)).toBe(50);

				setSelectedLine(world, eid, -1);
				expect(getSelectedLine(world, eid)).toBe(-1);
			});
		});

		describe('cursor', () => {
			it('sets and gets cursor line', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, { totalLineCount: 100 });

				setCursorLine(world, eid, 25);
				expect(getCursorLine(world, eid)).toBe(25);
			});

			it('moves cursor with moveCursor', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
				});

				setCursorLine(world, eid, 50);
				moveCursor(world, eid, 5);
				expect(getCursorLine(world, eid)).toBe(55);

				moveCursor(world, eid, -10);
				expect(getCursorLine(world, eid)).toBe(45);
			});

			it('clamps cursor at boundaries', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
				});

				setCursorLine(world, eid, 5);
				moveCursor(world, eid, -100);
				expect(getCursorLine(world, eid)).toBe(0);

				moveCursor(world, eid, 200);
				expect(getCursorLine(world, eid)).toBe(99);
			});

			it('auto-scrolls when cursor moves out of view', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
					firstVisibleLine: 0,
				});

				// Move cursor below viewport
				setCursorLine(world, eid, 30);
				ensureCursorVisible(world, eid);

				const data = getVirtualViewport(world, eid);
				// Should scroll so cursor (30) is at bottom of viewport
				expect(data?.firstVisibleLine).toBe(6); // 30 - 25 + 1
			});

			it('auto-scrolls when cursor moves above view', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
					firstVisibleLine: 50,
				});

				// Move cursor above viewport
				setCursorLine(world, eid, 40);
				ensureCursorVisible(world, eid);

				const data = getVirtualViewport(world, eid);
				expect(data?.firstVisibleLine).toBe(40);
			});

			it('moveCursor initializes cursor from -1', () => {
				const world = createWorld();
				const eid = addEntity(world);

				setVirtualViewport(world, eid, {
					totalLineCount: 100,
					visibleLineCount: 25,
				});

				// Cursor starts at -1
				expect(getCursorLine(world, eid)).toBe(-1);

				// First move should start at 0
				moveCursor(world, eid, 1);
				expect(getCursorLine(world, eid)).toBe(1);
			});
		});
	});

	describe('dirty flag', () => {
		it('starts dirty after creation', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {});

			expect(isViewportDirty(world, eid)).toBe(true);
		});

		it('clears dirty flag', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {});
			clearViewportDirty(world, eid);

			expect(isViewportDirty(world, eid)).toBe(false);
		});

		it('marks dirty on scroll', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 25,
			});
			clearViewportDirty(world, eid);

			scrollByLines(world, eid, 5);

			expect(isViewportDirty(world, eid)).toBe(true);
		});

		it('invalidateViewport forces dirty', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setVirtualViewport(world, eid, {});
			clearViewportDirty(world, eid);

			invalidateViewport(world, eid);

			expect(isViewportDirty(world, eid)).toBe(true);
		});
	});
});
