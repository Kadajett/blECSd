import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	ColliderType,
	canLayersCollide,
	collisionPairKey,
	createCollisionPair,
	DEFAULT_LAYER,
	DEFAULT_MASK,
	getCollider,
	getColliderAABB,
	hasCollider,
	isTrigger,
	removeCollider,
	setCollider,
	setCollisionLayer,
	setCollisionMask,
	setTrigger,
	testAABBOverlap,
	testCircleAABBOverlap,
	testCircleOverlap,
	testCollision,
} from './collision';

describe('Collision Component', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setCollider', () => {
		it('should add collider with default values', () => {
			const eid = addEntity(world);
			setCollider(world, eid);

			const data = getCollider(world, eid);
			expect(data).toBeDefined();
			expect(data?.type).toBe(ColliderType.BOX);
			expect(data?.width).toBe(1);
			expect(data?.height).toBe(1);
			expect(data?.offsetX).toBe(0);
			expect(data?.offsetY).toBe(0);
			expect(data?.layer).toBe(DEFAULT_LAYER);
			expect(data?.mask).toBe(DEFAULT_MASK);
			expect(data?.isTrigger).toBe(false);
		});

		it('should set box collider with dimensions', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.BOX,
				width: 3,
				height: 2,
			});

			const data = getCollider(world, eid);
			expect(data?.type).toBe(ColliderType.BOX);
			expect(data?.width).toBe(3);
			expect(data?.height).toBe(2);
		});

		it('should set circle collider', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.CIRCLE,
				width: 4, // diameter
			});

			const data = getCollider(world, eid);
			expect(data?.type).toBe(ColliderType.CIRCLE);
			expect(data?.width).toBe(4);
		});

		it('should set offset', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				offsetX: 1.5,
				offsetY: -0.5,
			});

			const data = getCollider(world, eid);
			expect(data?.offsetX).toBe(1.5);
			expect(data?.offsetY).toBe(-0.5);
		});

		it('should set layer and mask', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				layer: 0b0100,
				mask: 0b1010,
			});

			const data = getCollider(world, eid);
			expect(data?.layer).toBe(0b0100);
			expect(data?.mask).toBe(0b1010);
		});

		it('should set trigger flag', () => {
			const eid = addEntity(world);
			setCollider(world, eid, { isTrigger: true });

			const data = getCollider(world, eid);
			expect(data?.isTrigger).toBe(true);
		});

		it('should return entity for chaining', () => {
			const eid = addEntity(world);
			const result = setCollider(world, eid, { width: 2 });
			expect(result).toBe(eid);
		});
	});

	describe('getCollider', () => {
		it('should return undefined for entity without collider', () => {
			const eid = addEntity(world);
			expect(getCollider(world, eid)).toBeUndefined();
		});

		it('should return collider data', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.CIRCLE,
				width: 5,
				layer: 2,
			});

			const data = getCollider(world, eid);
			expect(data).toEqual({
				type: ColliderType.CIRCLE,
				width: 5,
				height: 1,
				offsetX: 0,
				offsetY: 0,
				layer: 2,
				mask: DEFAULT_MASK,
				isTrigger: false,
			});
		});
	});

	describe('hasCollider', () => {
		it('should return false for entity without collider', () => {
			const eid = addEntity(world);
			expect(hasCollider(world, eid)).toBe(false);
		});

		it('should return true for entity with collider', () => {
			const eid = addEntity(world);
			setCollider(world, eid);
			expect(hasCollider(world, eid)).toBe(true);
		});
	});

	describe('removeCollider', () => {
		it('should remove collider from entity', () => {
			const eid = addEntity(world);
			setCollider(world, eid);
			expect(hasCollider(world, eid)).toBe(true);

			removeCollider(world, eid);
			expect(hasCollider(world, eid)).toBe(false);
		});

		it('should handle removing non-existent collider', () => {
			const eid = addEntity(world);
			expect(() => removeCollider(world, eid)).not.toThrow();
		});
	});

	describe('setCollisionLayer', () => {
		it('should set collision layer', () => {
			const eid = addEntity(world);
			setCollisionLayer(world, eid, 0b1000);

			const data = getCollider(world, eid);
			expect(data?.layer).toBe(0b1000);
		});

		it('should create collider if not present', () => {
			const eid = addEntity(world);
			setCollisionLayer(world, eid, 4);
			expect(hasCollider(world, eid)).toBe(true);
		});
	});

	describe('setCollisionMask', () => {
		it('should set collision mask', () => {
			const eid = addEntity(world);
			setCollisionMask(world, eid, 0b0011);

			const data = getCollider(world, eid);
			expect(data?.mask).toBe(0b0011);
		});

		it('should create collider if not present', () => {
			const eid = addEntity(world);
			setCollisionMask(world, eid, 7);
			expect(hasCollider(world, eid)).toBe(true);
		});
	});

	describe('setTrigger', () => {
		it('should set trigger flag to true', () => {
			const eid = addEntity(world);
			setTrigger(world, eid, true);

			expect(isTrigger(world, eid)).toBe(true);
		});

		it('should set trigger flag to false', () => {
			const eid = addEntity(world);
			setCollider(world, eid, { isTrigger: true });
			setTrigger(world, eid, false);

			expect(isTrigger(world, eid)).toBe(false);
		});
	});

	describe('isTrigger', () => {
		it('should return false for entity without collider', () => {
			const eid = addEntity(world);
			expect(isTrigger(world, eid)).toBe(false);
		});

		it('should return correct trigger state', () => {
			const eid = addEntity(world);
			setCollider(world, eid, { isTrigger: true });
			expect(isTrigger(world, eid)).toBe(true);
		});
	});
});

