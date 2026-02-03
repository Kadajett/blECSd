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
	xtoviewangle,
	yslope,
	zlight,
} from '../math/tables.js';
import type { RenderState, Visplane } from './defs.js';
import { VP_UNUSED } from './defs.js';
import { drawColumn } from './drawColumn.js';
import { getFlat, getWallTexture } from './textures.js';

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
 * Check a visplane for column overlap and split if necessary.
 * Matches R_CheckPlane from r_bsp.c: if the visplane already has
 * column data in the range [start, stop], create a new visplane
 * for the non-overlapping portion.
 *
 * @param rs - Render state
 * @param plane - Visplane to check
 * @param start - Start screen X
 * @param stop - End screen X
 * @returns The visplane to use (may be a new one)
 */
export function checkPlane(
	rs: RenderState,
	plane: Visplane,
	start: number,
	stop: number,
): Visplane {
	// Compute intersection and union ranges (matching R_CheckPlane from r_bsp.c)
	let intrl: number;
	let unionl: number;
	if (start < plane.minx) {
		intrl = plane.minx;
		unionl = start;
	} else {
		unionl = plane.minx;
		intrl = start;
	}

	let intrh: number;
	let unionh: number;
	if (stop > plane.maxx) {
		intrh = plane.maxx;
		unionh = stop;
	} else {
		unionh = plane.maxx;
		intrh = stop;
	}

	// Check for actual column overlap in the intersection range
	let hasOverlap = false;
	for (let x = intrl; x <= intrh; x++) {
		if (plane.top[x] !== VP_UNUSED) {
			hasOverlap = true;
			break;
		}
	}

	if (!hasOverlap) {
		// No overlap: extend the visplane to cover the union range and reuse it
		plane.minx = unionl;
		plane.maxx = unionh;
		return plane;
	}

	// Overlap found: create a new visplane with same properties
	const newPlane: Visplane = {
		height: plane.height,
		picnum: plane.picnum,
		lightLevel: plane.lightLevel,
		minx: start,
		maxx: stop,
		top: new Uint16Array(rs.screenWidth).fill(VP_UNUSED),
		bottom: new Uint16Array(rs.screenWidth).fill(0),
	};
	rs.visplanes.push(newPlane);
	return newPlane;
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
 * Matches Doom's R_MapPlane / R_DrawSpan approach:
 * for each row, compute distance and texture step, then draw the span.
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

	// Per-frame view angle trig
	const viewAngleFine = (rs.viewangle >> ANGLETOFINESHIFT) & FINEMASK;
	const viewcos = finecosine[viewAngleFine] ?? FRACUNIT;
	const viewsin = finesine[viewAngleFine] ?? 0;

	// Column-based span extraction matching Doom's R_MakeSpans.
	// Tracks previous column top/bottom and only processes delta rows.
	// O(columns + total_span_boundary_changes) instead of O(width * height).

	// Per-row span tracking: spanStart[y] = starting x of current span (-1 if none)
	const spanStart = new Int16Array(rs.screenHeight);
	spanStart.fill(-1);

	let prevTop = rs.screenHeight;
	let prevBottom = -1;

	// Process columns left-to-right, plus one sentinel column to flush
	for (let x = plane.minx; x <= plane.maxx + 1; x++) {
		let curTop: number;
		let curBottom: number;

		if (x <= plane.maxx) {
			const t = plane.top[x];
			const b = plane.bottom[x];
			if (t === undefined || b === undefined || t === VP_UNUSED) {
				curTop = rs.screenHeight;
				curBottom = -1;
			} else {
				curTop = t;
				curBottom = b;
			}
		} else {
			// Sentinel: force all open spans to close
			curTop = rs.screenHeight;
			curBottom = -1;
		}

		// Only process rows in the union of previous and current ranges.
		// Rows that were in prev but not cur need spans closed.
		// Rows that are in cur but not prev need spans opened.
		// Rows in both continue unchanged.

		// Close spans for rows that were covered by prev but not by cur
		// (rows in prevTop..prevBottom that are outside curTop..curBottom)
		if (prevBottom >= prevTop) {
			// Rows above current range
			const closeAboveEnd = Math.min(prevBottom, curTop > 0 ? curTop - 1 : -1);
			for (let y = prevTop; y <= closeAboveEnd; y++) {
				if (spanStart[y] !== -1) {
					drawFlatSpan(rs, plane, flat, planeheight, lightTable, y, spanStart[y]!, x - 1);
					spanStart[y] = -1;
				}
			}
			// Rows below current range
			const closeBelowStart = Math.max(prevTop, curBottom < rs.screenHeight - 1 ? curBottom + 1 : rs.screenHeight);
			for (let y = closeBelowStart; y <= prevBottom; y++) {
				if (spanStart[y] !== -1) {
					drawFlatSpan(rs, plane, flat, planeheight, lightTable, y, spanStart[y]!, x - 1);
					spanStart[y] = -1;
				}
			}
		}

		// Open spans for rows that are covered by cur but not by prev
		if (curBottom >= curTop) {
			// Rows above previous range
			const openAboveEnd = Math.min(curBottom, prevTop > 0 ? prevTop - 1 : -1);
			for (let y = curTop; y <= openAboveEnd; y++) {
				spanStart[y] = x;
			}
			// Rows below previous range
			const openBelowStart = Math.max(curTop, prevBottom < rs.screenHeight - 1 ? prevBottom + 1 : rs.screenHeight);
			for (let y = openBelowStart; y <= curBottom; y++) {
				spanStart[y] = x;
			}
		}

		prevTop = curTop;
		prevBottom = curBottom;
	}
}

