/**
 * Thinker system: per-tic processing of map object state machines.
 *
 * Iterates all active mobjs each game tic, advances their state
 * timers, calls action functions on state transitions, and handles
 * sprite/frame updates from the state table.
 *
 * @module game/thinkers
 */

import type { MapData } from '../wad/types.js';
import type { Mobj } from './mobj.js';
import { MobjFlags } from './mobj.js';
import type { PlayerState } from './player.js';
import {
	type ActionContext,
	type ActionFn,
	DEATH_STATE,
	PAIN_STATE,
	SPAWN_STATE,
	STATES,
	S_NULL,
	setMobjState,
} from './states.js';

// Re-export for consumers
export { setMobjState } from './states.js';

// ─── Action Function Registry ─────────────────────────────────────

/** Registered action functions, populated by registerActions(). */
let actionRegistry: Record<string, ActionFn> = {};

/**
 * Register action functions for use by the thinker system.
 * Must be called once at startup before runThinkers.
 *
 * @param actions - Map of action names to functions
 */
export function registerActions(actions: Record<string, ActionFn>): void {
	actionRegistry = actions;
}

/**
 * Initialize all monster mobjs with their spawn states.
 * Call this once after spawning map things.
 *
 * @param mobjs - Array of spawned mobjs
 */
export function initThinkers(mobjs: Mobj[]): void {
	for (const mobj of mobjs) {
		const spawnState = SPAWN_STATE[mobj.type];
		if (spawnState !== undefined) {
			setMobjState(mobj, spawnState);
		}
	}
}

// ─── Per-Tic Processing ───────────────────────────────────────────

/**
 * Run one tic of the thinker system.
 *
 * For each alive mobj with a valid state, decrements the tic counter.
 * When tics reach 0, transitions to the next state and calls any
 * associated action function.
 *
 * @param mobjs - All map objects
 * @param player - Current player state
 * @param map - Map data for collision and sight checks
 */
export function runThinkers(
	mobjs: Mobj[],
	player: PlayerState,
	map: MapData,
): void {
	for (const mobj of mobjs) {
		if (!mobj.alive) continue;

		// Only process mobjs that have a state (monsters)
		const currentState = STATES[mobj.stateIndex];
		if (!currentState) continue;

		// Countdown tics
		if (mobj.tics === -1) {
			// Infinite tics: call action every tic if present
			if (currentState.action) {
				callAction(currentState.action, mobj, player, map, mobjs);
			}
			continue;
		}

		mobj.tics--;

		if (mobj.tics > 0) continue;

		// Transition to next state
		const nextState = currentState.nextState;
		const state = STATES[nextState];
		if (!state || nextState === S_NULL) {
			mobj.alive = false;
			continue;
		}

		setMobjState(mobj, nextState);

		// Call the new state's action function
		if (state.action) {
			callAction(state.action, mobj, player, map, mobjs);
		}
	}
}

/**
 * Call a named action function with the appropriate context.
 */
function callAction(
	name: string,
	mobj: Mobj,
	player: PlayerState,
	map: MapData,
	mobjs: readonly Mobj[],
): void {
	const fn = actionRegistry[name];
	if (!fn) return;

	const ctx: ActionContext = { mobj, player, map, mobjs };
	fn(ctx);
}

// ─── Damage Integration ───────────────────────────────────────────

/**
 * Apply damage to a mobj with state transitions.
 *
 * Damages the mobj and transitions to the pain state if alive,
 * or the death state if killed.
 *
 * @param mobj - Mobj to damage
 * @param damage - Amount of damage
 */
export function damageMobjWithState(mobj: Mobj, damage: number): void {
	if (!(mobj.flags & MobjFlags.MF_SHOOTABLE)) return;

	mobj.health -= damage;

	if (mobj.health <= 0) {
		// Kill the mobj
		mobj.alive = false;
		mobj.flags |= MobjFlags.MF_CORPSE;
		mobj.flags &= ~MobjFlags.MF_SOLID;
		mobj.flags &= ~MobjFlags.MF_SHOOTABLE;

		const deathState = DEATH_STATE[mobj.type];
		if (deathState !== undefined) {
			mobj.alive = true; // Keep alive for death animation
			setMobjState(mobj, deathState);
		}
		return;
	}

	// Pain state transition (random chance matching Doom's painchance)
	if (Math.random() < 0.5) {
		mobj.flags |= MobjFlags.MF_JUSTHIT;
		const painState = PAIN_STATE[mobj.type];
		if (painState !== undefined) {
			setMobjState(mobj, painState);
		}
	}
}
