import { beforeEach, describe, expect, it } from 'vitest';
import { addComponent, addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
	clearMouseInputStore,
	enableMouseInteraction,
	feedMouseDrag,
	feedMouseScroll,
	MouseInteraction3D,
	mouseInputStore,
} from '../components/mouseInteraction3d';
import { Transform3D } from '../components/transform3d';
import { Viewport3D } from '../components/viewport3d';
import { mouseInteraction3DSystem } from './mouseInteraction3dSystem';

function setupViewportWithCamera(world: World): { vpEid: Entity; camEid: Entity } {
	const camEid = addEntity(world) as Entity;
	addComponent(world, camEid, Transform3D);
	Transform3D.tx[camEid] = 0;
	Transform3D.ty[camEid] = 0;
	Transform3D.tz[camEid] = 5;
	Transform3D.sx[camEid] = 1;
	Transform3D.sy[camEid] = 1;
	Transform3D.sz[camEid] = 1;

	const vpEid = addEntity(world) as Entity;
	addComponent(world, vpEid, Viewport3D);
	Viewport3D.left[vpEid] = 0;
	Viewport3D.top[vpEid] = 0;
	Viewport3D.width[vpEid] = 80;
	Viewport3D.height[vpEid] = 24;
	Viewport3D.cameraEntity[vpEid] = camEid;

	return { vpEid, camEid };
}

