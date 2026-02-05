/**
 * Enemy AI behavior functions.
 *
 * Implements the action functions called by the state machine:
 * A_Look (idle scanning), A_Chase (pursuit), A_FaceTarget,
 * and monster-specific attack functions. Movement uses P_Move
 * and P_NewChaseDir matching Doom's p_enemy.c.
 *
 * @module game/enemyAI
 */

import {
	ANG45,
	ANG90,
	ANG180,
	ANG270,
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import { damagePlayer } from './death.js';
import { type Mobj, MobjFlags, MobjType, damageMobj } from './mobj.js';
import type { PlayerState } from './player.js';
import { findSectorAt } from './player.js';
import { checkSight } from './sight.js';
import type { ActionContext } from './states.js';
import {
	ATTACK_STATE,
	SEE_STATE,
	STATES,
	S_NULL,
	setMobjState,
} from './states.js';

// ─── Direction Constants ──────────────────────────────────────────

const DI_EAST = 0;
const DI_NORTHEAST = 1;
const DI_NORTH = 2;
const DI_NORTHWEST = 3;
const DI_WEST = 4;
const DI_SOUTHWEST = 5;
const DI_SOUTH = 6;
const DI_SOUTHEAST = 7;
const DI_NODIR = 8;

/** Speed multiplier for each direction axis. */
const xspeed = [FRACUNIT, 47000, 0, -47000, -FRACUNIT, -47000, 0, 47000];
const yspeed = [0, 47000, FRACUNIT, 47000, 0, -47000, -FRACUNIT, -47000];

/** Opposite direction lookup. */
const opposite = [DI_WEST, DI_SOUTHWEST, DI_SOUTH, DI_SOUTHEAST, DI_EAST, DI_NORTHEAST, DI_NORTH, DI_NORTHWEST, DI_NODIR];

/** Direction angle lookup (BAM). */
const dirangle = [0, ANG45, ANG90, ANG90 + ANG45, ANG180, ANG180 + ANG45, ANG270, ANG270 + ANG45];

// ─── Distance Helpers ─────────────────────────────────────────────

const MELEERANGE = 64 << FRACBITS;
const MISSILERANGE = 32 * 64 * FRACUNIT;

function approxDist(dx: number, dy: number): number {
	const adx = Math.abs(dx);
	const ady = Math.abs(dy);
	return adx + ady - (Math.min(adx, ady) >> 1);
}

// ─── Action Function Registry ─────────────────────────────────────

/** Map of action function names to implementations. */
export const ACTION_FUNCTIONS: Record<string, (ctx: ActionContext) => void> = {
	A_Look: actionLook,
	A_Chase: actionChase,
	A_FaceTarget: actionFaceTarget,
	A_PosAttack: actionPosAttack,
	A_SPosAttack: actionSPosAttack,
	A_TroopAttack: actionTroopAttack,
	A_SargAttack: actionSargAttack,
	A_Pain: actionPain,
	A_Scream: actionScream,
	A_Fall: actionFall,
};

// ─── A_Look: Idle Scanning ────────────────────────────────────────

/**
 * Idle state: scan for the player. When the player is found in
 * line of sight, transition to the see (chase) state.
 */
function actionLook(ctx: ActionContext): void {
	const { mobj, player, map } = ctx;

	// Check if player is in line of sight
	if (!checkSight(mobj, player, map)) return;

	// Ambush monsters only activate on sight, not sound
	if (mobj.flags & MobjFlags.MF_AMBUSH) {
		// Still need direct line of sight for ambush monsters
		if (!checkSight(mobj, player, map)) return;
	}

	// Found the player - target acquired
	mobj.target = createTargetMobj(player);

	// Transition to see state
	const seeState = SEE_STATE[mobj.type];
	if (seeState !== undefined) {
		setMobjState(mobj, seeState);
	}
}

// ─── A_Chase: Pursuit ─────────────────────────────────────────────

/**
 * Chase state: move toward target and attack when in range.
 * Implements Doom's A_Chase from p_enemy.c.
 */
function actionChase(ctx: ActionContext): void {
	const { mobj, player, map } = ctx;

	// Decrement reaction time
	if (mobj.reactiontime > 0) {
		mobj.reactiontime--;
	}

	// Update target to current player position
	mobj.target = createTargetMobj(player);
	if (!mobj.target) return;

	const target = mobj.target;

	// Check if we should attack
	if (mobj.flags & MobjFlags.MF_JUSTATTACKED) {
		mobj.flags &= ~MobjFlags.MF_JUSTATTACKED;
		// Don't attack again immediately
		newChaseDir(mobj, target, map);
		return;
	}

	// Check for melee range
	const dist = approxDist(target.x - mobj.x, target.y - mobj.y);
	if (dist < MELEERANGE) {
		const atkState = ATTACK_STATE[mobj.type];
		if (atkState !== undefined) {
			setMobjState(mobj, atkState);
			return;
		}
	}

	// Check for missile/ranged attack
	if (mobj.reactiontime <= 0 && mobj.threshold <= 0) {
		if (checkSight(mobj, player, map) && dist < MISSILERANGE) {
			// Random chance to attack (higher when closer)
			if (Math.random() < 0.05) {
				const atkState = ATTACK_STATE[mobj.type];
				if (atkState !== undefined) {
					setMobjState(mobj, atkState);
					return;
				}
			}
		}
	}

	if (mobj.threshold > 0) {
		mobj.threshold--;
	}

	// Move toward target
	if (mobj.movecount <= 0 || !tryMove(mobj, map)) {
		newChaseDir(mobj, target, map);
	}

	mobj.movecount--;
}

// ─── A_FaceTarget ─────────────────────────────────────────────────

/**
 * Turn to face the current target.
 */
function actionFaceTarget(ctx: ActionContext): void {
	const { mobj, player } = ctx;
	mobj.target = createTargetMobj(player);
	if (!mobj.target) return;

	mobj.flags &= ~MobjFlags.MF_AMBUSH;

	const dx = mobj.target.x - mobj.x;
	const dy = mobj.target.y - mobj.y;
	mobj.angle = Math.atan2(dy / FRACUNIT, dx / FRACUNIT) * (0x80000000 / Math.PI);
	mobj.angle = (mobj.angle >>> 0);
}

// ─── Attack Functions ─────────────────────────────────────────────

/** Zombieman hitscan attack: single bullet. */
function actionPosAttack(ctx: ActionContext): void {
	const { mobj, player, gameState } = ctx;
	if (!mobj.target) return;

	actionFaceTarget(ctx);

	// Hitscan: damage player directly if in line of sight
	if (checkSight(mobj, player, ctx.map)) {
		const damage = ((Math.random() * 5 | 0) + 1) * 3;
		damagePlayer(gameState, player, damage);
	}

	mobj.flags |= MobjFlags.MF_JUSTATTACKED;
}

/** Shotgun Guy attack: 3 pellets. */
function actionSPosAttack(ctx: ActionContext): void {
	const { mobj, player, gameState } = ctx;
	if (!mobj.target) return;

	actionFaceTarget(ctx);

	if (checkSight(mobj, player, ctx.map)) {
		for (let i = 0; i < 3; i++) {
			const damage = ((Math.random() * 5 | 0) + 1) * 3;
			damagePlayer(gameState, player, damage);
		}
	}

	mobj.flags |= MobjFlags.MF_JUSTATTACKED;
}

/** Imp attack: melee claw if close, otherwise fireball (simplified as hitscan). */
function actionTroopAttack(ctx: ActionContext): void {
	const { mobj, player, gameState } = ctx;
	if (!mobj.target) return;

	actionFaceTarget(ctx);

	const dist = approxDist(mobj.target.x - mobj.x, mobj.target.y - mobj.y);

	if (dist < MELEERANGE) {
		// Melee: claw attack
		const damage = ((Math.random() * 8 | 0) + 1) * 3;
		damagePlayer(gameState, player, damage);
	} else if (checkSight(mobj, player, ctx.map)) {
		// Ranged: fireball (simplified as direct damage for now)
		const damage = ((Math.random() * 8 | 0) + 1) * 3;
		damagePlayer(gameState, player, damage);
	}

	mobj.flags |= MobjFlags.MF_JUSTATTACKED;
}

/** Demon melee bite attack. */
function actionSargAttack(ctx: ActionContext): void {
	const { mobj, player, gameState } = ctx;
	if (!mobj.target) return;

	actionFaceTarget(ctx);

	const dist = approxDist(mobj.target.x - mobj.x, mobj.target.y - mobj.y);

	if (dist < MELEERANGE) {
		const damage = ((Math.random() * 10 | 0) + 1) * 4;
		damagePlayer(gameState, player, damage);
	}

	mobj.flags |= MobjFlags.MF_JUSTATTACKED;
}

/** Pain reaction (placeholder for sound). */
function actionPain(_ctx: ActionContext): void {
	// Sound would play here
}

/** Death scream (placeholder for sound). */
function actionScream(_ctx: ActionContext): void {
	// Sound would play here
}

/** Monster falls dead: remove solid flag. */
function actionFall(ctx: ActionContext): void {
	ctx.mobj.flags &= ~MobjFlags.MF_SOLID;
}

// ─── Movement ─────────────────────────────────────────────────────

/**
 * Try to move the mobj one step in its current movedir.
 * Returns true if the move succeeded.
 */
function tryMove(mobj: Mobj, map: MapData): boolean {
	if (mobj.movedir === DI_NODIR) return false;

	const speed = mobj.info.speed << FRACBITS;
	const tryx = mobj.x + fixedMul(speed, xspeed[mobj.movedir] ?? 0);
	const tryy = mobj.y + fixedMul(speed, yspeed[mobj.movedir] ?? 0);

	// Check if the position is walkable using blockmap
	if (!checkMobjPosition(tryx, tryy, mobj, map)) {
		return false;
	}

	mobj.x = tryx;
	mobj.y = tryy;

	// Update sector
	mobj.sectorIndex = findSectorAt(map, tryx >> FRACBITS, tryy >> FRACBITS);

	return true;
}

/**
 * Check if a mobj can occupy the given position.
 * Simplified version of P_CheckPosition.
 */
function checkMobjPosition(
	x: number, y: number,
	mobj: Mobj,
	map: MapData,
): boolean {
	const bmap = map.blockmap;
	const mapX = (x >> FRACBITS) - bmap.header.originX;
	const mapY = (y >> FRACBITS) - bmap.header.originY;
	const cellX = Math.floor(mapX / 128);
	const cellY = Math.floor(mapY / 128);
	const radius = mobj.radius;

	for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
		for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
			if (cx < 0 || cx >= bmap.header.columns) continue;
			if (cy < 0 || cy >= bmap.header.rows) continue;

			const cellIndex = cy * bmap.header.columns + cx;
			const offset = bmap.offsets[cellIndex];
			if (offset === undefined) continue;

			let pos = offset * 2;
			if (pos + 2 > bmap.data.byteLength) continue;
			const first = bmap.data.getInt16(pos, true);
			if (first !== 0) continue;
			pos += 2;

			for (;;) {
				if (pos + 2 > bmap.data.byteLength) break;
				const lineIdx = bmap.data.getInt16(pos, true);
				if (lineIdx === -1) break;
				pos += 2;

				const linedef = map.linedefs[lineIdx];
				if (!linedef) continue;
				if (!(linedef.flags & 1)) continue; // ML_BLOCKING

				const v1 = map.vertexes[linedef.v1];
				const v2 = map.vertexes[linedef.v2];
				if (!v1 || !v2) continue;

				if (lineBlocksMobj(
					v1.x << FRACBITS, v1.y << FRACBITS,
					v2.x << FRACBITS, v2.y << FRACBITS,
					x, y, radius,
				)) {
					return false;
				}
			}
		}
	}

	return true;
}

