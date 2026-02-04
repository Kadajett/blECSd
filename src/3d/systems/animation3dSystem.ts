/**
 * 3D animation system: applies continuous rotation and orbital movement
 * to entities with Animation3D + Transform3D components.
 *
 * Runs in the ANIMATION phase before sceneGraphSystem picks up dirty flags.
 *
 * @module 3d/systems/animation3dSystem
 */

import { query } from 'bitecs';
import { getDeltaTime } from '../../core/scheduler';
import type { Entity, System, World } from '../../core/types';
import { Animation3D } from '../components/animation3d';
import { Transform3D } from '../components/transform3d';

/**
 * Animation3D system. Updates Transform3D rotation and position based on
 * Animation3D parameters and elapsed time.
 *
 * For each entity with both Animation3D and Transform3D:
 * - Adds rotateSpeed * dt to current rotation axes
 * - If orbiting: updates orbit angle and computes position on circle
 * - Marks Transform3D as dirty so sceneGraphSystem recomputes the world matrix
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { animation3DSystem } from 'blecsd/3d/systems';
 *
 * // Each frame:
 * animation3DSystem(world);  // Updates rotations/orbits
 * sceneGraphSystem(world);   // Recomputes world matrices
 * ```
 */
export const animation3DSystem: System = (world: World): World => {
	const dt = getDeltaTime();
	if (dt <= 0) return world;

	const entities = query(world, [Animation3D, Transform3D]) as Entity[];

	for (const eid of entities) {
		let dirty = false;

		// Continuous rotation
		const rsx = Animation3D.rotateSpeedX[eid] as number;
		const rsy = Animation3D.rotateSpeedY[eid] as number;
		const rsz = Animation3D.rotateSpeedZ[eid] as number;

		if (rsx !== 0) {
			Transform3D.rx[eid] = (Transform3D.rx[eid] as number) + rsx * dt;
			dirty = true;
		}
		if (rsy !== 0) {
			Transform3D.ry[eid] = (Transform3D.ry[eid] as number) + rsy * dt;
			dirty = true;
		}
		if (rsz !== 0) {
			Transform3D.rz[eid] = (Transform3D.rz[eid] as number) + rsz * dt;
			dirty = true;
		}

		// Orbital movement
		const orbitEnabled = Animation3D.orbitEnabled[eid] as number;
		const orbitSpeed = Animation3D.orbitSpeed[eid] as number;

		if (orbitEnabled === 1 && orbitSpeed !== 0) {
			const radius = Animation3D.orbitRadius[eid] as number;
			const centerX = Animation3D.orbitCenterX[eid] as number;
			const centerY = Animation3D.orbitCenterY[eid] as number;
			const centerZ = Animation3D.orbitCenterZ[eid] as number;

			// Update orbit angle
			const newAngle = (Animation3D.orbitAngle[eid] as number) + orbitSpeed * dt;
			Animation3D.orbitAngle[eid] = newAngle;

			// Compute position on XZ circle around center
			Transform3D.tx[eid] = centerX + Math.cos(newAngle) * radius;
			Transform3D.ty[eid] = centerY;
			Transform3D.tz[eid] = centerZ + Math.sin(newAngle) * radius;
			dirty = true;
		}

		if (dirty) {
			Transform3D.dirty[eid] = 1;
		}
	}

	return world;
};
