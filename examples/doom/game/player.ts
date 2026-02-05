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
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import { NF_SUBSECTOR, type MapData } from '../wad/types.js';
import type { InputState } from './input.js';

// ─── Movement Constants ─────────────────────────────────────────────

/**
 * Ground friction factor (fixed-point).
 * Matches Doom's FRICTION = 0xE800 (~0.906 per tic).
 * Each tic, momentum is multiplied by this value.
 */
export const FRICTION = 0xe800;

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
 * Apply thrust in a given direction to player momentum.
 * Matches Doom's P_Thrust: adds to momx/momy based on angle.
 *
 * @param player - Mutable player state
 * @param angle - BAM angle for thrust direction
 * @param thrust - Thrust magnitude (fixed-point)
 */
export function thrustPlayer(player: PlayerState, angle: number, thrust: number): void {
	const fineAngle = (angle >> ANGLETOFINESHIFT) & FINEMASK;
	player.momx += fixedMul(thrust, finecosine[fineAngle] ?? FRACUNIT);
	player.momy += fixedMul(thrust, finesine[fineAngle] ?? 0);
}

/**
 * Process one tick of player movement from input.
 * Uses thrust-based movement: input adds to momentum, friction decays it.
 * Matches Doom's P_MovePlayer + P_XYMovement approach.
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

	// Apply thrust from input (adds to momentum)
	if (input.keys.has('up') || input.keys.has('w')) {
		thrustPlayer(player, player.angle, player.forwardSpeed);
	}
	if (input.keys.has('down') || input.keys.has('s')) {
		thrustPlayer(player, ((player.angle + 0x80000000) >>> 0), player.forwardSpeed);
	}

	// Strafe thrust (Q/E for strafe)
	if (input.keys.has('q') || input.keys.has(',')) {
		thrustPlayer(player, ((player.angle + ANG90) >>> 0), player.sideSpeed);
	}
	if (input.keys.has('e') || input.keys.has('.')) {
		thrustPlayer(player, ((player.angle - ANG90) >>> 0), player.sideSpeed);
	}

	// Apply momentum with collision detection
	if (player.momx !== 0 || player.momy !== 0) {
		xyMovement(player, map);
	}

	// Update view height (snap to floor)
	player.sectorIndex = findSectorAt(map, player.x >> FRACBITS, player.y >> FRACBITS);
	const sector = map.sectors[player.sectorIndex];
	if (sector) {
		player.z = sector.floorHeight << FRACBITS;
		player.viewz = player.z + player.viewheight;
	}
}

/**
 * Apply player XY momentum with collision and friction.
 * Matches Doom's P_XYMovement: moves in steps, applies friction.
 */
function xyMovement(player: PlayerState, map: MapData): void {
	// Try to move by full momentum amount
	tryMove(player, player.momx, player.momy, map);

	// Apply ground friction
	player.momx = fixedMul(player.momx, FRICTION);
	player.momy = fixedMul(player.momy, FRICTION);

	// Kill very small momentum to prevent drift
	if (Math.abs(player.momx) < 0x1000) player.momx = 0;
	if (Math.abs(player.momy) < 0x1000) player.momy = 0;
}

// ─── Collision Detection ───────────────────────────────────────────

/** Maximum step-up height in map units (matches Doom's MAXSTEPHEIGHT). */
const MAX_STEP_HEIGHT = 24;

/** Player height in map units (matches Doom's VIEWHEIGHT + margin). */
const PLAYER_HEIGHT = 56;

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
					// For two-sided lines, check step height and ceiling opening
					// Matches Doom's P_CheckPosition opening checks
					if (linedef.flags & 4) { // ML_TWOSIDED
						const frontSide = map.sidedefs[linedef.frontSidedef];
						const backSide = map.sidedefs[linedef.backSidedef];
						if (frontSide && backSide) {
							const frontSector = map.sectors[frontSide.sector];
							const backSector = map.sectors[backSide.sector];
							if (frontSector && backSector) {
								// Opening: lowest ceiling and highest floor
								const openTop = Math.min(frontSector.ceilingHeight, backSector.ceilingHeight);
								const openBottom = Math.max(frontSector.floorHeight, backSector.floorHeight);

								// Check ceiling gap is tall enough for player
								if (openTop - openBottom < PLAYER_HEIGHT) {
									return false;
								}

								// Directional step-up: only allow stepping UP by MAX_STEP_HEIGHT
								const playerFloor = player.z >> FRACBITS;
								if (openBottom - playerFloor <= MAX_STEP_HEIGHT) continue;
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
 * Uses Doom's P_BoxOnLineSide approach: check which side of the line
 * each bbox corner is on using cross products (integer arithmetic).
 * If corners are on different sides, the line crosses the bbox.
 *
 * @returns true if the line crosses or touches the bbox
 */
function lineCrossesBBox(
	x1: number, y1: number,
	x2: number, y2: number,
	cx: number, cy: number,
	radius: number,
): boolean {
	const left = cx - radius;
	const right = cx + radius;
	const bottom = cy - radius;
	const top = cy + radius;

	// Line direction vector
	const ldx = x2 - x1;
	const ldy = y2 - y1;

	// Cross product: (corner - lineStart) x lineDir
	// Positive = left side, negative = right side
	// Check the two bbox corners that are most likely to be on opposite sides
	// based on the line direction (matching Doom's P_BoxOnLineSide).

	let corner1x: number;
	let corner1y: number;
	let corner2x: number;
	let corner2y: number;

	if (ldx > 0) {
		corner1x = left;
		corner2x = right;
	} else {
		corner1x = right;
		corner2x = left;
	}

	if (ldy > 0) {
		corner1y = bottom;
		corner2y = top;
	} else {
		corner1y = top;
		corner2y = bottom;
	}

	// Use 64-bit-safe cross products by shifting down to avoid overflow.
	// Cross = (px - x1) * ldy - (py - y1) * ldx
	const shift = FRACBITS;
	const ldxS = ldx >> shift;
	const ldyS = ldy >> shift;

	const d1x = (corner1x - x1) >> shift;
	const d1y = (corner1y - y1) >> shift;
	const cross1 = d1x * ldyS - d1y * ldxS;

	const d2x = (corner2x - x1) >> shift;
	const d2y = (corner2y - y1) >> shift;
	const cross2 = d2x * ldyS - d2y * ldxS;

	// If both corners are on the same side, the line doesn't cross the bbox
	if (cross1 > 0 && cross2 > 0) return false;
	if (cross1 < 0 && cross2 < 0) return false;

	// Corners are on different sides (or on the line): line crosses the bbox.
	// Also need to verify the line segment actually reaches the bbox
	// (not just the infinite line). Check bbox overlap with line segment bbox.
	const lineMinX = Math.min(x1, x2);
	const lineMaxX = Math.max(x1, x2);
	const lineMinY = Math.min(y1, y2);
	const lineMaxY = Math.max(y1, y2);

	if (lineMaxX < left || lineMinX > right) return false;
	if (lineMaxY < bottom || lineMinY > top) return false;

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
		if (nodeId & NF_SUBSECTOR) {
			const ssIdx = nodeId & ~NF_SUBSECTOR;
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
