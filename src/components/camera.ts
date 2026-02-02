/**
 * Camera component for viewport control and scrolling views.
 * @module components/camera
 */

import { addComponent, hasComponent, removeComponent } from 'bitecs';
import type { Entity, World } from '../core/types';
import { hasPosition, Position } from './position';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Null entity value (no follow target) */
const NULL_ENTITY = 0;

// =============================================================================
// CAMERA COMPONENT
// =============================================================================

/**
 * Camera component store using SoA (Structure of Arrays) for performance.
 *
 * - `x`, `y`: Camera position (top-left of viewport in world coordinates)
 * - `width`, `height`: Viewport size in cells
 * - `followTarget`: Entity ID to follow (0 = none)
 * - `smoothing`: Follow smoothing (0 = instant, 1 = max smooth)
 * - `deadZoneX`, `deadZoneY`: Dead zone size for following
 * - `bounded`: Whether camera has bounds (0 = unbounded, 1 = bounded)
 * - `minX`, `maxX`, `minY`, `maxY`: Camera bounds
 *
 * @example
 * ```typescript
 * import { setCamera, setCameraTarget } from 'blecsd';
 *
 * // Create a camera viewport
 * setCamera(world, cameraEntity, {
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Follow the player with smoothing
 * setCameraTarget(world, cameraEntity, playerEntity, 0.1);
 * ```
 */
