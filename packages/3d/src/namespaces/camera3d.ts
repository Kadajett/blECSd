/**
 * Camera3D component operations namespace.
 *
 * @example
 * ```typescript
 * import { camera3d } from '@blecsd/3d';
 *
 * camera3d.set(world, eid, { fov: Math.PI / 3, near: 0.1, far: 100, aspect: 16/9 });
 * const data = camera3d.get(world, eid);
 * const projMatrix = camera3d.getProjMatrix(eid);
 * ```
 */

import type { Entity, World } from 'blecsd/core';
import {
	Camera3D,
	type Camera3DData,
	getCamera3D,
	getProjMatrix,
	getViewMatrix,
	setCamera3D,
} from '../components/camera3d';
import type { Camera3DConfig } from '../schemas/components';

export const camera3d = Object.freeze({
	component: Camera3D,
	set: setCamera3D,
	get: getCamera3D,
	getProjMatrix,
	getViewMatrix,
});

export type Camera3dModule = typeof camera3d;
export type { Entity, World, Camera3DConfig, Camera3DData };
