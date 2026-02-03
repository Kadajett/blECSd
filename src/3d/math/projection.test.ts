import { describe, expect, it } from 'vitest';
import { mat4Identity, mat4Invert, mat4Multiply } from './mat4';
import {
	buildMVP,
	lookAt,
	orthographicMatrix,
	perspectiveMatrix,
	projectVertex,
	unprojectVertex,
	viewportTransform,
} from './projection';
import { vec3, vec3Equals } from './vec3';

describe('Projection functions', () => {
	describe('perspectiveMatrix', () => {
		it('creates a valid projection matrix', () => {
			const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });

			expect(proj).toBeInstanceOf(Float32Array);
			expect(proj.length).toBe(16);
			// w component for perspective divide
			expect(proj[11]).toBeCloseTo(-1);
		});

		it('center point projects to NDC origin', () => {
			const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });
			const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
			const mvp = mat4Multiply(proj, view);

			const ndc = projectVertex(mvp, vec3(0, 0, 0));

			expect(ndc[0]).toBeCloseTo(0, 3);
			expect(ndc[1]).toBeCloseTo(0, 3);
		});

		it('rejects fov=0', () => {
			expect(() => perspectiveMatrix({ fov: 0, aspect: 1, near: 0.1, far: 100 })).toThrow();
		});

		it('rejects near >= far', () => {
			expect(() =>
				perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 100, far: 0.1 }),
			).toThrow();
		});

		it('rejects negative aspect', () => {
			expect(() =>
				perspectiveMatrix({ fov: Math.PI / 3, aspect: -1, near: 0.1, far: 100 }),
			).toThrow();
		});
	});

	describe('orthographicMatrix', () => {
		it('maps left/bottom to NDC (-1,-1)', () => {
			const proj = orthographicMatrix({
				left: -10,
				right: 10,
				bottom: -10,
				top: 10,
				near: 0.1,
				far: 100,
			});

			const ndc = projectVertex(proj, vec3(-10, -10, -0.1));

			expect(ndc[0]).toBeCloseTo(-1, 3);
			expect(ndc[1]).toBeCloseTo(-1, 3);
		});

		it('maps right/top to NDC (1,1)', () => {
			const proj = orthographicMatrix({
				left: -10,
				right: 10,
				bottom: -10,
				top: 10,
				near: 0.1,
				far: 100,
			});

			const ndc = projectVertex(proj, vec3(10, 10, -0.1));

			expect(ndc[0]).toBeCloseTo(1, 3);
			expect(ndc[1]).toBeCloseTo(1, 3);
		});

		it('rejects invalid bounds', () => {
			expect(() =>
				orthographicMatrix({
					left: 10,
					right: -10,
					bottom: -10,
					top: 10,
					near: 0.1,
					far: 100,
				}),
			).toThrow();
		});
	});

	describe('lookAt', () => {
		it('camera at origin looking down -Z produces a valid view matrix', () => {
			const view = lookAt(vec3(0, 0, 0), vec3(0, 0, -1), vec3(0, 1, 0));

			expect(view).toBeInstanceOf(Float32Array);
			expect(view.length).toBe(16);
			// Should be mostly identity-like for this trivial case
			expect(view[0]).toBeCloseTo(1, 3);
			expect(view[5]).toBeCloseTo(1, 3);
		});

		it('transforms target point to negative Z in view space', () => {
			const eye = vec3(0, 0, 5);
			const target = vec3(0, 0, 0);
			const view = lookAt(eye, target, vec3(0, 1, 0));

			// In view space, the target should be at (0, 0, -5)
			const viewTarget = projectVertex(view, target);

			expect(viewTarget[0]).toBeCloseTo(0, 3);
			expect(viewTarget[1]).toBeCloseTo(0, 3);
			expect(viewTarget[2]).toBeCloseTo(-5, 3);
		});
	});

	describe('viewportTransform', () => {
		it('NDC (0,0) maps to viewport center', () => {
			const transform = viewportTransform({ x: 0, y: 0, width: 160, height: 96 });
			const screen = transform(vec3(0, 0, 0));

			expect(screen.x).toBeCloseTo(80);
			expect(screen.y).toBeCloseTo(48);
		});

		it('NDC (-1,-1) maps to bottom-left', () => {
			const transform = viewportTransform({ x: 0, y: 0, width: 160, height: 96 });
			const screen = transform(vec3(-1, -1, 0));

			expect(screen.x).toBeCloseTo(0);
			expect(screen.y).toBeCloseTo(96);
		});

		it('NDC (1,1) maps to top-right', () => {
			const transform = viewportTransform({ x: 0, y: 0, width: 160, height: 96 });
			const screen = transform(vec3(1, 1, 0));

			expect(screen.x).toBeCloseTo(160);
			expect(screen.y).toBeCloseTo(0);
		});

		it('respects viewport offset', () => {
			const transform = viewportTransform({ x: 10, y: 20, width: 100, height: 50 });
			const screen = transform(vec3(0, 0, 0));

			expect(screen.x).toBeCloseTo(60); // 10 + 100/2
			expect(screen.y).toBeCloseTo(45); // 20 + 50/2
		});

		it('depth maps from NDC [-1,1] to [0,1]', () => {
			const transform = viewportTransform({ x: 0, y: 0, width: 100, height: 100 });

			expect(transform(vec3(0, 0, -1)).depth).toBeCloseTo(0);
			expect(transform(vec3(0, 0, 0)).depth).toBeCloseTo(0.5);
			expect(transform(vec3(0, 0, 1)).depth).toBeCloseTo(1);
		});
	});

	describe('projectVertex + unprojectVertex', () => {
		it('round-trips within epsilon', () => {
			const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });
			const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
			const mvp = buildMVP(mat4Identity(), view, proj);
			const invMvp = mat4Invert(mvp);
			expect(invMvp).not.toBeNull();
			if (!invMvp) return;

			const viewport = { x: 0, y: 0, width: 160, height: 96 };
			const vt = viewportTransform(viewport);

			const original = vec3(1, 2, 0);
			const ndc = projectVertex(mvp, original);
			const screen = vt(ndc);
			const screenVec = vec3(screen.x, screen.y, screen.depth);
			const recovered = unprojectVertex(invMvp, screenVec, viewport);

			expect(recovered).not.toBeNull();
			if (recovered) {
				expect(vec3Equals(recovered, original, 0.1)).toBe(true);
			}
		});
	});

	describe('buildMVP', () => {
		it('combines model, view, projection matrices', () => {
			const model = mat4Identity();
			const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
			const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });

			const mvp = buildMVP(model, view, proj);

			expect(mvp).toBeInstanceOf(Float32Array);
			expect(mvp.length).toBe(16);
		});
	});
});
