import { describe, expect, it } from 'vitest';
import {
	MobjFlags,
	MobjType,
	MOBJINFO,
	DOOMED_TO_MOBJ,
	createMobj,
	damageMobj,
} from './mobj.js';
import { spawnMapThings } from './spawn.js';
import { FRACBITS } from '../math/fixed.js';
import type { MapData, MapThing } from '../wad/types.js';

// ─── Minimal Mocks ──────────────────────────────────────────────────

function createMockMapData(things: readonly MapThing[] = []): MapData {
	const buf = new ArrayBuffer(4);
	return {
		name: 'E1M1',
		things,
		linedefs: [],
		sidedefs: [],
		vertexes: [],
		segs: [],
		subsectors: [],
		nodes: [],
		sectors: [
			{
				floorHeight: 0,
				ceilingHeight: 128,
				floorFlat: 'FLOOR4_8',
				ceilingFlat: 'CEIL3_5',
				lightLevel: 160,
				special: 0,
				tag: 0,
			},
		],
		blockmap: {
			header: { originX: 0, originY: 0, columns: 1, rows: 1 },
			offsets: [0],
			data: new DataView(buf),
		},
	};
}

// ─── MobjFlags Tests ────────────────────────────────────────────────

describe('MobjFlags', () => {
	it('values are correct powers of 2', () => {
		expect(MobjFlags.MF_SPECIAL).toBe(1);
		expect(MobjFlags.MF_SOLID).toBe(2);
		expect(MobjFlags.MF_SHOOTABLE).toBe(4);
		expect(MobjFlags.MF_NOSECTOR).toBe(8);
		expect(MobjFlags.MF_NOBLOCKMAP).toBe(16);
		expect(MobjFlags.MF_AMBUSH).toBe(32);
		expect(MobjFlags.MF_JUSTHIT).toBe(64);
		expect(MobjFlags.MF_JUSTATTACKED).toBe(128);
		expect(MobjFlags.MF_MISSILE).toBe(256);
		expect(MobjFlags.MF_DROPPED).toBe(512);
		expect(MobjFlags.MF_PICKUP).toBe(1024);
		expect(MobjFlags.MF_COUNTKILL).toBe(2048);
		expect(MobjFlags.MF_COUNTITEM).toBe(4096);
		expect(MobjFlags.MF_CORPSE).toBe(8192);
	});

	it('each flag is a unique single bit', () => {
		const values = Object.values(MobjFlags);
		for (const v of values) {
			// A power of 2 has exactly one bit set
			expect(v & (v - 1)).toBe(0);
			expect(v).toBeGreaterThan(0);
		}
	});
});

// ─── MOBJINFO Tests ─────────────────────────────────────────────────

describe('MOBJINFO', () => {
	it('has entries for all MobjType values', () => {
		for (const typeId of Object.values(MobjType)) {
			expect(MOBJINFO[typeId]).toBeDefined();
		}
	});

	it('zombieman has correct stats', () => {
		const info = MOBJINFO[MobjType.MT_POSSESSED];
		expect(info).toBeDefined();
		expect(info!.doomEdNum).toBe(3004);
		expect(info!.spawnHealth).toBe(20);
		expect(info!.radius).toBe(20);
		expect(info!.height).toBe(56);
		expect(info!.speed).toBe(8);
		expect(info!.spriteName).toBe('POSS');
	});

	it('imp has correct stats', () => {
		const info = MOBJINFO[MobjType.MT_IMP];
		expect(info).toBeDefined();
		expect(info!.doomEdNum).toBe(3001);
		expect(info!.spawnHealth).toBe(60);
		expect(info!.spriteName).toBe('TROO');
	});

	it('barrel has correct stats', () => {
		const info = MOBJINFO[MobjType.MT_BARREL];
		expect(info).toBeDefined();
		expect(info!.doomEdNum).toBe(2035);
		expect(info!.spawnHealth).toBe(20);
		expect(info!.radius).toBe(10);
		expect(info!.height).toBe(42);
		expect(info!.speed).toBe(0);
		expect(info!.spriteName).toBe('BAR1');
	});

	it('items have SPECIAL flag and no SOLID/SHOOTABLE', () => {
		const itemTypes = [
			MobjType.MT_STIMPACK,
			MobjType.MT_MEDIKIT,
			MobjType.MT_HEALTHBONUS,
			MobjType.MT_GREENARMOR,
			MobjType.MT_CLIP,
		];
		for (const t of itemTypes) {
			const info = MOBJINFO[t];
			expect(info).toBeDefined();
			expect(info!.flags & MobjFlags.MF_SPECIAL).toBe(MobjFlags.MF_SPECIAL);
			expect(info!.flags & MobjFlags.MF_SOLID).toBe(0);
			expect(info!.flags & MobjFlags.MF_SHOOTABLE).toBe(0);
		}
	});

	it('monsters have SOLID, SHOOTABLE, and COUNTKILL flags', () => {
		const monsterTypes = [
			MobjType.MT_POSSESSED,
			MobjType.MT_SHOTGUY,
			MobjType.MT_IMP,
			MobjType.MT_DEMON,
		];
		for (const t of monsterTypes) {
			const info = MOBJINFO[t];
			expect(info).toBeDefined();
			expect(info!.flags & MobjFlags.MF_SOLID).toBe(MobjFlags.MF_SOLID);
			expect(info!.flags & MobjFlags.MF_SHOOTABLE).toBe(MobjFlags.MF_SHOOTABLE);
			expect(info!.flags & MobjFlags.MF_COUNTKILL).toBe(MobjFlags.MF_COUNTKILL);
		}
	});
});

