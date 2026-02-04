/**
 * Raster system: draws wireframe edges and/or filled triangles to a PixelFramebuffer.
 *
 * Reads projected vertex data from projectionStore and Material settings to
 * determine rendering mode (wireframe, filled, or both). Produces a
 * PixelFramebuffer per viewport stored in framebufferStore.
 *
 * @module 3d/systems/rasterSystem
 */

import { hasComponent, query } from 'bitecs';
import type { Entity, System, World } from '../../core/types';
import { Material3D } from '../components/material';
import { Viewport3D } from '../components/viewport3d';
import { drawLineDepth } from '../rasterizer/line';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import { clearFramebuffer, createPixelFramebuffer } from '../rasterizer/pixelBuffer';
import { fillTriangleFlat } from '../rasterizer/triangle';
import { projectionStore } from './projectionSystem';

/**
 * Per-viewport framebuffer store. Created/resized as needed by the raster system.
 */
export const framebufferStore = new Map<number, PixelFramebuffer>();

/**
 * Clear the framebuffer store. Useful for testing.
 */
export function clearFramebufferStore(): void {
	framebufferStore.clear();
}

/**
 * Unpack a 24-bit RGB color (0xRRGGBB) to components. Alpha defaults to 255.
 */
function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
		a: 255,
	};
}

/**
 * Get or create a framebuffer for a viewport.
 */
function getOrCreateFramebuffer(vpEid: Entity, width: number, height: number): PixelFramebuffer {
	const existing = framebufferStore.get(vpEid);
	if (existing && existing.width === width && existing.height === height) {
		return existing;
	}
	const fb = createPixelFramebuffer({ width, height, enableDepthBuffer: true });
	framebufferStore.set(vpEid, fb);
	return fb;
}

/**
 * Extract unique edges from triangle indices.
 * Returns array of [vertexA, vertexB] pairs with no duplicates.
 */
function extractUniqueEdges(indices: Uint32Array): ReadonlyArray<readonly [number, number]> {
	const edgeSet = new Set<string>();
	const edges: Array<readonly [number, number]> = [];

	for (let i = 0; i < indices.length; i += 3) {
		const i0 = indices[i] as number;
		const i1 = indices[i + 1] as number;
		const i2 = indices[i + 2] as number;

		const pairs: Array<readonly [number, number]> = [
			[i0, i1],
			[i1, i2],
			[i2, i0],
		];
		for (const [a, b] of pairs) {
			const key = a < b ? `${a}_${b}` : `${b}_${a}`;
			if (!edgeSet.has(key)) {
				edgeSet.add(key);
				edges.push([a, b] as const);
			}
		}
	}

	return edges;
}

/**
 * Raster system. Draws wireframe and/or filled geometry to per-viewport framebuffers.
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { rasterSystem, framebufferStore } from 'blecsd/3d/systems';
 *
 * rasterSystem(world);
 * const fb = framebufferStore.get(viewportEid);
 * ```
 */
export const rasterSystem: System = (world: World): World => {
	const viewports = query(world, [Viewport3D]) as Entity[];

	for (const vpEid of viewports) {
		const projection = projectionStore.get(vpEid);
		if (!projection) continue;

		const pixelW = projection.pixelWidth;
		const pixelH = projection.pixelHeight;
		if (pixelW <= 0 || pixelH <= 0) continue;

		const fb = getOrCreateFramebuffer(vpEid, pixelW, pixelH);
		clearFramebuffer(fb);

		for (const meshProj of projection.meshes) {
			const meshEid = meshProj.meshEid;
			const verts = meshProj.projectedVertices;
			const indices = meshProj.triangleIndices;

			// Get material settings (defaults to wireframe if no material)
			let renderMode = 0; // 0 = wireframe
			let wireColor = 0xffffff; // white (24-bit RGB)
			let fillColor = 0x808080; // gray (24-bit RGB)
			let backfaceCull = true;

			if (hasComponent(world, meshEid, Material3D)) {
				renderMode = Material3D.renderMode[meshEid] as number;
				wireColor = Material3D.wireColor[meshEid] as number;
				fillColor = Material3D.fillColor[meshEid] as number;
				backfaceCull = (Material3D.backfaceCull[meshEid] as number) !== 0;
			}

			const isFilled = renderMode === 1 || renderMode === 2;
			const isWireframe = renderMode === 0 || renderMode === 2;

			// Filled triangles
			if (isFilled) {
				const fc = unpackColor(fillColor);
				const color = { r: fc.r, g: fc.g, b: fc.b, a: fc.a };

				for (let t = 0; t < indices.length; t += 3) {
					const i0 = indices[t] as number;
					const i1 = indices[t + 1] as number;
					const i2 = indices[t + 2] as number;

					const v0 = verts[i0];
					const v1 = verts[i1];
					const v2 = verts[i2];
					if (!v0 || !v1 || !v2) continue;

					// Backface culling using 2D cross product (screen-space winding)
					if (backfaceCull) {
						const cross = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
						if (cross <= 0) continue;
					}

					fillTriangleFlat(
						fb,
						{ x: v0.x, y: v0.y, depth: v0.depth, r: color.r, g: color.g, b: color.b, a: color.a },
						{ x: v1.x, y: v1.y, depth: v1.depth, r: color.r, g: color.g, b: color.b, a: color.a },
						{ x: v2.x, y: v2.y, depth: v2.depth, r: color.r, g: color.g, b: color.b, a: color.a },
						color,
					);
				}
			}

			// Wireframe edges
			if (isWireframe) {
				const wc = unpackColor(wireColor);
				const color = { r: wc.r, g: wc.g, b: wc.b, a: wc.a };
				const edges = extractUniqueEdges(indices);

				for (const [a, b] of edges) {
					const va = verts[a];
					const vb = verts[b];
					if (!va || !vb) continue;

					drawLineDepth(
						fb,
						{
							x: Math.round(va.x),
							y: Math.round(va.y),
							depth: va.depth,
							r: color.r,
							g: color.g,
							b: color.b,
							a: color.a,
						},
						{
							x: Math.round(vb.x),
							y: Math.round(vb.y),
							depth: vb.depth,
							r: color.r,
							g: color.g,
							b: color.b,
							a: color.a,
						},
					);
				}
			}
		}
	}

	return world;
};
