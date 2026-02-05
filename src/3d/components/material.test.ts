import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getMaterial3D, setMaterial3D } from './material';

function setup(): { world: World; eid: Entity } {
	const world = createWorld() as World;
	const eid = addEntity(world) as Entity;
	return { world, eid };
}

describe('Material3D component', () => {
	it('sets material with defaults', () => {
		const { world, eid } = setup();

		setMaterial3D(world, eid, {});

		const data = getMaterial3D(world, eid);
		expect(data).toBeDefined();
		expect(data?.wireColor).toBe(0xffffff);
		expect(data?.fillColor).toBe(0x808080);
		expect(data?.renderMode).toBe('wireframe');
		expect(data?.backfaceCull).toBe(true);
		expect(data?.flatShading).toBe(false);
		expect(data?.antiAlias).toBe(false);
	});

	it('sets custom material values', () => {
		const { world, eid } = setup();

		setMaterial3D(world, eid, {
			wireColor: 0x00ff00,
			fillColor: 0xff0000,
			renderMode: 'both',
			backfaceCull: false,
			flatShading: true,
			antiAlias: true,
		});

		const data = getMaterial3D(world, eid);
		expect(data?.wireColor).toBe(0x00ff00);
		expect(data?.fillColor).toBe(0xff0000);
		expect(data?.renderMode).toBe('both');
		expect(data?.backfaceCull).toBe(false);
		expect(data?.flatShading).toBe(true);
		expect(data?.antiAlias).toBe(true);
	});

	it('supports filled render mode', () => {
		const { world, eid } = setup();

		setMaterial3D(world, eid, { renderMode: 'filled' });

		expect(getMaterial3D(world, eid)?.renderMode).toBe('filled');
	});

	it('returns undefined for entity without component', () => {
		const { world, eid } = setup();

		expect(getMaterial3D(world, eid)).toBeUndefined();
	});

	it('returns entity ID for chaining', () => {
		const { world, eid } = setup();

		expect(setMaterial3D(world, eid, {})).toBe(eid);
	});
});
