/**
 * Camera component namespace.
 *
 * Provides all operations for camera positioning, following, and coordinate transforms.
 *
 * @example
 * ```typescript
 * import { camera } from 'blecsd/components';
 * camera.set(world, eid, { x: 0, y: 0, viewportWidth: 80, viewportHeight: 24 });
 * camera.centerOn(world, eid, targetEid);
 * const pos = camera.worldToScreen(world, eid, worldX, worldY);
 * ```
 */
import {
	centerCameraOn,
	clearCameraBounds,
	getCamera,
	getCameraPosition,
	getCameraTarget,
	hasCamera,
	isAreaInView,
	isCameraBounded,
	isFollowingTarget,
	isInView,
	moveCameraBy,
	removeCamera,
	screenToWorld,
	setCamera,
	setCameraBounds,
	setCameraDeadZone,
	setCameraPosition,
	setCameraTarget,
	updateCameraFollow,
	worldToScreen,
} from '../camera';

export const camera = Object.freeze({
	get: getCamera,
	has: hasCamera,
	set: setCamera,
	remove: removeCamera,

	getPosition: getCameraPosition,
	setPosition: setCameraPosition,
	moveBy: moveCameraBy,
	centerOn: centerCameraOn,

	getTarget: getCameraTarget,
	setTarget: setCameraTarget,
	isFollowing: isFollowingTarget,
	updateFollow: updateCameraFollow,
	setDeadZone: setCameraDeadZone,

	setBounds: setCameraBounds,
	clearBounds: clearCameraBounds,
	isBounded: isCameraBounded,

	isInView,
	isAreaInView,
	worldToScreen,
	screenToWorld,
});

export type CameraModule = typeof camera;
