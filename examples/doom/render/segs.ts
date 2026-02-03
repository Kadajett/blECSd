/**
 * Wall segment (seg) rendering: projection, clipping, and column drawing.
 *
 * This is the core of Doom's wall renderer. Each seg is projected to screen
 * columns, clipped against the solidsegs occlusion list, and rendered via
 * R_DrawColumn.
 *
 * @module render/segs
 */

import {
	ANG90,
	ANG180,
	ANGLETOFINESHIFT,
	FINEANGLES,
	FINEMASK,
	finecosine,
	finesine,
	pointToAngle2,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedDiv, fixedMul } from '../math/fixed.js';
import {
	LIGHTSEGSHIFT,
	LIGHTLEVELS,
	MAXLIGHTSCALE,
	NUMCOLORMAPS,
	centerx,
	centery,
	projection,
	scalelight,
	viewangletox,
	viewwidth,
} from '../math/tables.js';
import { LinedefFlags, type MapSeg } from '../wad/types.js';
import type { ClipRange, RenderState } from './defs.js';
import { drawColumn } from './drawColumn.js';
import { findPlane } from './planes.js';
import { getWallTexture, type CompositeTexture } from './textures.js';

// ─── Seg Processing Entry Point ────────────────────────────────────

/**
 * Process a single seg: project to screen, clip, and render.
 *
 * @param rs - Render state
 * @param seg - Map segment to render
 * @param subsectorIndex - Index of the containing subsector
 */
