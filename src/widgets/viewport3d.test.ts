import { addEntity, createWorld, hasComponent } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Entity, World } from '../core/types';
import { Camera3D } from '../3d/components/camera3d';
import { Material3D } from '../3d/components/material';
import { Mesh, clearMeshStore, createMeshFromArrays } from '../3d/components/mesh';
import { Transform3D } from '../3d/components/transform3d';
import { Viewport3D } from '../3d/components/viewport3d';
import {
	Viewport3DTag,
	createViewport3D,
	isViewport3DWidget,
	resetViewport3DStore,
} from './viewport3d';

function createTestWorld(): World {
	return createWorld();
}

function createTestMesh(): number {
	return createMeshFromArrays('test-cube', [
		{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
		{ x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
		{ x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
		{ x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
	], [
		[0, 1, 2, 3], [5, 4, 7, 6],
		[4, 0, 3, 7], [1, 5, 6, 2],
		[3, 2, 6, 7], [4, 5, 1, 0],
	]);
}

afterEach(() => {
	resetViewport3DStore();
	clearMeshStore();
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
	Camera3D.fov.fill(0);
	Camera3D.near.fill(0);
	Camera3D.far.fill(0);
	Camera3D.aspect.fill(0);
	Camera3D.projectionMode.fill(0);
	Camera3D.projMatrix.fill(0);
	Camera3D.viewMatrix.fill(0);
	Camera3D.dirty.fill(0);
	Viewport3D.left.fill(0);
	Viewport3D.top.fill(0);
	Viewport3D.width.fill(0);
	Viewport3D.height.fill(0);
	Viewport3D.cameraEntity.fill(0);
	Viewport3D.backendType.fill(0);
	Viewport3D.pixelWidth.fill(0);
	Viewport3D.pixelHeight.fill(0);
	Mesh.meshId.fill(0);
	Material3D.wireColor.fill(0);
	Material3D.fillColor.fill(0);
	Material3D.renderMode.fill(0);
	Material3D.backfaceCull.fill(0);
	Material3D.flatShading.fill(0);
	Material3D.antiAlias.fill(0);
	Viewport3DTag.isViewport3D.fill(0);
});

describe('createViewport3D', () => {
	it('creates viewport with default config', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		expect(viewport.eid).toBe(eid);
		expect(viewport.cameraEid).toBeDefined();
		expect(isViewport3DWidget(eid)).toBe(true);
	});

	it('creates camera entity with Camera3D component', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid, {
			fov: Math.PI / 4,
			near: 0.5,
			far: 500,
		});

		expect(hasComponent(world, viewport.cameraEid, Camera3D)).toBe(true);
		expect(Camera3D.fov[viewport.cameraEid]).toBeCloseTo(Math.PI / 4);
		expect(Camera3D.near[viewport.cameraEid]).toBeCloseTo(0.5);
		expect(Camera3D.far[viewport.cameraEid]).toBeCloseTo(500);
	});

	it('creates viewport entity with Viewport3D component', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		createViewport3D(world, eid, {
			left: 5, top: 2, width: 60, height: 20,
		});

		expect(Viewport3D.left[eid]).toBe(5);
		expect(Viewport3D.top[eid]).toBe(2);
		expect(Viewport3D.width[eid]).toBe(60);
		expect(Viewport3D.height[eid]).toBe(20);
	});

	it('computes pixel dimensions from cell dimensions', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		createViewport3D(world, eid, {
			width: 40, height: 10,
		});

		// Braille: 2x4 pixels per cell
		expect(Viewport3D.pixelWidth[eid]).toBe(80);
		expect(Viewport3D.pixelHeight[eid]).toBe(40);
	});

	it('validates config via Zod', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;

		expect(() => createViewport3D(world, eid, {
			near: 100,
			far: 1,
		})).toThrow('Near plane must be less than far plane');
	});

	it('sets default backend to auto', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		createViewport3D(world, eid);

		// backendType 0 = auto
		expect(Viewport3D.backendType[eid]).toBe(0);
	});
});

