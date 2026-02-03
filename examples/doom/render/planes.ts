/**
 * Visplane rendering: floors and ceilings as horizontal spans.
 *
 * Visplanes are built during BSP traversal and rendered after all walls.
 * Each visplane stores per-column top/bottom extents, which are converted
 * to horizontal spans for texture mapping.
 *
 * @module render/planes
 */

import { three } from 'blecsd';
import {
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
	pointToAngle2,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import {
	LIGHTZSHIFT,
	MAXLIGHTZ,
	NUMCOLORMAPS,
	basexscale,
	baseyscale,
	centery,
	distscale,
	viewheight,
	viewwidth,
	yslope,
	zlight,
} from '../math/tables.js';
import type { RenderState, Visplane } from './defs.js';
import { VP_UNUSED } from './defs.js';
import { getFlat } from './textures.js';

// ─── Visplane Management ───────────────────────────────────────────

/**
 * Find or create a visplane matching the given parameters.
 * If an existing visplane matches and has no column overlap, reuse it.
 * Otherwise, create a new one.
 *
 * @param rs - Render state
 * @param height - Sector floor or ceiling height (fixed-point)
 * @param picnum - Flat texture name
 * @param lightLevel - Sector light level
 * @returns The visplane to use
 */
export function findPlane(
	rs: RenderState,
	height: number,
	picnum: string,
	lightLevel: number,
): Visplane {
	// Look for an existing plane with matching properties
	for (const plane of rs.visplanes) {
		if (plane.height === height && plane.picnum === picnum && plane.lightLevel === lightLevel) {
			return plane;
		}
	}

	// Create new visplane
	const plane: Visplane = {
		height,
		picnum,
		lightLevel,
		minx: rs.screenWidth,
		maxx: -1,
		top: new Uint16Array(rs.screenWidth).fill(VP_UNUSED),
		bottom: new Uint16Array(rs.screenWidth).fill(0),
	};

	rs.visplanes.push(plane);
	return plane;
}

/**
 * Set the column extent for a visplane at a given screen X.
 *
 * @param plane - Target visplane
 * @param x - Screen X column
 * @param top - Top screen Y
 * @param bottom - Bottom screen Y
 */
export function setPlaneColumn(
	plane: Visplane,
	x: number,
	top: number,
	bottom: number,
): void {
	if (top > bottom) return;

	plane.top[x] = top;
	plane.bottom[x] = bottom;
	if (x < plane.minx) plane.minx = x;
	if (x > plane.maxx) plane.maxx = x;
}

// ─── Visplane Rendering ────────────────────────────────────────────

/**
 * Render all visplanes (called after BSP traversal is complete).
 * Converts each visplane's column data into horizontal spans and
 * texture-maps them.
 *
 * @param rs - Render state
 */
export function drawPlanes(rs: RenderState): void {
	for (const plane of rs.visplanes) {
		if (plane.minx > plane.maxx) continue;

		// Sky special case
		if (plane.picnum === 'F_SKY1' || plane.picnum === '-') {
			drawSkyPlane(rs, plane);
			continue;
		}

		drawFloorCeilingPlane(rs, plane);
	}
}

/**
 * Draw a floor or ceiling visplane with texture mapping.
 */
function drawFloorCeilingPlane(rs: RenderState, plane: Visplane): void {
	const flat = getFlat(rs.textures, plane.picnum);
	if (!flat) {
		drawSolidPlane(rs, plane);
		return;
	}

	const planeheight = Math.abs(plane.height - rs.viewz);

	// Light level
	const lightIdx = Math.max(0, Math.min(15,
		(plane.lightLevel >> 4) + rs.extralight));
	const lightTable = zlight[lightIdx];

	// Compute base texture mapping scales based on current view angle
	const viewAngleFine = (rs.viewangle >> ANGLETOFINESHIFT) & FINEMASK;
	const viewcos = finecosine[viewAngleFine] ?? FRACUNIT;
	const viewsin = finesine[viewAngleFine] ?? 0;

	// Process each column, converting to horizontal spans
	for (let x = plane.minx; x <= plane.maxx; x++) {
		const top = plane.top[x];
		const bottom = plane.bottom[x];
		if (top === undefined || bottom === undefined || top === VP_UNUSED) continue;

		for (let y = top; y <= bottom; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;

			// Distance from camera to this floor row
			const dy = Math.abs(y - centery);
			if (dy === 0) continue;

			const ys = yslope[y];
			if (ys === undefined) continue;
			const distance = fixedMul(planeheight, ys);

			// Texture coordinates
			const ds = distscale[x];
			if (ds === undefined) continue;
			const length = fixedMul(distance, ds);

			const xAng = ((rs.viewangle + (x - viewwidth / 2) * (1 << ANGLETOFINESHIFT)) >>> 0);
			const angFine = (xAng >> ANGLETOFINESHIFT) & FINEMASK;
			const cosA = finecosine[angFine] ?? FRACUNIT;
			const sinA = finesine[angFine] ?? 0;

			const xfrac = rs.viewx + fixedMul(cosA, length);
			const yfrac = -rs.viewy - fixedMul(sinA, length);

			// Sample the flat texture (64x64)
			const tx = ((xfrac >> FRACBITS) & 63);
			const ty = ((yfrac >> FRACBITS) & 63);
			const paletteIdx = flat.pixels[ty * 64 + tx] ?? 0;

			// Light level based on distance
			const zIdx = Math.min(MAXLIGHTZ - 1, Math.max(0, distance >> LIGHTZSHIFT));
			const colormapIdx = rs.fixedcolormap ?? (lightTable?.[zIdx] ?? 0);

			// Apply colormap and palette
			const cmap = rs.colormap[colormapIdx];
			const shadedIdx = cmap ? (cmap[paletteIdx] ?? paletteIdx) : paletteIdx;
			const color = rs.palette[shadedIdx];
			if (!color) continue;

			three.setPixelUnsafe(rs.fb, x, y, color.r, color.g, color.b, 255);
		}
	}
}

/**
 * Draw a sky visplane (vertical gradient or solid color).
 */
function drawSkyPlane(rs: RenderState, plane: Visplane): void {
	for (let x = plane.minx; x <= plane.maxx; x++) {
		const top = plane.top[x];
		const bottom = plane.bottom[x];
		if (top === undefined || bottom === undefined || top === VP_UNUSED) continue;

		for (let y = top; y <= bottom; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;
			// Simple sky gradient: dark blue at top, lighter toward horizon
			const t = y / rs.screenHeight;
			const r = Math.round(20 + t * 40);
			const g = Math.round(30 + t * 50);
			const b = Math.round(80 + t * 120);
			three.setPixelUnsafe(rs.fb, x, y, r, g, b, 255);
		}
	}
}

/**
 * Draw a solid-colored plane (fallback when flat texture is missing).
 */
function drawSolidPlane(rs: RenderState, plane: Visplane): void {
	// Dark gray for missing flats
	for (let x = plane.minx; x <= plane.maxx; x++) {
		const top = plane.top[x];
		const bottom = plane.bottom[x];
		if (top === undefined || bottom === undefined || top === VP_UNUSED) continue;

		for (let y = top; y <= bottom; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;
			three.setPixelUnsafe(rs.fb, x, y, 40, 40, 40, 255);
		}
	}
}
