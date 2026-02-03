/**
 * SoA component for 3D materials.
 *
 * @module 3d/components/material
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../../core/types';
import { type Material3DConfig, Material3DConfigSchema } from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/** Render mode encoding for Uint8Array storage. */
const RENDER_MODE_WIREFRAME = 0;
const RENDER_MODE_FILLED = 1;
const RENDER_MODE_BOTH = 2;

/**
 * Structure-of-Arrays material component.
 * Controls how meshes are rendered (wireframe, filled, colors, culling).
 *
 * @example
 * ```typescript
 * Material3D.wireColor[eid] = 0x00ff00;
 * ```
 */
export const Material3D = {
	wireColor: new Uint32Array(DEFAULT_CAPACITY),
	fillColor: new Uint32Array(DEFAULT_CAPACITY),
	/** 0 = wireframe, 1 = filled, 2 = both */
	renderMode: new Uint8Array(DEFAULT_CAPACITY),
	backfaceCull: new Uint8Array(DEFAULT_CAPACITY),
	flatShading: new Uint8Array(DEFAULT_CAPACITY),
	antiAlias: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getMaterial3D.
 */
export interface Material3DData {
	readonly wireColor: number;
	readonly fillColor: number;
	readonly renderMode: 'wireframe' | 'filled' | 'both';
	readonly backfaceCull: boolean;
	readonly flatShading: boolean;
	readonly antiAlias: boolean;
}

/**
 * Set material properties on an entity. Config is validated via Zod.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param config - Material configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * setMaterial3D(world, eid, { wireColor: 0x00ff00, renderMode: 'wireframe' });
 * ```
 */
export function setMaterial3D(world: World, eid: Entity, config: Material3DConfig): Entity {
	const validated = Material3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, Material3D)) {
		addComponent(world, eid, Material3D);
	}

	Material3D.wireColor[eid] = validated.wireColor;
	Material3D.fillColor[eid] = validated.fillColor;

	if (validated.renderMode === 'filled') {
		Material3D.renderMode[eid] = RENDER_MODE_FILLED;
	} else if (validated.renderMode === 'both') {
		Material3D.renderMode[eid] = RENDER_MODE_BOTH;
	} else {
		Material3D.renderMode[eid] = RENDER_MODE_WIREFRAME;
	}

	Material3D.backfaceCull[eid] = validated.backfaceCull ? 1 : 0;
	Material3D.flatShading[eid] = validated.flatShading ? 1 : 0;
	Material3D.antiAlias[eid] = validated.antiAlias ? 1 : 0;

	return eid;
}

/**
 * Get material data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Material data or undefined if component missing
 */
export function getMaterial3D(world: World, eid: Entity): Material3DData | undefined {
	if (!hasComponent(world, eid, Material3D)) {
		return undefined;
	}

	const modeVal = Material3D.renderMode[eid] as number;
	let renderMode: 'wireframe' | 'filled' | 'both' = 'wireframe';
	if (modeVal === RENDER_MODE_FILLED) renderMode = 'filled';
	else if (modeVal === RENDER_MODE_BOTH) renderMode = 'both';

	return {
		wireColor: Material3D.wireColor[eid] as number,
		fillColor: Material3D.fillColor[eid] as number,
		renderMode,
		backfaceCull: Material3D.backfaceCull[eid] === 1,
		flatShading: Material3D.flatShading[eid] === 1,
		antiAlias: Material3D.antiAlias[eid] === 1,
	};
}
