/**
 * Tests for the level transition system.
 *
 * @module game/levelTransition.test
 */

import { describe, expect, it } from 'vitest';
import { MobjFlags, MobjType, MOBJINFO } from './mobj.js';
import type { Mobj } from './mobj.js';
import { FRACBITS } from '../math/fixed.js';
import {
	TransitionPhase,
	createTransitionState,
	createLevelStats,
	countKills,
	triggerExit,
	getNextMap,
	startIntermission,
	tickIntermission,
	canSkipIntermission,
	skipCounts,
	advanceToIntermission,
	advanceToLoading,
	completeTransition,
	isInTransition,
	isEpisodeComplete,
	isExitSpecial,
	isSecretExit,
	carryOverPlayerState,
	formatTime,
	PAR_TIMES,
} from './levelTransition.js';
import type { PlayerState } from './player.js';
import type { WeaponState } from './weapons.js';
import type { MapData } from '../wad/types.js';

// ─── Test Helpers ─────────────────────────────────────────────────

function createTestMobj(overrides: Partial<Mobj> = {}): Mobj {
	const info = MOBJINFO[MobjType.MT_IMP]!;
	return {
		x: 0,
		y: 0,
		z: 0,
		angle: 0,
		type: MobjType.MT_IMP,
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
		...overrides,
	};
}

function createDeadMobj(): Mobj {
	return createTestMobj({
		alive: false,
		health: 0,
		flags: MobjFlags.MF_CORPSE,
	});
}

function createTestPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
	return {
		x: 0,
		y: 0,
		z: 0,
		angle: 0,
		viewz: 41 << FRACBITS,
		viewheight: 41 << FRACBITS,
		deltaviewheight: 0,
		momx: 0,
		momy: 0,
		health: 100,
		armor: 50,
		ammo: 75,
		maxAmmo: 200,
		forwardSpeed: 25 * 2048,
		sideSpeed: 24 * 2048,
		turnSpeed: 1280 << 16,
		sectorIndex: 0,
		...overrides,
	};
}

function createTestWeaponState(overrides: Partial<WeaponState> = {}): WeaponState {
	return {
		current: 1,
		pendingWeapon: -1,
		state: 1,
		tics: 1,
		frame: 0,
		ready: true,
		owned: [true, true, true, false],
		ammo: [0, 80, 20],
		maxAmmo: [0, 200, 50],
		bobX: 0,
		bobY: 0,
		flashTics: 0,
		...overrides,
	};
}

function createMinimalMap(): MapData {
	return {
		name: 'E1M1',
		vertexes: [],
		linedefs: [],
		sidedefs: [],
		sectors: [{ floorHeight: 0, ceilingHeight: 128, floorFlat: 'FLAT1', ceilingFlat: 'FLAT1', lightLevel: 160, special: 0, tag: 0 }],
		subsectors: [],
		segs: [],
		nodes: [],
		things: [{ x: 100, y: 200, angle: 90, type: 1, flags: 7 }],
		blockmap: {
			header: { originX: -1000, originY: -1000, columns: 20, rows: 20 },
			offsets: new Uint16Array(400) as unknown as readonly number[],
			data: new DataView(new ArrayBuffer(4)),
		},
	} as MapData;
}

// ─── createTransitionState ────────────────────────────────────────

describe('createTransitionState', () => {
	it('starts in NONE phase', () => {
		const ts = createTransitionState('E1M1');
		expect(ts.phase).toBe(TransitionPhase.NONE);
	});

	it('stores map name in uppercase', () => {
		const ts = createTransitionState('e1m1');
		expect(ts.currentMap).toBe('E1M1');
	});

	it('has empty next map', () => {
		const ts = createTransitionState('E1M1');
		expect(ts.nextMap).toBe('');
	});
});

// ─── createLevelStats ─────────────────────────────────────────────

describe('createLevelStats', () => {
	it('counts shootable monsters', () => {
		const mobjs = [
			createTestMobj(),
			createTestMobj(),
			createTestMobj({ flags: 0 }), // not shootable
		];
		const stats = createLevelStats(mobjs);
		expect(stats.totalKills).toBe(2);
	});

	it('starts with zero kills', () => {
		const stats = createLevelStats([createTestMobj()]);
		expect(stats.kills).toBe(0);
	});

	it('returns 0 for empty mobjs', () => {
		const stats = createLevelStats([]);
		expect(stats.totalKills).toBe(0);
	});
});

// ─── countKills ───────────────────────────────────────────────────

