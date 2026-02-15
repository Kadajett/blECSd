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

/** Parse a vertex (v) line */
function parseVertex(parts: string[]): ObjVertex | null {
	if (parts.length < 4) return null;
	return {
		x: Number.parseFloat(parts[1] as string),
		y: Number.parseFloat(parts[2] as string),
		z: Number.parseFloat(parts[3] as string),
	};
}

/** Parse a texture coordinate (vt) line */
function parseTexCoord(parts: string[]): { u: number; v: number } | null {
	if (parts.length < 3) return null;
	return {
		u: Number.parseFloat(parts[1] as string),
		v: Number.parseFloat(parts[2] as string),
	};
}

/** Parse a face vertex component (v/vt/vn format) */
function parseFaceVertex(
	faceVert: string,
	vertexCount: number,
	texCoordCount: number,
	normalCount: number,
): { vi: number; ti?: number; ni?: number } {
	const parts = faceVert.split('/');
	let vi = Number.parseInt(parts[0] as string, 10);
	vi = vi < 0 ? vertexCount + vi : vi - 1;

	const result: { vi: number; ti?: number; ni?: number } = { vi };

	if (parts.length >= 2 && parts[1] !== '') {
		let ti = Number.parseInt(parts[1] as string, 10);
		ti = ti < 0 ? texCoordCount + ti : ti - 1;
		result.ti = ti;
	}

	if (parts.length >= 3 && parts[2] !== '') {
		let ni = Number.parseInt(parts[2] as string, 10);
		ni = ni < 0 ? normalCount + ni : ni - 1;
		result.ni = ni;
	}

	return result;
}

/** Parse a face (f) line */
function parseFace(
	parts: string[],
	vertexCount: number,
	texCoordCount: number,
	normalCount: number,
): ObjFace | null {
	if (parts.length < 4) return null;

	const vertexIndices: number[] = [];
	const normalIndices: number[] = [];
	const texCoordIndices: number[] = [];
	let hasNormals = false;
	let hasTexCoords = false;

	for (let i = 1; i < parts.length; i++) {
		const fv = parseFaceVertex(parts[i] as string, vertexCount, texCoordCount, normalCount);
		vertexIndices.push(fv.vi);
		if (fv.ti !== undefined) {
			texCoordIndices.push(fv.ti);
			hasTexCoords = true;
		}
		if (fv.ni !== undefined) {
			normalIndices.push(fv.ni);
			hasNormals = true;
		}
	}

	return {
		vertexIndices,
		...(hasNormals ? { normalIndices } : {}),
		...(hasTexCoords ? { texCoordIndices } : {}),
	};
}

/** Accumulator for OBJ parsing state */
interface ObjParseState {
	vertices: ObjVertex[];
	normals: ObjVertex[];
	texCoords: Array<{ u: number; v: number }>;
	faces: ObjFace[];
	groups: ObjGroup[];
}

/** Process a single OBJ line and update parse state */
function processObjLine(parts: string[], state: ObjParseState): void {
	const keyword = parts[0];

	if (keyword === 'v') {
		const v = parseVertex(parts);
		if (v) state.vertices.push(v);
		return;
	}

	if (keyword === 'vn') {
		const n = parseVertex(parts);
		if (n) state.normals.push(n);
		return;
	}

	if (keyword === 'vt') {
		const t = parseTexCoord(parts);
		if (t) state.texCoords.push(t);
		return;
	}

	if (keyword === 'f') {
		const f = parseFace(parts, state.vertices.length, state.texCoords.length, state.normals.length);
		if (f) state.faces.push(f);
		return;
	}

	if ((keyword === 'g' || keyword === 'o') && parts.length >= 2) {
		state.groups.push({ name: parts.slice(1).join(' '), startFace: state.faces.length });
	}
}

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
	const state: ObjParseState = {
		vertices: [],
		normals: [],
		texCoords: [],
		faces: [],
		groups: [],
	};

	const lines = source.split('\n');

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith('#')) continue;

		const parts = line.split(/\s+/);
		processObjLine(parts, state);
	}

	return state;
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
