/**
 * Weapon definitions, state machine, and ammo management.
 *
 * Defines weapon types (fist, pistol, shotgun, chaingun), their
 * sprite names, ammo types, and state transitions (raise, ready,
 * fire, flash, lower). Matches Doom's d_items.c weapon info.
 *
 * @module game/weapons
 */

import type { PlayerState } from './player.js';

// ─── Ammo Types ──────────────────────────────────────────────────

export const AmmoType = {
	AM_NOAMMO: 0, // Fist, chainsaw
	AM_CLIP: 1, // Bullets (pistol, chaingun)
	AM_SHELL: 2, // Shells (shotgun)
} as const;

// ─── Weapon Types ────────────────────────────────────────────────

export const WeaponType = {
	WP_FIST: 0,
	WP_PISTOL: 1,
	WP_SHOTGUN: 2,
	WP_CHAINGUN: 3,
} as const;

// ─── Weapon State ────────────────────────────────────────────────

export const WeaponStateType = {
	WS_RAISE: 0,
	WS_READY: 1,
	WS_FIRE: 2,
	WS_FLASH: 3,
	WS_LOWER: 4,
} as const;

// ─── Weapon Info ─────────────────────────────────────────────────

/** Definition of a single weapon's properties. */
export interface WeaponInfo {
	/** Ammo type used by this weapon. */
	readonly ammoType: number;
	/** Ammo consumed per shot. */
	readonly ammoPerShot: number;
	/** Sprite name for the weapon overlay. */
	readonly spriteName: string;
	/** Number of frames in the fire animation. */
	readonly fireFrames: number;
	/** Number of frames in the flash animation. */
	readonly flashFrames: number;
	/** Tics for ready state bob cycle. */
	readonly readyTics: number;
	/** Tics per fire frame. */
	readonly fireTics: number;
	/** Tics for the flash. */
	readonly flashTics: number;
	/** Tics to raise the weapon. */
	readonly raiseTics: number;
	/** Tics to lower the weapon. */
	readonly lowerTics: number;
	/** Damage per pellet/hit. */
	readonly damage: number;
	/** Number of pellets per shot (1 for single, 7 for shotgun, etc.). */
	readonly pellets: number;
	/** Horizontal spread in BAM (0 for perfectly accurate). */
	readonly spread: number;
	/** Whether this is a melee weapon. */
	readonly melee: boolean;
}

/** Weapon info table indexed by WeaponType. */
export const WEAPON_INFO: Record<number, WeaponInfo> = {
	[WeaponType.WP_FIST]: {
		ammoType: AmmoType.AM_NOAMMO,
		ammoPerShot: 0,
		spriteName: 'PUNG',
		fireFrames: 4,
		flashFrames: 0,
		readyTics: 1,
		fireTics: 4,
		flashTics: 0,
		raiseTics: 6,
		lowerTics: 6,
		damage: 10,
		pellets: 1,
		spread: 0,
		melee: true,
	},
	[WeaponType.WP_PISTOL]: {
		ammoType: AmmoType.AM_CLIP,
		ammoPerShot: 1,
		spriteName: 'PISG',
		fireFrames: 4,
		flashFrames: 2,
		readyTics: 1,
		fireTics: 4,
		flashTics: 4,
		raiseTics: 6,
		lowerTics: 6,
		damage: 10,
		pellets: 1,
		spread: 0x16000000, // ~5.5 degrees
		melee: false,
	},
	[WeaponType.WP_SHOTGUN]: {
		ammoType: AmmoType.AM_SHELL,
		ammoPerShot: 1,
		spriteName: 'SHTG',
		fireFrames: 7,
		flashFrames: 2,
		readyTics: 1,
		fireTics: 5,
		flashTics: 4,
		raiseTics: 6,
		lowerTics: 6,
		damage: 7,
		pellets: 7,
		spread: 0x16000000, // ~5.5 degrees
		melee: false,
	},
	[WeaponType.WP_CHAINGUN]: {
		ammoType: AmmoType.AM_CLIP,
		ammoPerShot: 1,
		spriteName: 'CHGG',
		fireFrames: 2,
		flashFrames: 2,
		readyTics: 1,
		fireTics: 4,
		flashTics: 4,
		raiseTics: 6,
		lowerTics: 6,
		damage: 10,
		pellets: 1,
		spread: 0x16000000,
		melee: false,
	},
};

