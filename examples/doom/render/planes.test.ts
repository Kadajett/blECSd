import { describe, expect, it } from 'vitest';
import { three } from 'blecsd';
import { findPlane, setPlaneColumn } from './planes.js';
import { createRenderState, VP_UNUSED } from './defs.js';
import type { RenderState, Visplane } from './defs.js';
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

function makeRenderState(): RenderState {
	const fb = three.createPixelFramebuffer({
		width: 320,
		height: 200,
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

// ─── Tests ──────────────────────────────────────────────────────────

describe('findPlane', () => {
	it('creates a new visplane when none match', () => {
		const rs = makeRenderState();
		expect(rs.visplanes.length).toBe(0);

		const plane = findPlane(rs, 0, 'FLOOR4_8', 160);

		expect(rs.visplanes.length).toBe(1);
		expect(plane.height).toBe(0);
		expect(plane.picnum).toBe('FLOOR4_8');
		expect(plane.lightLevel).toBe(160);
	});

	it('returns existing visplane when height/picnum/lightLevel match', () => {
		const rs = makeRenderState();

		const plane1 = findPlane(rs, 128, 'CEIL3_5', 200);
		const plane2 = findPlane(rs, 128, 'CEIL3_5', 200);

		expect(rs.visplanes.length).toBe(1);
		expect(plane2).toBe(plane1);
	});

	it('creates a new visplane when height differs', () => {
		const rs = makeRenderState();

		const plane1 = findPlane(rs, 0, 'FLOOR4_8', 160);
		const plane2 = findPlane(rs, 64, 'FLOOR4_8', 160);

		expect(rs.visplanes.length).toBe(2);
		expect(plane2).not.toBe(plane1);
		expect(plane2.height).toBe(64);
	});

	it('creates a new visplane when picnum differs', () => {
		const rs = makeRenderState();

		const plane1 = findPlane(rs, 0, 'FLOOR4_8', 160);
		const plane2 = findPlane(rs, 0, 'CEIL3_5', 160);

		expect(rs.visplanes.length).toBe(2);
		expect(plane2).not.toBe(plane1);
		expect(plane2.picnum).toBe('CEIL3_5');
	});

	it('creates a new visplane when lightLevel differs', () => {
		const rs = makeRenderState();

		const plane1 = findPlane(rs, 0, 'FLOOR4_8', 160);
		const plane2 = findPlane(rs, 0, 'FLOOR4_8', 128);

		expect(rs.visplanes.length).toBe(2);
		expect(plane2).not.toBe(plane1);
		expect(plane2.lightLevel).toBe(128);
	});

	it('initializes new visplane with correct defaults', () => {
		const rs = makeRenderState();

		const plane = findPlane(rs, 256, 'NUKAGE1', 80);

		// minx starts at screenWidth, maxx starts at -1 (no columns set yet)
		expect(plane.minx).toBe(rs.screenWidth);
		expect(plane.maxx).toBe(-1);
		expect(plane.top.length).toBe(rs.screenWidth);
		expect(plane.bottom.length).toBe(rs.screenWidth);

		// All top entries should be VP_UNUSED
		for (let i = 0; i < plane.top.length; i++) {
			expect(plane.top[i]).toBe(VP_UNUSED);
		}

		// All bottom entries should be 0
		for (let i = 0; i < plane.bottom.length; i++) {
			expect(plane.bottom[i]).toBe(0);
		}
	});
});

describe('setPlaneColumn', () => {
	it('sets top and bottom and updates minx and maxx', () => {
		const rs = makeRenderState();
		const plane = findPlane(rs, 0, 'FLAT1', 128);

		setPlaneColumn(plane, 50, 10, 80);

		expect(plane.top[50]).toBe(10);
		expect(plane.bottom[50]).toBe(80);
		expect(plane.minx).toBe(50);
		expect(plane.maxx).toBe(50);
	});

	it('expands minx and maxx as columns are set', () => {
		const rs = makeRenderState();
		const plane = findPlane(rs, 0, 'FLAT1', 128);

		setPlaneColumn(plane, 100, 20, 60);
		setPlaneColumn(plane, 50, 10, 70);
		setPlaneColumn(plane, 200, 30, 90);

		expect(plane.minx).toBe(50);
		expect(plane.maxx).toBe(200);
	});

	it('ignores when top > bottom', () => {
		const rs = makeRenderState();
		const plane = findPlane(rs, 0, 'FLAT1', 128);

		setPlaneColumn(plane, 50, 80, 10); // top > bottom, should be ignored

		// Column should remain at VP_UNUSED (initial value)
		expect(plane.top[50]).toBe(VP_UNUSED);
		expect(plane.bottom[50]).toBe(0);
		// minx/maxx should remain at initial values
		expect(plane.minx).toBe(rs.screenWidth);
		expect(plane.maxx).toBe(-1);
	});

	it('handles top equal to bottom (single-pixel-high span)', () => {
		const rs = makeRenderState();
		const plane = findPlane(rs, 0, 'FLAT1', 128);

		setPlaneColumn(plane, 100, 50, 50);

		expect(plane.top[100]).toBe(50);
		expect(plane.bottom[100]).toBe(50);
		expect(plane.minx).toBe(100);
		expect(plane.maxx).toBe(100);
	});

	it('overwrites previous column data', () => {
		const rs = makeRenderState();
		const plane = findPlane(rs, 0, 'FLAT1', 128);

		setPlaneColumn(plane, 75, 10, 80);
		setPlaneColumn(plane, 75, 20, 90);

		expect(plane.top[75]).toBe(20);
		expect(plane.bottom[75]).toBe(90);
	});
});
