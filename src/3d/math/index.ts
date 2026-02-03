/**
 * 3D math operations for the rendering pipeline.
 * @module 3d/math
 */

export type { ClippedLine, FrustumPlane } from './clipping';
export {
	clipLine,
	computeOutcode,
	extractFrustumPlanes,
	isPointInFrustum,
	isSphereInFrustum,
} from './clipping';

export type { Mat4 } from './mat4';
export {
	mat4Determinant,
	mat4Equals,
	mat4FromTRS,
	mat4Identity,
	mat4Invert,
	mat4IsIdentity,
	mat4Multiply,
	mat4RotateX,
	mat4RotateY,
	mat4RotateZ,
	mat4Scale,
	mat4TransformDirection,
	mat4TransformVec3,
	mat4Translate,
	mat4Transpose,
} from './mat4';

export type { ScreenCoord } from './projection';
export {
	buildMVP,
	lookAt,
	orthographicMatrix,
	perspectiveMatrix,
	projectVertex,
	unprojectVertex,
	viewportTransform,
} from './projection';

export type { Vec3 } from './vec3';
export {
	vec3,
	vec3Add,
	vec3Cross,
	vec3Distance,
	vec3Dot,
	vec3Equals,
	vec3FromArray,
	vec3Length,
	vec3LengthSq,
	vec3Lerp,
	vec3Negate,
	vec3Normalize,
	vec3Scale,
	vec3Sub,
	vec3Zero,
} from './vec3';