// ─── Weapon State ────────────────────────────────────────────────

/** Mutable weapon state for the player. */
export interface WeaponState {
	/** Currently equipped weapon. */
	current: number;
	/** Weapon being switched to (-1 if not switching). */
	pendingWeapon: number;
	/** Current weapon state (raise, ready, fire, flash, lower). */
	state: number;
	/** Tics remaining in current state. */
	tics: number;
	/** Current animation frame within the state. */
	frame: number;
	/** Whether the weapon is ready to fire. */
	ready: boolean;
	/** Weapons the player owns. */
	owned: boolean[];
	/** Ammo counts by AmmoType. */
	ammo: number[];
	/** Max ammo by AmmoType. */
	maxAmmo: number[];
	/** Weapon bob offset for rendering (fixed-point). */
	bobX: number;
	bobY: number;
	/** Flash remaining tics (for muzzle flash extra light). */
	flashTics: number;
}

/**
 * Create initial weapon state with pistol equipped and 50 bullets.
 *
 * @returns Fresh weapon state
 */
export function createWeaponState(): WeaponState {
	return {
		current: WeaponType.WP_PISTOL,
		pendingWeapon: -1,
		state: WeaponStateType.WS_RAISE,
		tics: 6,
		frame: 0,
		ready: false,
		owned: [true, true, false, false], // fist + pistol
		ammo: [0, 50, 0], // no ammo, 50 bullets, 0 shells
		maxAmmo: [0, 200, 50], // -, 200 bullets, 50 shells
		bobX: 0,
		bobY: 0,
		flashTics: 0,
	};
}

// ─── Weapon Switching ────────────────────────────────────────────

/**
 * Check if the player has ammo for the given weapon.
 */
export function hasAmmoForWeapon(ws: WeaponState, weapon: number): boolean {
	const info = WEAPON_INFO[weapon];
	if (!info) return false;
	if (info.ammoType === AmmoType.AM_NOAMMO) return true;
	const current = ws.ammo[info.ammoType] ?? 0;
	return current >= info.ammoPerShot;
}

/**
 * Find the best weapon to switch to when out of ammo.
 * Prefers higher-tier weapons that have ammo.
 */
export function findBestWeapon(ws: WeaponState): number {
	// Check in priority order: chaingun, shotgun, pistol, fist
	const priority = [WeaponType.WP_CHAINGUN, WeaponType.WP_SHOTGUN, WeaponType.WP_PISTOL, WeaponType.WP_FIST];
	for (const wp of priority) {
		if (ws.owned[wp] && hasAmmoForWeapon(ws, wp)) {
			return wp;
		}
	}
	return WeaponType.WP_FIST;
}

/**
 * Request a weapon switch. Sets the pending weapon and begins lowering
 * the current weapon.
 */
export function requestWeaponSwitch(ws: WeaponState, weapon: number): void {
	if (!ws.owned[weapon]) return;
	if (weapon === ws.current && ws.pendingWeapon === -1) return;
	if (!hasAmmoForWeapon(ws, weapon)) return;

	ws.pendingWeapon = weapon;
	if (ws.state === WeaponStateType.WS_READY) {
		ws.state = WeaponStateType.WS_LOWER;
		ws.tics = WEAPON_INFO[ws.current]?.lowerTics ?? 6;
		ws.frame = 0;
	}
}

// ─── Weapon Tick ─────────────────────────────────────────────────

/**
 * Update weapon state for one game tic.
 *
 * Handles state transitions: raise -> ready -> fire -> ready,
 * weapon switching via lower -> raise, and bob animation.
 *
 * @param ws - Mutable weapon state
 * @param player - Player state for ammo sync and extralight
 * @param firing - Whether the fire button is held
 * @returns true if a hitscan should be performed this tic
 */
