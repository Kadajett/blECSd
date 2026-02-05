import { afterEach, describe, expect, it } from 'vitest';
import { addComponent, addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Camera3D, setCamera3D } from '../components/camera3d';
import { Material3D, setMaterial3D } from '../components/material';
import { clearMeshStore, createMeshFromArrays, Mesh } from '../components/mesh';
import { setTransform3D, Transform3D } from '../components/transform3d';
import { setViewport3D, Viewport3D } from '../components/viewport3d';
import { clearProjectionStore, projectionSystem } from './projectionSystem';
import { clearFramebufferStore, framebufferStore, rasterSystem } from './rasterSystem';
import { sceneGraphSystem } from './sceneGraphSystem';

function createTestWorld(): World {
	return createWorld();
}

function setupCamera(world: World): Entity {
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, {});
	setCamera3D(world, eid, {
		fov: Math.PI / 3,
		near: 0.1,
		far: 100,
		aspect: 1,
	});
	return eid;
}

function setupViewport(world: World, cameraEid: Entity, pw = 160, ph = 96): Entity {
	const eid = addEntity(world) as Entity;
	setViewport3D(world, eid, {
		left: 0,
		top: 0,
		width: 80,
		height: 24,
		cameraEntity: cameraEid,
	});
	Viewport3D.pixelWidth[eid] = pw;
	Viewport3D.pixelHeight[eid] = ph;
	return eid;
}

function setupCube(world: World, config?: Record<string, number>): Entity {
	const meshId = createMeshFromArrays(
		'cube',
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
	setTransform3D(world, eid, config ?? { tz: -5 });
	addComponent(world, eid, Mesh);
	Mesh.meshId[eid] = meshId;
	return eid;
}

function runPipeline(world: World): void {
	sceneGraphSystem(world);
	projectionSystem(world);
	rasterSystem(world);
}

function countNonZeroPixels(fb: {
	colorBuffer: Uint8ClampedArray;
	width: number;
	height: number;
}): number {
	let count = 0;
	for (let i = 3; i < fb.colorBuffer.length; i += 4) {
		if ((fb.colorBuffer[i] as number) > 0) count++;
	}
	return count;
}

afterEach(() => {
	clearProjectionStore();
	clearFramebufferStore();
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
});

describe('rasterSystem', () => {
	it('creates framebuffer for viewport', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runPipeline(world);

		const fb = framebufferStore.get(vp);
		expect(fb).toBeDefined();
		expect(fb?.width).toBe(160);
		expect(fb?.height).toBe(96);
	});

	it('wireframe cube draws non-zero pixels', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		setupCube(world);

		runPipeline(world);

		const fb = [...framebufferStore.values()][0]!;
		const nonZero = countNonZeroPixels(fb);
		expect(nonZero).toBeGreaterThan(0);
	});

	it('filled triangle draws more pixels than wireframe', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);

		// Wireframe run
		const vpWire = setupViewport(world, cam, 160, 96);
		setupCube(world);
		runPipeline(world);
		const fbWire = framebufferStore.get(vpWire)!;
		const wirePixels = countNonZeroPixels(fbWire);

		clearProjectionStore();
		clearFramebufferStore();
		clearMeshStore();
		// Reset SoA arrays for new world
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
		Viewport3D.left.fill(0);
		Viewport3D.top.fill(0);
		Viewport3D.width.fill(0);
		Viewport3D.height.fill(0);
		Viewport3D.cameraEntity.fill(0);
		Viewport3D.pixelWidth.fill(0);
		Viewport3D.pixelHeight.fill(0);
		Mesh.meshId.fill(0);
		Material3D.wireColor.fill(0);
		Material3D.fillColor.fill(0);
		Material3D.renderMode.fill(0);
		Material3D.backfaceCull.fill(0);

		// Filled run with new world
		const world2 = createTestWorld();
		const cam2 = setupCamera(world2);
		const vpFill = setupViewport(world2, cam2, 160, 96);
		const cubeFill = setupCube(world2);
		setMaterial3D(world2, cubeFill, { renderMode: 'filled', fillColor: 0x808080 });
		runPipeline(world2);
		const fbFill = framebufferStore.get(vpFill)!;
		const fillPixels = countNonZeroPixels(fbFill);

		expect(fillPixels).toBeGreaterThan(wirePixels);
	});

	it('empty scene produces clear framebuffer', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);

		runPipeline(world);

		const fb = framebufferStore.get(vp)!;
		const nonZero = countNonZeroPixels(fb);
		expect(nonZero).toBe(0);
	});

	it('custom wireColor determines pixel colors', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		const cube = setupCube(world);
		// Red wire color: R=255, G=0, B=0 (24-bit RGB)
		setMaterial3D(world, cube, { wireColor: 0xff0000 });

		runPipeline(world);

		const fb = [...framebufferStore.values()][0]!;
		// Find first non-transparent pixel and check it's red
		let foundRed = false;
		for (let i = 0; i < fb.colorBuffer.length; i += 4) {
			if ((fb.colorBuffer[i + 3] as number) > 0) {
				const r = fb.colorBuffer[i] as number;
				const b = fb.colorBuffer[i + 2] as number;
				if (r > 200 && b < 50) {
					foundRed = true;
					break;
				}
			}
		}
		expect(foundRed).toBe(true);
	});

	it('reuses framebuffer when dimensions match', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runPipeline(world);
		const fb1 = framebufferStore.get(vp);

		// Run again - should reuse
		Transform3D.dirty.fill(0); // avoid re-dirtying
		sceneGraphSystem(world);
		projectionSystem(world);
		rasterSystem(world);
		const fb2 = framebufferStore.get(vp);

		expect(fb1).toBe(fb2); // Same reference
	});
});
