/**
 * Types for 3D model loaders.
 * @module 3d/loaders/types
 */

/**
 * A parsed vertex position.
 */
export interface ObjVertex {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

/**
 * A parsed face with vertex, normal, and texcoord indices.
 */
export interface ObjFace {
	readonly vertexIndices: ReadonlyArray<number>;
	readonly normalIndices?: ReadonlyArray<number>;
	readonly texCoordIndices?: ReadonlyArray<number>;
}

/**
 * A named group within an OBJ file.
 */
export interface ObjGroup {
	readonly name: string;
	readonly startFace: number;
}

/**
 * Result of parsing an OBJ file.
 */
export interface ObjParseResult {
	readonly vertices: ReadonlyArray<ObjVertex>;
	readonly normals: ReadonlyArray<ObjVertex>;
	readonly texCoords: ReadonlyArray<{ readonly u: number; readonly v: number }>;
	readonly faces: ReadonlyArray<ObjFace>;
	readonly groups: ReadonlyArray<ObjGroup>;
}
