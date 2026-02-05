/**
 * Linedef special actions: doors, lifts, platforms.
 *
 * Handles USE-line tracing (E key), walk-trigger crossing detection,
 * and dispatches linedef specials to create sector mover thinkers.
 * Matches Doom's P_UseSpecialLine / P_CrossSpecialLine from p_spec.c.
 *
 * @module game/specials
 */

import {
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import type { MapData, MapLinedef, MapSector } from '../wad/types.js';
import { evDoCrusher, CrusherType, tickCrusher, type CrusherThinker } from './crushers.js';
import { evDoDoor, DoorType, tickDoor } from './doors.js';
import { evDoPlat, PlatType, tickPlat } from './platforms.js';
import type { PlayerState } from './player.js';

// ─── Sector Thinker Types ────────────────────────────────────────

/** A door thinker. */
export interface DoorThinker {
	readonly kind: 'door';
	sector: MapSector;
	sectorIndex: number;
	type: number;
	topHeight: number;
	speed: number;
	direction: number; // 1 = opening, -1 = closing, 0 = waiting
	topWait: number;
	topCountdown: number;
}

/** A platform/lift thinker. */
export interface PlatThinker {
	readonly kind: 'plat';
	sector: MapSector;
	sectorIndex: number;
	speed: number;
	low: number;
	high: number;
	wait: number;
	count: number;
	status: number; // 0=up, 1=down, 2=waiting, 3=in_stasis
	oldStatus: number;
	type: number;
}

/** A floor mover thinker. */
export interface FloorThinker {
	readonly kind: 'floor';
	sector: MapSector;
	sectorIndex: number;
	type: number;
	speed: number;
	direction: number; // 1 = raising, -1 = lowering
	targetHeight: number;
}

export type SectorThinker = DoorThinker | PlatThinker | FloorThinker | CrusherThinker;

/** Mutable state for all active sector movers. */
export interface SpecialsState {
	thinkers: SectorThinker[];
	/** Track which sectors have active thinkers to prevent duplicates. */
	activeSectors: Set<number>;
	/** Track which walk-trigger linedefs have already fired (one-shot). */
	firedWalkLines: Set<number>;
	/** Previous player position for walk-trigger crossing detection. */
	prevPlayerX: number;
	prevPlayerY: number;
}

// ─── Constants ───────────────────────────────────────────────────

/** USE line range in fixed-point (64 map units). */
const USERANGE = 64 << FRACBITS;

/** Door speed in map units per tic. */
export const VDOORSPEED = 2;

/** Door wait time in tics (~4 seconds at 35 tics/sec). */
export const VDOORWAIT = 150;

/** Lift speed in map units per tic. */
export const PLATSPEED = 4;

/** Lift wait time in tics (~3 seconds). */
export const PLATWAIT = 105;

/** Floor movement speed in map units per tic. */
export const FLOORSPEED = 1;

/** Fast floor movement speed. */
export const FLOORSPEED_FAST = 4;

// ─── Floor Types ──────────────────────────────────────────────

export const FloorType = {
	LOWER_TO_LOWEST: 0,     // Lower floor to lowest surrounding floor
	LOWER_TO_NEAREST: 1,    // Lower floor to nearest lower floor
	RAISE_TO_NEAREST: 2,    // Raise floor to nearest higher floor
	RAISE_24: 3,            // Raise floor by 24 units
	RAISE_TO_CEILING: 4,    // Raise floor to ceiling
} as const;

// ─── Initialization ──────────────────────────────────────────────

/**
 * Create initial specials state.
 *
 * @param player - Player state for initial position tracking
 * @returns Fresh specials state
 */
export function createSpecialsState(player: PlayerState): SpecialsState {
	return {
		thinkers: [],
		activeSectors: new Set(),
		firedWalkLines: new Set(),
		prevPlayerX: player.x,
		prevPlayerY: player.y,
	};
}

// ─── Sector Height Mutation ──────────────────────────────────────

/**
 * Mutate a sector's floor height. Since MapSector is readonly in the
 * type system but sectors must be mutable at runtime for Doom gameplay,
 * this uses a type assertion. All render code reads from the same
 * sector objects, so changes are visible immediately.
 */
export function setSectorFloor(sector: MapSector, height: number): void {
	(sector as { floorHeight: number }).floorHeight = height;
}

/**
 * Mutate a sector's ceiling height.
 */
export function setSectorCeiling(sector: MapSector, height: number): void {
	(sector as { ceilingHeight: number }).ceilingHeight = height;
}

// ─── Use Line (E Key) ───────────────────────────────────────────

/**
 * Trace a USE line from the player and activate the first special linedef hit.
 * Matches Doom's P_UseLines from p_map.c.
 *
 * @param player - Player state
 * @param map - Map data
 * @param state - Specials state (modified)
 */
export function useLines(
	player: PlayerState,
	map: MapData,
	state: SpecialsState,
): void {
	const fineAngle = (player.angle >> ANGLETOFINESHIFT) & FINEMASK;
	const cos = finecosine[fineAngle] ?? FRACUNIT;
	const sin = finesine[fineAngle] ?? 0;

	// Trace from player to USERANGE in facing direction
	const endX = player.x + fixedMul(cos, USERANGE);
	const endY = player.y + fixedMul(sin, USERANGE);

	// Check blockmap cells along the trace for linedefs with specials
	const bmap = map.blockmap;
	const stepX = fixedMul(16 << FRACBITS, cos);
	const stepY = fixedMul(16 << FRACBITS, sin);

	let traceX = player.x;
	let traceY = player.y;

	const checked = new Set<number>();

	for (let step = 0; step < 4; step++) {
		const mapX = (traceX >> FRACBITS) - bmap.header.originX;
		const mapY = (traceY >> FRACBITS) - bmap.header.originY;
		const cellX = Math.floor(mapX / 128);
		const cellY = Math.floor(mapY / 128);

		for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
			for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
				if (cx < 0 || cx >= bmap.header.columns) continue;
				if (cy < 0 || cy >= bmap.header.rows) continue;

				const cellIndex = cy * bmap.header.columns + cx;
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

					if (checked.has(lineIdx)) continue;
					checked.add(lineIdx);

					const linedef = map.linedefs[lineIdx];
					if (!linedef || linedef.special === 0) continue;

					// Check if the use line crosses this linedef
					const v1 = map.vertexes[linedef.v1];
					const v2 = map.vertexes[linedef.v2];
					if (!v1 || !v2) continue;

					if (lineSegmentsIntersect(
						player.x, player.y, endX, endY,
						v1.x << FRACBITS, v1.y << FRACBITS,
						v2.x << FRACBITS, v2.y << FRACBITS,
					)) {
						activateSpecial(linedef, lineIdx, player, map, state, 'use');
						return;
					}
				}
			}
		}

		traceX += stepX;
		traceY += stepY;
	}
}