describe('mouseInteraction3DSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		clearMouseInputStore();
	});

	it('does nothing when no mouse input is stored', () => {
		const { camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, {}, 5);
		Transform3D.dirty[camEid] = 0;

		mouseInteraction3DSystem(world);

		expect(Transform3D.dirty[camEid]).toBe(0);
	});

	it('applies horizontal drag to yaw', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 0.01 }, 5);

		feedMouseDrag(vpEid, 100, 0);
		mouseInteraction3DSystem(world);

		const yaw = MouseInteraction3D.yaw[camEid] as number;
		expect(yaw).toBeCloseTo(1.0); // 100 * 0.01
		expect(Transform3D.dirty[camEid]).toBe(1);
	});

	it('applies vertical drag to pitch', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 0.01 }, 5);

		feedMouseDrag(vpEid, 0, 50);
		mouseInteraction3DSystem(world);

		const pitch = MouseInteraction3D.pitch[camEid] as number;
		expect(pitch).toBeCloseTo(0.5); // 50 * 0.01
	});

	it('inverts Y axis when configured', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(
			world,
			camEid,
			{
				rotationSensitivity: 0.01,
				invertY: true,
			},
			5,
		);

		feedMouseDrag(vpEid, 0, 50);
		mouseInteraction3DSystem(world);

		const pitch = MouseInteraction3D.pitch[camEid] as number;
		expect(pitch).toBeCloseTo(-0.5); // inverted: 50 * 0.01 * -1
	});

	it('clamps pitch to prevent gimbal lock', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 1 }, 5);

		// Huge drag to exceed max pitch
		feedMouseDrag(vpEid, 0, 100);
		mouseInteraction3DSystem(world);

		const pitch = MouseInteraction3D.pitch[camEid] as number;
		expect(pitch).toBeLessThan(Math.PI / 2);
		expect(pitch).toBeCloseTo(Math.PI / 2 - 0.01);
	});

	it('applies scroll to zoom distance', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(
			world,
			camEid,
			{
				zoomSensitivity: 0.5,
				zoomMin: 1,
				zoomMax: 100,
			},
			10,
		);

		feedMouseScroll(vpEid, 4); // zoom out
		mouseInteraction3DSystem(world);

		const distance = MouseInteraction3D.distance[camEid] as number;
		expect(distance).toBeCloseTo(12); // 10 + 4 * 0.5
	});

	it('clamps zoom distance to min/max bounds', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(
			world,
			camEid,
			{
				zoomSensitivity: 1,
				zoomMin: 2,
				zoomMax: 8,
			},
			5,
		);

		// Zoom way out
		feedMouseScroll(vpEid, 20);
		mouseInteraction3DSystem(world);
		expect(MouseInteraction3D.distance[camEid] as number).toBeCloseTo(8);

		// Zoom way in
		clearMouseInputStore();
		feedMouseScroll(vpEid, -20);
		mouseInteraction3DSystem(world);
		expect(MouseInteraction3D.distance[camEid] as number).toBeCloseTo(2);
	});

	it('converts spherical coordinates to camera position', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 1 }, 10);

		// Set yaw to PI/2 (look from the side), no pitch
		feedMouseDrag(vpEid, Math.PI / 2, 0);
		mouseInteraction3DSystem(world);

		// Camera should be at approximately (10, 0, 0) when yaw = PI/2
		expect(Transform3D.tx[camEid] as number).toBeCloseTo(10, 0);
		expect(Transform3D.ty[camEid] as number).toBeCloseTo(0, 0);
		expect(Transform3D.tz[camEid] as number).toBeCloseTo(0, 0);
	});

	it('converts pitch to vertical camera offset', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 1 }, 10);

		// Pitch up (positive pitch = camera goes up)
		feedMouseDrag(vpEid, 0, Math.PI / 4);
		mouseInteraction3DSystem(world);

		const ty = Transform3D.ty[camEid] as number;
		expect(ty).toBeGreaterThan(0); // Camera should be above origin
		expect(ty).toBeCloseTo(10 * Math.sin(Math.PI / 4), 1);
	});

	it('sets camera rotation to look at origin', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, { rotationSensitivity: 0.01 }, 5);

		feedMouseDrag(vpEid, 100, 50);
		mouseInteraction3DSystem(world);

		const yaw = MouseInteraction3D.yaw[camEid] as number;
		const pitch = MouseInteraction3D.pitch[camEid] as number;

		expect(Transform3D.rx[camEid] as number).toBeCloseTo(-pitch);
		expect(Transform3D.ry[camEid] as number).toBeCloseTo(-yaw);
		expect(Transform3D.rz[camEid] as number).toBeCloseTo(0);
	});

	it('clears mouse input store after processing', () => {
		const { vpEid, camEid } = setupViewportWithCamera(world);
		enableMouseInteraction(world, camEid, {}, 5);

		feedMouseDrag(vpEid, 10, 5);
		expect(mouseInputStore.size).toBe(1);

		mouseInteraction3DSystem(world);
		expect(mouseInputStore.size).toBe(0);
	});

	it('handles multiple viewports independently', () => {
		const vp1 = setupViewportWithCamera(world);
		const vp2 = setupViewportWithCamera(world);
		enableMouseInteraction(world, vp1.camEid, { rotationSensitivity: 0.01 }, 5);
		enableMouseInteraction(world, vp2.camEid, { rotationSensitivity: 0.01 }, 10);

		feedMouseDrag(vp1.vpEid, 100, 0);
		feedMouseDrag(vp2.vpEid, -50, 0);
		mouseInteraction3DSystem(world);

		const yaw1 = MouseInteraction3D.yaw[vp1.camEid] as number;
		const yaw2 = MouseInteraction3D.yaw[vp2.camEid] as number;

		expect(yaw1).toBeCloseTo(1.0);
		expect(yaw2).toBeCloseTo(-0.5);
	});

	it('skips viewport if camera entity is 0', () => {
		const vpEid = addEntity(world) as Entity;
		addComponent(world, vpEid, Viewport3D);
		Viewport3D.cameraEntity[vpEid] = 0;

		feedMouseDrag(vpEid, 10, 5);
		expect(() => mouseInteraction3DSystem(world)).not.toThrow();
	});

	it('skips camera without MouseInteraction3D component', () => {
		const camEid = addEntity(world) as Entity;
		addComponent(world, camEid, Transform3D);
		Transform3D.tz[camEid] = 5;

		const vpEid = addEntity(world) as Entity;
		addComponent(world, vpEid, Viewport3D);
		Viewport3D.cameraEntity[vpEid] = camEid;

		feedMouseDrag(vpEid, 100, 50);
		Transform3D.dirty[camEid] = 0;

		mouseInteraction3DSystem(world);

		// Camera should not be modified
		expect(Transform3D.dirty[camEid]).toBe(0);
	});
});
