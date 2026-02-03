/**
 * Wall segment (seg) rendering: projection, clipping, and column drawing.
 *
 * This is the core of Doom's wall renderer. Each seg is projected to screen
 * columns, clipped against the solidsegs occlusion list, and rendered via
 * R_DrawColumn. Matches the original Doom r_segs.c and r_bsp.c logic.
 *
 * @module render/segs
 */

import {
	ANG90,
	ANG180,
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
	finetangent,
	pointToAngle2,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedDiv, fixedMul } from '../math/fixed.js';
import {
	LIGHTSEGSHIFT,
	LIGHTLEVELS,
	MAXLIGHTSCALE,
	centerx,
	centerxfrac,
	centery,
	centeryfrac,
	clipangle,
	projection,
	scalelight,
	viewangletox,
	viewwidth,
	xtoviewangle,
} from '../math/tables.js';
import { LinedefFlags, type MapSeg } from '../wad/types.js';
import type { RenderState, Visplane } from './defs.js';
import { drawColumn } from './drawColumn.js';
import { findPlane, setPlaneColumn } from './planes.js';
import { getWallTexture, type CompositeTexture } from './textures.js';

// ─── Seg Processing Entry Point ────────────────────────────────────

/**
 * Process a single seg: project to screen, clip, and render.
 * Matches R_AddLine from r_bsp.c.
 *
 * @param rs - Render state
 * @param seg - Map segment to render
 * @param subsectorIndex - Index of the containing subsector
 * @param floorPlane - Current subsector's floor visplane (or null)
 * @param ceilingPlane - Current subsector's ceiling visplane (or null)
 */
