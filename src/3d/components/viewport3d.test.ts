import { addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import type { Entity, World } from '../../core/types';
import { getViewport3D, setViewport3D } from './viewport3d';

function setup(): { world: World; eid: Entity } {
	const world = createWorld() as World;
	const eid = addEntity(world) as Entity;
	return { world, eid };
}

describe('Viewport3D component', () => {
	it('sets viewport with all values', () => {
		const { world, eid } = setup();

		setViewport3D(world, eid, {
			left: 5,
			top: 2,
			width: 60,
			height: 20,
			cameraEntity: 42,
			backendType: 'braille',
		});

		const data = getViewport3D(world, eid);
		expect(data).toBeDefined();
		expect(data?.left).toBe(5);
		expect(data?.top).toBe(2);
		expect(data?.width).toBe(60);
		expect(data?.height).toBe(20);
		expect(data?.cameraEntity).toBe(42);
		expect(data?.backendType).toBe('braille');
	});

	it('uses default backend type', () => {
		const { world, eid } = setup();

		setViewport3D(world, eid, { cameraEntity: 1 });

		const data = getViewport3D(world, eid);
		expect(data?.backendType).toBe('auto');
	});

	it('supports all backend types', () => {
		const { world, eid } = setup();
		const types = ['auto', 'braille', 'halfblock', 'sixel', 'kitty'] as const;

		for (const type of types) {
			setViewport3D(world, eid, { cameraEntity: 1, backendType: type });
			expect(getViewport3D(world, eid)?.backendType).toBe(type);
		}
	});

	it('returns undefined for entity without component', () => {
		const { world, eid } = setup();

		expect(getViewport3D(world, eid)).toBeUndefined();
	});

	it('returns entity ID for chaining', () => {
		const { world, eid } = setup();

		expect(setViewport3D(world, eid, { cameraEntity: 1 })).toBe(eid);
	});

	it('rejects negative left/top', () => {
		const { world, eid } = setup();

		expect(() => setViewport3D(world, eid, { left: -1, cameraEntity: 1 })).toThrow();
	});

	it('rejects zero width', () => {
		const { world, eid } = setup();

		expect(() => setViewport3D(world, eid, { width: 0, cameraEntity: 1 })).toThrow();
	});
});
