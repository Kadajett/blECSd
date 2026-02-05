/**
 * Projectile spawning and movement.
 *
 * Handles missile-type attacks (imp fireballs, etc.).
 * Spawns projectile mobjs with velocity, moves them each tic,
 * and checks for wall and thing collisions.
 *
 * @module game/projectiles
 */

import {
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
} from '../math/angles.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
import type { MapData } from '../wad/types.js';
import { type Mobj, MobjFlags, MOBJINFO } from './mobj.js';
import type { PlayerState } from './player.js';
import { DEATH_STATE, SPAWN_STATE, setMobjState } from './states.js';

// ─── Projectile Info ──────────────────────────────────────────────

/** Projectile damage amounts by MobjType. */
export const PROJECTILE_DAMAGE: Record<number, number> = {};

// Set damage for imp fireball (3-24, matching Doom: (random()%8+1)*3)
import { MobjType } from './mobj.js';
PROJECTILE_DAMAGE[MobjType.MT_TROOPSHOT] = 3;

// ─── Spawn Missile ────────────────────────────────────────────────

/**
 * Spawn a missile projectile from a source mobj toward a target position.
 *
 * Creates a new mobj of the given missile type, computes the angle
 * and velocity toward the target, and adds it to the mobjs array.
 * Matches Doom's P_SpawnMissile.
 *
 * @param source - The mobj firing the projectile
 * @param targetX - Target X position (fixed-point)
 * @param targetY - Target Y position (fixed-point)
 * @param targetZ - Target Z position (fixed-point)
 * @param missileType - MobjType of the projectile to spawn
 * @param mobjs - Mutable array to push the new projectile into
 * @returns The spawned projectile mobj
 */
export function spawnMissile(
	source: Mobj,
	targetX: number,
	targetY: number,
	targetZ: number,
	missileType: number,
	mobjs: Mobj[],
): Mobj {
	const info = MOBJINFO[missileType];
	if (!info) {
		throw new Error(`Unknown missile type: ${missileType}`);
	}

	// Compute angle to target
	const dx = targetX - source.x;
	const dy = targetY - source.y;
	const angle = (Math.atan2(dy / FRACUNIT, dx / FRACUNIT) * (0x80000000 / Math.PI)) >>> 0;

	// Spawn at source position, slightly above center
	const spawnZ = source.z + (32 << FRACBITS);

	const missile: Mobj = {
		x: source.x,
		y: source.y,
		z: spawnZ,
		angle,
		type: missileType,
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
		sectorIndex: source.sectorIndex,
		alive: true,
		stateIndex: 0,
		target: null,
		movecount: 0,
		reactiontime: 0,
		movedir: 8,
		threshold: 0,
	};

	// Set velocity based on speed and angle
	const speed = info.speed << FRACBITS;
	const fineAngle = (angle >> ANGLETOFINESHIFT) & FINEMASK;
	missile.momx = fixedMul(speed, finecosine[fineAngle] ?? FRACUNIT);
	missile.momy = fixedMul(speed, finesine[fineAngle] ?? 0);

	// Vertical velocity: aim toward target Z
	const dist = approxDist(dx, dy);
	if (dist > 0) {
		const dz = targetZ - spawnZ;
		// momz = speed * dz / dist (simplified)
		missile.momz = Math.round((dz / (dist / FRACUNIT)) * (info.speed));
	}

	// Set spawn state
	const spawnState = SPAWN_STATE[missileType];
	if (spawnState !== undefined) {
		setMobjState(missile, spawnState);
	}

	// Add to mobjs array
	mobjs.push(missile);

	return missile;
}

// ─── Projectile Movement ──────────────────────────────────────────

/**
 * Move all missile projectiles one tic.
 *
 * For each mobj with MF_MISSILE, applies momentum, checks for
 * wall and thing collisions. On collision, transitions to the
 * projectile's death state and applies damage.
 *
 * @param mobjs - All map objects (mutated: projectiles may be killed)
 * @param player - Player state for collision and damage
 * @param map - Map data for wall collision
 */
export function tickProjectiles(
	mobjs: Mobj[],
	player: PlayerState,
	map: MapData,
): void {
	for (const mobj of mobjs) {
		if (!mobj.alive) continue;
		if (!(mobj.flags & MobjFlags.MF_MISSILE)) continue;

		// Move by momentum
		const newX = mobj.x + mobj.momx;
		const newY = mobj.y + mobj.momy;
		mobj.z += mobj.momz;

		// Check wall collision
		if (hitsWall(newX, newY, mobj, map)) {
			explodeProjectile(mobj);
			continue;
		}

		// Update position
		mobj.x = newX;
		mobj.y = newY;

		// Check thing collision (player)
		if (hitsPlayer(mobj, player)) {
			// Apply damage to player
			const baseDamage = PROJECTILE_DAMAGE[mobj.type] ?? 3;
			const damage = ((Math.random() * 8 | 0) + 1) * baseDamage;
			player.health -= damage;
			explodeProjectile(mobj);
			continue;
		}

		// Check thing collision (other mobjs, for infighting)
		for (const target of mobjs) {
			if (target === mobj) continue;
			if (!target.alive) continue;
			if (!(target.flags & MobjFlags.MF_SHOOTABLE)) continue;
			if (target.flags & MobjFlags.MF_MISSILE) continue;

			if (mobjsOverlap(mobj, target)) {
				const baseDamage = PROJECTILE_DAMAGE[mobj.type] ?? 3;
				const damage = ((Math.random() * 8 | 0) + 1) * baseDamage;
				target.health -= damage;
				if (target.health <= 0) {
					target.alive = false;
					target.flags |= MobjFlags.MF_CORPSE;
					target.flags &= ~MobjFlags.MF_SOLID;
					target.flags &= ~MobjFlags.MF_SHOOTABLE;
				}
				explodeProjectile(mobj);
				break;
			}
		}
	}
}

