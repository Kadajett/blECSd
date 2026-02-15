import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
	getTransform3D,
	getWorldMatrix,
	isDirty,
	markDirty,
	setRotation,
	setScale,
	setTransform3D,
	setTranslation,
	Transform3D,
} from './transform3d';

function setup(): { world: World; eid: Entity } {
	const world = createWorld() as World;
	const eid = addEntity(world) as Entity;
	return { world, eid };
}

describe('Transform3D component', () => {
	describe('setTransform3D', () => {
		it('sets all transform values', () => {
			const { world, eid } = setup();

			setTransform3D(world, eid, {
				tx: 1,
				ty: 2,
				tz: 3,
				rx: 0.1,
				ry: 0.2,
				rz: 0.3,
				sx: 2,
				sy: 3,
				sz: 4,
			});

			const data = getTransform3D(world, eid);
			expect(data).toBeDefined();
			expect(data?.tx).toBe(1);
			expect(data?.ty).toBe(2);
			expect(data?.tz).toBe(3);
			expect(data?.rx).toBeCloseTo(0.1);
			expect(data?.ry).toBeCloseTo(0.2);
			expect(data?.rz).toBeCloseTo(0.3);
			expect(data?.sx).toBe(2);
			expect(data?.sy).toBe(3);
			expect(data?.sz).toBe(4);
		});

		it('defaults scale to (1, 1, 1)', () => {
			const { world, eid } = setup();

			setTransform3D(world, eid, {});

			const data = getTransform3D(world, eid);
			expect(data?.sx).toBe(1);
			expect(data?.sy).toBe(1);
			expect(data?.sz).toBe(1);
		});

		it('defaults translation and rotation to 0', () => {
			const { world, eid } = setup();

			setTransform3D(world, eid, {});

			const data = getTransform3D(world, eid);
			expect(data?.tx).toBe(0);
			expect(data?.ty).toBe(0);
			expect(data?.tz).toBe(0);
			expect(data?.rx).toBe(0);
			expect(data?.ry).toBe(0);
			expect(data?.rz).toBe(0);
		});

		it('marks transform as dirty', () => {
			const { world, eid } = setup();

			setTransform3D(world, eid, { tx: 5 });

			expect(isDirty(world, eid)).toBe(true);
		});

		it('returns entity ID for chaining', () => {
			const { world, eid } = setup();

			const result = setTransform3D(world, eid, {});

			expect(result).toBe(eid);
		});
	});

	describe('getTransform3D', () => {
		it('returns undefined for entity without component', () => {
			const { world, eid } = setup();

			expect(getTransform3D(world, eid)).toBeUndefined();
		});
	});

	describe('setTranslation', () => {
		it('sets translation and marks dirty', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});
			Transform3D.dirty[eid] = 0;

			setTranslation(world, eid, 10, 20, 30);

			expect(Transform3D.tx[eid]).toBe(10);
			expect(Transform3D.ty[eid]).toBe(20);
			expect(Transform3D.tz[eid]).toBe(30);
			expect(isDirty(world, eid)).toBe(true);
		});

		it('adds component if missing', () => {
			const { world, eid } = setup();

			setTranslation(world, eid, 5, 10, 15);

			expect(getTransform3D(world, eid)).toBeDefined();
			expect(Transform3D.sx[eid]).toBe(1); // Default scale
		});
	});

	describe('setRotation', () => {
		it('sets rotation and marks dirty', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});
			Transform3D.dirty[eid] = 0;

			setRotation(world, eid, 0.5, 1.0, 1.5);

			expect(Transform3D.rx[eid]).toBeCloseTo(0.5);
			expect(Transform3D.ry[eid]).toBeCloseTo(1.0);
			expect(Transform3D.rz[eid]).toBeCloseTo(1.5);
			expect(isDirty(world, eid)).toBe(true);
		});
	});

	describe('setScale', () => {
		it('sets scale and marks dirty', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});
			Transform3D.dirty[eid] = 0;

			setScale(world, eid, 2, 3, 4);

			expect(Transform3D.sx[eid]).toBe(2);
			expect(Transform3D.sy[eid]).toBe(3);
			expect(Transform3D.sz[eid]).toBe(4);
			expect(isDirty(world, eid)).toBe(true);
		});
	});

	describe('getWorldMatrix', () => {
		it('returns a 16-element Float32Array view', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});

			const matrix = getWorldMatrix(world, eid);

			expect(matrix).toBeInstanceOf(Float32Array);
			expect(matrix.length).toBe(16);
		});

		it('view is at correct offset (eid * 16)', () => {
			const world = createWorld() as World;
			const eid1 = addEntity(world) as Entity;
			const eid2 = addEntity(world) as Entity;
			setTransform3D(world, eid1, {});
			setTransform3D(world, eid2, {});

			// Write to eid2's matrix directly
			Transform3D.worldMatrix[eid2 * 16] = 42;

			const matrix2 = getWorldMatrix(world, eid2);
			expect(matrix2[0]).toBe(42);

			// eid1's matrix should be unaffected
			const matrix1 = getWorldMatrix(world, eid1);
			expect(matrix1[0]).toBe(0);
		});
	});

	describe('markDirty / isDirty', () => {
		it('markDirty sets the flag', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});
			Transform3D.dirty[eid] = 0;

			markDirty(world, eid);

			expect(isDirty(world, eid)).toBe(true);
		});

		it('isDirty returns false when clean', () => {
			const { world, eid } = setup();
			setTransform3D(world, eid, {});
			Transform3D.dirty[eid] = 0;

			expect(isDirty(world, eid)).toBe(false);
		});
	});

	describe('multiple entities', () => {
		it('have independent transforms', () => {
			const world = createWorld() as World;
			const eid1 = addEntity(world) as Entity;
			const eid2 = addEntity(world) as Entity;

			setTransform3D(world, eid1, { tx: 1, ty: 2, tz: 3 });
			setTransform3D(world, eid2, { tx: 10, ty: 20, tz: 30 });

			expect(getTransform3D(world, eid1)?.tx).toBe(1);
			expect(getTransform3D(world, eid2)?.tx).toBe(10);
		});
	});
});
