import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	AUTO_DIMENSION,
	Dimensions,
	decodePercentage,
	encodePercentage,
	getDimensions,
	getResolvedHeight,
	getResolvedWidth,
	hasDimensions,
	isPercentage,
	setConstraints,
	setDimensions,
	setShrink,
	shouldShrink,
} from './dimensions';

describe('Dimensions component', () => {
	describe('percentage encoding', () => {
		it('encodes 0% correctly', () => {
			expect(encodePercentage(0)).toBe(-2);
		});

		it('encodes 50% correctly', () => {
			expect(encodePercentage(50)).toBe(-52);
		});

		it('encodes 100% correctly', () => {
			expect(encodePercentage(100)).toBe(-102);
		});

		it('decodes 0% correctly', () => {
			expect(decodePercentage(-2)).toEqual(0);
		});

		it('decodes 50% correctly', () => {
			expect(decodePercentage(-52)).toBe(50);
		});

		it('decodes 100% correctly', () => {
			expect(decodePercentage(-102)).toBe(100);
		});

		it('returns null for non-percentage values', () => {
			expect(decodePercentage(100)).toBeNull();
			expect(decodePercentage(0)).toBeNull();
			expect(decodePercentage(AUTO_DIMENSION)).toBeNull();
		});

		it('isPercentage identifies percentages', () => {
			expect(isPercentage(-52)).toBe(true);
			expect(isPercentage(50)).toBe(false);
			expect(isPercentage(AUTO_DIMENSION)).toBe(false);
		});
	});

	describe('setDimensions', () => {
		it('sets fixed dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setDimensions(world, eid, 80, 24);

			expect(Dimensions.width[eid]).toBe(80);
			expect(Dimensions.height[eid]).toBe(24);
		});

		it('sets percentage dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setDimensions(world, eid, '50%', '25%');

			expect(Dimensions.width[eid]).toBe(encodePercentage(50));
			expect(Dimensions.height[eid]).toBe(encodePercentage(25));
		});

		it('sets auto dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setDimensions(world, eid, 'auto', 'auto');

			expect(Dimensions.width[eid]).toBe(AUTO_DIMENSION);
			expect(Dimensions.height[eid]).toBe(AUTO_DIMENSION);
		});

		it('initializes constraints to defaults', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setDimensions(world, eid, 80, 24);

			expect(Dimensions.minWidth[eid]).toBe(0);
			expect(Dimensions.minHeight[eid]).toBe(0);
			expect(Dimensions.maxWidth[eid]).toBe(Number.POSITIVE_INFINITY);
			expect(Dimensions.maxHeight[eid]).toBe(Number.POSITIVE_INFINITY);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setDimensions(world, eid, 80, 24);

			expect(result).toBe(eid);
		});
	});

	describe('getDimensions', () => {
		it('returns dimensions data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			const dims = getDimensions(world, eid);

			expect(dims).toEqual({
				width: 80,
				height: 24,
				minWidth: 0,
				minHeight: 0,
				maxWidth: Number.POSITIVE_INFINITY,
				maxHeight: Number.POSITIVE_INFINITY,
				shrink: false,
			});
		});

		it('returns undefined for entity without Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const dims = getDimensions(world, eid);

			expect(dims).toBeUndefined();
		});
	});

	describe('setConstraints', () => {
		it('sets min constraints', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			setConstraints(world, eid, { minWidth: 10, minHeight: 5 });

			expect(Dimensions.minWidth[eid]).toBe(10);
			expect(Dimensions.minHeight[eid]).toBe(5);
		});

		it('sets max constraints', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			setConstraints(world, eid, { maxWidth: 100, maxHeight: 50 });

			expect(Dimensions.maxWidth[eid]).toBe(100);
			expect(Dimensions.maxHeight[eid]).toBe(50);
		});

		it('sets partial constraints', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			setConstraints(world, eid, { minWidth: 10 });

			expect(Dimensions.minWidth[eid]).toBe(10);
			expect(Dimensions.minHeight[eid]).toBe(0);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setConstraints(world, eid, { minWidth: 10 });

			expect(hasDimensions(world, eid)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setConstraints(world, eid, { minWidth: 10 });

			expect(result).toBe(eid);
		});
	});

	describe('setShrink', () => {
		it('enables shrink', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			setShrink(world, eid, true);

			expect(Dimensions.shrink[eid]).toBe(1);
		});

		it('disables shrink', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);
			setShrink(world, eid, true);

			setShrink(world, eid, false);

			expect(Dimensions.shrink[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setShrink(world, eid, true);

			expect(result).toBe(eid);
		});
	});

	describe('shouldShrink', () => {
		it('returns true when shrink enabled', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);
			setShrink(world, eid, true);

			expect(shouldShrink(world, eid)).toBe(true);
		});

		it('returns false when shrink disabled', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			expect(shouldShrink(world, eid)).toBe(false);
		});

		it('returns false for entity without Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(shouldShrink(world, eid)).toBe(false);
		});
	});

	describe('hasDimensions', () => {
		it('returns true when entity has Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			expect(hasDimensions(world, eid)).toBe(true);
		});

		it('returns false when entity lacks Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(hasDimensions(world, eid)).toBe(false);
		});
	});

	describe('getResolvedWidth', () => {
		it('returns fixed width unchanged', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			expect(getResolvedWidth(world, eid, 200)).toBe(80);
		});

		it('resolves percentage width', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, '50%', 24);

			expect(getResolvedWidth(world, eid, 200)).toBe(100);
		});

		it('returns undefined for auto width', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 'auto', 24);

			expect(getResolvedWidth(world, eid, 200)).toBeUndefined();
		});

		it('returns undefined for entity without Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getResolvedWidth(world, eid, 200)).toBeUndefined();
		});
	});

	describe('getResolvedHeight', () => {
		it('returns fixed height unchanged', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 24);

			expect(getResolvedHeight(world, eid, 100)).toBe(24);
		});

		it('resolves percentage height', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, '25%');

			expect(getResolvedHeight(world, eid, 100)).toBe(25);
		});

		it('returns undefined for auto height', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setDimensions(world, eid, 80, 'auto');

			expect(getResolvedHeight(world, eid, 100)).toBeUndefined();
		});

		it('returns undefined for entity without Dimensions', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getResolvedHeight(world, eid, 100)).toBeUndefined();
		});
	});
});
