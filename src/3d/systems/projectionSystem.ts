/**
 * Projection system: builds view/projection matrices from Camera3D,
 * then projects mesh vertices to 2D screen coordinates.
 *
 * For each Viewport3D entity:
 * 1. Gets the camera entity and builds view/projection matrices
 * 2. For each entity with Mesh + Transform3D, projects vertices to screen space
 * 3. Stores results in projectionStore for use by rasterSystem
 *
 * @module 3d/systems/projectionSystem
 */

import { hasComponent, query } from 'bitecs';
import type { Entity, System, World } from '../../core/types';
import { Camera3D } from '../components/camera3d';
import { getMeshData, Mesh } from '../components/mesh';
import { Transform3D } from '../components/transform3d';
import { Viewport3D } from '../components/viewport3d';
import type { Mat4 } from '../math/mat4';
import { mat4Invert, mat4Multiply } from '../math/mat4';
import {
	orthographicMatrix,
	perspectiveMatrix,
	type ScreenCoord,
	viewportTransform,
} from '../math/projection';

// Pre-allocated scratch buffer for viewport transform to avoid per-vertex allocations
const _scratchNdc = new Float32Array(3);

/**
 * A single projected vertex in screen space.
 */
export interface ProjectedVertex {
	readonly x: number;
	readonly y: number;
	readonly depth: number;
	readonly visible: boolean;
}

/**
 * Projection results for a single mesh entity within a viewport.
 */
export interface MeshProjection {
	readonly meshEid: Entity;
	readonly projectedVertices: ReadonlyArray<ProjectedVertex>;
	readonly triangleIndices: Uint32Array;
	readonly mvpMatrix: Mat4;
}

/**
 * Projection results for a viewport.
 */
export interface ViewportProjection {
	readonly viewportEid: Entity;
	readonly cameraEid: Entity;
	readonly meshes: ReadonlyArray<MeshProjection>;
	readonly vpMatrix: Mat4;
	readonly pixelWidth: number;
	readonly pixelHeight: number;
}

/**
 * Per-frame projection store. Cleared and rebuilt each frame by the projection system.
 * Keyed by viewport entity ID.
 */
export const projectionStore = new Map<number, ViewportProjection>();

/**
 * Clear the projection store. Useful for testing.
 */
export function clearProjectionStore(): void {
	projectionStore.clear();
}

/**
 * Build the projection matrix for a camera entity.
 */
function buildProjectionMatrix(cameraEid: Entity): Mat4 {
	const mode = Camera3D.projectionMode[cameraEid] as number;
	const fov = Camera3D.fov[cameraEid] as number;
	const near = Camera3D.near[cameraEid] as number;
	const far = Camera3D.far[cameraEid] as number;
	const aspect = Camera3D.aspect[cameraEid] as number;

	if (mode === 1) {
		// Orthographic
		const halfH = fov; // Reuse fov as ortho height for orthographic mode
		const halfW = halfH * aspect;
		return orthographicMatrix({
			left: -halfW,
			right: halfW,
			bottom: -halfH,
			top: halfH,
			near,
			far,
		});
	}

	return perspectiveMatrix({ fov, aspect, near, far });
}

/**
 * Build the view matrix from a camera's world matrix (inverse of world matrix).
 */
function buildViewMatrix(cameraEid: Entity): Mat4 | null {
	const offset = cameraEid * 16;
	const worldMatrix = Transform3D.worldMatrix.subarray(offset, offset + 16) as Mat4;
	return mat4Invert(worldMatrix);
}

/**
 * Projection system. Projects mesh vertices through camera view/projection for each viewport.
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { projectionSystem, projectionStore } from 'blecsd/3d/systems';
 *
 * projectionSystem(world);
 * const result = projectionStore.get(viewportEid);
 * ```
 */