export function addLine(rs: RenderState, seg: MapSeg, subsectorIndex: number): void {
	const v1 = rs.map.vertexes[seg.v1];
	const v2 = rs.map.vertexes[seg.v2];
	if (!v1 || !v2) return;

	// Convert to fixed-point
	const v1x = v1.x << FRACBITS;
	const v1y = v1.y << FRACBITS;
	const v2x = v2.x << FRACBITS;
	const v2y = v2.y << FRACBITS;

	// Compute angles from viewer to seg endpoints
	const angle1 = pointToAngle2(rs.viewx, rs.viewy, v1x, v1y);
	const angle2 = pointToAngle2(rs.viewx, rs.viewy, v2x, v2y);

	// Check if the seg faces the viewer (backface culling)
	const span = ((angle1 - angle2) >>> 0);
	if (span >= ANG180) return; // seg faces away

	// Transform angles to view-relative
	const rw_angle1 = angle1;
	let tspan1 = ((angle1 - rs.viewangle + ANG90) >>> 0);
	let tspan2 = ((angle2 - rs.viewangle + ANG90) >>> 0);

	// Clip to FOV
	if (tspan1 > ANG180) {
		// Left endpoint is behind viewer or in left peripheral
		tspan1 = 0;
	}
	if (tspan2 > ANG180) {
		tspan2 = ANG180;
	}

	// Convert to screen X using the viewangletox table
	const fineIdx1 = (tspan1 >> ANGLETOFINESHIFT) & 0xfff;
	const fineIdx2 = (tspan2 >> ANGLETOFINESHIFT) & 0xfff;

	let x1 = viewangletox[fineIdx1] ?? 0;
	let x2 = (viewangletox[fineIdx2] ?? viewwidth) - 1;

	if (x1 > x2) return;
	if (x2 < 0 || x1 >= rs.screenWidth) return;

	// Clamp to screen
	if (x1 < 0) x1 = 0;
	if (x2 >= rs.screenWidth) x2 = rs.screenWidth - 1;

	// Get linedef and sidedefs
	const linedef = rs.map.linedefs[seg.linedef];
	if (!linedef) return;

	const sidedefIndex = seg.side === 0 ? linedef.frontSidedef : linedef.backSidedef;
	const sidedef = rs.map.sidedefs[sidedefIndex];
	if (!sidedef) return;

	const frontSector = rs.map.sectors[sidedef.sector];
	if (!frontSector) return;

	// Check if two-sided
	const isTwoSided = !!(linedef.flags & LinedefFlags.TWO_SIDED);
	let backSector = null;

	if (isTwoSided) {
		const backSidedefIndex = seg.side === 0 ? linedef.backSidedef : linedef.frontSidedef;
		if (backSidedefIndex !== 0xffff) {
			const backSidedef = rs.map.sidedefs[backSidedefIndex];
			if (backSidedef) {
				backSector = rs.map.sectors[backSidedef.sector] ?? null;
			}
		}
	}

	// Compute wall distance for scale calculation
	const dx = v2x - v1x;
	const dy = v2y - v1y;

	// Use simplified distance calculation: perpendicular distance from viewer to seg
	const segAngle = pointToAngle2(v1x, v1y, v2x, v2y);
	const normalAngle = ((segAngle + ANG90) >>> 0);
	const offsetAngle = ((normalAngle - rw_angle1) >>> 0);

	const sinIdx = (offsetAngle >> ANGLETOFINESHIFT) & FINEMASK;
	const segLen = Math.sqrt(
		((v2x - v1x) / FRACUNIT) ** 2 + ((v2y - v1y) / FRACUNIT) ** 2,
	) * FRACUNIT;

	const hyp = Math.sqrt(
		((v1x - rs.viewx) / FRACUNIT) ** 2 + ((v1y - rs.viewy) / FRACUNIT) ** 2,
	) * FRACUNIT;

	const sinVal = finesine[sinIdx] ?? 0;
	let rw_distance = Math.abs(fixedMul(Math.round(hyp), sinVal));
	if (rw_distance < FRACUNIT) rw_distance = FRACUNIT;

	// Compute scale at the left edge (x1)
	const rw_scale = scaleFromGlobalAngle(rs.viewangle, rw_angle1, normalAngle, rw_distance);

	// Compute scale at the right edge if needed
	let rw_scalestep = 0;
	let scale2 = rw_scale;
	if (x2 > x1) {
		const angle2view = ((rs.viewangle + ANG90 - ((x2 - centerx) << ANGLETOFINESHIFT)) >>> 0);
		scale2 = scaleFromGlobalAngle(rs.viewangle, angle2view, normalAngle, rw_distance);
		rw_scalestep = Math.round((scale2 - rw_scale) / (x2 - x1));
	}

	// Determine what to draw
	const frontFloor = frontSector.floorHeight << FRACBITS;
	const frontCeiling = frontSector.ceilingHeight << FRACBITS;

	let markFloor = false;
	let markCeiling = false;
	let drawUpperWall = false;
	let drawLowerWall = false;
	let drawMidWall = false;

	let backFloor = 0;
	let backCeiling = 0;

	if (!backSector) {
		// One-sided: draw middle texture, mark both floor and ceiling
		drawMidWall = true;
		markFloor = true;
		markCeiling = true;
	} else {
		backFloor = backSector.floorHeight << FRACBITS;
		backCeiling = backSector.ceilingHeight << FRACBITS;

		if (frontCeiling !== backCeiling) {
			drawUpperWall = true;
			markCeiling = true;
		}
		if (frontFloor !== backFloor) {
			drawLowerWall = true;
			markFloor = true;
		}
		if (backCeiling === backFloor) {
			// Closed door: treat as solid
			drawMidWall = true;
			markFloor = true;
			markCeiling = true;
		}
		if (frontSector.floorFlat !== backSector?.floorFlat) markFloor = true;
		if (frontSector.ceilingFlat !== backSector?.ceilingFlat) markCeiling = true;
		if (frontSector.lightLevel !== backSector?.lightLevel) {
			markFloor = true;
			markCeiling = true;
		}
	}

	// Clip against solidsegs and render
	const isSolid = !backSector || (!drawUpperWall && !drawLowerWall && drawMidWall);

	if (isSolid) {
		clipSolidWall(rs, x1, x2, rw_scale, rw_scalestep,
			frontSector.lightLevel, frontFloor, frontCeiling,
			backFloor, backCeiling,
			sidedef.midTexture, sidedef.topTexture, sidedef.bottomTexture,
			drawMidWall, drawUpperWall, drawLowerWall,
			markFloor, markCeiling,
			frontSector, linedef.flags, sidedef.textureOffset, sidedef.rowOffset);
	} else {
		clipPassWall(rs, x1, x2, rw_scale, rw_scalestep,
			frontSector.lightLevel, frontFloor, frontCeiling,
			backFloor, backCeiling,
			sidedef.midTexture, sidedef.topTexture, sidedef.bottomTexture,
			drawMidWall, drawUpperWall, drawLowerWall,
			markFloor, markCeiling,
			frontSector, linedef.flags, sidedef.textureOffset, sidedef.rowOffset);
	}
}

