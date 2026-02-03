import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { computeFaceNormal, computeFlatShading, shadeFace } from './shading';

const white = { r: 255, g: 255, b: 255, a: 255 };

describe('Shading', () => {
	describe('computeFaceNormal', () => {
		it('computes normal for triangle in XY plane', () => {
			const normal = computeFaceNormal(
				vec3(0, 0, 0),
				vec3(1, 0, 0),
				vec3(0, 1, 0),
			);

			// Cross product of (1,0,0) x (0,1,0) = (0,0,1)
			expect(normal[0]).toBeCloseTo(0, 3);
			expect(normal[1]).toBeCloseTo(0, 3);
			expect(normal[2]).toBeCloseTo(1, 3);
		});

		it('computes normal for triangle in XZ plane', () => {
			const normal = computeFaceNormal(
				vec3(0, 0, 0),
				vec3(0, 0, 1),
				vec3(1, 0, 0),
			);

			// Should point in +Y direction
			expect(normal[1]).toBeCloseTo(1, 3);
		});

		it('returns normalized vector', () => {
			const normal = computeFaceNormal(
				vec3(0, 0, 0),
				vec3(5, 0, 0),
				vec3(0, 5, 0),
			);

			const length = Math.sqrt(
				(normal[0] as number) ** 2 +
				(normal[1] as number) ** 2 +
				(normal[2] as number) ** 2,
			);
			expect(length).toBeCloseTo(1, 5);
		});
	});

	describe('computeFlatShading', () => {
		it('face directly toward light gets maximum brightness', () => {
			// Normal pointing +Z, light traveling in -Z (hits the +Z face)
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, -1], intensity: 1.0 },
				{ intensity: 0 },
				white,
			);

			// Should be fully lit
			expect(color.r).toBe(255);
			expect(color.g).toBe(255);
			expect(color.b).toBe(255);
		});

		it('face perpendicular to light gets ambient only', () => {
			// Normal pointing +Z, light coming from +X
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [1, 0, 0], intensity: 1.0 },
				{ intensity: 0.2 },
				white,
			);

			// Should be 20% brightness (ambient only)
			expect(color.r).toBeCloseTo(51, -1); // 255 * 0.2
			expect(color.g).toBeCloseTo(51, -1);
			expect(color.b).toBeCloseTo(51, -1);
		});

		it('face away from light gets ambient only', () => {
			// Normal pointing +Z, light traveling +Z (same direction, hitting the back)
			// ndotl = -dot([0,0,1], [0,0,1]) = -1, clamped to 0
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, 1], intensity: 1.0 },
				{ intensity: 0.2 },
				white,
			);

			// No diffuse, ambient only at 20%
			expect(color.r).toBeCloseTo(51, -1);
			expect(color.g).toBeCloseTo(51, -1);
		});

		it('ambient intensity 0 and face away from light gives black', () => {
			const normal = vec3(0, 0, 1);
			// Light direction [0,0,1] means light travels in +Z
			// -lightDir = [0,0,-1], dot with normal = -1, clamped to 0
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, 1], intensity: 1.0 },
				{ intensity: 0 },
				white,
			);

			expect(color.r).toBe(0);
			expect(color.g).toBe(0);
			expect(color.b).toBe(0);
		});

		it('ambient intensity 1 gives full brightness regardless of angle', () => {
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, 1], intensity: 0 }, // no diffuse
				{ intensity: 1.0 },
				white,
			);

			expect(color.r).toBe(255);
			expect(color.g).toBe(255);
			expect(color.b).toBe(255);
		});

		it('applies base color tinting', () => {
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, -1], intensity: 1.0 }, // fully lit
				{ intensity: 0 },
				{ r: 200, g: 100, b: 50, a: 255 },
			);

			expect(color.r).toBe(200);
			expect(color.g).toBe(100);
			expect(color.b).toBe(50);
			expect(color.a).toBe(255);
		});

		it('color channels are clamped to [0, 255]', () => {
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, -1], intensity: 1.0 },
				{ intensity: 1.0 }, // ambient + diffuse > 1
				{ r: 255, g: 255, b: 255, a: 255 },
			);

			expect(color.r).toBeLessThanOrEqual(255);
			expect(color.g).toBeLessThanOrEqual(255);
			expect(color.b).toBeLessThanOrEqual(255);
		});

		it('preserves alpha from base color', () => {
			const normal = vec3(0, 0, 1);
			const color = computeFlatShading(
				normal,
				{ direction: [0, 0, -1], intensity: 1.0 },
				{ intensity: 0.1 },
				{ r: 255, g: 255, b: 255, a: 128 },
			);

			expect(color.a).toBe(128);
		});
	});

	describe('shadeFace', () => {
		it('computes normal and shading in one call', () => {
			const color = shadeFace(
				vec3(0, 0, 0),
				vec3(1, 0, 0),
				vec3(0, 1, 0),
				{ direction: [0, 0, -1], intensity: 1.0 }, // light from +Z toward face
				{ intensity: 0.1 },
				{ r: 200, g: 100, b: 50, a: 255 },
			);

			// Face normal is +Z, light comes from +Z, so fully lit
			expect(color.r).toBeGreaterThan(150);
			expect(color.a).toBe(255);
		});
	});
});