// ─── DOOMED_TO_MOBJ Tests ───────────────────────────────────────────

describe('DOOMED_TO_MOBJ', () => {
	it('maps standard DoomEd numbers correctly', () => {
		expect(DOOMED_TO_MOBJ.get(3004)).toBe(MobjType.MT_POSSESSED);
		expect(DOOMED_TO_MOBJ.get(9)).toBe(MobjType.MT_SHOTGUY);
		expect(DOOMED_TO_MOBJ.get(3001)).toBe(MobjType.MT_IMP);
		expect(DOOMED_TO_MOBJ.get(3002)).toBe(MobjType.MT_DEMON);
		expect(DOOMED_TO_MOBJ.get(2035)).toBe(MobjType.MT_BARREL);
	});

	it('maps item DoomEd numbers correctly', () => {
		expect(DOOMED_TO_MOBJ.get(2011)).toBe(MobjType.MT_STIMPACK);
		expect(DOOMED_TO_MOBJ.get(2012)).toBe(MobjType.MT_MEDIKIT);
		expect(DOOMED_TO_MOBJ.get(2014)).toBe(MobjType.MT_HEALTHBONUS);
		expect(DOOMED_TO_MOBJ.get(2018)).toBe(MobjType.MT_GREENARMOR);
		expect(DOOMED_TO_MOBJ.get(2019)).toBe(MobjType.MT_BLUEARMOR);
	});

	it('maps key DoomEd numbers correctly', () => {
		expect(DOOMED_TO_MOBJ.get(5)).toBe(MobjType.MT_BLUEKEY);
		expect(DOOMED_TO_MOBJ.get(13)).toBe(MobjType.MT_REDKEY);
		expect(DOOMED_TO_MOBJ.get(6)).toBe(MobjType.MT_YELLOWKEY);
	});

	it('maps decoration DoomEd numbers correctly', () => {
		expect(DOOMED_TO_MOBJ.get(2028)).toBe(MobjType.MT_MISC0);
		expect(DOOMED_TO_MOBJ.get(2015)).toBe(MobjType.MT_MISC1);
	});

	it('returns undefined for unknown DoomEd numbers', () => {
		expect(DOOMED_TO_MOBJ.get(99999)).toBeUndefined();
	});
});

// ─── createMobj Tests ───────────────────────────────────────────────

