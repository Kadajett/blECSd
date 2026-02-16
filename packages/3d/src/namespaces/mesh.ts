/**
 * Mesh operations namespace with sub-namespaces for primitives and loaders.
 *
 * @example
 * ```typescript
 * import { mesh } from '@blecsd/3d';
 *
 * // Create primitives
 * const cubeId = mesh.primitives.cube({ size: 2 });
 * const sphereId = mesh.primitives.sphere({ radius: 1, segments: 16 });
 *
 * // Load from OBJ
 * const modelId = mesh.loaders.loadObj(objSource, { name: 'myModel' });
 *
 * // Assign to entity
 * mesh.set(world, eid, cubeId);
 * const data = mesh.getData(cubeId);
 * ```
 */

import type { Entity, World } from 'blecsd/core';
import {
	clearMeshStore,
	createMeshFromArrays,
	getMesh,
	getMeshCount,
	getMeshData,
	Mesh,
	type MeshData,
	registerMesh,
	setMesh,
	unregisterMesh,
} from '../components/mesh';
import { computeBoundingBox, loadObjAsMesh, parseObj } from '../loaders/obj';
import type { ObjFace, ObjGroup, ObjParseResult, ObjVertex } from '../loaders/types';
import {
	createCubeMesh,
	createCylinderMesh,
	createPlaneMesh,
	createSphereMesh,
} from '../stores/primitives';

export const mesh = Object.freeze({
	component: Mesh,
	register: registerMesh,
	createFromArrays: createMeshFromArrays,
	getData: getMeshData,
	unregister: unregisterMesh,
	set: setMesh,
	get: getMesh,
	getCount: getMeshCount,
	clearStore: clearMeshStore,

	primitives: Object.freeze({
		cube: createCubeMesh,
		sphere: createSphereMesh,
		plane: createPlaneMesh,
		cylinder: createCylinderMesh,
	}),

	loaders: Object.freeze({
		parseObj,
		computeBoundingBox,
		loadObj: loadObjAsMesh,
	}),
});

export type MeshModule = typeof mesh;
export type { Entity, World, MeshData, ObjParseResult, ObjVertex, ObjFace, ObjGroup };