// ─── Collision Helpers ────────────────────────────────────────────

/**
 * Check if a projectile position hits a wall via blockmap.
 */
function hitsWall(x: number, y: number, mobj: Mobj, map: MapData): boolean {
	const bmap = map.blockmap;
	const mapX = (x >> FRACBITS) - bmap.header.originX;
	const mapY = (y >> FRACBITS) - bmap.header.originY;
	const cellX = Math.floor(mapX / 128);
	const cellY = Math.floor(mapY / 128);

	// Out of bounds = wall hit
	if (cellX < 0 || cellX >= bmap.header.columns) return true;
	if (cellY < 0 || cellY >= bmap.header.rows) return true;

	const cellIndex = cellY * bmap.header.columns + cellX;
	const offset = bmap.offsets[cellIndex];
	if (offset === undefined) return false;

	let pos = offset * 2;
	if (pos + 2 > bmap.data.byteLength) return false;
	const first = bmap.data.getInt16(pos, true);
	if (first !== 0) return false;
	pos += 2;

	for (;;) {
		if (pos + 2 > bmap.data.byteLength) break;
		const lineIdx = bmap.data.getInt16(pos, true);
		if (lineIdx === -1) break;
		pos += 2;

		const linedef = map.linedefs[lineIdx];
		if (!linedef) continue;

		// One-sided lines block projectiles
		if (!(linedef.flags & 4)) { // not ML_TWOSIDED
			const v1 = map.vertexes[linedef.v1];
			const v2 = map.vertexes[linedef.v2];
			if (!v1 || !v2) continue;

			if (lineNearPoint(
				v1.x << FRACBITS, v1.y << FRACBITS,
				v2.x << FRACBITS, v2.y << FRACBITS,
				x, y, mobj.radius,
			)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Check if a line segment is near a point (within radius).
 * Simplified bbox overlap test.
 */
function lineNearPoint(
	lx1: number, ly1: number,
	lx2: number, ly2: number,
	px: number, py: number,
	radius: number,
): boolean {
	const left = px - radius;
	const right = px + radius;
	const bottom = py - radius;
	const top = py + radius;

	const lineMinX = Math.min(lx1, lx2);
	const lineMaxX = Math.max(lx1, lx2);
	const lineMinY = Math.min(ly1, ly2);
	const lineMaxY = Math.max(ly1, ly2);

	if (lineMaxX < left || lineMinX > right) return false;
	if (lineMaxY < bottom || lineMinY > top) return false;

	// Cross product side check
	const dx = lx2 - lx1;
	const dy = ly2 - ly1;
	const shift = FRACBITS;
	const dxS = dx >> shift;
	const dyS = dy >> shift;

	const c1x = (left - lx1) >> shift;
	const c1y = (bottom - ly1) >> shift;
	const cross1 = c1x * dyS - c1y * dxS;

	const c2x = (right - lx1) >> shift;
	const c2y = (top - ly1) >> shift;
	const cross2 = c2x * dyS - c2y * dxS;

	if (cross1 > 0 && cross2 > 0) return false;
	if (cross1 < 0 && cross2 < 0) return false;

	return true;
}

/**
 * Check if a projectile overlaps with the player.
 */
function hitsPlayer(mobj: Mobj, player: PlayerState): boolean {
	const playerRadius = 16 << FRACBITS;
	const playerHeight = 56 << FRACBITS;
	const dx = Math.abs(mobj.x - player.x);
	const dy = Math.abs(mobj.y - player.y);
	const combinedRadius = mobj.radius + playerRadius;

	if (dx > combinedRadius || dy > combinedRadius) return false;

	// Z check
	const playerTop = player.z + playerHeight;
	const mobjBottom = mobj.z;
	const mobjTop = mobj.z + mobj.height;

	if (mobjBottom > playerTop || mobjTop < player.z) return false;

	return true;
}

/**
 * Check if two mobjs overlap in XY and Z.
 */
function mobjsOverlap(a: Mobj, b: Mobj): boolean {
	const dx = Math.abs(a.x - b.x);
	const dy = Math.abs(a.y - b.y);
	const combinedRadius = a.radius + b.radius;

	if (dx > combinedRadius || dy > combinedRadius) return false;

	const aTop = a.z + a.height;
	const bTop = b.z + b.height;

	if (a.z > bTop || aTop < b.z) return false;

	return true;
}

/**
 * Transition a projectile to its death/explosion state.
 */
function explodeProjectile(mobj: Mobj): void {
	// Stop movement
	mobj.momx = 0;
	mobj.momy = 0;
	mobj.momz = 0;
	mobj.flags &= ~MobjFlags.MF_MISSILE;

	const deathState = DEATH_STATE[mobj.type];
	if (deathState !== undefined) {
		setMobjState(mobj, deathState);
	} else {
		mobj.alive = false;
	}
}

// ─── Helpers ──────────────────────────────────────────────────────

function approxDist(dx: number, dy: number): number {
	const adx = Math.abs(dx);
	const ady = Math.abs(dy);
	return adx + ady - (Math.min(adx, ady) >> 1);
}