export function addLine(
	rs: RenderState,
	seg: MapSeg,
	subsectorIndex: number,
	floorPlane: Visplane | null,
	ceilingPlane: Visplane | null,
): void {
	const v1 = rs.map.vertexes[seg.v1];
	const v2 = rs.map.vertexes[seg.v2];
	if (!v1 || !v2) return;

	// Convert to fixed-point
	const v1x = v1.x << FRACBITS;
	const v1y = v1.y << FRACBITS;
	const v2x = v2.x << FRACBITS;
	const v2y = v2.y << FRACBITS;

	// Compute angles from viewer to seg endpoints
	const angle1global = pointToAngle2(rs.viewx, rs.viewy, v1x, v1y);
	const angle2global = pointToAngle2(rs.viewx, rs.viewy, v2x, v2y);

	// Check if the seg faces the viewer (backface culling)
	const span = ((angle1global - angle2global) >>> 0);
	if (span >= ANG180) return; // seg faces away

	// Save global angle for later use
	const rw_angle1 = angle1global;

	// Make view-relative
	let angle1 = ((angle1global - rs.viewangle) >>> 0);
	let angle2 = ((angle2global - rs.viewangle) >>> 0);

	// Clip to FOV using clipangle (matching R_AddLine from r_bsp.c)
	let tspan = ((angle1 + clipangle) >>> 0);
	if (tspan > ((2 * clipangle) >>> 0)) {
		tspan = ((tspan - ((2 * clipangle) >>> 0)) >>> 0);
		// Entirely outside left side of FOV?
		if (tspan >= span) return;
		angle1 = clipangle;
	}
	tspan = ((clipangle - angle2) >>> 0);
	if (tspan > ((2 * clipangle) >>> 0)) {
		tspan = ((tspan - ((2 * clipangle) >>> 0)) >>> 0);
		// Entirely outside right side of FOV?
		if (tspan >= span) return;
		angle2 = ((-clipangle) >>> 0);
	}

	// Convert clipped view-relative angles to screen X
	const fineIdx1 = ((angle1 + ANG90) >>> 0) >> ANGLETOFINESHIFT;
	const fineIdx2 = ((angle2 + ANG90) >>> 0) >> ANGLETOFINESHIFT;

	const x1 = viewangletox[fineIdx1 & 0xfff] ?? 0;
	let x2 = (viewangletox[fineIdx2 & 0xfff] ?? viewwidth) - 1;

	// Does not cross a pixel?
	if (x1 > x2) return;
	if (x2 < 0 || x1 >= rs.screenWidth) return;
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

	// ─── Compute rw_normalangle and rw_distance (matching R_StoreWallRange) ───

	// rw_normalangle = curline->angle + ANG90
	// seg.angle is stored in the WAD as a BAM-like value (0-65535 mapped to 0-360)
	const segAngleBam = ((seg.angle / 65536) * 0x100000000) >>> 0;
	const rw_normalangle = ((segAngleBam + ANG90) >>> 0);

	// Compute perpendicular distance to the seg line
	// offsetangle = abs(rw_normalangle - rw_angle1), clamped to ANG90
	let offsetangle = ((rw_normalangle - rw_angle1) >>> 0);
	if (offsetangle > ANG180) offsetangle = ((-offsetangle) >>> 0);
	if (offsetangle > ANG90) offsetangle = ANG90;

	const distangle = ((ANG90 - offsetangle) >>> 0);
	const distFineIdx = (distangle >> ANGLETOFINESHIFT) & FINEMASK;
	const sineval = finesine[distFineIdx] ?? 0;

	// hyp = distance from viewer to v1
	const hyp = pointToDist(rs.viewx, rs.viewy, v1x, v1y);

	let rw_distance = fixedMul(hyp, sineval);
	if (rw_distance < FRACUNIT) rw_distance = FRACUNIT;

	// ─── Compute scale at endpoints (matching R_StoreWallRange) ───

	const rw_scale = scaleFromGlobalAngle(
		rs.viewangle, ((rs.viewangle + (xtoviewangle[x1] ?? 0)) >>> 0),
		rw_normalangle, rw_distance,
	);

	let rw_scalestep = 0;
	if (x2 > x1) {
		const scale2 = scaleFromGlobalAngle(
			rs.viewangle, ((rs.viewangle + (xtoviewangle[x2] ?? 0)) >>> 0),
			rw_normalangle, rw_distance,
		);
		rw_scalestep = Math.round((scale2 - rw_scale) / (x2 - x1));
	}

	// ─── Compute rw_offset for texture column mapping ───

	// offsetangle for texture offset (different from distance offsetangle)
	let texOffsetAngle = ((rw_normalangle - rw_angle1) >>> 0);
	if (texOffsetAngle > ANG180) texOffsetAngle = ((-texOffsetAngle) >>> 0);
	if (texOffsetAngle > ANG90) texOffsetAngle = ANG90;

	const texSineval = finesine[(texOffsetAngle >> ANGLETOFINESHIFT) & FINEMASK] ?? 0;
	let rw_offset = fixedMul(hyp, texSineval);

	if (((rw_normalangle - rw_angle1) >>> 0) < ANG180) {
		rw_offset = -rw_offset;
	}

	rw_offset += (sidedef.textureOffset << FRACBITS) + (seg.offset << FRACBITS);

	// rw_centerangle = ANG90 + viewangle - rw_normalangle
	const rw_centerangle = ((ANG90 + rs.viewangle - rw_normalangle) >>> 0);

	// ─── Determine what to draw ───

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

		// Closed door
		if (backCeiling <= frontFloor || backFloor >= frontCeiling) {
			drawMidWall = true;
			markFloor = true;
			markCeiling = true;
		} else {
			if (frontCeiling !== backCeiling) {
				drawUpperWall = true;
				markCeiling = true;
			}
			if (frontFloor !== backFloor) {
				drawLowerWall = true;
				markFloor = true;
			}
			if (frontSector.floorFlat !== backSector.floorFlat) markFloor = true;
			if (frontSector.ceilingFlat !== backSector.ceilingFlat) markCeiling = true;
			if (frontSector.lightLevel !== backSector.lightLevel) {
				markFloor = true;
				markCeiling = true;
			}
		}

		// Reject empty lines
		if (!drawUpperWall && !drawLowerWall && !drawMidWall
			&& frontSector.ceilingFlat === backSector.ceilingFlat
			&& frontSector.floorFlat === backSector.floorFlat
			&& frontSector.lightLevel === backSector.lightLevel
			&& sidedef.midTexture === '-') {
			return;
		}
	}

	// ─── Build wall rendering context ───

	const wallCtx: WallContext = {
		rs,
		x1, x2,
		rw_scale, rw_scalestep,
		rw_distance,
		rw_normalangle,
		rw_offset,
		rw_centerangle,
		lightLevel: frontSector.lightLevel,
		frontFloor, frontCeiling,
		backFloor, backCeiling,
		midTex: sidedef.midTexture,
		topTex: sidedef.topTexture,
		bottomTex: sidedef.bottomTexture,
		drawMid: drawMidWall,
		drawUpper: drawUpperWall,
		drawLower: drawLowerWall,
		markFloor, markCeiling,
		floorPlane, ceilingPlane,
		lineFlags: linedef.flags,
		rowOffset: sidedef.rowOffset,
	};

	// Clip against solidsegs and render
	const isSolid = !backSector || (backCeiling <= frontFloor || backFloor >= frontCeiling);

	if (isSolid) {
		clipSolidWall(wallCtx);
	} else {
		clipPassWall(wallCtx);
	}
}