export const Camera = {
	/** Camera X position (world coordinates) */
	x: new Float32Array(DEFAULT_CAPACITY),
	/** Camera Y position (world coordinates) */
	y: new Float32Array(DEFAULT_CAPACITY),
	/** Viewport width in cells */
	width: new Uint16Array(DEFAULT_CAPACITY),
	/** Viewport height in cells */
	height: new Uint16Array(DEFAULT_CAPACITY),
	/** Entity to follow (0 = none) */
	followTarget: new Uint32Array(DEFAULT_CAPACITY),
	/** Follow smoothing (0 = instant, 1 = max smooth) */
	smoothing: new Float32Array(DEFAULT_CAPACITY),
	/** Dead zone X size */
	deadZoneX: new Float32Array(DEFAULT_CAPACITY),
	/** Dead zone Y size */
	deadZoneY: new Float32Array(DEFAULT_CAPACITY),
	/** Whether camera is bounded (0 = no, 1 = yes) */
	bounded: new Uint8Array(DEFAULT_CAPACITY),
	/** Minimum X bound */
	minX: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum X bound */
	maxX: new Float32Array(DEFAULT_CAPACITY),
	/** Minimum Y bound */
	minY: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum Y bound */
	maxY: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Camera data returned by getCamera.
 */
export interface CameraData {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly followTarget: number;
	readonly smoothing: number;
	readonly deadZoneX: number;
	readonly deadZoneY: number;
	readonly bounded: boolean;
	readonly minX: number;
	readonly maxX: number;
	readonly minY: number;
	readonly maxY: number;
}

/**
 * Options for setting a camera.
 */
export interface CameraOptions {
	/** Camera X position (default: 0) */
	x?: number;
	/** Camera Y position (default: 0) */
	y?: number;
	/** Viewport width in cells (default: 80) */
	width?: number;
	/** Viewport height in cells (default: 24) */
	height?: number;
	/** Entity to follow (default: none) */
	followTarget?: number;
	/** Follow smoothing 0-1 (default: 0) */
	smoothing?: number;
	/** Dead zone X size (default: 0) */
	deadZoneX?: number;
	/** Dead zone Y size (default: 0) */
	deadZoneY?: number;
}

/**
 * Camera bounds configuration.
 */
export interface CameraBounds {
	readonly minX: number;
	readonly maxX: number;
	readonly minY: number;
	readonly maxY: number;
}

/** Default viewport width */
export const DEFAULT_VIEWPORT_WIDTH = 80;

/** Default viewport height */
export const DEFAULT_VIEWPORT_HEIGHT = 24;

/**
 * Initializes camera component with default values.
 */
function initCamera(eid: Entity): void {
	Camera.x[eid] = 0;
	Camera.y[eid] = 0;
	Camera.width[eid] = DEFAULT_VIEWPORT_WIDTH;
	Camera.height[eid] = DEFAULT_VIEWPORT_HEIGHT;
	Camera.followTarget[eid] = NULL_ENTITY;
	Camera.smoothing[eid] = 0;
	Camera.deadZoneX[eid] = 0;
	Camera.deadZoneY[eid] = 0;
	Camera.bounded[eid] = 0;
	Camera.minX[eid] = 0;
	Camera.maxX[eid] = 0;
	Camera.minY[eid] = 0;
	Camera.maxY[eid] = 0;
}

/**
 * Sets a camera on an entity.
 * Adds the Camera component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Camera options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCamera } from 'blecsd';
 *
 * // Create a camera with custom viewport size
 * setCamera(world, camera, {
 *   width: 100,
 *   height: 30,
 *   x: 50,
 *   y: 50,
 * });
 * ```
 */
export function setCamera(world: World, eid: Entity, options: CameraOptions = {}): Entity {
	if (!hasComponent(world, eid, Camera)) {
		addComponent(world, eid, Camera);
		initCamera(eid);
	}

	if (options.x !== undefined) Camera.x[eid] = options.x;
	if (options.y !== undefined) Camera.y[eid] = options.y;
	if (options.width !== undefined) Camera.width[eid] = options.width;
	if (options.height !== undefined) Camera.height[eid] = options.height;
	if (options.followTarget !== undefined) Camera.followTarget[eid] = options.followTarget;
	if (options.smoothing !== undefined)
		Camera.smoothing[eid] = Math.max(0, Math.min(1, options.smoothing));
	if (options.deadZoneX !== undefined) Camera.deadZoneX[eid] = options.deadZoneX;
	if (options.deadZoneY !== undefined) Camera.deadZoneY[eid] = options.deadZoneY;

	return eid;
}

/**
 * Gets the camera data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Camera data or undefined
 *
 * @example
 * ```typescript
 * import { getCamera } from 'blecsd';
 *
 * const cam = getCamera(world, camera);
 * if (cam) {
 *   console.log(`Camera at (${cam.x}, ${cam.y})`);
 * }
 * ```
 */
export function getCamera(world: World, eid: Entity): CameraData | undefined {
	if (!hasComponent(world, eid, Camera)) {
		return undefined;
	}
	return {
		x: Camera.x[eid] as number,
		y: Camera.y[eid] as number,
		width: Camera.width[eid] as number,
		height: Camera.height[eid] as number,
		followTarget: Camera.followTarget[eid] as number,
		smoothing: Camera.smoothing[eid] as number,
		deadZoneX: Camera.deadZoneX[eid] as number,
		deadZoneY: Camera.deadZoneY[eid] as number,
		bounded: (Camera.bounded[eid] as number) === 1,
		minX: Camera.minX[eid] as number,
		maxX: Camera.maxX[eid] as number,
		minY: Camera.minY[eid] as number,
		maxY: Camera.maxY[eid] as number,
	};
}

/**
 * Checks if an entity has a Camera component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Camera component
 */
export function hasCamera(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Camera);
}

/**
 * Removes the camera from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeCamera(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Camera)) {
		removeComponent(world, eid, Camera);
	}
	return eid;
}

// =============================================================================
// CAMERA TARGET
// =============================================================================

/**
 * Sets the entity for the camera to follow.
 *
 * @param world - The ECS world
 * @param cameraEid - The camera entity ID
 * @param targetEid - The target entity ID to follow (0 = no target)
 * @param smoothing - Follow smoothing 0-1 (optional)
 * @returns The camera entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCameraTarget } from 'blecsd';
 *
 * // Follow player with smooth camera
 * setCameraTarget(world, camera, player, 0.1);
 *
 * // Stop following
 * setCameraTarget(world, camera, 0);
 * ```
 */
export function setCameraTarget(
	world: World,
	cameraEid: Entity,
	targetEid: Entity,
	smoothing?: number,
): Entity {
	if (!hasComponent(world, cameraEid, Camera)) {
		addComponent(world, cameraEid, Camera);
		initCamera(cameraEid);
	}

	Camera.followTarget[cameraEid] = targetEid;
	if (smoothing !== undefined) {
		Camera.smoothing[cameraEid] = Math.max(0, Math.min(1, smoothing));
	}

	return cameraEid;
}

