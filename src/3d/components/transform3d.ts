/**
 * SoA component for 3D transforms: translation, rotation, scale, world matrix.
 *
 * @module 3d/components/transform3d
 */

import { addComponent, hasComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { type Transform3DConfig, Transform3DConfigSchema } from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/**
 * Structure-of-Arrays 3D transform component.
 * Stores local transform (translation, rotation, scale), computed world matrix,
 * and a dirty flag for incremental recomputation.
 *
 * @example
 * ```typescript
 * Transform3D.tx[eid] = 5.0;
 * Transform3D.dirty[eid] = 1;
 * ```
 */
export const Transform3D = {
	tx: new Float32Array(DEFAULT_CAPACITY),
	ty: new Float32Array(DEFAULT_CAPACITY),
	tz: new Float32Array(DEFAULT_CAPACITY),
	rx: new Float32Array(DEFAULT_CAPACITY),
	ry: new Float32Array(DEFAULT_CAPACITY),
	rz: new Float32Array(DEFAULT_CAPACITY),
	sx: new Float32Array(DEFAULT_CAPACITY),
	sy: new Float32Array(DEFAULT_CAPACITY),
	sz: new Float32Array(DEFAULT_CAPACITY),
	worldMatrix: new Float32Array(DEFAULT_CAPACITY * 16),
	dirty: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getTransform3D.
 */
export interface Transform3DData {
	readonly tx: number;
	readonly ty: number;
	readonly tz: number;
	readonly rx: number;
	readonly ry: number;
	readonly rz: number;
	readonly sx: number;
	readonly sy: number;
	readonly sz: number;
}

/**
 * Set a 3D transform on an entity. Config is validated via Zod.
 * Adds the component if not already present. Sets dirty flag.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param config - Transform configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * setTransform3D(world, eid, { tx: 0, ty: 1, tz: -5, ry: Math.PI / 4 });
 * ```
 */
export function setTransform3D(world: World, eid: Entity, config: Transform3DConfig): Entity {
	const validated = Transform3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, Transform3D)) {
		addComponent(world, eid, Transform3D);
		// Initialize scale to 1.0
		Transform3D.sx[eid] = 1;
		Transform3D.sy[eid] = 1;
		Transform3D.sz[eid] = 1;
	}

	Transform3D.tx[eid] = validated.tx;
	Transform3D.ty[eid] = validated.ty;
	Transform3D.tz[eid] = validated.tz;
	Transform3D.rx[eid] = validated.rx;
	Transform3D.ry[eid] = validated.ry;
	Transform3D.rz[eid] = validated.rz;
	Transform3D.sx[eid] = validated.sx;
	Transform3D.sy[eid] = validated.sy;
	Transform3D.sz[eid] = validated.sz;
	Transform3D.dirty[eid] = 1;

	return eid;
}

/**
 * Get the transform data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Transform data or undefined if component missing
 *
 * @example
 * ```typescript
 * const transform = getTransform3D(world, eid);
 * if (transform) console.log(transform.tx, transform.ty, transform.tz);
 * ```
 */
export function getTransform3D(world: World, eid: Entity): Transform3DData | undefined {
	if (!hasComponent(world, eid, Transform3D)) {
		return undefined;
	}

	return {
		tx: Transform3D.tx[eid] as number,
		ty: Transform3D.ty[eid] as number,
		tz: Transform3D.tz[eid] as number,
		rx: Transform3D.rx[eid] as number,
		ry: Transform3D.ry[eid] as number,
		rz: Transform3D.rz[eid] as number,
		sx: Transform3D.sx[eid] as number,
		sy: Transform3D.sy[eid] as number,
		sz: Transform3D.sz[eid] as number,
	};
}

/**
 * Set the translation of an entity. Marks dirty.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param x - X translation
 * @param y - Y translation
 * @param z - Z translation
 * @returns The entity ID for chaining
 */
export function setTranslation(world: World, eid: Entity, x: number, y: number, z: number): Entity {
	if (!hasComponent(world, eid, Transform3D)) {
		addComponent(world, eid, Transform3D);
		Transform3D.sx[eid] = 1;
		Transform3D.sy[eid] = 1;
		Transform3D.sz[eid] = 1;
	}
	Transform3D.tx[eid] = x;
	Transform3D.ty[eid] = y;
	Transform3D.tz[eid] = z;
	Transform3D.dirty[eid] = 1;
	return eid;
}

/**
 * Set the rotation of an entity (Euler angles in radians). Marks dirty.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param rx - Rotation around X axis
 * @param ry - Rotation around Y axis
 * @param rz - Rotation around Z axis
 * @returns The entity ID for chaining
 */
export function setRotation(world: World, eid: Entity, rx: number, ry: number, rz: number): Entity {
	if (!hasComponent(world, eid, Transform3D)) {
		addComponent(world, eid, Transform3D);
		Transform3D.sx[eid] = 1;
		Transform3D.sy[eid] = 1;
		Transform3D.sz[eid] = 1;
	}
	Transform3D.rx[eid] = rx;
	Transform3D.ry[eid] = ry;
	Transform3D.rz[eid] = rz;
	Transform3D.dirty[eid] = 1;
	return eid;
}

/**
 * Set the scale of an entity. Marks dirty.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param sx - X scale
 * @param sy - Y scale
 * @param sz - Z scale
 * @returns The entity ID for chaining
 */
export function setScale(world: World, eid: Entity, sx: number, sy: number, sz: number): Entity {
	if (!hasComponent(world, eid, Transform3D)) {
		addComponent(world, eid, Transform3D);
		Transform3D.sx[eid] = 1;
		Transform3D.sy[eid] = 1;
		Transform3D.sz[eid] = 1;
	}
	Transform3D.sx[eid] = sx;
	Transform3D.sy[eid] = sy;
	Transform3D.sz[eid] = sz;
	Transform3D.dirty[eid] = 1;
	return eid;
}

/**
 * Get the world matrix for an entity as a Float32Array subarray view.
 *
 * @param eid - Entity ID
 * @returns 16-element Float32Array view into the worldMatrix
 *
 * @example
 * ```typescript
 * const matrix = getWorldMatrix(eid);
 * // matrix is a live view; changes to worldMatrix are reflected
 * ```
 */
export function getWorldMatrix(eid: Entity): Float32Array {
	const offset = eid * 16;
	return Transform3D.worldMatrix.subarray(offset, offset + 16);
}

/**
 * Mark an entity's transform as dirty (needs world matrix recomputation).
 *
 * @param eid - Entity ID
 */
export function markDirty(eid: Entity): void {
	Transform3D.dirty[eid] = 1;
}

/**
 * Check if an entity's transform is dirty.
 *
 * @param eid - Entity ID
 * @returns True if the transform needs recomputation
 */
export function isDirty(eid: Entity): boolean {
	return Transform3D.dirty[eid] === 1;
}
