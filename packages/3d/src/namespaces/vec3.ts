/**
 * Vec3 operations namespace for 3D vector math.
 *
 * @example
 * ```typescript
 * import { vec3 } from '@blecsd/3d';
 *
 * const v = vec3.create(1, 2, 3);
 * const len = vec3.length(v);
 * const unit = vec3.normalize(v);
 * const sum = vec3.add(v, unit);
 * ```
 */

import {
	vec3Add,
	vec3 as vec3Create,
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
} from '../math/vec3';

export const vec3 = Object.freeze({
	create: vec3Create,
	fromArray: vec3FromArray,
	zero: vec3Zero,
	add: vec3Add,
	sub: vec3Sub,
	scale: vec3Scale,
	dot: vec3Dot,
	cross: vec3Cross,
	lengthSq: vec3LengthSq,
	length: vec3Length,
	normalize: vec3Normalize,
	lerp: vec3Lerp,
	negate: vec3Negate,
	distance: vec3Distance,
	equals: vec3Equals,
});

export type Vec3Module = typeof vec3;
