/**
 * Tests for scrollbar component.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { ScrollbarRenderCell } from './scrollbar';
import {
	calculateHorizontalScrollbar,
	calculateVerticalScrollbar,
	DEFAULT_THUMB_CHAR,
	DEFAULT_THUMB_COLOR,
	DEFAULT_TRACK_CHAR,
	DEFAULT_TRACK_CHAR_H,
	DEFAULT_TRACK_COLOR,
	disableScrollbar,
	enableScrollbar,
	getScrollbar,
	hasScrollbar,
	isScrollbarEnabled,
	Scrollbar,
	setScrollbar,
	setScrollbarChars,
	setScrollbarColors,
	shouldShowHorizontalScrollbar,
	shouldShowVerticalScrollbar,
} from './scrollbar';

describe('Scrollbar component', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld();
		entity = addEntity(world);
	});

	describe('setScrollbar', () => {
		it('should add scrollbar component with default values', () => {
			setScrollbar(world, entity, { enabled: true });

			expect(hasScrollbar(world, entity)).toBe(true);
			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar).toBeDefined();
			expect(scrollbar?.enabled).toBe(true);
			expect(scrollbar?.vertical).toBe(true);
			expect(scrollbar?.horizontal).toBe(true);
			expect(scrollbar?.trackChar).toBe(DEFAULT_TRACK_CHAR);
			expect(scrollbar?.thumbChar).toBe(DEFAULT_THUMB_CHAR);
			expect(scrollbar?.trackColor).toBe(DEFAULT_TRACK_COLOR);
			expect(scrollbar?.thumbColor).toBe(DEFAULT_THUMB_COLOR);
		});

		it('should set custom scrollbar options', () => {
			setScrollbar(world, entity, {
				enabled: true,
				thumbColor: '#ff0000',
				trackColor: '#333333',
				alwaysShow: true,
			});

			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar?.thumbColor).toBe(0xffff0000);
			expect(scrollbar?.trackColor).toBe(0xff333333);
			expect(scrollbar?.alwaysShow).toBe(true);
		});

		it('should update existing scrollbar', () => {
			setScrollbar(world, entity, { enabled: true });
			setScrollbar(world, entity, { vertical: false });

			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar?.enabled).toBe(true);
			expect(scrollbar?.vertical).toBe(false);
		});

		it('should return entity for chaining', () => {
			const result = setScrollbar(world, entity, { enabled: true });
			expect(result).toBe(entity);
		});
	});

	describe('getScrollbar', () => {
		it('should return undefined if no scrollbar component', () => {
			expect(getScrollbar(world, entity)).toBeUndefined();
		});

		it('should return scrollbar data', () => {
			setScrollbar(world, entity, {
				enabled: true,
				thumbColor: 0xffaabbcc,
			});

			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar).toBeDefined();
			expect(scrollbar?.thumbColor).toBe(0xffaabbcc);
		});
	});

	describe('hasScrollbar', () => {
		it('should return false if no scrollbar component', () => {
			expect(hasScrollbar(world, entity)).toBe(false);
		});

		it('should return true if scrollbar component exists', () => {
			setScrollbar(world, entity, { enabled: true });
			expect(hasScrollbar(world, entity)).toBe(true);
		});
	});

	describe('isScrollbarEnabled', () => {
		it('should return false if no scrollbar component', () => {
			expect(isScrollbarEnabled(world, entity)).toBe(false);
		});

		it('should return true if scrollbar is enabled', () => {
			setScrollbar(world, entity, { enabled: true });
			expect(isScrollbarEnabled(world, entity)).toBe(true);
		});

		it('should return false if scrollbar is disabled', () => {
			setScrollbar(world, entity, { enabled: false });
			expect(isScrollbarEnabled(world, entity)).toBe(false);
		});
	});

	describe('enableScrollbar / disableScrollbar', () => {
		it('should enable scrollbar', () => {
			setScrollbar(world, entity, { enabled: false });
			enableScrollbar(world, entity);

			expect(isScrollbarEnabled(world, entity)).toBe(true);
		});

		it('should disable scrollbar', () => {
			setScrollbar(world, entity, { enabled: true });
			disableScrollbar(world, entity);

			expect(isScrollbarEnabled(world, entity)).toBe(false);
		});

		it('should create component if not exists when enabling', () => {
			enableScrollbar(world, entity);
			expect(hasScrollbar(world, entity)).toBe(true);
			expect(isScrollbarEnabled(world, entity)).toBe(true);
		});
	});

	describe('setScrollbarChars', () => {
		it('should set scrollbar characters', () => {
			setScrollbarChars(world, entity, 0x007c, 0x0023); // | and #

			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar?.trackChar).toBe(0x007c);
			expect(scrollbar?.thumbChar).toBe(0x0023);
		});

		it('should create component if not exists', () => {
			setScrollbarChars(world, entity, 0x007c, 0x0023);
			expect(hasScrollbar(world, entity)).toBe(true);
		});
	});

	describe('setScrollbarColors', () => {
		it('should set scrollbar colors', () => {
			setScrollbarColors(world, entity, '#123456', 0xffaabbcc);

			const scrollbar = getScrollbar(world, entity);
			expect(scrollbar?.trackColor).toBe(0xff123456);
			expect(scrollbar?.thumbColor).toBe(0xffaabbcc);
		});
	});

	describe('calculateVerticalScrollbar', () => {
		it('should return empty array if height is zero', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				0, // height = 0
				0,
				100,
				20,
				DEFAULT_TRACK_CHAR,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells).toEqual([]);
		});

		it('should return empty array if content fits in viewport', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				0,
				100, // scrollSize
				100, // viewportSize = scrollSize, no scrolling needed
				DEFAULT_TRACK_CHAR,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells).toEqual([]);
		});

		it('should calculate scrollbar for content larger than viewport', () => {
			const cells = calculateVerticalScrollbar(
				10,
				5,
				20, // height
				0, // scrollOffset
				1000, // scrollSize
				200, // viewportSize
				DEFAULT_TRACK_CHAR,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells.length).toBe(20); // height
			expect(cells[0]?.x).toBe(10);
			expect(cells[0]?.y).toBe(5);

			// Check that some cells are thumb, some are track
			const thumbCells = cells.filter((c) => c.isThumb);
			const trackCells = cells.filter((c) => !c.isThumb);

			expect(thumbCells.length).toBeGreaterThan(0);
			expect(trackCells.length).toBeGreaterThan(0);
			expect(thumbCells.length + trackCells.length).toBe(20);
		});

		it('should position thumb based on scroll offset', () => {
			// Scrolled to middle
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				400, // scrollOffset = 50% of scrollable range (800)
				1000,
				200,
				DEFAULT_TRACK_CHAR,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			const thumbCells = cells.filter((c) => c.isThumb);
			const firstThumbIndex = cells.findIndex((c) => c.isThumb);

			// Thumb should be roughly in the middle
			expect(firstThumbIndex).toBeGreaterThan(5);
			expect(firstThumbIndex).toBeLessThan(15);
			expect(thumbCells.length).toBeGreaterThan(0);
		});

		it('should use correct character for thumb and track', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				0,
				1000,
				200,
				0x007c,
				0x0023,
				0xff000000,
				0xffffffff,
			);

			const thumbCells = cells.filter((c) => c.isThumb);
			const trackCells = cells.filter((c) => !c.isThumb);

			expect(thumbCells[0]?.char).toBe(0x0023);
			expect(trackCells[0]?.char).toBe(0x007c);
		});

		it('should use correct colors for thumb and track', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				0,
				1000,
				200,
				0x007c,
				0x0023,
				0xff111111,
				0xff222222,
			);

			const thumbCells = cells.filter((c) => c.isThumb);
			const trackCells = cells.filter((c) => !c.isThumb);

			expect(thumbCells[0]?.color).toBe(0xff222222);
			expect(trackCells[0]?.color).toBe(0xff111111);
		});
	});

	describe('calculateHorizontalScrollbar', () => {
		it('should return empty array if width is zero', () => {
			const cells = calculateHorizontalScrollbar(
				0,
				10,
				0, // width = 0
				0,
				100,
				20,
				DEFAULT_TRACK_CHAR_H,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells).toEqual([]);
		});

		it('should return empty array if content fits in viewport', () => {
			const cells = calculateHorizontalScrollbar(
				0,
				10,
				80,
				0,
				100,
				100, // viewportSize = scrollSize
				DEFAULT_TRACK_CHAR_H,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells).toEqual([]);
		});

		it('should calculate horizontal scrollbar', () => {
			const cells = calculateHorizontalScrollbar(
				5,
				10,
				80,
				0,
				1000,
				200,
				DEFAULT_TRACK_CHAR_H,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			expect(cells.length).toBe(80); // width
			expect(cells[0]?.x).toBe(5);
			expect(cells[0]?.y).toBe(10);

			const thumbCells = cells.filter((c) => c.isThumb);
			const trackCells = cells.filter((c) => !c.isThumb);

			expect(thumbCells.length).toBeGreaterThan(0);
			expect(trackCells.length).toBeGreaterThan(0);
		});

		it('should position thumb based on horizontal scroll offset', () => {
			const cells = calculateHorizontalScrollbar(
				0,
				10,
				80,
				400, // 50% of scrollable range
				1000,
				200,
				DEFAULT_TRACK_CHAR_H,
				DEFAULT_THUMB_CHAR,
				DEFAULT_TRACK_COLOR,
				DEFAULT_THUMB_COLOR,
			);

			const firstThumbIndex = cells.findIndex((c) => c.isThumb);

			// Thumb should be roughly in the middle
			expect(firstThumbIndex).toBeGreaterThan(20);
			expect(firstThumbIndex).toBeLessThan(60);
		});
	});

	describe('shouldShowVerticalScrollbar', () => {
		it('should return false if content fits', () => {
			expect(shouldShowVerticalScrollbar(100, 100, false)).toBe(false);
			expect(shouldShowVerticalScrollbar(50, 100, false)).toBe(false);
		});

		it('should return true if content overflows', () => {
			expect(shouldShowVerticalScrollbar(200, 100, false)).toBe(true);
		});

		it('should return true if alwaysShow is true', () => {
			expect(shouldShowVerticalScrollbar(50, 100, true)).toBe(true);
			expect(shouldShowVerticalScrollbar(100, 100, true)).toBe(true);
		});
	});

	describe('shouldShowHorizontalScrollbar', () => {
		it('should return false if content fits', () => {
			expect(shouldShowHorizontalScrollbar(100, 100, false)).toBe(false);
			expect(shouldShowHorizontalScrollbar(50, 100, false)).toBe(false);
		});

		it('should return true if content overflows', () => {
			expect(shouldShowHorizontalScrollbar(200, 100, false)).toBe(true);
		});

		it('should return true if alwaysShow is true', () => {
			expect(shouldShowHorizontalScrollbar(50, 100, true)).toBe(true);
		});
	});

	describe('Scrollbar component direct access', () => {
		it('should store values in component arrays', () => {
			setScrollbar(world, entity, {
				enabled: true,
				vertical: false,
				trackChar: 0x007c,
			});

			expect(Scrollbar.enabled[entity]).toBe(1);
			expect(Scrollbar.vertical[entity]).toBe(0);
			expect(Scrollbar.trackChar[entity]).toBe(0x007c);
		});
	});

	describe('edge cases', () => {
		it('should handle scrollbar at top', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				0,
				1000,
				200,
				0x007c,
				0x0023,
				0xff000000,
				0xffffffff,
			);

			const firstThumbIndex = cells.findIndex((c) => c.isThumb);
			expect(firstThumbIndex).toBe(0); // Thumb starts at top
		});

		it('should handle scrollbar at bottom', () => {
			const cells = calculateVerticalScrollbar(
				10,
				0,
				20,
				800, // scrolled to bottom (scrollable range = 1000 - 200 = 800)
				1000,
				200,
				0x007c,
				0x0023,
				0xff000000,
				0xffffffff,
			);

			const lastThumbIndex = cells.reverse().findIndex((c: ScrollbarRenderCell) => c.isThumb);
			expect(lastThumbIndex).toBeGreaterThanOrEqual(0);
			expect(lastThumbIndex).toBeLessThan(5); // Thumb ends near bottom
		});

		it('should handle minimum thumb size', () => {
			// Very small viewport relative to content
			const cells = calculateVerticalScrollbar(
				10,
				0,
				100, // height
				0,
				10000, // very large scroll size
				100, // small viewport
				0x007c,
				0x0023,
				0xff000000,
				0xffffffff,
			);

			const thumbCells = cells.filter((c) => c.isThumb);
			// Thumb should be at least 1 cell
			expect(thumbCells.length).toBeGreaterThanOrEqual(1);
		});
	});
});
