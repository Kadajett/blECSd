/**
 * Rendering lookup tables derived from the screen dimensions and FOV.
 * These are generated once when the viewport is initialized.
 *
 * @module math/tables
 */

import {
	ANG90,
	ANGLETOFINESHIFT,
	FINEANGLES,
	FINEMASK,
	SLOPERANGE,
	finecosine,
	finesine,
	finetangent,
	tantoangle,
} from './angles.js';
import { FRACBITS, FRACUNIT, fixedDiv, fixedMul } from './fixed.js';

// ─── Screen Projection Tables ──────────────────────────────────────

/**
 * Maps view-relative angles to screen X coordinates.
 * Size: FINEANGLES/2 entries.
 */
export let viewangletox: Int32Array = new Int32Array(FINEANGLES / 2);

/**
 * Maps screen X coordinates to view-relative angles.
 * Size: screenWidth + 1 entries.
 */
export let xtoviewangle: Uint32Array = new Uint32Array(0);

/**
 * Distance scale per screen column (for flat rendering).
 * Size: screenWidth entries.
 */
export let distscale: Int32Array = new Int32Array(0);

/**
 * Projection constant: centerX / tan(FOV/2) in fixed-point.
 */
export let projection: number = 0;

/**
 * Center of the screen in X and Y.
 */
export let centerx: number = 0;
export let centery: number = 0;
export let centerxfrac: number = 0;
export let centeryfrac: number = 0;

/**
 * Screen dimensions for the current viewport.
 */
export let viewwidth: number = 0;
export let viewheight: number = 0;

// ─── Flat Rendering Tables ─────────────────────────────────────────

/**
 * Y-slope table for floor/ceiling distance calculation.
 * yslope[y] = abs(centery - y) in fixed-point, inverted for distance.
 * Size: screenHeight entries.
 */
export let yslope: Int32Array = new Int32Array(0);

/**
 * Base X scale for flat texture mapping.
 */
export let basexscale: number = 0;

/**
 * Base Y scale for flat texture mapping.
 */
export let baseyscale: number = 0;

// ─── Light Tables ──────────────────────────────────────────────────

/** Number of light levels. */
export const LIGHTLEVELS = 16;

/** Maximum light scale entries. */
export const MAXLIGHTSCALE = 48;

/** Maximum light Z entries for flats. */
export const MAXLIGHTZ = 128;

/** Number of colormaps (0-31 brightness + invuln + black). */
export const NUMCOLORMAPS = 32;

/** Distance map factor for light calculation. */
export const DISTMAP = 2;

/** Light Z shift. */
export const LIGHTZSHIFT = 20;

/** Light seg shift: converts sector light level to light table index. */
export const LIGHTSEGSHIFT = 4;

/**
 * 2D light scale table: [lightlevel][scale] -> colormap index.
 * Used for walls.
 */
export let scalelight: Int32Array[] = [];

/**
 * 2D light Z table: [lightlevel][distance] -> colormap index.
 * Used for floors/ceilings.
 */
export let zlight: Int32Array[] = [];

// ─── Table Generation ──────────────────────────────────────────────

/**
 * Initialize all rendering tables for the given viewport size.
 * Must be called after generateTables() from angles.ts.
 *
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 *
 * @example
 * ```typescript
 * generateTables();
 * initRenderTables(320, 200);
 * ```
 */
export function initRenderTables(width: number, height: number): void {
	viewwidth = width;
	viewheight = height;
	centerx = width / 2;
	centery = height / 2;
	centerxfrac = centerx * FRACUNIT;
	centeryfrac = centery * FRACUNIT;

	// projection = centerx / tan(FOV/2)
	// For 90-degree FOV, tan(45) = 1, so projection = centerx
	projection = centerxfrac;

	initViewAngleToX();
	initXToViewAngle(width);
	initDistScale(width);
	initYSlope(width, height);
	initFlatScales();
	initLightTables(width);
}

/**
 * Build viewangletox: maps fine angle index to screen X column.
 */
function initViewAngleToX(): void {
	viewangletox = new Int32Array(FINEANGLES / 2);

	for (let i = 0; i < FINEANGLES / 2; i++) {
		const t = finetangent[i];
		if (t === undefined) continue;
		let x: number;

		if (t > FRACUNIT * 2) {
			x = -1;
		} else if (t < -FRACUNIT * 2) {
			x = viewwidth + 1;
		} else {
			x = centerx - fixedMul(t, projection) / FRACUNIT;
			if (x < -1) x = -1;
			if (x > viewwidth + 1) x = viewwidth + 1;
		}
		viewangletox[i] = Math.round(x);
	}

	// Pad the table to avoid out-of-bounds during rendering
	for (let i = 0; i < FINEANGLES / 2; i++) {
		const val = viewangletox[i];
		if (val !== undefined && val === -1) viewangletox[i] = 0;
		if (val !== undefined && val === viewwidth + 1) viewangletox[i] = viewwidth;
	}
}

