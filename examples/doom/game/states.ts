/**
 * Monster state machine definitions.
 *
 * Defines state entries for each monster type, controlling sprite display,
 * animation timing, action callbacks, and state transitions. Matches the
 * structure of Doom's info.c state table.
 *
 * @module game/states
 */

import type { Mobj } from './mobj.js';
import type { MapData } from '../wad/types.js';
import type { PlayerState } from './player.js';
import type { GameState } from './death.js';

// ─── Action Function Type ─────────────────────────────────────────

/** Context passed to state action functions. */
export interface ActionContext {
	readonly mobj: Mobj;
	readonly player: PlayerState;
	readonly gameState: GameState;
	readonly map: MapData;
	/** Mutable: action functions may spawn new mobjs (e.g. projectiles). */
	readonly mobjs: Mobj[];
}

/** An action function called during state transitions. */
export type ActionFn = (ctx: ActionContext) => void;

// ─── State Entry ──────────────────────────────────────────────────

/** A single state in the state table. */
export interface StateEntry {
	/** Four-character sprite name. */
	readonly sprite: string;
	/** Frame index (0 = A, 1 = B, etc.). */
	readonly frame: number;
	/** Tics to spend in this state (-1 = forever). */
	readonly tics: number;
	/** Action function name to call on entry, or null. */
	readonly action: string | null;
	/** Next state index to transition to. */
	readonly nextState: number;
}

// ─── State Table ──────────────────────────────────────────────────

/** Null state: removes the thinker. */
export const S_NULL = 0;

// Possessed (Zombieman) states
export const S_POSS_STND = 1;
export const S_POSS_RUN1 = 3;
export const S_POSS_ATK1 = 11;
export const S_POSS_PAIN = 14;
export const S_POSS_DIE1 = 16;

// Imp states
export const S_TROO_STND = 21;
export const S_TROO_RUN1 = 23;
export const S_TROO_ATK1 = 31;
export const S_TROO_PAIN = 34;
export const S_TROO_DIE1 = 36;

// Demon states
export const S_SARG_STND = 41;
export const S_SARG_RUN1 = 43;
export const S_SARG_ATK1 = 51;
export const S_SARG_PAIN = 54;
export const S_SARG_DIE1 = 56;

// Imp fireball (Troopshot) states
export const S_TBALL1 = 82;
export const S_TBALL_DIE1 = 84;

// Shotgun Guy states
export const S_SPOS_STND = 62;
export const S_SPOS_RUN1 = 64;
export const S_SPOS_ATK1 = 72;
export const S_SPOS_PAIN = 75;
export const S_SPOS_DIE1 = 77;

/**
 * The global state table. Index corresponds to state number.
 * Each entry defines sprite, frame, duration, action, and next state.
 */
export const STATES: readonly StateEntry[] = buildStateTable();