// ─── Walk Triggers ───────────────────────────────────────────────

/**
 * Check for walk-trigger linedefs the player has crossed this tic.
 * Matches Doom's P_CrossSpecialLine.
 *
 * @param player - Player state
 * @param map - Map data
 * @param state - Specials state (modified)
 */
export function checkWalkTriggers(
	player: PlayerState,
	map: MapData,
	state: SpecialsState,
): void {
	const bmap = map.blockmap;
	const mapX = (player.x >> FRACBITS) - bmap.header.originX;
	const mapY = (player.y >> FRACBITS) - bmap.header.originY;
	const cellX = Math.floor(mapX / 128);
	const cellY = Math.floor(mapY / 128);

	for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
		for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
			if (cx < 0 || cx >= bmap.header.columns) continue;
			if (cy < 0 || cy >= bmap.header.rows) continue;

			const cellIndex = cy * bmap.header.columns + cx;
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
				if (!linedef || linedef.special === 0) continue;

				// Only process walk-trigger types (W-lines)
				if (!isWalkTrigger(linedef.special)) continue;

				// Check one-shot triggers
				if (isOneShotWalk(linedef.special) && state.firedWalkLines.has(lineIdx)) continue;

				const v1 = map.vertexes[linedef.v1];
				const v2 = map.vertexes[linedef.v2];
				if (!v1 || !v2) continue;

				// Check if the player's movement this tic crossed the linedef
				if (lineSegmentsIntersect(
					state.prevPlayerX, state.prevPlayerY,
					player.x, player.y,
					v1.x << FRACBITS, v1.y << FRACBITS,
					v2.x << FRACBITS, v2.y << FRACBITS,
				)) {
					if (isOneShotWalk(linedef.special)) {
						state.firedWalkLines.add(lineIdx);
					}
					activateSpecial(linedef, lineIdx, player, map, state, 'walk');
				}
			}
		}
	}

	state.prevPlayerX = player.x;
	state.prevPlayerY = player.y;
}

// ─── Special Dispatch ────────────────────────────────────────────

