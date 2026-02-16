/**
 * Namespace objects for @blecsd/3d API discoverability.
 *
 * All namespaces use Object.freeze for immutability and provide
 * both the namespace object and its type for maximum flexibility.
 *
 * @module 3d/namespaces
 */

export { type BackendsModule, backends } from './backends';
export { type Camera3dModule, camera3d } from './camera3d';
export { type ClippingModule, clipping } from './clipping';
export { type Mat4Module, mat4 } from './mat4';
export { type MeshModule, mesh } from './mesh';
export { type PixelBufferModule, pixelBuffer } from './pixelBuffer';
export { type ProjectionModule, projection } from './projection';
export { type RasterModule, raster } from './raster';
export { type Transform3dModule, transform3d } from './transform3d';
export { type Vec3Module, vec3 } from './vec3';
