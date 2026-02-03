import { describe, expect, it } from 'vitest';
import { three } from 'blecsd';
import {
	createHudState,
	drawHud,
	STATUS_BAR_HEIGHT,
	updateHud,
} from './hud.js';
import type { HudState } from './hud.js';
import { createRenderState } from './defs.js';
import type { RenderState } from './defs.js';
import type { PlayerState } from '../game/player.js';
import type { InputState } from '../game/input.js';
import type { MapData, Palette, ColorMap } from '../wad/types.js';
import type { TextureStore } from './textures.js';
import { FRACBITS } from '../math/fixed.js';

// ─── Minimal Mocks ──────────────────────────────────────────────────

function createMockMapData(): MapData {
	const buf = new ArrayBuffer(4);
	return {
		name: 'E1M1',
		things: [],
		linedefs: [
			{
				v1: 0,
				v2: 1,
				flags: 1,
				special: 0,
				tag: 0,
				frontSidedef: 0,
				backSidedef: -1,
			},
		],
		sidedefs: [
			{
				textureOffset: 0,
				rowOffset: 0,
				topTexture: '-',
				bottomTexture: '-',
				midTexture: 'STARTAN3',
				sector: 0,
			},
		],
		vertexes: [
			{ x: -100, y: -100 },
			{ x: 100, y: 100 },
		],
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

function createMockPlayer(): PlayerState {
	return {
		x: 0,
		y: 0,
		z: 0,
		angle: 0,
		viewz: 0,
		viewheight: 41 << FRACBITS,
		deltaviewheight: 0,
		momx: 0,
		momy: 0,
		health: 100,
		armor: 50,
		ammo: 25,
		maxAmmo: 200,
		forwardSpeed: 0,
		sideSpeed: 0,
		turnSpeed: 0,
		sectorIndex: 0,
	};
}

const noInput: InputState = { keys: new Set(), ctrl: false, shift: false };

// ─── Tests ──────────────────────────────────────────────────────────

describe('createHudState', () => {
	it('returns correct defaults', () => {
		const hud = createHudState();

		expect(hud.showAutomap).toBe(false);
		expect(hud.automapZoom).toBe(4);
		expect(hud.killCount).toBe(0);
		expect(hud.totalKills).toBe(0);
		expect(hud.itemCount).toBe(0);
		expect(hud.totalItems).toBe(0);
		expect(hud.secretCount).toBe(0);
		expect(hud.totalSecrets).toBe(0);
	});
});

describe('STATUS_BAR_HEIGHT', () => {
	it('is 32 pixels', () => {
		expect(STATUS_BAR_HEIGHT).toBe(32);
	});
});

describe('updateHud', () => {
	it('toggles automap on tab key', () => {
		const hud = createHudState();
		expect(hud.showAutomap).toBe(false);

		const tabInput: InputState = {
			keys: new Set(['tab']),
			ctrl: false,
			shift: false,
		};

		updateHud(hud, tabInput);
		expect(hud.showAutomap).toBe(true);

		updateHud(hud, tabInput);
		expect(hud.showAutomap).toBe(false);
	});

	it('does not toggle automap on other keys', () => {
		const hud = createHudState();
		expect(hud.showAutomap).toBe(false);

		const otherInput: InputState = {
			keys: new Set(['w', 'a']),
			ctrl: false,
			shift: false,
		};

		updateHud(hud, otherInput);
		expect(hud.showAutomap).toBe(false);
	});

	it('does not toggle automap on empty input', () => {
		const hud = createHudState();
		expect(hud.showAutomap).toBe(false);

		updateHud(hud, noInput);
		expect(hud.showAutomap).toBe(false);
	});
});

describe('drawHud', () => {
	it('does not crash with minimal mock data', () => {
		const rs = makeRenderState();
		const player = createMockPlayer();
		const hud = createHudState();
		const map = createMockMapData();

		expect(() => drawHud(rs, player, hud, map)).not.toThrow();
	});

	it('does not crash with automap active', () => {
		const rs = makeRenderState();
		const player = createMockPlayer();
		const hud = createHudState();
		hud.showAutomap = true;
		const map = createMockMapData();

		expect(() => drawHud(rs, player, hud, map)).not.toThrow();
	});

	it('writes pixels to the status bar area', () => {
		const rs = makeRenderState();
		const player = createMockPlayer();
		const hud = createHudState();
		const map = createMockMapData();

		drawHud(rs, player, hud, map);

		// Check that some pixels in the status bar area have been written.
		// The status bar is at y=168 to y=199. The background is dark gray (48,48,48).
		const barTop = rs.screenHeight - STATUS_BAR_HEIGHT;
		const pixel = three.getPixel(rs.fb, 160, barTop + 16);
		// Status bar should have non-zero pixel data
		const hasContent = pixel.r !== 0 || pixel.g !== 0 || pixel.b !== 0;
		expect(hasContent).toBe(true);
	});

	it('renders health number pixels', () => {
		const rs = makeRenderState();
		const player = createMockPlayer();
		player.health = 100;
		const hud = createHudState();
		const map = createMockMapData();

		drawHud(rs, player, hud, map);

		// The health number is drawn starting around x=10-54, y=barTop+16.
		// With health=100, three digits are drawn. Check the number area
		// has some green pixels (health color is 0, 220, 0).
		const barTop = rs.screenHeight - STATUS_BAR_HEIGHT;
		const numberY = barTop + 16;

		let foundGreenPixel = false;
		for (let x = 10; x < 54; x++) {
			for (let y = numberY; y < numberY + 7; y++) {
				const pixel = three.getPixel(rs.fb, x, y);
				if (pixel.g > 200 && pixel.r === 0 && pixel.b === 0) {
					foundGreenPixel = true;
					break;
				}
			}
			if (foundGreenPixel) break;
		}

		expect(foundGreenPixel).toBe(true);
	});

	it('renders ammo number pixels', () => {
		const rs = makeRenderState();
		const player = createMockPlayer();
		player.ammo = 25;
		const hud = createHudState();
		const map = createMockMapData();

		drawHud(rs, player, hud, map);

		// Ammo is drawn right-aligned at x=300, with yellow color (220, 220, 0).
		const barTop = rs.screenHeight - STATUS_BAR_HEIGHT;
		const numberY = barTop + 16;

		let foundYellowPixel = false;
		for (let x = 260; x < 300; x++) {
			for (let y = numberY; y < numberY + 7; y++) {
				const pixel = three.getPixel(rs.fb, x, y);
				if (pixel.r > 200 && pixel.g > 200 && pixel.b === 0) {
					foundYellowPixel = true;
					break;
				}
			}
			if (foundYellowPixel) break;
		}

		expect(foundYellowPixel).toBe(true);
	});

	it('renders different values for different health amounts', () => {
		const map = createMockMapData();
		const hud = createHudState();

		// Render with health=1 (one digit)
		const rs1 = makeRenderState();
		const player1 = createMockPlayer();
		player1.health = 1;
		drawHud(rs1, player1, hud, map);

		// Render with health=100 (three digits)
		const rs2 = makeRenderState();
		const player2 = createMockPlayer();
		player2.health = 100;
		drawHud(rs2, player2, hud, map);

		// The pixel patterns should differ since different numbers are rendered.
		// Check a spot where "1" would be blank but "100" would have pixels.
		const barTop = 200 - STATUS_BAR_HEIGHT;
		const numberY = barTop + 16;

		let diffFound = false;
		for (let x = 10; x < 54; x++) {
			for (let y = numberY; y < numberY + 7; y++) {
				const p1 = three.getPixel(rs1.fb, x, y);
				const p2 = three.getPixel(rs2.fb, x, y);
				if (p1.g !== p2.g) {
					diffFound = true;
					break;
				}
			}
			if (diffFound) break;
		}

		expect(diffFound).toBe(true);
	});
});
