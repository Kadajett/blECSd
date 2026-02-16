/**
 * Camera system namespace.
 *
 * @example
 * ```typescript
 * import { cameraSys } from 'blecsd/systems';
 * const world = createWorld();
 * cameraSys.register(world);
 * cameraSys.update(world);
 * const cameras = cameraSys.query(world);
 * ```
 */
import {
	cameraSystem,
	createCameraSystem,
	queryCameras,
	registerCameraSystem,
	updateCameras,
} from '../cameraSystem';

export const cameraSys = Object.freeze({
	create: createCameraSystem,
	register: registerCameraSystem,
	system: cameraSystem,
	query: queryCameras,
	update: updateCameras,
});

export type CameraSysModule = typeof cameraSys;
