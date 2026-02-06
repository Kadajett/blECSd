/**
 * Level transition logic: exit detection, intermission, and map loading.
 *
 * Handles exit linedef specials (type 11=normal exit, type 51=secret exit),
 * tracks level statistics (kills, time), manages the intermission screen
 * state machine, and coordinates loading the next map while carrying over
 * player state (health, ammo, weapons).
 *
 * Matches Doom's G_ExitLevel, G_SecretExitLevel, and WI_ intermission code.
 *
 * @module game/levelTransition
 */

import type { MapData } from '../wad/types.js';
import type { WadFile } from '../wad/types.js';
import { findLump } from '../wad/wad.js';
import { loadMap } from '../wad/mapData.js';
import { spawnMapThings } from './spawn.js';
import { createPlayer, type PlayerState } from './player.js';
import { type WeaponState, createWeaponState } from './weapons.js';
import { type GameState, GamePhase, createGameState } from './death.js';
import { type Mobj, MobjFlags } from './mobj.js';
import { initThinkers } from './thinkers.js';
import { type SpecialsState, createSpecialsState } from './specials.js';

// ─── Level Transition Phase ───────────────────────────────────────

/** Phases of the level transition state machine. */
export const TransitionPhase = {
	/** Normal gameplay, no transition in progress. */
	NONE: 0,
	/** Exit triggered, collecting stats for intermission. */
	EXITING: 1,
	/** Intermission screen is showing. */
	INTERMISSION: 2,
	/** Loading next level. */
	LOADING: 3,
} as const;

// ─── Episode Map Tables ──────────────────────────────────────────

/**
 * Map name sequences for Doom 1 episodes.
 * doom1.wad has E1M1-E1M9.
 */
const EPISODE_MAPS: readonly (readonly string[])[] = [
	['E1M1', 'E1M2', 'E1M3', 'E1M4', 'E1M5', 'E1M6', 'E1M7', 'E1M8', 'E1M9'],
	['E2M1', 'E2M2', 'E2M3', 'E2M4', 'E2M5', 'E2M6', 'E2M7', 'E2M8', 'E2M9'],
	['E3M1', 'E3M2', 'E3M3', 'E3M4', 'E3M5', 'E3M6', 'E3M7', 'E3M8', 'E3M9'],
];

/**
 * Secret exit destinations. When a secret exit is triggered on these maps,
 * the player goes to the secret level (E1M9) instead of the next in sequence.
 */
const SECRET_EXIT_MAP: Record<string, string> = {
	E1M3: 'E1M9',
	E2M5: 'E2M9',
	E3M6: 'E3M9',
};

/**
 * Where secret levels return to on normal exit.
 */
const SECRET_RETURN_MAP: Record<string, string> = {
	E1M9: 'E1M4',
	E2M9: 'E2M6',
	E3M9: 'E3M7',
};

/** Par times in seconds for E1 maps (from Doom source). */
export const PAR_TIMES: Record<string, number> = {
	E1M1: 30,
	E1M2: 75,
	E1M3: 120,
	E1M4: 90,
	E1M5: 165,
	E1M6: 180,
	E1M7: 180,
	E1M8: 30,
	E1M9: 165,
};

// ─── Level Stats ──────────────────────────────────────────────────

/** Statistics collected during a level. */
export interface LevelStats {
	/** Total monsters on the map. */
	totalKills: number;
	/** Monsters killed by the player. */
	kills: number;
	/** Level start time (ms since epoch). */
	startTime: number;
	/** Level completion time in seconds. */
	completionTimeSecs: number;
}

/**
 * Create initial level stats for a new map.
 *
 * @param mobjs - Spawned mobjs to count killable monsters
 * @returns Fresh level stats
 */
export function createLevelStats(mobjs: readonly Mobj[]): LevelStats {
	let totalKills = 0;
	for (const m of mobjs) {
		if (m.flags & MobjFlags.MF_SHOOTABLE) {
			totalKills++;
		}
	}
	return {
		totalKills,
		kills: 0,
		startTime: Date.now(),
		completionTimeSecs: 0,
	};
}

