/**
 * Player death, respawn, and game over logic.
 *
 * Manages the game phase (playing, dying, dead, game over) and handles
 * player damage with armor absorption. When health drops to zero, the
 * player enters a death animation where the viewheight sinks. After the
 * animation, the player can press USE to respawn (losing a life) or
 * see the game over screen if no lives remain.
 *
 * Matches Doom's P_DeathThink from p_user.c and G_DoReborn from g_game.c.
 *
 * @module game/death
 */

import { FRACBITS } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import type { PlayerState } from './player.js';
import { createPlayer } from './player.js';
import { createWeaponState, type WeaponState } from './weapons.js';

// ─── Game Phase ─────────────────────────────────────────────────

/** Game phases for the player lifecycle. */
export const GamePhase = {
	/** Normal gameplay: player can move, shoot, interact. */
	PLAYING: 0,
	/** Death animation in progress: viewheight sinking. */
	DYING: 1,
	/** Death animation complete: waiting for USE to respawn. */
	DEAD: 2,
	/** No lives remaining: game is over. */
	GAME_OVER: 3,
} as const;

// ─── Constants ──────────────────────────────────────────────────

/** Starting number of lives. */
export const DEFAULT_LIVES = 3;

/** Number of tics for the death animation (viewheight sinking). */
export const DEATH_ANIM_TICS = 35;

/** Minimum viewheight during death (10 map units, fixed-point). */
export const DEATH_VIEW_HEIGHT = 10 << FRACBITS;

/** Amount viewheight decreases per tic during death animation (fixed-point). */
const VIEW_SINK_SPEED = Math.floor(((41 - 10) << FRACBITS) / DEATH_ANIM_TICS);

/** Armor absorption percentage (green armor absorbs 1/3 of damage). */
const ARMOR_ABSORB_FRACTION = 3;

// ─── Game State ─────────────────────────────────────────────────

/** Mutable game state tracking the player lifecycle. */
export interface GameState {
	/** Current game phase. */
	phase: number;
	/** Remaining lives (decremented on respawn). */
	lives: number;
	/** Tics elapsed since death began. */
	deathTics: number;
	/** Total deaths this session. */
	totalDeaths: number;
}

/**
 * Create initial game state.
 *
 * @param lives - Starting number of lives (defaults to DEFAULT_LIVES)
 * @returns Fresh game state in PLAYING phase
 */
export function createGameState(lives?: number): GameState {
	return {
		phase: GamePhase.PLAYING,
		lives: lives ?? DEFAULT_LIVES,
		deathTics: 0,
		totalDeaths: 0,
	};
}

// ─── Player Damage ──────────────────────────────────────────────

/**
 * Apply damage to the player with armor absorption.
 *
 * Armor absorbs 1/3 of incoming damage (matching Doom's green armor).
 * If health drops to zero or below, the player enters the DYING phase.
 *
 * Does nothing if the player is already dead or the game is over.
 *
 * @param gs - Mutable game state
 * @param player - Mutable player state
 * @param damage - Raw damage amount before armor
 */
export function damagePlayer(
	gs: GameState,
	player: PlayerState,
	damage: number,
): void {
	if (gs.phase !== GamePhase.PLAYING) return;
	if (damage <= 0) return;

	// Armor absorption: armor absorbs 1/3 of damage
	let saved = 0;
	if (player.armor > 0) {
		saved = Math.floor(damage / ARMOR_ABSORB_FRACTION);
		if (saved > player.armor) {
			saved = player.armor;
		}
		player.armor -= saved;
	}

	const actualDamage = damage - saved;
	player.health -= actualDamage;

	if (player.health <= 0) {
		player.health = 0;
		killPlayer(gs, player);
	}
}

/**
 * Transition the player into the DYING phase.
 * Zeroes momentum so the player stops moving.
 */
function killPlayer(gs: GameState, player: PlayerState): void {
	gs.phase = GamePhase.DYING;
	gs.deathTics = 0;

	// Stop all movement
	player.momx = 0;
	player.momy = 0;
}

// ─── Death Animation ────────────────────────────────────────────

/**
 * Advance the death animation by one tic.
 *
 * During the DYING phase, the player's viewheight sinks toward the
 * floor over DEATH_ANIM_TICS. When the animation completes, the
 * phase transitions to DEAD (waiting for respawn) or GAME_OVER.
 *
 * Does nothing if the game phase is not DYING.
 *
 * @param gs - Mutable game state
 * @param player - Mutable player state (viewheight modified)
 */