/**
 * Gets the camera's follow target.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @returns The target entity ID or 0 if no target
 */
export function getCameraTarget(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Camera)) {
		return NULL_ENTITY;
	}
	return Camera.followTarget[eid] as Entity;
}

/**
 * Checks if the camera is following a target.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @returns true if camera has a follow target
 */
export function isFollowingTarget(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Camera)) {
		return false;
	}
	return (Camera.followTarget[eid] as number) !== NULL_ENTITY;
}

/**
 * Sets the camera dead zone.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param deadZoneX - Dead zone X size
 * @param deadZoneY - Dead zone Y size
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCameraDeadZone } from 'blecsd';
 *
 * // Create a dead zone so camera only moves when target is far from center
 * setCameraDeadZone(world, camera, 10, 5);
 * ```
 */
export function setCameraDeadZone(
	world: World,
	eid: Entity,
	deadZoneX: number,
	deadZoneY: number,
): Entity {
	if (!hasComponent(world, eid, Camera)) {
		addComponent(world, eid, Camera);
		initCamera(eid);
	}

	Camera.deadZoneX[eid] = deadZoneX;
	Camera.deadZoneY[eid] = deadZoneY;

	return eid;
}

// =============================================================================
// CAMERA BOUNDS
// =============================================================================

/**
 * Sets camera bounds.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param bounds - The bounds configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCameraBounds } from 'blecsd';
 *
 * // Restrict camera to a 200x100 area
 * setCameraBounds(world, camera, {
 *   minX: 0,
 *   maxX: 200,
 *   minY: 0,
 *   maxY: 100,
 * });
 * ```
 */
export function setCameraBounds(world: World, eid: Entity, bounds: CameraBounds): Entity {
	if (!hasComponent(world, eid, Camera)) {
		addComponent(world, eid, Camera);
		initCamera(eid);
	}

	Camera.bounded[eid] = 1;
	Camera.minX[eid] = bounds.minX;
	Camera.maxX[eid] = bounds.maxX;
	Camera.minY[eid] = bounds.minY;
	Camera.maxY[eid] = bounds.maxY;

	return eid;
}

/**
 * Clears camera bounds (makes camera unbounded).
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @returns The entity ID for chaining
 */
export function clearCameraBounds(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Camera)) {
		Camera.bounded[eid] = 0;
	}
	return eid;
}

/**
 * Checks if camera has bounds set.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @returns true if camera is bounded
 */
export function isCameraBounded(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Camera)) {
		return false;
	}
	return (Camera.bounded[eid] as number) === 1;
}

// =============================================================================
// CAMERA POSITION
// =============================================================================

/**
 * Sets the camera position directly.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param x - X position
 * @param y - Y position
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setCameraPosition } from 'blecsd';
 *
 * // Move camera to specific location
 * setCameraPosition(world, camera, 100, 50);
 * ```
 */
export function setCameraPosition(world: World, eid: Entity, x: number, y: number): Entity {
	if (!hasComponent(world, eid, Camera)) {
		addComponent(world, eid, Camera);
		initCamera(eid);
	}

	Camera.x[eid] = x;
	Camera.y[eid] = y;

	// Apply bounds if set
	if ((Camera.bounded[eid] as number) === 1) {
		clampCameraToBounds(eid);
	}

	return eid;
}

/**
 * Gets the camera position.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @returns Camera position or undefined
 */
export function getCameraPosition(world: World, eid: Entity): { x: number; y: number } | undefined {
	if (!hasComponent(world, eid, Camera)) {
		return undefined;
	}
	return {
		x: Camera.x[eid] as number,
		y: Camera.y[eid] as number,
	};
}

/**
 * Moves the camera by a delta amount.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param dx - Delta X
 * @param dy - Delta Y
 * @returns The entity ID for chaining
 */
