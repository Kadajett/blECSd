/**
 * SoA component for 3D cameras.
 *
 * @module 3d/components/camera3d
 */

import { addComponent, hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { type Camera3DConfig, Camera3DConfigSchema } from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/**
 * Structure-of-Arrays 3D camera component.
 * Stores projection parameters and cached matrices.
 *
 * @example
 * ```typescript
 * Camera3D.fov[eid] = Math.PI / 3;
 * ```
 */
export const Camera3D = {
	fov: new Float32Array(DEFAULT_CAPACITY),
	near: new Float32Array(DEFAULT_CAPACITY),
	far: new Float32Array(DEFAULT_CAPACITY),
	aspect: new Float32Array(DEFAULT_CAPACITY),
	/** 0 = perspective, 1 = orthographic */
	projectionMode: new Uint8Array(DEFAULT_CAPACITY),
	/** Cached projection matrix (16 floats per entity) */
	projMatrix: new Float32Array(DEFAULT_CAPACITY * 16),
	/** Cached view matrix (16 floats per entity) */
	viewMatrix: new Float32Array(DEFAULT_CAPACITY * 16),
	dirty: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getCamera3D.
 */
export interface Camera3DData {
	readonly fov: number;
	readonly near: number;
	readonly far: number;
	readonly aspect: number;
	readonly projectionMode: 'perspective' | 'orthographic';
}

/**
 * Set camera properties on an entity. Config is validated via Zod.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param config - Camera configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * setCamera3D(world, eid, { fov: Math.PI / 3, near: 0.1, far: 100 });
 * ```
 */
export function setCamera3D(world: World, eid: Entity, config: Camera3DConfig): Entity {
	const validated = Camera3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, Camera3D)) {
		addComponent(world, eid, Camera3D);
	}

	Camera3D.fov[eid] = validated.fov;
	Camera3D.near[eid] = validated.near;
	Camera3D.far[eid] = validated.far;
	Camera3D.aspect[eid] = validated.aspect;
	Camera3D.projectionMode[eid] = validated.projectionMode === 'orthographic' ? 1 : 0;
	Camera3D.dirty[eid] = 1;

	return eid;
}

/**
 * Get camera data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Camera data or undefined if component missing
 */
export function getCamera3D(world: World, eid: Entity): Camera3DData | undefined {
	if (!hasComponent(world, eid, Camera3D)) {
		return undefined;
	}

	return {
		fov: Camera3D.fov[eid] as number,
		near: Camera3D.near[eid] as number,
		far: Camera3D.far[eid] as number,
		aspect: Camera3D.aspect[eid] as number,
		projectionMode: Camera3D.projectionMode[eid] === 1 ? 'orthographic' : 'perspective',
	};
}

/**
 * Get the cached projection matrix for a camera entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns 16-element Float32Array view
 */
export function getProjMatrix(_world: World, eid: Entity): Float32Array {
	const offset = eid * 16;
	return Camera3D.projMatrix.subarray(offset, offset + 16);
}

/**
 * Get the cached view matrix for a camera entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns 16-element Float32Array view
 */
export function getViewMatrix(_world: World, eid: Entity): Float32Array {
	const offset = eid * 16;
	return Camera3D.viewMatrix.subarray(offset, offset + 16);
}
