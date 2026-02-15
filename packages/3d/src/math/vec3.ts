/**
 * Vec3 operations on Float32Array for the 3D pipeline.
 * All functions are pure: they return new arrays and never mutate inputs.
 * @module 3d/math/vec3
 */

import { Vec3Schema } from '../schemas/math';

/**
 * A 3D vector stored as Float32Array of length 3: [x, y, z].
 */
export type Vec3 = Float32Array;

/**
 * Create a Vec3 from x, y, z components.
 *
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns A new Vec3
 *
 * @example
 * ```typescript
 * const v = vec3(1, 2, 3);
 * // v[0] === 1, v[1] === 2, v[2] === 3
 * ```
 */
export function vec3(x: number, y: number, z: number): Vec3 {
	const out = new Float32Array(3);
	out[0] = x;
	out[1] = y;
	out[2] = z;
	return out;
}

/**
 * Create a Vec3 from a number array, validated via Zod.
 * Use at API boundaries where input is untrusted.
 *
 * @param arr - Array of exactly 3 numbers
 * @returns A new Vec3
 * @throws ZodError if input is not a valid 3-element number tuple
 *
 * @example
 * ```typescript
 * const v = vec3FromArray([1, 2, 3]); // OK
 * vec3FromArray([1, 2]); // throws ZodError
 * ```
 */
export function vec3FromArray(arr: readonly number[]): Vec3 {
	const parsed = Vec3Schema.parse(arr);
	return vec3(parsed[0], parsed[1], parsed[2]);
}

/**
 * Add two vectors: a + b.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns A new Vec3 containing the sum
 *
 * @example
 * ```typescript
 * const sum = vec3Add(vec3(1, 0, 0), vec3(0, 1, 0));
 * // sum = [1, 1, 0]
 * ```
 */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
	return vec3(
		(a[0] as number) + (b[0] as number),
		(a[1] as number) + (b[1] as number),
		(a[2] as number) + (b[2] as number),
	);
}

/**
 * Subtract two vectors: a - b.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns A new Vec3 containing the difference
 *
 * @example
 * ```typescript
 * const diff = vec3Sub(vec3(3, 2, 1), vec3(1, 1, 1));
 * // diff = [2, 1, 0]
 * ```
 */
export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
	return vec3(
		(a[0] as number) - (b[0] as number),
		(a[1] as number) - (b[1] as number),
		(a[2] as number) - (b[2] as number),
	);
}

/**
 * Scale a vector by a scalar: v * s.
 *
 * @param v - Vector to scale
 * @param s - Scalar multiplier
 * @returns A new scaled Vec3
 *
 * @example
 * ```typescript
 * const doubled = vec3Scale(vec3(1, 2, 3), 2);
 * // doubled = [2, 4, 6]
 * ```
 */
export function vec3Scale(v: Vec3, s: number): Vec3 {
	return vec3((v[0] as number) * s, (v[1] as number) * s, (v[2] as number) * s);
}

/**
 * Dot product of two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns The scalar dot product
 *
 * @example
 * ```typescript
 * const d = vec3Dot(vec3(1, 0, 0), vec3(0, 1, 0));
 * // d === 0 (perpendicular vectors)
 * ```
 */
export function vec3Dot(a: Vec3, b: Vec3): number {
	return (
		(a[0] as number) * (b[0] as number) +
		(a[1] as number) * (b[1] as number) +
		(a[2] as number) * (b[2] as number)
	);
}

/**
 * Cross product of two vectors: a x b.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns A new Vec3 perpendicular to both inputs
 *
 * @example
 * ```typescript
 * const up = vec3Cross(vec3(1, 0, 0), vec3(0, 1, 0));
 * // up = [0, 0, 1] (right-hand rule)
 * ```
 */
export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
	const ax = a[0] as number;
	const ay = a[1] as number;
	const az = a[2] as number;
	const bx = b[0] as number;
	const by = b[1] as number;
	const bz = b[2] as number;
	return vec3(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
}

