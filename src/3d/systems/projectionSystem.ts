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
import { Mesh, getMeshData } from '../components/mesh';
import { Transform3D } from '../components/transform3d';
import { Viewport3D } from '../components/viewport3d';
import type { Mat4 } from '../math/mat4';
import { mat4Invert, mat4Multiply } from '../math/mat4';
import { type ScreenCoord, orthographicMatrix, perspectiveMatrix, projectVertex, viewportTransform } from '../math/projection';
import { vec3 } from '../math/vec3';

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
		return orthographicMatrix({ left: -halfW, right: halfW, bottom: -halfH, top: halfH, near, far });
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

			const projectedVertices: ProjectedVertex[] = [];

			for (let i = 0; i < meshData.vertexCount; i++) {
				const vx = meshData.vertices[i * 3] as number;
				const vy = meshData.vertices[i * 3 + 1] as number;
				const vz = meshData.vertices[i * 3 + 2] as number;

				const ndc = projectVertex(mvpMatrix, vec3(vx, vy, vz));
				const ndcX = ndc[0] as number;
				const ndcY = ndc[1] as number;
				const ndcZ = ndc[2] as number;

				// Visible if within NDC range
				const visible = ndcX >= -1 && ndcX <= 1 &&
					ndcY >= -1 && ndcY <= 1 &&
					ndcZ >= -1 && ndcZ <= 1;

				const screen: ScreenCoord = toScreen(ndc);

				projectedVertices.push({
					x: screen.x,
					y: screen.y,
					depth: screen.depth,
					visible,
				});
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
