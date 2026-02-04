import { addComponent, addEntity, createWorld } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import { appendChild, Hierarchy } from '../../components/hierarchy';
import type { Entity, World } from '../../core/types';
import { setTransform3D, Transform3D } from '../components/transform3d';
import { mat4Identity } from '../math/mat4';
import { sceneGraphSystem } from './sceneGraphSystem';

function createTestWorld(): World {
	return createWorld();
}

function createTransformEntity(world: World, config?: Record<string, number>): Entity {
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, config ?? {});
	return eid;
}

function getWorldMatrixValues(eid: Entity): Float32Array {
	const offset = eid * 16;
	return Transform3D.worldMatrix.slice(offset, offset + 16);
}

afterEach(() => {
	// Reset Transform3D arrays to avoid cross-test contamination
	Transform3D.tx.fill(0);
	Transform3D.ty.fill(0);
	Transform3D.tz.fill(0);
	Transform3D.rx.fill(0);
	Transform3D.ry.fill(0);
	Transform3D.rz.fill(0);
	Transform3D.sx.fill(0);
	Transform3D.sy.fill(0);
	Transform3D.sz.fill(0);
	Transform3D.worldMatrix.fill(0);
	Transform3D.dirty.fill(0);
	Hierarchy.parent.fill(0);
	Hierarchy.firstChild.fill(0);
	Hierarchy.nextSibling.fill(0);
	Hierarchy.prevSibling.fill(0);
	Hierarchy.childCount.fill(0);
	Hierarchy.depth.fill(0);
});

describe('sceneGraphSystem', () => {
	it('computes identity world matrix for default transform', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world);

		sceneGraphSystem(world);

		const wm = getWorldMatrixValues(eid);
		const identity = mat4Identity();
		for (let i = 0; i < 16; i++) {
			expect(wm[i]).toBeCloseTo(identity[i] as number);
		}
	});

	it('computes translation in world matrix', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world, { tx: 3, ty: 5, tz: -7 });

		sceneGraphSystem(world);

		const wm = getWorldMatrixValues(eid);
		// Column-major: translation is at indices 12, 13, 14
		expect(wm[12]).toBeCloseTo(3);
		expect(wm[13]).toBeCloseTo(5);
		expect(wm[14]).toBeCloseTo(-7);
	});

	it('computes scale in world matrix', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world, { sx: 2, sy: 3, sz: 4 });

		sceneGraphSystem(world);

		const wm = getWorldMatrixValues(eid);
		// Diagonal elements contain scale (when no rotation)
		expect(wm[0]).toBeCloseTo(2);
		expect(wm[5]).toBeCloseTo(3);
		expect(wm[10]).toBeCloseTo(4);
	});

	it('clears dirty flag after processing', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world);
		expect(Transform3D.dirty[eid]).toBe(1);

		sceneGraphSystem(world);

		expect(Transform3D.dirty[eid]).toBe(0);
	});

	it('skips non-dirty entities on second run', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world, { tx: 5 });

		sceneGraphSystem(world);
		expect(Transform3D.dirty[eid]).toBe(0);

		// Modify data directly without marking dirty
		Transform3D.tx[eid] = 99;

		sceneGraphSystem(world);

		// World matrix should still have old translation since not dirty
		const wm = getWorldMatrixValues(eid);
		expect(wm[12]).toBeCloseTo(5);
	});

	it('composes child world matrix with parent', () => {
		const world = createTestWorld();
		const parent = createTransformEntity(world, { tx: 10 });
		addComponent(world, parent, Hierarchy);
		const child = createTransformEntity(world, { tx: 5 });
		addComponent(world, child, Hierarchy);
		appendChild(world, parent, child);

		sceneGraphSystem(world);

		// Child should be at parent.tx + child.tx = 15 in world space
		const childWm = getWorldMatrixValues(child);
		expect(childWm[12]).toBeCloseTo(15);
	});

	it('handles deep hierarchy (3 levels)', () => {
		const world = createTestWorld();
		const grandparent = createTransformEntity(world, { tx: 1 });
		addComponent(world, grandparent, Hierarchy);
		const parent = createTransformEntity(world, { tx: 2 });
		addComponent(world, parent, Hierarchy);
		const child = createTransformEntity(world, { tx: 3 });
		addComponent(world, child, Hierarchy);

		appendChild(world, grandparent, parent);
		appendChild(world, parent, child);

		sceneGraphSystem(world);

		const childWm = getWorldMatrixValues(child);
		expect(childWm[12]).toBeCloseTo(6); // 1 + 2 + 3
	});

	it('cascades dirty flag to children', () => {
		const world = createTestWorld();
		const parent = createTransformEntity(world, { tx: 5 });
		addComponent(world, parent, Hierarchy);
		const child = createTransformEntity(world, { tx: 3 });
		addComponent(world, child, Hierarchy);
		appendChild(world, parent, child);

		// First run: compute everything
		sceneGraphSystem(world);
		expect(Transform3D.dirty[parent]).toBe(0);
		expect(Transform3D.dirty[child]).toBe(0);

		// Mark parent dirty
		Transform3D.dirty[parent] = 1;
		Transform3D.tx[parent] = 10;

		sceneGraphSystem(world);

		// Child should be recomputed with new parent position
		const childWm = getWorldMatrixValues(child);
		expect(childWm[12]).toBeCloseTo(13); // 10 + 3
	});

	it('handles multiple root entities', () => {
		const world = createTestWorld();
		const a = createTransformEntity(world, { tx: 1 });
		const b = createTransformEntity(world, { tx: 2 });

		sceneGraphSystem(world);

		expect(getWorldMatrixValues(a)[12]).toBeCloseTo(1);
		expect(getWorldMatrixValues(b)[12]).toBeCloseTo(2);
	});

	it('handles rotation + translation composition', () => {
		const world = createTestWorld();
		const eid = createTransformEntity(world, {
			tx: 5,
			ry: Math.PI / 2,
		});

		sceneGraphSystem(world);

		const wm = getWorldMatrixValues(eid);
		// After 90 degree Y rotation: x-axis becomes z-axis
		// Translation should still be at (5, 0, 0) in world space
		expect(wm[12]).toBeCloseTo(5);
		expect(wm[13]).toBeCloseTo(0);
		// RotateY(PI/2): r[0]=cos=0, r[2]=-sin=-1, r[8]=sin=1, r[10]=cos=0
		expect(wm[0]).toBeCloseTo(0, 4);
		expect(wm[8]).toBeCloseTo(1, 4);
	});
});
