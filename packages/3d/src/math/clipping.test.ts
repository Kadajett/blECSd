import { describe, expect, it } from 'vitest';
import {
	clipLine,
	computeOutcode,
	extractFrustumPlanes,
	isPointInFrustum,
	isSphereInFrustum,
} from './clipping';
import { mat4Multiply } from './mat4';
import { lookAt, perspectiveMatrix } from './projection';
import { vec3 } from './vec3';

const testRect = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };

describe('Clipping', () => {
	describe('computeOutcode', () => {
		it('returns 0 for point inside rectangle', () => {
			expect(computeOutcode(5, 5, testRect)).toBe(0);
		});

		it('returns LEFT bit for point left of rectangle', () => {
			const code = computeOutcode(-1, 5, testRect);

			expect(code & 0b0001).toBeTruthy();
		});

		it('returns RIGHT bit for point right of rectangle', () => {
			const code = computeOutcode(11, 5, testRect);

			expect(code & 0b0010).toBeTruthy();
		});

		it('returns BOTTOM bit for point below rectangle', () => {
			const code = computeOutcode(5, -1, testRect);

			expect(code & 0b0100).toBeTruthy();
		});

		it('returns TOP bit for point above rectangle', () => {
			const code = computeOutcode(5, 11, testRect);

			expect(code & 0b1000).toBeTruthy();
		});

		it('returns combined bits for corner', () => {
			const code = computeOutcode(-1, 11, testRect);

			expect(code & 0b0001).toBeTruthy(); // LEFT
			expect(code & 0b1000).toBeTruthy(); // TOP
		});
	});

	describe('clipLine', () => {
		it('returns unchanged line when fully inside', () => {
			const result = clipLine(2, 3, 7, 8, testRect);

			expect(result).not.toBeNull();
			expect(result?.x0).toBeCloseTo(2);
			expect(result?.y0).toBeCloseTo(3);
			expect(result?.x1).toBeCloseTo(7);
			expect(result?.y1).toBeCloseTo(8);
		});

		it('returns null when fully outside', () => {
			const result = clipLine(-5, -5, -1, -1, testRect);

			expect(result).toBeNull();
		});

		it('returns null when both endpoints in same outside region', () => {
			const result = clipLine(11, 1, 15, 5, testRect);

			expect(result).toBeNull();
		});

		it('clips horizontal line crossing left and right', () => {
			const result = clipLine(-5, 5, 15, 5, testRect);

			expect(result).not.toBeNull();
			expect(result?.x0).toBeCloseTo(0);
			expect(result?.y0).toBeCloseTo(5);
			expect(result?.x1).toBeCloseTo(10);
			expect(result?.y1).toBeCloseTo(5);
		});

		it('clips vertical line crossing top and bottom', () => {
			const result = clipLine(5, -5, 5, 15, testRect);

			expect(result).not.toBeNull();
			expect(result?.x0).toBeCloseTo(5);
			expect(result?.y0).toBeCloseTo(0);
			expect(result?.x1).toBeCloseTo(5);
			expect(result?.y1).toBeCloseTo(10);
		});

		it('clips diagonal line', () => {
			const result = clipLine(-2, -2, 12, 12, testRect);

			expect(result).not.toBeNull();
			expect(result?.x0).toBeCloseTo(0);
			expect(result?.y0).toBeCloseTo(0);
			expect(result?.x1).toBeCloseTo(10);
			expect(result?.y1).toBeCloseTo(10);
		});

		it('handles single-point line inside', () => {
			const result = clipLine(5, 5, 5, 5, testRect);

			expect(result).not.toBeNull();
			expect(result?.x0).toBeCloseTo(5);
			expect(result?.y0).toBeCloseTo(5);
		});
	});

	describe('extractFrustumPlanes', () => {
		it('extracts 6 planes from a VP matrix', () => {
			const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });
			const view = lookAt(vec3(0, 0, 0), vec3(0, 0, -1), vec3(0, 1, 0));
			const vp = mat4Multiply(proj, view);

			const planes = extractFrustumPlanes(vp);

			expect(planes.length).toBe(6);
			for (const plane of planes) {
				expect(plane.normal).toBeInstanceOf(Float32Array);
				expect(plane.normal.length).toBe(3);
			}
		});
	});

	describe('isPointInFrustum', () => {
		const proj = perspectiveMatrix({ fov: Math.PI / 2, aspect: 1, near: 1, far: 100 });
		const view = lookAt(vec3(0, 0, 0), vec3(0, 0, -1), vec3(0, 1, 0));
		const vp = mat4Multiply(proj, view);
		const planes = extractFrustumPlanes(vp);

		it('point in front of camera is inside', () => {
			expect(isPointInFrustum(vec3(0, 0, -10), planes)).toBe(true);
		});

		it('point behind camera is outside', () => {
			expect(isPointInFrustum(vec3(0, 0, 10), planes)).toBe(false);
		});

		it('point far to the side is outside', () => {
			expect(isPointInFrustum(vec3(1000, 0, -10), planes)).toBe(false);
		});

		it('point beyond far plane is outside', () => {
			expect(isPointInFrustum(vec3(0, 0, -200), planes)).toBe(false);
		});
	});

	describe('isSphereInFrustum', () => {
		const proj = perspectiveMatrix({ fov: Math.PI / 2, aspect: 1, near: 1, far: 100 });
		const view = lookAt(vec3(0, 0, 0), vec3(0, 0, -1), vec3(0, 1, 0));
		const vp = mat4Multiply(proj, view);
		const planes = extractFrustumPlanes(vp);

		it('sphere centered in frustum is inside', () => {
			expect(isSphereInFrustum(vec3(0, 0, -50), 5, planes)).toBe(true);
		});

		it('sphere fully outside is rejected', () => {
			expect(isSphereInFrustum(vec3(0, 0, 500), 1, planes)).toBe(false);
		});

		it('sphere straddling frustum boundary is inside', () => {
			// Large sphere at far plane boundary
			expect(isSphereInFrustum(vec3(0, 0, -102), 5, planes)).toBe(true);
		});

		it('small sphere fully behind camera is outside', () => {
			expect(isSphereInFrustum(vec3(0, 0, 10), 0.5, planes)).toBe(false);
		});
	});
});
