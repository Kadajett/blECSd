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
	finecosine,
	finesine,
	finetangent,
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
 * xtoviewangle[centerx] ~= 0 (straight ahead).
 * xtoviewangle[0] = clipangle (leftmost visible angle).
 */
export let xtoviewangle: Uint32Array = new Uint32Array(0);

/**
 * Half-FOV clipping angle: the view-relative angle of the leftmost screen column.
 * Used for FOV clipping in addLine and checkBBox.
 * For a 90-degree FOV this is approximately ANG45.
 */
export let clipangle: number = 0;

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
	centerx = Math.floor(width / 2);
	centery = Math.floor(height / 2);
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
 * Matches R_InitTextureMapping from r_main.c.
 *
 * The finetangent table is indexed 0..FINEANGLES/2-1 and maps angles
 * from the right edge of the FOV through center to the left edge.
 * We compute which screen column each angle projects to.
 */
function initViewAngleToX(): void {
	viewangletox = new Int32Array(FINEANGLES / 2);

	// focallength = centerx / tan(FOV/2)
	// For 90-degree FOV: tan(45) = FRACUNIT, so focallength = centerxfrac
	const focallength = centerxfrac;

	for (let i = 0; i < FINEANGLES / 2; i++) {
		const t = finetangent[i];
		if (t === undefined) continue;
		let x: number;

		if (t > FRACUNIT * 2) {
			x = -1;
		} else if (t < -FRACUNIT * 2) {
			x = viewwidth + 1;
		} else {
			// Ceiling division matching original Doom:
			// t = FixedMul(finetangent[i], focallength);
			// t = (centerxfrac - t + FRACUNIT - 1) >> FRACBITS;
			const tx = fixedMul(t, focallength);
			x = (centerxfrac - tx + FRACUNIT - 1) >> FRACBITS;

			if (x < -1) x = -1;
			else if (x > viewwidth + 1) x = viewwidth + 1;
		}
		viewangletox[i] = x;
	}

	// Fencepost clamping: must happen here (before xtoviewangle is built)
	// so that the xtoviewangle scan sees clamped 0/viewwidth instead of
	// -1/viewwidth+1 sentinel values at the screen edges.
	for (let i = 0; i < FINEANGLES / 2; i++) {
		if (viewangletox[i] === -1) viewangletox[i] = 0;
		else if (viewangletox[i] === viewwidth + 1) viewangletox[i] = viewwidth;
	}
}

/**
 * Build xtoviewangle: maps screen X to view-relative BAM angle.
 * Matches R_InitTextureMapping from r_main.c.
 *
 * Scans viewangletox to find the smallest view angle that maps to each X.
 * Formula: xtoviewangle[x] = (i << ANGLETOFINESHIFT) - ANG90
 * This gives 0 for the center column, positive angles going left,
 * negative angles going right.
 */
function initXToViewAngle(width: number): void {
	xtoviewangle = new Uint32Array(width + 1);

	for (let x = 0; x <= width; x++) {
		// Find first i where viewangletox[i] <= x
		let i = 0;
		while (i < FINEANGLES / 2 && (viewangletox[i] ?? 0) > x) {
			i++;
		}
		// Convert fine angle index to view-relative BAM
		xtoviewangle[x] = (((i << ANGLETOFINESHIFT) - ANG90) >>> 0);
	}

	// Set clipangle from the leftmost visible column angle
	clipangle = xtoviewangle[0] ?? 0;
}

/**
 * Build distscale: cosine-based distance correction per column.
 * Matches R_InitTextureMapping from r_main.c:
 *   cosadj = abs(finecosine[xtoviewangle[i] >> ANGLETOFINESHIFT]);
 *   distscale[i] = FixedDiv(FRACUNIT, cosadj);
 */
function initDistScale(width: number): void {
	distscale = new Int32Array(width);

	for (let x = 0; x < width; x++) {
		const angle = xtoviewangle[x] ?? 0;
		const cosadj = Math.abs(finecosine[(angle >> ANGLETOFINESHIFT) & FINEMASK] ?? FRACUNIT);
		if (cosadj === 0) {
			distscale[x] = FRACUNIT;
			continue;
		}
		distscale[x] = fixedDiv(FRACUNIT, cosadj);
	}
}

/**
 * Build yslope: maps screen Y to distance factor for flats.
 * Matches r_main.c:
 *   dy = ((i - viewheight/2) << FRACBITS) + FRACUNIT/2;
 *   dy = abs(dy);
 *   yslope[i] = FixedDiv((viewwidth << detailshift)/2 * FRACUNIT, dy);
 */
function initYSlope(width: number, height: number): void {
	yslope = new Int32Array(height);

	for (let y = 0; y < height; y++) {
		let dy = ((y - Math.floor(height / 2)) << FRACBITS) + (FRACUNIT >> 1);
		dy = Math.abs(dy);
		if (dy === 0) dy = 1;
		yslope[y] = fixedDiv((width / 2) * FRACUNIT, dy);
	}
}

/**
 * Initialize flat scales to defaults (called once during table init).
 */
function initFlatScales(): void {
	updateFlatScales(0);
}

/**
 * Recalculate basexscale/baseyscale for the current view angle.
 * Must be called each frame before rendering floors/ceilings.
 * Matches R_ClearPlanes from r_plane.c:
 *   angle = (viewangle - ANG90) >> ANGLETOFINESHIFT;
 *   basexscale = FixedDiv(finecosine[angle], centerxfrac);
 *   baseyscale = -FixedDiv(finesine[angle], centerxfrac);
 *
 * @param viewangle - Current view direction (BAM)
 */
export function updateFlatScales(viewangle: number): void {
	const angle = (((viewangle - ANG90) >>> 0) >> ANGLETOFINESHIFT) & FINEMASK;
	const cos = finecosine[angle] ?? FRACUNIT;
	const sin = finesine[angle] ?? 0;
	basexscale = fixedDiv(cos, centerxfrac);
	baseyscale = -fixedDiv(sin, centerxfrac);
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