describe('countKills', () => {
	it('counts dead corpses', () => {
		const mobjs = [
			createTestMobj(),
			createDeadMobj(),
			createDeadMobj(),
		];
		const stats = createLevelStats(mobjs);
		expect(countKills(mobjs, stats)).toBe(2);
	});

	it('returns 0 for all alive', () => {
		const mobjs = [createTestMobj(), createTestMobj()];
		const stats = createLevelStats(mobjs);
		expect(countKills(mobjs, stats)).toBe(0);
	});
});

// ─── Exit Detection ───────────────────────────────────────────────

describe('isExitSpecial', () => {
	it('recognizes type 11 (W1 exit)', () => {
		expect(isExitSpecial(11)).toBe(true);
	});

	it('recognizes type 51 (W1 secret exit)', () => {
		expect(isExitSpecial(51)).toBe(true);
	});

	it('recognizes type 52 (S1 exit)', () => {
		expect(isExitSpecial(52)).toBe(true);
	});

	it('recognizes type 124 (S1 secret exit)', () => {
		expect(isExitSpecial(124)).toBe(true);
	});

	it('rejects non-exit specials', () => {
		expect(isExitSpecial(1)).toBe(false);
		expect(isExitSpecial(0)).toBe(false);
	});
});

describe('isSecretExit', () => {
	it('recognizes type 51', () => {
		expect(isSecretExit(51)).toBe(true);
	});

	it('recognizes type 124', () => {
		expect(isSecretExit(124)).toBe(true);
	});

	it('rejects normal exits', () => {
		expect(isSecretExit(11)).toBe(false);
		expect(isSecretExit(52)).toBe(false);
	});
});

// ─── triggerExit ──────────────────────────────────────────────────

describe('triggerExit', () => {
	it('transitions to EXITING phase', () => {
		const ts = createTransitionState('E1M1');
		ts.stats = createLevelStats([]);
		triggerExit(ts, [], false);
		expect(ts.phase).toBe(TransitionPhase.EXITING);
	});

	it('sets next map for normal exit', () => {
		const ts = createTransitionState('E1M1');
		ts.stats = createLevelStats([]);
		triggerExit(ts, [], false);
		expect(ts.nextMap).toBe('E1M2');
	});

	it('sets secret map for secret exit', () => {
		const ts = createTransitionState('E1M3');
		ts.stats = createLevelStats([]);
		triggerExit(ts, [], true);
		expect(ts.nextMap).toBe('E1M9');
	});

	it('does not re-trigger when already exiting', () => {
		const ts = createTransitionState('E1M1');
		ts.stats = createLevelStats([]);
		triggerExit(ts, [], false);
		ts.nextMap = 'E1M2';
		triggerExit(ts, [], true); // should be ignored
		expect(ts.nextMap).toBe('E1M2'); // unchanged
	});

	it('collects kill stats', () => {
		const ts = createTransitionState('E1M1');
		const mobjs = [createTestMobj(), createDeadMobj()];
		ts.stats = createLevelStats(mobjs);
		triggerExit(ts, mobjs, false);
		expect(ts.stats.kills).toBe(1);
	});
});

// ─── getNextMap ───────────────────────────────────────────────────

describe('getNextMap', () => {
	it('E1M1 -> E1M2 (normal)', () => {
		expect(getNextMap('E1M1', false)).toBe('E1M2');
	});

	it('E1M7 -> E1M8 (normal)', () => {
		expect(getNextMap('E1M7', false)).toBe('E1M8');
	});

	it('E1M8 -> empty (end of episode)', () => {
		expect(getNextMap('E1M8', false)).toBe('');
	});

	it('E1M3 -> E1M9 (secret exit)', () => {
		expect(getNextMap('E1M3', true)).toBe('E1M9');
	});

	it('E1M9 -> E1M4 (return from secret)', () => {
		expect(getNextMap('E1M9', false)).toBe('E1M4');
	});

	it('E1M3 -> E1M4 (normal exit, no secret)', () => {
		expect(getNextMap('E1M3', false)).toBe('E1M4');
	});

	it('handles lowercase map names', () => {
		expect(getNextMap('e1m1', false)).toBe('E1M2');
	});

	it('returns empty for unknown maps', () => {
		expect(getNextMap('E4M1', false)).toBe('');
	});
});

// ─── Intermission ─────────────────────────────────────────────────

describe('startIntermission', () => {
	it('transitions from EXITING to INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.EXITING;
		startIntermission(ts);
		expect(ts.phase).toBe(TransitionPhase.INTERMISSION);
	});

	it('does nothing if not in EXITING phase', () => {
		const ts = createTransitionState('E1M1');
		startIntermission(ts); // phase is NONE
		expect(ts.phase).toBe(TransitionPhase.NONE);
	});

	it('resets intermission counters', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.EXITING;
		ts.intermissionTics = 99;
		startIntermission(ts);
		expect(ts.intermissionTics).toBe(0);
		expect(ts.displayKillPct).toBe(0);
	});
});