export function moveCameraBy(world: World, eid: Entity, dx: number, dy: number): Entity {
	if (!hasComponent(world, eid, Camera)) {
		return eid;
	}

	Camera.x[eid] = (Camera.x[eid] as number) + dx;
	Camera.y[eid] = (Camera.y[eid] as number) + dy;

	if ((Camera.bounded[eid] as number) === 1) {
		clampCameraToBounds(eid);
	}

	return eid;
}

/**
 * Clamps camera position to its bounds.
 */
function clampCameraToBounds(eid: Entity): void {
	const width = Camera.width[eid] as number;
	const height = Camera.height[eid] as number;
	const minX = Camera.minX[eid] as number;
	const maxX = Camera.maxX[eid] as number;
	const minY = Camera.minY[eid] as number;
	const maxY = Camera.maxY[eid] as number;

	// Clamp so viewport stays within bounds
	const maxCamX = maxX - width;
	const maxCamY = maxY - height;

	Camera.x[eid] = Math.max(minX, Math.min(maxCamX, Camera.x[eid] as number));
	Camera.y[eid] = Math.max(minY, Math.min(maxCamY, Camera.y[eid] as number));
}

// =============================================================================
// COORDINATE CONVERSION
// =============================================================================

/**
 * Converts world coordinates to screen coordinates.
 *
 * @param world - The ECS world
 * @param cameraEid - The camera entity ID
 * @param worldX - World X coordinate
 * @param worldY - World Y coordinate
 * @returns Screen coordinates or undefined if no camera
 *
 * @example
 * ```typescript
 * import { worldToScreen } from 'blecsd';
 *
 * const screen = worldToScreen(world, camera, entity.x, entity.y);
 * if (screen) {
 *   // Draw at screen.x, screen.y
 * }
 * ```
 */
export function worldToScreen(
	world: World,
	cameraEid: Entity,
	worldX: number,
	worldY: number,
): { x: number; y: number } | undefined {
	if (!hasComponent(world, cameraEid, Camera)) {
		return undefined;
	}

	const camX = Camera.x[cameraEid] as number;
	const camY = Camera.y[cameraEid] as number;

	return {
		x: worldX - camX,
		y: worldY - camY,
	};
}

/**
 * Converts screen coordinates to world coordinates.
 *
 * @param world - The ECS world
 * @param cameraEid - The camera entity ID
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @returns World coordinates or undefined if no camera
 *
 * @example
 * ```typescript
 * import { screenToWorld } from 'blecsd';
 *
 * // Convert mouse click to world position
 * const worldPos = screenToWorld(world, camera, mouseX, mouseY);
 * if (worldPos) {
 *   // Handle click at world position
 * }
 * ```
 */
export function screenToWorld(
	world: World,
	cameraEid: Entity,
	screenX: number,
	screenY: number,
): { x: number; y: number } | undefined {
	if (!hasComponent(world, cameraEid, Camera)) {
		return undefined;
	}

	const camX = Camera.x[cameraEid] as number;
	const camY = Camera.y[cameraEid] as number;

	return {
		x: screenX + camX,
		y: screenY + camY,
	};
}

/**
 * Checks if a world position is visible within the camera viewport.
 *
 * @param world - The ECS world
 * @param cameraEid - The camera entity ID
 * @param worldX - World X coordinate
 * @param worldY - World Y coordinate
 * @returns true if position is visible
 *
 * @example
 * ```typescript
 * import { isInView } from 'blecsd';
 *
 * if (isInView(world, camera, enemy.x, enemy.y)) {
 *   // Entity is visible, render it
 * }
 * ```
 */
export function isInView(world: World, cameraEid: Entity, worldX: number, worldY: number): boolean {
	if (!hasComponent(world, cameraEid, Camera)) {
		return false;
	}

	const camX = Camera.x[cameraEid] as number;
	const camY = Camera.y[cameraEid] as number;
	const width = Camera.width[cameraEid] as number;
	const height = Camera.height[cameraEid] as number;

	return worldX >= camX && worldX < camX + width && worldY >= camY && worldY < camY + height;
}

/**
 * Checks if a rectangular area is visible within the camera viewport.
 *
 * @param world - The ECS world
 * @param cameraEid - The camera entity ID
 * @param x - World X of area top-left
 * @param y - World Y of area top-left
 * @param w - Width of area
 * @param h - Height of area
 * @returns true if any part of the area is visible
 */
