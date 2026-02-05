/**
 * SoA component for 3D animation (continuous rotation, orbital movement).
 *
 * @module 3d/components/animation3d
 */

import { addComponent, hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { type Animation3DConfig, Animation3DConfigSchema } from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/**
 * Structure-of-Arrays animation component.
 * Supports continuous rotation and orbital movement around a center point.
 *
 * @example
 * ```typescript
 * Animation3D.rotateSpeedY[eid] = Math.PI; // 180 degrees per second
 * ```
 */
export const Animation3D = {
	/** Rotation speed around X axis in radians per second. */
	rotateSpeedX: new Float32Array(DEFAULT_CAPACITY),
	/** Rotation speed around Y axis in radians per second. */
	rotateSpeedY: new Float32Array(DEFAULT_CAPACITY),
	/** Rotation speed around Z axis in radians per second. */
	rotateSpeedZ: new Float32Array(DEFAULT_CAPACITY),
	/** X component of orbit center point. */
	orbitCenterX: new Float32Array(DEFAULT_CAPACITY),
	/** Y component of orbit center point. */
	orbitCenterY: new Float32Array(DEFAULT_CAPACITY),
	/** Z component of orbit center point. */
	orbitCenterZ: new Float32Array(DEFAULT_CAPACITY),
	/** Orbit speed in radians per second. */
	orbitSpeed: new Float32Array(DEFAULT_CAPACITY),
	/** Distance from orbit center. */
	orbitRadius: new Float32Array(DEFAULT_CAPACITY),
	/** Current orbit angle in radians. */
	orbitAngle: new Float32Array(DEFAULT_CAPACITY),
	/** Whether orbiting is enabled (0 = no, 1 = yes). */
	orbitEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getAnimation3D.
 */
export interface Animation3DData {
	readonly rotateSpeedX: number;
	readonly rotateSpeedY: number;
	readonly rotateSpeedZ: number;
	readonly orbitCenterX: number;
	readonly orbitCenterY: number;
	readonly orbitCenterZ: number;
	readonly orbitSpeed: number;
	readonly orbitRadius: number;
	readonly orbitAngle: number;
	readonly orbitEnabled: boolean;
}

/**
 * Set animation properties on an entity. Config is validated via Zod.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param config - Animation configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * setAnimation3D(world, eid, { rotateSpeed: { y: Math.PI } });
 * ```
 */
export function setAnimation3D(world: World, eid: Entity, config: Animation3DConfig): Entity {
	const validated = Animation3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, Animation3D)) {
		addComponent(world, eid, Animation3D);
	}

	Animation3D.rotateSpeedX[eid] = validated.rotateSpeed.x;
	Animation3D.rotateSpeedY[eid] = validated.rotateSpeed.y;
	Animation3D.rotateSpeedZ[eid] = validated.rotateSpeed.z;

	if (validated.orbitCenter) {
		Animation3D.orbitCenterX[eid] = validated.orbitCenter[0];
		Animation3D.orbitCenterY[eid] = validated.orbitCenter[1];
		Animation3D.orbitCenterZ[eid] = validated.orbitCenter[2];
		Animation3D.orbitEnabled[eid] = 1;
	}

	Animation3D.orbitSpeed[eid] = validated.orbitSpeed;

	if (validated.orbitRadius !== undefined) {
		Animation3D.orbitRadius[eid] = validated.orbitRadius;
	}

	return eid;
}

/**
 * Get animation data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Animation data or undefined if component missing
 */
export function getAnimation3D(world: World, eid: Entity): Animation3DData | undefined {
	if (!hasComponent(world, eid, Animation3D)) {
		return undefined;
	}

	return {
		rotateSpeedX: Animation3D.rotateSpeedX[eid] as number,
		rotateSpeedY: Animation3D.rotateSpeedY[eid] as number,
		rotateSpeedZ: Animation3D.rotateSpeedZ[eid] as number,
		orbitCenterX: Animation3D.orbitCenterX[eid] as number,
		orbitCenterY: Animation3D.orbitCenterY[eid] as number,
		orbitCenterZ: Animation3D.orbitCenterZ[eid] as number,
		orbitSpeed: Animation3D.orbitSpeed[eid] as number,
		orbitRadius: Animation3D.orbitRadius[eid] as number,
		orbitAngle: Animation3D.orbitAngle[eid] as number,
		orbitEnabled: Animation3D.orbitEnabled[eid] === 1,
	};
}
