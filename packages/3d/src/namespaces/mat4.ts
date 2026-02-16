/**
 * Mat4 operations namespace for 4x4 matrix math.
 *
 * @example
 * ```typescript
 * import { mat4 } from '@blecsd/3d';
 *
 * const m = mat4.identity();
 * const moved = mat4.translate(m, 10, 0, -5);
 * const rotated = mat4.rotateY(moved, Math.PI / 4);
 * const scaled = mat4.scale(rotated, 2, 2, 2);
 * ```
 */

import {
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
} from '../math/mat4';

export const mat4 = Object.freeze({
	identity: mat4Identity,
	multiply: mat4Multiply,
	translate: mat4Translate,
	rotateX: mat4RotateX,
	rotateY: mat4RotateY,
	rotateZ: mat4RotateZ,
	scale: mat4Scale,
	transpose: mat4Transpose,
	determinant: mat4Determinant,
	invert: mat4Invert,
	transformVec3: mat4TransformVec3,
	transformDirection: mat4TransformDirection,
	fromTRS: mat4FromTRS,
	isIdentity: mat4IsIdentity,
	equals: mat4Equals,
});

export type Mat4Module = typeof mat4;