describe('createMobj', () => {
	const impInfo = MOBJINFO[MobjType.MT_IMP]!;

	it('converts position to fixed-point correctly', () => {
		const thing: MapThing = { x: 100, y: 200, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.x).toBe(100 << FRACBITS);
		expect(mobj.y).toBe(200 << FRACBITS);
	});

	it('sets z to floor height in fixed-point', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 24);

		expect(mobj.z).toBe(24 << FRACBITS);
	});

	it('converts angle to BAM correctly', () => {
		const thing90: MapThing = { x: 0, y: 0, angle: 90, type: 3001, flags: 7 };
		const mobj90 = createMobj(thing90, MobjType.MT_IMP, impInfo, 0);
		const expected90 = ((90 / 360) * 0x100000000) >>> 0;
		expect(mobj90.angle).toBe(expected90);

		const thing180: MapThing = { x: 0, y: 0, angle: 180, type: 3001, flags: 7 };
		const mobj180 = createMobj(thing180, MobjType.MT_IMP, impInfo, 0);
		const expected180 = ((180 / 360) * 0x100000000) >>> 0;
		expect(mobj180.angle).toBe(expected180);

		const thing0: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj0 = createMobj(thing0, MobjType.MT_IMP, impInfo, 0);
		expect(mobj0.angle).toBe(0);
	});

	it('copies health from info', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.health).toBe(impInfo.spawnHealth);
		expect(mobj.health).toBe(60);
	});

	it('copies flags from info', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.flags).toBe(impInfo.flags);
		expect(mobj.flags & MobjFlags.MF_SOLID).toBe(MobjFlags.MF_SOLID);
		expect(mobj.flags & MobjFlags.MF_SHOOTABLE).toBe(MobjFlags.MF_SHOOTABLE);
		expect(mobj.flags & MobjFlags.MF_COUNTKILL).toBe(MobjFlags.MF_COUNTKILL);
	});

	it('converts radius and height to fixed-point', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.radius).toBe(20 << FRACBITS);
		expect(mobj.height).toBe(56 << FRACBITS);
	});

	it('initializes momentum to zero', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.momx).toBe(0);
		expect(mobj.momy).toBe(0);
		expect(mobj.momz).toBe(0);
	});

	it('initializes alive to true', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.alive).toBe(true);
	});

	it('copies sprite name from info', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.spriteName).toBe('TROO');
	});

	it('stores mobj type and info reference', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		expect(mobj.type).toBe(MobjType.MT_IMP);
		expect(mobj.info).toBe(impInfo);
	});
});

// ─── damageMobj Tests ───────────────────────────────────────────────

describe('damageMobj', () => {
	it('reduces health by damage amount', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		damageMobj(mobj, 15);

		expect(mobj.health).toBe(60 - 15);
		expect(mobj.alive).toBe(true);
	});

	it('kills when health reaches zero', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		damageMobj(mobj, 60);

		expect(mobj.health).toBe(0);
		expect(mobj.alive).toBe(false);
	});

	it('kills when health goes below zero', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		damageMobj(mobj, 100);

		expect(mobj.health).toBe(-40);
		expect(mobj.alive).toBe(false);
	});

	it('adds MF_CORPSE flag on death', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		damageMobj(mobj, 60);

		expect(mobj.flags & MobjFlags.MF_CORPSE).toBe(MobjFlags.MF_CORPSE);
	});

	it('removes MF_SOLID and MF_SHOOTABLE on death', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		// Verify flags are set before damage
		expect(mobj.flags & MobjFlags.MF_SOLID).toBe(MobjFlags.MF_SOLID);
		expect(mobj.flags & MobjFlags.MF_SHOOTABLE).toBe(MobjFlags.MF_SHOOTABLE);

		damageMobj(mobj, 60);

		expect(mobj.flags & MobjFlags.MF_SOLID).toBe(0);
		expect(mobj.flags & MobjFlags.MF_SHOOTABLE).toBe(0);
	});

	it('does not kill when damage leaves health above zero', () => {
		const thing: MapThing = { x: 0, y: 0, angle: 0, type: 3001, flags: 7 };
		const impInfo = MOBJINFO[MobjType.MT_IMP]!;
		const mobj = createMobj(thing, MobjType.MT_IMP, impInfo, 0);

		damageMobj(mobj, 59);

		expect(mobj.health).toBe(1);
		expect(mobj.alive).toBe(true);
		expect(mobj.flags & MobjFlags.MF_CORPSE).toBe(0);
		expect(mobj.flags & MobjFlags.MF_SOLID).toBe(MobjFlags.MF_SOLID);
	});
});

// ─── spawnMapThings Tests ───────────────────────────────────────────

