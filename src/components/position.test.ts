import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	bringToFront,
	getPosition,
	getZIndex,
	hasPosition,
	isAbsolute,
	moveBackward,
	moveBy,
	moveForward,
	normalizeZIndices,
	Position,
	sendToBack,
	setAbsolute,
	setPosition,
	setZIndex,
	swapZIndex,
} from './position';

describe('Position component', () => {
	describe('setPosition', () => {
		it('sets x and y coordinates', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setPosition(world, eid, 10, 20);

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(20);
		});

		it('sets z-index when provided', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setPosition(world, eid, 10, 20, 100);

			expect(Position.z[eid]).toBe(100);
		});

		it('defaults z-index to 0', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setPosition(world, eid, 10, 20);

			expect(Position.z[eid]).toBe(0);
		});

		it('handles float coordinates', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setPosition(world, eid, 10.5, 20.7);

			expect(Position.x[eid]).toBeCloseTo(10.5);
			expect(Position.y[eid]).toBeCloseTo(20.7);
		});

		it('handles negative coordinates', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setPosition(world, eid, -5, -10);

			expect(Position.x[eid]).toBe(-5);
			expect(Position.y[eid]).toBe(-10);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setPosition(world, eid, 10, 20);

			expect(result).toBe(eid);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(hasPosition(world, eid)).toBe(false);
			setPosition(world, eid, 10, 20);
			expect(hasPosition(world, eid)).toBe(true);
		});
	});

	describe('getPosition', () => {
		it('returns position data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20, 5);

			const pos = getPosition(world, eid);

			expect(pos).toEqual({
				x: 10,
				y: 20,
				z: 5,
				absolute: false,
			});
		});

		it('returns undefined for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const pos = getPosition(world, eid);

			expect(pos).toBeUndefined();
		});

		it('returns absolute flag correctly', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setAbsolute(world, eid, true);

			const pos = getPosition(world, eid);

			expect(pos?.absolute).toBe(true);
		});
	});

	describe('setAbsolute', () => {
		it('sets absolute to true', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			setAbsolute(world, eid, true);

			expect(Position.absolute[eid]).toBe(1);
		});

		it('sets absolute to false', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setAbsolute(world, eid, true);

			setAbsolute(world, eid, false);

			expect(Position.absolute[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setAbsolute(world, eid, true);

			expect(result).toBe(eid);
		});
	});

	describe('isAbsolute', () => {
		it('returns true when absolute', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setAbsolute(world, eid, true);

			expect(isAbsolute(world, eid)).toBe(true);
		});

		it('returns false when relative', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			expect(isAbsolute(world, eid)).toBe(false);
		});

		it('returns false for entity without Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isAbsolute(world, eid)).toBe(false);
		});
	});

	describe('hasPosition', () => {
		it('returns true when entity has Position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			expect(hasPosition(world, eid)).toBe(true);
		});

		it('returns false when entity lacks Position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(hasPosition(world, eid)).toBe(false);
		});
	});

	describe('moveBy', () => {
		it('moves entity by delta', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			moveBy(world, eid, 5, -3);

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(17);
		});

		it('handles float deltas', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			moveBy(world, eid, 0.5, 0.5);

			expect(Position.x[eid]).toBeCloseTo(0.5);
			expect(Position.y[eid]).toBeCloseTo(0.5);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			const result = moveBy(world, eid, 1, 1);

			expect(result).toBe(eid);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const eid = addEntity(world);

			moveBy(world, eid, 5, 5);

			expect(hasPosition(world, eid)).toBe(true);
			expect(Position.x[eid]).toBe(5);
			expect(Position.y[eid]).toBe(5);
		});
	});

	describe('setZIndex', () => {
		it('sets z-index', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			setZIndex(world, eid, 500);

			expect(Position.z[eid]).toBe(500);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const eid = addEntity(world);

			const result = setZIndex(world, eid, 100);

			expect(result).toBe(eid);
		});

		it('handles max z-index (65535)', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setZIndex(world, eid, 65535);

			expect(Position.z[eid]).toBe(65535);
		});
	});

	describe('z-index ordering', () => {
		it('maintains correct z-order across entities', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setPosition(world, eid1, 0, 0, 100);
			setPosition(world, eid2, 0, 0, 50);
			setPosition(world, eid3, 0, 0, 200);

			const entities = [eid1, eid2, eid3];
			const sorted = [...entities].sort(
				(a, b) => (Position.z[a] as number) - (Position.z[b] as number),
			);

			expect(sorted).toEqual([eid2, eid1, eid3]);
		});
	});

	describe('getZIndex', () => {
		it('returns z-index for entity with position', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0, 100);

			expect(getZIndex(world, eid)).toBe(100);
		});

		it('returns 0 for entity without position', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getZIndex(world, eid)).toBe(0);
		});
	});

	describe('bringToFront', () => {
		it('sets z-index higher than all siblings', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 10);
			setZIndex(world, eid2, 50);
			setZIndex(world, eid3, 30);

			const siblings = [eid1, eid2, eid3];
			bringToFront(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(51);
		});

		it('works with empty siblings array', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setZIndex(world, eid, 10);

			bringToFront(world, eid, []);

			expect(getZIndex(world, eid)).toBe(1);
		});

		it('caps at max z-index (65535)', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 10);
			setZIndex(world, eid2, 65535);

			bringToFront(world, eid1, [eid1, eid2]);

			expect(getZIndex(world, eid1)).toBe(65535);
		});
	});

	describe('sendToBack', () => {
		it('sets z-index lower than all siblings', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 50);
			setZIndex(world, eid2, 10);
			setZIndex(world, eid3, 30);

			const siblings = [eid1, eid2, eid3];
			sendToBack(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(9);
		});

		it('does not go below 0', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 50);
			setZIndex(world, eid2, 0);

			sendToBack(world, eid1, [eid1, eid2]);

			expect(getZIndex(world, eid1)).toBe(0);
		});
	});

	describe('moveForward', () => {
		it('moves entity above next higher sibling', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 10);
			setZIndex(world, eid2, 20);
			setZIndex(world, eid3, 30);

			const siblings = [eid1, eid2, eid3];
			moveForward(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(21);
		});

		it('does nothing if already at front', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 100);
			setZIndex(world, eid2, 50);

			const siblings = [eid1, eid2];
			moveForward(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(100);
		});
	});

	describe('moveBackward', () => {
		it('moves entity below next lower sibling', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 30);
			setZIndex(world, eid2, 20);
			setZIndex(world, eid3, 10);

			const siblings = [eid1, eid2, eid3];
			moveBackward(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(19);
		});

		it('does nothing if already at back', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 10);
			setZIndex(world, eid2, 50);

			const siblings = [eid1, eid2];
			moveBackward(world, eid1, siblings);

			expect(getZIndex(world, eid1)).toBe(10);
		});
	});

	describe('normalizeZIndices', () => {
		it('reassigns sequential z-indices', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 1000);
			setZIndex(world, eid2, 500);
			setZIndex(world, eid3, 2000);

			normalizeZIndices(world, [eid1, eid2, eid3]);

			// Should be normalized to 0, 1, 2 in order of original z-index
			expect(getZIndex(world, eid2)).toBe(0); // Was lowest
			expect(getZIndex(world, eid1)).toBe(1); // Was middle
			expect(getZIndex(world, eid3)).toBe(2); // Was highest
		});

		it('handles empty array', () => {
			const world = createWorld();
			normalizeZIndices(world, []);
			// Should not throw
		});

		it('preserves relative order', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setZIndex(world, eid1, 10);
			setZIndex(world, eid2, 20);
			setZIndex(world, eid3, 30);

			normalizeZIndices(world, [eid1, eid2, eid3]);

			// Order should be preserved
			expect(getZIndex(world, eid1)).toBeLessThan(getZIndex(world, eid2));
			expect(getZIndex(world, eid2)).toBeLessThan(getZIndex(world, eid3));
		});
	});

	describe('swapZIndex', () => {
		it('swaps z-indices of two entities', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 100);
			setZIndex(world, eid2, 200);

			swapZIndex(world, eid1, eid2);

			expect(getZIndex(world, eid1)).toBe(200);
			expect(getZIndex(world, eid2)).toBe(100);
		});

		it('handles entities without position', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setZIndex(world, eid1, 100);
			// eid2 has no position

			swapZIndex(world, eid1, eid2);

			expect(getZIndex(world, eid1)).toBe(0);
			expect(getZIndex(world, eid2)).toBe(100);
		});
	});
});
