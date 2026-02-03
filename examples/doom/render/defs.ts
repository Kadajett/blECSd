/**
 * Rendering state and data structures used across the BSP renderer.
 *
 * @module render/defs
 */

import { type three } from 'blecsd';
import type { ColorMap, MapData, Palette } from '../wad/types.js';
import type { CompositeTexture, TextureStore } from './textures.js';

// ─── Clip Range (Solidsegs) ────────────────────────────────────────

/** A horizontal range of screen columns that have been fully occluded. */
export interface ClipRange {
	first: number;
	last: number;
}

// ─── Visplane ──────────────────────────────────────────────────────

/** Maximum number of visplanes. Vanilla Doom limit was 128. */
export const MAXVISPLANES = 256;

/** A floor or ceiling surface to be rendered as horizontal spans. */
export interface Visplane {
	height: number;
	picnum: string;
	lightLevel: number;
	minx: number;
	maxx: number;
	readonly top: Uint16Array;
	readonly bottom: Uint16Array;
}

/** Sentinel value for unused visplane column. */
export const VP_UNUSED = 0xffff;

// ─── Draw Segment ──────────────────────────────────────────────────

/** Stored info about a rendered wall segment, used for sprite clipping. */
export interface DrawSeg {
	/** Screen column range. */
	x1: number;
	x2: number;
	/** Depth scale at endpoints (larger = closer). */
	scale1: number;
	scale2: number;
	scalestep: number;
	/** Silhouette flags: 1=bottom, 2=top, 3=both. */
	silhouette: number;
	/** Bottom/top silhouette heights (fixed-point). */
	bsilheight: number;
	tsilheight: number;
	/** Sprite clip arrays (screen Y values per column). */
	sprtopclip: Int16Array | null;
	sprbottomclip: Int16Array | null;
}

// ─── Render State ──────────────────────────────────────────────────

/** All mutable state for the current frame's rendering. */
export interface RenderState {
	/** The pixel framebuffer being rendered to. */
	fb: three.PixelFramebuffer;

	/** Map data. */
	map: MapData;

	/** Texture data. */
	textures: TextureStore;

	/** Base palette (index 0). */
	palette: Palette;

	/** Colormaps for light diminishing. */
	colormap: ColorMap;

	/** Camera position (fixed-point). */
	viewx: number;
	viewy: number;
	viewz: number;

	/** Camera angle (BAM). */
	viewangle: number;

	/** Camera sine/cosine (fixed-point, from viewangle). */
	viewsin: number;
	viewcos: number;

	/** Extra light from gun flash etc. */
	extralight: number;

	/** Fixed colormap (non-null = fullbright or invulnerability). */
	fixedcolormap: number | null;

	/** Screen column occlusion: lowest drawn row from top per column. */
	ceilingclip: Int16Array;

	/** Screen column occlusion: highest drawn row from bottom per column. */
	floorclip: Int16Array;

	/** Solidsegs: sorted list of fully occluded column ranges. */
	solidsegs: ClipRange[];

	/** Visplanes for this frame. */
	visplanes: Visplane[];

	/** Draw segments for sprite clipping. */
	drawsegs: DrawSeg[];

	/** Screen width/height. */
	screenWidth: number;
	screenHeight: number;
}

/**
 * Create initial render state for a frame.
 *
 * @param fb - Pixel framebuffer
 * @param map - Current map data
 * @param textures - Texture store
 * @param palette - Base palette
 * @param colormap - Light colormaps
 * @returns Fresh render state
 */
export function createRenderState(
	fb: three.PixelFramebuffer,
	map: MapData,
	textures: TextureStore,
	palette: Palette,
	colormap: ColorMap,
): RenderState {
	const w = fb.width;
	const h = fb.height;

	const ceilingclip = new Int16Array(w);
	ceilingclip.fill(-1);

	const floorclip = new Int16Array(w);
	floorclip.fill(h);

	return {
		fb,
		map,
		textures,
		palette,
		colormap,
		viewx: 0,
		viewy: 0,
		viewz: 41 * (1 << 16), // 41 units = default viewheight
		viewangle: 0,
		viewsin: 0,
		viewcos: 0,
		extralight: 0,
		fixedcolormap: null,
		ceilingclip,
		floorclip,
		solidsegs: [
			{ first: -0x7fffffff, last: -1 },
			{ first: w, last: 0x7fffffff },
		],
		visplanes: [],
		drawsegs: [],
		screenWidth: w,
		screenHeight: h,
	};
}