// ─── Wall Context ─────────────────────────────────────────────────

/** All parameters needed to render a wall segment. */
interface WallContext {
	readonly rs: RenderState;
	readonly x1: number;
	readonly x2: number;
	readonly rw_scale: number;
	readonly rw_scalestep: number;
	readonly rw_distance: number;
	readonly rw_normalangle: number;
	readonly rw_offset: number;
	readonly rw_centerangle: number;
	readonly lightLevel: number;
	readonly frontFloor: number;
	readonly frontCeiling: number;
	readonly backFloor: number;
	readonly backCeiling: number;
	readonly midTex: string;
	readonly topTex: string;
	readonly bottomTex: string;
	readonly drawMid: boolean;
	readonly drawUpper: boolean;
	readonly drawLower: boolean;
	readonly markFloor: boolean;
	readonly markCeiling: boolean;
	readonly floorPlane: Visplane | null;
	readonly ceilingPlane: Visplane | null;
	readonly lineFlags: number;
	readonly rowOffset: number;
}

// ─── Distance Calculation ─────────────────────────────────────────

/**
 * Compute distance from a point to the viewer.
 * Simplified version of R_PointToDist using Euclidean distance.
 */
function pointToDist(viewx: number, viewy: number, x: number, y: number): number {
	const dx = Math.abs(x - viewx);
	const dy = Math.abs(y - viewy);
	// Use floating-point sqrt then convert back to fixed
	const dist = Math.sqrt(
		(dx / FRACUNIT) * (dx / FRACUNIT) + (dy / FRACUNIT) * (dy / FRACUNIT),
	);
	return Math.round(dist * FRACUNIT);
}

// ─── Scale Calculation ─────────────────────────────────────────────

/**
 * Compute projection scale for a wall at a given angle and distance.
 * Matches R_ScaleFromGlobalAngle from r_main.c.
 *
 * @param viewangle - Player's facing direction (BAM)
 * @param visangle - Global angle to the wall point being projected
 * @param normalangle - The wall segment's perpendicular angle
 * @param distance - Perpendicular distance from viewer to wall line
 */
function scaleFromGlobalAngle(
	viewangle: number,
	visangle: number,
	normalangle: number,
	distance: number,
): number {
	const anglea = ((ANG90 + (visangle - viewangle)) >>> 0);
	const angleb = ((ANG90 + (visangle - normalangle)) >>> 0);

	const sinea = finesine[(anglea >> ANGLETOFINESHIFT) & FINEMASK] ?? FRACUNIT;
	const sineb = finesine[(angleb >> ANGLETOFINESHIFT) & FINEMASK] ?? FRACUNIT;

	const num = fixedMul(projection, sineb);
	const den = fixedMul(distance, sinea);

	if (den > (num >> 16)) {
		let scale = fixedDiv(num, den);
		if (scale > 64 * FRACUNIT) scale = 64 * FRACUNIT;
		else if (scale < 256) scale = 256;
		return scale;
	}

	return 64 * FRACUNIT;
}

// ─── Wall Clipping and Rendering ───────────────────────────────────

/**
 * Clip and render a solid (one-sided) wall segment.
 * Also adds the column range to solidsegs.
 */
function clipSolidWall(ctx: WallContext): void {
	renderSegLoop(ctx);
	addSolidSeg(ctx.rs, ctx.x1, ctx.x2);
}

/**
 * Clip and render a pass-through (two-sided) wall segment.
 * Does NOT add to solidsegs.
 */
function clipPassWall(ctx: WallContext): void {
	renderSegLoop(ctx);
}

// ─── Render Seg Loop ──────────────────────────────────────────────

/** HEIGHTBITS for sub-pixel Y precision (matching Doom's 12-bit shift). */
const HEIGHTBITS = 12;
const HEIGHTUNIT = 1 << HEIGHTBITS;

/**
 * Render all columns in the seg range.
 * Matches R_RenderSegLoop from r_segs.c.
 *
 * Uses incremental Y stepping for precision.
 */
