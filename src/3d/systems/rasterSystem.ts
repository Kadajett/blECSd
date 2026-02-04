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

/** Material rendering settings */
interface MaterialSettings {
	renderMode: number;
	wireColor: number;
	fillColor: number;
	backfaceCull: boolean;
}

/** Get material settings for a mesh entity */
function getMaterialSettings(world: World, meshEid: Entity): MaterialSettings {
	if (!hasComponent(world, meshEid, Material3D)) {
		return { renderMode: 0, wireColor: 0xffffff, fillColor: 0x808080, backfaceCull: true };
	}
	return {
		renderMode: Material3D.renderMode[meshEid] as number,
		wireColor: Material3D.wireColor[meshEid] as number,
		fillColor: Material3D.fillColor[meshEid] as number,
		backfaceCull: (Material3D.backfaceCull[meshEid] as number) !== 0,
	};
}

/** Projected vertex type from projection store */
interface ProjectedVert {
	readonly x: number;
	readonly y: number;
	readonly depth: number;
}

/** Check if triangle is front-facing (for backface culling) */
function isFrontFacing(v0: ProjectedVert, v1: ProjectedVert, v2: ProjectedVert): boolean {
	const cross = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
	return cross > 0;
}

/** Fill a single triangle */
function fillSingleTriangle(
	fb: PixelFramebuffer,
	v0: ProjectedVert,
	v1: ProjectedVert,
	v2: ProjectedVert,
	color: { r: number; g: number; b: number; a: number },
): void {
	fillTriangleFlat(
		fb,
		{ x: v0.x, y: v0.y, depth: v0.depth, r: color.r, g: color.g, b: color.b, a: color.a },
		{ x: v1.x, y: v1.y, depth: v1.depth, r: color.r, g: color.g, b: color.b, a: color.a },
		{ x: v2.x, y: v2.y, depth: v2.depth, r: color.r, g: color.g, b: color.b, a: color.a },
		color,
	);
}

/** Draw filled triangles for a mesh */
function drawFilledTriangles(
	fb: PixelFramebuffer,
	verts: ReadonlyArray<ProjectedVert>,
	indices: Uint32Array,
	fillColor: number,
	backfaceCull: boolean,
): void {
	const color = unpackColor(fillColor);

	for (let t = 0; t < indices.length; t += 3) {
		const v0 = verts[indices[t] as number];
		const v1 = verts[indices[t + 1] as number];
		const v2 = verts[indices[t + 2] as number];
		if (!v0 || !v1 || !v2) continue;

		if (backfaceCull && !isFrontFacing(v0, v1, v2)) continue;

		fillSingleTriangle(fb, v0, v1, v2, color);
	}
}

/** Draw wireframe edges for a mesh */
function drawWireframeEdges(
	fb: PixelFramebuffer,
	verts: ReadonlyArray<ProjectedVert>,
	indices: Uint32Array,
	wireColor: number,
): void {
	const color = unpackColor(wireColor);
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
/** Render a single mesh to the framebuffer */
function renderMesh(
	world: World,
	fb: PixelFramebuffer,
	meshEid: Entity,
	verts: ReadonlyArray<ProjectedVert>,
	indices: Uint32Array,
): void {
	const mat = getMaterialSettings(world, meshEid);
	const isFilled = mat.renderMode === 1 || mat.renderMode === 2;
	const isWireframe = mat.renderMode === 0 || mat.renderMode === 2;

	if (isFilled) {
		drawFilledTriangles(fb, verts, indices, mat.fillColor, mat.backfaceCull);
	}
	if (isWireframe) {
		drawWireframeEdges(fb, verts, indices, mat.wireColor);
	}
}

/** Process a single viewport */
function processViewport(world: World, vpEid: Entity): void {
	const projection = projectionStore.get(vpEid);
	if (!projection) return;

	const pixelW = projection.pixelWidth;
	const pixelH = projection.pixelHeight;
	if (pixelW <= 0 || pixelH <= 0) return;

	const fb = getOrCreateFramebuffer(vpEid, pixelW, pixelH);
	clearFramebuffer(fb);

	for (const meshProj of projection.meshes) {
		renderMesh(world, fb, meshProj.meshEid, meshProj.projectedVertices, meshProj.triangleIndices);
	}
}

export const rasterSystem: System = (world: World): World => {
	const viewports = query(world, [Viewport3D]) as Entity[];

	for (const vpEid of viewports) {
		processViewport(world, vpEid);
	}

	return world;
};
