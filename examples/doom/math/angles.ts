/**
 * Binary Angular Measurement (BAM) system matching the original Doom engine.
 *
 * Angles use the full 32-bit unsigned integer range for one revolution:
 * 0 = East, ANG90 = North, ANG180 = West, ANG270 = South.
 * Unsigned overflow handles wrapping automatically.
 *
 * @module math/angles
 */

// ─── Angle Constants ───────────────────────────────────────────────

/** 45 degrees in BAMs. */
export const ANG45 = 0x20000000;

/** 90 degrees in BAMs. */
export const ANG90 = 0x40000000;

/** 180 degrees in BAMs. */
export const ANG180 = 0x80000000;

/** 270 degrees in BAMs. */
export const ANG270 = 0xc0000000;

/** Number of fine angle entries. */
export const FINEANGLES = 8192;

/** Mask for fine angle index. */
export const FINEMASK = FINEANGLES - 1;

/** Shift to convert BAM angle to fine angle index. */
export const ANGLETOFINESHIFT = 19;

/** Size of the slope range table. */
export const SLOPERANGE = 2048;

/** Shift for light scale calculation. */
export const LIGHTSCALESHIFT = 12;

/** Shift for light level segmentation. */
export const LIGHTSEGSHIFT = 4;

// ─── Lookup Tables ─────────────────────────────────────────────────

/**
 * Fine sine table: 10240 entries (8192 sine + 2048 cosine overlap).
 * Values are 16.16 fixed-point.
 * Access cosine via finesine[angle + FINEANGLES/4].
 */
export const finesine: Int32Array = new Int32Array(10240);

/**
 * Fine cosine is just finesine offset by FINEANGLES/4 (2048).
 * This is a view into the same underlying buffer.
 */
export const finecosine: Int32Array = new Int32Array(
	finesine.buffer,
	(FINEANGLES / 4) * 4,
	FINEANGLES,
);

/**
 * Fine tangent table: FINEANGLES/2 entries (4096).
 * Values are 16.16 fixed-point.
 */
export const finetangent: Int32Array = new Int32Array(FINEANGLES / 2);

/**
 * Tangent to angle lookup: SLOPERANGE+1 entries (2049).
 * Maps slope ratios to BAM angles.
 */
export const tantoangle: Uint32Array = new Uint32Array(SLOPERANGE + 1);

// ─── Table Generation ──────────────────────────────────────────────

/**
 * Generate all trigonometric lookup tables.
 * Must be called once at startup before any rendering.
 *
 * @example
 * ```typescript
 * generateTables();
 * const sin45 = finesine[ANG45 >> ANGLETOFINESHIFT];
 * ```
 */
export function generateTables(): void {
	const FRACUNIT = 1 << 16;

	// Generate finesine (includes cosine overlap region)
	for (let i = 0; i < 10240; i++) {
		const angle = (i * 2 * Math.PI) / FINEANGLES;
		finesine[i] = Math.round(Math.sin(angle) * FRACUNIT);
	}

	// Generate finetangent
	for (let i = 0; i < FINEANGLES / 2; i++) {
		const angle = ((i - FINEANGLES / 4) * 2 * Math.PI) / FINEANGLES;
		const t = Math.tan(angle);
		// Clamp to avoid infinity
		finetangent[i] = Math.round(Math.max(-2147483647, Math.min(2147483647, t * FRACUNIT)));
	}

	// Generate tantoangle
	for (let i = 0; i <= SLOPERANGE; i++) {
		const slope = i / SLOPERANGE;
		const angle = Math.atan(slope);
		// Convert radians to BAM (angle is 0..PI/4, maps to 0..ANG45)
		tantoangle[i] = Math.round((angle / (Math.PI / 4)) * ANG45) >>> 0;
	}
}

// ─── Angle Utility Functions ───────────────────────────────────────

/**
 * Compute the angle from origin to point (x, y).
 * Equivalent to Doom's R_PointToAngle2 with (0,0) as source.
 *
 * @param x - X delta (fixed-point)
 * @param y - Y delta (fixed-point)
 * @returns BAM angle
 *
 * @example
 * ```typescript
 * const angle = pointToAngle(FRACUNIT, 0); // 0 (east)
 * const angle2 = pointToAngle(0, FRACUNIT); // ANG90 (north)
 * ```
 */
export function pointToAngle(x: number, y: number): number {
	if (x === 0 && y === 0) return 0;

	// Use atan2 and convert to BAM
	const rad = Math.atan2(y, x);
	// atan2 returns -PI..PI, convert to 0..2PI then to BAM
	const normalized = rad < 0 ? rad + 2 * Math.PI : rad;
	return (Math.round((normalized / (2 * Math.PI)) * 0x100000000) >>> 0);
}

/**
 * Compute angle from point (x1, y1) to point (x2, y2).
 *
 * @param x1 - Source X (fixed-point)
 * @param y1 - Source Y (fixed-point)
 * @param x2 - Target X (fixed-point)
 * @param y2 - Target Y (fixed-point)
 * @returns BAM angle from source to target
 */
export function pointToAngle2(x1: number, y1: number, x2: number, y2: number): number {
	return pointToAngle(x2 - x1, y2 - y1);
}

/**
 * Convert BAM angle to radians.
 *
 * @param bam - BAM angle (32-bit unsigned)
 * @returns Angle in radians
 */
export function bamToRadians(bam: number): number {
	return ((bam >>> 0) / 0x100000000) * 2 * Math.PI;
}

/**
 * Convert radians to BAM angle.
 *
 * @param rad - Angle in radians
 * @returns BAM angle (32-bit unsigned)
 */
export function radiansToBam(rad: number): number {
	const normalized = ((rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	return (Math.round((normalized / (2 * Math.PI)) * 0x100000000) >>> 0);
}

/**
 * Get the absolute difference between two angles.
 * Handles wrapping correctly.
 *
 * @param a - First BAM angle
 * @param b - Second BAM angle
 * @returns Unsigned angular distance (0 to ANG180)
 */
export function angleDiff(a: number, b: number): number {
	const diff = ((a - b) >>> 0);
	if (diff > ANG180) return (0x100000000 - diff) >>> 0;
	return diff;
}
