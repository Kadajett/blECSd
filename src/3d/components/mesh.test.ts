import { afterEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
	clearMeshStore,
	createMeshFromArrays,
	getMesh,
	getMeshCount,
	getMeshData,
	registerMesh,
	setMesh,
	unregisterMesh,
} from './mesh';

function setup(): { world: World; eid: Entity } {
	const world = createWorld() as World;
	const eid = addEntity(world) as Entity;
	return { world, eid };
}

afterEach(() => {
	clearMeshStore();
});

describe('Mesh component and meshStore', () => {
	describe('registerMesh', () => {
		it('registers mesh data and returns unique ID', () => {
			const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
			const indices = new Uint32Array([0, 1, 2]);

			const id = registerMesh('triangle', vertices, indices);

			expect(id).toBeGreaterThan(0);
			expect(getMeshCount()).toBe(1);
		});

		it('returns different IDs for each mesh', () => {
			const verts = new Float32Array([0, 0, 0]);
			const idx = new Uint32Array([0]);

			const id1 = registerMesh('mesh1', verts, idx);
			const id2 = registerMesh('mesh2', verts, idx);

			expect(id1).not.toBe(id2);
		});

		it('computes vertexCount and triangleCount', () => {
			const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
			const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

			const id = registerMesh('quad', vertices, indices);
			const data = getMeshData(id);

			expect(data?.vertexCount).toBe(4);
			expect(data?.triangleCount).toBe(2);
		});
	});

	describe('createMeshFromArrays', () => {
		it('creates mesh from vertex objects and polygon faces', () => {
			const id = createMeshFromArrays(
				'cube-face',
				[
					{ x: -1, y: -1, z: 0 },
					{ x: 1, y: -1, z: 0 },
					{ x: 1, y: 1, z: 0 },
					{ x: -1, y: 1, z: 0 },
				],
				[[0, 1, 2, 3]],
			);

			const data = getMeshData(id);
			expect(data?.vertexCount).toBe(4);
			expect(data?.triangleCount).toBe(2); // Quad -> 2 triangles
		});

		it('triangulates polygons with fan method', () => {
			const id = createMeshFromArrays(
				'pentagon',
				[
					{ x: 0, y: 1, z: 0 },
					{ x: 1, y: 0.3, z: 0 },
					{ x: 0.6, y: -0.8, z: 0 },
					{ x: -0.6, y: -0.8, z: 0 },
					{ x: -1, y: 0.3, z: 0 },
				],
				[[0, 1, 2, 3, 4]],
			);

			const data = getMeshData(id);
			expect(data?.triangleCount).toBe(3); // 5-gon -> 3 triangles
			// First triangle: 0, 1, 2
			expect(data?.indices[0]).toBe(0);
			expect(data?.indices[1]).toBe(1);
			expect(data?.indices[2]).toBe(2);
		});

		it('handles triangle faces without triangulation', () => {
			const id = createMeshFromArrays(
				'tri',
				[
					{ x: 0, y: 0, z: 0 },
					{ x: 1, y: 0, z: 0 },
					{ x: 0, y: 1, z: 0 },
				],
				[[0, 1, 2]],
			);

			const data = getMeshData(id);
			expect(data?.triangleCount).toBe(1);
		});

		it('skips degenerate faces with < 3 vertices', () => {
			const id = createMeshFromArrays(
				'degen',
				[
					{ x: 0, y: 0, z: 0 },
					{ x: 1, y: 0, z: 0 },
				],
				[[0, 1]],
			);

			const data = getMeshData(id);
			expect(data?.triangleCount).toBe(0);
		});
	});

	describe('getMeshData', () => {
		it('returns mesh data for valid ID', () => {
			const id = registerMesh('test', new Float32Array([0, 0, 0]), new Uint32Array([0]));

			const data = getMeshData(id);
			expect(data).toBeDefined();
			expect(data?.name).toBe('test');
		});

		it('returns undefined for invalid ID', () => {
			expect(getMeshData(9999)).toBeUndefined();
		});
	});

	describe('unregisterMesh', () => {
		it('removes mesh and returns true', () => {
			const id = registerMesh('test', new Float32Array([0, 0, 0]), new Uint32Array([0]));

			expect(unregisterMesh(id)).toBe(true);
			expect(getMeshData(id)).toBeUndefined();
			expect(getMeshCount()).toBe(0);
		});

		it('returns false for non-existent ID', () => {
			expect(unregisterMesh(9999)).toBe(false);
		});
	});

	describe('setMesh / getMesh', () => {
		it('links entity to mesh ID', () => {
			const { world, eid } = setup();
			const meshId = registerMesh('test', new Float32Array([0, 0, 0]), new Uint32Array([0]));

			setMesh(world, eid, meshId);

			expect(getMesh(world, eid)).toBe(meshId);
		});

		it('returns undefined for entity without component', () => {
			const { world, eid } = setup();

			expect(getMesh(world, eid)).toBeUndefined();
		});

		it('returns entity ID for chaining', () => {
			const { world, eid } = setup();

			expect(setMesh(world, eid, 1)).toBe(eid);
		});
	});
});
