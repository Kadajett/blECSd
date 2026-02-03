/**
 * Map object (mobj) types and state management.
 *
 * Defines the data structures and helper functions for all map objects
 * in the game: monsters, items, decorations, projectiles, and the player.
 * Follows the original Doom mobj system with fixed-point coordinates.
 *
 * @module game/mobj
 */

import { FRACBITS } from '../math/fixed.js';
import type { MapThing } from '../wad/types.js';

// ─── Mobj Flags ────────────────────────────────────────────────────

/** Bitmask flags controlling map object behavior. */
export const MobjFlags = {
	/** Call P_TouchSpecialThing when touched. */
	MF_SPECIAL: 1,
	/** Blocks other mobjs. */
	MF_SOLID: 2,
	/** Can take damage. */
	MF_SHOOTABLE: 4,
	/** Not linked into sector lists. */
	MF_NOSECTOR: 8,
	/** Not linked into blockmap. */
	MF_NOBLOCKMAP: 16,
	/** Deaf monster, only wakes on sight. */
	MF_AMBUSH: 32,
	/** Try to attack right back after being hit. */
	MF_JUSTHIT: 64,
	/** Take at least one step before attacking. */
	MF_JUSTATTACKED: 128,
	/** Is a missile projectile. */
	MF_MISSILE: 256,
	/** Dropped by a killed monster. */
	MF_DROPPED: 512,
	/** Can be picked up by player. */
	MF_PICKUP: 1024,
	/** Count towards kill percentage. */
	MF_COUNTKILL: 2048,
	/** Count towards item percentage. */
	MF_COUNTITEM: 4096,
	/** Is a dead monster corpse. */
	MF_CORPSE: 8192,
} as const;

// ─── Mobj Types ────────────────────────────────────────────────────

/** Enumeration of map object types, indexed by internal ID. */
export const MobjType = {
	MT_PLAYER: 0,
	MT_POSSESSED: 1,
	MT_SHOTGUY: 2,
	MT_IMP: 3,
	MT_DEMON: 4,
	MT_BARREL: 5,
	MT_STIMPACK: 6,
	MT_MEDIKIT: 7,
	MT_HEALTHBONUS: 8,
	MT_GREENARMOR: 9,
	MT_BLUEARMOR: 10,
	MT_CLIP: 11,
	MT_SHELLBOX: 12,
	MT_BLUEKEY: 13,
	MT_REDKEY: 14,
	MT_YELLOWKEY: 15,
	MT_MISC0: 16,
	MT_MISC1: 17,
} as const;

// ─── Mobj Info ─────────────────────────────────────────────────────

/** Per-type definition of a map object's base properties. */
export interface MobjInfo {
	/** DoomEd thing number used in WAD map data. */
	readonly doomEdNum: number;
	/** Health when first spawned. */
	readonly spawnHealth: number;
	/** Collision radius in map units. */
	readonly radius: number;
	/** Collision height in map units. */
	readonly height: number;
	/** Movement speed in map units per tic. */
	readonly speed: number;
	/** Bitmask of MobjFlags. */
	readonly flags: number;
	/** Four-character sprite prefix name. */
	readonly spriteName: string;
}

const { MF_SPECIAL, MF_SOLID, MF_SHOOTABLE, MF_COUNTKILL, MF_COUNTITEM } =
	MobjFlags;

/**
 * Lookup table mapping MobjType values to their base info.
 *
 * @example
 * ```typescript
 * import { MOBJINFO, MobjType } from './mobj.js';
 * const impInfo = MOBJINFO[MobjType.MT_IMP];
 * console.log(impInfo?.spawnHealth); // 60
 * ```
 */