// ─── Scale Calculation ─────────────────────────────────────────────

/**
 * Compute projection scale for a wall at a given angle and distance.
 * Larger scale = closer to camera = taller on screen.
 */
function scaleFromGlobalAngle(
	viewangle: number,
	visangle: number,
	normalangle: number,
	distance: number,
): number {
	const anglea = ((ANG90 + visangle - viewangle) >>> 0);
	const angleb = ((ANG90 + visangle - normalangle) >>> 0);

	const sinIdxA = (anglea >> ANGLETOFINESHIFT) & FINEMASK;
	const sinIdxB = (angleb >> ANGLETOFINESHIFT) & FINEMASK;

	const sinea = finesine[sinIdxA] ?? FRACUNIT;
	const sineb = finesine[sinIdxB] ?? FRACUNIT;

	const num = fixedMul(projection, sineb);
	const den = fixedMul(distance, sinea);

	if (den === 0) return FRACUNIT * 64;

	let scale = fixedDiv(num, den);

	// Clamp scale
	if (scale < 256) scale = 256;
	if (scale > 64 * FRACUNIT) scale = 64 * FRACUNIT;

	return scale;
}

// ─── Wall Clipping and Rendering ───────────────────────────────────

/**
 * Clip and render a solid (one-sided) wall segment.
 * Also adds the column range to solidsegs.
 */
function clipSolidWall(
	rs: RenderState,
	x1: number, x2: number,
	scale: number, scalestep: number,
	lightLevel: number,
	frontFloor: number, frontCeiling: number,
	backFloor: number, backCeiling: number,
	midTex: string, topTex: string, bottomTex: string,
	drawMid: boolean, drawUpper: boolean, drawLower: boolean,
	markFloor: boolean, markCeiling: boolean,
	sector: { readonly floorFlat: string; readonly ceilingFlat: string; readonly lightLevel: number; readonly floorHeight: number; readonly ceilingHeight: number },
	lineFlags: number, texOffset: number, rowOffset: number,
): void {
	// Find visible portions not covered by solidsegs
	let curScale = scale;

	for (let x = x1; x <= x2; x++) {
		if (!isColumnOccluded(rs, x)) {
			renderWallColumn(rs, x, curScale, lightLevel,
				frontFloor, frontCeiling, backFloor, backCeiling,
				midTex, topTex, bottomTex,
				drawMid, drawUpper, drawLower,
				markFloor, markCeiling,
				sector, lineFlags, texOffset, rowOffset);
		}
		curScale += scalestep;
	}

	// Add to solidsegs (merge with adjacent ranges)
	addSolidSeg(rs, x1, x2);
}

/**
 * Clip and render a pass-through (two-sided) wall segment.
 * Does NOT add to solidsegs.
 */
function clipPassWall(
	rs: RenderState,
	x1: number, x2: number,
	scale: number, scalestep: number,
	lightLevel: number,
	frontFloor: number, frontCeiling: number,
	backFloor: number, backCeiling: number,
	midTex: string, topTex: string, bottomTex: string,
	drawMid: boolean, drawUpper: boolean, drawLower: boolean,
	markFloor: boolean, markCeiling: boolean,
	sector: { readonly floorFlat: string; readonly ceilingFlat: string; readonly lightLevel: number; readonly floorHeight: number; readonly ceilingHeight: number },
	lineFlags: number, texOffset: number, rowOffset: number,
): void {
	let curScale = scale;

	for (let x = x1; x <= x2; x++) {
		if (!isColumnOccluded(rs, x)) {
			renderWallColumn(rs, x, curScale, lightLevel,
				frontFloor, frontCeiling, backFloor, backCeiling,
				midTex, topTex, bottomTex,
				drawMid, drawUpper, drawLower,
				markFloor, markCeiling,
				sector, lineFlags, texOffset, rowOffset);
		}
		curScale += scalestep;
	}
}