/**
 * Activate a linedef special action.
 */
function activateSpecial(
	linedef: MapLinedef,
	_lineIdx: number,
	_player: PlayerState,
	map: MapData,
	state: SpecialsState,
	_trigger: 'use' | 'walk',
): void {
	const special = linedef.special;

	switch (special) {
		// DR Door open-wait-close (repeatable USE)
		case 1:
		case 117: // Blazing door
		{
			const speed = special === 117 ? VDOORSPEED * 4 : VDOORSPEED;
			// Door linedefs: the door sector is the one behind the linedef
			const backSide = map.sidedefs[linedef.backSidedef];
			if (!backSide) break;
			const sectorIdx = backSide.sector;
			if (state.activeSectors.has(sectorIdx)) break;
			const sector = map.sectors[sectorIdx];
			if (!sector) break;
			evDoDoor(state, map, sectorIdx, DoorType.NORMAL, speed);
			break;
		}

		// D1 Door open-stay (one-shot USE)
		case 31:
		case 118: // Blazing open stay
		{
			const speed = special === 118 ? VDOORSPEED * 4 : VDOORSPEED;
			const backSide = map.sidedefs[linedef.backSidedef];
			if (!backSide) break;
			const sectorIdx = backSide.sector;
			if (state.activeSectors.has(sectorIdx)) break;
			evDoDoor(state, map, sectorIdx, DoorType.OPEN, speed);
			break;
		}

		// Keyed doors (DR)
		case 26: // Blue key door
		case 27: // Yellow key door
		case 28: // Red key door
		case 32: // Blue key open stay
		case 33: // Red key open stay
		case 34: // Yellow key open stay
		{
			// TODO: check key inventory when keys are implemented
			const backSide = map.sidedefs[linedef.backSidedef];
			if (!backSide) break;
			const sectorIdx = backSide.sector;
			if (state.activeSectors.has(sectorIdx)) break;
			const doorType = (special === 32 || special === 33 || special === 34)
				? DoorType.OPEN : DoorType.NORMAL;
			evDoDoor(state, map, sectorIdx, doorType, VDOORSPEED);
			break;
		}

		// S1/SR Lift lower-wait-raise
		case 62: // SR Lower lift
		case 21: // S1 Lower lift
		{
			activateTaggedPlats(linedef.tag, map, state, PlatType.DOWN_WAIT_UP_STAY);
			break;
		}

		// W1/WR Lift lower-wait-raise (walk trigger)
		case 88: // WR Lower lift
		case 10: // W1 Lower lift
		{
			activateTaggedPlats(linedef.tag, map, state, PlatType.DOWN_WAIT_UP_STAY);
			break;
		}

		// W1 Door open-wait-close
		case 4:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.NORMAL, VDOORSPEED);
			break;
		}

		// W1 Door open stay
		case 2:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.OPEN, VDOORSPEED);
			break;
		}

		// W1 Door close
		case 3:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.CLOSE, VDOORSPEED);
			break;
		}

		// WR Door open-wait-close
		case 86:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.NORMAL, VDOORSPEED);
			break;
		}

		// WR Door open stay
		case 90:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.OPEN, VDOORSPEED);
			break;
		}

		// W1 Door close stay
		case 16:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.CLOSE, VDOORSPEED);
			break;
		}

		// S1 Door open stay
		case 103:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.OPEN, VDOORSPEED);
			break;
		}

		// S1 Door close stay
		case 50:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.CLOSE, VDOORSPEED);
			break;
		}

		// SR Door open stay
		case 61:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.OPEN, VDOORSPEED);
			break;
		}

		// SR Door close stay
		case 42:
		{
			activateTaggedDoors(linedef.tag, map, state, DoorType.CLOSE, VDOORSPEED);
			break;
		}

		// W1 Crusher (slow)
		case 6:
		{
			activateTaggedCrushers(linedef.tag, map, state, CrusherType.CRUSH_AND_RAISE);
			break;
		}

		// W1 Fast crusher
		case 77:
		{
			activateTaggedCrushers(linedef.tag, map, state, CrusherType.FAST_CRUSH_AND_RAISE);
			break;
		}

		// W1 Silent crusher
		case 141:
		{
			activateTaggedCrushers(linedef.tag, map, state, CrusherType.SILENT_CRUSH);
			break;
		}

		// W1 Floor lower to lowest
		case 38:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.LOWER_TO_LOWEST, FLOORSPEED);
			break;
		}

		// W1 Floor lower to nearest
		case 36:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.LOWER_TO_NEAREST, FLOORSPEED_FAST);
			break;
		}

		// W1 Floor raise to nearest
		case 5:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.RAISE_TO_NEAREST, FLOORSPEED);
			break;
		}

		// S1 Floor lower to lowest
		case 23:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.LOWER_TO_LOWEST, FLOORSPEED);
			break;
		}

		// S1 Floor raise to nearest
		case 18:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.RAISE_TO_NEAREST, FLOORSPEED);
			break;
		}

		// W1 Floor raise by 24
		case 58:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.RAISE_24, FLOORSPEED);
			break;
		}

		// WR Floor lower to lowest
		case 82:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.LOWER_TO_LOWEST, FLOORSPEED);
			break;
		}

		// WR Floor raise to nearest
		case 91:
		{
			activateTaggedFloors(linedef.tag, map, state, FloorType.RAISE_TO_NEAREST, FLOORSPEED);
			break;
		}

		default:
			break;
	}
}