export const MOBJINFO: Record<number, MobjInfo> = {
	[MobjType.MT_PLAYER]: {
		doomEdNum: 1,
		spawnHealth: 100,
		radius: 16,
		height: 56,
		speed: 0,
		flags: MF_SOLID | MF_SHOOTABLE,
		spriteName: 'PLAY',
	},
	[MobjType.MT_POSSESSED]: {
		doomEdNum: 3004,
		spawnHealth: 20,
		radius: 20,
		height: 56,
		speed: 8,
		flags: MF_SOLID | MF_SHOOTABLE | MF_COUNTKILL,
		spriteName: 'POSS',
	},
	[MobjType.MT_SHOTGUY]: {
		doomEdNum: 9,
		spawnHealth: 30,
		radius: 20,
		height: 56,
		speed: 8,
		flags: MF_SOLID | MF_SHOOTABLE | MF_COUNTKILL,
		spriteName: 'SPOS',
	},
	[MobjType.MT_IMP]: {
		doomEdNum: 3001,
		spawnHealth: 60,
		radius: 20,
		height: 56,
		speed: 8,
		flags: MF_SOLID | MF_SHOOTABLE | MF_COUNTKILL,
		spriteName: 'TROO',
	},
	[MobjType.MT_DEMON]: {
		doomEdNum: 3002,
		spawnHealth: 150,
		radius: 30,
		height: 56,
		speed: 10,
		flags: MF_SOLID | MF_SHOOTABLE | MF_COUNTKILL,
		spriteName: 'SARG',
	},
	[MobjType.MT_BARREL]: {
		doomEdNum: 2035,
		spawnHealth: 20,
		radius: 10,
		height: 42,
		speed: 0,
		flags: MF_SOLID | MF_SHOOTABLE,
		spriteName: 'BAR1',
	},
	[MobjType.MT_STIMPACK]: {
		doomEdNum: 2011,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'STIM',
	},
	[MobjType.MT_MEDIKIT]: {
		doomEdNum: 2012,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'MEDI',
	},
	[MobjType.MT_HEALTHBONUS]: {
		doomEdNum: 2014,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'BON1',
	},
	[MobjType.MT_GREENARMOR]: {
		doomEdNum: 2018,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'ARM1',
	},
	[MobjType.MT_BLUEARMOR]: {
		doomEdNum: 2019,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'ARM2',
	},
	[MobjType.MT_CLIP]: {
		doomEdNum: 2007,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'CLIP',
	},
	[MobjType.MT_SHELLBOX]: {
		doomEdNum: 2049,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'SBOX',
	},
	[MobjType.MT_BLUEKEY]: {
		doomEdNum: 5,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'BKEY',
	},
	[MobjType.MT_REDKEY]: {
		doomEdNum: 13,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'RKEY',
	},
	[MobjType.MT_YELLOWKEY]: {
		doomEdNum: 6,
		spawnHealth: 0,
		radius: 20,
		height: 16,
		speed: 0,
		flags: MF_SPECIAL | MF_COUNTITEM,
		spriteName: 'YKEY',
	},
	[MobjType.MT_MISC0]: {
		doomEdNum: 2028,
		spawnHealth: 0,
		radius: 16,
		height: 16,
		speed: 0,
		flags: MF_SOLID,
		spriteName: 'COLU',
	},
	[MobjType.MT_MISC1]: {
		doomEdNum: 2015,
		spawnHealth: 0,
		radius: 16,
		height: 16,
		speed: 0,
		flags: MF_SOLID,
		spriteName: 'BON2',
	},
};

// ─── DoomEd Number Lookup ──────────────────────────────────────────

/**
 * Maps DoomEd thing numbers (from WAD data) to internal MobjType IDs.
 * Built automatically from the MOBJINFO table.
 *
 * @example
 * ```typescript
 * import { DOOMED_TO_MOBJ } from './mobj.js';
 * const type = DOOMED_TO_MOBJ.get(3004); // MobjType.MT_POSSESSED (1)
 * ```
 */
export const DOOMED_TO_MOBJ: ReadonlyMap<number, number> = buildDoomEdMap();

function buildDoomEdMap(): Map<number, number> {
	const map = new Map<number, number>();
	for (const [typeId, info] of Object.entries(MOBJINFO)) {
		map.set(info.doomEdNum, Number(typeId));
	}
	return map;
}

// ─── Mobj Instance ─────────────────────────────────────────────────

