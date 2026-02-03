import { describe, expect, it } from 'vitest';
import {
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

describe('Vec3 operations', () => {
	describe('vec3', () => {
		it('creates a Float32Array of length 3', () => {
			const v = vec3(1, 2, 3);

			expect(v).toBeInstanceOf(Float32Array);
			expect(v.length).toBe(3);
			expect(v[0]).toBeCloseTo(1);
			expect(v[1]).toBeCloseTo(2);
			expect(v[2]).toBeCloseTo(3);
		});
	});

	describe('vec3FromArray', () => {
		it('creates Vec3 from valid array', () => {
			const v = vec3FromArray([4, 5, 6]);

			expect(v[0]).toBeCloseTo(4);
			expect(v[1]).toBeCloseTo(5);
			expect(v[2]).toBeCloseTo(6);
		});

		it('rejects array with wrong length', () => {
			expect(() => vec3FromArray([1, 2])).toThrow();
			expect(() => vec3FromArray([1, 2, 3, 4])).toThrow();
		});

		it('rejects array with non-finite values', () => {
			expect(() => vec3FromArray([1, Number.NaN, 3])).toThrow();
			expect(() => vec3FromArray([1, 2, Number.POSITIVE_INFINITY])).toThrow();
		});
	});

	describe('vec3Add', () => {
		it('adds two vectors', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(4, 5, 6);

			const result = vec3Add(a, b);

			expect(result[0]).toBeCloseTo(5);
			expect(result[1]).toBeCloseTo(7);
			expect(result[2]).toBeCloseTo(9);
		});

		it('does not mutate inputs', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(4, 5, 6);

			vec3Add(a, b);

			expect(a[0]).toBeCloseTo(1);
			expect(b[0]).toBeCloseTo(4);
		});
	});

	describe('vec3Sub', () => {
		it('subtracts two vectors', () => {
			const result = vec3Sub(vec3(5, 7, 9), vec3(1, 2, 3));

			expect(result[0]).toBeCloseTo(4);
			expect(result[1]).toBeCloseTo(5);
			expect(result[2]).toBeCloseTo(6);
		});
	});

	describe('vec3Scale', () => {
		it('scales a vector', () => {
			const result = vec3Scale(vec3(1, 2, 3), 2);

			expect(result[0]).toBeCloseTo(2);
			expect(result[1]).toBeCloseTo(4);
			expect(result[2]).toBeCloseTo(6);
		});

		it('scaling by 0 produces zero vector', () => {
			const result = vec3Scale(vec3(5, 10, 15), 0);

			expect(result[0]).toBeCloseTo(0);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(0);
		});
	});

	describe('vec3Dot', () => {
		it('computes dot product', () => {
			const d = vec3Dot(vec3(1, 2, 3), vec3(4, 5, 6));

			expect(d).toBeCloseTo(32); // 1*4 + 2*5 + 3*6
		});

		it('returns 0 for perpendicular vectors', () => {
			const d = vec3Dot(vec3(1, 0, 0), vec3(0, 1, 0));

			expect(d).toBeCloseTo(0);
		});

		it('is commutative: dot(a, b) = dot(b, a)', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(4, 5, 6);

			expect(vec3Dot(a, b)).toBeCloseTo(vec3Dot(b, a));
		});
	});

	describe('vec3Cross', () => {
		it('x cross y = z (right-hand rule)', () => {
			const result = vec3Cross(vec3(1, 0, 0), vec3(0, 1, 0));

			expect(result[0]).toBeCloseTo(0);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(1);
		});

		it('y cross x = -z', () => {
			const result = vec3Cross(vec3(0, 1, 0), vec3(1, 0, 0));

			expect(result[0]).toBeCloseTo(0);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(-1);
		});

		it('cross(a, b) = -cross(b, a)', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(4, 5, 6);
			const ab = vec3Cross(a, b);
			const ba = vec3Cross(b, a);

			expect(ab[0]).toBeCloseTo(-(ba[0] as number));
			expect(ab[1]).toBeCloseTo(-(ba[1] as number));
			expect(ab[2]).toBeCloseTo(-(ba[2] as number));
		});

		it('cross product of parallel vectors is zero', () => {
			const result = vec3Cross(vec3(1, 0, 0), vec3(2, 0, 0));

			expect(result[0]).toBeCloseTo(0);
			expect(result[1]).toBeCloseTo(0);
			expect(result[2]).toBeCloseTo(0);
		});
	});

	describe('vec3LengthSq', () => {
		it('computes squared length', () => {
			expect(vec3LengthSq(vec3(3, 4, 0))).toBeCloseTo(25);
		});
	});

	describe('vec3Length', () => {
		it('computes length', () => {
			expect(vec3Length(vec3(3, 4, 0))).toBeCloseTo(5);
		});

		it('zero vector has length 0', () => {
			expect(vec3Length(vec3Zero())).toBeCloseTo(0);
		});
	});

	describe('vec3Normalize', () => {
		it('produces unit vector', () => {
			const n = vec3Normalize(vec3(3, 0, 0));

			expect(n[0]).toBeCloseTo(1);
			expect(n[1]).toBeCloseTo(0);
			expect(n[2]).toBeCloseTo(0);
			expect(vec3Length(n)).toBeCloseTo(1);
		});

		it('normalized arbitrary vector has length 1', () => {
			const n = vec3Normalize(vec3(1, 2, 3));

			expect(vec3Length(n)).toBeCloseTo(1, 5);
		});

		it('normalizing zero vector returns zero vector', () => {
			const n = vec3Normalize(vec3Zero());

			expect(n[0]).toBeCloseTo(0);
			expect(n[1]).toBeCloseTo(0);
			expect(n[2]).toBeCloseTo(0);
		});
	});

	describe('vec3Lerp', () => {
		it('t=0 returns a', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(10, 20, 30);

			const result = vec3Lerp(a, b, 0);

			expect(result[0]).toBeCloseTo(1);
			expect(result[1]).toBeCloseTo(2);
			expect(result[2]).toBeCloseTo(3);
		});

		it('t=1 returns b', () => {
			const a = vec3(1, 2, 3);
			const b = vec3(10, 20, 30);

			const result = vec3Lerp(a, b, 1);

			expect(result[0]).toBeCloseTo(10);
			expect(result[1]).toBeCloseTo(20);
			expect(result[2]).toBeCloseTo(30);
		});

		it('t=0.5 returns midpoint', () => {
			const result = vec3Lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0.5);

			expect(result[0]).toBeCloseTo(5);
			expect(result[1]).toBeCloseTo(5);
			expect(result[2]).toBeCloseTo(5);
		});

		it('clamps t below 0', () => {
			const result = vec3Lerp(vec3(0, 0, 0), vec3(10, 10, 10), -1);

			expect(result[0]).toBeCloseTo(0);
		});

		it('clamps t above 1', () => {
			const result = vec3Lerp(vec3(0, 0, 0), vec3(10, 10, 10), 2);

			expect(result[0]).toBeCloseTo(10);
		});
	});

	describe('vec3Negate', () => {
		it('negates all components', () => {
			const result = vec3Negate(vec3(1, -2, 3));

			expect(result[0]).toBeCloseTo(-1);
			expect(result[1]).toBeCloseTo(2);
			expect(result[2]).toBeCloseTo(-3);
		});

		it('double negate returns original', () => {
			const v = vec3(1, -2, 3);
			const result = vec3Negate(vec3Negate(v));

			expect(vec3Equals(result, v)).toBe(true);
		});
	});

	describe('vec3Distance', () => {
		it('computes distance between two points', () => {
			const d = vec3Distance(vec3(0, 0, 0), vec3(3, 4, 0));

			expect(d).toBeCloseTo(5);
		});

		it('distance to self is 0', () => {
			const v = vec3(5, 10, 15);

			expect(vec3Distance(v, v)).toBeCloseTo(0);
		});
	});

	describe('vec3Equals', () => {
		it('identical vectors are equal', () => {
			expect(vec3Equals(vec3(1, 2, 3), vec3(1, 2, 3))).toBe(true);
		});

		it('different vectors are not equal', () => {
			expect(vec3Equals(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(false);
		});

		it('nearly equal vectors pass with default epsilon', () => {
			expect(vec3Equals(vec3(1, 0, 0), vec3(1.0000001, 0, 0))).toBe(true);
		});

		it('respects custom epsilon', () => {
			expect(vec3Equals(vec3(1, 0, 0), vec3(1.1, 0, 0), 0.01)).toBe(false);
			expect(vec3Equals(vec3(1, 0, 0), vec3(1.1, 0, 0), 0.2)).toBe(true);
		});
	});

	describe('vec3Zero', () => {
		it('creates zero vector', () => {
			const z = vec3Zero();

			expect(z[0]).toBeCloseTo(0);
			expect(z[1]).toBeCloseTo(0);
			expect(z[2]).toBeCloseTo(0);
		});
	});
});