/**
 * Build xtoviewangle: maps screen X to view-relative BAM angle.
 */
function initXToViewAngle(width: number): void {
	xtoviewangle = new Uint32Array(width + 1);

	for (let x = 0; x <= width; x++) {
		let bestAngle = 0;
		let bestDist = width + 1;

		// Find the angle that maps closest to this X
		for (let i = 0; i < FINEANGLES / 2; i++) {
			const mappedX = viewangletox[i];
			if (mappedX === undefined) continue;
			const dist = Math.abs(mappedX - x);
			if (dist < bestDist) {
				bestDist = dist;
				bestAngle = i;
			}
		}

		// Convert fine angle index back to BAM
		// Fine angles in the first quadrant map to positive view angles
		// The tangent table is indexed from ANG270+ANG90 (= 0) through the view
		const angle = ((bestAngle << ANGLETOFINESHIFT) >>> 0);
		// Adjust so that center of screen = 0
		xtoviewangle[x] = ((ANG90 + (FINEANGLES / 4 - bestAngle) * (1 << ANGLETOFINESHIFT)) >>> 0);
	}
}

/**
 * Build distscale: cosine-based distance correction per column.
 */
function initDistScale(width: number): void {
	distscale = new Int32Array(width);

	for (let x = 0; x < width; x++) {
		const angle = xtoviewangle[x];
		if (angle === undefined) continue;
		const fineIdx = (angle >> ANGLETOFINESHIFT) & FINEMASK;
		const cos = finecosine[fineIdx];
		if (cos === undefined || cos === 0) {
			distscale[x] = FRACUNIT;
			continue;
		}
		distscale[x] = fixedDiv(FRACUNIT, Math.abs(cos));
	}
}

/**
 * Build yslope: maps screen Y to distance factor for flats.
 */
function initYSlope(width: number, height: number): void {
	yslope = new Int32Array(height);

	for (let y = 0; y < height; y++) {
		const dy = Math.abs(y - centery) + 1;
		// yslope[y] = (viewwidth / 2) / dy in fixed-point
		yslope[y] = fixedDiv((width / 2) * FRACUNIT, dy * FRACUNIT);
	}
}

/**
 * Compute base X/Y scales for flat texture mapping.
 */
function initFlatScales(): void {
	// basexscale = cos(viewangle) / centerx, baseyscale = -sin(viewangle) / centerx
	// At startup with viewangle=0 (east): cos=1, sin=0
	// These are recalculated per-frame in the actual renderer
	basexscale = fixedDiv(FRACUNIT, projection);
	baseyscale = fixedDiv(-FRACUNIT, projection);
}

/**
 * Build light tables for distance-based light diminishing.
 */
function initLightTables(width: number): void {
	// scalelight[lightlevel][scale] -> colormap index
	scalelight = [];
	for (let i = 0; i < LIGHTLEVELS; i++) {
		scalelight.push(new Int32Array(MAXLIGHTSCALE));
		const startmap = ((LIGHTLEVELS - 1 - i) * 2) * NUMCOLORMAPS / LIGHTLEVELS;
		for (let j = 0; j < MAXLIGHTSCALE; j++) {
			let level = Math.round(startmap - (j * width) / viewwidth / DISTMAP);
			if (level < 0) level = 0;
			if (level >= NUMCOLORMAPS) level = NUMCOLORMAPS - 1;
			scalelight[i]![j] = level;
		}
	}

	// zlight[lightlevel][distance] -> colormap index
	zlight = [];
	for (let i = 0; i < LIGHTLEVELS; i++) {
		zlight.push(new Int32Array(MAXLIGHTZ));
		const startmap = ((LIGHTLEVELS - 1 - i) * 2) * NUMCOLORMAPS / LIGHTLEVELS;
		for (let j = 0; j < MAXLIGHTZ; j++) {
			const scale = fixedDiv(width / 2 * FRACUNIT, (j + 1) << LIGHTZSHIFT);
			let level = Math.round(startmap - (scale >> (LIGHTSCALESHIFT - 1)));
			if (level < 0) level = 0;
			if (level >= NUMCOLORMAPS) level = NUMCOLORMAPS - 1;
			zlight[i]![j] = level;
		}
	}
}

const LIGHTSCALESHIFT = 12;