export function isAreaInView(
	world: World,
	cameraEid: Entity,
	x: number,
	y: number,
	w: number,
	h: number,
): boolean {
	if (!hasComponent(world, cameraEid, Camera)) {
		return false;
	}

	const camX = Camera.x[cameraEid] as number;
	const camY = Camera.y[cameraEid] as number;
	const camW = Camera.width[cameraEid] as number;
	const camH = Camera.height[cameraEid] as number;

	// AABB overlap test
	return x < camX + camW && x + w > camX && y < camY + camH && y + h > camY;
}

// =============================================================================
// CAMERA UPDATE
// =============================================================================

/**
 * Updates camera to follow its target.
 * Called by the camera system each frame.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param deltaTime - Time elapsed in seconds
 */
export function updateCameraFollow(world: World, eid: Entity, deltaTime: number): void {
	if (!hasComponent(world, eid, Camera)) {
		return;
	}

	const targetEid = Camera.followTarget[eid] as number;
	if (targetEid === NULL_ENTITY) {
		return;
	}

	// Target must have Position component
	if (!hasPosition(world, targetEid)) {
		return;
	}

	const targetX = Position.x[targetEid] as number;
	const targetY = Position.y[targetEid] as number;

	const camWidth = Camera.width[eid] as number;
	const camHeight = Camera.height[eid] as number;
	const smoothing = Camera.smoothing[eid] as number;
	const deadZoneX = Camera.deadZoneX[eid] as number;
	const deadZoneY = Camera.deadZoneY[eid] as number;

	// Calculate desired camera position (centered on target)
	const desiredX = targetX - camWidth / 2;
	const desiredY = targetY - camHeight / 2;

	const currentX = Camera.x[eid] as number;
	const currentY = Camera.y[eid] as number;

	// Apply dead zone
	let newX = currentX;
	let newY = currentY;

	const centerX = currentX + camWidth / 2;
	const centerY = currentY + camHeight / 2;
	const diffX = targetX - centerX;
	const diffY = targetY - centerY;

	// Only move if target is outside dead zone
	if (Math.abs(diffX) > deadZoneX) {
		const targetCamX = diffX > 0 ? desiredX + deadZoneX : desiredX - deadZoneX;
		newX = applySmoothing(currentX, targetCamX, smoothing, deltaTime);
	}

	if (Math.abs(diffY) > deadZoneY) {
		const targetCamY = diffY > 0 ? desiredY + deadZoneY : desiredY - deadZoneY;
		newY = applySmoothing(currentY, targetCamY, smoothing, deltaTime);
	}

	Camera.x[eid] = newX;
	Camera.y[eid] = newY;

	// Apply bounds
	if ((Camera.bounded[eid] as number) === 1) {
		clampCameraToBounds(eid);
	}
}

/**
 * Applies smoothing to camera movement.
 */
function applySmoothing(
	current: number,
	target: number,
	smoothing: number,
	deltaTime: number,
): number {
	if (smoothing <= 0) {
		return target;
	}

	// Exponential smoothing
	const factor = 1 - smoothing ** (deltaTime * 10);
	return current + (target - current) * factor;
}

/**
 * Centers the camera on a specific world position.
 *
 * @param world - The ECS world
 * @param eid - The camera entity ID
 * @param worldX - World X to center on
 * @param worldY - World Y to center on
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { centerCameraOn } from 'blecsd';
 *
 * // Center camera on player
 * centerCameraOn(world, camera, player.x, player.y);
 * ```
 */
export function centerCameraOn(world: World, eid: Entity, worldX: number, worldY: number): Entity {
	if (!hasComponent(world, eid, Camera)) {
		return eid;
	}

	const width = Camera.width[eid] as number;
	const height = Camera.height[eid] as number;

	Camera.x[eid] = worldX - width / 2;
	Camera.y[eid] = worldY - height / 2;

	if ((Camera.bounded[eid] as number) === 1) {
		clampCameraToBounds(eid);
	}

	return eid;
}