/**
 * Activate doors on all sectors matching a tag.
 */
function activateTaggedDoors(
	tag: number,
	map: MapData,
	state: SpecialsState,
	doorType: number,
	speed: number,
): void {
	if (tag === 0) return;
	for (let i = 0; i < map.sectors.length; i++) {
		const sector = map.sectors[i];
		if (!sector || sector.tag !== tag) continue;
		if (state.activeSectors.has(i)) continue;
		evDoDoor(state, map, i, doorType, speed);
	}
}

/**
 * Activate platforms on all sectors matching a tag.
 */
function activateTaggedPlats(
	tag: number,
	map: MapData,
	state: SpecialsState,
	platType: number,
): void {
	if (tag === 0) return;
	for (let i = 0; i < map.sectors.length; i++) {
		const sector = map.sectors[i];
		if (!sector || sector.tag !== tag) continue;
		if (state.activeSectors.has(i)) continue;
		evDoPlat(state, map, i, platType);
	}
}

// ─── Floor Mover Creation ────────────────────────────────────────

/**
 * Create a floor mover thinker for the given sector.
 * Matches Doom's EV_DoFloor from p_floor.c.
 */
export function evDoFloor(
	state: SpecialsState,
	map: MapData,
	sectorIndex: number,
	floorType: number,
	speed: number,
): void {
	const sector = map.sectors[sectorIndex];
	if (!sector) return;

	let targetHeight: number;
	let direction: number;

	switch (floorType) {
		case FloorType.LOWER_TO_LOWEST:
			targetHeight = findLowestFloorSurrounding(sectorIndex, map);
			direction = -1;
			break;
		case FloorType.LOWER_TO_NEAREST:
			targetHeight = findNextLowestFloor(sectorIndex, map);
			direction = -1;
			break;
		case FloorType.RAISE_TO_NEAREST:
			targetHeight = findNextHighestFloor(sectorIndex, map);
			direction = 1;
			break;
		case FloorType.RAISE_24:
			targetHeight = sector.floorHeight + 24;
			direction = 1;
			break;
		case FloorType.RAISE_TO_CEILING:
			targetHeight = sector.ceilingHeight - 8;
			direction = 1;
			break;
		default:
			return;
	}

	const thinker: FloorThinker = {
		kind: 'floor',
		sector,
		sectorIndex,
		type: floorType,
		speed,
		direction,
		targetHeight,
	};

	state.thinkers.push(thinker);
	state.activeSectors.add(sectorIndex);
}

/**
 * Advance a floor mover thinker by one tic.
 *
 * @param floor - Floor thinker (modified)
 * @returns true if the thinker is done and should be removed
 */
export function tickFloor(floor: FloorThinker): boolean {
	if (floor.direction === 1) {
		const newHeight = floor.sector.floorHeight + floor.speed;
		if (newHeight >= floor.targetHeight) {
			setSectorFloor(floor.sector, floor.targetHeight);
			return true;
		}
		setSectorFloor(floor.sector, newHeight);
	} else {
		const newHeight = floor.sector.floorHeight - floor.speed;
		if (newHeight <= floor.targetHeight) {
			setSectorFloor(floor.sector, floor.targetHeight);
			return true;
		}
		setSectorFloor(floor.sector, newHeight);
	}
	return false;
}

// ─── Crusher Specials ────────────────────────────────────────────

/**
 * Activate crushers on all sectors matching a tag.
 */