/**
 * Squared length of a vector. Avoids sqrt when only comparing magnitudes.
 *
 * @param v - Vector
 * @returns The squared length
 *
 * @example
 * ```typescript
 * const lenSq = vec3LengthSq(vec3(3, 4, 0));
 * // lenSq === 25
 * ```
 */
export function vec3LengthSq(v: Vec3): number {
	const x = v[0] as number;
	const y = v[1] as number;
	const z = v[2] as number;
	return x * x + y * y + z * z;
}

/**
 * Length (magnitude) of a vector.
 *
 * @param v - Vector
 * @returns The length
 *
 * @example
 * ```typescript
 * const len = vec3Length(vec3(3, 4, 0));
 * // len === 5
 * ```
 */
export function vec3Length(v: Vec3): number {
	return Math.sqrt(vec3LengthSq(v));
}

/**
 * Normalize a vector to unit length.
 * Returns a zero vector if input length is zero.
 *
 * @param v - Vector to normalize
 * @returns A new unit-length Vec3
 *
 * @example
 * ```typescript
 * const unit = vec3Normalize(vec3(3, 0, 0));
 * // unit = [1, 0, 0]
 * ```
 */
export function vec3Normalize(v: Vec3): Vec3 {
	const len = vec3Length(v);
	if (len === 0) {
		return vec3(0, 0, 0);
	}
	const invLen = 1 / len;
	return vec3((v[0] as number) * invLen, (v[1] as number) * invLen, (v[2] as number) * invLen);
}

/**
 * Linearly interpolate between two vectors.
 *
 * @param a - Start vector (t=0)
 * @param b - End vector (t=1)
 * @param t - Interpolation factor, clamped to [0, 1]
 * @returns A new interpolated Vec3
 *
 * @example
 * ```typescript
 * const mid = vec3Lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0.5);
 * // mid = [5, 5, 5]
 * ```
 */
export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
	const ct = Math.max(0, Math.min(1, t));
	const oneMinusT = 1 - ct;
	return vec3(
		(a[0] as number) * oneMinusT + (b[0] as number) * ct,
		(a[1] as number) * oneMinusT + (b[1] as number) * ct,
		(a[2] as number) * oneMinusT + (b[2] as number) * ct,
	);
}

/**
 * Negate a vector: -v.
 *
 * @param v - Vector to negate
 * @returns A new negated Vec3
 *
 * @example
 * ```typescript
 * const neg = vec3Negate(vec3(1, -2, 3));
 * // neg = [-1, 2, -3]
 * ```
 */
export function vec3Negate(v: Vec3): Vec3 {
	return vec3(-(v[0] as number), -(v[1] as number), -(v[2] as number));
}

/**
 * Distance between two points.
 *
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance
 *
 * @example
 * ```typescript
 * const d = vec3Distance(vec3(0, 0, 0), vec3(3, 4, 0));
 * // d === 5
 * ```
 */
export function vec3Distance(a: Vec3, b: Vec3): number {
	return vec3Length(vec3Sub(a, b));
}

/**
 * Check if two vectors are approximately equal within an epsilon.
 *
 * @param a - First vector
 * @param b - Second vector
 * @param epsilon - Maximum allowed difference per component (default 1e-6)
 * @returns True if all components are within epsilon
 *
 * @example
 * ```typescript
 * vec3Equals(vec3(1, 0, 0), vec3(1.0000001, 0, 0)); // true
 * vec3Equals(vec3(1, 0, 0), vec3(2, 0, 0)); // false
 * ```
 */
export function vec3Equals(a: Vec3, b: Vec3, epsilon = 1e-6): boolean {
	return (
		Math.abs((a[0] as number) - (b[0] as number)) <= epsilon &&
		Math.abs((a[1] as number) - (b[1] as number)) <= epsilon &&
		Math.abs((a[2] as number) - (b[2] as number)) <= epsilon
	);
}

/**
 * Create a zero vector [0, 0, 0].
 *
 * @returns A new zero Vec3
 */
export function vec3Zero(): Vec3 {
	return vec3(0, 0, 0);
}
