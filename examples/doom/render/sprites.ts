/**
 * Sprite projection, sorting, and rendering.
 *
 * Collects visible map objects (mobjs), projects them into screen space,
 * sorts back-to-front, and renders each sprite column by column using
 * the post-based picture format and light diminishing.
 *
 * @module render/sprites
 */

import { three } from 'blecsd';
import { ANGLETOFINESHIFT, FINEMASK, finecosine, finesine, pointToAngle2 } from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedDiv, fixedMul } from '../math/fixed.js';
import { centerxfrac, centery, projection, viewwidth } from '../math/tables.js';
import type { RenderState } from './defs.js';
import type { Mobj } from '../game/mobj.js';
import type { SpriteStore } from '../wad/spriteData.js';
import { getSpriteFrame, getSpriteRotation } from '../wad/spriteData.js';
import type { PaletteColor, PictureColumn, PicturePost } from '../wad/types.js';
import {
	LIGHTLEVELS,
	LIGHTSEGSHIFT,
	MAXLIGHTSCALE,
	NUMCOLORMAPS,
	scalelight,
} from '../math/tables.js';
import { drawColumn } from './drawColumn.js';

// ─── Vissprite ────────────────────────────────────────────────────

/** A projected sprite ready for rendering. */
interface Vissprite {
	/** Reference to the source mobj. */
	readonly mobj: Mobj;
	/** Horizontal offset from screen center (fixed-point). */
	readonly tx: number;
	/** Distance from camera (fixed-point). */
	readonly tz: number;
	/** Projection scale (larger = closer). */
	readonly scale: number;
	/** Left screen column (inclusive). */
	readonly x1: number;
	/** Right screen column (inclusive). */
	readonly x2: number;
	/** Texture column start (fixed-point). */
	readonly startFrac: number;
	/** Texture column step per screen column (fixed-point). */
	readonly stepFrac: number;
	/** Texture mid Y for vertical positioning (fixed-point). */
	readonly textureMid: number;
	/** Whether to mirror horizontally. */
	readonly flip: boolean;
	/** The picture to render. */
	readonly picture: {
		readonly width: number;
		readonly height: number;
		readonly leftOffset: number;
		readonly topOffset: number;
		readonly columns: readonly PictureColumn[];
	};
}

// ─── Sprite Collection ────────────────────────────────────────────

/**
 * Collect visible sprites from map objects and project them to screen space.
 *
 * Transforms each alive mobj to camera-relative coordinates, computes
 * projection scale and screen extents, and builds a vissprite for rendering.
 *
 * @param rs - Current render state
 * @param mobjs - All map objects to consider
 * @param spriteStore - Loaded sprite data
 * @returns Array of projected vissprites
 */
export function collectVisSprites(
	rs: RenderState,
	mobjs: readonly Mobj[],
	spriteStore: SpriteStore,
): Vissprite[] {
	const vissprites: Vissprite[] = [];

	for (const mobj of mobjs) {
		if (!mobj.alive) continue;

		// Transform to camera-relative coordinates
		const tr_x = mobj.x - rs.viewx;
		const tr_y = mobj.y - rs.viewy;

		// Rotate by -viewangle to get camera space
		const tz = fixedMul(tr_x, rs.viewcos) + fixedMul(tr_y, rs.viewsin);
		const tx = fixedMul(tr_x, rs.viewsin) - fixedMul(tr_y, rs.viewcos);

		// Skip if behind camera (minimum 4 units away)
		if (tz < FRACUNIT * 4) continue;

		// Compute scale, clamped to valid range
		let scale = fixedDiv(projection, tz);
		if (scale < 256) scale = 256;
		if (scale > 64 * FRACUNIT) scale = 64 * FRACUNIT;

		// Get sprite frame
		const spriteFrame = getSpriteFrame(spriteStore, mobj.spriteName, mobj.frame);
		if (!spriteFrame) continue;

		// Compute rotation: angle from mobj to viewer
		const angleToViewer = pointToAngle2(mobj.x, mobj.y, rs.viewx, rs.viewy);
		const relAngle = ((angleToViewer - mobj.angle + 0x100000000) >>> 0);

		// Derive rotation index (0-7) from the angle
		// Each rotation covers 45 degrees (ANG45 = 0x20000000)
		// Add half a rotation for proper rounding
		const rotationIndex = ((relAngle + 0x10000000) >>> 29) & 7;

		const rotResult = getSpriteRotation(spriteFrame, rotationIndex);
		if (!rotResult) continue;

		const picture = rotResult.picture;
		const flip = rotResult.flip;

		// Compute screen column extents by projecting world-space edges
		// independently (matching Doom's R_ProjectSprite)
		const txLeft = tx - (picture.leftOffset << FRACBITS);
		const txRight = txLeft + (picture.width << FRACBITS);

		const x1Raw = (centerxfrac + fixedMul(txLeft, scale)) >> FRACBITS;
		const x2Raw = ((centerxfrac + fixedMul(txRight, scale)) >> FRACBITS) - 1;

		// Clamp to screen bounds
		const x1 = Math.max(0, x1Raw);
		const x2 = Math.min(rs.screenWidth - 1, x2Raw);

		// Skip if entirely off screen
		if (x1 > x2) continue;

		// Compute texture column mapping
		const stepFrac = fixedDiv(FRACUNIT, scale);
		let startFrac: number;
		if (x1Raw < 0) {
			// Adjust start fraction if clipped on the left
			startFrac = stepFrac * -x1Raw;
		} else {
			startFrac = 0;
		}

		// Compute textureMid for Y positioning
		const textureMid = mobj.z + (picture.topOffset << FRACBITS) - rs.viewz;

		vissprites.push({
			mobj,
			tx,
			tz,
			scale,
			x1,
			x2,
			startFrac,
			stepFrac,
			textureMid,
			flip,
			picture,
		});
	}

	return vissprites;
}