/**
 * Check if a line segment blocks a mobj bounding box.
 */
function lineBlocksMobj(
	lx1: number, ly1: number,
	lx2: number, ly2: number,
	cx: number, cy: number,
	radius: number,
): boolean {
	const left = cx - radius;
	const right = cx + radius;
	const bottom = cy - radius;
	const top = cy + radius;

	const dx = lx2 - lx1;
	const dy = ly2 - ly1;

	// Side test: check if bbox is entirely on one side of the line
	const s1 = dx * (bottom - ly1) - dy * (left - lx1);
	const s2 = dx * (top - ly1) - dy * (right - lx1);
	const s3 = dx * (bottom - ly1) - dy * (right - lx1);
	const s4 = dx * (top - ly1) - dy * (left - lx1);

	if (s1 > 0 && s2 > 0 && s3 > 0 && s4 > 0) return false;
	if (s1 < 0 && s2 < 0 && s3 < 0 && s4 < 0) return false;

	return true;
}

// ─── Chase Direction ──────────────────────────────────────────────

/**
 * Choose a new direction to move toward the target.
 * Matches Doom's P_NewChaseDir from p_enemy.c.
 */
function newChaseDir(mobj: Mobj, target: Mobj, map: MapData): void {
	const dx = target.x - mobj.x;
	const dy = target.y - mobj.y;

	let d1 = DI_NODIR;
	let d2 = DI_NODIR;

	if (dx > 10 * FRACUNIT) d1 = DI_EAST;
	else if (dx < -10 * FRACUNIT) d1 = DI_WEST;

	if (dy > 10 * FRACUNIT) d2 = DI_NORTH;
	else if (dy < -10 * FRACUNIT) d2 = DI_SOUTH;

	// Try diagonal first
	if (d1 !== DI_NODIR && d2 !== DI_NODIR) {
		const diag = diagDirs[d2 === DI_NORTH ? 0 : 1]![d1 === DI_EAST ? 0 : 1]!;
		mobj.movedir = diag;
		if (tryMove(mobj, map)) {
			mobj.movecount = 8 + (Math.random() * 8 | 0);
			return;
		}
	}

	// Try each direction, randomly choosing order
	if (Math.random() > 0.5 || Math.abs(dy) > Math.abs(dx)) {
		const temp = d1;
		d1 = d2;
		d2 = temp;
	}

	if (d1 !== DI_NODIR) {
		mobj.movedir = d1;
		if (tryMove(mobj, map)) {
			mobj.movecount = 8 + (Math.random() * 8 | 0);
			return;
		}
	}

	if (d2 !== DI_NODIR) {
		mobj.movedir = d2;
		if (tryMove(mobj, map)) {
			mobj.movecount = 8 + (Math.random() * 8 | 0);
			return;
		}
	}

	// Try other directions
	const olddir = mobj.movedir;
	if (olddir !== DI_NODIR) {
		mobj.movedir = olddir;
		if (tryMove(mobj, map)) {
			mobj.movecount = 8 + (Math.random() * 8 | 0);
			return;
		}
	}

	// Random direction
	for (let i = 0; i < 8; i++) {
		mobj.movedir = i;
		if (tryMove(mobj, map)) {
			mobj.movecount = 8 + (Math.random() * 8 | 0);
			return;
		}
	}

	mobj.movedir = DI_NODIR;
	mobj.movecount = 0;
}

