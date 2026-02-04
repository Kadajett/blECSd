/**
 * Platform/lift thinkers: vertical sector floor movement.
 *
 * Implements Doom's T_PlatRaise from p_plats.c.
 * Platforms move the sector floor down (lower) and up (raise).
 *
 * @module game/platforms
 */

import type { MapData } from '../wad/types.js';
import type { PlatThinker, SpecialsState } from './specials.js';
import {
	PLATSPEED,
	PLATWAIT,
	findLowestFloorSurrounding,
	setSectorFloor,
} from './specials.js';

// ─── Platform Types ──────────────────────────────────────────────

export const PlatType = {
	DOWN_WAIT_UP_STAY: 0,  // Lower, wait, raise back
	UP_WAIT_DOWN: 1,       // Raise, wait, lower back (perpetual)
	RAISE_TO_NEAREST: 2,   // Raise floor to nearest floor height
} as const;

/** Platform status values. */
export const PlatStatus = {
	UP: 0,
	DOWN: 1,
	WAITING: 2,
	IN_STASIS: 3,
} as const;

// ─── Platform Creation ───────────────────────────────────────────

/**
 * Create a platform/lift thinker for the given sector.
 * Matches Doom's EV_DoPlat from p_plats.c.
 *
 * @param state - Specials state (modified: thinker added)
 * @param map - Map data
 * @param sectorIndex - Sector to operate on
 * @param platType - Type of platform action
 */
export function evDoPlat(
	state: SpecialsState,
	map: MapData,
	sectorIndex: number,
	platType: number,
): void {
	const sector = map.sectors[sectorIndex];
	if (!sector) return;

	const high = sector.floorHeight;
	const low = findLowestFloorSurrounding(sectorIndex, map);

	const thinker: PlatThinker = {
		kind: 'plat',
		sector,
		sectorIndex,
		speed: PLATSPEED,
		low,
		high,
		wait: PLATWAIT,
		count: 0,
		status: PlatStatus.DOWN, // Start by lowering
		oldStatus: PlatStatus.DOWN,
		type: platType,
	};

	state.thinkers.push(thinker);
	state.activeSectors.add(sectorIndex);
}

// ─── Platform Tick ───────────────────────────────────────────────

/**
 * Advance a platform thinker by one tic.
 * Matches Doom's T_PlatRaise from p_plats.c.
 *
 * @param plat - Platform thinker (modified)
 * @returns true if the thinker is done and should be removed
 */
export function tickPlat(plat: PlatThinker): boolean {
	switch (plat.status) {
		case PlatStatus.UP: {
			const newHeight = plat.sector.floorHeight + plat.speed;
			if (newHeight >= plat.high) {
				// Reached the top
				setSectorFloor(plat.sector, plat.high);

				if (plat.type === PlatType.DOWN_WAIT_UP_STAY) {
					// Done: lift returned to original position
					return true;
				}

				// Perpetual: wait then go back down
				plat.count = plat.wait;
				plat.status = PlatStatus.WAITING;
				plat.oldStatus = PlatStatus.UP;
			} else {
				setSectorFloor(plat.sector, newHeight);
			}
			break;
		}

		case PlatStatus.DOWN: {
			const newHeight = plat.sector.floorHeight - plat.speed;
			if (newHeight <= plat.low) {
				// Reached the bottom
				setSectorFloor(plat.sector, plat.low);
				plat.count = plat.wait;
				plat.status = PlatStatus.WAITING;
				plat.oldStatus = PlatStatus.DOWN;
			} else {
				setSectorFloor(plat.sector, newHeight);
			}
			break;
		}

		case PlatStatus.WAITING: {
			plat.count--;
			if (plat.count <= 0) {
				if (plat.oldStatus === PlatStatus.DOWN) {
					plat.status = PlatStatus.UP;
				} else {
					plat.status = PlatStatus.DOWN;
				}
			}
			break;
		}

		case PlatStatus.IN_STASIS:
			break;
	}

	return false;
}