/**
 * Draw a single horizontal span of a flat texture.
 * Computes texture mapping for the span at the given row and draws it.
 */
function drawFlatSpan(
	rs: RenderState,
	plane: Visplane,
	flat: { pixels: Uint8Array },
	planeheight: number,
	lightTable: Int32Array | undefined,
	y: number,
	x1: number,
	x2: number,
): void {
	const ys = yslope[y];
	if (ys === undefined) return;
	const distance = fixedMul(planeheight, ys);

	const xstep = fixedMul(distance, basexscale);
	const ystep = fixedMul(distance, baseyscale);

	const startAngle = ((rs.viewangle + (xtoviewangle[x1] ?? 0)) >>> 0);
	const startAngleFine = (startAngle >> ANGLETOFINESHIFT) & FINEMASK;
	const startLength = fixedMul(distance, distscale[x1] ?? FRACUNIT);

	let xfrac = rs.viewx + fixedMul(finecosine[startAngleFine] ?? FRACUNIT, startLength);
	let yfrac = -rs.viewy + fixedMul(finesine[startAngleFine] ?? 0, startLength);

	const zIdx = Math.min(MAXLIGHTZ - 1, Math.max(0, distance >> LIGHTZSHIFT));
	const colormapIdx = rs.fixedcolormap ?? (lightTable?.[zIdx] ?? 0);
	const cmap = rs.colormap[colormapIdx];

	for (let x = x1; x <= x2; x++) {
		const tx = ((xfrac >> FRACBITS) & 63);
		const ty = ((yfrac >> FRACBITS) & 63);
		const paletteIdx = flat.pixels[ty * 64 + tx] ?? 0;

		const shadedIdx = cmap ? (cmap[paletteIdx] ?? paletteIdx) : paletteIdx;
		const color = rs.palette[shadedIdx];
		if (color) {
			three.setPixelUnsafe(rs.fb, x, y, color.r, color.g, color.b, 255);
		}

		xfrac += xstep;
		yfrac += ystep;
	}
}

/**
 * Draw a sky visplane using the SKY1 wall texture.
 * Matches Doom's R_DrawSkyColumn: the texture column is derived from
 * the view angle so the sky appears as a 360-degree panorama.
 */
function drawSkyPlane(rs: RenderState, plane: Visplane): void {
	const skyTex = getWallTexture(rs.textures, 'SKY1');
	if (!skyTex) {
		drawSkyGradient(rs, plane);
		return;
	}

	for (let x = plane.minx; x <= plane.maxx; x++) {
		const top = plane.top[x];
		const bottom = plane.bottom[x];
		if (top === undefined || bottom === undefined || top === VP_UNUSED) continue;

		// Compute sky texture column from view angle + screen column angle.
		// Matches original Doom: the fine angle index is used directly as the
		// texture column, which tiles the sky texture every 256 fine angles
		// for a 256-wide sky texture (~11 degrees per repetition).
		const viewAngle = xtoviewangle[x] ?? 0;
		const skyAngle = ((rs.viewangle + viewAngle) >>> 0);
		const fineAngle = (skyAngle >> ANGLETOFINESHIFT) & FINEMASK;
		const col = ((fineAngle % skyTex.width) + skyTex.width) % skyTex.width;
		const column = skyTex.columns[col];
		if (!column) continue;

		for (let y = top; y <= bottom; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;
			// Map screen Y to texture Y (sky is drawn without perspective)
			const texY = y % skyTex.height;
			const paletteIdx = column[texY] ?? 0;
			drawColumn(rs, x, y, paletteIdx, 0); // colormap 0 = fullbright
		}
	}
}

/**
 * Fallback sky gradient when SKY1 texture is not found.
 */
function drawSkyGradient(rs: RenderState, plane: Visplane): void {
	for (let x = plane.minx; x <= plane.maxx; x++) {
		const top = plane.top[x];
		const bottom = plane.bottom[x];
		if (top === undefined || bottom === undefined || top === VP_UNUSED) continue;

		for (let y = top; y <= bottom; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;
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
