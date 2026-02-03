/**
 * Stress tests: determine maximum vertex/entity counts at 30fps and 60fps budgets.
 *
 * Frame budget: 33.3ms at 30fps, 16.6ms at 60fps.
 * Tests full pipeline (sceneGraph + projection + raster + viewportOutput).
 *
 * @module benchmarks/3d-stress
 */

import { bench, describe } from 'vitest';
import { addComponent, addEntity, createWorld } from 'bitecs';
import type { Entity, World } from '../core/types';
import { Camera3D, setCamera3D } from '../3d/components/camera3d';
import { setMaterial3D } from '../3d/components/material';
import { Mesh, registerMesh } from '../3d/components/mesh';
import { Transform3D, setTransform3D } from '../3d/components/transform3d';
import { Viewport3D, setViewport3D } from '../3d/components/viewport3d';
import { createSphereMesh } from '../3d/stores/primitives';
import { sceneGraphSystem } from '../3d/systems/sceneGraphSystem';
import { projectionSystem, clearProjectionStore } from '../3d/systems/projectionSystem';
import { rasterSystem, clearFramebufferStore } from '../3d/systems/rasterSystem';
import { viewportOutputSystem, clearBackendStore, clearOutputStore } from '../3d/systems/viewportOutputSystem';

function setupStressWorld(meshCount: number, verticesPerMesh: number): { world: World; vpEid: Entity } {
	const world = createWorld() as World;

	// Camera
	const camEid = addEntity(world) as Entity;
	setCamera3D(world, camEid, { fov: Math.PI / 3, near: 0.1, far: 200 });
	setTransform3D(world, camEid, { tz: 20 });

	// Viewport
	const vpEid = addEntity(world) as Entity;
	setViewport3D(world, vpEid, { width: 80, height: 24, cameraEntity: camEid });
	Viewport3D.pixelWidth[vpEid] = 160;
	Viewport3D.pixelHeight[vpEid] = 96;
	addComponent(world, vpEid, Viewport3D);

	// Determine sphere segments to approximate target vertex count
	const segs = Math.max(4, Math.round(Math.sqrt(verticesPerMesh)));
	const meshId = createSphereMesh({ radius: 0.5, widthSegments: segs, heightSegments: Math.max(2, Math.round(segs / 2)) });

	for (let i = 0; i < meshCount; i++) {
		const eid = addEntity(world) as Entity;
		setTransform3D(world, eid, {
			tx: (i % 10) * 2 - 10,
			ty: Math.floor(i / 10) * 2 - 10,
			tz: -5 - (i % 5),
		});
		setMaterial3D(world, eid, { renderMode: 'wireframe', wireColor: 0x00FF88 });
		addComponent(world, eid, Mesh);
		Mesh.meshId[eid] = meshId;
	}

	// Initial scene graph pass
	sceneGraphSystem(world);

	return { world, vpEid };
}

function runFullPipeline(world: World): void {
	sceneGraphSystem(world);
	projectionSystem(world);
	rasterSystem(world);
	viewportOutputSystem(world);
}

describe('Stress Test - Wireframe Entity Counts', () => {
	const configs: Array<{ label: string; meshCount: number; verts: number }> = [
		{ label: '1 mesh, 50 verts', meshCount: 1, verts: 50 },
		{ label: '10 meshes, 50 verts each', meshCount: 10, verts: 50 },
		{ label: '50 meshes, 50 verts each', meshCount: 50, verts: 50 },
		{ label: '100 meshes, 50 verts each', meshCount: 100, verts: 50 },
		{ label: '1 mesh, 500 verts', meshCount: 1, verts: 500 },
		{ label: '1 mesh, 2000 verts', meshCount: 1, verts: 2000 },
		{ label: '1 mesh, 5000 verts', meshCount: 1, verts: 5000 },
		{ label: '1 mesh, 10000 verts', meshCount: 1, verts: 10000 },
		{ label: '10 meshes, 500 verts each', meshCount: 10, verts: 500 },
		{ label: '5 meshes, 2000 verts each', meshCount: 5, verts: 2000 },
	];

	for (const cfg of configs) {
		bench(cfg.label, () => {
			const { world } = setupStressWorld(cfg.meshCount, cfg.verts);
			runFullPipeline(world);
		});
	}
});

describe('Stress Test - Multi-Viewport', () => {
	bench('3 viewports, 10 meshes x 500 verts', () => {
		const world = createWorld() as World;

		for (let v = 0; v < 3; v++) {
			const camEid = addEntity(world) as Entity;
			setCamera3D(world, camEid, { fov: Math.PI / 3, near: 0.1, far: 200 });
			setTransform3D(world, camEid, { tz: 20, tx: v * 5 });

			const vpEid = addEntity(world) as Entity;
			setViewport3D(world, vpEid, { width: 40, height: 12, cameraEntity: camEid });
			Viewport3D.pixelWidth[vpEid] = 80;
			Viewport3D.pixelHeight[vpEid] = 48;
			addComponent(world, vpEid, Viewport3D);
		}

		const segs = 22;
		const meshId = createSphereMesh({ radius: 0.5, widthSegments: segs, heightSegments: 11 });

		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world) as Entity;
			setTransform3D(world, eid, { tx: i * 2 - 10, tz: -5 });
			setMaterial3D(world, eid, { renderMode: 'wireframe', wireColor: 0xFF0000 });
			addComponent(world, eid, Mesh);
			Mesh.meshId[eid] = meshId;
		}

		sceneGraphSystem(world);
		runFullPipeline(world);
	});
});
