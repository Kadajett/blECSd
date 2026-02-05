/**
 * Tests for Screen component
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { Entity, World } from '../core/types';
import {
	CursorShape,
	destroyScreen,
	getScreen,
	getScreenCursor,
	getScreenData,
	getScreenFocus,
	getScreenHover,
	getScreenSize,
	hasScreen,
	hasScreenSingleton,
	isAutoPadding,
	isFullUnicode,
	isScreen,
	resetScreenSingleton,
	resizeScreen,
	setAutoPadding,
	setFullUnicode,
	setScreenCursor,
	setScreenCursorShape,
	setScreenCursorVisible,
	setScreenFocus,
	setScreenHover,
} from './screen';

describe('Screen Component', () => {
	let world: World;

	afterEach(() => {
		// Clean up singleton state
		if (world) {
			resetScreenSingleton(world);
		}
	});

	describe('CursorShape', () => {
		it('defines all cursor shapes', () => {
			expect(CursorShape.BLOCK).toBe(0);
			expect(CursorShape.UNDERLINE).toBe(1);
			expect(CursorShape.BAR).toBe(2);
			expect(CursorShape.BLINKING_BLOCK).toBe(3);
			expect(CursorShape.BLINKING_UNDERLINE).toBe(4);
			expect(CursorShape.BLINKING_BAR).toBe(5);
		});
	});

	describe('Screen singleton', () => {
		it('registers screen entity', () => {
			world = createWorld();
			expect(hasScreenSingleton(world)).toBe(false);

			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(hasScreenSingleton(world)).toBe(true);
			expect(getScreen(world)).toBe(screen);
		});

		it('throws when creating second screen', () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });

			expect(() => {
				createScreenEntity(world, { width: 100, height: 30 });
			}).toThrow('A screen already exists');
		});

		it('allows new screen after destroy', () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });
			destroyScreen(world);

			// Should not throw
			const screen2 = createScreenEntity(world, { width: 100, height: 30 });
			expect(screen2).toBeDefined();
		});

		it('isScreen identifies screen entity', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(isScreen(world, screen)).toBe(true);
			expect(isScreen(world, 999 as Entity)).toBe(false);
		});
	});

	describe('Screen component', () => {
		it('hasScreen returns true for screen entity', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(hasScreen(world, screen)).toBe(true);
		});

		it('hasScreen returns false for non-screen entity', () => {
			world = createWorld();
			expect(hasScreen(world, 999 as Entity)).toBe(false);
		});
	});

	describe('Cursor functions', () => {
		it('gets default cursor state', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			const cursor = getScreenCursor(world, screen);
			expect(cursor).toBeDefined();
			expect(cursor?.x).toBe(0);
			expect(cursor?.y).toBe(0);
			expect(cursor?.visible).toBe(true);
			expect(cursor?.shape).toBe(CursorShape.BLOCK);
		});

		it('sets cursor position', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenCursor(world, screen, 10, 5);

			const cursor = getScreenCursor(world, screen);
			expect(cursor?.x).toBe(10);
			expect(cursor?.y).toBe(5);
		});

		it('clamps negative cursor position', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenCursor(world, screen, -5, -10);

			const cursor = getScreenCursor(world, screen);
			expect(cursor?.x).toBe(0);
			expect(cursor?.y).toBe(0);
		});

		it('sets cursor visibility', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenCursorVisible(world, screen, false);
			expect(getScreenCursor(world, screen)?.visible).toBe(false);

			setScreenCursorVisible(world, screen, true);
			expect(getScreenCursor(world, screen)?.visible).toBe(true);
		});

		it('sets cursor shape', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenCursorShape(world, screen, CursorShape.UNDERLINE);
			expect(getScreenCursor(world, screen)?.shape).toBe(CursorShape.UNDERLINE);

			setScreenCursorShape(world, screen, CursorShape.BAR);
			expect(getScreenCursor(world, screen)?.shape).toBe(CursorShape.BAR);
		});

		it('returns undefined for non-screen entity', () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });
			expect(getScreenCursor(world, 999 as Entity)).toBeUndefined();
		});
	});

	describe('Focus functions', () => {
		it('gets null focus by default', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(getScreenFocus(world, screen)).toBeNull();
		});

		it('sets and gets focused entity', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenFocus(world, screen, 42 as Entity);
			expect(getScreenFocus(world, screen)).toBe(42);
		});

		it('clears focus with null', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenFocus(world, screen, 42 as Entity);
			setScreenFocus(world, screen, null);
			expect(getScreenFocus(world, screen)).toBeNull();
		});
	});

	describe('Hover functions', () => {
		it('gets null hover by default', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(getScreenHover(world, screen)).toBeNull();
		});

		it('sets and gets hovered entity', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenHover(world, screen, 99 as Entity);
			expect(getScreenHover(world, screen)).toBe(99);
		});

		it('clears hover with null', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setScreenHover(world, screen, 99 as Entity);
			setScreenHover(world, screen, null);
			expect(getScreenHover(world, screen)).toBeNull();
		});
	});

	describe('Screen size', () => {
		it('gets screen size', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 120, height: 40 });

			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(120);
			expect(size?.height).toBe(40);
		});

		it('resizes screen', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			resizeScreen(world, screen, 120, 40);

			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(120);
			expect(size?.height).toBe(40);
		});

		it('rejects invalid resize dimensions', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			expect(resizeScreen(world, screen, 0, 40)).toBe(false);
			expect(resizeScreen(world, screen, 80, -1)).toBe(false);

			// Size unchanged
			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(80);
			expect(size?.height).toBe(24);
		});
	});

	describe('Unicode and padding settings', () => {
		it('fullUnicode is enabled by default', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(isFullUnicode(world, screen)).toBe(true);
		});

		it('can disable fullUnicode', () => {
			world = createWorld();
			const screen = createScreenEntity(world, {
				width: 80,
				height: 24,
				fullUnicode: false,
			});
			expect(isFullUnicode(world, screen)).toBe(false);
		});

		it('sets fullUnicode', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setFullUnicode(world, screen, false);
			expect(isFullUnicode(world, screen)).toBe(false);

			setFullUnicode(world, screen, true);
			expect(isFullUnicode(world, screen)).toBe(true);
		});

		it('autoPadding is disabled by default', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });
			expect(isAutoPadding(world, screen)).toBe(false);
		});

		it('can enable autoPadding', () => {
			world = createWorld();
			const screen = createScreenEntity(world, {
				width: 80,
				height: 24,
				autoPadding: true,
			});
			expect(isAutoPadding(world, screen)).toBe(true);
		});

		it('sets autoPadding', () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			setAutoPadding(world, screen, true);
			expect(isAutoPadding(world, screen)).toBe(true);

			setAutoPadding(world, screen, false);
			expect(isAutoPadding(world, screen)).toBe(false);
		});
	});

	describe('getScreenData', () => {
		it('returns complete screen data', () => {
			world = createWorld();
			const screen = createScreenEntity(world, {
				width: 80,
				height: 24,
				cursorShape: CursorShape.UNDERLINE,
			});

			setScreenCursor(world, screen, 10, 5);
			setScreenFocus(world, screen, 42 as Entity);
			setScreenHover(world, screen, 99 as Entity);

			const data = getScreenData(world, screen);
			expect(data).toBeDefined();
			expect(data?.width).toBe(80);
			expect(data?.height).toBe(24);
			expect(data?.cursor.x).toBe(10);
			expect(data?.cursor.y).toBe(5);
			expect(data?.cursor.visible).toBe(true);
			expect(data?.cursor.shape).toBe(CursorShape.UNDERLINE);
			expect(data?.focused).toBe(42);
			expect(data?.hovered).toBe(99);
			expect(data?.fullUnicode).toBe(true);
			expect(data?.autoPadding).toBe(false);
		});

		it('returns undefined for non-screen entity', () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });
			expect(getScreenData(world, 999 as Entity)).toBeUndefined();
		});
	});

	describe('Config options', () => {
		it('respects cursorVisible config', () => {
			world = createWorld();
			const screen = createScreenEntity(world, {
				width: 80,
				height: 24,
				cursorVisible: false,
			});
			expect(getScreenCursor(world, screen)?.visible).toBe(false);
		});

		it('respects cursorShape config', () => {
			world = createWorld();
			const screen = createScreenEntity(world, {
				width: 80,
				height: 24,
				cursorShape: CursorShape.BAR,
			});
			expect(getScreenCursor(world, screen)?.shape).toBe(CursorShape.BAR);
		});
	});

	describe('destroyScreen', () => {
		it('removes screen singleton', () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });
			expect(hasScreenSingleton(world)).toBe(true);

			destroyScreen(world);
			expect(hasScreenSingleton(world)).toBe(false);
			expect(getScreen(world)).toBeNull();
		});

		it('returns false if no screen exists', () => {
			world = createWorld();
			expect(destroyScreen(world)).toBe(false);
		});
	});
});
