/**
 * SoA component for mouse-based 3D camera interaction.
 *
 * Stores per-entity configuration for camera rotation (drag) and zoom (scroll).
 * Works with the mouseInteraction3DSystem to apply accumulated mouse input
 * to the camera's Transform3D component.
 *
 * @module 3d/components/mouseInteraction3d
 */

import { addComponent, hasComponent, removeComponent } from 'bitecs';
import type { Entity, World } from '../../core/types';
import {
	type MouseInteraction3DConfig,
	MouseInteraction3DConfigSchema,
} from '../schemas/components';

const DEFAULT_CAPACITY = 10000;

/**
 * Structure-of-Arrays mouse interaction component.
 * Stores sensitivity, zoom bounds, and accumulated mouse state.
 *
 * @example
 * ```typescript
 * MouseInteraction3D.rotationSensitivity[eid] = 0.005;
 * ```
 */
export const MouseInteraction3D = {
	/** Radians per pixel of mouse movement for rotation. */
	rotationSensitivity: new Float32Array(DEFAULT_CAPACITY),
	/** Units per scroll tick for zoom. */
	zoomSensitivity: new Float32Array(DEFAULT_CAPACITY),
	/** Minimum zoom distance (camera distance from target). */
	zoomMin: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum zoom distance (camera distance from target). */
	zoomMax: new Float32Array(DEFAULT_CAPACITY),
	/** Whether to invert the Y axis (0 = no, 1 = yes). */
	invertY: new Uint8Array(DEFAULT_CAPACITY),
	/** Current camera distance (used for zoom). */
	distance: new Float32Array(DEFAULT_CAPACITY),
	/** Accumulated X rotation from mouse drag (yaw). */
	yaw: new Float32Array(DEFAULT_CAPACITY),
	/** Accumulated Y rotation from mouse drag (pitch). */
	pitch: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Data returned from getMouseInteraction3D.
 */
export interface MouseInteraction3DData {
	readonly rotationSensitivity: number;
	readonly zoomSensitivity: number;
	readonly zoomMin: number;
	readonly zoomMax: number;
	readonly invertY: boolean;
	readonly distance: number;
	readonly yaw: number;
	readonly pitch: number;
}

/**
 * Accumulated mouse input for a single frame.
 * Fed to the system via mouseInputStore.
 */
export interface MouseDragInput {
	/** Horizontal pixel delta from mouse drag. */
	readonly dx: number;
	/** Vertical pixel delta from mouse drag. */
	readonly dy: number;
}

/**
 * Per-frame mouse input for the interaction system.
 * Store accumulated drag and scroll events here before running the system.
 */
export const mouseInputStore = new Map<
	number,
	{
		dragDx: number;
		dragDy: number;
		scrollDelta: number;
	}
>();

/**
 * Clear accumulated mouse input. Call after the system processes input each frame.
 */
export function clearMouseInputStore(): void {
	mouseInputStore.clear();
}

/**
 * Feed mouse drag input for a viewport entity.
 * Accumulates across multiple events within a frame.
 *
 * @param viewportEid - Viewport entity to apply drag to
 * @param dx - Horizontal pixel delta
 * @param dy - Vertical pixel delta
 *
 * @example
 * ```typescript
 * feedMouseDrag(viewportEid, event.movementX, event.movementY);
 * ```
 */
export function feedMouseDrag(viewportEid: Entity, dx: number, dy: number): void {
	const existing = mouseInputStore.get(viewportEid);
	if (existing) {
		existing.dragDx += dx;
		existing.dragDy += dy;
	} else {
		mouseInputStore.set(viewportEid, { dragDx: dx, dragDy: dy, scrollDelta: 0 });
	}
}

/**
 * Feed mouse scroll input for a viewport entity.
 * Accumulates across multiple events within a frame.
 *
 * @param viewportEid - Viewport entity to apply scroll to
 * @param delta - Scroll delta (positive = zoom out, negative = zoom in)
 *
 * @example
 * ```typescript
 * feedMouseScroll(viewportEid, event.deltaY > 0 ? 1 : -1);
 * ```
 */
export function feedMouseScroll(viewportEid: Entity, delta: number): void {
	const existing = mouseInputStore.get(viewportEid);
	if (existing) {
		existing.scrollDelta += delta;
	} else {
		mouseInputStore.set(viewportEid, { dragDx: 0, dragDy: 0, scrollDelta: delta });
	}
}

/**
 * Enable mouse interaction on a camera entity.
 * Config is validated via Zod. Sets initial distance from the camera's current Z position.
 *
 * @param world - ECS world
 * @param eid - Camera entity ID
 * @param config - Mouse interaction configuration
 * @param initialDistance - Initial camera distance from target (defaults to 5)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * enableMouseInteraction(world, cameraEid, { rotationSensitivity: 0.005 });
 * ```
 */
export function enableMouseInteraction(
	world: World,
	eid: Entity,
	config: MouseInteraction3DConfig = {},
	initialDistance = 5,
): Entity {
	const validated = MouseInteraction3DConfigSchema.parse(config);

	if (!hasComponent(world, eid, MouseInteraction3D)) {
		addComponent(world, eid, MouseInteraction3D);
	}

	MouseInteraction3D.rotationSensitivity[eid] = validated.rotationSensitivity;
	MouseInteraction3D.zoomSensitivity[eid] = validated.zoomSensitivity;
	MouseInteraction3D.zoomMin[eid] = validated.zoomMin;
	MouseInteraction3D.zoomMax[eid] = validated.zoomMax;
	MouseInteraction3D.invertY[eid] = validated.invertY ? 1 : 0;

	// Clamp initial distance
	const clampedDistance = Math.max(validated.zoomMin, Math.min(validated.zoomMax, initialDistance));
	MouseInteraction3D.distance[eid] = clampedDistance;
	MouseInteraction3D.yaw[eid] = 0;
	MouseInteraction3D.pitch[eid] = 0;

	return eid;
}

/**
 * Disable mouse interaction on a camera entity.
 *
 * @param world - ECS world
 * @param eid - Camera entity ID
 */
export function disableMouseInteraction(world: World, eid: Entity): void {
	if (hasComponent(world, eid, MouseInteraction3D)) {
		removeComponent(world, eid, MouseInteraction3D);
	}
}

/**
 * Get mouse interaction data for an entity.
 *
 * @param world - ECS world
 * @param eid - Entity ID
 * @returns Mouse interaction data or undefined if component missing
 */
export function getMouseInteraction3D(
	world: World,
	eid: Entity,
): MouseInteraction3DData | undefined {
	if (!hasComponent(world, eid, MouseInteraction3D)) {
		return undefined;
	}

	return {
		rotationSensitivity: MouseInteraction3D.rotationSensitivity[eid] as number,
		zoomSensitivity: MouseInteraction3D.zoomSensitivity[eid] as number,
		zoomMin: MouseInteraction3D.zoomMin[eid] as number,
		zoomMax: MouseInteraction3D.zoomMax[eid] as number,
		invertY: MouseInteraction3D.invertY[eid] === 1,
		distance: MouseInteraction3D.distance[eid] as number,
		yaw: MouseInteraction3D.yaw[eid] as number,
		pitch: MouseInteraction3D.pitch[eid] as number,
	};
}
