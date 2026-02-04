/**
 * Mesh component and meshStore side-car for 3D geometry data.
 *
 * The Mesh component is a lightweight SoA marker that links an entity to
 * its geometry via a mesh ID. The actual vertex/face data lives in the
 * meshStore Map (side-car pattern, like spriteStore).
 *
 * @module 3d/components/mesh
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../../core/types';

const DEFAULT_CAPACITY = 10000;

/**
 * SoA mesh component. Links entities to geometry data in meshStore.
 *
 * @example
 * ```typescript
 * Mesh.meshId[eid] = registeredId;
 * ```
 */
export const Mesh = {
	/** ID referencing meshStore data */
	meshId: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Geometry data stored in the mesh store.
 * Vertex positions and face indices in typed arrays.
 */
export interface MeshData {
	readonly name: string;
	/** Flat array of vertex positions: [x0, y0, z0, x1, y1, z1, ...] */
	readonly vertices: Float32Array;
	/** Number of vertices (vertices.length / 3) */
	readonly vertexCount: number;
	/** Face indices as flat array of triangles: [i0, i1, i2, i3, i4, i5, ...] */
	readonly indices: Uint32Array;
	/** Number of triangles (indices.length / 3) */
	readonly triangleCount: number;
	/** Optional vertex normals: [nx0, ny0, nz0, nx1, ny1, nz1, ...] */
	readonly normals?: Float32Array;
}

let nextMeshId = 1;
const meshStore = new Map<number, MeshData>();

/**
 * Register mesh geometry data and return an ID.
 *
 * @param name - Descriptive name for the mesh
 * @param vertices - Flat array of vertex positions [x, y, z, ...]
 * @param indices - Triangle indices [i0, i1, i2, ...]
 * @param normals - Optional vertex normals
 * @returns Unique mesh ID
 *
 * @example
 * ```typescript
 * const cubeId = registerMesh('cube',
 *   new Float32Array([-1,-1,-1, 1,-1,-1, ...]),
 *   new Uint32Array([0,1,2, 0,2,3, ...]),
 * );
 * ```
 */
export function registerMesh(
	name: string,
	vertices: Float32Array,
	indices: Uint32Array,
	normals?: Float32Array,
): number {
	const id = nextMeshId++;
	meshStore.set(id, {
		name,
		vertices,
		vertexCount: Math.floor(vertices.length / 3),
		indices,
		triangleCount: Math.floor(indices.length / 3),
		normals,
	});
	return id;
}

/**
 * Create a mesh from arrays of vertex objects and polygon face indices.
 * Automatically triangulates quads and larger polygons using fan triangulation.
 *
 * @param name - Descriptive name
 * @param vertexPositions - Array of {x, y, z} objects
 * @param faces - Array of polygon index arrays (e.g., [[0,1,2,3], [4,5,6,7]])
 * @returns Unique mesh ID
 *
 * @example
 * ```typescript
 * const cubeId = createMeshFromArrays('cube',
 *   [{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, ...],
 *   [[0, 1, 2, 3], [4, 5, 6, 7], ...],
 * );
 * ```
 */
export function createMeshFromArrays(
	name: string,
	vertexPositions: ReadonlyArray<{ readonly x: number; readonly y: number; readonly z: number }>,
	faces: ReadonlyArray<ReadonlyArray<number>>,
): number {
	const vertices = new Float32Array(vertexPositions.length * 3);
	for (let i = 0; i < vertexPositions.length; i++) {
		const v = vertexPositions[i];
		if (!v) continue;
		vertices[i * 3] = v.x;
		vertices[i * 3 + 1] = v.y;
		vertices[i * 3 + 2] = v.z;
	}

	// Triangulate: fan triangulation for polygons with > 3 vertices
	const triangleIndices: number[] = [];
	for (const face of faces) {
		if (face.length < 3) continue;
		for (let i = 1; i < face.length - 1; i++) {
			triangleIndices.push(face[0] as number, face[i] as number, face[i + 1] as number);
		}
	}

	const indices = new Uint32Array(triangleIndices);
	return registerMesh(name, vertices, indices);
}

/**
 * Get mesh data by ID.
 *
 * @param meshId - Mesh ID from registerMesh or createMeshFromArrays
 * @returns MeshData or undefined if not found
 */
export function getMeshData(meshId: number): MeshData | undefined {
	return meshStore.get(meshId);
}

/**
 * Remove mesh data from the store.
 *
 * @param meshId - Mesh ID to remove
 * @returns True if the mesh was found and removed
 */
export function unregisterMesh(meshId: number): boolean {
	return meshStore.delete(meshId);
}

/**
 * Set a mesh component on an entity, linking it to registered geometry.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param meshId - Registered mesh ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * const cubeId = registerMesh('cube', vertices, indices);
 * setMesh(world, eid, cubeId);
 * ```
 */
export function setMesh(world: World, eid: Entity, meshId: number): Entity {
	if (!hasComponent(world, eid, Mesh)) {
		addComponent(world, eid, Mesh);
	}
	Mesh.meshId[eid] = meshId;
	return eid;
}

/**
 * Get the mesh ID for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Mesh ID or undefined if component missing
 */
export function getMesh(world: World, eid: Entity): number | undefined {
	if (!hasComponent(world, eid, Mesh)) {
		return undefined;
	}
	return Mesh.meshId[eid] as number;
}

/**
 * Get the total number of registered meshes.
 */
export function getMeshCount(): number {
	return meshStore.size;
}

/**
 * Clear all registered meshes. Useful for testing.
 */
export function clearMeshStore(): void {
	meshStore.clear();
	nextMeshId = 1;
}
