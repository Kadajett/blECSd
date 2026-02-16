/**
 * Transform3D component operations namespace.
 *
 * @example
 * ```typescript
 * import { transform3d } from '@blecsd/3d';
 *
 * transform3d.set(world, eid, { tx: 0, ty: 0, tz: -5, rx: 0, ry: Math.PI / 4, rz: 0 });
 * transform3d.setTranslation(world, eid, 10, 0, -5);
 * const matrix = transform3d.getWorldMatrix(eid);
 * ```
 */

import type { Entity, World } from 'blecsd/core';
import {
	getTransform3D,
	getWorldMatrix,
	isDirty,
	markDirty,
	setRotation,
	setScale,
	setTransform3D,
	setTranslation,
	Transform3D,
	type Transform3DData,
} from '../components/transform3d';
import type { Transform3DConfig } from '../schemas/components';

export const transform3d = Object.freeze({
	component: Transform3D,
	set: setTransform3D,
	get: getTransform3D,
	setTranslation,
	setRotation,
	setScale,
	getWorldMatrix,
	markDirty,
	isDirty,
});

export type Transform3dModule = typeof transform3d;
export type { Entity, World, Transform3DConfig, Transform3DData };
