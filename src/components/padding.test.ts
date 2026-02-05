import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	getHorizontalPadding,
	getPadding,
	getVerticalPadding,
	hasPadding,
	hasPaddingValue,
	Padding,
	setPadding,
	setPaddingAll,
	setPaddingHV,
} from './padding';

describe('Padding component', () => {
	describe('setPadding', () => {
		it('adds Padding component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1 });

			expect(hasPadding(world, entity)).toBe(true);
		});

		it('sets individual padding sides', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1, top: 2, right: 3, bottom: 4 });

			expect(Padding.left[entity]).toBe(1);
			expect(Padding.top[entity]).toBe(2);
			expect(Padding.right[entity]).toBe(3);
			expect(Padding.bottom[entity]).toBe(4);
		});

		it('sets only specified sides', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 5, right: 5 });

			expect(Padding.left[entity]).toBe(5);
			expect(Padding.top[entity]).toBe(0);
			expect(Padding.right[entity]).toBe(5);
			expect(Padding.bottom[entity]).toBe(0);
		});

		it('updates existing padding values', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1, top: 1, right: 1, bottom: 1 });
			setPadding(world, entity, { left: 5 });

			expect(Padding.left[entity]).toBe(5);
			expect(Padding.top[entity]).toBe(1);
			expect(Padding.right[entity]).toBe(1);
			expect(Padding.bottom[entity]).toBe(1);
		});

		it('sets zero padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 5, top: 5, right: 5, bottom: 5 });
			setPadding(world, entity, { left: 0, top: 0, right: 0, bottom: 0 });

			expect(Padding.left[entity]).toBe(0);
			expect(Padding.top[entity]).toBe(0);
			expect(Padding.right[entity]).toBe(0);
			expect(Padding.bottom[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setPadding(world, entity, { left: 1 });

			expect(result).toBe(entity);
		});
	});

	describe('setPaddingAll', () => {
		it('sets all sides to the same value', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPaddingAll(world, entity, 3);

			expect(Padding.left[entity]).toBe(3);
			expect(Padding.top[entity]).toBe(3);
			expect(Padding.right[entity]).toBe(3);
			expect(Padding.bottom[entity]).toBe(3);
		});

		it('adds Padding component if not present', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPaddingAll(world, entity, 2);

			expect(hasPadding(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setPaddingAll(world, entity, 1);

			expect(result).toBe(entity);
		});
	});

	describe('setPaddingHV', () => {
		it('sets horizontal and vertical padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPaddingHV(world, entity, 2, 3);

			expect(Padding.left[entity]).toBe(2);
			expect(Padding.right[entity]).toBe(2);
			expect(Padding.top[entity]).toBe(3);
			expect(Padding.bottom[entity]).toBe(3);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setPaddingHV(world, entity, 1, 2);

			expect(result).toBe(entity);
		});
	});

	describe('getPadding', () => {
		it('returns undefined for entity without Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getPadding(world, entity)).toBeUndefined();
		});

		it('returns padding data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1, top: 2, right: 3, bottom: 4 });

			const data = getPadding(world, entity);

			expect(data).toBeDefined();
			expect(data?.left).toBe(1);
			expect(data?.top).toBe(2);
			expect(data?.right).toBe(3);
			expect(data?.bottom).toBe(4);
		});

		it('returns zero padding by default', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPaddingAll(world, entity, 0);

			const data = getPadding(world, entity);

			expect(data).toBeDefined();
			expect(data?.left).toBe(0);
			expect(data?.top).toBe(0);
			expect(data?.right).toBe(0);
			expect(data?.bottom).toBe(0);
		});
	});

	describe('hasPadding', () => {
		it('returns true when entity has Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1 });

			expect(hasPadding(world, entity)).toBe(true);
		});

		it('returns false when entity lacks Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasPadding(world, entity)).toBe(false);
		});
	});

	describe('getHorizontalPadding', () => {
		it('returns 0 for entity without Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getHorizontalPadding(world, entity)).toBe(0);
		});

		it('returns sum of left and right padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 3, right: 5 });

			expect(getHorizontalPadding(world, entity)).toBe(8);
		});
	});

	describe('getVerticalPadding', () => {
		it('returns 0 for entity without Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getVerticalPadding(world, entity)).toBe(0);
		});

		it('returns sum of top and bottom padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { top: 2, bottom: 4 });

			expect(getVerticalPadding(world, entity)).toBe(6);
		});
	});

	describe('hasPaddingValue', () => {
		it('returns false for entity without Padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasPaddingValue(world, entity)).toBe(false);
		});

		it('returns false when all padding is zero', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPaddingAll(world, entity, 0);

			expect(hasPaddingValue(world, entity)).toBe(false);
		});

		it('returns true when any padding is greater than zero', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPadding(world, entity, { left: 1 });

			expect(hasPaddingValue(world, entity)).toBe(true);
		});

		it('returns true for each side individually', () => {
			const world = createWorld();

			const e1 = addEntity(world);
			setPadding(world, e1, { left: 1 });
			expect(hasPaddingValue(world, e1)).toBe(true);

			const e2 = addEntity(world);
			setPadding(world, e2, { top: 1 });
			expect(hasPaddingValue(world, e2)).toBe(true);

			const e3 = addEntity(world);
			setPadding(world, e3, { right: 1 });
			expect(hasPaddingValue(world, e3)).toBe(true);

			const e4 = addEntity(world);
			setPadding(world, e4, { bottom: 1 });
			expect(hasPaddingValue(world, e4)).toBe(true);
		});
	});
});