function buildStateTable(): StateEntry[] {
	const s: StateEntry[] = [];

	// Helper to push states sequentially
	function st(sprite: string, frame: number, tics: number, action: string | null, nextState: number): number {
		const idx = s.length;
		s.push({ sprite, frame, tics, action, nextState });
		return idx;
	}

	// S_NULL (0)
	st('', 0, -1, null, 0);

	// ─── Possessed (Zombieman) ─────────────────────────────────
	// Spawn: stand idle, frames A-B (states 1-2)
	st('POSS', 0, 10, 'A_Look', 2);  // S_POSS_STND (1)
	st('POSS', 1, 10, 'A_Look', 1);  // S_POSS_STND2 (2)
	// See: run cycle, frames A-D (states 3-10)
	st('POSS', 0, 4, 'A_Chase', 4);  // S_POSS_RUN1 (3)
	st('POSS', 0, 4, 'A_Chase', 5);  // S_POSS_RUN2 (4)
	st('POSS', 1, 4, 'A_Chase', 6);  // S_POSS_RUN3 (5)
	st('POSS', 1, 4, 'A_Chase', 7);  // S_POSS_RUN4 (6)
	st('POSS', 2, 4, 'A_Chase', 8);  // S_POSS_RUN5 (7)
	st('POSS', 2, 4, 'A_Chase', 9);  // S_POSS_RUN6 (8)
	st('POSS', 3, 4, 'A_Chase', 10); // S_POSS_RUN7 (9)
	st('POSS', 3, 4, 'A_Chase', 3);  // S_POSS_RUN8 (10)
	// Attack (states 11-13)
	st('POSS', 4, 10, 'A_FaceTarget', 12); // S_POSS_ATK1 (11)
	st('POSS', 5, 8, 'A_PosAttack', 13);   // S_POSS_ATK2 (12)
	st('POSS', 4, 8, null, 3);              // S_POSS_ATK3 (13)
	// Pain (states 14-15)
	st('POSS', 6, 3, null, 15);            // S_POSS_PAIN (14)
	st('POSS', 6, 3, 'A_Pain', 3);         // S_POSS_PAIN2 (15)
	// Death (states 16-20)
	st('POSS', 7, 5, null, 17);            // S_POSS_DIE1 (16)
	st('POSS', 8, 5, 'A_Scream', 18);      // S_POSS_DIE2 (17)
	st('POSS', 9, 5, 'A_Fall', 19);        // S_POSS_DIE3 (18)
	st('POSS', 10, 5, null, 20);           // S_POSS_DIE4 (19)
	st('POSS', 11, -1, null, 20);          // S_POSS_DIE5 (20)

	// ─── Imp ───────────────────────────────────────────────────
	// Spawn (states 21-22)
	st('TROO', 0, 10, 'A_Look', 22); // S_TROO_STND (21)
	st('TROO', 1, 10, 'A_Look', 21); // S_TROO_STND2 (22)
	// See (states 23-30)
	st('TROO', 0, 3, 'A_Chase', 24); // S_TROO_RUN1 (23)
	st('TROO', 0, 3, 'A_Chase', 25);
	st('TROO', 1, 3, 'A_Chase', 26);
	st('TROO', 1, 3, 'A_Chase', 27);
	st('TROO', 2, 3, 'A_Chase', 28);
	st('TROO', 2, 3, 'A_Chase', 29);
	st('TROO', 3, 3, 'A_Chase', 30);
	st('TROO', 3, 3, 'A_Chase', 23); // S_TROO_RUN8 (30)
	// Attack (states 31-33)
	st('TROO', 4, 8, 'A_FaceTarget', 32);  // S_TROO_ATK1 (31)
	st('TROO', 5, 8, 'A_FaceTarget', 33);  // S_TROO_ATK2 (32)
	st('TROO', 6, 6, 'A_TroopAttack', 23); // S_TROO_ATK3 (33)
	// Pain (states 34-35)
	st('TROO', 7, 2, null, 35);            // S_TROO_PAIN (34)
	st('TROO', 7, 2, 'A_Pain', 23);        // S_TROO_PAIN2 (35)
	// Death (states 36-40)
	st('TROO', 8, 8, null, 37);            // S_TROO_DIE1 (36)
	st('TROO', 9, 8, 'A_Scream', 38);
	st('TROO', 10, 6, null, 39);
	st('TROO', 11, 6, 'A_Fall', 40);
	st('TROO', 12, -1, null, 40);          // S_TROO_DIE5 (40)

	// ─── Demon (Pinky) ────────────────────────────────────────
	// Spawn (states 41-42)
	st('SARG', 0, 10, 'A_Look', 42); // S_SARG_STND (41)
	st('SARG', 1, 10, 'A_Look', 41); // S_SARG_STND2 (42)
	// See (states 43-50)
	st('SARG', 0, 2, 'A_Chase', 44);
	st('SARG', 0, 2, 'A_Chase', 45);
	st('SARG', 1, 2, 'A_Chase', 46);
	st('SARG', 1, 2, 'A_Chase', 47);
	st('SARG', 2, 2, 'A_Chase', 48);
	st('SARG', 2, 2, 'A_Chase', 49);
	st('SARG', 3, 2, 'A_Chase', 50);
	st('SARG', 3, 2, 'A_Chase', 43); // S_SARG_RUN8 (50)
	// Attack (states 51-53)
	st('SARG', 4, 8, 'A_FaceTarget', 52);   // S_SARG_ATK1 (51)
	st('SARG', 5, 8, 'A_FaceTarget', 53);   // S_SARG_ATK2 (52)
	st('SARG', 6, 8, 'A_SargAttack', 43);   // S_SARG_ATK3 (53)
	// Pain (states 54-55)
	st('SARG', 7, 2, null, 55);
	st('SARG', 7, 2, 'A_Pain', 43);
	// Death (states 56-61)
	st('SARG', 8, 8, null, 57);
	st('SARG', 9, 8, 'A_Scream', 58);
	st('SARG', 10, 4, null, 59);
	st('SARG', 11, 4, 'A_Fall', 60);
	st('SARG', 12, 4, null, 61);
	st('SARG', 13, -1, null, 61);          // S_SARG_DIE6 (61)

	// ─── Shotgun Guy ──────────────────────────────────────────
	// Spawn (states 62-63)
	st('SPOS', 0, 10, 'A_Look', 63); // S_SPOS_STND (62)
	st('SPOS', 1, 10, 'A_Look', 62); // S_SPOS_STND2 (63)
	// See (states 64-71)
	st('SPOS', 0, 3, 'A_Chase', 65);
	st('SPOS', 0, 3, 'A_Chase', 66);
	st('SPOS', 1, 3, 'A_Chase', 67);
	st('SPOS', 1, 3, 'A_Chase', 68);
	st('SPOS', 2, 3, 'A_Chase', 69);
	st('SPOS', 2, 3, 'A_Chase', 70);
	st('SPOS', 3, 3, 'A_Chase', 71);
	st('SPOS', 3, 3, 'A_Chase', 64); // S_SPOS_RUN8 (71)
	// Attack (states 72-74)
	st('SPOS', 4, 10, 'A_FaceTarget', 73);
	st('SPOS', 5, 10, 'A_SPosAttack', 74);
	st('SPOS', 4, 10, null, 64);
	// Pain (states 75-76)
	st('SPOS', 6, 3, null, 76);
	st('SPOS', 6, 3, 'A_Pain', 64);
	// Death (states 77-81)
	st('SPOS', 7, 5, null, 78);
	st('SPOS', 8, 5, 'A_Scream', 79);
	st('SPOS', 9, 5, 'A_Fall', 80);
	st('SPOS', 10, 5, null, 81);
	st('SPOS', 11, -1, null, 81);          // S_SPOS_DIE5 (81)

	// ─── Imp Fireball (BAL1) ─────────────────────────────────
	// Flying (states 82-83)
	st('BAL1', 0, 4, null, 83);            // S_TBALL1 (82)
	st('BAL1', 1, 4, null, 82);            // S_TBALL2 (83)
	// Death/explosion (states 84-86)
	st('BAL1', 2, 6, null, 85);            // S_TBALL_DIE1 (84)
	st('BAL1', 3, 6, null, 86);            // S_TBALL_DIE2 (85)
	st('BAL1', 4, 6, null, 0);             // S_TBALL_DIE3 (86) -> S_NULL

	return s;
}

