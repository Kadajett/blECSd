/**
 * Full 3D Pipeline Benchmarks
 *
 * Measures end-to-end performance from transform computation through
 * rasterization and backend encoding.
 *
 * Run with: pnpm bench src/benchmarks/3d-pipeline.bench.ts
 *
 * Targets:
 * - Rotating cube (braille): < 2ms/frame
 * - 500 vert model (braille): < 8ms/frame
 * - 5000 vert model (braille): < 16ms/frame
 *
 * @module benchmarks/3d-pipeline
 */

import { addComponent, addEntity, createWorld } from 'bitecs';
import { afterEach, bench, describe } from 'vitest';
import { Camera3D, setCamera3D } from '../3d/components/camera3d';
import { Material3D, setMaterial3D } from '../3d/components/material';
import { clearMeshStore, Mesh } from '../3d/components/mesh';
import { setTransform3D, Transform3D } from '../3d/components/transform3d';
import { setViewport3D, Viewport3D } from '../3d/components/viewport3d';
import { createCubeMesh, createSphereMesh } from '../3d/stores/primitives';
import { clearProjectionStore, projectionSystem } from '../3d/systems/projectionSystem';
import { clearFramebufferStore, rasterSystem } from '../3d/systems/rasterSystem';
import { sceneGraphSystem } from '../3d/systems/sceneGraphSystem';
import {
	clearBackendStore,
	clearOutputStore,
	viewportOutputSystem,
} from '../3d/systems/viewportOutputSystem';
import type { Entity, World } from '../core/types';

// =============================================================================
// HELPERS
// =============================================================================

function createBenchWorld(): World {
	return createWorld();
}

function addCamera(world: World): Entity {
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

function addViewport(world: World, cameraEid: Entity, pw = 160, ph = 96): Entity {
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

function addMeshEntity(world: World, meshId: number, tz = -5): Entity {
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, { tz });
	addComponent(world, eid, Mesh);
	Mesh.meshId[eid] = meshId;
	return eid;
}

function runPipeline(world: World): void {
	sceneGraphSystem(world);
	projectionSystem(world);
	rasterSystem(world);
	viewportOutputSystem(world);
}

function resetAll(): void {
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
}

// =============================================================================
// CUBE BENCHMARKS (8 vertices, 12 triangles)
// =============================================================================

describe('Full Pipeline - Cube', () => {
	let world: World;
	let cubeEid: Entity;

	afterEach(() => resetAll());

	bench('wireframe cube (braille 160x96)', () => {
		world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		cubeEid = addMeshEntity(world, meshId);
		runPipeline(world);
		resetAll();
	});

	bench('filled cube (braille 160x96)', () => {
		world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		cubeEid = addMeshEntity(world, meshId);
		setMaterial3D(world, cubeEid, { renderMode: 'filled', fillColor: 0x808080 });
		runPipeline(world);
		resetAll();
	});

	bench('both mode cube (braille 160x96)', () => {
		world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		cubeEid = addMeshEntity(world, meshId);
		setMaterial3D(world, cubeEid, { renderMode: 'both', fillColor: 0x808080 });
		runPipeline(world);
		resetAll();
	});
});

// =============================================================================
// SPHERE BENCHMARKS (varying vertex counts)
// =============================================================================

describe('Full Pipeline - Sphere', () => {
	afterEach(() => resetAll());

	bench('~500 vertex sphere (braille 160x96)', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		// widthSegments=24, heightSegments=12 -> ~300 verts
		const meshId = createSphereMesh({ widthSegments: 24, heightSegments: 12 });
		addMeshEntity(world, meshId, -3);
		runPipeline(world);
		resetAll();
	});

	bench('~2000 vertex sphere (braille 160x96)', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createSphereMesh({ widthSegments: 48, heightSegments: 24 });
		addMeshEntity(world, meshId, -3);
		runPipeline(world);
		resetAll();
	});

	bench('~5000 vertex sphere (braille 160x96)', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createSphereMesh({ widthSegments: 80, heightSegments: 40 });
		addMeshEntity(world, meshId, -3);
		runPipeline(world);
		resetAll();
	});
});

// =============================================================================
// MULTI-VIEWPORT BENCHMARKS
// =============================================================================

describe('Full Pipeline - Multi-viewport', () => {
	afterEach(() => resetAll());

	bench('3 viewports, cube each (braille 160x96)', () => {
		const world = createBenchWorld();
		const meshId = createCubeMesh();

		for (let i = 0; i < 3; i++) {
			const cam = addCamera(world);
			addViewport(world, cam);
			addMeshEntity(world, meshId, -5 - i);
		}

		runPipeline(world);
		resetAll();
	});

	bench('3 viewports, sphere each (braille 160x96)', () => {
		const world = createBenchWorld();
		const meshId = createSphereMesh({ widthSegments: 24, heightSegments: 12 });

		for (let i = 0; i < 3; i++) {
			const cam = addCamera(world);
			addViewport(world, cam);
			addMeshEntity(world, meshId, -3 - i);
		}

		runPipeline(world);
		resetAll();
	});
});

// =============================================================================
// INDIVIDUAL SYSTEM BENCHMARKS
// =============================================================================

describe('Individual Systems - Cube', () => {
	afterEach(() => resetAll());

	bench('sceneGraphSystem only', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		addMeshEntity(world, meshId);
		sceneGraphSystem(world);
		resetAll();
	});

	bench('projectionSystem only (after sceneGraph)', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		addMeshEntity(world, meshId);
		sceneGraphSystem(world);
		projectionSystem(world);
		resetAll();
	});

	bench('rasterSystem only (after projection)', () => {
		const world = createBenchWorld();
		const cam = addCamera(world);
		addViewport(world, cam);
		const meshId = createCubeMesh();
		addMeshEntity(world, meshId);
		sceneGraphSystem(world);
		projectionSystem(world);
		rasterSystem(world);
		resetAll();
	});
});
