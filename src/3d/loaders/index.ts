/**
 * 3D model loaders.
 * @module 3d/loaders
 */

export type { ObjFace, ObjGroup, ObjParseResult, ObjVertex } from './types';
export { computeBoundingBox, loadObjAsMesh, parseObj } from './obj';