describe('tickIntermission', () => {
	it('increments tic counter', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.stats.totalKills = 10;
		ts.stats.kills = 5;
		ts.stats.completionTimeSecs = 30;
		tickIntermission(ts);
		expect(ts.intermissionTics).toBe(1);
	});

	it('animates kill percentage upward', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.stats.totalKills = 10;
		ts.stats.kills = 10;
		ts.stats.completionTimeSecs = 0;
		tickIntermission(ts);
		expect(ts.displayKillPct).toBeGreaterThan(0);
	});

	it('does not exceed target kill percentage', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.stats.totalKills = 2;
		ts.stats.kills = 1; // 50%
		ts.stats.completionTimeSecs = 0;

		// Tick many times
		for (let i = 0; i < 100; i++) {
			tickIntermission(ts);
		}
		expect(ts.displayKillPct).toBe(50);
	});

	it('sets countsFinished when counts reach target', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.stats.totalKills = 0;
		ts.stats.kills = 0;
		ts.stats.completionTimeSecs = 0;

		// With 0 totalKills, target is 100%. Count up from 0 by 2/tick = 50 ticks
		for (let i = 0; i < 60; i++) {
			tickIntermission(ts);
		}
		expect(ts.countsFinished).toBe(true);
		expect(ts.displayKillPct).toBe(100);
	});

	it('does nothing if not in INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		tickIntermission(ts);
		expect(ts.intermissionTics).toBe(0);
	});
});

describe('canSkipIntermission', () => {
	it('returns true after counts finished', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.countsFinished = true;
		expect(canSkipIntermission(ts)).toBe(true);
	});

	it('returns true after timeout', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.intermissionTics = 35 * 6;
		expect(canSkipIntermission(ts)).toBe(true);
	});

	it('returns false when counts still running', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.countsFinished = false;
		ts.intermissionTics = 10;
		expect(canSkipIntermission(ts)).toBe(false);
	});

	it('returns false if not in INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		expect(canSkipIntermission(ts)).toBe(false);
	});
});

describe('skipCounts', () => {
	it('immediately finishes counts', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		ts.stats.totalKills = 10;
		ts.stats.kills = 7;
		ts.stats.completionTimeSecs = 45;
		skipCounts(ts);
		expect(ts.displayKillPct).toBe(70);
		expect(ts.displayTime).toBe(45);
		expect(ts.countsFinished).toBe(true);
	});
});

// ─── Phase Transitions ───────────────────────────────────────────

describe('advanceToIntermission', () => {
	it('moves from EXITING to INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.EXITING;
		advanceToIntermission(ts);
		expect(ts.phase).toBe(TransitionPhase.INTERMISSION);
	});
});

describe('advanceToLoading', () => {
	it('moves from INTERMISSION to LOADING', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		advanceToLoading(ts);
		expect(ts.phase).toBe(TransitionPhase.LOADING);
	});

	it('does nothing if not in INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		advanceToLoading(ts);
		expect(ts.phase).toBe(TransitionPhase.NONE);
	});
});

describe('completeTransition', () => {
	it('resets to NONE phase', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.LOADING;
		completeTransition(ts, 'E1M2', []);
		expect(ts.phase).toBe(TransitionPhase.NONE);
	});

	it('updates current map', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.LOADING;
		completeTransition(ts, 'E1M2', []);
		expect(ts.currentMap).toBe('E1M2');
	});

	it('resets stats for new map', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.LOADING;
		const mobjs = [createTestMobj()];
		completeTransition(ts, 'E1M2', mobjs);
		expect(ts.stats.totalKills).toBe(1);
		expect(ts.stats.kills).toBe(0);
	});
});

// ─── Query Functions ──────────────────────────────────────────────

describe('isInTransition', () => {
	it('returns false for NONE', () => {
		const ts = createTransitionState('E1M1');
		expect(isInTransition(ts)).toBe(false);
	});

	it('returns true for EXITING', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.EXITING;
		expect(isInTransition(ts)).toBe(true);
	});

	it('returns true for INTERMISSION', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.INTERMISSION;
		expect(isInTransition(ts)).toBe(true);
	});

	it('returns true for LOADING', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.LOADING;
		expect(isInTransition(ts)).toBe(true);
	});
});

describe('isEpisodeComplete', () => {
	it('returns true when no next map and in transition', () => {
		const ts = createTransitionState('E1M8');
		ts.phase = TransitionPhase.EXITING;
		ts.nextMap = '';
		expect(isEpisodeComplete(ts)).toBe(true);
	});

	it('returns false when there is a next map', () => {
		const ts = createTransitionState('E1M1');
		ts.phase = TransitionPhase.EXITING;
		ts.nextMap = 'E1M2';
		expect(isEpisodeComplete(ts)).toBe(false);
	});

	it('returns false when in NONE phase', () => {
		const ts = createTransitionState('E1M1');
		ts.nextMap = '';
		expect(isEpisodeComplete(ts)).toBe(false);
	});
});

