/**
 * Pixel rasterizer for 3D rendering.
 *
 * Provides an RGBA pixel framebuffer and rasterization primitives
 * (line drawing, triangle fill) that write to it.
 *
 * @module 3d/rasterizer
 */

export { drawLine, drawLineColor, drawLineDepth } from './line';
export { blendPixel, drawLineAA } from './lineAA';
export type { PixelFramebuffer } from './pixelBuffer';
export {
	clearFramebuffer,
	createPixelFramebuffer,
	fillRect,
	getDepth,
	getPixel,
	isInBounds,
	setPixel,
	setPixelUnsafe,
	testAndSetDepth,
} from './pixelBuffer';
export { computeFaceNormal, computeFlatShading, shadeFace } from './shading';
export type { TriangleBBox } from './triangle';
export { fillTriangle, fillTriangleFlat, triangleArea2, triangleBoundingBox } from './triangle';