/**
 * Count current kills from the mobj array.
 *
 * @param mobjs - All map objects
 * @param stats - Level stats with totalKills set
 * @returns Number of killed monsters
 */
export function countKills(mobjs: readonly Mobj[], stats: LevelStats): number {
	let dead = 0;
	for (const m of mobjs) {
		if (!m.alive && (m.flags & MobjFlags.MF_CORPSE)) {
			dead++;
		}
	}
	return dead;
}

// ─── Transition State ─────────────────────────────────────────────

/** Mutable transition state. */
export interface TransitionState {
	/** Current transition phase. */
	phase: number;
	/** Current map name (e.g., 'E1M1'). */
	currentMap: string;
	/** Next map to load. */
	nextMap: string;
	/** Whether this was a secret exit. */
	secretExit: boolean;
	/** Stats for the completed level. */
	stats: LevelStats;
	/** Tics spent in the intermission screen. */
	intermissionTics: number;
	/** Whether the intermission count animations are done. */
	countsFinished: boolean;
	/** Animated kill percentage for display. */
	displayKillPct: number;
	/** Animated time for display (seconds). */
	displayTime: number;
}

/**
 * Create initial transition state.
 *
 * @param mapName - Starting map name
 * @returns Fresh transition state
 */
export function createTransitionState(mapName: string): TransitionState {
	return {
		phase: TransitionPhase.NONE,
		currentMap: mapName.toUpperCase(),
		nextMap: '',
		secretExit: false,
		stats: {
			totalKills: 0,
			kills: 0,
			startTime: Date.now(),
			completionTimeSecs: 0,
		},
		intermissionTics: 0,
		countsFinished: false,
		displayKillPct: 0,
		displayTime: 0,
	};
}

// ─── Exit Detection ──────────────────────────────────────────────

/**
 * Check if a linedef special is an exit trigger.
 *
 * @param special - Linedef special type
 * @returns true if this is an exit linedef
 */
export function isExitSpecial(special: number): boolean {
	return special === 11 || special === 51 || special === 52 || special === 124;
}

/**
 * Check if a linedef special is a secret exit.
 *
 * @param special - Linedef special type
 * @returns true if this is a secret exit
 */
export function isSecretExit(special: number): boolean {
	return special === 51 || special === 124;
}

/**
 * Trigger a level exit. Collects stats and transitions to the EXITING phase.
 *
 * @param ts - Mutable transition state
 * @param mobjs - Current map objects (for kill counting)
 * @param secret - Whether this is a secret exit
 */
export function triggerExit(
	ts: TransitionState,
	mobjs: readonly Mobj[],
	secret: boolean,
): void {
	if (ts.phase !== TransitionPhase.NONE) return;

	ts.secretExit = secret;

	// Collect level stats
	ts.stats.kills = countKills(mobjs, ts.stats);
	ts.stats.completionTimeSecs = Math.floor((Date.now() - ts.stats.startTime) / 1000);

	// Determine next map
	ts.nextMap = getNextMap(ts.currentMap, secret);

	ts.phase = TransitionPhase.EXITING;
}

// ─── Map Sequencing ──────────────────────────────────────────────

/**
 * Get the next map name after the current one.
 *
 * @param currentMap - Current map name (e.g., 'E1M3')
 * @param secret - Whether the secret exit was used
 * @returns Next map name, or empty string if no more maps
 */
