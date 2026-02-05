import { afterEach, describe, expect, it } from 'vitest';
import { addComponent, addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Camera3D, setCamera3D } from '../components/camera3d';
import { clearMeshStore, createMeshFromArrays, Mesh } from '../components/mesh';
import { setTransform3D, Transform3D } from '../components/transform3d';
import { setViewport3D, Viewport3D } from '../components/viewport3d';
import { clearProjectionStore, projectionStore, projectionSystem } from './projectionSystem';
import { sceneGraphSystem } from './sceneGraphSystem';

function createTestWorld(): World {
	return createWorld();
}

function setupCamera(world: World, config?: Record<string, number>): Entity {
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, config ?? {});
	setCamera3D(world, eid, {
		fov: Math.PI / 3,
		near: 0.1,
		far: 100,
		aspect: 1,
	});
	return eid;
}

function setupViewport(world: World, cameraEid: Entity): Entity {
	const eid = addEntity(world) as Entity;
	setViewport3D(world, eid, {
		left: 0,
		top: 0,
		width: 80,
		height: 24,
		cameraEntity: cameraEid,
	});
	// pixelWidth/pixelHeight are computed fields, set directly
	Viewport3D.pixelWidth[eid] = 160;
	Viewport3D.pixelHeight[eid] = 96;
	return eid;
}

function setupCubeMesh(world: World, config?: Record<string, number>): Entity {
	const meshId = createMeshFromArrays(
		'test-cube',
		[
			{ x: -1, y: -1, z: -1 },
			{ x: 1, y: -1, z: -1 },
			{ x: 1, y: 1, z: -1 },
			{ x: -1, y: 1, z: -1 },
			{ x: -1, y: -1, z: 1 },
			{ x: 1, y: -1, z: 1 },
			{ x: 1, y: 1, z: 1 },
			{ x: -1, y: 1, z: 1 },
		],
		[
			[0, 1, 2, 3],
			[5, 4, 7, 6],
			[4, 0, 3, 7],
			[1, 5, 6, 2],
			[3, 2, 6, 7],
			[4, 5, 1, 0],
		],
	);

	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, config ?? {});
	addComponent(world, eid, Mesh);
	Mesh.meshId[eid] = meshId;
	return eid;
}

afterEach(() => {
	clearProjectionStore();
	clearMeshStore();
	// Reset component arrays
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
});

describe('projectionSystem', () => {
	it('projects cube in front of camera to viewport center area', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCubeMesh(world, { tz: -5 });

		sceneGraphSystem(world);
		projectionSystem(world);

		const result = projectionStore.get(vp);
		expect(result).toBeDefined();
		expect(result?.meshes).toHaveLength(1);

		const mesh = result?.meshes[0];
		expect(mesh?.projectedVertices.length).toBe(8);

		// Vertices should be near center of the viewport (80px, 48px)
		for (const v of mesh?.projectedVertices ?? []) {
			expect(v.x).toBeGreaterThan(0);
			expect(v.x).toBeLessThan(160);
			expect(v.y).toBeGreaterThan(0);
			expect(v.y).toBeLessThan(96);
		}
	});

	it('stores triangle indices from mesh', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		setupCubeMesh(world, { tz: -5 });

		sceneGraphSystem(world);
		projectionSystem(world);

		const result = [...projectionStore.values()][0];
		const mesh = result?.meshes[0];
		expect(mesh?.triangleIndices.length).toBeGreaterThan(0);
		// 6 quads * 2 triangles * 3 indices = 36
		expect(mesh?.triangleIndices.length).toBe(36);
	});

	it('marks off-screen vertices as not visible', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		// Place cube far to the right
		setupCubeMesh(world, { tx: 100, tz: -5 });

		sceneGraphSystem(world);
		projectionSystem(world);

		const result = [...projectionStore.values()][0];
		const mesh = result?.meshes[0];
		// Some or all vertices should be off-screen
		const visibleCount = mesh?.projectedVertices.filter((v) => v.visible).length ?? 0;
		expect(visibleCount).toBeLessThan(8);
	});

	it('perspective: farther objects project smaller', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		const near = setupCubeMesh(world, { tz: -3 });
		const far = setupCubeMesh(world, { tz: -10 });

		sceneGraphSystem(world);
		projectionSystem(world);

		const result = [...projectionStore.values()][0];
		const nearMesh = result?.meshes.find((m) => m.meshEid === near);
		const farMesh = result?.meshes.find((m) => m.meshEid === far);

		// Compute screen-space extents
		function getExtentX(verts: ReadonlyArray<{ x: number }> | undefined): number {
			if (!verts || verts.length === 0) return 0;
			const xs = verts.map((v) => v.x);
			return Math.max(...xs) - Math.min(...xs);
		}

		const nearExtent = getExtentX(nearMesh?.projectedVertices);
		const farExtent = getExtentX(farMesh?.projectedVertices);
		expect(nearExtent).toBeGreaterThan(farExtent);
	});

	it('handles empty scene (no meshes)', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);

		sceneGraphSystem(world);
		projectionSystem(world);

		const result = projectionStore.get(vp);
		expect(result).toBeDefined();
		expect(result?.meshes).toHaveLength(0);
	});

	it('handles viewport with no valid camera', () => {
		const world = createTestWorld();
		const fakeCam = addEntity(world) as Entity;
		const vp = addEntity(world) as Entity;
		setViewport3D(world, vp, {
			left: 0,
			top: 0,
			width: 80,
			height: 24,
			cameraEntity: fakeCam,
		});
		Viewport3D.pixelWidth[vp] = 160;
		Viewport3D.pixelHeight[vp] = 96;
		setupCubeMesh(world, { tz: -5 });

		sceneGraphSystem(world);
		projectionSystem(world);

		// No projection result since camera doesn't have Camera3D component
		expect(projectionStore.has(vp)).toBe(false);
	});

	it('creates separate results per viewport', () => {
		const world = createTestWorld();
		const cam1 = setupCamera(world);
		const cam2 = setupCamera(world, { tx: 10 });
		const vp1 = setupViewport(world, cam1);
		const vp2 = setupViewport(world, cam2);
		setupCubeMesh(world, { tz: -5 });

		sceneGraphSystem(world);
		projectionSystem(world);

		expect(projectionStore.size).toBe(2);
		expect(projectionStore.has(vp1)).toBe(true);
		expect(projectionStore.has(vp2)).toBe(true);
	});
});
