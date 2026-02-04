/**
 * Wavefront OBJ file parser and loader.
 *
 * Parses OBJ text into vertex/face data and loads it into meshStore.
 *
 * @module 3d/loaders/obj
 */

import { createMeshFromArrays } from '../components/mesh';
import { type ObjLoadOptions, ObjLoadOptionsSchema } from '../schemas/model';
import type { ObjFace, ObjGroup, ObjParseResult, ObjVertex } from './types';

/**
 * Parse a Wavefront OBJ file from a text string.
 *
 * Supports: v (vertex), vn (normal), vt (texcoord), f (face), g/o (group/object).
 * Face formats: f v, f v/vt, f v/vt/vn, f v//vn.
 * OBJ indices are 1-based and converted to 0-based.
 * Negative indices are supported (relative to end of vertex list).
 *
 * @param source - OBJ file content as string
 * @returns Parsed result with vertices, normals, texCoords, faces, and groups
 *
 * @example
 * ```typescript
 * const result = parseObj(`
 *   v 0 0 0
 *   v 1 0 0
 *   v 0 1 0
 *   f 1 2 3
 * `);
 * // result.vertices.length === 3
 * // result.faces.length === 1
 * ```
 */
export function parseObj(source: string): ObjParseResult {
	const vertices: ObjVertex[] = [];
	const normals: ObjVertex[] = [];
	const texCoords: Array<{ u: number; v: number }> = [];
	const faces: ObjFace[] = [];
	const groups: ObjGroup[] = [];

	const lines = source.split('\n');

	for (const rawLine of lines) {
		const line = rawLine.trim();

		// Skip comments and blank lines
		if (line.length === 0 || line.startsWith('#')) {
			continue;
		}

		const parts = line.split(/\s+/);
		const keyword = parts[0];

		if (keyword === 'v' && parts.length >= 4) {
			vertices.push({
				x: Number.parseFloat(parts[1] as string),
				y: Number.parseFloat(parts[2] as string),
				z: Number.parseFloat(parts[3] as string),
			});
		} else if (keyword === 'vn' && parts.length >= 4) {
			normals.push({
				x: Number.parseFloat(parts[1] as string),
				y: Number.parseFloat(parts[2] as string),
				z: Number.parseFloat(parts[3] as string),
			});
		} else if (keyword === 'vt' && parts.length >= 3) {
			texCoords.push({
				u: Number.parseFloat(parts[1] as string),
				v: Number.parseFloat(parts[2] as string),
			});
		} else if (keyword === 'f' && parts.length >= 4) {
			const vertexIndices: number[] = [];
			const normalIndices: number[] = [];
			const texCoordIndices: number[] = [];
			let hasNormals = false;
			let hasTexCoords = false;

			for (let i = 1; i < parts.length; i++) {
				const faceVert = (parts[i] as string).split('/');
				let vi = Number.parseInt(faceVert[0] as string, 10);
				// Convert 1-based to 0-based, handle negative indices
				vi = vi < 0 ? vertices.length + vi : vi - 1;
				vertexIndices.push(vi);

				if (faceVert.length >= 2 && faceVert[1] !== '') {
					let ti = Number.parseInt(faceVert[1] as string, 10);
					ti = ti < 0 ? texCoords.length + ti : ti - 1;
					texCoordIndices.push(ti);
					hasTexCoords = true;
				}

				if (faceVert.length >= 3 && faceVert[2] !== '') {
					let ni = Number.parseInt(faceVert[2] as string, 10);
					ni = ni < 0 ? normals.length + ni : ni - 1;
					normalIndices.push(ni);
					hasNormals = true;
				}
			}

			const face: ObjFace = {
				vertexIndices,
				...(hasNormals ? { normalIndices } : {}),
				...(hasTexCoords ? { texCoordIndices } : {}),
			};
			faces.push(face);
		} else if ((keyword === 'g' || keyword === 'o') && parts.length >= 2) {
			groups.push({
				name: parts.slice(1).join(' '),
				startFace: faces.length,
			});
		}
	}

	return { vertices, normals, texCoords, faces, groups };
}

/**
 * Compute the axis-aligned bounding box of vertices.
 *
 * @param vertices - Array of vertex positions
 * @returns Bounding box with min, max, and center
 *
 * @example
 * ```typescript
 * const bbox = computeBoundingBox(vertices);
 * console.log(bbox.center);
 * ```
 */
export function computeBoundingBox(vertices: ReadonlyArray<ObjVertex>): {
	min: ObjVertex;
	max: ObjVertex;
	center: ObjVertex;
} {
	if (vertices.length === 0) {
		return {
			min: { x: 0, y: 0, z: 0 },
			max: { x: 0, y: 0, z: 0 },
			center: { x: 0, y: 0, z: 0 },
		};
	}

	let minX = Infinity;
	let minY = Infinity;
	let minZ = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let maxZ = -Infinity;

	for (const v of vertices) {
		if (v.x < minX) minX = v.x;
		if (v.y < minY) minY = v.y;
		if (v.z < minZ) minZ = v.z;
		if (v.x > maxX) maxX = v.x;
		if (v.y > maxY) maxY = v.y;
		if (v.z > maxZ) maxZ = v.z;
	}

	return {
		min: { x: minX, y: minY, z: minZ },
		max: { x: maxX, y: maxY, z: maxZ },
		center: {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
			z: (minZ + maxZ) / 2,
		},
	};
}

/**
 * Parse an OBJ file and load it into meshStore.
 * Applies optional transforms (flip, scale, center).
 *
 * @param source - OBJ file content as string
 * @param options - Load options (validated via Zod)
 * @returns Mesh ID in meshStore
 *
 * @example
 * ```typescript
 * const meshId = loadObjAsMesh(objText, { name: 'teapot', scale: 0.5 });
 * ```
 */
export function loadObjAsMesh(source: string, options: ObjLoadOptions): number {
	const validated = ObjLoadOptionsSchema.parse(options);
	const parsed = parseObj(source);

	let verts = [...parsed.vertices];

	// Apply flipYZ
	if (validated.flipYZ) {
		verts = verts.map((v) => ({ x: v.x, y: v.z, z: v.y }));
	}

	// Apply scale
	if (validated.scale !== 1) {
		const s = validated.scale;
		verts = verts.map((v) => ({ x: v.x * s, y: v.y * s, z: v.z * s }));
	}

	// Apply centerOrigin
	if (validated.centerOrigin && verts.length > 0) {
		const bbox = computeBoundingBox(verts);
		const cx = bbox.center.x;
		const cy = bbox.center.y;
		const cz = bbox.center.z;
		verts = verts.map((v) => ({ x: v.x - cx, y: v.y - cy, z: v.z - cz }));
	}

	// Convert faces to index arrays
	const faceArrays = parsed.faces.map((f) => [...f.vertexIndices]);

	return createMeshFromArrays(validated.name, verts, faceArrays);
}
