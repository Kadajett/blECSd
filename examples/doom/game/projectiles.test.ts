/**
 * Tests for the projectile system.
 *
 * @module game/projectiles.test
 */

import { describe, expect, it } from 'vitest';
import { FRACBITS, FRACUNIT } from '../math/fixed.js';
import { generateTables } from '../math/angles.js';
import { type Mobj, MobjFlags, MobjType, MOBJINFO } from './mobj.js';
import type { PlayerState } from './player.js';
import { spawnMissile, tickProjectiles, PROJECTILE_DAMAGE } from './projectiles.js';
import { STATES, S_TBALL1, S_TBALL_DIE1 } from './states.js';

// Generate angle lookup tables (required for trigonometry)
generateTables();

// ─── Test Helpers ─────────────────────────────────────────────────

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
		armor: 0,
		ammo: 50,
		maxAmmo: 200,
		forwardSpeed: 25 * 2048,
		sideSpeed: 24 * 2048,
		turnSpeed: 1280 << 16,
		sectorIndex: 0,
		...overrides,
	};
}

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

function createMinimalMap() {
	return {
		vertexes: [],
		linedefs: [],
		sidedefs: [],
		sectors: [{ floorHeight: 0, ceilingHeight: 128, floorFlat: 'FLAT1', ceilingFlat: 'FLAT1', lightLevel: 160, special: 0, tag: 0 }],
		subsectors: [],
		segs: [],
		nodes: [],
		things: [],
		blockmap: {
			header: { originX: -1000, originY: -1000, columns: 20, rows: 20 },
			offsets: new Uint16Array(400),
			data: new DataView(new ArrayBuffer(4)),
		},
	} as any;
}

// ─── spawnMissile ─────────────────────────────────────────────────

describe('spawnMissile', () => {
	it('creates a missile mobj and adds it to the array', () => {
		const source = createTestMobj({ x: 100 << FRACBITS, y: 200 << FRACBITS });
		const mobjs: Mobj[] = [source];
		const targetX = 300 << FRACBITS;
		const targetY = 200 << FRACBITS;
		const targetZ = 32 << FRACBITS;

		const missile = spawnMissile(source, targetX, targetY, targetZ, MobjType.MT_TROOPSHOT, mobjs);

		expect(mobjs.length).toBe(2);
		expect(mobjs[1]).toBe(missile);
	});

	it('sets MF_MISSILE flag on the projectile', () => {
		const source = createTestMobj();
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 100 << FRACBITS, 0, 0, MobjType.MT_TROOPSHOT, mobjs);

		expect(missile.flags & MobjFlags.MF_MISSILE).toBeTruthy();
	});

	it('sets MF_NOBLOCKMAP flag on the projectile', () => {
		const source = createTestMobj();
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 100 << FRACBITS, 0, 0, MobjType.MT_TROOPSHOT, mobjs);

		expect(missile.flags & MobjFlags.MF_NOBLOCKMAP).toBeTruthy();
	});

	it('spawns at source position', () => {
		const source = createTestMobj({ x: 50 << FRACBITS, y: 75 << FRACBITS });
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 200 << FRACBITS, 75 << FRACBITS, 0, MobjType.MT_TROOPSHOT, mobjs);

		expect(missile.x).toBe(50 << FRACBITS);
		expect(missile.y).toBe(75 << FRACBITS);
	});

	it('sets nonzero momentum toward target', () => {
		const source = createTestMobj({ x: 0, y: 0 });
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 200 << FRACBITS, 0, 0, MobjType.MT_TROOPSHOT, mobjs);

		// Should have positive X momentum (moving east toward target)
		expect(missile.momx).toBeGreaterThan(0);
		// Y momentum should be near zero (target is directly east)
		expect(Math.abs(missile.momy)).toBeLessThan(FRACUNIT);
	});

	it('sets the spawn state', () => {
		const source = createTestMobj();
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 100 << FRACBITS, 0, 0, MobjType.MT_TROOPSHOT, mobjs);

		expect(missile.stateIndex).toBe(S_TBALL1);
		expect(missile.spriteName).toBe('BAL1');
	});

	it('uses BAL1 sprite', () => {
		const source = createTestMobj();
		const mobjs: Mobj[] = [];

		const missile = spawnMissile(source, 100 << FRACBITS, 0, 0, MobjType.MT_TROOPSHOT, mobjs);

		expect(missile.spriteName).toBe('BAL1');
	});

	it('throws for unknown missile type', () => {
		const source = createTestMobj();
		const mobjs: Mobj[] = [];

		expect(() => spawnMissile(source, 0, 0, 0, 999, mobjs)).toThrow();
	});
});

// ─── tickProjectiles ──────────────────────────────────────────────

