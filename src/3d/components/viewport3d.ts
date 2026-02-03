/**
 * SoA component for 3D viewports.
 *
 * A viewport defines a rectangular screen region that renders
 * a 3D scene from a camera's perspective using a specific backend.
 *
 * @module 3d/components/viewport3d
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../../core/types';
import { type Viewport3DConfig, Viewport3DConfigSchema } from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/** Backend type encoding for Uint8Array storage. */
const BACKEND_AUTO = 0;
const BACKEND_BRAILLE = 1;
const BACKEND_HALFBLOCK = 2;
const BACKEND_SIXEL = 3;
const BACKEND_KITTY = 4;

/**
 * Structure-of-Arrays viewport component.
 * Defines a screen region for 3D rendering.
 *
 * @example
 * ```typescript
 * Viewport3D.left[eid] = 5;
 * Viewport3D.width[eid] = 80;
 * ```
 */
export const Viewport3D = {
	left: new Uint16Array(DEFAULT_CAPACITY),
	top: new Uint16Array(DEFAULT_CAPACITY),
	width: new Uint16Array(DEFAULT_CAPACITY),
	height: new Uint16Array(DEFAULT_CAPACITY),
	/** Entity ID of the camera to render from */
	cameraEntity: new Uint32Array(DEFAULT_CAPACITY),
	/** Backend type: 0=auto, 1=braille, 2=halfblock, 3=sixel, 4=kitty */
	backendType: new Uint8Array(DEFAULT_CAPACITY),
	/** Computed pixel width (depends on backend cell size) */
	pixelWidth: new Uint16Array(DEFAULT_CAPACITY),
	/** Computed pixel height (depends on backend cell size) */
	pixelHeight: new Uint16Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getViewport3D.
 */
export interface Viewport3DData {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
	readonly cameraEntity: number;
	readonly backendType: 'auto' | 'braille' | 'halfblock' | 'sixel' | 'kitty';
	readonly pixelWidth: number;
	readonly pixelHeight: number;
}

const backendTypeMap: Record<string, number> = {
	auto: BACKEND_AUTO,
	braille: BACKEND_BRAILLE,
	halfblock: BACKEND_HALFBLOCK,
	sixel: BACKEND_SIXEL,
	kitty: BACKEND_KITTY,
};

const backendTypeReverse: Record<number, 'auto' | 'braille' | 'halfblock' | 'sixel' | 'kitty'> = {
	[BACKEND_AUTO]: 'auto',
	[BACKEND_BRAILLE]: 'braille',
	[BACKEND_HALFBLOCK]: 'halfblock',
	[BACKEND_SIXEL]: 'sixel',
	[BACKEND_KITTY]: 'kitty',
};

/**
 * Set viewport properties on an entity. Config is validated via Zod.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @param config - Viewport configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * setViewport3D(world, eid, {
 *   left: 5, top: 2, width: 60, height: 20,
 *   cameraEntity: cameraEid,
 * });
 * ```
 */
export function setViewport3D(world: World, eid: Entity, config: Viewport3DConfig): Entity {
	const validated = Viewport3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, Viewport3D)) {
		addComponent(world, eid, Viewport3D);
	}

	Viewport3D.left[eid] = validated.left;
	Viewport3D.top[eid] = validated.top;
	Viewport3D.width[eid] = validated.width;
	Viewport3D.height[eid] = validated.height;
	Viewport3D.cameraEntity[eid] = validated.cameraEntity;
	Viewport3D.backendType[eid] = backendTypeMap[validated.backendType] ?? BACKEND_AUTO;

	return eid;
}

/**
 * Get viewport data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Viewport data or undefined if component missing
 */
export function getViewport3D(world: World, eid: Entity): Viewport3DData | undefined {
	if (!hasComponent(world, eid, Viewport3D)) {
		return undefined;
	}

	return {
		left: Viewport3D.left[eid] as number,
		top: Viewport3D.top[eid] as number,
		width: Viewport3D.width[eid] as number,
		height: Viewport3D.height[eid] as number,
		cameraEntity: Viewport3D.cameraEntity[eid] as number,
		backendType: backendTypeReverse[Viewport3D.backendType[eid] as number] ?? 'auto',
		pixelWidth: Viewport3D.pixelWidth[eid] as number,
		pixelHeight: Viewport3D.pixelHeight[eid] as number,
	};
}