describe('Layer Collision', () => {
	describe('canLayersCollide', () => {
		it('should allow collision when masks include each others layers', () => {
			// A on layer 1, B on layer 2
			// A wants to collide with layer 2, B wants to collide with layer 1
			expect(canLayersCollide(0b0001, 0b0010, 0b0010, 0b0001)).toBe(true);
		});

		it('should deny collision when A mask excludes B layer', () => {
			expect(canLayersCollide(0b0001, 0b0100, 0b0010, 0b0001)).toBe(false);
		});

		it('should deny collision when B mask excludes A layer', () => {
			expect(canLayersCollide(0b0001, 0b0010, 0b0010, 0b0100)).toBe(false);
		});

		it('should allow collision with default mask (all layers)', () => {
			expect(canLayersCollide(0b0001, 0xffff, 0b1000, 0xffff)).toBe(true);
		});

		it('should deny collision with zero mask', () => {
			expect(canLayersCollide(0b0001, 0x0000, 0b0010, 0xffff)).toBe(false);
		});
	});
});

describe('Collision Bounds', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('getColliderAABB', () => {
		it('should compute AABB for box collider', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.BOX,
				width: 4,
				height: 2,
			});

			const aabb = getColliderAABB(world,eid, 10, 20);
			expect(aabb.minX).toBe(8); // 10 - 4/2
			expect(aabb.maxX).toBe(12); // 10 + 4/2
			expect(aabb.minY).toBe(19); // 20 - 2/2
			expect(aabb.maxY).toBe(21); // 20 + 2/2
		});

		it('should compute AABB for circle collider', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.CIRCLE,
				width: 6, // diameter
			});

			const aabb = getColliderAABB(world,eid, 10, 20);
			expect(aabb.minX).toBe(7); // 10 - 3
			expect(aabb.maxX).toBe(13); // 10 + 3
			expect(aabb.minY).toBe(17); // 20 - 3
			expect(aabb.maxY).toBe(23); // 20 + 3
		});

		it('should include offset in AABB', () => {
			const eid = addEntity(world);
			setCollider(world, eid, {
				type: ColliderType.BOX,
				width: 2,
				height: 2,
				offsetX: 5,
				offsetY: -3,
			});

			const aabb = getColliderAABB(world,eid, 10, 20);
			// center = (10+5, 20-3) = (15, 17)
			expect(aabb.minX).toBe(14); // 15 - 1
			expect(aabb.maxX).toBe(16); // 15 + 1
			expect(aabb.minY).toBe(16); // 17 - 1
			expect(aabb.maxY).toBe(18); // 17 + 1
		});
	});
});