// ─── Per-Column Wall Rendering ─────────────────────────────────────

/**
 * Render a single column of wall (upper, middle, and/or lower textures).
 */
function renderWallColumn(
	rs: RenderState,
	x: number,
	scale: number,
	lightLevel: number,
	frontFloor: number, frontCeiling: number,
	backFloor: number, backCeiling: number,
	midTex: string, topTex: string, bottomTex: string,
	drawMid: boolean, drawUpper: boolean, drawLower: boolean,
	markFloor: boolean, markCeiling: boolean,
	sector: { readonly floorFlat: string; readonly ceilingFlat: string; readonly lightLevel: number; readonly floorHeight: number; readonly ceilingHeight: number },
	lineFlags: number, texOffset: number, rowOffset: number,
): void {
	if (x < 0 || x >= rs.screenWidth) return;

	const ch = centery;

	// Compute screen Y for floor and ceiling
	const topY = ch - fixedMul(frontCeiling - rs.viewz, scale) / FRACUNIT;
	const botY = ch - fixedMul(frontFloor - rs.viewz, scale) / FRACUNIT;

	// Clamp to clip arrays
	const clipTop = (rs.ceilingclip[x] ?? -1) + 1;
	const clipBot = (rs.floorclip[x] ?? rs.screenHeight) - 1;

	let yl = Math.max(Math.ceil(topY), clipTop);
	let yh = Math.min(Math.floor(botY), clipBot);

	// Compute light level
	const lightIdx = Math.max(0, Math.min(LIGHTLEVELS - 1,
		(lightLevel >> LIGHTSEGSHIFT) + rs.extralight));
	const lightTable = scalelight[lightIdx];
	const scaleIdx = Math.max(0, Math.min(MAXLIGHTSCALE - 1, scale >> 12));
	const colormapIdx = rs.fixedcolormap ?? (lightTable?.[scaleIdx] ?? 0);

	if (drawMid && midTex !== '-') {
		// One-sided wall: draw middle texture
		const tex = getWallTexture(rs.textures, midTex);
		if (tex) {
			const texColumn = (texOffset + x) % tex.width;
			const invScale = fixedDiv(FRACUNIT, scale);

			// Texture mid point
			let textureMid = frontCeiling - rs.viewz + (rowOffset << FRACBITS);
			if (lineFlags & 16) { // ML_DONTPEGBOTTOM
				textureMid = frontFloor - rs.viewz + (tex.height << FRACBITS) + (rowOffset << FRACBITS);
			}

			drawWallSlice(rs, x, yl, yh, tex, texColumn, textureMid, invScale, colormapIdx);
		} else {
			// No texture: draw solid color
			drawSolidColumn(rs, x, yl, yh, colormapIdx);
		}

		// Update clip arrays
		if (markCeiling && yl > clipTop) {
			rs.ceilingclip[x] = yl - 1;
		}
		if (markFloor && yh < clipBot) {
			rs.floorclip[x] = yh + 1;
		}
		return;
	}

	// Two-sided wall: draw upper and lower textures
	if (drawUpper && topTex !== '-') {
		const backCeilY = ch - fixedMul(backCeiling - rs.viewz, scale) / FRACUNIT;
		const upperYh = Math.min(Math.floor(backCeilY), clipBot);

		if (yl <= upperYh) {
			const tex = getWallTexture(rs.textures, topTex);
			if (tex) {
				let textureMid = frontCeiling - rs.viewz + (rowOffset << FRACBITS);
				if (!(lineFlags & 8)) { // not ML_DONTPEGTOP: peg to lower ceiling
					textureMid = backCeiling - rs.viewz + (tex.height << FRACBITS) + (rowOffset << FRACBITS);
				}
				const invScale = fixedDiv(FRACUNIT, scale);
				const texColumn = (texOffset + x) % tex.width;
				drawWallSlice(rs, x, yl, Math.min(upperYh, yh), tex, texColumn, textureMid, invScale, colormapIdx);
			}
		}

		if (markCeiling) {
			rs.ceilingclip[x] = Math.max(yl - 1, Math.floor(backCeilY));
		}
	} else if (markCeiling) {
		rs.ceilingclip[x] = yl - 1;
	}

	if (drawLower && bottomTex !== '-') {
		const backFloorY = ch - fixedMul(backFloor - rs.viewz, scale) / FRACUNIT;
		const lowerYl = Math.max(Math.ceil(backFloorY), clipTop);

		if (lowerYl <= yh) {
			const tex = getWallTexture(rs.textures, bottomTex);
			if (tex) {
				let textureMid = frontFloor - rs.viewz + (rowOffset << FRACBITS);
				if (lineFlags & 16) { // ML_DONTPEGBOTTOM
					textureMid = frontCeiling - rs.viewz + (rowOffset << FRACBITS);
				}
				const invScale = fixedDiv(FRACUNIT, scale);
				const texColumn = (texOffset + x) % tex.width;
				drawWallSlice(rs, x, Math.max(lowerYl, yl), yh, tex, texColumn, textureMid, invScale, colormapIdx);
			}
		}

		if (markFloor) {
			rs.floorclip[x] = Math.min(yh + 1, Math.ceil(backFloorY));
		}
	} else if (markFloor) {
		rs.floorclip[x] = yh + 1;
	}
}

