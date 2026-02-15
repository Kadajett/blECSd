import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Camera3D, getCamera3D, getProjMatrix, getViewMatrix, setCamera3D } from './camera3d';

function setup(): { world: World; eid: Entity } {
	const world = createWorld() as World;
	const eid = addEntity(world) as Entity;
	return { world, eid };
}

describe('Camera3D component', () => {
	it('sets camera with defaults', () => {
		const { world, eid } = setup();

		setCamera3D(world, eid, {});

		const data = getCamera3D(world, eid);
		expect(data).toBeDefined();
		expect(data?.fov).toBeCloseTo(Math.PI / 3);
		expect(data?.near).toBeCloseTo(0.1);
		expect(data?.far).toBe(100);
		expect(data?.projectionMode).toBe('perspective');
	});

	it('sets custom camera values', () => {
		const { world, eid } = setup();

		setCamera3D(world, eid, {
			fov: Math.PI / 4,
			near: 1,
			far: 500,
			aspect: 2,
			projectionMode: 'orthographic',
		});

		const data = getCamera3D(world, eid);
		expect(data?.fov).toBeCloseTo(Math.PI / 4);
		expect(data?.near).toBe(1);
		expect(data?.far).toBe(500);
		expect(data?.aspect).toBe(2);
		expect(data?.projectionMode).toBe('orthographic');
	});

	it('rejects near >= far', () => {
		const { world, eid } = setup();

		expect(() => setCamera3D(world, eid, { near: 100, far: 1 })).toThrow();
	});

	it('returns undefined for entity without component', () => {
		const { world, eid } = setup();

		expect(getCamera3D(world, eid)).toBeUndefined();
	});

	it('returns entity ID for chaining', () => {
		const { world, eid } = setup();

		expect(setCamera3D(world, eid, {})).toBe(eid);
	});

	it('getProjMatrix returns 16-element view', () => {
		const { world, eid } = setup();
		setCamera3D(world, eid, {});

		const matrix = getProjMatrix(world, eid);
		expect(matrix).toBeInstanceOf(Float32Array);
		expect(matrix.length).toBe(16);
	});

	it('getViewMatrix returns 16-element view', () => {
		const { world, eid } = setup();
		setCamera3D(world, eid, {});

		const matrix = getViewMatrix(eid);
		expect(matrix).toBeInstanceOf(Float32Array);
		expect(matrix.length).toBe(16);
	});

	it('marks dirty on set', () => {
		const { world, eid } = setup();
		setCamera3D(world, eid, {});

		expect(Camera3D.dirty[eid]).toBe(1);
	});
});
