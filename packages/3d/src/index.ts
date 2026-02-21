/**
 * 3D rendering subsystem for blECSd.
 *
 * Provides a complete 3D pipeline: math, rasterization, ECS components/systems,
 * renderer backends, and mesh loading/primitives.
 *
 * @module 3d
 */

// Renderer backends (braille, halfblock, sextant, sixel, kitty)
export * from './backends';
// ECS components (Transform3D, Camera3D, Material3D, Mesh, Viewport3D, Animation3D)
export * from './components';
// Mesh loaders (OBJ)
export * from './loaders';
// Math (vectors, matrices, projection, clipping)
export * from './math';
// Namespace objects for API discoverability
// Note: vec3 namespace excluded from top level (collides with vec3() function from math).
// Access it via: import { vec3 } from '@blecsd/3d/namespaces'
export {
	type BackendsModule,
	backends,
	type Camera3dModule,
	type ClippingModule,
	camera3d,
	clipping,
	type Mat4Module,
	type MeshModule,
	mat4,
	mesh,
	type PixelBufferModule,
	type ProjectionModule,
	pixelBuffer,
	projection,
	type RasterModule,
	raster,
	type Transform3dModule,
	transform3d,
	type Vec3Module,
} from './namespaces';
// Rasterizer (pixel buffer, line/triangle drawing, shading)
export * from './rasterizer';
// Zod schemas (for advanced users and validation)
export * from './schemas';
// Mesh stores and primitives (cube, sphere, plane, cylinder)
export * from './stores';
// ECS systems (scene graph, projection, raster, viewport output, animation)
export * from './systems';
// Viewport3D widget
export * from './widgets/viewport3d';