// ─── Player State Carryover ───────────────────────────────────────

describe('carryOverPlayerState', () => {
	it('carries over health', () => {
		const player = createTestPlayer({ health: 50 });
		const ws = createTestWeaponState();
		const oldPlayer = createTestPlayer({ health: 75 });
		const oldWeapons = createTestWeaponState();
		const map = createMinimalMap();
		carryOverPlayerState(player, ws, oldPlayer, oldWeapons, map);
		expect(player.health).toBe(75);
	});

	it('carries over armor', () => {
		const player = createTestPlayer({ armor: 0 });
		const ws = createTestWeaponState();
		const oldPlayer = createTestPlayer({ armor: 30 });
		const oldWeapons = createTestWeaponState();
		const map = createMinimalMap();
		carryOverPlayerState(player, ws, oldPlayer, oldWeapons, map);
		expect(player.armor).toBe(30);
	});

	it('carries over weapon ownership', () => {
		const player = createTestPlayer();
		const ws = createTestWeaponState({ owned: [true, true, false, false] });
		const oldPlayer = createTestPlayer();
		const oldWeapons = createTestWeaponState({ owned: [true, true, true, true] });
		const map = createMinimalMap();
		carryOverPlayerState(player, ws, oldPlayer, oldWeapons, map);
		expect(ws.owned).toEqual([true, true, true, true]);
	});

	it('carries over ammo', () => {
		const player = createTestPlayer();
		const ws = createTestWeaponState({ ammo: [0, 10, 0] });
		const oldPlayer = createTestPlayer();
		const oldWeapons = createTestWeaponState({ ammo: [0, 80, 20] });
		const map = createMinimalMap();
		carryOverPlayerState(player, ws, oldPlayer, oldWeapons, map);
		expect(ws.ammo).toEqual([0, 80, 20]);
	});

	it('resets weapon animation state', () => {
		const player = createTestPlayer();
		const ws = createTestWeaponState({ flashTics: 5, bobX: 100, bobY: 200 });
		const oldPlayer = createTestPlayer();
		const oldWeapons = createTestWeaponState();
		const map = createMinimalMap();
		carryOverPlayerState(player, ws, oldPlayer, oldWeapons, map);
		expect(ws.flashTics).toBe(0);
		expect(ws.bobX).toBe(0);
		expect(ws.bobY).toBe(0);
	});
});

// ─── formatTime ───────────────────────────────────────────────────

describe('formatTime', () => {
	it('formats zero', () => {
		expect(formatTime(0)).toBe('0:00');
	});

	it('formats seconds only', () => {
		expect(formatTime(45)).toBe('0:45');
	});

	it('formats minutes and seconds', () => {
		expect(formatTime(90)).toBe('1:30');
	});

	it('pads seconds with zero', () => {
		expect(formatTime(65)).toBe('1:05');
	});

	it('handles large times', () => {
		expect(formatTime(3661)).toBe('61:01');
	});
});

// ─── PAR_TIMES ────────────────────────────────────────────────────

describe('PAR_TIMES', () => {
	it('has E1M1 par time', () => {
		expect(PAR_TIMES['E1M1']).toBe(30);
	});

	it('has all 9 E1 maps', () => {
		for (let i = 1; i <= 9; i++) {
			expect(PAR_TIMES[`E1M${i}`]).toBeDefined();
		}
	});
});

// ─── Full Flow ────────────────────────────────────────────────────

describe('full transition flow', () => {
	it('goes through NONE -> EXITING -> INTERMISSION -> LOADING -> NONE', () => {
		const ts = createTransitionState('E1M1');
		ts.stats = createLevelStats([]);

		expect(ts.phase).toBe(TransitionPhase.NONE);

		// Trigger exit
		triggerExit(ts, [], false);
		expect(ts.phase).toBe(TransitionPhase.EXITING);
		expect(ts.nextMap).toBe('E1M2');

		// Advance to intermission
		advanceToIntermission(ts);
		expect(ts.phase).toBe(TransitionPhase.INTERMISSION);

		// Skip counts and advance
		skipCounts(ts);
		expect(ts.countsFinished).toBe(true);

		advanceToLoading(ts);
		expect(ts.phase).toBe(TransitionPhase.LOADING);

		// Complete
		completeTransition(ts, 'E1M2', []);
		expect(ts.phase).toBe(TransitionPhase.NONE);
		expect(ts.currentMap).toBe('E1M2');
	});
});