export function getNextMap(currentMap: string, secret: boolean): string {
	const upper = currentMap.toUpperCase();

	// Secret exit: go to the secret map
	if (secret) {
		const secretDest = SECRET_EXIT_MAP[upper];
		if (secretDest) return secretDest;
	}

	// Secret level returning via normal exit
	const returnDest = SECRET_RETURN_MAP[upper];
	if (returnDest) return returnDest;

	// Find the current map in the episode sequence
	for (const episode of EPISODE_MAPS) {
		const idx = episode.indexOf(upper);
		if (idx === -1) continue;

		// Last non-secret map in episode (M8): no next map
		if (idx === 7) return '';

		const next = episode[idx + 1];
		if (!next) return '';

		// Skip M9 in normal sequence
		return next;
	}

	return '';
}

// ─── Intermission ────────────────────────────────────────────────

/** Tics to count up each stat line. */
const COUNT_SPEED = 2;

/** Tics to wait after all counts finish before allowing skip. */
const AFTER_COUNT_DELAY = 35;

/**
 * Begin the intermission screen.
 *
 * @param ts - Mutable transition state
 */
export function startIntermission(ts: TransitionState): void {
	if (ts.phase !== TransitionPhase.EXITING) return;
	ts.phase = TransitionPhase.INTERMISSION;
	ts.intermissionTics = 0;
	ts.countsFinished = false;
	ts.displayKillPct = 0;
	ts.displayTime = 0;
}

/**
 * Tick the intermission screen by one tic.
 * Animates the kill percentage and time counters.
 *
 * @param ts - Mutable transition state
 */
export function tickIntermission(ts: TransitionState): void {
	if (ts.phase !== TransitionPhase.INTERMISSION) return;

	ts.intermissionTics++;

	if (ts.countsFinished) return;

	// Target values
	const targetKillPct = ts.stats.totalKills > 0
		? Math.floor((ts.stats.kills / ts.stats.totalKills) * 100)
		: 100;
	const targetTime = ts.stats.completionTimeSecs;

	// Animate kill percentage
	if (ts.displayKillPct < targetKillPct) {
		ts.displayKillPct += COUNT_SPEED;
		if (ts.displayKillPct > targetKillPct) {
			ts.displayKillPct = targetKillPct;
		}
	}

	// Animate time counter
	if (ts.displayTime < targetTime) {
		ts.displayTime += COUNT_SPEED;
		if (ts.displayTime > targetTime) {
			ts.displayTime = targetTime;
		}
	}

	// Check if all counts are done
	if (ts.displayKillPct >= targetKillPct && ts.displayTime >= targetTime) {
		ts.countsFinished = true;
	}
}

/**
 * Check if the intermission can be skipped (press USE to continue).
 *
 * @param ts - Transition state
 * @returns true if the player can advance past intermission
 */
export function canSkipIntermission(ts: TransitionState): boolean {
	if (ts.phase !== TransitionPhase.INTERMISSION) return false;
	// Allow skip after counts are done or after a timeout
	return ts.countsFinished || ts.intermissionTics > 35 * 5;
}

/**
 * Skip to the end of the count animation.
 *
 * @param ts - Mutable transition state
 */
export function skipCounts(ts: TransitionState): void {
	if (ts.phase !== TransitionPhase.INTERMISSION) return;
	if (ts.countsFinished) return;

	const targetKillPct = ts.stats.totalKills > 0
		? Math.floor((ts.stats.kills / ts.stats.totalKills) * 100)
		: 100;

	ts.displayKillPct = targetKillPct;
	ts.displayTime = ts.stats.completionTimeSecs;
	ts.countsFinished = true;
}

// ─── Level Loading ───────────────────────────────────────────────

/** Result of loading a new level. */
export interface LoadLevelResult {
	map: MapData;
	mobjs: Mobj[];
}

/**
 * Check if a map exists in the WAD.
 *
 * @param wad - WAD file
 * @param mapName - Map name to check
 * @returns true if the map exists
 */
export function mapExists(wad: WadFile, mapName: string): boolean {
	return findLump(wad, mapName) !== undefined;
}

/**
 * Load a new level from the WAD.
 *
 * @param wad - WAD file
 * @param mapName - Map name to load (e.g., 'E1M2')
 * @param skill - Skill level for thing spawning
 * @returns Loaded map and spawned mobjs
 */