function renderSegLoop(ctx: WallContext): void {
	const { rs, x1, x2 } = ctx;

	// World-space heights relative to viewz, shifted for HEIGHTBITS precision
	const worldtop = (ctx.frontCeiling - rs.viewz) >> 4;
	const worldbottom = (ctx.frontFloor - rs.viewz) >> 4;

	let worldhigh = 0;
	let worldlow = 0;
	if (ctx.drawUpper || ctx.drawLower) {
		worldhigh = (ctx.backCeiling - rs.viewz) >> 4;
		worldlow = (ctx.backFloor - rs.viewz) >> 4;
	}

	// Initialize incremental stepping
	let topfrac = (centeryfrac >> 4) - fixedMul(worldtop, ctx.rw_scale);
	const topstep = -fixedMul(ctx.rw_scalestep, worldtop);

	let bottomfrac = (centeryfrac >> 4) - fixedMul(worldbottom, ctx.rw_scale);
	const bottomstep = -fixedMul(ctx.rw_scalestep, worldbottom);

	let pixhigh = 0;
	let pixhighstep = 0;
	let pixlow = 0;
	let pixlowstep = 0;

	if (ctx.drawUpper) {
		pixhigh = (centeryfrac >> 4) - fixedMul(worldhigh, ctx.rw_scale);
		pixhighstep = -fixedMul(ctx.rw_scalestep, worldhigh);
	}
	if (ctx.drawLower) {
		pixlow = (centeryfrac >> 4) - fixedMul(worldlow, ctx.rw_scale);
		pixlowstep = -fixedMul(ctx.rw_scalestep, worldlow);
	}

	// Texture lookup info
	const segtextured = ctx.drawMid || ctx.drawUpper || ctx.drawLower;
	const midTex = ctx.drawMid && ctx.midTex !== '-' ? getWallTexture(rs.textures, ctx.midTex) : null;
	const topTex = ctx.drawUpper && ctx.topTex !== '-' ? getWallTexture(rs.textures, ctx.topTex) : null;
	const bottomTex = ctx.drawLower && ctx.bottomTex !== '-' ? getWallTexture(rs.textures, ctx.bottomTex) : null;

	// Texture mid (vertical offset) for pegging
	let midTextureMid = 0;
	let topTextureMid = 0;
	let bottomTextureMid = 0;

	if (midTex) {
		midTextureMid = ctx.frontCeiling - rs.viewz + (ctx.rowOffset << FRACBITS);
		if (ctx.lineFlags & LinedefFlags.DONT_PEG_BOTTOM) {
			midTextureMid = ctx.frontFloor - rs.viewz + (midTex.height << FRACBITS) + (ctx.rowOffset << FRACBITS);
		}
	}
	if (topTex) {
		// ML_DONTPEGTOP: peg to top of upper texture at ceiling
		topTextureMid = ctx.frontCeiling - rs.viewz + (ctx.rowOffset << FRACBITS);
		if (!(ctx.lineFlags & LinedefFlags.DONT_PEG_TOP)) {
			// Not pegged to top: align to lower of the two ceilings
			topTextureMid = ctx.backCeiling - rs.viewz + (topTex.height << FRACBITS) + (ctx.rowOffset << FRACBITS);
		}
	}
	if (bottomTex) {
		bottomTextureMid = ctx.frontFloor - rs.viewz + (ctx.rowOffset << FRACBITS);
		if (ctx.lineFlags & LinedefFlags.DONT_PEG_BOTTOM) {
			bottomTextureMid = ctx.frontCeiling - rs.viewz + (ctx.rowOffset << FRACBITS);
		}
	}

	let curScale = ctx.rw_scale;

	for (let x = x1; x <= x2; x++) {
		if (x < 0 || x >= rs.screenWidth) {
			topfrac += topstep;
			bottomfrac += bottomstep;
			if (ctx.drawUpper) pixhigh += pixhighstep;
			if (ctx.drawLower) pixlow += pixlowstep;
			curScale += ctx.rw_scalestep;
			continue;
		}

		// Skip occluded columns
		if (isColumnOccluded(rs, x)) {
			topfrac += topstep;
			bottomfrac += bottomstep;
			if (ctx.drawUpper) pixhigh += pixhighstep;
			if (ctx.drawLower) pixlow += pixlowstep;
			curScale += ctx.rw_scalestep;
			continue;
		}

		// Clip bounds
		const clipTop = (rs.ceilingclip[x] ?? -1) + 1;
		const clipBot = (rs.floorclip[x] ?? rs.screenHeight) - 1;

		// Compute screen Y coordinates from incremental fracs
		let yl = (topfrac + HEIGHTUNIT - 1) >> HEIGHTBITS;
		if (yl < clipTop) yl = clipTop;

		let yh = bottomfrac >> HEIGHTBITS;
		if (yh > clipBot) yh = clipBot;

		// Compute light level
		const lightIdx = Math.max(0, Math.min(LIGHTLEVELS - 1,
			(ctx.lightLevel >> LIGHTSEGSHIFT) + rs.extralight));
		const lightTable = scalelight[lightIdx];
		const scaleIdx = Math.max(0, Math.min(MAXLIGHTSCALE - 1, curScale >> 12));
		const colormapIdx = rs.fixedcolormap ?? (lightTable?.[scaleIdx] ?? 0);

		// Compute texture column (if textured)
		let texturecolumn = 0;
		if (segtextured) {
			const angle = ((ctx.rw_centerangle + (xtoviewangle[x] ?? 0)) >>> 0) >> ANGLETOFINESHIFT;
			texturecolumn = ctx.rw_offset - fixedMul(finetangent[angle & (4095)] ?? 0, ctx.rw_distance);
			texturecolumn >>= FRACBITS;
		}

		// ─── Mark ceiling visplane ───
		if (ctx.markCeiling && ctx.ceilingPlane) {
			const ceilTop = clipTop;
			const ceilBottom = yl > 0 ? yl - 1 : -1;
			if (ceilTop <= ceilBottom) {
				setPlaneColumn(ctx.ceilingPlane, x, ceilTop, ceilBottom);
			}
		}

		// ─── Mark floor visplane ───
		if (ctx.markFloor && ctx.floorPlane) {
			const floorTop = yh < rs.screenHeight - 1 ? yh + 1 : rs.screenHeight;
			const floorBottom = clipBot;
			if (floorTop <= floorBottom) {
				setPlaneColumn(ctx.floorPlane, x, floorTop, floorBottom);
			}
		}

		// ─── Draw wall columns ───

		if (ctx.drawMid) {
			// One-sided wall: middle texture fills from yl to yh
			if (yl <= yh) {
				if (midTex) {
					const invScale = fixedDiv(FRACUNIT, curScale);
					drawWallSlice(rs, x, yl, yh, midTex, texturecolumn, midTextureMid, invScale, colormapIdx);
				} else {
					drawSolidColumn(rs, x, yl, yh, colormapIdx);
				}
			}
			// Solid wall: close off both clip regions
			rs.ceilingclip[x] = rs.screenHeight;
			rs.floorclip[x] = -1;
		} else {
			// Two-sided: draw upper texture
			if (ctx.drawUpper) {
				let mid = pixhigh >> HEIGHTBITS;
				if (mid > clipBot) mid = clipBot;

				if (yl <= mid) {
					if (topTex) {
						const invScale = fixedDiv(FRACUNIT, curScale);
						drawWallSlice(rs, x, yl, mid, topTex, texturecolumn, topTextureMid, invScale, colormapIdx);
					}
				}

				if (ctx.markCeiling) {
					rs.ceilingclip[x] = mid;
				}
			} else if (ctx.markCeiling) {
				rs.ceilingclip[x] = yl - 1;
			}

			// Two-sided: draw lower texture
			if (ctx.drawLower) {
				let mid = (pixlow + HEIGHTUNIT - 1) >> HEIGHTBITS;
				if (mid < clipTop) mid = clipTop;

				if (mid <= yh) {
					if (bottomTex) {
						const invScale = fixedDiv(FRACUNIT, curScale);
						drawWallSlice(rs, x, mid, yh, bottomTex, texturecolumn, bottomTextureMid, invScale, colormapIdx);
					}
				}

				if (ctx.markFloor) {
					rs.floorclip[x] = mid;
				}
			} else if (ctx.markFloor) {
				rs.floorclip[x] = yh + 1;
			}
		}

		// Step
		topfrac += topstep;
		bottomfrac += bottomstep;
		if (ctx.drawUpper) pixhigh += pixhighstep;
		if (ctx.drawLower) pixlow += pixlowstep;
		curScale += ctx.rw_scalestep;
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
	texturecolumn: number,
	textureMid: number,
	invScale: number,
	colormapIdx: number,
): void {
	const colIdx = ((texturecolumn % tex.width) + tex.width) % tex.width;
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
