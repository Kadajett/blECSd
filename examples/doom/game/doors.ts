/**
 * Door thinkers: vertical sector ceiling movement for doors.
 *
 * Implements Doom's T_VerticalDoor from p_doors.c.
 * Doors move the sector ceiling up (open) and down (close).
 *
 * @module game/doors
 */

import type { MapData } from '../wad/types.js';
import type { DoorThinker, SpecialsState } from './specials.js';
import {
	VDOORSPEED,
	VDOORWAIT,
	findLowestCeilingSurrounding,
	setSectorCeiling,
} from './specials.js';

// ─── Door Types ──────────────────────────────────────────────────

export const DoorType = {
	NORMAL: 0,   // Open, wait, close
	OPEN: 1,     // Open and stay open
	CLOSE: 2,    // Close and stay closed
	CLOSE30: 3,  // Close, wait 30 seconds, open
} as const;

// ─── Door Creation ───────────────────────────────────────────────

/**
 * Create a door thinker for the given sector.
 * Matches Doom's EV_DoDoor from p_doors.c.
 *
 * @param state - Specials state (modified: thinker added)
 * @param map - Map data
 * @param sectorIndex - Sector to operate on
 * @param doorType - Type of door action
 * @param speed - Door movement speed (map units per tic)
 */
export function evDoDoor(
	state: SpecialsState,
	map: MapData,
	sectorIndex: number,
	doorType: number,
	speed: number,
): void {
	const sector = map.sectors[sectorIndex];
	if (!sector) return;

	// Find the open height: lowest neighboring ceiling minus 4 units
	const topHeight = findLowestCeilingSurrounding(sectorIndex, map) - 4;

	let direction = 1; // Opening by default
	if (doorType === DoorType.CLOSE) {
		direction = -1; // Closing
	}

	const thinker: DoorThinker = {
		kind: 'door',
		sector,
		sectorIndex,
		type: doorType,
		topHeight,
		speed,
		direction,
		topWait: VDOORWAIT,
		topCountdown: 0,
	};

	state.thinkers.push(thinker);
	state.activeSectors.add(sectorIndex);
}

// ─── Door Tick ───────────────────────────────────────────────────

/**
 * Advance a door thinker by one tic.
 * Matches Doom's T_VerticalDoor from p_doors.c.
 *
 * @param door - Door thinker (modified)
 * @returns true if the thinker is done and should be removed
 */
export function tickDoor(door: DoorThinker): boolean {
	switch (door.direction) {
		// Door is waiting at the top
		case 0: {
			door.topCountdown--;
			if (door.topCountdown <= 0) {
				switch (door.type) {
					case DoorType.NORMAL:
						// Start closing
						door.direction = -1;
						break;
					case DoorType.CLOSE30:
						door.direction = 1; // Re-open
						break;
					default:
						break;
				}
			}
			break;
		}

		// Door is opening (ceiling moving up)
		case 1: {
			const newHeight = door.sector.ceilingHeight + door.speed;
			if (newHeight >= door.topHeight) {
				// Reached the top
				setSectorCeiling(door.sector, door.topHeight);

				switch (door.type) {
					case DoorType.NORMAL:
						// Wait at top, then close
						door.direction = 0;
						door.topCountdown = door.topWait;
						break;
					case DoorType.OPEN:
						// Stay open, remove thinker
						return true;
					case DoorType.CLOSE30:
						door.direction = 0;
						door.topCountdown = 35 * 30; // 30 seconds
						break;
					default:
						return true;
				}
			} else {
				setSectorCeiling(door.sector, newHeight);
			}
			break;
		}

		// Door is closing (ceiling moving down)
		case -1: {
			const newHeight = door.sector.ceilingHeight - door.speed;
			const floorHeight = door.sector.floorHeight;

			if (newHeight <= floorHeight) {
				// Fully closed
				setSectorCeiling(door.sector, floorHeight);

				switch (door.type) {
					case DoorType.NORMAL:
					case DoorType.CLOSE:
						return true; // Done
					case DoorType.CLOSE30:
						door.direction = 0;
						door.topCountdown = 35 * 30;
						break;
					default:
						return true;
				}
			} else {
				setSectorCeiling(door.sector, newHeight);
			}
			break;
		}
	}

	return false;
}
