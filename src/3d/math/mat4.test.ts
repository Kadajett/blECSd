import { describe, expect, it } from 'vitest';
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
} from './mat4';
import { vec3, vec3Equals } from './vec3';

describe('Mat4 operations', () => {
	describe('mat4Identity', () => {
		it('creates a Float32Array of length 16', () => {
			const m = mat4Identity();

			expect(m).toBeInstanceOf(Float32Array);
			expect(m.length).toBe(16);
		});

		it('has 1s on diagonal and 0s elsewhere', () => {
			const m = mat4Identity();

			for (let col = 0; col < 4; col++) {
				for (let row = 0; row < 4; row++) {
					const expected = col === row ? 1 : 0;
					expect(m[col * 4 + row]).toBeCloseTo(expected);
				}
			}
		});
	});

	describe('mat4Multiply', () => {
		it('identity * M = M', () => {
			const m = mat4Translate(mat4Identity(), 5, 10, 15);
			const result = mat4Multiply(mat4Identity(), m);

			expect(mat4Equals(result, m)).toBe(true);
		});

		it('M * identity = M', () => {
			const m = mat4Scale(mat4Identity(), 2, 3, 4);
			const result = mat4Multiply(m, mat4Identity());

			expect(mat4Equals(result, m)).toBe(true);
		});

		it('is associative: (A*B)*C = A*(B*C)', () => {
			const a = mat4Translate(mat4Identity(), 1, 2, 3);
			const b = mat4RotateX(mat4Identity(), 0.5);
			const c = mat4Scale(mat4Identity(), 2, 2, 2);

			const ab_c = mat4Multiply(mat4Multiply(a, b), c);
			const a_bc = mat4Multiply(a, mat4Multiply(b, c));

			expect(mat4Equals(ab_c, a_bc, 1e-4)).toBe(true);
		});
	});

	describe('mat4Translate', () => {
		it('puts translation in the last column', () => {
			const m = mat4Translate(mat4Identity(), 5, 10, 15);

			expect(m[12]).toBeCloseTo(5);
			expect(m[13]).toBeCloseTo(10);
			expect(m[14]).toBeCloseTo(15);
		});

		it('translate then inverse-translate = identity', () => {
			const m1 = mat4Translate(mat4Identity(), 5, 10, 15);
			const m2 = mat4Translate(m1, -5, -10, -15);

			expect(mat4IsIdentity(m2)).toBe(true);
		});
	});

	describe('mat4RotateX', () => {
		it('rotating by 2*PI returns to identity', () => {
			const m = mat4RotateX(mat4Identity(), Math.PI * 2);

			expect(mat4IsIdentity(m, 1e-5)).toBe(true);
		});

		it('rotating by PI twice returns to identity', () => {
			const m = mat4RotateX(mat4RotateX(mat4Identity(), Math.PI), Math.PI);

			expect(mat4IsIdentity(m, 1e-5)).toBe(true);
		});
	});

	describe('mat4RotateY', () => {
		it('rotating by 2*PI returns to identity', () => {
			const m = mat4RotateY(mat4Identity(), Math.PI * 2);

			expect(mat4IsIdentity(m, 1e-5)).toBe(true);
		});
	});

	describe('mat4RotateZ', () => {
		it('rotating by 2*PI returns to identity', () => {
			const m = mat4RotateZ(mat4Identity(), Math.PI * 2);

			expect(mat4IsIdentity(m, 1e-5)).toBe(true);
		});
	});

	describe('mat4Scale', () => {
		it('scales diagonal elements', () => {
			const m = mat4Scale(mat4Identity(), 2, 3, 4);

			expect(m[0]).toBeCloseTo(2);
			expect(m[5]).toBeCloseTo(3);
			expect(m[10]).toBeCloseTo(4);
		});
	});

	describe('mat4Transpose', () => {
		it('transposes correctly', () => {
			const m = mat4Identity();
			m[12] = 5; // column 3, row 0

			const t = mat4Transpose(m);

			// After transpose, column 3 row 0 -> column 0 row 3
			expect(t[3]).toBeCloseTo(5); // index = 0*4 + 3
		});

		it('double transpose returns original', () => {
			const m = mat4Translate(mat4Identity(), 1, 2, 3);
			const tt = mat4Transpose(mat4Transpose(m));

			expect(mat4Equals(tt, m)).toBe(true);
		});
	});

	describe('mat4Determinant', () => {
		it('identity has determinant 1', () => {
			expect(mat4Determinant(mat4Identity())).toBeCloseTo(1);
		});

		it('scaled matrix has determinant = product of scales', () => {
			const m = mat4Scale(mat4Identity(), 2, 3, 4);

			expect(mat4Determinant(m)).toBeCloseTo(24);
		});

		it('singular matrix has determinant 0', () => {
			const m = new Float32Array(16); // all zeros

			expect(mat4Determinant(m)).toBeCloseTo(0);
		});
	});

	describe('mat4Invert', () => {
		it('M * inverse(M) = identity', () => {
			const m = mat4Translate(mat4RotateY(mat4Identity(), 0.7), 3, -1, 5);
			const inv = mat4Invert(m);

			expect(inv).not.toBeNull();
			if (inv) {
				const product = mat4Multiply(m, inv);
				expect(mat4IsIdentity(product, 1e-4)).toBe(true);
			}
		});

		it('returns null for singular matrix', () => {
			const m = new Float32Array(16); // all zeros

			expect(mat4Invert(m)).toBeNull();
		});

		it('inverse of identity is identity', () => {
			const inv = mat4Invert(mat4Identity());

			expect(inv).not.toBeNull();
			if (inv) {
				expect(mat4IsIdentity(inv)).toBe(true);
			}
		});

		it('inverse of translation is negative translation', () => {
			const m = mat4Translate(mat4Identity(), 5, 10, 15);
			const inv = mat4Invert(m);

			expect(inv).not.toBeNull();
			if (inv) {
				expect(inv[12]).toBeCloseTo(-5);
				expect(inv[13]).toBeCloseTo(-10);
				expect(inv[14]).toBeCloseTo(-15);
			}
		});
	});

	describe('mat4TransformVec3', () => {
		it('identity transform returns same vector', () => {
			const v = vec3(1, 2, 3);
			const result = mat4TransformVec3(mat4Identity(), v);

			expect(vec3Equals(result, v)).toBe(true);
		});

		it('translation moves point', () => {
			const m = mat4Translate(mat4Identity(), 5, 0, 0);
			const result = mat4TransformVec3(m, vec3(0, 0, 0));

			expect(result[0]).toBeCloseTo(5);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(0);
		});

		it('scale doubles coordinates', () => {
			const m = mat4Scale(mat4Identity(), 2, 2, 2);
			const result = mat4TransformVec3(m, vec3(1, 2, 3));

			expect(result[0]).toBeCloseTo(2);
			expect(result[1]).toBeCloseTo(4);
			expect(result[2]).toBeCloseTo(6);
		});
	});

	describe('mat4TransformDirection', () => {
		it('ignores translation', () => {
			const m = mat4Translate(mat4Identity(), 100, 200, 300);
			const result = mat4TransformDirection(m, vec3(1, 0, 0));

			expect(result[0]).toBeCloseTo(1);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(0);
		});

		it('rotation affects direction', () => {
			const m = mat4RotateZ(mat4Identity(), Math.PI / 2);
			const result = mat4TransformDirection(m, vec3(1, 0, 0));

			expect(result[0]).toBeCloseTo(0);
			expect(result[1]).toBeCloseTo(1);
			expect(result[2]).toBeCloseTo(0);
		});
	});

	describe('mat4FromTRS', () => {
		it('with zero rotation and unit scale = translation only', () => {
			const m = mat4FromTRS(vec3(5, 10, 15), vec3(0, 0, 0), vec3(1, 1, 1));

			expect(m[12]).toBeCloseTo(5);
			expect(m[13]).toBeCloseTo(10);
			expect(m[14]).toBeCloseTo(15);
			expect(m[0]).toBeCloseTo(1);
			expect(m[5]).toBeCloseTo(1);
			expect(m[10]).toBeCloseTo(1);
		});

		it('identity TRS = identity matrix', () => {
			const m = mat4FromTRS(vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1));

			expect(mat4IsIdentity(m)).toBe(true);
		});
	});

	describe('mat4IsIdentity', () => {
		it('identity is identity', () => {
			expect(mat4IsIdentity(mat4Identity())).toBe(true);
		});

		it('translated matrix is not identity', () => {
			expect(mat4IsIdentity(mat4Translate(mat4Identity(), 1, 0, 0))).toBe(false);
		});
	});

	describe('mat4Equals', () => {
		it('same matrices are equal', () => {
			const m = mat4Translate(mat4Identity(), 1, 2, 3);

			expect(mat4Equals(m, m)).toBe(true);
		});

		it('different matrices are not equal', () => {
			const a = mat4Translate(mat4Identity(), 1, 0, 0);
			const b = mat4Translate(mat4Identity(), 2, 0, 0);

			expect(mat4Equals(a, b)).toBe(false);
		});
	});

	describe('column-major layout', () => {
		it('element [row][col] = arr[col*4 + row]', () => {
			const m = mat4Identity();
			// Set element at row=0, col=3 (translation X)
			m[3 * 4 + 0] = 42;

			expect(m[12]).toBeCloseTo(42);
		});
	});
});