describe('Collision Testing', () => {
	describe('testAABBOverlap', () => {
		it('should detect overlapping AABBs', () => {
			const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			const b = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
			expect(testAABBOverlap(a, b)).toBe(true);
		});

		it('should detect non-overlapping AABBs', () => {
			const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			const b = { minX: 15, minY: 15, maxX: 25, maxY: 25 };
			expect(testAABBOverlap(a, b)).toBe(false);
		});

		it('should not overlap when touching edges', () => {
			const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			const b = { minX: 10, minY: 0, maxX: 20, maxY: 10 };
			expect(testAABBOverlap(a, b)).toBe(false);
		});

		it('should detect contained AABB', () => {
			const a = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
			const b = { minX: 5, minY: 5, maxX: 10, maxY: 10 };
			expect(testAABBOverlap(a, b)).toBe(true);
		});
	});

	describe('testCircleOverlap', () => {
		it('should detect overlapping circles', () => {
			expect(testCircleOverlap(0, 0, 5, 8, 0, 5)).toBe(true);
		});

		it('should detect non-overlapping circles', () => {
			expect(testCircleOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
		});

		it('should not overlap when touching', () => {
			expect(testCircleOverlap(0, 0, 5, 10, 0, 5)).toBe(false);
		});

		it('should detect concentric circles', () => {
			expect(testCircleOverlap(0, 0, 10, 0, 0, 5)).toBe(true);
		});
	});

	describe('testCircleAABBOverlap', () => {
		it('should detect circle overlapping AABB center', () => {
			const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			expect(testCircleAABBOverlap(5, 5, 3, box)).toBe(true);
		});

		it('should detect circle overlapping AABB edge', () => {
			const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			expect(testCircleAABBOverlap(12, 5, 3, box)).toBe(true);
		});

		it('should detect circle overlapping AABB corner', () => {
			const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			// Circle at (12, 12) with radius 3 should reach corner (10, 10)
			// Distance = sqrt(4 + 4) = 2.83, radius = 3
			expect(testCircleAABBOverlap(12, 12, 3, box)).toBe(true);
		});

		it('should detect non-overlapping circle and AABB', () => {
			const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
			expect(testCircleAABBOverlap(20, 20, 3, box)).toBe(false);
		});

		it('should detect circle contained in AABB', () => {
			const box = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
			expect(testCircleAABBOverlap(10, 10, 3, box)).toBe(true);
		});
	});

	describe('testCollision', () => {
		let world: ReturnType<typeof createWorld>;

		beforeEach(() => {
			world = createWorld();
		});

		it('should detect box vs box collision', () => {
			const a = addEntity(world);
			const b = addEntity(world);
			setCollider(world, a, { type: ColliderType.BOX, width: 4, height: 4 });
			setCollider(world, b, { type: ColliderType.BOX, width: 4, height: 4 });

			// Overlapping at (0,0) and (2,2)
			expect(testCollision(world,a, 0, 0, b, 2, 2)).toBe(true);
			// Not overlapping
			expect(testCollision(world,a, 0, 0, b, 10, 10)).toBe(false);
		});

		it('should detect circle vs circle collision', () => {
			const a = addEntity(world);
			const b = addEntity(world);
			setCollider(world, a, { type: ColliderType.CIRCLE, width: 4 }); // radius 2
			setCollider(world, b, { type: ColliderType.CIRCLE, width: 4 }); // radius 2

			// Overlapping
			expect(testCollision(world,a, 0, 0, b, 3, 0)).toBe(true);
			// Not overlapping
			expect(testCollision(world,a, 0, 0, b, 10, 0)).toBe(false);
		});

		it('should detect circle vs box collision', () => {
			const circle = addEntity(world);
			const box = addEntity(world);
			setCollider(world, circle, { type: ColliderType.CIRCLE, width: 4 }); // radius 2
			setCollider(world, box, { type: ColliderType.BOX, width: 4, height: 4 });

			// Overlapping
			expect(testCollision(world,circle, 0, 0, box, 3, 0)).toBe(true);
			// Not overlapping
			expect(testCollision(world,circle, 0, 0, box, 10, 0)).toBe(false);
		});

		it('should detect box vs circle collision', () => {
			const box = addEntity(world);
			const circle = addEntity(world);
			setCollider(world, box, { type: ColliderType.BOX, width: 4, height: 4 });
			setCollider(world, circle, { type: ColliderType.CIRCLE, width: 4 }); // radius 2

			// Overlapping
			expect(testCollision(world,box, 0, 0, circle, 3, 0)).toBe(true);
			// Not overlapping
			expect(testCollision(world,box, 0, 0, circle, 10, 0)).toBe(false);
		});

		it('should include offset in collision test', () => {
			const a = addEntity(world);
			const b = addEntity(world);
			setCollider(world, a, { type: ColliderType.BOX, width: 2, height: 2, offsetX: 5 });
			setCollider(world, b, { type: ColliderType.BOX, width: 2, height: 2 });

			// Without offset, they would overlap at (0,0) and (1,0)
			// With offset, a's center is at (5, 0), so they don't overlap
			expect(testCollision(world,a, 0, 0, b, 1, 0)).toBe(false);
			// But they overlap when b is at (5, 0)
			expect(testCollision(world,a, 0, 0, b, 5, 0)).toBe(true);
		});
	});
});

describe('Collision Pairs', () => {
	const world = createWorld();

	describe('createCollisionPair', () => {
		it('should normalize pair order (lower ID first)', () => {
			const pair1 = createCollisionPair(world,5, 3, false);
			expect(pair1.entityA).toBe(3);
			expect(pair1.entityB).toBe(5);

			const pair2 = createCollisionPair(world,3, 5, false);
			expect(pair2.entityA).toBe(3);
			expect(pair2.entityB).toBe(5);
		});

		it('should preserve trigger flag', () => {
			const pair = createCollisionPair(world,1, 2, true);
			expect(pair.isTrigger).toBe(true);
		});
	});

	describe('collisionPairKey', () => {
		it('should generate consistent key regardless of order', () => {
			const pair1 = createCollisionPair(world,5, 3, false);
			const pair2 = createCollisionPair(world,3, 5, false);
			expect(collisionPairKey(pair1)).toBe(collisionPairKey(pair2));
		});

		it('should generate unique keys for different pairs', () => {
			const pair1 = createCollisionPair(world,1, 2, false);
			const pair2 = createCollisionPair(world,1, 3, false);
			expect(collisionPairKey(pair1)).not.toBe(collisionPairKey(pair2));
		});
	});
});
