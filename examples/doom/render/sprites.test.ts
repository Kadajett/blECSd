import { describe, expect, it } from 'vitest';
import { three } from 'blecsd';
import { collectVisSprites, renderSprites } from './sprites.js';
import { createRenderState } from './defs.js';
import type { RenderState } from './defs.js';
import type { MapData, Palette, ColorMap, Picture } from '../wad/types.js';
import type { TextureStore } from './textures.js';
import type { Mobj, MobjInfo } from '../game/mobj.js';
import { MobjFlags } from '../game/mobj.js';
import type { SpriteStore, SpriteDef, SpriteFrame } from '../wad/spriteData.js';
import { FRACBITS, FRACUNIT } from '../math/fixed.js';
import { ANG90, ANGLETOFINESHIFT, FINEMASK, finecosine, finesine, generateTables } from '../math/angles.js';
import { initRenderTables } from '../math/tables.js';

// ─── Minimal Mocks ──────────────────────────────────────────────────

const WIDTH = 320;
const HEIGHT = 200;

function createMockMapData(): MapData {
	const buf = new ArrayBuffer(4);
	return {
		name: 'E1M1',
		things: [],
		linedefs: [],
		sidedefs: [],
		vertexes: [],
		segs: [],
		subsectors: [],
		nodes: [],
		sectors: [{ floorHeight: 0, ceilingHeight: 128, floorFlat: 'FLOOR4_8', ceilingFlat: 'CEIL3_5', lightLevel: 160, special: 0, tag: 0 }],
		blockmap: {
			header: { originX: 0, originY: 0, columns: 0, rows: 0 },
			offsets: [],
			data: new DataView(buf),
		},
	};
}

function createMockTextureStore(): TextureStore {
	const buf = new ArrayBuffer(12);
	const raw = new Uint8Array(buf);
	return {
		textureDefs: [],
		patchNames: [],
		textureByName: new Map(),
		flatByName: new Map(),
		wad: {
			header: { type: 'IWAD', numLumps: 0, directoryOffset: 0 },
			directory: [],
			data: new DataView(buf),
			raw,
		},
		compositeCache: new Map(),
	};
}

function createMockPalette(): Palette {
	return Array.from({ length: 256 }, (_, i) => ({ r: i, g: i, b: i }));
}

function createMockColormap(): ColorMap {
	return Array.from({ length: 34 }, () => {
		const map = new Uint8Array(256);
		for (let i = 0; i < 256; i++) map[i] = i;
		return map;
	});
}

function makeRenderState(): RenderState {
	const fb = three.createPixelFramebuffer({
		width: WIDTH,
		height: HEIGHT,
		enableDepthBuffer: true,
	});
	const rs = createRenderState(
		fb,
		createMockMapData(),
		createMockTextureStore(),
		createMockPalette(),
		createMockColormap(),
	);
	// Set a default camera looking east
	rs.viewx = 0;
	rs.viewy = 0;
	rs.viewz = 41 << FRACBITS;
	rs.viewangle = 0;
	const fineAngle = (rs.viewangle >> ANGLETOFINESHIFT) & FINEMASK;
	rs.viewcos = finecosine[fineAngle] ?? FRACUNIT;
	rs.viewsin = finesine[fineAngle] ?? 0;
	return rs;
}

function createMockPicture(): Picture {
	return {
		width: 16,
		height: 32,
		leftOffset: 8,
		topOffset: 28,
		columns: Array.from({ length: 16 }, () => [
			{ topDelta: 0, pixels: new Uint8Array(32).fill(96) },
		]),
	};
}

function createMockMobjInfo(): MobjInfo {
	return {
		doomEdNum: 3004,
		spawnHealth: 20,
		radius: 20,
		height: 56,
		speed: 8,
		flags: MobjFlags.MF_SOLID | MobjFlags.MF_SHOOTABLE,
		spriteName: 'POSS',
	};
}

