import { afterEach, describe, expect, it } from 'vitest';
import { clearMeshStore, getMeshData } from '../components/mesh';
import { computeBoundingBox, loadObjAsMesh, parseObj } from './obj';

afterEach(() => {
	clearMeshStore();
});

const CUBE_OBJ = `
# Simple cube
v -1 -1 -1
v  1 -1 -1
v  1  1 -1
v -1  1 -1
v -1 -1  1
v  1 -1  1
v  1  1  1
v -1  1  1

f 1 2 3 4
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
`;

const TRIANGLE_OBJ = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;

describe('OBJ parser', () => {
	describe('parseObj', () => {
		it('parses cube with 8 vertices and 6 quad faces', () => {
			const result = parseObj(CUBE_OBJ);

			expect(result.vertices.length).toBe(8);
			expect(result.faces.length).toBe(6);
			// Each face has 4 vertices (quads)
			for (const face of result.faces) {
				expect(face.vertexIndices.length).toBe(4);
			}
		});

		it('parses triangle mesh', () => {
			const result = parseObj(TRIANGLE_OBJ);

			expect(result.vertices.length).toBe(3);
			expect(result.faces.length).toBe(1);
			expect(result.faces[0]?.vertexIndices.length).toBe(3);
		});

		it('converts 1-based indices to 0-based', () => {
			const result = parseObj(TRIANGLE_OBJ);

			expect(result.faces[0]?.vertexIndices[0]).toBe(0);
			expect(result.faces[0]?.vertexIndices[1]).toBe(1);
			expect(result.faces[0]?.vertexIndices[2]).toBe(2);
		});

		it('handles negative indices', () => {
			const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
f -3 -2 -1
`;
			const result = parseObj(obj);

			expect(result.faces[0]?.vertexIndices[0]).toBe(0);
			expect(result.faces[0]?.vertexIndices[1]).toBe(1);
			expect(result.faces[0]?.vertexIndices[2]).toBe(2);
		});

		it('parses v/vt/vn face format', () => {
			const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
vt 0 0
vt 1 0
vt 0 1
vn 0 0 1
f 1/1/1 2/2/1 3/3/1
`;
			const result = parseObj(obj);

			expect(result.faces[0]?.vertexIndices).toEqual([0, 1, 2]);
			expect(result.faces[0]?.texCoordIndices).toEqual([0, 1, 2]);
			expect(result.faces[0]?.normalIndices).toEqual([0, 0, 0]);
		});

		it('parses v//vn face format (no texcoord)', () => {
			const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
vn 0 0 1
f 1//1 2//1 3//1
`;
			const result = parseObj(obj);

			expect(result.faces[0]?.vertexIndices).toEqual([0, 1, 2]);
			expect(result.faces[0]?.normalIndices).toEqual([0, 0, 0]);
			expect(result.faces[0]?.texCoordIndices).toBeUndefined();
		});

		it('detects groups', () => {
			const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
v 0 0 1
g front
f 1 2 3
g back
f 1 3 4
`;
			const result = parseObj(obj);

			expect(result.groups.length).toBe(2);
			expect(result.groups[0]?.name).toBe('front');
			expect(result.groups[0]?.startFace).toBe(0);
			expect(result.groups[1]?.name).toBe('back');
			expect(result.groups[1]?.startFace).toBe(1);
		});

		it('detects objects as groups', () => {
			const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
o MyObject
f 1 2 3
`;
			const result = parseObj(obj);

			expect(result.groups.length).toBe(1);
			expect(result.groups[0]?.name).toBe('MyObject');
		});

		it('ignores comments and blank lines', () => {
			const obj = `
# This is a comment

v 0 0 0
# Another comment
v 1 0 0
v 0 1 0

f 1 2 3
`;
			const result = parseObj(obj);

			expect(result.vertices.length).toBe(3);
			expect(result.faces.length).toBe(1);
		});

		it('parses normals', () => {
			const obj = `
v 0 0 0
vn 0 1 0
vn 0 0 1
`;
			const result = parseObj(obj);

			expect(result.normals.length).toBe(2);
			expect(result.normals[0]).toEqual({ x: 0, y: 1, z: 0 });
			expect(result.normals[1]).toEqual({ x: 0, y: 0, z: 1 });
		});

		it('parses texture coordinates', () => {
			const obj = `
v 0 0 0
vt 0.5 0.5
vt 1.0 0.0
`;
			const result = parseObj(obj);

			expect(result.texCoords.length).toBe(2);
			expect(result.texCoords[0]).toEqual({ u: 0.5, v: 0.5 });
		});
	});

	describe('computeBoundingBox', () => {
		it('computes bbox for vertices', () => {
			const bbox = computeBoundingBox([
				{ x: -1, y: -2, z: -3 },
				{ x: 1, y: 2, z: 3 },
			]);

			expect(bbox.min).toEqual({ x: -1, y: -2, z: -3 });
			expect(bbox.max).toEqual({ x: 1, y: 2, z: 3 });
			expect(bbox.center).toEqual({ x: 0, y: 0, z: 0 });
		});

		it('handles empty vertices', () => {
			const bbox = computeBoundingBox([]);

			expect(bbox.center).toEqual({ x: 0, y: 0, z: 0 });
		});
	});

	describe('loadObjAsMesh', () => {
		it('returns valid meshId in meshStore', () => {
			const id = loadObjAsMesh(TRIANGLE_OBJ, { name: 'test-triangle' });

			expect(id).toBeGreaterThan(0);
			const data = getMeshData(id);
			expect(data).toBeDefined();
			expect(data?.name).toBe('test-triangle');
			expect(data?.vertexCount).toBe(3);
		});

		it('triangulates quad faces', () => {
			const id = loadObjAsMesh(CUBE_OBJ, { name: 'test-cube' });
			const data = getMeshData(id);

			expect(data?.vertexCount).toBe(8);
			expect(data?.triangleCount).toBe(12); // 6 quads * 2 triangles
		});

		it('applies flipYZ', () => {
			const obj = `v 1 2 3\nf 1 1 1`;
			const id = loadObjAsMesh(obj, { name: 'flipped', flipYZ: true, centerOrigin: false });
			const data = getMeshData(id);

			// After flip: y and z swapped => (1, 3, 2)
			expect(data?.vertices[0]).toBeCloseTo(1);
			expect(data?.vertices[1]).toBeCloseTo(3);
			expect(data?.vertices[2]).toBeCloseTo(2);
		});

		it('applies scale', () => {
			const obj = `v 1 2 3\nf 1 1 1`;
			const id = loadObjAsMesh(obj, { name: 'scaled', scale: 2, centerOrigin: false });
			const data = getMeshData(id);

			expect(data?.vertices[0]).toBeCloseTo(2);
			expect(data?.vertices[1]).toBeCloseTo(4);
			expect(data?.vertices[2]).toBeCloseTo(6);
		});

		it('centers origin', () => {
			const obj = `
v 2 2 2
v 4 4 4
v 3 3 3
f 1 2 3
`;
			const id = loadObjAsMesh(obj, { name: 'centered', centerOrigin: true });
			const data = getMeshData(id);

			// Center is (3,3,3), so vertices become (-1,-1,-1), (1,1,1), (0,0,0)
			expect(data?.vertices[0]).toBeCloseTo(-1);
			expect(data?.vertices[1]).toBeCloseTo(-1);
			expect(data?.vertices[2]).toBeCloseTo(-1);
		});

		it('rejects empty name', () => {
			expect(() => loadObjAsMesh(TRIANGLE_OBJ, { name: '' })).toThrow();
		});

		it('rejects negative scale', () => {
			expect(() => loadObjAsMesh(TRIANGLE_OBJ, { name: 'test', scale: -1 })).toThrow();
		});
	});
});
