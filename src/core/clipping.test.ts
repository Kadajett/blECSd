/**
 * Tests for Element Clipping System
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { resetScreenSingleton } from '../components/screen';
import { addEntity, createWorld } from '../core/ecs';
import { layoutSystem } from '../systems/layoutSystem';
import type { ClipRect } from './clipping';
import {
	clampToClipRect,
	createClipRect,
	createClipStack,
	createInfiniteClipRect,
	getClipping,
	getClipRect,
	getClipRectHeight,
	getClipRectWidth,
	getCurrentClip,
	getOverflow,
	hasClipping,
	intersectClipRects,
	isClipRectEmpty,
	isPointVisible,
	isRectVisible,
	Overflow,
	popClipRect,
	pushClipRect,
	setOverflow,
	shouldClipContent,
} from './clipping';
import { createScreenEntity } from './entities';
import type { World } from './types';

describe('clipping', () => {
	let world: World;
	let screen: number;

	beforeEach(() => {
		world = createWorld() as World;
		resetScreenSingleton(world);
		screen = createScreenEntity(world, { width: 80, height: 24 });
	});

	describe('Overflow constants', () => {
		it('has correct values', () => {
			expect(Overflow.HIDDEN).toBe(0);
			expect(Overflow.VISIBLE).toBe(1);
			expect(Overflow.SCROLL).toBe(2);
		});
	});

	describe('setOverflow / getOverflow', () => {
		it('sets overflow with single value', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, Overflow.HIDDEN);

			expect(getOverflow(world, entity)).toBe(Overflow.HIDDEN);
		});

		it('sets overflow with options object', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, { overflow: Overflow.SCROLL });

			expect(getOverflow(world, entity)).toBe(Overflow.SCROLL);
		});

		it('sets independent overflow per axis', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, {
				overflowX: Overflow.SCROLL,
				overflowY: Overflow.HIDDEN,
			});

			const clipping = getClipping(world, entity);
			expect(clipping?.overflowX).toBe(Overflow.SCROLL);
			expect(clipping?.overflowY).toBe(Overflow.HIDDEN);
		});

		it('returns HIDDEN for entities without Clipping component', () => {
			const entity = addEntity(world);
			expect(getOverflow(world, entity)).toBe(Overflow.HIDDEN);
		});

		it('returns entity for chaining', () => {
			const entity = addEntity(world);
			const result = setOverflow(world, entity, Overflow.VISIBLE);
			expect(result).toBe(entity);
		});
	});

	describe('hasClipping', () => {
		it('returns false for entity without Clipping', () => {
			const entity = addEntity(world);
			expect(hasClipping(world, entity)).toBe(false);
		});

		it('returns true after setting overflow', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, Overflow.HIDDEN);
			expect(hasClipping(world, entity)).toBe(true);
		});
	});

	describe('getClipping', () => {
		it('returns undefined for entity without Clipping', () => {
			const entity = addEntity(world);
			expect(getClipping(world, entity)).toBeUndefined();
		});

		it('returns full clipping data', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, {
				overflow: Overflow.HIDDEN,
				overflowX: Overflow.SCROLL,
				overflowY: Overflow.VISIBLE,
			});

			const clipping = getClipping(world, entity);
			expect(clipping).toEqual({
				overflow: Overflow.HIDDEN,
				overflowX: Overflow.SCROLL,
				overflowY: Overflow.VISIBLE,
			});
		});
	});

	describe('createClipRect', () => {
		it('creates clip rect from bounds', () => {
			const rect = createClipRect(10, 20, 30, 40);

			expect(rect.x1).toBe(10);
			expect(rect.y1).toBe(20);
			expect(rect.x2).toBe(40); // x + width
			expect(rect.y2).toBe(60); // y + height
		});
	});

	describe('createInfiniteClipRect', () => {
		it('creates infinite bounds', () => {
			const rect = createInfiniteClipRect();

			expect(rect.x1).toBe(-Infinity);
			expect(rect.y1).toBe(-Infinity);
			expect(rect.x2).toBe(Infinity);
			expect(rect.y2).toBe(Infinity);
		});
	});

	describe('isClipRectEmpty', () => {
		it('returns false for valid rect', () => {
			const rect = createClipRect(0, 0, 10, 10);
			expect(isClipRectEmpty(rect)).toBe(false);
		});

		it('returns true for zero-width rect', () => {
			const rect = createClipRect(10, 0, 0, 10);
			expect(isClipRectEmpty(rect)).toBe(true);
		});

		it('returns true for zero-height rect', () => {
			const rect = createClipRect(0, 10, 10, 0);
			expect(isClipRectEmpty(rect)).toBe(true);
		});

		it('returns true for inverted rect', () => {
			const rect: ClipRect = { x1: 20, y1: 20, x2: 10, y2: 10 };
			expect(isClipRectEmpty(rect)).toBe(true);
		});
	});

	describe('isPointVisible', () => {
		it('returns true for point inside rect', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 15, 15)).toBe(true);
		});

		it('returns true for point on left edge', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 10, 15)).toBe(true);
		});

		it('returns true for point on top edge', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 15, 10)).toBe(true);
		});

		it('returns false for point on right edge (exclusive)', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 30, 15)).toBe(false);
		});

		it('returns false for point on bottom edge (exclusive)', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 15, 30)).toBe(false);
		});

		it('returns false for point outside', () => {
			const rect = createClipRect(10, 10, 20, 20);
			expect(isPointVisible(rect, 5, 5)).toBe(false);
		});
	});

	describe('isRectVisible', () => {
		it('returns true for overlapping rects', () => {
			const clipRect = createClipRect(10, 10, 20, 20);
			expect(isRectVisible(clipRect, 15, 15, 10, 10)).toBe(true);
		});

		it('returns true for rect fully inside', () => {
			const clipRect = createClipRect(10, 10, 20, 20);
			expect(isRectVisible(clipRect, 12, 12, 5, 5)).toBe(true);
		});

		it('returns false for rect fully outside', () => {
			const clipRect = createClipRect(10, 10, 20, 20);
			expect(isRectVisible(clipRect, 0, 0, 5, 5)).toBe(false);
		});

		it('returns true for partial overlap', () => {
			const clipRect = createClipRect(10, 10, 20, 20);
			expect(isRectVisible(clipRect, 5, 15, 10, 10)).toBe(true);
		});
	});

	describe('intersectClipRects', () => {
		it('computes intersection of overlapping rects', () => {
			const a = createClipRect(0, 0, 20, 20);
			const b = createClipRect(10, 10, 20, 20);
			const result = intersectClipRects(a, b);

			expect(result.x1).toBe(10);
			expect(result.y1).toBe(10);
			expect(result.x2).toBe(20);
			expect(result.y2).toBe(20);
		});

		it('returns empty rect for non-overlapping rects', () => {
			const a = createClipRect(0, 0, 10, 10);
			const b = createClipRect(20, 20, 10, 10);
			const result = intersectClipRects(a, b);

			expect(isClipRectEmpty(result)).toBe(true);
		});

		it('returns inner rect when one contains the other', () => {
			const outer = createClipRect(0, 0, 100, 100);
			const inner = createClipRect(20, 20, 30, 30);
			const result = intersectClipRects(outer, inner);

			expect(result.x1).toBe(20);
			expect(result.y1).toBe(20);
			expect(result.x2).toBe(50);
			expect(result.y2).toBe(50);
		});
	});

	describe('clampToClipRect', () => {
		it('returns point unchanged if inside', () => {
			const rect = createClipRect(10, 10, 20, 20);
			const result = clampToClipRect(rect, 15, 15);
			expect(result).toEqual({ x: 15, y: 15 });
		});

		it('clamps point to left edge', () => {
			const rect = createClipRect(10, 10, 20, 20);
			const result = clampToClipRect(rect, 5, 15);
			expect(result).toEqual({ x: 10, y: 15 });
		});

		it('clamps point to right edge', () => {
			const rect = createClipRect(10, 10, 20, 20);
			const result = clampToClipRect(rect, 35, 15);
			expect(result).toEqual({ x: 29, y: 15 });
		});

		it('clamps point to both edges', () => {
			const rect = createClipRect(10, 10, 20, 20);
			const result = clampToClipRect(rect, 0, 50);
			expect(result).toEqual({ x: 10, y: 29 });
		});
	});

	describe('getClipRectWidth / getClipRectHeight', () => {
		it('returns correct dimensions', () => {
			const rect = createClipRect(10, 20, 30, 40);
			expect(getClipRectWidth(rect)).toBe(30);
			expect(getClipRectHeight(rect)).toBe(40);
		});
	});

	describe('getClipRect', () => {
		it('returns infinite rect for entity without layout', () => {
			const entity = addEntity(world);
			const clipRect = getClipRect(world, entity);

			expect(clipRect.x1).toBe(-Infinity);
			expect(clipRect.y1).toBe(-Infinity);
		});

		it('returns entity bounds for entity with HIDDEN overflow', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 5, 5);
			setDimensions(world, entity, 10, 10);
			setStyle(world, entity, {});
			appendChild(world, screen, entity);
			setOverflow(world, entity, Overflow.HIDDEN);

			layoutSystem(world);
			const clipRect = getClipRect(world, entity);

			expect(clipRect.x1).toBe(5);
			expect(clipRect.y1).toBe(5);
			expect(clipRect.x2).toBe(15);
			expect(clipRect.y2).toBe(15);
		});

		it('returns infinite rect for entity with VISIBLE overflow', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 10);
			setDimensions(world, entity, 20, 20);
			setStyle(world, entity, {});
			appendChild(world, screen, entity);
			setOverflow(world, entity, Overflow.VISIBLE);

			layoutSystem(world);
			const clipRect = getClipRect(world, entity);

			// Should not be clipped by its own bounds
			expect(clipRect.x1).toBeLessThan(10);
		});

		it('intersects with parent clip rect', () => {
			// Parent at (0, 0) size 30x30
			const parent = addEntity(world);
			setPosition(world, parent, 0, 0);
			setDimensions(world, parent, 30, 30);
			setStyle(world, parent, {});
			appendChild(world, screen, parent);
			setOverflow(world, parent, Overflow.HIDDEN);

			// Child at (20, 20) size 20x20 - extends beyond parent
			const child = addEntity(world);
			setPosition(world, child, 20, 20);
			setDimensions(world, child, 20, 20);
			setStyle(world, child, {});
			appendChild(world, parent, child);
			setOverflow(world, child, Overflow.HIDDEN);

			layoutSystem(world);
			const clipRect = getClipRect(world, child);

			// Should be clipped by parent bounds
			expect(clipRect.x2).toBeLessThanOrEqual(30);
			expect(clipRect.y2).toBeLessThanOrEqual(30);
		});
	});

	describe('shouldClipContent', () => {
		it('returns true for HIDDEN overflow', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, Overflow.HIDDEN);
			expect(shouldClipContent(world, entity)).toBe(true);
		});

		it('returns false for VISIBLE overflow', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, Overflow.VISIBLE);
			expect(shouldClipContent(world, entity)).toBe(false);
		});

		it('returns true for SCROLL overflow', () => {
			const entity = addEntity(world);
			setOverflow(world, entity, Overflow.SCROLL);
			expect(shouldClipContent(world, entity)).toBe(true);
		});

		it('returns true for entity without Clipping (default HIDDEN)', () => {
			const entity = addEntity(world);
			expect(shouldClipContent(world, entity)).toBe(true);
		});
	});

	describe('ClipStack', () => {
		it('createClipStack returns infinite bounds', () => {
			const stack = createClipStack();
			expect(getCurrentClip(stack).x1).toBe(-Infinity);
		});

		it('pushClipRect intersects with current', () => {
			let stack = createClipStack();
			stack = pushClipRect(stack, createClipRect(0, 0, 100, 100));

			const current = getCurrentClip(stack);
			expect(current.x1).toBe(0);
			expect(current.y1).toBe(0);
			expect(current.x2).toBe(100);
			expect(current.y2).toBe(100);
		});

		it('nested pushClipRect intersects progressively', () => {
			let stack = createClipStack();
			stack = pushClipRect(stack, createClipRect(0, 0, 100, 100));
			stack = pushClipRect(stack, createClipRect(20, 20, 60, 60));

			const current = getCurrentClip(stack);
			expect(current.x1).toBe(20);
			expect(current.y1).toBe(20);
			expect(current.x2).toBe(80);
			expect(current.y2).toBe(80);
		});

		it('popClipRect restores previous clip', () => {
			let stack = createClipStack();
			stack = pushClipRect(stack, createClipRect(0, 0, 100, 100));
			stack = pushClipRect(stack, createClipRect(20, 20, 60, 60));
			stack = popClipRect(stack);

			const current = getCurrentClip(stack);
			expect(current.x1).toBe(0);
			expect(current.y1).toBe(0);
			expect(current.x2).toBe(100);
			expect(current.y2).toBe(100);
		});

		it('popClipRect on empty stack returns unchanged', () => {
			let stack = createClipStack();
			stack = popClipRect(stack);

			const current = getCurrentClip(stack);
			expect(current.x1).toBe(-Infinity);
		});
	});
});
