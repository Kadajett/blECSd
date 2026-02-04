import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Entity, World } from '../../core/types';
import {
	clearMouseInputStore,
	disableMouseInteraction,
	enableMouseInteraction,
	feedMouseDrag,
	feedMouseScroll,
	getMouseInteraction3D,
	MouseInteraction3D,
	mouseInputStore,
} from './mouseInteraction3d';

describe('MouseInteraction3D component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
		clearMouseInputStore();
	});

	describe('enableMouseInteraction', () => {
		it('sets default values when called with empty config', () => {
			enableMouseInteraction(world, eid);

			expect(MouseInteraction3D.rotationSensitivity[eid]).toBeCloseTo(0.01);
			expect(MouseInteraction3D.zoomSensitivity[eid]).toBeCloseTo(0.5);
			expect(MouseInteraction3D.zoomMin[eid]).toBeCloseTo(1);
			expect(MouseInteraction3D.zoomMax[eid]).toBeCloseTo(100);
			expect(MouseInteraction3D.invertY[eid]).toBe(0);
			expect(MouseInteraction3D.distance[eid]).toBeCloseTo(5);
			expect(MouseInteraction3D.yaw[eid]).toBeCloseTo(0);
			expect(MouseInteraction3D.pitch[eid]).toBeCloseTo(0);
		});

		it('sets custom config values', () => {
			enableMouseInteraction(
				world,
				eid,
				{
					rotationSensitivity: 0.005,
					zoomSensitivity: 1.0,
					zoomMin: 2,
					zoomMax: 50,
					invertY: true,
				},
				10,
			);

			expect(MouseInteraction3D.rotationSensitivity[eid]).toBeCloseTo(0.005);
			expect(MouseInteraction3D.zoomSensitivity[eid]).toBeCloseTo(1.0);
			expect(MouseInteraction3D.zoomMin[eid]).toBeCloseTo(2);
			expect(MouseInteraction3D.zoomMax[eid]).toBeCloseTo(50);
			expect(MouseInteraction3D.invertY[eid]).toBe(1);
			expect(MouseInteraction3D.distance[eid]).toBeCloseTo(10);
		});

		it('clamps initial distance to zoom bounds', () => {
			enableMouseInteraction(world, eid, { zoomMin: 3, zoomMax: 10 }, 1);
			expect(MouseInteraction3D.distance[eid]).toBeCloseTo(3);

			enableMouseInteraction(world, eid, { zoomMin: 3, zoomMax: 10 }, 20);
			expect(MouseInteraction3D.distance[eid]).toBeCloseTo(10);
		});

		it('returns the entity ID for chaining', () => {
			const result = enableMouseInteraction(world, eid);
			expect(result).toBe(eid);
		});

		it('rejects invalid config via Zod', () => {
			expect(() =>
				enableMouseInteraction(world, eid, {
					rotationSensitivity: -1,
				} as never),
			).toThrow();
		});
	});

	describe('disableMouseInteraction', () => {
		it('removes the component', () => {
			enableMouseInteraction(world, eid);
			const data = getMouseInteraction3D(world, eid);
			expect(data).toBeDefined();

			disableMouseInteraction(world, eid);
			expect(getMouseInteraction3D(world, eid)).toBeUndefined();
		});

		it('does not throw if component not present', () => {
			expect(() => disableMouseInteraction(world, eid)).not.toThrow();
		});
	});

	describe('getMouseInteraction3D', () => {
		it('returns undefined if component not present', () => {
			expect(getMouseInteraction3D(world, eid)).toBeUndefined();
		});

		it('returns correct data after enable', () => {
			enableMouseInteraction(
				world,
				eid,
				{
					rotationSensitivity: 0.02,
					invertY: true,
				},
				8,
			);

			const data = getMouseInteraction3D(world, eid);
			expect(data).toBeDefined();
			expect(data?.rotationSensitivity).toBeCloseTo(0.02);
			expect(data?.invertY).toBe(true);
			expect(data?.distance).toBeCloseTo(8);
			expect(data?.yaw).toBeCloseTo(0);
			expect(data?.pitch).toBeCloseTo(0);
		});
	});

	describe('feedMouseDrag', () => {
		it('stores drag input for a viewport', () => {
			feedMouseDrag(eid, 10, -5);

			const input = mouseInputStore.get(eid);
			expect(input).toBeDefined();
			expect(input?.dragDx).toBe(10);
			expect(input?.dragDy).toBe(-5);
			expect(input?.scrollDelta).toBe(0);
		});

		it('accumulates multiple drag events', () => {
			feedMouseDrag(eid, 10, -5);
			feedMouseDrag(eid, 3, 2);

			const input = mouseInputStore.get(eid);
			expect(input?.dragDx).toBe(13);
			expect(input?.dragDy).toBe(-3);
		});
	});

	describe('feedMouseScroll', () => {
		it('stores scroll input for a viewport', () => {
			feedMouseScroll(eid, 2);

			const input = mouseInputStore.get(eid);
			expect(input).toBeDefined();
			expect(input?.scrollDelta).toBe(2);
			expect(input?.dragDx).toBe(0);
		});

		it('accumulates multiple scroll events', () => {
			feedMouseScroll(eid, 1);
			feedMouseScroll(eid, -3);

			const input = mouseInputStore.get(eid);
			expect(input?.scrollDelta).toBe(-2);
		});
	});

	describe('clearMouseInputStore', () => {
		it('clears all accumulated input', () => {
			feedMouseDrag(eid, 10, 5);
			feedMouseScroll(eid, 2);
			expect(mouseInputStore.size).toBe(1);

			clearMouseInputStore();
			expect(mouseInputStore.size).toBe(0);
		});
	});
});
