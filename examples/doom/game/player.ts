/**
 * Player state and movement with collision detection.
 *
 * Handles WASD movement, arrow key rotation, and blockmap-based
 * wall collision with sliding.
 *
 * @module game/player
 */

import {
	ANG90,
	ANG180,
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import type { InputState } from './input.js';

// ─── Player State ──────────────────────────────────────────────────

/** Mutable player state. */
export interface PlayerState {
	/** Position (fixed-point). */
	x: number;
	y: number;
	z: number;

	/** View angle (BAM). */
	angle: number;

	/** View height offset for bobbing. */
	viewz: number;
	viewheight: number;
	deltaviewheight: number;

	/** Movement momentum (fixed-point). */
	momx: number;
	momy: number;

	/** Player stats. */
	health: number;
	armor: number;
	ammo: number;
	maxAmmo: number;

	/** Movement speeds (fixed-point). */
	forwardSpeed: number;
	sideSpeed: number;
	turnSpeed: number;

	/** Sector the player is currently in. */
	sectorIndex: number;
}

/**
 * Create initial player state from a map thing.
 *
 * @param map - Map data (for finding the player start thing type 1)
 * @returns Player state positioned at the player start
 */
export function createPlayer(map: MapData): PlayerState {
	// Find player start (thing type 1)
	const start = map.things.find((t) => t.type === 1);
	const startX = start ? start.x : 0;
	const startY = start ? start.y : 0;
	const startAngle = start ? start.angle : 0;

	// Convert angle: Doom uses degrees (0=East, 90=North)
	const bam = ((startAngle / 360) * 0x100000000) >>> 0;

	// Find the sector at the start position
	const sectorIndex = findSectorAt(map, startX, startY);
	const sector = map.sectors[sectorIndex];
	const floorHeight = sector ? sector.floorHeight : 0;

	return {
		x: startX << FRACBITS,
		y: startY << FRACBITS,
		z: floorHeight << FRACBITS,
		angle: bam,
		viewz: (floorHeight + 41) << FRACBITS, // 41 = player eye height
		viewheight: 41 << FRACBITS,
		deltaviewheight: 0,
		momx: 0,
		momy: 0,
		health: 100,
		armor: 0,
		ammo: 50,
		maxAmmo: 200,
		forwardSpeed: 25 * 2048, // Doom walking forwardmove * 2048
		sideSpeed: 24 * 2048, // Doom walking sidemove * 2048
		turnSpeed: 1280 << 16, // Doom normal angleturn << 16
		sectorIndex,
	};
}

/**
 * Process one tick of player movement from input.
 *
 * @param player - Mutable player state
 * @param input - Current frame input
 * @param map - Map data for collision
 */
export function updatePlayer(
	player: PlayerState,
	input: InputState,
	map: MapData,
): void {
	// Rotation
	if (input.keys.has('left') || input.keys.has('a')) {
		player.angle = ((player.angle + player.turnSpeed) >>> 0);
	}
	if (input.keys.has('right') || input.keys.has('d')) {
		player.angle = ((player.angle - player.turnSpeed) >>> 0);
	}

	// Forward/backward movement
	const fineAngle = (player.angle >> ANGLETOFINESHIFT) & FINEMASK;
	const cos = finecosine[fineAngle] ?? FRACUNIT;
	const sin = finesine[fineAngle] ?? 0;

	let moveX = 0;
	let moveY = 0;

	if (input.keys.has('up') || input.keys.has('w')) {
		moveX += fixedMul(cos, player.forwardSpeed);
		moveY += fixedMul(sin, player.forwardSpeed);
	}
	if (input.keys.has('down') || input.keys.has('s')) {
		moveX -= fixedMul(cos, player.forwardSpeed);
		moveY -= fixedMul(sin, player.forwardSpeed);
	}

	// Strafe (Q/E for strafe, or use A/D with arrows for turning)
	if (input.keys.has('q') || input.keys.has(',')) {
		const strafeAngle = ((player.angle + ANG90) >>> 0);
		const sfine = (strafeAngle >> ANGLETOFINESHIFT) & FINEMASK;
		moveX += fixedMul(finecosine[sfine] ?? FRACUNIT, player.sideSpeed);
		moveY += fixedMul(finesine[sfine] ?? 0, player.sideSpeed);
	}
	if (input.keys.has('e') || input.keys.has('.')) {
		const strafeAngle = ((player.angle - ANG90) >>> 0);
		const sfine = (strafeAngle >> ANGLETOFINESHIFT) & FINEMASK;
		moveX += fixedMul(finecosine[sfine] ?? FRACUNIT, player.sideSpeed);
		moveY += fixedMul(finesine[sfine] ?? 0, player.sideSpeed);
	}

	// Try to move with collision detection
	if (moveX !== 0 || moveY !== 0) {
		tryMove(player, moveX, moveY, map);
	}

	// Update view height (snap to floor)
	player.sectorIndex = findSectorAt(map, player.x >> FRACBITS, player.y >> FRACBITS);
	const sector = map.sectors[player.sectorIndex];
	if (sector) {
		player.z = sector.floorHeight << FRACBITS;
		player.viewz = player.z + player.viewheight;
	}
}

// ─── Collision Detection ───────────────────────────────────────────

/** Maximum step-up height in map units. */
const MAX_STEP_HEIGHT = 24;

/** Player bounding box radius in fixed-point. */
const PLAYER_RADIUS = 16 << FRACBITS;

/**
 * Try to move the player, checking for wall collisions.
 * Implements wall sliding: if blocked in one axis, try the other.
 */
function tryMove(
	player: PlayerState,
	dx: number,
	dy: number,
	map: MapData,
): void {
	const newX = player.x + dx;
	const newY = player.y + dy;

	// Try full movement
	if (checkPosition(newX, newY, player, map)) {
		player.x = newX;
		player.y = newY;
		return;
	}

	// Wall sliding: try X only
	if (dx !== 0 && checkPosition(player.x + dx, player.y, player, map)) {
		player.x = player.x + dx;
		return;
	}

	// Wall sliding: try Y only
	if (dy !== 0 && checkPosition(player.x, player.y + dy, player, map)) {
		player.y = player.y + dy;
	}
}

/**
 * Check if the player can occupy the given position.
 * Tests against blocking linedefs in nearby blockmap cells.
 */
function checkPosition(
	x: number,
	y: number,
	player: PlayerState,
	map: MapData,
): boolean {
	const bmap = map.blockmap;
	const mapX = (x >> FRACBITS) - bmap.header.originX;
	const mapY = (y >> FRACBITS) - bmap.header.originY;

	// Check a 3x3 grid of blockmap cells around the player
	const cellX = Math.floor(mapX / 128);
	const cellY = Math.floor(mapY / 128);

	for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
		for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
			if (cx < 0 || cx >= bmap.header.columns) continue;
			if (cy < 0 || cy >= bmap.header.rows) continue;

			const cellIndex = cy * bmap.header.columns + cx;
			const offset = bmap.offsets[cellIndex];
			if (offset === undefined) continue;

			// Read linedefs from blockmap cell
			let pos = offset * 2;
			// Skip leading 0x0000
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

				// Only check blocking lines
				if (!(linedef.flags & 1)) continue; // ML_BLOCKING

				const v1 = map.vertexes[linedef.v1];
				const v2 = map.vertexes[linedef.v2];
				if (!v1 || !v2) continue;

				// Check if player bbox crosses this line
				if (lineCrossesBBox(
					v1.x << FRACBITS, v1.y << FRACBITS,
					v2.x << FRACBITS, v2.y << FRACBITS,
					x, y, PLAYER_RADIUS,
				)) {
					// For two-sided lines, check step height
					if (linedef.flags & 4) { // ML_TWOSIDED
						const frontSide = map.sidedefs[linedef.frontSidedef];
						const backSide = map.sidedefs[linedef.backSidedef];
						if (frontSide && backSide) {
							const frontSector = map.sectors[frontSide.sector];
							const backSector = map.sectors[backSide.sector];
							if (frontSector && backSector) {
								const stepUp = Math.abs(frontSector.floorHeight - backSector.floorHeight);
								if (stepUp <= MAX_STEP_HEIGHT) continue; // can step up
							}
						}
					}
					return false;
				}
			}
		}
	}

	return true;
}

