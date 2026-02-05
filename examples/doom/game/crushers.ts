/**
 * Crusher thinkers: ceilings that move down and back up, damaging things in the way.
 *
 * Implements Doom's T_MoveCeiling from p_ceilng.c.
 * Crushers continuously cycle the ceiling down to near floor level and back up.
 *
 * @module game/crushers
 */

import type { MapData } from '../wad/types.js';
import type { SpecialsState } from './specials.js';
import {
	findLowestCeilingSurrounding,
	setSectorCeiling,
} from './specials.js';

// ─── Crusher Types ──────────────────────────────────────────────

export const CrusherType = {
	CRUSH_AND_RAISE: 0,    // Perpetual crush cycle
	FAST_CRUSH_AND_RAISE: 1, // Fast perpetual crush
	SILENT_CRUSH: 2,       // Silent crusher
} as const;

/** Crusher direction values. */
const DIR_UP = 1;
const DIR_DOWN = -1;

/** Crusher speed in map units per tic. */
export const CRUSHSPEED = 1;

/** Minimum gap between floor and crusher ceiling (8 map units). */
const CRUSH_GAP = 8;

// ─── Crusher Thinker ────────────────────────────────────────────

/** A crusher thinker. */
export interface CrusherThinker {
	readonly kind: 'crusher';
	sectorIndex: number;
	bottomHeight: number;
	topHeight: number;
	speed: number;
	direction: number;
	type: number;
}

// ─── Crusher Creation ───────────────────────────────────────────

/**
 * Create a crusher thinker for the given sector.
 * Matches Doom's EV_DoCeiling (crushAndRaise) from p_ceilng.c.
 *
 * @param state - Specials state (modified: thinker added)
 * @param map - Map data
 * @param sectorIndex - Sector to operate on
 * @param crusherType - Type of crusher action
 */
export function evDoCrusher(
	state: SpecialsState,
	map: MapData,
	sectorIndex: number,
	crusherType: number,
): void {
	const sector = map.sectors[sectorIndex];
	if (!sector) return;

	const topHeight = sector.ceilingHeight;
	const bottomHeight = sector.floorHeight + CRUSH_GAP;
	const speed = crusherType === CrusherType.FAST_CRUSH_AND_RAISE
		? CRUSHSPEED * 2
		: CRUSHSPEED;

	const thinker: CrusherThinker = {
		kind: 'crusher',
		sectorIndex,
		bottomHeight,
		topHeight,
		speed,
		direction: DIR_DOWN,
		type: crusherType,
	};

	state.thinkers.push(thinker);
	state.activeSectors.add(sectorIndex);
}

// ─── Crusher Tick ───────────────────────────────────────────────

/**
 * Advance a crusher thinker by one tic.
 * Matches Doom's T_MoveCeiling from p_ceilng.c.
 * Crushers are perpetual and never return true (never removed).
 *
 * @param crusher - Crusher thinker (modified)
 * @param map - Map data (for sector access)
 * @returns true if the thinker should be removed (never for crushers)
 */
export function tickCrusher(crusher: CrusherThinker, map: MapData): boolean {
	const sector = map.sectors[crusher.sectorIndex];
	if (!sector) return true;

	if (crusher.direction === DIR_DOWN) {
		const newHeight = sector.ceilingHeight - crusher.speed;
		if (newHeight <= crusher.bottomHeight) {
			setSectorCeiling(sector, crusher.bottomHeight);
			// Reverse direction
			crusher.direction = DIR_UP;
		} else {
			setSectorCeiling(sector, newHeight);
		}
	} else {
		// Moving up
		const newHeight = sector.ceilingHeight + crusher.speed;
		if (newHeight >= crusher.topHeight) {
			setSectorCeiling(sector, crusher.topHeight);
			// Reverse direction
			crusher.direction = DIR_DOWN;
		} else {
			setSectorCeiling(sector, newHeight);
		}
	}

	return false; // Crushers are perpetual
}
