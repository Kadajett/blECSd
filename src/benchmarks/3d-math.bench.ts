/**
 * 3D Math Benchmarks
 *
 * Measures Vec3 operations, Mat4 multiply, and vertex projection throughput.
 *
 * Run with: pnpm bench src/benchmarks/3d-math.bench.ts
 *
 * @module benchmarks/3d-math
 */

import { bench, describe } from 'vitest';
import { extractFrustumPlanes, isSphereInFrustum } from '../3d/math/clipping';
import {
	mat4FromTRS,
	mat4Identity,
	mat4Invert,
	mat4Multiply,
	mat4RotateY,
	mat4Translate,
} from '../3d/math/mat4';
import { buildMVP, lookAt, perspectiveMatrix, projectVertex } from '../3d/math/projection';
import { vec3, vec3Add, vec3Cross, vec3Dot, vec3Normalize } from '../3d/math/vec3';

// =============================================================================
// SETUP
// =============================================================================

function randomVec3(): Float32Array {
	return vec3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50);
}

const OPS = 10000;
const precomputedVecs = Array.from({ length: OPS }, () => randomVec3());
const precomputedVecs2 = Array.from({ length: OPS }, () => randomVec3());

// =============================================================================
// VEC3 BENCHMARKS
// =============================================================================

describe('Vec3 Operations (10K ops)', () => {
	bench('vec3 add', () => {
		for (let i = 0; i < OPS; i++) {
			vec3Add(precomputedVecs[i]!, precomputedVecs2[i]!);
		}
	});

	bench('vec3 cross', () => {
		for (let i = 0; i < OPS; i++) {
			vec3Cross(precomputedVecs[i]!, precomputedVecs2[i]!);
		}
	});

	bench('vec3 normalize', () => {
		for (let i = 0; i < OPS; i++) {
			vec3Normalize(precomputedVecs[i]!);
		}
	});

	bench('vec3 dot', () => {
		for (let i = 0; i < OPS; i++) {
			vec3Dot(precomputedVecs[i]!, precomputedVecs2[i]!);
		}
	});
});

// =============================================================================
// MAT4 BENCHMARKS
// =============================================================================

describe('Mat4 Operations (10K ops)', () => {
	const matA = mat4Translate(mat4Identity(), 1, 2, 3);
	const matB = mat4RotateY(mat4Identity(), 0.5);

	bench('mat4 multiply', () => {
		for (let i = 0; i < OPS; i++) {
			mat4Multiply(matA, matB);
		}
	});

	bench('mat4 invert (1K ops)', () => {
		for (let i = 0; i < 1000; i++) {
			mat4Invert(matA);
		}
	});

	bench('mat4FromTRS', () => {
		for (let i = 0; i < OPS; i++) {
			mat4FromTRS(precomputedVecs[i]!, precomputedVecs2[i]!, vec3(1, 1, 1));
		}
	});
});

// =============================================================================
// PROJECTION PIPELINE BENCHMARKS
// =============================================================================

describe('Projection Pipeline', () => {
	const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 16 / 9, near: 0.1, far: 100 });
	const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
	const model = mat4Identity();
	const mvp = buildMVP(model, view, proj);

	bench('project 1K vertices through MVP', () => {
		for (let i = 0; i < 1000; i++) {
			projectVertex(mvp, precomputedVecs[i]!);
		}
	});

	bench('project 10K vertices through MVP', () => {
		for (let i = 0; i < OPS; i++) {
			projectVertex(mvp, precomputedVecs[i]!);
		}
	});

	const vp = mat4Multiply(proj, view);
	const planes = extractFrustumPlanes(vp);

	bench('frustum cull 1K spheres', () => {
		for (let i = 0; i < 1000; i++) {
			isSphereInFrustum(precomputedVecs[i]!, 2.0, planes);
		}
	});
});