/**
 * Check if a line segment crosses a bounding box centered at (cx, cy).
 */
function lineCrossesBBox(
	x1: number, y1: number,
	x2: number, y2: number,
	cx: number, cy: number,
	radius: number,
): boolean {
	// Simple AABB test: does the line pass within `radius` of the center point?
	const left = cx - radius;
	const right = cx + radius;
	const bottom = cy - radius;
	const top = cy + radius;

	// Check if line segment intersects the AABB
	const dx = x2 - x1;
	const dy = y2 - y1;

	// Parametric line-box intersection
	let tmin = 0;
	let tmax = FRACUNIT;

	if (dx !== 0) {
		const invDx = FRACUNIT / (dx / FRACUNIT);
		let t1 = ((left - x1) / FRACUNIT) * invDx;
		let t2 = ((right - x1) / FRACUNIT) * invDx;
		if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
		tmin = Math.max(tmin, t1);
		tmax = Math.min(tmax, t2);
		if (tmin > tmax) return false;
	} else {
		if (x1 < left || x1 > right) return false;
	}

	if (dy !== 0) {
		const invDy = FRACUNIT / (dy / FRACUNIT);
		let t1 = ((bottom - y1) / FRACUNIT) * invDy;
		let t2 = ((top - y1) / FRACUNIT) * invDy;
		if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
		tmin = Math.max(tmin, t1);
		tmax = Math.min(tmax, t2);
		if (tmin > tmax) return false;
	} else {
		if (y1 < bottom || y1 > top) return false;
	}

	return true;
}