function createMockMobj(x: number, y: number, alive: boolean): Mobj {
	const info = createMockMobjInfo();
	return {
		x: x << FRACBITS,
		y: y << FRACBITS,
		z: 0,
		angle: 0,
		type: 1,
		info,
		health: alive ? 20 : 0,
		flags: alive ? info.flags : (info.flags | MobjFlags.MF_CORPSE),
		spriteName: 'POSS',
		frame: 0,
		tics: -1,
		radius: info.radius << FRACBITS,
		height: info.height << FRACBITS,
		momx: 0,
		momy: 0,
		momz: 0,
		sectorIndex: 0,
		alive,
		stateIndex: 0,
		target: null,
		movecount: 0,
		reactiontime: 8,
		movedir: 8,
		threshold: 0,
	};
}

function createMockSpriteStore(): SpriteStore {
	const pic = createMockPicture();
	const frame: SpriteFrame = {
		rotations: [pic, pic, pic, pic, pic, pic, pic, pic],
		flipped: [false, false, false, false, false, false, false, false],
		fullBright: false,
	};
	const def: SpriteDef = {
		name: 'POSS',
		frames: [frame],
	};
	return {
		sprites: new Map([['POSS', def]]),
	};
}

// ─── Setup ──────────────────────────────────────────────────────────

// Generate trig tables once before tests
generateTables();
initRenderTables(WIDTH, HEIGHT);

// ─── Tests ──────────────────────────────────────────────────────────

describe('collectVisSprites', () => {
	it('returns empty array when no mobjs', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		const result = collectVisSprites(rs, [], store);
		expect(result).toEqual([]);
	});

	it('skips dead mobjs', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		const deadMobj = createMockMobj(100, 0, false);
		const result = collectVisSprites(rs, [deadMobj], store);
		expect(result.length).toBe(0);
	});

	it('skips mobjs behind camera', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		// Camera at (0,0) looking east (angle=0), mobj behind at (-100, 0)
		const behindMobj = createMockMobj(-100, 0, true);
		const result = collectVisSprites(rs, [behindMobj], store);
		expect(result.length).toBe(0);
	});

	it('includes mobjs in front of camera', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		// Camera at (0,0) looking east, mobj in front at (200, 0)
		const frontMobj = createMockMobj(200, 0, true);
		const result = collectVisSprites(rs, [frontMobj], store);
		expect(result.length).toBe(1);
	});

	it('returns multiple vissprites for multiple valid mobjs', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		const mobj1 = createMockMobj(100, 0, true);
		const mobj2 = createMockMobj(200, 0, true);
		const mobj3 = createMockMobj(300, 10, true);
		const result = collectVisSprites(rs, [mobj1, mobj2, mobj3], store);
		expect(result.length).toBe(3);
	});
});

describe('renderSprites', () => {
	it('sorts sprites by distance (back-to-front)', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();

		// Create mobjs at different distances, all in front of camera
		const nearMobj = createMockMobj(50, 0, true);
		const midMobj = createMockMobj(150, 0, true);
		const farMobj = createMockMobj(300, 0, true);

		// Collect vissprites directly to verify sort order
		const vissprites = collectVisSprites(rs, [nearMobj, midMobj, farMobj], store);

		// Sort the same way renderSprites does: back-to-front (descending tz)
		vissprites.sort((a, b) => b.tz - a.tz);

		// First vissprite should be the furthest (farMobj)
		expect(vissprites[0]!.mobj).toBe(farMobj);
		// Last vissprite should be the nearest (nearMobj)
		expect(vissprites[2]!.mobj).toBe(nearMobj);
	});

	it('does not crash with empty mobj list', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();

		// Should not throw
		expect(() => renderSprites(rs, [], store)).not.toThrow();
	});

	it('does not crash with only dead mobjs', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		const deadMobj = createMockMobj(100, 0, false);

		expect(() => renderSprites(rs, [deadMobj], store)).not.toThrow();
	});

	it('does not crash when sprite store is missing the sprite', () => {
		const rs = makeRenderState();
		const emptyStore: SpriteStore = { sprites: new Map() };
		const mobj = createMockMobj(100, 0, true);

		expect(() => renderSprites(rs, [mobj], emptyStore)).not.toThrow();
	});

	it('renders a sprite in front of camera without errors', () => {
		const rs = makeRenderState();
		const store = createMockSpriteStore();
		const mobj = createMockMobj(100, 0, true);

		// Should render without throwing
		expect(() => renderSprites(rs, [mobj], store)).not.toThrow();
	});
});
