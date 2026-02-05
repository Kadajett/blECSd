/**
 * Computed position utilities tests.
 */

import { describe, expect, it } from 'vitest';
import { BorderType, setBorder } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPadding } from '../components/padding';
import { setAbsolute, setPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import {
	getAbsolutePosition,
	getComputedPosition,
	getInnerDimensions,
	getInnerPosition,
	getRelativePosition,
	getTotalPadding,
	isPointInEntity,
	isPointInInnerBounds,
	setAbsolutePosition,
	setRelativePosition,
} from './computedPosition';

describe('computedPosition', () => {
	describe('getAbsolutePosition', () => {
		it('returns undefined for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getAbsolutePosition(world, eid);

			expect(result).toBeUndefined();
		});

		it('returns position directly for root entity', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);

			const result = getAbsolutePosition(world, eid);

			expect(result).toEqual({
				left: 10,
				top: 20,
				right: 39,
				bottom: 34,
			});
		});

		it('returns position directly for absolute-positioned entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 100, 100);
			setDimensions(world, parent, 50, 50);
			appendChild(world, parent, child);
			setPosition(world, child, 10, 20);
			setAbsolute(world, child, true);
			setDimensions(world, child, 20, 10);

			const result = getAbsolutePosition(world, child);

			// Should ignore parent position since child is absolute
			expect(result).toEqual({
				left: 10,
				top: 20,
				right: 29,
				bottom: 29,
			});
		});

		it('adds parent position for nested entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 10, 20);
			setDimensions(world, parent, 50, 50);
			appendChild(world, parent, child);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);

			const result = getAbsolutePosition(world, child);

			expect(result).toEqual({
				left: 15, // 10 + 5
				top: 23, // 20 + 3
				right: 24, // 15 + 10 - 1
				bottom: 27, // 23 + 5 - 1
			});
		});

		it('accounts for parent border in nested entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 10, 20);
			setDimensions(world, parent, 50, 50);
			setBorder(world, parent, { type: BorderType.Line });
			appendChild(world, parent, child);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);

			const result = getAbsolutePosition(world, child);

			// Border width of 1 added
			expect(result).toEqual({
				left: 16, // 10 + 1 (border) + 5
				top: 24, // 20 + 1 (border) + 3
				right: 25, // 16 + 10 - 1
				bottom: 28, // 24 + 5 - 1
			});
		});

		it('accounts for parent padding in nested entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 10, 20);
			setDimensions(world, parent, 50, 50);
			setPadding(world, parent, { left: 2, top: 3, right: 0, bottom: 0 });
			appendChild(world, parent, child);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);

			const result = getAbsolutePosition(world, child);

			expect(result).toEqual({
				left: 17, // 10 + 2 (padding) + 5
				top: 26, // 20 + 3 (padding) + 3
				right: 26, // 17 + 10 - 1
				bottom: 30, // 26 + 5 - 1
			});
		});

		it('handles deeply nested hierarchy', () => {
			const world = createWorld();
			const root = addEntity(world);
			const level1 = addEntity(world);
			const level2 = addEntity(world);
			const leaf = addEntity(world);

			setPosition(world, root, 10, 10);
			setDimensions(world, root, 100, 100);
			appendChild(world, root, level1);

			setPosition(world, level1, 5, 5);
			setDimensions(world, level1, 80, 80);
			appendChild(world, level1, level2);

			setPosition(world, level2, 3, 3);
			setDimensions(world, level2, 60, 60);
			appendChild(world, level2, leaf);

			setPosition(world, leaf, 2, 2);
			setDimensions(world, leaf, 20, 10);

			const result = getAbsolutePosition(world, leaf);

			expect(result).toEqual({
				left: 20, // 10 + 5 + 3 + 2
				top: 20, // 10 + 5 + 3 + 2
				right: 39, // 20 + 20 - 1
				bottom: 29, // 20 + 10 - 1
			});
		});
	});

	describe('getRelativePosition', () => {
		it('returns undefined for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getRelativePosition(world, eid);

			expect(result).toBeUndefined();
		});

		it('returns position with zero right/bottom for root entity', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);

			const result = getRelativePosition(world, eid);

			expect(result).toEqual({
				left: 10,
				top: 20,
				right: 0, // No parent, so 0
				bottom: 0,
			});
		});

		it('calculates right/bottom based on parent inner dimensions', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 0, 0);
			setDimensions(world, parent, 100, 50);
			appendChild(world, parent, child);
			setPosition(world, child, 10, 5);
			setDimensions(world, child, 20, 10);

			const result = getRelativePosition(world, child);

			expect(result).toEqual({
				left: 10,
				top: 5,
				right: 70, // 100 - 10 - 20
				bottom: 35, // 50 - 5 - 10
			});
		});
	});

	describe('getInnerPosition', () => {
		it('returns undefined for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getInnerPosition(world, eid);

			expect(result).toBeUndefined();
		});

		it('returns same as absolute for entity without border/padding', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);

			const result = getInnerPosition(world, eid);

			expect(result).toEqual({
				left: 10,
				top: 20,
				right: 39,
				bottom: 34,
			});
		});

		it('accounts for border in inner position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);
			setBorder(world, eid, { type: BorderType.Line });

			const result = getInnerPosition(world, eid);

			expect(result).toEqual({
				left: 11, // 10 + 1
				top: 21, // 20 + 1
				right: 38, // 39 - 1
				bottom: 33, // 34 - 1
			});
		});

		it('accounts for padding in inner position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);
			setPadding(world, eid, { left: 2, top: 3, right: 4, bottom: 5 });

			const result = getInnerPosition(world, eid);

			expect(result).toEqual({
				left: 12, // 10 + 2
				top: 23, // 20 + 3
				right: 35, // 39 - 4
				bottom: 29, // 34 - 5
			});
		});

		it('accounts for both border and padding', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);
			setBorder(world, eid, { type: BorderType.Line });
			setPadding(world, eid, { left: 2, top: 3, right: 4, bottom: 5 });

			const result = getInnerPosition(world, eid);

			expect(result).toEqual({
				left: 13, // 10 + 1 (border) + 2 (padding)
				top: 24, // 20 + 1 + 3
				right: 34, // 39 - 1 - 4
				bottom: 28, // 34 - 1 - 5
			});
		});
	});

	describe('getInnerDimensions', () => {
		it('returns undefined for entity without Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getInnerDimensions(world, eid);

			expect(result).toBeUndefined();
		});

		it('returns full dimensions for entity without border/padding', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 30, 15);

			const result = getInnerDimensions(world, eid);

			expect(result).toEqual({
				width: 30,
				height: 15,
			});
		});

		it('subtracts border from dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 30, 15);
			setBorder(world, eid, { type: BorderType.Line });

			const result = getInnerDimensions(world, eid);

			expect(result).toEqual({
				width: 28, // 30 - 2 (1 on each side)
				height: 13, // 15 - 2
			});
		});

		it('subtracts padding from dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 30, 15);
			setPadding(world, eid, { left: 2, top: 3, right: 4, bottom: 5 });

			const result = getInnerDimensions(world, eid);

			expect(result).toEqual({
				width: 24, // 30 - 2 - 4
				height: 7, // 15 - 3 - 5
			});
		});

		it('does not go below zero', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 5, 5);
			setBorder(world, eid, { type: BorderType.Line });
			setPadding(world, eid, { left: 3, top: 3, right: 3, bottom: 3 });

			const result = getInnerDimensions(world, eid);

			expect(result).toEqual({
				width: 0, // Max(0, 5 - 2 - 6)
				height: 0,
			});
		});
	});

	describe('getTotalPadding', () => {
		it('returns zeros for entity without Padding', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getTotalPadding(world, eid);

			expect(result).toEqual({
				horizontal: 0,
				vertical: 0,
				total: 0,
			});
		});

		it('calculates padding totals correctly', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPadding(world, eid, { left: 2, top: 3, right: 4, bottom: 5 });

			const result = getTotalPadding(world, eid);

			expect(result).toEqual({
				horizontal: 6, // 2 + 4
				vertical: 8, // 3 + 5
				total: 14, // 2 + 4 + 3 + 5
			});
		});
	});

	describe('setAbsolutePosition', () => {
		it('sets position directly for root entity', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);

			setAbsolutePosition(world, eid, 50, 30);

			const absPos = getAbsolutePosition(world, eid);
			expect(absPos?.left).toBe(50);
			expect(absPos?.top).toBe(30);
		});

		it('converts to relative position for nested entity', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 10, 20);
			setDimensions(world, parent, 100, 100);
			appendChild(world, parent, child);
			setPosition(world, child, 0, 0);
			setDimensions(world, child, 20, 10);

			// Set child to absolute position 25, 35
			setAbsolutePosition(world, child, 25, 35);

			// Should result in relative position 15, 15 (25-10, 35-20)
			const absPos = getAbsolutePosition(world, child);
			expect(absPos?.left).toBe(25);
			expect(absPos?.top).toBe(35);
		});

		it('accounts for parent border and padding', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 10, 10);
			setDimensions(world, parent, 100, 100);
			setBorder(world, parent, { type: BorderType.Line });
			setPadding(world, parent, { left: 2, top: 3, right: 0, bottom: 0 });
			appendChild(world, parent, child);
			setPosition(world, child, 0, 0);
			setDimensions(world, child, 20, 10);

			// Set child to absolute position 20, 20
			setAbsolutePosition(world, child, 20, 20);

			const absPos = getAbsolutePosition(world, child);
			expect(absPos?.left).toBe(20);
			expect(absPos?.top).toBe(20);
		});
	});

	describe('setRelativePosition', () => {
		it('sets left/top position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);

			setRelativePosition(world, eid, { left: 5, top: 3 });

			const relPos = getRelativePosition(world, eid);
			expect(relPos?.left).toBe(5);
			expect(relPos?.top).toBe(3);
		});

		it('sets right/bottom position based on parent', () => {
			const world = createWorld();
			const parent = addEntity(world);
			const child = addEntity(world);

			setPosition(world, parent, 0, 0);
			setDimensions(world, parent, 100, 50);
			appendChild(world, parent, child);
			setPosition(world, child, 0, 0);
			setDimensions(world, child, 20, 10);

			// Position 10 from right, 5 from bottom
			setRelativePosition(world, child, { right: 10, bottom: 5 });

			const relPos = getRelativePosition(world, child);
			// left = 100 - 20 - 10 = 70
			// top = 50 - 10 - 5 = 35
			expect(relPos?.left).toBe(70);
			expect(relPos?.top).toBe(35);
		});
	});

	describe('getComputedPosition', () => {
		it('returns undefined for entity without required components', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = getComputedPosition(world, eid);

			expect(result).toBeUndefined();
		});

		it('returns complete computed data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 30, 15);
			setBorder(world, eid, { type: BorderType.Line });
			setPadding(world, eid, { left: 2, top: 1, right: 2, bottom: 1 });

			const result = getComputedPosition(world, eid);

			expect(result).toBeDefined();
			expect(result?.absolute.left).toBe(10);
			expect(result?.absolute.top).toBe(20);
			expect(result?.innerDimensions.width).toBe(24); // 30 - 2 - 4
			expect(result?.innerDimensions.height).toBe(11); // 15 - 2 - 2
			expect(result?.totalPadding.total).toBe(6); // 2 + 2 + 1 + 1
		});
	});

	describe('isPointInEntity', () => {
		it('returns false for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = isPointInEntity(world, eid, 10, 10);

			expect(result).toBe(false);
		});

		it('returns true for point inside bounds', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 10);

			expect(isPointInEntity(world, eid, 15, 15)).toBe(true);
			expect(isPointInEntity(world, eid, 10, 10)).toBe(true); // Top-left corner
			expect(isPointInEntity(world, eid, 29, 19)).toBe(true); // Bottom-right corner
		});

		it('returns false for point outside bounds', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 10);

			expect(isPointInEntity(world, eid, 5, 15)).toBe(false); // Left of
			expect(isPointInEntity(world, eid, 35, 15)).toBe(false); // Right of
			expect(isPointInEntity(world, eid, 15, 5)).toBe(false); // Above
			expect(isPointInEntity(world, eid, 15, 25)).toBe(false); // Below
		});
	});

	describe('isPointInInnerBounds', () => {
		it('returns false for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = isPointInInnerBounds(world, eid, 10, 10);

			expect(result).toBe(false);
		});

		it('returns true for point inside inner bounds', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 10);
			setBorder(world, eid, { type: BorderType.Line });
			setPadding(world, eid, { left: 1, top: 1, right: 1, bottom: 1 });

			// Inner bounds: left=12, top=12, right=27, bottom=17
			expect(isPointInInnerBounds(world, eid, 15, 15)).toBe(true);
			expect(isPointInInnerBounds(world, eid, 12, 12)).toBe(true); // Inner top-left
		});

		it('returns false for point in border/padding', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 10);
			setBorder(world, eid, { type: BorderType.Line });
			setPadding(world, eid, { left: 1, top: 1, right: 1, bottom: 1 });

			// Point in outer bounds but not inner
			expect(isPointInInnerBounds(world, eid, 10, 10)).toBe(false); // On border
			expect(isPointInInnerBounds(world, eid, 11, 11)).toBe(false); // On padding
		});
	});
});