// ─── Monster Type to Spawn State Mapping ──────────────────────────

import { MobjType } from './mobj.js';

/** Maps MobjType to its spawn (idle) state. */
export const SPAWN_STATE: Record<number, number> = {
	[MobjType.MT_POSSESSED]: S_POSS_STND,
	[MobjType.MT_SHOTGUY]: S_SPOS_STND,
	[MobjType.MT_IMP]: S_TROO_STND,
	[MobjType.MT_DEMON]: S_SARG_STND,
	[MobjType.MT_TROOPSHOT]: S_TBALL1,
};

/** Maps MobjType to its see (chase) state. */
export const SEE_STATE: Record<number, number> = {
	[MobjType.MT_POSSESSED]: S_POSS_RUN1,
	[MobjType.MT_SHOTGUY]: S_SPOS_RUN1,
	[MobjType.MT_IMP]: S_TROO_RUN1,
	[MobjType.MT_DEMON]: S_SARG_RUN1,
};

/** Maps MobjType to its melee/missile attack state. */
export const ATTACK_STATE: Record<number, number> = {
	[MobjType.MT_POSSESSED]: S_POSS_ATK1,
	[MobjType.MT_SHOTGUY]: S_SPOS_ATK1,
	[MobjType.MT_IMP]: S_TROO_ATK1,
	[MobjType.MT_DEMON]: S_SARG_ATK1,
};

/** Maps MobjType to its pain state. */
export const PAIN_STATE: Record<number, number> = {
	[MobjType.MT_POSSESSED]: S_POSS_PAIN,
	[MobjType.MT_SHOTGUY]: S_SPOS_PAIN,
	[MobjType.MT_IMP]: S_TROO_PAIN,
	[MobjType.MT_DEMON]: S_SARG_PAIN,
};

/** Maps MobjType to its death state. */
export const DEATH_STATE: Record<number, number> = {
	[MobjType.MT_POSSESSED]: S_POSS_DIE1,
	[MobjType.MT_SHOTGUY]: S_SPOS_DIE1,
	[MobjType.MT_IMP]: S_TROO_DIE1,
	[MobjType.MT_DEMON]: S_SARG_DIE1,
	[MobjType.MT_TROOPSHOT]: S_TBALL_DIE1,
};

// ─── State Transition ─────────────────────────────────────────────

/**
 * Set a mobj to a new state, updating its sprite, frame, and tics.
 *
 * @param mobj - The mobj to update
 * @param stateIndex - Index into the STATES table
 */
export function setMobjState(mobj: Mobj, stateIndex: number): void {
	if (stateIndex === S_NULL) {
		mobj.alive = false;
		mobj.tics = -1;
		return;
	}

	const state = STATES[stateIndex];
	if (!state) {
		mobj.alive = false;
		mobj.tics = -1;
		return;
	}

	mobj.stateIndex = stateIndex;
	mobj.tics = state.tics;
	if (state.sprite) {
		mobj.spriteName = state.sprite;
	}
	mobj.frame = state.frame;
}
