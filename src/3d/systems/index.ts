/**
 * 3D ECS systems for the rendering pipeline.
 *
 * Pipeline order:
 * 1. sceneGraphSystem - Computes world matrices from Transform3D + Hierarchy
 * 2. projectionSystem - Projects mesh vertices to 2D screen coordinates
 * 3. rasterSystem - Draws wireframe/filled geometry to PixelFramebuffer
 * 4. viewportOutputSystem - Encodes framebuffer via backend for terminal output
 *
 * @module 3d/systems
 */

export { animation3DSystem } from './animation3dSystem';
export { sceneGraphSystem } from './sceneGraphSystem';
export {
	type MeshProjection,
	type ProjectedVertex,
	type ViewportProjection,
	clearProjectionStore,
	projectionStore,
	projectionSystem,
} from './projectionSystem';
export {
	clearFramebufferStore,
	framebufferStore,
	rasterSystem,
} from './rasterSystem';
export {
	type ViewportOutput,
	backendStore,
	clearBackendStore,
	clearOutputStore,
	outputStore,
	viewportOutputSystem,
} from './viewportOutputSystem';
export { mouseInteraction3DSystem } from './mouseInteraction3dSystem';