export function tickDeath(gs: GameState, player: PlayerState): void {
	if (gs.phase !== GamePhase.DYING) return;

	gs.deathTics++;

	// Sink viewheight toward floor
	if (player.viewheight > DEATH_VIEW_HEIGHT) {
		player.viewheight -= VIEW_SINK_SPEED;
		if (player.viewheight < DEATH_VIEW_HEIGHT) {
			player.viewheight = DEATH_VIEW_HEIGHT;
		}
	}

	// Update viewz from sinking viewheight
	player.viewz = player.z + player.viewheight;

	// Check if death animation is complete
	if (gs.deathTics >= DEATH_ANIM_TICS) {
		if (gs.lives > 0) {
			gs.phase = GamePhase.DEAD;
		} else {
			gs.phase = GamePhase.GAME_OVER;
		}
	}
}

// ─── Respawn ────────────────────────────────────────────────────

/**
 * Respawn the player at the map start position.
 *
 * Decrements lives, resets player state (position, health, ammo, momentum),
 * and resets weapon state to pistol with 50 bullets. Transitions back to
 * the PLAYING phase.
 *
 * Does nothing if the phase is not DEAD, or if no lives remain.
 *
 * @param gs - Mutable game state
 * @param player - Mutable player state (fully reset)
 * @param weaponState - Mutable weapon state (reset to defaults)
 * @param map - Map data (for finding player start position)
 */
export function respawnPlayer(
	gs: GameState,
	player: PlayerState,
	weaponState: WeaponState,
	map: MapData,
): void {
	if (gs.phase !== GamePhase.DEAD) return;
	if (gs.lives <= 0) return;

	gs.lives--;
	gs.totalDeaths++;

	// Create a fresh player at the map start
	const fresh = createPlayer(map);

	// Copy fresh values into existing player state
	player.x = fresh.x;
	player.y = fresh.y;
	player.z = fresh.z;
	player.angle = fresh.angle;
	player.viewz = fresh.viewz;
	player.viewheight = fresh.viewheight;
	player.deltaviewheight = fresh.deltaviewheight;
	player.momx = fresh.momx;
	player.momy = fresh.momy;
	player.health = fresh.health;
	player.armor = fresh.armor;
	player.ammo = fresh.ammo;
	player.maxAmmo = fresh.maxAmmo;
	player.forwardSpeed = fresh.forwardSpeed;
	player.sideSpeed = fresh.sideSpeed;
	player.turnSpeed = fresh.turnSpeed;
	player.sectorIndex = fresh.sectorIndex;

	// Reset weapon state to defaults
	const freshWeapon = createWeaponState();
	weaponState.current = freshWeapon.current;
	weaponState.pendingWeapon = freshWeapon.pendingWeapon;
	weaponState.state = freshWeapon.state;
	weaponState.tics = freshWeapon.tics;
	weaponState.frame = freshWeapon.frame;
	weaponState.ready = freshWeapon.ready;
	weaponState.owned = freshWeapon.owned;
	weaponState.ammo = freshWeapon.ammo;
	weaponState.maxAmmo = freshWeapon.maxAmmo;
	weaponState.bobX = freshWeapon.bobX;
	weaponState.bobY = freshWeapon.bobY;
	weaponState.flashTics = freshWeapon.flashTics;

	gs.phase = GamePhase.PLAYING;
}

// ─── Query Helpers ──────────────────────────────────────────────

/**
 * Check whether the player can receive input (movement, shooting).
 *
 * @param gs - Game state
 * @returns true if the player is alive and playing
 */
export function canPlayerAct(gs: GameState): boolean {
	return gs.phase === GamePhase.PLAYING;
}

/**
 * Check whether the respawn prompt should be shown.
 *
 * @param gs - Game state
 * @returns true if the player is dead and waiting for respawn input
 */
export function isAwaitingRespawn(gs: GameState): boolean {
	return gs.phase === GamePhase.DEAD;
}

/**
 * Check whether the game is over (no lives remaining).
 *
 * @param gs - Game state
 * @returns true if the game is over
 */
export function isGameOver(gs: GameState): boolean {
	return gs.phase === GamePhase.GAME_OVER;
}
