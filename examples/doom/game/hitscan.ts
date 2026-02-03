/**
 * Hitscan line attack for weapon firing.
 *
 * Traces a line from the player through the blockmap checking for
 * monster hits and wall collisions. Implements a simplified version
 * of Doom's P_AimLineAttack and P_LineAttack from p_map.c.
 *
 * @module game/hitscan
 */

import {
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import type { Mobj } from './mobj.js';
import { MobjFlags } from './mobj.js';
import type { PlayerState } from './player.js';
import { damageMobjWithState } from './thinkers.js';

// ─── Constants ───────────────────────────────────────────────────

/** Maximum hitscan range in fixed-point (2048 map units). */
const MISSILERANGE = 2048 * FRACUNIT;

/** Melee range in fixed-point (64 map units). */
const MELEERANGE = 64 * FRACUNIT;

/** Hitscan step size for line tracing (map units). */
const TRACE_STEP = 32;

// ─── Hitscan Result ──────────────────────────────────────────────

/** Result of a hitscan trace. */
export interface HitscanResult {
	/** Whether something was hit. */
	hit: boolean;
	/** The mobj that was hit (null if wall or miss). */
	mobj: Mobj | null;
	/** Distance to the hit point (fixed-point). */
	distance: number;
}

// ─── Hitscan Attack ──────────────────────────────────────────────

/**
 * Fire a hitscan attack from the player.
 *
 * Traces a line from the player's position in the direction of
 * the player's angle (with optional spread). Checks for monster
 * hits along the line, applying damage to the first target found.
 *
 * @param player - Player firing the weapon
 * @param map - Map data for wall collision
 * @param mobjs - All map objects to check for hits
 * @param damage - Damage to apply on hit
 * @param spread - Angle spread in BAM (0 for perfectly accurate)
 * @returns Hitscan result
 */
export function fireHitscan(
	player: PlayerState,
	map: MapData,
	mobjs: Mobj[],
	damage: number,
	spread: number,
): HitscanResult {
	// Apply random spread
	let angle = player.angle;
	if (spread > 0) {
		const spreadAmount = ((Math.random() - 0.5) * 2 * spread) | 0;
		angle = ((angle + spreadAmount) >>> 0);
	}

	const fineAngle = (angle >> ANGLETOFINESHIFT) & FINEMASK;
	const cos = finecosine[fineAngle] ?? FRACUNIT;
	const sin = finesine[fineAngle] ?? 0;

	// Trace from player position
	const startX = player.x;
	const startY = player.y;

	// Check each mobj for intersection with the hitscan line
	let closestDist = MISSILERANGE;
	let closestMobj: Mobj | null = null;

	for (const mobj of mobjs) {
		if (!mobj.alive) continue;
		if (!(mobj.flags & MobjFlags.MF_SHOOTABLE)) continue;

		// Vector from player to mobj
		const dx = mobj.x - startX;
		const dy = mobj.y - startY;

		// Project mobj onto the hitscan line
		// dot = dx * cos + dy * sin (in fixed-point)
		const dot = fixedMul(dx, cos) + fixedMul(dy, sin);

		// Skip if behind player
		if (dot <= 0) continue;

		// Skip if beyond range
		if (dot >= closestDist) continue;

		// Perpendicular distance from mobj center to the hitscan line
		// cross = dx * sin - dy * cos
		const cross = fixedMul(dx, sin) - fixedMul(dy, cos);
		const absCross = Math.abs(cross);

		// Check if the line passes within the mobj's radius
		if (absCross > mobj.radius) continue;

		// Also check vertical (simplified: just check Z range)
		const playerZ = player.viewz;
		const mobjTopZ = mobj.z + mobj.height;
		const mobjBottomZ = mobj.z;
		if (playerZ > mobjTopZ + (16 << FRACBITS)) continue;
		if (playerZ < mobjBottomZ - (16 << FRACBITS)) continue;

		closestDist = dot;
		closestMobj = mobj;
	}

	if (closestMobj) {
		// Apply damage
		damageMobjWithState(closestMobj, damage);
		return { hit: true, mobj: closestMobj, distance: closestDist };
	}

	// Check for wall hit (simplified: just check if we hit a wall within range)
	const wallDist = traceToWall(startX, startY, cos, sin, map, MISSILERANGE);

	return { hit: wallDist < MISSILERANGE, mobj: null, distance: wallDist };
}

/**
 * Fire a melee attack (fist/chainsaw).
 *
 * @param player - Player attacking
 * @param mobjs - All map objects to check
 * @param damage - Damage to apply
 * @returns Hitscan result (only hits within melee range)
 */
export function fireMelee(
	player: PlayerState,
	mobjs: Mobj[],
	damage: number,
): HitscanResult {
	const fineAngle = (player.angle >> ANGLETOFINESHIFT) & FINEMASK;
	const cos = finecosine[fineAngle] ?? FRACUNIT;
	const sin = finesine[fineAngle] ?? 0;

	let closestDist = MELEERANGE;
	let closestMobj: Mobj | null = null;

	for (const mobj of mobjs) {
		if (!mobj.alive) continue;
		if (!(mobj.flags & MobjFlags.MF_SHOOTABLE)) continue;

		const dx = mobj.x - player.x;
		const dy = mobj.y - player.y;
		const dot = fixedMul(dx, cos) + fixedMul(dy, sin);

		if (dot <= 0 || dot >= closestDist) continue;

		const cross = fixedMul(dx, sin) - fixedMul(dy, cos);
		if (Math.abs(cross) > mobj.radius + (16 << FRACBITS)) continue;

		closestDist = dot;
		closestMobj = mobj;
	}

	if (closestMobj) {
		damageMobjWithState(closestMobj, damage);
		return { hit: true, mobj: closestMobj, distance: closestDist };
	}

	return { hit: false, mobj: null, distance: MELEERANGE };
}

// ─── Wall Trace ──────────────────────────────────────────────────

/**
 * Trace a line to find the first wall hit.
 * Steps along the line checking blockmap cells for blocking linedefs.
 */
function traceToWall(
	startX: number,
	startY: number,
	cos: number,
	sin: number,
	map: MapData,
	maxRange: number,
): number {
	const bmap = map.blockmap;
	const stepX = fixedMul(TRACE_STEP << FRACBITS, cos);
	const stepY = fixedMul(TRACE_STEP << FRACBITS, sin);

	let x = startX;
	let y = startY;
	let dist = 0;
	const stepDist = TRACE_STEP << FRACBITS;

	while (dist < maxRange) {
		x += stepX;
		y += stepY;
		dist += stepDist;

		const mapX = (x >> FRACBITS) - bmap.header.originX;
		const mapY = (y >> FRACBITS) - bmap.header.originY;
		const cellX = Math.floor(mapX / 128);
		const cellY = Math.floor(mapY / 128);

		if (cellX < 0 || cellX >= bmap.header.columns) return dist;
		if (cellY < 0 || cellY >= bmap.header.rows) return dist;

		const cellIndex = cellY * bmap.header.columns + cellX;
		const offset = bmap.offsets[cellIndex];
		if (offset === undefined) continue;

		let pos = offset * 2;
		if (pos + 2 > bmap.data.byteLength) continue;
		const first = bmap.data.getInt16(pos, true);
		if (first !== 0) continue;
		pos += 2;

		for (;;) {
			if (pos + 2 > bmap.data.byteLength) break;
			const lineIdx = bmap.data.getInt16(pos, true);
			if (lineIdx === -1) break;
			pos += 2;

			const linedef = map.linedefs[lineIdx];
			if (!linedef) continue;

			// One-sided lines always block
			if (!(linedef.flags & 4)) { // not ML_TWOSIDED
				return dist;
			}
		}
	}

	return maxRange;
}
