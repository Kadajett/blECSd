/**
 * Line of sight checking for monster AI.
 *
 * Determines whether one mobj can see another by tracing a line
 * through the BSP and checking for blocking geometry. Uses the
 * REJECT table for fast preliminary rejection.
 *
 * @module game/sight
 */

import { FRACBITS } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import type { Mobj } from './mobj.js';
import type { PlayerState } from './player.js';

// ─── Line of Sight Check ─────────────────────────────────────────

/**
 * Check if a monster can see the player.
 *
 * Traces a line from the mobj to the player through the blockmap
 * to check for blocking one-sided linedefs.
 *
 * @param mobj - The monster checking sight
 * @param player - The player to check visibility of
 * @param map - Map data for geometry
 * @returns true if the mobj has line of sight to the player
 */
export function checkSight(
	mobj: Mobj,
	player: PlayerState,
	map: MapData,
): boolean {
	// Trace a line from mobj to player through blockmap
	return traceLineOfSight(
		mobj.x, mobj.y,
		player.x, player.y,
		map,
	);
}

/**
 * Trace a line between two points checking for blocking walls.
 *
 * Steps through blockmap cells along the line and checks each
 * one-sided linedef for intersection. Uses a simple DDA approach.
 */
function traceLineOfSight(
	x1: number, y1: number,
	x2: number, y2: number,
	map: MapData,
): boolean {
	const bmap = map.blockmap;

	// Convert to blockmap coordinates
	const bmapX1 = (x1 >> FRACBITS) - bmap.header.originX;
	const bmapY1 = (y1 >> FRACBITS) - bmap.header.originY;
	const bmapX2 = (x2 >> FRACBITS) - bmap.header.originX;
	const bmapY2 = (y2 >> FRACBITS) - bmap.header.originY;

	const cellX1 = Math.floor(bmapX1 / 128);
	const cellY1 = Math.floor(bmapY1 / 128);
	const cellX2 = Math.floor(bmapX2 / 128);
	const cellY2 = Math.floor(bmapY2 / 128);

	// Step through cells using Bresenham-style line walk
	const dx = Math.abs(cellX2 - cellX1);
	const dy = Math.abs(cellY2 - cellY1);
	const sx = cellX1 < cellX2 ? 1 : -1;
	const sy = cellY1 < cellY2 ? 1 : -1;
	let err = dx - dy;

	let cx = cellX1;
	let cy = cellY1;

	for (;;) {
		// Check this blockmap cell for blocking lines
		if (!checkBlockmapCell(cx, cy, x1, y1, x2, y2, map)) {
			return false;
		}

		if (cx === cellX2 && cy === cellY2) break;

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy += sy;
		}
	}

	return true;
}

/**
 * Check a single blockmap cell for lines that block the sight line.
 */
function checkBlockmapCell(
	cellX: number, cellY: number,
	x1: number, y1: number,
	x2: number, y2: number,
	map: MapData,
): boolean {
	const bmap = map.blockmap;
	if (cellX < 0 || cellX >= bmap.header.columns) return true;
	if (cellY < 0 || cellY >= bmap.header.rows) return true;

	const cellIndex = cellY * bmap.header.columns + cellX;
	const offset = bmap.offsets[cellIndex];
	if (offset === undefined) return true;

	let pos = offset * 2;
	if (pos + 2 > bmap.data.byteLength) return true;

	// Skip leading 0x0000
	const first = bmap.data.getInt16(pos, true);
	if (first !== 0) return true;
	pos += 2;

	for (;;) {
		if (pos + 2 > bmap.data.byteLength) break;
		const lineIdx = bmap.data.getInt16(pos, true);
		if (lineIdx === -1) break;
		pos += 2;

		const linedef = map.linedefs[lineIdx];
		if (!linedef) continue;

		// Only one-sided lines block sight
		if (linedef.flags & 4) continue; // ML_TWOSIDED: skip two-sided lines

		const v1 = map.vertexes[linedef.v1];
		const v2 = map.vertexes[linedef.v2];
		if (!v1 || !v2) continue;

		// Check if the sight line crosses this linedef
		if (linesCross(
			x1 >> FRACBITS, y1 >> FRACBITS,
			x2 >> FRACBITS, y2 >> FRACBITS,
			v1.x, v1.y, v2.x, v2.y,
		)) {
			return false;
		}
	}

	return true;
}

/**
 * Check if two line segments cross each other.
 * Uses cross-product side tests.
 */
function linesCross(
	ax1: number, ay1: number, ax2: number, ay2: number,
	bx1: number, by1: number, bx2: number, by2: number,
): boolean {
	const dax = ax2 - ax1;
	const day = ay2 - ay1;
	const dbx = bx2 - bx1;
	const dby = by2 - by1;

	const s1 = dax * (by1 - ay1) - day * (bx1 - ax1);
	const s2 = dax * (by2 - ay1) - day * (bx2 - ax1);

	if ((s1 > 0 && s2 > 0) || (s1 < 0 && s2 < 0)) return false;

	const s3 = dbx * (ay1 - by1) - dby * (ax1 - bx1);
	const s4 = dbx * (ay2 - by1) - dby * (ax2 - bx1);

	if ((s3 > 0 && s4 > 0) || (s3 < 0 && s4 < 0)) return false;

	return true;
}