// ─── Sprite Rendering ─────────────────────────────────────────────

/**
 * Render all visible sprites from map objects.
 *
 * Collects vissprites, sorts them back-to-front by distance, and
 * renders each one column by column with clipping against walls.
 *
 * @param rs - Current render state
 * @param mobjs - All map objects to consider
 * @param spriteStore - Loaded sprite data
 */
export function renderSprites(
	rs: RenderState,
	mobjs: readonly Mobj[],
	spriteStore: SpriteStore,
): void {
	const vissprites = collectVisSprites(rs, mobjs, spriteStore);

	// Sort back-to-front (furthest first, so nearer sprites overdraw)
	vissprites.sort((a, b) => b.tz - a.tz);

	// Render each vissprite
	for (const vis of vissprites) {
		drawSprite(rs, vis);
	}
}

// ─── Sprite Drawing ───────────────────────────────────────────────

/**
 * Draw a single projected sprite to the framebuffer.
 */
function drawSprite(rs: RenderState, vis: Vissprite): void {
	// Compute light level from the mobj's containing sector (matching R_DrawVisSprite)
	const sector = rs.map.sectors[vis.mobj.sectorIndex];
	const sectorLight = sector ? sector.lightLevel : 0;
	const lightIdx = Math.max(0, Math.min(LIGHTLEVELS - 1,
		(sectorLight >> LIGHTSEGSHIFT) + rs.extralight));
	const lightTable = scalelight[lightIdx];
	const scaleIdx = Math.max(0, Math.min(MAXLIGHTSCALE - 1, vis.scale >> 12));
	const colormapIdx = rs.fixedcolormap ?? (lightTable?.[scaleIdx] ?? 0);

	let texColumn = vis.startFrac;

	for (let x = vis.x1; x <= vis.x2; x++) {
		// Get clip bounds for this column
		const clipTop = (rs.ceilingclip[x] ?? -1) + 1;
		const clipBot = (rs.floorclip[x] ?? rs.screenHeight) - 1;

		// Skip fully occluded columns
		if (clipTop > clipBot) {
			texColumn += vis.stepFrac;
			continue;
		}

		// Get the picture column index
		let colIdx = texColumn >> FRACBITS;
		if (vis.flip) {
			colIdx = vis.picture.width - 1 - colIdx;
		}

		// Bounds-check the column index
		if (colIdx < 0 || colIdx >= vis.picture.width) {
			texColumn += vis.stepFrac;
			continue;
		}

		const column = vis.picture.columns[colIdx];
		if (column) {
			drawSpriteColumn(
				rs,
				x,
				vis.scale,
				vis.textureMid,
				column,
				colormapIdx,
				clipTop,
				clipBot,
			);
		}

		texColumn += vis.stepFrac;
	}
}

/**
 * Draw a single column of a sprite, processing each post (run of opaque pixels).
 *
 * @param rs - Render state
 * @param x - Screen X column
 * @param scale - Projection scale for this sprite
 * @param textureMid - Y texture midpoint (fixed-point)
 * @param column - Array of posts for this column
 * @param colormapIdx - Colormap index for light diminishing
 * @param clipTop - Top clip boundary (screen Y, inclusive)
 * @param clipBot - Bottom clip boundary (screen Y, inclusive)
 */
function drawSpriteColumn(
	rs: RenderState,
	x: number,
	scale: number,
	textureMid: number,
	column: readonly PicturePost[],
	colormapIdx: number,
	clipTop: number,
	clipBot: number,
): void {
	const invScale = fixedDiv(FRACUNIT, scale);

	for (const post of column) {
		// Compute screen Y range for this post
		const postTop = textureMid - (post.topDelta << FRACBITS);
		const postBot = postTop - ((post.pixels.length - 1) << FRACBITS);

		// Convert to screen coordinates
		// Screen Y = centery - (worldZ * scale) / FRACUNIT
		const screenTop = Math.ceil(centery - fixedMul(postTop, scale) / FRACUNIT);
		const screenBot = Math.floor(centery - fixedMul(postBot, scale) / FRACUNIT);

		// Clamp to clip bounds
		const drawTop = Math.max(screenTop, clipTop);
		const drawBot = Math.min(screenBot, clipBot);

		if (drawTop > drawBot) continue;

		// Draw each pixel in the post
		for (let y = drawTop; y <= drawBot; y++) {
			if (y < 0 || y >= rs.screenHeight) continue;

			// Compute texture Y from screen Y
			const frac = textureMid + (y - centery) * invScale;
			const texY = frac >> FRACBITS;

			// Look up the pixel within the post
			const postPixelIdx = texY - post.topDelta;
			if (postPixelIdx < 0 || postPixelIdx >= post.pixels.length) continue;

			const paletteIdx = post.pixels[postPixelIdx];
			if (paletteIdx === undefined) continue;

			drawColumn(rs, x, y, paletteIdx, colormapIdx);
		}
	}
}