/** Mutable map object instance placed in the game world. */
export interface Mobj {
	/** X position in fixed-point. */
	x: number;
	/** Y position in fixed-point. */
	y: number;
	/** Z position in fixed-point. */
	z: number;
	/** Facing angle in BAM (Binary Angular Measurement). */
	angle: number;
	/** Internal MobjType ID. */
	type: number;
	/** Reference to the type's base info. */
	info: MobjInfo;
	/** Current health. */
	health: number;
	/** Current flags bitmask. */
	flags: number;
	/** Four-character sprite prefix. */
	spriteName: string;
	/** Current animation frame index. */
	frame: number;
	/** Tics remaining until next animation frame. */
	tics: number;
	/** Collision radius in fixed-point. */
	radius: number;
	/** Collision height in fixed-point. */
	height: number;
	/** X momentum in fixed-point. */
	momx: number;
	/** Y momentum in fixed-point. */
	momy: number;
	/** Z momentum in fixed-point. */
	momz: number;
	/** Index of the sector this mobj occupies. */
	sectorIndex: number;
	/** Whether the mobj is still alive. */
	alive: boolean;
	/** Current state index in the state table. */
	stateIndex: number;
	/** Target mobj (for AI chasing/attacking), or null. */
	target: Mobj | null;
	/** Moves remaining before changing direction. */
	movecount: number;
	/** Tics before first attack after seeing player. */
	reactiontime: number;
	/** Current movement direction (0-7 cardinal/diagonal, 8 = none). */
	movedir: number;
	/** Attack cooldown threshold. */
	threshold: number;
}

/**
 * Create a new map object from a map thing definition.
 *
 * Converts map-unit coordinates to fixed-point, sets the angle to BAM,
 * and copies base stats from the type info.
 *
 * @param thing - The map thing from WAD data
 * @param mobjType - Internal MobjType ID
 * @param info - Base properties for this type
 * @param floorHeight - Floor height at the spawn position (map units)
 * @returns A fully initialized Mobj
 *
 * @example
 * ```typescript
 * import { createMobj, MOBJINFO, MobjType } from './mobj.js';
 * const thing = { x: 100, y: 200, angle: 90, type: 3004, flags: 7 };
 * const info = MOBJINFO[MobjType.MT_POSSESSED]!;
 * const mobj = createMobj(thing, MobjType.MT_POSSESSED, info, 0);
 * ```
 */
export function createMobj(
	thing: MapThing,
	mobjType: number,
	info: MobjInfo,
	floorHeight: number,
): Mobj {
	const bam = ((thing.angle / 360) * 0x100000000) >>> 0;

	return {
		x: thing.x << FRACBITS,
		y: thing.y << FRACBITS,
		z: floorHeight << FRACBITS,
		angle: bam,
		type: mobjType,
		info,
		health: info.spawnHealth,
		flags: info.flags,
		spriteName: info.spriteName,
		frame: 0,
		tics: -1,
		radius: info.radius << FRACBITS,
		height: info.height << FRACBITS,
		momx: 0,
		momy: 0,
		momz: 0,
		sectorIndex: 0,
		alive: true,
		stateIndex: 0,
		target: null,
		movecount: 0,
		reactiontime: 8,
		movedir: 8,
		threshold: 0,
	};
}

/**
 * Apply damage to a map object.
 *
 * Subtracts the damage amount from health. If health drops to zero
 * or below, the mobj is killed: alive is set to false, MF_CORPSE is
 * added, and MF_SOLID / MF_SHOOTABLE are removed.
 *
 * @param mobj - The map object to damage (mutated in place)
 * @param damage - Amount of damage to inflict
 *
 * @example
 * ```typescript
 * import { damageMobj, MobjFlags } from './mobj.js';
 * damageMobj(mobj, 15);
 * if (!mobj.alive) {
 *   console.log('mobj killed');
 * }
 * ```
 */
export function damageMobj(mobj: Mobj, damage: number): void {
	mobj.health -= damage;

	if (mobj.health <= 0) {
		mobj.alive = false;
		mobj.flags |= MobjFlags.MF_CORPSE;
		mobj.flags &= ~MobjFlags.MF_SOLID;
		mobj.flags &= ~MobjFlags.MF_SHOOTABLE;
	}
}