describe('tickProjectiles', () => {
	it('moves a missile by its momentum', () => {
		const missile = createTestMobj({
			type: MobjType.MT_TROOPSHOT,
			flags: MobjFlags.MF_MISSILE | MobjFlags.MF_NOBLOCKMAP,
			momx: 10 << FRACBITS,
			momy: 5 << FRACBITS,
			momz: 0,
			radius: 6 << FRACBITS,
			height: 8 << FRACBITS,
		});
		const startX = missile.x;
		const startY = missile.y;
		const player = createTestPlayer({ x: 999 << FRACBITS, y: 999 << FRACBITS });
		const map = createMinimalMap();

		tickProjectiles([missile], player, map);

		expect(missile.x).toBe(startX + (10 << FRACBITS));
		expect(missile.y).toBe(startY + (5 << FRACBITS));
	});

	it('does not move non-missile mobjs', () => {
		const imp = createTestMobj({ momx: 10 << FRACBITS });
		const startX = imp.x;
		const player = createTestPlayer({ x: 999 << FRACBITS });
		const map = createMinimalMap();

		tickProjectiles([imp], player, map);

		// Imp should not be moved by tickProjectiles
		expect(imp.x).toBe(startX);
	});

	it('does not move dead missiles', () => {
		const missile = createTestMobj({
			type: MobjType.MT_TROOPSHOT,
			flags: MobjFlags.MF_MISSILE,
			alive: false,
			momx: 10 << FRACBITS,
		});
		const startX = missile.x;
		const player = createTestPlayer({ x: 999 << FRACBITS });
		const map = createMinimalMap();

		tickProjectiles([missile], player, map);

		expect(missile.x).toBe(startX);
	});

	it('damages player on collision', () => {
		const player = createTestPlayer({ x: 5 << FRACBITS, y: 0, z: 0, health: 100 });
		const missile = createTestMobj({
			x: 0,
			y: 0,
			z: 10 << FRACBITS,
			type: MobjType.MT_TROOPSHOT,
			flags: MobjFlags.MF_MISSILE | MobjFlags.MF_NOBLOCKMAP,
			momx: 5 << FRACBITS,
			momy: 0,
			momz: 0,
			radius: 6 << FRACBITS,
			height: 8 << FRACBITS,
		});
		const map = createMinimalMap();

		tickProjectiles([missile], player, map);

		expect(player.health).toBeLessThan(100);
	});

	it('removes MF_MISSILE flag on explosion', () => {
		const player = createTestPlayer({ x: 5 << FRACBITS, y: 0, z: 0 });
		const missile = createTestMobj({
			x: 0,
			y: 0,
			z: 10 << FRACBITS,
			type: MobjType.MT_TROOPSHOT,
			flags: MobjFlags.MF_MISSILE | MobjFlags.MF_NOBLOCKMAP,
			momx: 5 << FRACBITS,
			momy: 0,
			momz: 0,
			radius: 6 << FRACBITS,
			height: 8 << FRACBITS,
		});
		const map = createMinimalMap();

		tickProjectiles([missile], player, map);

		expect(missile.flags & MobjFlags.MF_MISSILE).toBe(0);
	});

	it('stops momentum on explosion', () => {
		const player = createTestPlayer({ x: 5 << FRACBITS, y: 0, z: 0 });
		const missile = createTestMobj({
			x: 0,
			y: 0,
			z: 10 << FRACBITS,
			type: MobjType.MT_TROOPSHOT,
			flags: MobjFlags.MF_MISSILE | MobjFlags.MF_NOBLOCKMAP,
			momx: 5 << FRACBITS,
			momy: 3 << FRACBITS,
			momz: 1 << FRACBITS,
			radius: 6 << FRACBITS,
			height: 8 << FRACBITS,
		});
		const map = createMinimalMap();

		tickProjectiles([missile], player, map);

		expect(missile.momx).toBe(0);
		expect(missile.momy).toBe(0);
		expect(missile.momz).toBe(0);
	});
});

// ─── PROJECTILE_DAMAGE ───────────────────────────────────────────

describe('PROJECTILE_DAMAGE', () => {
	it('has damage for imp fireball', () => {
		expect(PROJECTILE_DAMAGE[MobjType.MT_TROOPSHOT]).toBe(3);
	});
});

// ─── State Table ──────────────────────────────────────────────────

describe('projectile states', () => {
	it('S_TBALL1 uses BAL1 sprite', () => {
		const state = STATES[S_TBALL1];
		expect(state).toBeDefined();
		expect(state!.sprite).toBe('BAL1');
		expect(state!.frame).toBe(0);
	});

	it('S_TBALL1 cycles to S_TBALL2 and back', () => {
		const state1 = STATES[S_TBALL1];
		const state2 = STATES[S_TBALL1 + 1];
		expect(state1!.nextState).toBe(S_TBALL1 + 1);
		expect(state2!.nextState).toBe(S_TBALL1);
	});

	it('S_TBALL_DIE1 is the death state', () => {
		const state = STATES[S_TBALL_DIE1];
		expect(state).toBeDefined();
		expect(state!.sprite).toBe('BAL1');
		expect(state!.frame).toBe(2); // frame C
	});

	it('death animation ends at S_NULL', () => {
		const die3 = STATES[S_TBALL_DIE1 + 2];
		expect(die3).toBeDefined();
		expect(die3!.nextState).toBe(0); // S_NULL
	});
});

// ─── MobjInfo ─────────────────────────────────────────────────────

describe('MT_TROOPSHOT info', () => {
	it('exists in MOBJINFO', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT];
		expect(info).toBeDefined();
	});

	it('has MF_MISSILE flag', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT]!;
		expect(info.flags & MobjFlags.MF_MISSILE).toBeTruthy();
	});

	it('has MF_NOBLOCKMAP flag', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT]!;
		expect(info.flags & MobjFlags.MF_NOBLOCKMAP).toBeTruthy();
	});

	it('uses BAL1 sprite', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT]!;
		expect(info.spriteName).toBe('BAL1');
	});

	it('has small radius', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT]!;
		expect(info.radius).toBe(6);
	});

	it('has speed of 10', () => {
		const info = MOBJINFO[MobjType.MT_TROOPSHOT]!;
		expect(info.speed).toBe(10);
	});
});
