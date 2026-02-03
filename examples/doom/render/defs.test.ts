import { describe, expect, it } from 'vitest';
import { three } from 'blecsd';
import { createRenderState, VP_UNUSED } from './defs.js';
import type { MapData, Palette, ColorMap } from '../wad/types.js';
import type { TextureStore } from './textures.js';

// ─── Minimal Mocks ──────────────────────────────────────────────────

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
		sectors: [],
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
	return Array.from({ length: 256 }, () => ({ r: 0, g: 0, b: 0 }));
}

function createMockColormap(): ColorMap {
	return Array.from({ length: 34 }, () => {
		const map = new Uint8Array(256);
		for (let i = 0; i < 256; i++) map[i] = i;
		return map;
	});
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('createRenderState', () => {
	const WIDTH = 320;
	const HEIGHT = 200;

	function makeState() {
		const fb = three.createPixelFramebuffer({
			width: WIDTH,
			height: HEIGHT,
			enableDepthBuffer: true,
		});
		return createRenderState(
			fb,
			createMockMapData(),
			createMockTextureStore(),
			createMockPalette(),
			createMockColormap(),
		);
	}

	it('creates proper initial state with correct screen dimensions', () => {
		const rs = makeState();
		expect(rs.screenWidth).toBe(WIDTH);
		expect(rs.screenHeight).toBe(HEIGHT);
		expect(rs.fb.width).toBe(WIDTH);
		expect(rs.fb.height).toBe(HEIGHT);
	});

	it('initializes ceilingclip filled with -1', () => {
		const rs = makeState();
		expect(rs.ceilingclip.length).toBe(WIDTH);
		for (let i = 0; i < rs.ceilingclip.length; i++) {
			expect(rs.ceilingclip[i]).toBe(-1);
		}
	});

	it('initializes floorclip filled with screen height', () => {
		const rs = makeState();
		expect(rs.floorclip.length).toBe(WIDTH);
		for (let i = 0; i < rs.floorclip.length; i++) {
			expect(rs.floorclip[i]).toBe(HEIGHT);
		}
	});

	it('has two sentinel solidsegs entries', () => {
		const rs = makeState();
		expect(rs.solidsegs.length).toBe(2);

		// Left sentinel: covers everything to the left of screen
		const left = rs.solidsegs[0];
		expect(left).toBeDefined();
		expect(left!.first).toBe(-0x7fffffff);
		expect(left!.last).toBe(-1);

		// Right sentinel: covers everything to the right of screen
		const right = rs.solidsegs[1];
		expect(right).toBeDefined();
		expect(right!.first).toBe(WIDTH);
		expect(right!.last).toBe(0x7fffffff);
	});

	it('has empty visplanes and drawsegs arrays', () => {
		const rs = makeState();
		expect(rs.visplanes).toEqual([]);
		expect(rs.drawsegs).toEqual([]);
	});

	it('has correct initial camera defaults', () => {
		const rs = makeState();
		expect(rs.viewx).toBe(0);
		expect(rs.viewy).toBe(0);
		expect(rs.viewz).toBe(41 * (1 << 16)); // 41 units in fixed-point
		expect(rs.viewangle).toBe(0);
		expect(rs.viewsin).toBe(0);
		expect(rs.viewcos).toBe(0);
		expect(rs.extralight).toBe(0);
		expect(rs.fixedcolormap).toBeNull();
	});

	it('stores references to map, textures, palette, and colormap', () => {
		const fb = three.createPixelFramebuffer({
			width: WIDTH,
			height: HEIGHT,
			enableDepthBuffer: true,
		});
		const map = createMockMapData();
		const textures = createMockTextureStore();
		const palette = createMockPalette();
		const colormap = createMockColormap();

		const rs = createRenderState(fb, map, textures, palette, colormap);

		expect(rs.map).toBe(map);
		expect(rs.textures).toBe(textures);
		expect(rs.palette).toBe(palette);
		expect(rs.colormap).toBe(colormap);
		expect(rs.fb).toBe(fb);
	});

	it('uses framebuffer dimensions for clip arrays and solidsegs', () => {
		const smallFb = three.createPixelFramebuffer({
			width: 64,
			height: 48,
			enableDepthBuffer: true,
		});
		const rs = createRenderState(
			smallFb,
			createMockMapData(),
			createMockTextureStore(),
			createMockPalette(),
			createMockColormap(),
		);

		expect(rs.screenWidth).toBe(64);
		expect(rs.screenHeight).toBe(48);
		expect(rs.ceilingclip.length).toBe(64);
		expect(rs.floorclip.length).toBe(64);

		// Floorclip should use the custom height
		for (let i = 0; i < rs.floorclip.length; i++) {
			expect(rs.floorclip[i]).toBe(48);
		}

		// Right sentinel should use custom width
		expect(rs.solidsegs[1]!.first).toBe(64);
	});
});