// ─── Sector Lookup ─────────────────────────────────────────────────

/**
 * Find which sector contains a point by checking BSP subsectors.
 * Simple linear search through subsectors for now.
 *
 * @param map - Map data
 * @param x - X coordinate (map units, not fixed-point)
 * @param y - Y coordinate (map units, not fixed-point)
 * @returns Sector index, or 0 if not found
 */
export function findSectorAt(map: MapData, x: number, y: number): number {
	// Walk BSP tree to find the subsector containing the point
	if (map.nodes.length === 0) {
		return map.subsectors[0] ? findSubsectorSector(map, 0) : 0;
	}

	let nodeId = map.nodes.length - 1;

	for (;;) {
		if (nodeId & 0x8000) {
			const ssIdx = nodeId & 0x7fff;
			return findSubsectorSector(map, ssIdx);
		}

		const node = map.nodes[nodeId];
		if (!node) return 0;

		// Determine side using cross product
		const dx = x - node.x;
		const dy = y - node.y;
		const cross = dx * node.dy - dy * node.dx;

		if (cross >= 0) {
			nodeId = node.rightChild;
		} else {
			nodeId = node.leftChild;
		}
	}
}

/**
 * Get the sector index for a subsector.
 */
function findSubsectorSector(map: MapData, subsectorIndex: number): number {
	const ss = map.subsectors[subsectorIndex];
	if (!ss) return 0;

	const seg = map.segs[ss.firstSeg];
	if (!seg) return 0;

	const linedef = map.linedefs[seg.linedef];
	if (!linedef) return 0;

	const sidedefIndex = seg.side === 0 ? linedef.frontSidedef : linedef.backSidedef;
	const sidedef = map.sidedefs[sidedefIndex];
	if (!sidedef) return 0;

	return sidedef.sector;
}