export function doLoadLevel(
	wad: WadFile,
	mapName: string,
	skill: number,
): LoadLevelResult {
	const map = loadMap(wad, mapName);
	const mobjs = spawnMapThings(map, skill);
	initThinkers(mobjs);
	return { map, mobjs };
}

/**
 * Carry over persistent player state between levels.
 * Copies health, armor, ammo, and weapon ownership from the old
 * player/weapon state, but resets position to the new map's player start.
 *
 * @param player - Mutable player state to update (positioned at new map start)
 * @param weaponState - Mutable weapon state to update
 * @param oldPlayer - Player state from the completed level
 * @param oldWeapons - Weapon state from the completed level
 * @param newMap - New map data (for player start position)
 */
export function carryOverPlayerState(
	player: PlayerState,
	weaponState: WeaponState,
	oldPlayer: PlayerState,
	oldWeapons: WeaponState,
	newMap: MapData,
): void {
	// Position comes from the new map's player start (already set by createPlayer)
	// But carry over stats
	player.health = oldPlayer.health;
	player.armor = oldPlayer.armor;
	player.ammo = oldPlayer.ammo;
	player.maxAmmo = oldPlayer.maxAmmo;

	// Carry over weapon state
	weaponState.current = oldWeapons.current;
	weaponState.owned = [...oldWeapons.owned];
	weaponState.ammo = [...oldWeapons.ammo];
	weaponState.maxAmmo = [...oldWeapons.maxAmmo];

	// Reset weapon animation to raise state
	weaponState.pendingWeapon = -1;
	weaponState.state = 0; // WS_RAISE
	weaponState.tics = 6;
	weaponState.frame = 0;
	weaponState.ready = false;
	weaponState.bobX = 0;
	weaponState.bobY = 0;
	weaponState.flashTics = 0;
}

/**
 * Advance the exit phase to intermission.
 * Called on the frame after the exit is triggered.
 *
 * @param ts - Mutable transition state
 */
export function advanceToIntermission(ts: TransitionState): void {
	if (ts.phase !== TransitionPhase.EXITING) return;
	startIntermission(ts);
}

/**
 * Advance past the intermission to loading phase.
 *
 * @param ts - Mutable transition state
 */
export function advanceToLoading(ts: TransitionState): void {
	if (ts.phase !== TransitionPhase.INTERMISSION) return;
	ts.phase = TransitionPhase.LOADING;
}

/**
 * Complete the level transition. Resets the transition state for the new level.
 *
 * @param ts - Mutable transition state
 * @param newMapName - The name of the newly loaded map
 * @param mobjs - The newly spawned mobjs for stats tracking
 */
export function completeTransition(
	ts: TransitionState,
	newMapName: string,
	mobjs: readonly Mobj[],
): void {
	ts.phase = TransitionPhase.NONE;
	ts.currentMap = newMapName.toUpperCase();
	ts.nextMap = '';
	ts.secretExit = false;
	ts.stats = createLevelStats(mobjs);
	ts.intermissionTics = 0;
	ts.countsFinished = false;
	ts.displayKillPct = 0;
	ts.displayTime = 0;
}

/**
 * Check if the transition state is in a non-gameplay phase.
 *
 * @param ts - Transition state
 * @returns true if in any transition phase
 */
export function isInTransition(ts: TransitionState): boolean {
	return ts.phase !== TransitionPhase.NONE;
}

/**
 * Check if the game has reached the end of the episode (no next map).
 *
 * @param ts - Transition state
 * @returns true if the episode is complete
 */
export function isEpisodeComplete(ts: TransitionState): boolean {
	return ts.nextMap === '' && ts.phase !== TransitionPhase.NONE;
}

/**
 * Format a time in seconds as MM:SS.
 *
 * @param secs - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(secs: number): string {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${s < 10 ? '0' : ''}${s}`;
}
