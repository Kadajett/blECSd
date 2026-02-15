import { afterEach, describe, expect, it } from 'vitest';
import { clearMeshStore, getMeshData } from '../components/mesh';
import {
	createCubeMesh,
	createCylinderMesh,
	createPlaneMesh,
	createSphereMesh,
} from './primitives';

afterEach(() => {
	clearMeshStore();
});

describe('Mesh primitives', () => {
	describe('createCubeMesh', () => {
		it('creates a cube with 8 vertices and 12 triangles', () => {
			const id = createCubeMesh();
			const data = getMeshData(id);

			expect(data).toBeDefined();
			expect(data?.vertexCount).toBe(8);
			expect(data?.triangleCount).toBe(12); // 6 faces * 2 triangles
		});

		it('uses custom size', () => {
			const id = createCubeMesh({ size: 2 });
			const data = getMeshData(id);

			// First vertex should be at (-2, -2, -2)
			expect(data?.vertices[0]).toBeCloseTo(-2);
			expect(data?.vertices[1]).toBeCloseTo(-2);
			expect(data?.vertices[2]).toBeCloseTo(-2);
		});

		it('uses custom name', () => {
			const id = createCubeMesh({ name: 'my-cube' });
			expect(getMeshData(id)?.name).toBe('my-cube');
		});

		it('returns valid meshId', () => {
			const id = createCubeMesh();
			expect(id).toBeGreaterThan(0);
			expect(getMeshData(id)).toBeDefined();
		});
	});

	describe('createSphereMesh', () => {
		it('creates a sphere with correct vertex count', () => {
			const id = createSphereMesh({ widthSegments: 4, heightSegments: 2 });
			const data = getMeshData(id);

			expect(data).toBeDefined();
			// (heightSegments + 1) * (widthSegments + 1) = 3 * 5 = 15
			expect(data?.vertexCount).toBe(15);
		});

		it('creates triangles', () => {
			const id = createSphereMesh({ widthSegments: 4, heightSegments: 2 });
			const data = getMeshData(id);

			expect(data?.triangleCount).toBeGreaterThan(0);
		});

		it('rejects segments below minimum', () => {
			expect(() => createSphereMesh({ widthSegments: 2 })).toThrow();
			expect(() => createSphereMesh({ heightSegments: 1 })).toThrow();
		});
	});

	describe('createPlaneMesh', () => {
		it('creates a 1x1 segment plane with 4 vertices and 2 triangles', () => {
			const id = createPlaneMesh({ widthSegments: 1, heightSegments: 1 });
			const data = getMeshData(id);

			expect(data?.vertexCount).toBe(4);
			expect(data?.triangleCount).toBe(2);
		});

		it('creates a 2x2 segment plane with 9 vertices', () => {
			const id = createPlaneMesh({ widthSegments: 2, heightSegments: 2 });
			const data = getMeshData(id);

			expect(data?.vertexCount).toBe(9); // (2+1) * (2+1)
			expect(data?.triangleCount).toBe(8); // 4 quads * 2 triangles
		});

		it('all vertices have y=0', () => {
			const id = createPlaneMesh();
			const data = getMeshData(id);

			if (data) {
				for (let i = 1; i < data.vertices.length; i += 3) {
					expect(data.vertices[i]).toBeCloseTo(0);
				}
			}
		});
	});

	describe('createCylinderMesh', () => {
		it('creates a cylinder with correct segment count', () => {
			const id = createCylinderMesh({ segments: 4 });
			const data = getMeshData(id);

			expect(data).toBeDefined();
			// 4 top + 4 bottom + 2 cap centers = 10
			expect(data?.vertexCount).toBe(10);
		});

		it('creates cone when radiusTop is 0', () => {
			const id = createCylinderMesh({ radiusTop: 0, radiusBottom: 1, segments: 4 });
			const data = getMeshData(id);

			expect(data).toBeDefined();
			// Top vertices converge to y axis
			// 4 top + 4 bottom + 1 bottom cap center = 9 (no top cap)
			expect(data?.vertexCount).toBe(9);
		});

		it('rejects both radii being 0', () => {
			expect(() => createCylinderMesh({ radiusTop: 0, radiusBottom: 0 })).toThrow();
		});

		it('returns valid meshId', () => {
			const id = createCylinderMesh();
			expect(id).toBeGreaterThan(0);
			expect(getMeshData(id)).toBeDefined();
		});
	});
});
