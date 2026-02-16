/**
 * Rasterization namespace with sub-namespaces for different primitives.
 *
 * @example
 * ```typescript
 * import { raster } from '@blecsd/3d';
 *
 * // Draw lines
 * raster.line.draw(fb, { x: 0, y: 0, depth: 0 }, { x: 100, y: 50, depth: 0 });
 * raster.line.drawAA(fb, 0, 0, 100, 50, 255, 255, 255, 255);
 *
 * // Draw triangles
 * raster.triangle.fill(fb, v0, v1, v2);
 * raster.triangle.fillFlat(fb, v0, v1, v2, color);
 *
 * // Compute shading
 * const color = raster.shading.computeFlat(normal, light, ambient, baseColor);
 * ```
 */

import type { Vec3 } from '../math/vec3';
import { drawLine, drawLineColor, drawLineDepth } from '../rasterizer/line';
import { blendPixel, drawLineAA } from '../rasterizer/lineAA';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import { computeFaceNormal, computeFlatShading, shadeFace } from '../rasterizer/shading';
import {
	fillTriangle,
	fillTriangleFlat,
	type TriangleBBox,
	triangleArea2,
	triangleBoundingBox,
} from '../rasterizer/triangle';
import type {
	AmbientLight,
	DirectionalLight,
	LineEndpoint,
	RGBAColor,
	TriangleVertex,
} from '../schemas/rasterizer';

export const raster = Object.freeze({
	line: Object.freeze({
		draw: drawLine,
		drawColor: drawLineColor,
		drawDepth: drawLineDepth,
		drawAA: drawLineAA,
		blendPixel,
	}),

	triangle: Object.freeze({
		fill: fillTriangle,
		fillFlat: fillTriangleFlat,
		area2: triangleArea2,
		boundingBox: triangleBoundingBox,
	}),

	shading: Object.freeze({
		computeFaceNormal,
		computeFlat: computeFlatShading,
		shadeFace,
	}),
});

export type RasterModule = typeof raster;
export type {
	Vec3,
	LineEndpoint,
	TriangleVertex,
	TriangleBBox,
	RGBAColor,
	DirectionalLight,
	AmbientLight,
	PixelFramebuffer,
};
