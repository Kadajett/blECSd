/**
 * Spawn things from map data into mobj array.
 *
 * Reads the things lump from a parsed map and creates Mobj instances
 * for monsters, items, and decorations. Player starts and deathmatch
 * starts are skipped since those are handled separately.
 *
 * @module game/spawn
 */

import type { MapData, MapThing } from '../wad/types.js';
import { ThingFlags } from '../wad/types.js';
import { type Mobj, DOOMED_TO_MOBJ, MOBJINFO, createMobj } from './mobj.js';
import { findSectorAt } from './player.js';

// ─── Skill Level Filtering ─────────────────────────────────────────

/** Skill flag bits in a MapThing's flags field. */
const SKILL_BITS: readonly number[] = [
	ThingFlags.EASY, // skill 0 and 1 (I'm Too Young To Die / Hey Not Too Rough)
	ThingFlags.NORMAL, // skill 2 (Hurt Me Plenty)
	ThingFlags.HARD, // skill 3 and 4 (Ultra-Violence / Nightmare)
];

/**
 * Check whether a thing should spawn at the given skill level.
 *
 * @param thingFlags - The thing's spawn flags from the WAD
 * @param skill - Skill level (0-4). Levels 0-1 use bit 0, level 2 uses bit 1, levels 3-4 use bit 2.
 * @returns true if the thing appears at this skill level
 */
function shouldSpawnForSkill(thingFlags: number, skill: number): boolean {
	if (skill <= 1) return (thingFlags & ThingFlags.EASY) !== 0;
	if (skill === 2) return (thingFlags & ThingFlags.NORMAL) !== 0;
	return (thingFlags & ThingFlags.HARD) !== 0;
}

// ─── Sector Floor Lookup ───────────────────────────────────────────

/**
 * Find the floor height at a map coordinate using BSP tree lookup.
 *
 * @param map - Map data
 * @param x - X coordinate in map units
 * @param y - Y coordinate in map units
 * @returns Floor height in map units
 */
function findSectorFloor(map: MapData, x: number, y: number): number {
	const sectorIdx = findSectorAt(map, x, y);
	const sector = map.sectors[sectorIdx];
	return sector ? sector.floorHeight : 0;
}

// ─── Player and Deathmatch Start Types ─────────────────────────────

/** DoomEd numbers that represent player starts and deathmatch starts. */
const PLAYER_START_TYPES: ReadonlySet<number> = new Set([1, 2, 3, 4, 11]);

// ─── Spawning ──────────────────────────────────────────────────────

/**
 * Spawn all map things into Mobj instances.
 *
 * Iterates through the things array from parsed map data and creates
 * an Mobj for each recognized type. Player starts (types 1-4) and
 * deathmatch starts (type 11) are skipped. Unknown DoomEd numbers
 * are silently ignored. Things that do not match the requested skill
 * level are filtered out.
 *
 * @param map - Parsed map data containing the things array
 * @param skillLevel - Difficulty level (0-4). Defaults to 2 (Hurt Me Plenty).
 * @returns Array of spawned Mobj instances
 *
 * @example
 * ```typescript
 * import { spawnMapThings } from './spawn.js';
 * import { parseMapData } from '../wad/mapData.js';
 *
 * const map = parseMapData(wadFile, 'E1M1');
 * const mobjs = spawnMapThings(map, 2);
 * console.log(`Spawned ${mobjs.length} things`);
 * ```
 */
export function spawnMapThings(map: MapData, skillLevel?: number): Mobj[] {
	const skill = skillLevel ?? 2;
	const result: Mobj[] = [];

	for (const thing of map.things) {
		// Skip player starts and deathmatch starts
		if (PLAYER_START_TYPES.has(thing.type)) continue;

		// Look up the internal mobj type from the DoomEd number
		const mobjType = DOOMED_TO_MOBJ.get(thing.type);
		if (mobjType === undefined) continue;

		// Look up the base info for this type
		const info = MOBJINFO[mobjType];
		if (!info) continue;

		// Filter by skill level
		if (!shouldSpawnForSkill(thing.flags, skill)) continue;

		// Find the floor height at the thing's position
		const floorHeight = findSectorFloor(map, thing.x, thing.y);

		result.push(createMobj(thing, mobjType, info, floorHeight));
	}

	return result;
}
