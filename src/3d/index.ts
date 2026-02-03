/**
 * 3D rendering subsystem for blECSd.
 *
 * Provides a complete 3D pipeline: math, rasterization, ECS components/systems,
 * renderer backends, and mesh loading/primitives.
 *
 * @module 3d
 */

// Math (vectors, matrices, projection, clipping)
export * from './math';

// Rasterizer (pixel buffer, line/triangle drawing, shading)
export * from './rasterizer';

// Renderer backends (braille, halfblock, sextant, sixel, kitty)
export * from './backends';

// ECS components (Transform3D, Camera3D, Material3D, Mesh, Viewport3D, Animation3D)
export * from './components';

// ECS systems (scene graph, projection, raster, viewport output, animation)
export * from './systems';

// Mesh stores and primitives (cube, sphere, plane, cylinder)
export * from './stores';

// Mesh loaders (OBJ)
export * from './loaders';

// Zod schemas (for advanced users and validation)
export * from './schemas';
