/**
 * Mat4 (4x4 matrix) operations on Float32Array(16) in column-major order.
 * All functions are pure: they return new arrays and never mutate inputs.
 * Column-major layout: element at [row][col] = arr[col * 4 + row].
 * @module 3d/math/mat4
 */

import type { Vec3 } from './vec3';
import { vec3 } from './vec3';

/**
 * A 4x4 matrix stored as Float32Array of length 16 in column-major order.
 */
export type Mat4 = Float32Array;

/**
 * Create a new identity matrix.
 *
 * @returns A new 4x4 identity matrix
 *
 * @example
 * ```typescript
 * const m = mat4Identity();
 * // Diagonal is 1, rest is 0
 * ```
 */
export function mat4Identity(): Mat4 {
	const out = new Float32Array(16);
	out[0] = 1;
	out[5] = 1;
	out[10] = 1;
	out[15] = 1;
	return out;
}

/**
 * Multiply two 4x4 matrices: a * b.
 *
 * @param a - Left matrix
 * @param b - Right matrix
 * @returns A new Mat4 containing the product
 *
 * @example
 * ```typescript
 * const result = mat4Multiply(mat4Identity(), someMatrix);
 * // result equals someMatrix (identity * M = M)
 * ```
 */
export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
	const out = new Float32Array(16);

	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			const idx = col * 4 + row;
			out[idx] =
				(a[row] as number) * (b[col * 4] as number) +
				(a[4 + row] as number) * (b[col * 4 + 1] as number) +
				(a[8 + row] as number) * (b[col * 4 + 2] as number) +
				(a[12 + row] as number) * (b[col * 4 + 3] as number);
		}
	}

	return out;
}

/**
 * Apply translation to a matrix: m * T(x, y, z).
 *
 * @param m - Input matrix
 * @param x - X translation
 * @param y - Y translation
 * @param z - Z translation
 * @returns A new translated Mat4
 *
 * @example
 * ```typescript
 * const moved = mat4Translate(mat4Identity(), 10, 5, -3);
 * ```
 */
export function mat4Translate(m: Mat4, x: number, y: number, z: number): Mat4 {
	const t = mat4Identity();
	t[12] = x;
	t[13] = y;
	t[14] = z;
	return mat4Multiply(m, t);
}

/**
 * Apply rotation around X axis.
 *
 * @param m - Input matrix
 * @param radians - Rotation angle in radians
 * @returns A new rotated Mat4
 *
 * @example
 * ```typescript
 * const rotated = mat4RotateX(mat4Identity(), Math.PI / 4);
 * ```
 */
export function mat4RotateX(m: Mat4, radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	const r = mat4Identity();
	r[5] = c;
	r[6] = s;
	r[9] = -s;
	r[10] = c;
	return mat4Multiply(m, r);
}

/**
 * Apply rotation around Y axis.
 *
 * @param m - Input matrix
 * @param radians - Rotation angle in radians
 * @returns A new rotated Mat4
 *
 * @example
 * ```typescript
 * const rotated = mat4RotateY(mat4Identity(), Math.PI / 2);
 * ```
 */
export function mat4RotateY(m: Mat4, radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	const r = mat4Identity();
	r[0] = c;
	r[2] = -s;
	r[8] = s;
	r[10] = c;
	return mat4Multiply(m, r);
}

/**
 * Apply rotation around Z axis.
 *
 * @param m - Input matrix
 * @param radians - Rotation angle in radians
 * @returns A new rotated Mat4
 *
 * @example
 * ```typescript
 * const rotated = mat4RotateZ(mat4Identity(), Math.PI);
 * ```
 */
export function mat4RotateZ(m: Mat4, radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	const r = mat4Identity();
	r[0] = c;
	r[1] = s;
	r[4] = -s;
	r[5] = c;
	return mat4Multiply(m, r);
}

/**
 * Apply non-uniform scale to a matrix.
 *
 * @param m - Input matrix
 * @param sx - X scale factor
 * @param sy - Y scale factor
 * @param sz - Z scale factor
 * @returns A new scaled Mat4
 *
 * @example
 * ```typescript
 * const scaled = mat4Scale(mat4Identity(), 2, 2, 2);
 * ```
 */
