/**
 * 3D ECS components.
 *
 * SoA (Structure-of-Arrays) components for 3D scene management.
 * Each component stores data in flat typed arrays indexed by entity ID.
 *
 * @module 3d/components
 */

export type { Animation3DData } from './animation3d';
export {
	Animation3D,
	getAnimation3D,
	setAnimation3D,
} from './animation3d';
export type { Camera3DData } from './camera3d';
export {
	Camera3D,
	getCamera3D,
	getProjMatrix,
	getViewMatrix,
	setCamera3D,
} from './camera3d';
export type { Material3DData } from './material';
export {
	getMaterial3D,
	Material3D,
	setMaterial3D,
} from './material';
export type { MeshData } from './mesh';
export {
	clearMeshStore,
	createMeshFromArrays,
	getMesh,
	getMeshCount,
	getMeshData,
	Mesh,
	registerMesh,
	setMesh,
	unregisterMesh,
} from './mesh';
export type { MouseDragInput, MouseInteraction3DData } from './mouseInteraction3d';
export {
	clearMouseInputStore,
	disableMouseInteraction,
	enableMouseInteraction,
	feedMouseDrag,
	feedMouseScroll,
	getMouseInteraction3D,
	MouseInteraction3D,
	mouseInputStore,
} from './mouseInteraction3d';
export type { Transform3DData } from './transform3d';
export {
	getTransform3D,
	getWorldMatrix,
	isDirty,
	markDirty,
	setRotation,
	setScale,
	setTransform3D,
	setTranslation,
	Transform3D,
} from './transform3d';

export type { Viewport3DData } from './viewport3d';
export {
	getViewport3D,
	setViewport3D,
	Viewport3D,
} from './viewport3d';
