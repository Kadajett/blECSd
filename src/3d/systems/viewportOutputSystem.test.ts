import { addComponent, addEntity, createWorld } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Entity, World } from '../../core/types';
import { Camera3D, setCamera3D } from '../components/camera3d';
import { Material3D } from '../components/material';
import { Mesh, clearMeshStore, createMeshFromArrays } from '../components/mesh';
import { Transform3D, setTransform3D } from '../components/transform3d';
import { Viewport3D, setViewport3D } from '../components/viewport3d';
import { sceneGraphSystem } from './sceneGraphSystem';
import { clearProjectionStore, projectionSystem } from './projectionSystem';
import { clearFramebufferStore, rasterSystem } from './rasterSystem';
import {
	backendStore,
	clearBackendStore,
	clearOutputStore,
	outputStore,
	viewportOutputSystem,
} from './viewportOutputSystem';

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
		left: 5, top: 2, width: 80, height: 24,
		cameraEntity: cameraEid,
	});
	Viewport3D.pixelWidth[eid] = pw;
	Viewport3D.pixelHeight[eid] = ph;
	return eid;
}

function setupCube(world: World, config?: Record<string, number>): Entity {
	const meshId = createMeshFromArrays('cube', [
		{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
		{ x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
		{ x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
		{ x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
	], [
		[0, 1, 2, 3], [5, 4, 7, 6],
		[4, 0, 3, 7], [1, 5, 6, 2],
		[3, 2, 6, 7], [4, 5, 1, 0],
	]);
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, config ?? { tz: -5 });
	addComponent(world, eid, Mesh);
	Mesh.meshId[eid] = meshId;
	return eid;
}

function runFullPipeline(world: World): void {
	sceneGraphSystem(world);
	projectionSystem(world);
	rasterSystem(world);
	viewportOutputSystem(world);
}

afterEach(() => {
	clearProjectionStore();
	clearFramebufferStore();
	clearBackendStore();
	clearOutputStore();
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

describe('viewportOutputSystem', () => {
	it('produces output for viewport with braille backend', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);

		const output = outputStore.get(vp);
		expect(output).toBeDefined();
		expect(output?.backendType).toBe('braille');
		expect(output?.encoded.cells).toBeDefined();
		expect(output?.encoded.cells!.length).toBeGreaterThan(0);
	});

	it('positions cells at viewport screen coordinates', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);

		const output = outputStore.get(vp);
		expect(output?.screenX).toBe(5);
		expect(output?.screenY).toBe(2);

		// All cells should be offset by viewport position
		for (const cell of output?.encoded.cells ?? []) {
			expect(cell.x).toBeGreaterThanOrEqual(5);
			expect(cell.y).toBeGreaterThanOrEqual(2);
		}
	});

	it('caches backend in backendStore', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);

		const backend1 = backendStore.get(vp);
		expect(backend1).toBeDefined();
		expect(backend1?.type).toBe('braille');

		// Run again, should reuse
		sceneGraphSystem(world);
		projectionSystem(world);
		rasterSystem(world);
		viewportOutputSystem(world);

		const backend2 = backendStore.get(vp);
		expect(backend1).toBe(backend2);
	});

	it('empty framebuffer produces cells with space/empty chars', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		// No meshes - empty scene

		runFullPipeline(world);

		const output = outputStore.get(vp);
		expect(output).toBeDefined();

		// All cells should be blank (braille base char U+2800 = no dots)
		const cells = output?.encoded.cells ?? [];
		for (const cell of cells) {
			// Empty braille cell is U+2800 (no dots set)
			expect(cell.char).toBe('\u2800');
		}
	});

	it('no output when no framebuffer exists', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		// Skip rasterSystem - no framebuffer created

		sceneGraphSystem(world);
		projectionSystem(world);
		// intentionally skip rasterSystem
		viewportOutputSystem(world);

		expect(outputStore.has(vp)).toBe(false);
	});

	it('braille output contains braille unicode characters', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);

		const output = [...outputStore.values()][0]!;
		const cells = output.encoded.cells ?? [];

		// At least some cells should have non-blank braille chars (not just U+2800)
		const nonBlank = cells.filter(c => c.char !== '\u2800');
		expect(nonBlank.length).toBeGreaterThan(0);

		// All chars should be in braille range U+2800-U+28FF
		for (const cell of cells) {
			const code = cell.char.codePointAt(0) ?? 0;
			expect(code).toBeGreaterThanOrEqual(0x2800);
			expect(code).toBeLessThanOrEqual(0x28FF);
		}
	});

	it('stores viewport entity ID in output', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);

		const output = outputStore.get(vp);
		expect(output?.viewportEid).toBe(vp);
	});

	it('resolves new backend when backend type changes', () => {
		const world = createTestWorld();
		const cam = setupCamera(world);
		const vp = setupViewport(world, cam);
		setupCube(world);

		runFullPipeline(world);
		expect(backendStore.get(vp)?.type).toBe('braille');

		// Change to halfblock (type 2)
		Viewport3D.backendType[vp] = 2;

		sceneGraphSystem(world);
		projectionSystem(world);
		rasterSystem(world);
		viewportOutputSystem(world);

		expect(backendStore.get(vp)?.type).toBe('halfblock');
	});

	it('handles multiple viewports independently', () => {
		const world = createTestWorld();
		const cam1 = setupCamera(world);
		const cam2 = setupCamera(world);
		const vp1 = setupViewport(world, cam1);
		const vp2 = setupViewport(world, cam2);
		setupCube(world);

		runFullPipeline(world);

		expect(outputStore.size).toBe(2);
		expect(outputStore.has(vp1)).toBe(true);
		expect(outputStore.has(vp2)).toBe(true);
	});
});
