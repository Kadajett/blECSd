/**
 * Mouse interaction system for 3D camera control.
 *
 * Processes accumulated mouse drag and scroll input to rotate and zoom
 * the camera. Works with entities that have both MouseInteraction3D and
 * Transform3D components (typically camera entities).
 *
 * The system reads from mouseInputStore (fed by feedMouseDrag/feedMouseScroll)
 * and updates the camera's Transform3D position based on spherical coordinates
 * (yaw, pitch, distance from origin).
 *
 * Run this system BEFORE sceneGraphSystem so that updated camera positions
 * are picked up in the same frame.
 *
 * @module 3d/systems/mouseInteraction3dSystem
 */

import { hasComponent, query } from '../../core/ecs';
import type { Entity, System, World } from '../../core/types';
import {
	clearMouseInputStore,
	MouseInteraction3D,
	mouseInputStore,
} from '../components/mouseInteraction3d';
import { Transform3D } from '../components/transform3d';
import { Viewport3D } from '../components/viewport3d';

/** Maximum pitch angle to prevent gimbal lock (just under 90 degrees). */
const MAX_PITCH = Math.PI / 2 - 0.01;

/**
 * Mouse interaction 3D system. Processes accumulated mouse input and applies
 * camera rotation (drag) and zoom (scroll) to the camera's Transform3D.
 *
 * For each viewport with mouse input:
 * 1. Looks up the camera entity from Viewport3D.cameraEntity
 * 2. If the camera has MouseInteraction3D, applies drag to yaw/pitch
 * 3. Applies scroll to distance (clamped by zoomMin/zoomMax)
 * 4. Converts spherical coordinates (yaw, pitch, distance) to Cartesian (tx, ty, tz)
 * 5. Sets camera rotation to look at origin (rx = -pitch, ry = -yaw)
 * 6. Marks Transform3D as dirty
 *
 * After processing, clears the mouseInputStore.
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { mouseInteraction3DSystem } from 'blecsd/3d/systems';
 * import { feedMouseDrag, feedMouseScroll } from 'blecsd/3d/components';
 *
 * // On mouse drag event:
 * feedMouseDrag(viewportEid, deltaX, deltaY);
 *
 * // On scroll event:
 * feedMouseScroll(viewportEid, scrollTicks);
 *
 * // Each frame:
 * mouseInteraction3DSystem(world);  // Applies input to camera
 * sceneGraphSystem(world);           // Recomputes world matrices
 * ```
 */
export const mouseInteraction3DSystem: System = (world: World): World => {
	const viewports = query(world, [Viewport3D]) as Entity[];

	for (const vpEid of viewports) {
		const input = mouseInputStore.get(vpEid);
		if (!input) continue;

		const cameraEid = Viewport3D.cameraEntity[vpEid] as number as Entity;
		if (cameraEid === 0) continue;

		// Check that camera has mouse interaction enabled
		if (!hasComponent(world, cameraEid, MouseInteraction3D)) continue;
		const sensitivity = MouseInteraction3D.rotationSensitivity[cameraEid] as number;

		// Apply drag rotation
		if (input.dragDx !== 0 || input.dragDy !== 0) {
			const invertMultiplier = MouseInteraction3D.invertY[cameraEid] === 1 ? -1 : 1;

			const yawDelta = input.dragDx * sensitivity;
			const pitchDelta = input.dragDy * sensitivity * invertMultiplier;

			const newYaw = (MouseInteraction3D.yaw[cameraEid] as number) + yawDelta;
			const newPitch = Math.max(
				-MAX_PITCH,
				Math.min(MAX_PITCH, (MouseInteraction3D.pitch[cameraEid] as number) + pitchDelta),
			);

			MouseInteraction3D.yaw[cameraEid] = newYaw;
			MouseInteraction3D.pitch[cameraEid] = newPitch;
		}

		// Apply scroll zoom
		if (input.scrollDelta !== 0) {
			const zoomSens = MouseInteraction3D.zoomSensitivity[cameraEid] as number;
			const zoomMin = MouseInteraction3D.zoomMin[cameraEid] as number;
			const zoomMax = MouseInteraction3D.zoomMax[cameraEid] as number;
			const currentDistance = MouseInteraction3D.distance[cameraEid] as number;

			const newDistance = Math.max(
				zoomMin,
				Math.min(zoomMax, currentDistance + input.scrollDelta * zoomSens),
			);
			MouseInteraction3D.distance[cameraEid] = newDistance;
		}

		// Convert spherical coordinates to Cartesian position
		const yaw = MouseInteraction3D.yaw[cameraEid] as number;
		const pitch = MouseInteraction3D.pitch[cameraEid] as number;
		const distance = MouseInteraction3D.distance[cameraEid] as number;

		// Spherical to Cartesian: camera orbits around the origin
		const cosPitch = Math.cos(pitch);
		Transform3D.tx[cameraEid] = Math.sin(yaw) * cosPitch * distance;
		Transform3D.ty[cameraEid] = Math.sin(pitch) * distance;
		Transform3D.tz[cameraEid] = Math.cos(yaw) * cosPitch * distance;

		// Point camera toward origin
		Transform3D.rx[cameraEid] = -pitch;
		Transform3D.ry[cameraEid] = -yaw;
		Transform3D.rz[cameraEid] = 0;

		Transform3D.dirty[cameraEid] = 1;
	}

	clearMouseInputStore();
	return world;
};