describe('spawnMapThings', () => {
	it('skips player starts (types 1-4)', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 1, flags: 7 },
			{ x: 0, y: 0, angle: 0, type: 2, flags: 7 },
			{ x: 0, y: 0, angle: 0, type: 3, flags: 7 },
			{ x: 0, y: 0, angle: 0, type: 4, flags: 7 },
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(0);
	});

	it('skips deathmatch starts (type 11)', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 11, flags: 7 },
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(0);
	});

	it('spawns known thing types', () => {
		const map = createMockMapData([
			{ x: 100, y: 200, angle: 90, type: 3004, flags: 7 }, // zombieman
			{ x: 300, y: 400, angle: 180, type: 3001, flags: 7 }, // imp
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(2);

		expect(mobjs[0]!.type).toBe(MobjType.MT_POSSESSED);
		expect(mobjs[0]!.x).toBe(100 << FRACBITS);
		expect(mobjs[0]!.y).toBe(200 << FRACBITS);

		expect(mobjs[1]!.type).toBe(MobjType.MT_IMP);
		expect(mobjs[1]!.x).toBe(300 << FRACBITS);
		expect(mobjs[1]!.y).toBe(400 << FRACBITS);
	});

	it('skips unknown thing types', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 99999, flags: 7 },
			{ x: 100, y: 100, angle: 0, type: 3004, flags: 7 }, // zombieman
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(1);
		expect(mobjs[0]!.type).toBe(MobjType.MT_POSSESSED);
	});

	it('applies skill filtering for easy (skill 0)', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 3004, flags: 1 }, // easy only
			{ x: 100, y: 0, angle: 0, type: 3001, flags: 2 }, // normal only
			{ x: 200, y: 0, angle: 0, type: 3002, flags: 4 }, // hard only
		]);

		const mobjs = spawnMapThings(map, 0);
		expect(mobjs.length).toBe(1);
		expect(mobjs[0]!.type).toBe(MobjType.MT_POSSESSED);
	});

	it('applies skill filtering for normal (skill 2)', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 3004, flags: 1 }, // easy only
			{ x: 100, y: 0, angle: 0, type: 3001, flags: 2 }, // normal only
			{ x: 200, y: 0, angle: 0, type: 3002, flags: 4 }, // hard only
		]);

		const mobjs = spawnMapThings(map, 2);
		expect(mobjs.length).toBe(1);
		expect(mobjs[0]!.type).toBe(MobjType.MT_IMP);
	});

	it('applies skill filtering for hard (skill 3)', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 3004, flags: 1 }, // easy only
			{ x: 100, y: 0, angle: 0, type: 3001, flags: 2 }, // normal only
			{ x: 200, y: 0, angle: 0, type: 3002, flags: 4 }, // hard only
		]);

		const mobjs = spawnMapThings(map, 3);
		expect(mobjs.length).toBe(1);
		expect(mobjs[0]!.type).toBe(MobjType.MT_DEMON);
	});

	it('defaults to normal skill when no skill level provided', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 3004, flags: 1 }, // easy only
			{ x: 100, y: 0, angle: 0, type: 3001, flags: 2 }, // normal only
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(1);
		expect(mobjs[0]!.type).toBe(MobjType.MT_IMP);
	});

	it('spawns things with all skill bits set', () => {
		const map = createMockMapData([
			{ x: 0, y: 0, angle: 0, type: 3004, flags: 7 }, // all skills
		]);

		expect(spawnMapThings(map, 0).length).toBe(1);
		expect(spawnMapThings(map, 2).length).toBe(1);
		expect(spawnMapThings(map, 4).length).toBe(1);
	});

	it('returns empty array for empty things list', () => {
		const map = createMockMapData([]);
		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(0);
	});

	it('spawned mobjs have correct initial state', () => {
		const map = createMockMapData([
			{ x: 50, y: 75, angle: 270, type: 3004, flags: 7 },
		]);

		const mobjs = spawnMapThings(map);
		expect(mobjs.length).toBe(1);

		const mobj = mobjs[0]!;
		expect(mobj.alive).toBe(true);
		expect(mobj.health).toBe(20); // zombieman health
		expect(mobj.momx).toBe(0);
		expect(mobj.momy).toBe(0);
		expect(mobj.momz).toBe(0);
		expect(mobj.spriteName).toBe('POSS');
	});
});