export const projectionSystem: System = (world: World): World => {
	projectionStore.clear();

	const viewports = query(world, [Viewport3D]) as Entity[];
	const meshEntities = query(world, [Mesh, Transform3D]) as Entity[];

	for (const vpEid of viewports) {
		const cameraEid = Viewport3D.cameraEntity[vpEid] as Entity;

		if (!hasComponent(world, cameraEid, Camera3D)) {
			continue;
		}
		if (!hasComponent(world, cameraEid, Transform3D)) {
			continue;
		}

		const projMatrix = buildProjectionMatrix(cameraEid);
		const viewMatrix = buildViewMatrix(cameraEid);
		if (!viewMatrix) {
			continue; // Camera world matrix not invertible
		}

		const vpMatrix = mat4Multiply(projMatrix, viewMatrix);

		const pixelW = Viewport3D.pixelWidth[vpEid] as number;
		const pixelH = Viewport3D.pixelHeight[vpEid] as number;

		const toScreen = viewportTransform({ x: 0, y: 0, width: pixelW, height: pixelH });

		const meshProjections: MeshProjection[] = [];

		for (const meshEid of meshEntities) {
			const meshId = Mesh.meshId[meshEid] as number;
			const meshData = getMeshData(meshId);
			if (!meshData) continue;

			// Model matrix is the entity's world matrix
			const modelOffset = meshEid * 16;
			const modelMatrix = Transform3D.worldMatrix.subarray(modelOffset, modelOffset + 16) as Mat4;
			const mvpMatrix = mat4Multiply(vpMatrix, modelMatrix);

			const vertCount = meshData.vertexCount;
			const projectedVertices: ProjectedVertex[] = new Array(vertCount);
			const verts = meshData.vertices;

			// Inline MVP transform to avoid per-vertex allocations (no vec3() or projectVertex() calls)
			const m = mvpMatrix;
			const m0 = m[0] as number;
			const m1 = m[1] as number;
			const m2 = m[2] as number;
			const m3 = m[3] as number;
			const m4 = m[4] as number;
			const m5 = m[5] as number;
			const m6 = m[6] as number;
			const m7 = m[7] as number;
			const m8 = m[8] as number;
			const m9 = m[9] as number;
			const m10 = m[10] as number;
			const m11 = m[11] as number;
			const m12 = m[12] as number;
			const m13 = m[13] as number;
			const m14 = m[14] as number;
			const m15 = m[15] as number;

			for (let i = 0; i < vertCount; i++) {
				const i3 = i * 3;
				const vx = verts[i3] as number;
				const vy = verts[i3 + 1] as number;
				const vz = verts[i3 + 2] as number;

				// Inline mat4 * vec4 (w=1) and perspective divide
				const cx = m0 * vx + m4 * vy + m8 * vz + m12;
				const cy = m1 * vx + m5 * vy + m9 * vz + m13;
				const cz = m2 * vx + m6 * vy + m10 * vz + m14;
				const cw = m3 * vx + m7 * vy + m11 * vz + m15;

				const invW = cw !== 0 ? 1 / cw : 0;
				const ndcX = cx * invW;
				const ndcY = cy * invW;
				const ndcZ = cz * invW;

				const visible =
					ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1 && ndcZ >= -1 && ndcZ <= 1;

				// Inline viewport transform
				_scratchNdc[0] = ndcX;
				_scratchNdc[1] = ndcY;
				_scratchNdc[2] = ndcZ;
				const screen: ScreenCoord = toScreen(_scratchNdc);

				projectedVertices[i] = {
					x: screen.x,
					y: screen.y,
					depth: screen.depth,
					visible,
				};
			}

			meshProjections.push({
				meshEid,
				projectedVertices,
				triangleIndices: meshData.indices,
				mvpMatrix,
			});
		}

		projectionStore.set(vpEid, {
			viewportEid: vpEid,
			cameraEid,
			meshes: meshProjections,
			vpMatrix,
			pixelWidth: pixelW,
			pixelHeight: pixelH,
		});
	}

	return world;
};
