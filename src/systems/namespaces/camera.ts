/**
 * Camera system namespace.
 *
 * @example
 * ```typescript
 * import { camera } from 'blecsd/systems';
 * const world = createWorld();
 * camera.register(world);
 * camera.update(world);
 * const cameras = camera.query(world);
 * ```
 */
import {
	cameraSystem,
	createCameraSystem,
	queryCameras,
	registerCameraSystem,
	updateCameras,
} from '../cameraSystem';

export const camera = Object.freeze({
	create: createCameraSystem,
	register: registerCameraSystem,
	system: cameraSystem,
	query: queryCameras,
	update: updateCameras,
});

export type CameraSystemModule = typeof camera;