/** Diagonal direction lookup: [north/south][east/west] */
const diagDirs = [
	[DI_NORTHEAST, DI_NORTHWEST], // north
	[DI_SOUTHEAST, DI_SOUTHWEST], // south
];

// ─── Target Mobj Helper ───────────────────────────────────────────

/**
 * Create a minimal Mobj-compatible target from a PlayerState.
 * Used so that AI functions can target the player uniformly.
 */
function createTargetMobj(player: PlayerState): Mobj {
	return {
		x: player.x,
		y: player.y,
		z: player.z,
		angle: player.angle,
		type: MobjType.MT_PLAYER,
		info: { doomEdNum: 1, spawnHealth: 100, radius: 16, height: 56, speed: 0, flags: 0, spriteName: 'PLAY' },
		health: player.health,
		flags: MobjFlags.MF_SOLID | MobjFlags.MF_SHOOTABLE,
		spriteName: 'PLAY',
		frame: 0,
		tics: -1,
		radius: 16 << FRACBITS,
		height: 56 << FRACBITS,
		momx: 0,
		momy: 0,
		momz: 0,
		sectorIndex: player.sectorIndex,
		alive: true,
		stateIndex: 0,
		target: null,
		movecount: 0,
		reactiontime: 0,
		movedir: 8,
		threshold: 0,
	};
}