export function mat4Scale(m: Mat4, sx: number, sy: number, sz: number): Mat4 {
	const s = mat4Identity();
	s[0] = sx;
	s[5] = sy;
	s[10] = sz;
	return mat4Multiply(m, s);
}

/**
 * Transpose a 4x4 matrix (swap rows and columns).
 *
 * @param m - Input matrix
 * @returns A new transposed Mat4
 *
 * @example
 * ```typescript
 * const t = mat4Transpose(someMatrix);
 * ```
 */
export function mat4Transpose(m: Mat4): Mat4 {
	const out = new Float32Array(16);
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			out[col * 4 + row] = m[row * 4 + col] as number;
		}
	}
	return out;
}

/**
 * Compute the determinant of a 4x4 matrix.
 *
 * @param m - Input matrix
 * @returns The determinant value
 *
 * @example
 * ```typescript
 * const det = mat4Determinant(mat4Identity());
 * // det === 1
 * ```
 */
export function mat4Determinant(m: Mat4): number {
	const m00 = m[0] as number;
	const m01 = m[1] as number;
	const m02 = m[2] as number;
	const m03 = m[3] as number;
	const m10 = m[4] as number;
	const m11 = m[5] as number;
	const m12 = m[6] as number;
	const m13 = m[7] as number;
	const m20 = m[8] as number;
	const m21 = m[9] as number;
	const m22 = m[10] as number;
	const m23 = m[11] as number;
	const m30 = m[12] as number;
	const m31 = m[13] as number;
	const m32 = m[14] as number;
	const m33 = m[15] as number;

	const b00 = m00 * m11 - m01 * m10;
	const b01 = m00 * m12 - m02 * m10;
	const b02 = m00 * m13 - m03 * m10;
	const b03 = m01 * m12 - m02 * m11;
	const b04 = m01 * m13 - m03 * m11;
	const b05 = m02 * m13 - m03 * m12;
	const b06 = m20 * m31 - m21 * m30;
	const b07 = m20 * m32 - m22 * m30;
	const b08 = m20 * m33 - m23 * m30;
	const b09 = m21 * m32 - m22 * m31;
	const b10 = m21 * m33 - m23 * m31;
	const b11 = m22 * m33 - m23 * m32;

	return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

/**
 * Invert a 4x4 matrix. Returns null if the matrix is singular.
 *
 * @param m - Input matrix
 * @returns A new inverted Mat4 or null if singular
 *
 * @example
 * ```typescript
 * const inv = mat4Invert(someMatrix);
 * if (inv) {
 *   // mat4Multiply(someMatrix, inv) ~= identity
 * }
 * ```
 */
export function mat4Invert(m: Mat4): Mat4 | null {
	const m00 = m[0] as number;
	const m01 = m[1] as number;
	const m02 = m[2] as number;
	const m03 = m[3] as number;
	const m10 = m[4] as number;
	const m11 = m[5] as number;
	const m12 = m[6] as number;
	const m13 = m[7] as number;
	const m20 = m[8] as number;
	const m21 = m[9] as number;
	const m22 = m[10] as number;
	const m23 = m[11] as number;
	const m30 = m[12] as number;
	const m31 = m[13] as number;
	const m32 = m[14] as number;
	const m33 = m[15] as number;

	const b00 = m00 * m11 - m01 * m10;
	const b01 = m00 * m12 - m02 * m10;
	const b02 = m00 * m13 - m03 * m10;
	const b03 = m01 * m12 - m02 * m11;
	const b04 = m01 * m13 - m03 * m11;
	const b05 = m02 * m13 - m03 * m12;
	const b06 = m20 * m31 - m21 * m30;
	const b07 = m20 * m32 - m22 * m30;
	const b08 = m20 * m33 - m23 * m30;
	const b09 = m21 * m32 - m22 * m31;
	const b10 = m21 * m33 - m23 * m31;
	const b11 = m22 * m33 - m23 * m32;

	const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	if (Math.abs(det) < 1e-10) {
		return null;
	}

	const invDet = 1.0 / det;
	const out = new Float32Array(16);

	out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * invDet;
	out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * invDet;
	out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * invDet;
	out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * invDet;
	out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * invDet;
	out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * invDet;
	out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * invDet;
	out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * invDet;
	out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * invDet;
	out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * invDet;
	out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * invDet;
	out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * invDet;
	out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * invDet;
	out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * invDet;
	out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * invDet;
	out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * invDet;

	return out;
}

/**
 * Transform a 3D point by a 4x4 matrix (w=1, applies translation).
 *
 * @param m - Transformation matrix
 * @param v - 3D point
 * @returns A new transformed Vec3
 *
 * @example
 * ```typescript
 * const moved = mat4TransformVec3(mat4Translate(mat4Identity(), 5, 0, 0), vec3(0, 0, 0));
 * // moved = [5, 0, 0]
 * ```
 */
export function mat4TransformVec3(m: Mat4, v: Vec3): Vec3 {
	const x = v[0] as number;
	const y = v[1] as number;
	const z = v[2] as number;

	const w = (m[3] as number) * x + (m[7] as number) * y + (m[11] as number) * z + (m[15] as number);
	const invW = w !== 0 ? 1 / w : 1;

	return vec3(
		((m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number)) * invW,
		((m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number)) * invW,
		((m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number)) *
			invW,
	);
}

/**
 * Transform a 3D direction by a 4x4 matrix (w=0, ignores translation).
 *
 * @param m - Transformation matrix
 * @param v - 3D direction
 * @returns A new transformed Vec3
 *
 * @example
 * ```typescript
 * const dir = mat4TransformDirection(mat4RotateY(mat4Identity(), Math.PI/2), vec3(1, 0, 0));
 * // dir ~ [0, 0, -1]
 * ```
 */
export function mat4TransformDirection(m: Mat4, v: Vec3): Vec3 {
	const x = v[0] as number;
	const y = v[1] as number;
	const z = v[2] as number;
	return vec3(
		(m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z,
		(m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z,
		(m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z,
	);
}

/**
 * Build a 4x4 matrix from translation, euler rotation (XYZ order), and scale.
 *
 * @param translation - Translation vector
 * @param rotation - Euler angles in radians (applied as X, then Y, then Z)
 * @param scale - Scale vector
 * @returns A new Mat4 combining TRS
 *
 * @example
 * ```typescript
 * const m = mat4FromTRS(vec3(10, 0, -5), vec3(0, Math.PI/4, 0), vec3(1, 1, 1));
 * ```
 */
export function mat4FromTRS(translation: Vec3, rotation: Vec3, scale: Vec3): Mat4 {
	let m = mat4Identity();
	m = mat4Translate(
		m,
		translation[0] as number,
		translation[1] as number,
		translation[2] as number,
	);
	m = mat4RotateX(m, rotation[0] as number);
	m = mat4RotateY(m, rotation[1] as number);
	m = mat4RotateZ(m, rotation[2] as number);
	m = mat4Scale(m, scale[0] as number, scale[1] as number, scale[2] as number);
	return m;
}

/**
 * Check if a Mat4 is approximately the identity matrix.
 *
 * @param m - Matrix to check
 * @param epsilon - Maximum allowed difference per element (default 1e-6)
 * @returns True if the matrix is approximately identity
 */
export function mat4IsIdentity(m: Mat4, epsilon = 1e-6): boolean {
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			const idx = col * 4 + row;
			const expected = col === row ? 1 : 0;
			if (Math.abs((m[idx] as number) - expected) > epsilon) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Check if two Mat4 matrices are approximately equal.
 *
 * @param a - First matrix
 * @param b - Second matrix
 * @param epsilon - Maximum allowed difference per element (default 1e-5)
 * @returns True if all elements are within epsilon
 */
export function mat4Equals(a: Mat4, b: Mat4, epsilon = 1e-5): boolean {
	for (let i = 0; i < 16; i++) {
		if (Math.abs((a[i] as number) - (b[i] as number)) > epsilon) {
			return false;
		}
	}
	return true;
}