function activateTaggedCrushers(
	tag: number,
	map: MapData,
	state: SpecialsState,
	crusherType: number,
): void {
	if (tag === 0) return;
	for (let i = 0; i < map.sectors.length; i++) {
		const sector = map.sectors[i];
		if (!sector || sector.tag !== tag) continue;
		if (state.activeSectors.has(i)) continue;
		evDoCrusher(state, map, i, crusherType);
	}
}

/**
 * Activate floor movers on all sectors matching a tag.
 */
function activateTaggedFloors(
	tag: number,
	map: MapData,
	state: SpecialsState,
	floorType: number,
	speed: number,
): void {
	if (tag === 0) return;
	for (let i = 0; i < map.sectors.length; i++) {
		const sector = map.sectors[i];
		if (!sector || sector.tag !== tag) continue;
		if (state.activeSectors.has(i)) continue;
		evDoFloor(state, map, i, floorType, speed);
	}
}

// ─── Thinker Tick ────────────────────────────────────────────────

/**
 * Run one tic of all active sector thinkers.
 *
 * @param state - Specials state (modified)
 * @param map - Map data (needed for crushers)
 */
export function runSectorThinkers(state: SpecialsState, map: MapData): void {
	const toRemove: number[] = [];

	for (let i = 0; i < state.thinkers.length; i++) {
		const thinker = state.thinkers[i]!;
		let done = false;

		switch (thinker.kind) {
			case 'door':
				done = tickDoor(thinker);
				break;
			case 'plat':
				done = tickPlat(thinker);
				break;
			case 'floor':
				done = tickFloor(thinker);
				break;
			case 'crusher':
				done = tickCrusher(thinker, map);
				break;
		}

		if (done) {
			toRemove.push(i);
		}
	}

	// Remove completed thinkers in reverse order
	for (let i = toRemove.length - 1; i >= 0; i--) {
		const idx = toRemove[i]!;
		const thinker = state.thinkers[idx]!;
		state.activeSectors.delete(thinker.sectorIndex);
		state.thinkers.splice(idx, 1);
	}
}

// ─── Walk Trigger Classification ─────────────────────────────────

/** Check if a linedef special is a walk-trigger (W1 or WR). */
function isWalkTrigger(special: number): boolean {
	switch (special) {
		// W1 (one-shot walk triggers)
		case 2:   // W1 Door open stay
		case 3:   // W1 Door close
		case 4:   // W1 Door open-wait-close
		case 5:   // W1 Floor raise to nearest
		case 6:   // W1 Crusher
		case 10:  // W1 Lift
		case 16:  // W1 Door close stay
		case 36:  // W1 Floor lower to nearest
		case 38:  // W1 Floor lower to lowest
		case 58:  // W1 Floor raise by 24
		case 77:  // W1 Fast crusher
		case 141: // W1 Silent crusher
		// WR (repeatable walk triggers)
		case 82:  // WR Floor lower to lowest
		case 86:  // WR Door open-wait-close
		case 88:  // WR Lift
		case 90:  // WR Door open stay
		case 91:  // WR Floor raise to nearest
			return true;
		default:
			return false;
	}
}

/** Check if a walk trigger is one-shot (W1 vs WR). */
function isOneShotWalk(special: number): boolean {
	switch (special) {
		case 2: case 3: case 4: case 5: case 6:
		case 10: case 16: case 36: case 38: case 58:
		case 77: case 141:
			return true;
		default:
			return false;
	}
}

// ─── Geometry Helpers ────────────────────────────────────────────

/**
 * Test if two line segments intersect using cross products.
 * Returns true if segment (ax,ay)-(bx,by) intersects (cx,cy)-(dx,dy).
 */
function lineSegmentsIntersect(
	ax: number, ay: number, bx: number, by: number,
	cx: number, cy: number, dx: number, dy: number,
): boolean {
	// Shift down to avoid overflow in cross products
	const shift = FRACBITS;
	const abx = (bx - ax) >> shift;
	const aby = (by - ay) >> shift;
	const cdx = (dx - cx) >> shift;
	const cdy = (dy - cy) >> shift;

	const acx = (cx - ax) >> shift;
	const acy = (cy - ay) >> shift;

	const denom = abx * cdy - aby * cdx;
	if (denom === 0) return false; // Parallel

	const t_num = acx * cdy - acy * cdx;
	const u_num = acx * aby - acy * abx;

	// Check if 0 <= t <= 1 and 0 <= u <= 1
	if (denom > 0) {
		if (t_num < 0 || t_num > denom) return false;
		if (u_num < 0 || u_num > denom) return false;
	} else {
		if (t_num > 0 || t_num < denom) return false;
		if (u_num > 0 || u_num < denom) return false;
	}

	return true;
}