export function tickWeapon(
	ws: WeaponState,
	player: PlayerState,
	firing: boolean,
): boolean {
	let doFire = false;

	// Update flash
	if (ws.flashTics > 0) {
		ws.flashTics--;
	}

	// Update bob from player movement
	const bobSpeed = Math.abs(player.momx) + Math.abs(player.momy);
	ws.bobX = (bobSpeed >> 1) & 0xffff;
	ws.bobY = (bobSpeed >> 1) & 0xffff;

	ws.tics--;
	if (ws.tics > 0) return false;

	const info = WEAPON_INFO[ws.current];
	if (!info) return false;

	switch (ws.state) {
		case WeaponStateType.WS_RAISE:
			// Raising complete, go to ready
			ws.state = WeaponStateType.WS_READY;
			ws.tics = info.readyTics;
			ws.frame = 0;
			ws.ready = true;
			break;

		case WeaponStateType.WS_READY:
			// Check for weapon switch
			if (ws.pendingWeapon !== -1) {
				ws.state = WeaponStateType.WS_LOWER;
				ws.tics = info.lowerTics;
				ws.frame = 0;
				ws.ready = false;
				break;
			}
			// Check for fire
			if (firing && hasAmmoForWeapon(ws, ws.current)) {
				ws.state = WeaponStateType.WS_FIRE;
				ws.tics = info.fireTics;
				ws.frame = 0;
				ws.ready = false;
				// Consume ammo
				if (info.ammoType !== AmmoType.AM_NOAMMO) {
					ws.ammo[info.ammoType] = (ws.ammo[info.ammoType] ?? 0) - info.ammoPerShot;
					player.ammo = ws.ammo[AmmoType.AM_CLIP] ?? 0;
				}
				// Trigger muzzle flash
				if (info.flashFrames > 0) {
					ws.flashTics = info.flashTics;
				}
				doFire = true;
			} else {
				// Stay in ready state
				ws.tics = info.readyTics;
			}
			break;

		case WeaponStateType.WS_FIRE:
			ws.frame++;
			if (ws.frame >= info.fireFrames) {
				// Fire animation done
				// Check if we need to auto-switch
				if (!hasAmmoForWeapon(ws, ws.current)) {
					const best = findBestWeapon(ws);
					if (best !== ws.current) {
						ws.pendingWeapon = best;
					}
				}
				ws.state = WeaponStateType.WS_READY;
				ws.tics = info.readyTics;
				ws.frame = 0;
				ws.ready = true;
			} else {
				ws.tics = info.fireTics;
			}
			break;

		case WeaponStateType.WS_LOWER:
			// Lowering complete, switch weapon
			if (ws.pendingWeapon >= 0) {
				ws.current = ws.pendingWeapon;
				ws.pendingWeapon = -1;
			}
			ws.state = WeaponStateType.WS_RAISE;
			ws.tics = WEAPON_INFO[ws.current]?.raiseTics ?? 6;
			ws.frame = 0;
			ws.ready = false;
			break;
	}

	return doFire;
}

/**
 * Handle weapon-related input: fire on Space, switch on 1-4 keys.
 *
 * @param ws - Mutable weapon state
 * @param keys - Set of pressed key names
 * @returns Whether the fire button is held
 */
export function processWeaponInput(ws: WeaponState, keys: Set<string>): boolean {
	// Weapon switch keys
	if (keys.has('1')) requestWeaponSwitch(ws, WeaponType.WP_FIST);
	if (keys.has('2')) requestWeaponSwitch(ws, WeaponType.WP_PISTOL);
	if (keys.has('3')) requestWeaponSwitch(ws, WeaponType.WP_SHOTGUN);
	if (keys.has('4')) requestWeaponSwitch(ws, WeaponType.WP_CHAINGUN);

	return keys.has('space');
}
