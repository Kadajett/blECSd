/**
 * Convenience functions for creating common 3D mesh primitives.
 *
 * @module 3d/stores/primitives
 */

import { createMeshFromArrays } from '../components/mesh';
import {
	type CubeMeshOptions,
	CubeMeshOptionsSchema,
	type CylinderMeshOptions,
	CylinderMeshOptionsSchema,
	type PlaneMeshOptions,
	PlaneMeshOptionsSchema,
	type SphereMeshOptions,
	SphereMeshOptionsSchema,
} from '../schemas/model';

/**
 * Create a cube mesh centered at the origin.
 *
 * @param options - Cube configuration (validated via Zod)
 * @returns Mesh ID in meshStore
 *
 * @example
 * ```typescript
 * const cubeId = createCubeMesh({ size: 2 });
 * ```
 */
export function createCubeMesh(options?: CubeMeshOptions): number {
	const validated = CubeMeshOptionsSchema.parse(options ?? {});
	const s = validated.size;

	const vertices = [
		{ x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
		{ x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
		{ x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
		{ x: s, y: s, z: s }, { x: -s, y: s, z: s },
	];

	const faces = [
		[0, 1, 2, 3], // back
		[5, 4, 7, 6], // front
		[4, 0, 3, 7], // left
		[1, 5, 6, 2], // right
		[3, 2, 6, 7], // top
		[4, 5, 1, 0], // bottom
	];

	return createMeshFromArrays(validated.name, vertices, faces);
}

/**
 * Create a UV sphere mesh centered at the origin.
 *
 * @param options - Sphere configuration (validated via Zod)
 * @returns Mesh ID in meshStore
 *
 * @example
 * ```typescript
 * const sphereId = createSphereMesh({ radius: 2, widthSegments: 32 });
 * ```
 */
export function createSphereMesh(options?: SphereMeshOptions): number {
	const validated = SphereMeshOptionsSchema.parse(options ?? {});
	const { radius, widthSegments, heightSegments, name } = validated;

	const vertices: Array<{ x: number; y: number; z: number }> = [];
	const faces: Array<Array<number>> = [];

	// Generate vertices
	for (let lat = 0; lat <= heightSegments; lat++) {
		const theta = (lat * Math.PI) / heightSegments;
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);

		for (let lon = 0; lon <= widthSegments; lon++) {
			const phi = (lon * 2 * Math.PI) / widthSegments;
			const x = radius * sinTheta * Math.cos(phi);
			const y = radius * cosTheta;
			const z = radius * sinTheta * Math.sin(phi);
			vertices.push({ x, y, z });
		}
	}

	// Generate faces
	for (let lat = 0; lat < heightSegments; lat++) {
		for (let lon = 0; lon < widthSegments; lon++) {
			const first = lat * (widthSegments + 1) + lon;
			const second = first + widthSegments + 1;

			if (lat !== 0) {
				faces.push([first, second, first + 1]);
			}
			if (lat !== heightSegments - 1) {
				faces.push([second, second + 1, first + 1]);
			}
		}
	}

	return createMeshFromArrays(name, vertices, faces);
}

/**
 * Create a plane mesh in the XZ plane centered at the origin.
 *
 * @param options - Plane configuration (validated via Zod)
 * @returns Mesh ID in meshStore
 *
 * @example
 * ```typescript
 * const planeId = createPlaneMesh({ width: 10, height: 10 });
 * ```
 */
export function createPlaneMesh(options?: PlaneMeshOptions): number {
	const validated = PlaneMeshOptionsSchema.parse(options ?? {});
	const { width, height, widthSegments, heightSegments, name } = validated;

	const vertices: Array<{ x: number; y: number; z: number }> = [];
	const faces: Array<Array<number>> = [];

	const halfW = width / 2;
	const halfH = height / 2;

	// Generate vertices in a grid
	for (let iy = 0; iy <= heightSegments; iy++) {
		const z = (iy / heightSegments) * height - halfH;
		for (let ix = 0; ix <= widthSegments; ix++) {
			const x = (ix / widthSegments) * width - halfW;
			vertices.push({ x, y: 0, z });
		}
	}

	// Generate quad faces
	const cols = widthSegments + 1;
	for (let iy = 0; iy < heightSegments; iy++) {
		for (let ix = 0; ix < widthSegments; ix++) {
			const a = iy * cols + ix;
			const b = a + 1;
			const c = a + cols + 1;
			const d = a + cols;
			faces.push([a, b, c, d]);
		}
	}

	return createMeshFromArrays(name, vertices, faces);
}

/**
 * Create a cylinder mesh centered at the origin.
 * If one radius is 0, creates a cone shape.
 *
 * @param options - Cylinder configuration (validated via Zod)
 * @returns Mesh ID in meshStore
 *
 * @example
 * ```typescript
 * const cylinderId = createCylinderMesh({ segments: 32 });
 * const coneId = createCylinderMesh({ radiusTop: 0, radiusBottom: 1 });
 * ```
 */
export function createCylinderMesh(options?: CylinderMeshOptions): number {
	const validated = CylinderMeshOptionsSchema.parse(options ?? {});
	const { radiusTop, radiusBottom, height, segments, name } = validated;

	const vertices: Array<{ x: number; y: number; z: number }> = [];
	const faces: Array<Array<number>> = [];

	const halfH = height / 2;

	// Top ring
	for (let i = 0; i < segments; i++) {
		const angle = (i / segments) * Math.PI * 2;
		vertices.push({
			x: radiusTop * Math.cos(angle),
			y: halfH,
			z: radiusTop * Math.sin(angle),
		});
	}

	// Bottom ring
	for (let i = 0; i < segments; i++) {
		const angle = (i / segments) * Math.PI * 2;
		vertices.push({
			x: radiusBottom * Math.cos(angle),
			y: -halfH,
			z: radiusBottom * Math.sin(angle),
		});
	}

	// Side faces
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments;
		const topI = i;
		const topNext = next;
		const bottomI = i + segments;
		const bottomNext = next + segments;
		faces.push([topI, topNext, bottomNext, bottomI]);
	}

	// Top cap (if radius > 0)
	if (radiusTop > 0) {
		const topCenter = vertices.length;
		vertices.push({ x: 0, y: halfH, z: 0 });
		for (let i = 0; i < segments; i++) {
			const next = (i + 1) % segments;
			faces.push([topCenter, i, next]);
		}
	}

	// Bottom cap (if radius > 0)
	if (radiusBottom > 0) {
		const bottomCenter = vertices.length;
		vertices.push({ x: 0, y: -halfH, z: 0 });
		for (let i = 0; i < segments; i++) {
			const next = (i + 1) % segments;
			faces.push([bottomCenter, next + segments, i + segments]);
		}
	}

	return createMeshFromArrays(name, vertices, faces);
}