describe('Viewport3DWidget.addMesh', () => {
	it('creates entity with Transform3D and Mesh', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const meshId = createTestMesh();

		const meshEid = viewport.addMesh(meshId);

		expect(hasComponent(world, meshEid, Transform3D)).toBe(true);
		expect(hasComponent(world, meshEid, Mesh)).toBe(true);
		expect(Mesh.meshId[meshEid]).toBe(meshId);
	});

	it('applies transform config to mesh entity', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const meshId = createTestMesh();

		const meshEid = viewport.addMesh(meshId, { tz: -5, ry: Math.PI });

		expect(Transform3D.tz[meshEid]).toBeCloseTo(-5);
		expect(Transform3D.ry[meshEid]).toBeCloseTo(Math.PI);
	});

	it('applies material config when provided', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const meshId = createTestMesh();

		const meshEid = viewport.addMesh(meshId, { tz: -5 }, {
			renderMode: 'filled',
			fillColor: 0xFF0000,
		});

		expect(hasComponent(world, meshEid, Material3D)).toBe(true);
		expect(Material3D.renderMode[meshEid]).toBe(1); // filled
		expect(Material3D.fillColor[meshEid]).toBe(0xFF0000);
	});

	it('throws for invalid mesh ID', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		expect(() => viewport.addMesh(9999)).toThrow('Mesh ID 9999 not found');
	});
});

describe('Viewport3DWidget.removeMesh', () => {
	it('removes mesh entity', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const meshId = createTestMesh();
		const meshEid = viewport.addMesh(meshId);

		viewport.removeMesh(meshEid);

		// Entity should be removed from the world
		expect(hasComponent(world, meshEid, Mesh)).toBe(false);
	});
});

describe('Viewport3DWidget camera control', () => {
	it('setCameraPosition updates transform', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		viewport.setCameraPosition(1, 2, 3);

		expect(Transform3D.tx[viewport.cameraEid]).toBeCloseTo(1);
		expect(Transform3D.ty[viewport.cameraEid]).toBeCloseTo(2);
		expect(Transform3D.tz[viewport.cameraEid]).toBeCloseTo(3);
		expect(Transform3D.dirty[viewport.cameraEid]).toBe(1);
	});

	it('setCameraRotation updates transform', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		viewport.setCameraRotation(0.1, 0.2, 0.3);

		expect(Transform3D.rx[viewport.cameraEid]).toBeCloseTo(0.1);
		expect(Transform3D.ry[viewport.cameraEid]).toBeCloseTo(0.2);
		expect(Transform3D.rz[viewport.cameraEid]).toBeCloseTo(0.3);
	});

	it('setFov updates camera', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid, { fov: Math.PI / 3 });

		viewport.setFov(Math.PI / 4);

		expect(Camera3D.fov[viewport.cameraEid]).toBeCloseTo(Math.PI / 4);
	});

	it('methods are chainable', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		const result = viewport
			.setCameraPosition(0, 2, 5)
			.setCameraRotation(0.1, 0, 0)
			.setFov(Math.PI / 4);

		expect(result).toBe(viewport);
	});
});

describe('Viewport3DWidget.resize', () => {
	it('updates viewport dimensions and pixel size', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid, { width: 40, height: 10 });

		viewport.resize(60, 20);

		expect(Viewport3D.width[eid]).toBe(60);
		expect(Viewport3D.height[eid]).toBe(20);
		expect(Viewport3D.pixelWidth[eid]).toBe(120);
		expect(Viewport3D.pixelHeight[eid]).toBe(80);
	});

	it('updates camera aspect ratio', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid, { width: 40, height: 10 });

		viewport.resize(60, 20);

		expect(Camera3D.aspect[viewport.cameraEid]).toBeCloseTo(3);
	});
});

describe('Viewport3DWidget.destroy', () => {
	it('removes all mesh entities', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const meshId = createTestMesh();
		const m1 = viewport.addMesh(meshId, { tz: -3 });
		const m2 = viewport.addMesh(meshId, { tz: -6 });

		viewport.destroy();

		expect(hasComponent(world, m1, Mesh)).toBe(false);
		expect(hasComponent(world, m2, Mesh)).toBe(false);
	});

	it('removes camera entity', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);
		const camEid = viewport.cameraEid;

		viewport.destroy();

		expect(hasComponent(world, camEid, Camera3D)).toBe(false);
	});

	it('clears widget tag', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		createViewport3D(world, eid);
		expect(isViewport3DWidget(eid)).toBe(true);

		// We need to get the widget ref before destroy
		const viewport = createViewport3D(world, addEntity(world) as Entity);
		viewport.destroy();
		expect(isViewport3DWidget(viewport.eid)).toBe(false);
	});
});

describe('Viewport3DWidget visibility', () => {
	it('show and hide are chainable', () => {
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		const viewport = createViewport3D(world, eid);

		const result = viewport.show().hide();
		expect(result).toBe(viewport);
	});
});