/**
 * Find the lowest neighboring floor height for a sector.
 * Used by lifts to determine the lower destination.
 */
export function findLowestFloorSurrounding(
	sectorIndex: number,
	map: MapData,
): number {
	const sector = map.sectors[sectorIndex];
	if (!sector) return 0;

	let floor = sector.floorHeight;

	// Check all linedefs for shared sector boundaries
	for (const linedef of map.linedefs) {
		const front = map.sidedefs[linedef.frontSidedef];
		const back = map.sidedefs[linedef.backSidedef];
		if (!front || !back) continue;

		let otherSectorIdx = -1;
		if (front.sector === sectorIndex) {
			otherSectorIdx = back.sector;
		} else if (back.sector === sectorIndex) {
			otherSectorIdx = front.sector;
		}

		if (otherSectorIdx < 0) continue;
		const otherSector = map.sectors[otherSectorIdx];
		if (!otherSector) continue;

		if (otherSector.floorHeight < floor) {
			floor = otherSector.floorHeight;
		}
	}

	return floor;
}

/**
 * Find the next lowest floor height among neighboring sectors.
 * Returns the highest floor below the sector's current floor.
 */
export function findNextLowestFloor(
	sectorIndex: number,
	map: MapData,
): number {
	const sector = map.sectors[sectorIndex];
	if (!sector) return 0;

	const currentFloor = sector.floorHeight;
	let nextFloor = -32768;

	for (const linedef of map.linedefs) {
		const front = map.sidedefs[linedef.frontSidedef];
		const back = map.sidedefs[linedef.backSidedef];
		if (!front || !back) continue;

		let otherSectorIdx = -1;
		if (front.sector === sectorIndex) {
			otherSectorIdx = back.sector;
		} else if (back.sector === sectorIndex) {
			otherSectorIdx = front.sector;
		}

		if (otherSectorIdx < 0) continue;
		const otherSector = map.sectors[otherSectorIdx];
		if (!otherSector) continue;

		if (otherSector.floorHeight < currentFloor && otherSector.floorHeight > nextFloor) {
			nextFloor = otherSector.floorHeight;
		}
	}

	return nextFloor === -32768 ? currentFloor : nextFloor;
}

/**
 * Find the next highest floor height among neighboring sectors.
 * Returns the lowest floor above the sector's current floor.
 */
export function findNextHighestFloor(
	sectorIndex: number,
	map: MapData,
): number {
	const sector = map.sectors[sectorIndex];
	if (!sector) return 0;

	const currentFloor = sector.floorHeight;
	let nextFloor = 32767;

	for (const linedef of map.linedefs) {
		const front = map.sidedefs[linedef.frontSidedef];
		const back = map.sidedefs[linedef.backSidedef];
		if (!front || !back) continue;

		let otherSectorIdx = -1;
		if (front.sector === sectorIndex) {
			otherSectorIdx = back.sector;
		} else if (back.sector === sectorIndex) {
			otherSectorIdx = front.sector;
		}

		if (otherSectorIdx < 0) continue;
		const otherSector = map.sectors[otherSectorIdx];
		if (!otherSector) continue;

		if (otherSector.floorHeight > currentFloor && otherSector.floorHeight < nextFloor) {
			nextFloor = otherSector.floorHeight;
		}
	}

	return nextFloor === 32767 ? currentFloor : nextFloor;
}

/**
 * Find the lowest ceiling height of neighboring sectors.
 * Used by doors to determine the open height.
 */
export function findLowestCeilingSurrounding(
	sectorIndex: number,
	map: MapData,
): number {
	let ceil = 32767;

	for (const linedef of map.linedefs) {
		const front = map.sidedefs[linedef.frontSidedef];
		const back = map.sidedefs[linedef.backSidedef];
		if (!front || !back) continue;

		let otherSectorIdx = -1;
		if (front.sector === sectorIndex) {
			otherSectorIdx = back.sector;
		} else if (back.sector === sectorIndex) {
			otherSectorIdx = front.sector;
		}

		if (otherSectorIdx < 0) continue;
		const otherSector = map.sectors[otherSectorIdx];
		if (!otherSector) continue;

		if (otherSector.ceilingHeight < ceil) {
			ceil = otherSector.ceilingHeight;
		}
	}

	return ceil;
}
