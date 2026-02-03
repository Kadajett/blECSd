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

export type { MouseInteraction3DData, MouseDragInput } from './mouseInteraction3d';
export {
	MouseInteraction3D,
	clearMouseInputStore,
	disableMouseInteraction,
	enableMouseInteraction,
	feedMouseDrag,
	feedMouseScroll,
	getMouseInteraction3D,
	mouseInputStore,
} from './mouseInteraction3d';

export type { Transform3DData } from './transform3d';
export {
	Transform3D,
	getTransform3D,
	getWorldMatrix,
	isDirty,
	markDirty,
	setRotation,
	setScale,
	setTransform3D,
	setTranslation,
} from './transform3d';

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
	Material3D,
	getMaterial3D,
	setMaterial3D,
} from './material';

export type { MeshData } from './mesh';
export {
	Mesh,
	clearMeshStore,
	createMeshFromArrays,
	getMesh,
	getMeshCount,
	getMeshData,
	registerMesh,
	setMesh,
	unregisterMesh,
} from './mesh';

export type { Viewport3DData } from './viewport3d';
export {
	Viewport3D,
	getViewport3D,
	setViewport3D,
} from './viewport3d';