// ─── Column Drawing Helpers ────────────────────────────────────────

/**
 * Draw a textured wall column slice.
 */
function drawWallSlice(
	rs: RenderState,
	x: number, yl: number, yh: number,
	tex: CompositeTexture,
	texColumn: number,
	textureMid: number,
	invScale: number,
	colormapIdx: number,
): void {
	const colIdx = ((texColumn % tex.width) + tex.width) % tex.width;
	const column = tex.columns[colIdx];
	if (!column) return;

	for (let y = yl; y <= yh; y++) {
		if (y < 0 || y >= rs.screenHeight) continue;

		// Compute texture Y coordinate
		const frac = textureMid + (y - centery) * invScale;
		let texY = (frac >> FRACBITS) % tex.height;
		if (texY < 0) texY += tex.height;

		const paletteIdx = column[texY] ?? 0;
		drawColumn(rs, x, y, paletteIdx, colormapIdx);
	}
}

/**
 * Draw a solid-colored column (fallback when texture is missing).
 */
function drawSolidColumn(
	rs: RenderState,
	x: number, yl: number, yh: number,
	colormapIdx: number,
): void {
	for (let y = yl; y <= yh; y++) {
		if (y < 0 || y >= rs.screenHeight) continue;
		drawColumn(rs, x, y, 96, colormapIdx); // medium gray
	}
}

// ─── Solidsegs Management ──────────────────────────────────────────

/**
 * Check if a screen column is fully occluded.
 */
function isColumnOccluded(rs: RenderState, x: number): boolean {
	for (const seg of rs.solidsegs) {
		if (x >= seg.first && x <= seg.last) return true;
	}
	return false;
}

/**
 * Add a solid wall range to the solidsegs list, merging overlapping ranges.
 */
function addSolidSeg(rs: RenderState, first: number, last: number): void {
	const segs = rs.solidsegs;

	// Find insertion point and merge
	let i = 0;
	while (i < segs.length && (segs[i]?.last ?? 0) < first - 1) {
		i++;
	}

	let mergedFirst = first;
	let mergedLast = last;

	// Merge with overlapping/adjacent entries
	let j = i;
	while (j < segs.length && (segs[j]?.first ?? 0) <= last + 1) {
		const seg = segs[j];
		if (seg) {
			mergedFirst = Math.min(mergedFirst, seg.first);
			mergedLast = Math.max(mergedLast, seg.last);
		}
		j++;
	}

	// Replace merged entries with single entry
	segs.splice(i, j - i, { first: mergedFirst, last: mergedLast });
}
