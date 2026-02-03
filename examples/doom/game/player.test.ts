import { describe, expect, it, beforeAll } from 'vitest';
import { createPlayer, updatePlayer } from './player.js';
import type { PlayerState } from './player.js';
import type { InputState } from './input.js';
import type { MapData } from '../wad/types.js';
import { FRACBITS, FRACUNIT } from '../math/fixed.js';
import { generateTables, ANG90 } from '../math/angles.js';

beforeAll(() => {
	generateTables();
});

// ─── Minimal Mocks ──────────────────────────────────────────────────

const noInput: InputState = { keys: new Set(), ctrl: false, shift: false };

function createMockMapData(things: MapData['things'] = []): MapData {
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

function createMapWithPlayerStart(
	x: number,
	y: number,
	angle: number,
): MapData {
	return createMockMapData([
		{ x, y, angle, type: 1, flags: 7 },
	]);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('createPlayer', () => {
	it('finds player start thing (type 1)', () => {
		const map = createMapWithPlayerStart(100, 200, 90);
		const player = createPlayer(map);

		expect(player.x).toBe(100 << FRACBITS);
		expect(player.y).toBe(200 << FRACBITS);
	});

	it('uses default position when no start thing', () => {
		const map = createMockMapData([
			// A thing that is NOT type 1 (player start)
			{ x: 500, y: 600, angle: 0, type: 2, flags: 7 },
		]);
		const player = createPlayer(map);

		expect(player.x).toBe(0);
		expect(player.y).toBe(0);
	});

	it('converts angle to BAM correctly', () => {
		// 90 degrees should become ANG90
		const map90 = createMapWithPlayerStart(0, 0, 90);
		const player90 = createPlayer(map90);
		const expected90 = ((90 / 360) * 0x100000000) >>> 0;
		expect(player90.angle).toBe(expected90);

		// 180 degrees should become ANG180
		const map180 = createMapWithPlayerStart(0, 0, 180);
		const player180 = createPlayer(map180);
		const expected180 = ((180 / 360) * 0x100000000) >>> 0;
		expect(player180.angle).toBe(expected180);

		// 0 degrees should be 0
		const map0 = createMapWithPlayerStart(0, 0, 0);
		const player0 = createPlayer(map0);
		expect(player0.angle).toBe(0);
	});

	it('initializes player stats correctly', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		expect(player.health).toBe(100);
		expect(player.armor).toBe(0);
		expect(player.ammo).toBe(50);
		expect(player.maxAmmo).toBe(200);
	});

	it('sets view height to 41 units above floor', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Sector floor is 0, so viewz should be 41 << FRACBITS
		expect(player.viewheight).toBe(41 << FRACBITS);
		expect(player.viewz).toBe((0 + 41) << FRACBITS);
	});

	it('sets movement momentum to zero', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		expect(player.momx).toBe(0);
		expect(player.momy).toBe(0);
	});

	it('sets movement speeds', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		expect(player.forwardSpeed).toBe(25 * 2048);
		expect(player.sideSpeed).toBe(24 * 2048);
		expect(player.turnSpeed).toBe(1280 << 16);
	});
});

describe('updatePlayer', () => {
	it('rotates left on left key press', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const initialAngle = player.angle;
		const turnSpeed = player.turnSpeed;

		const input: InputState = {
			keys: new Set(['left']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		// Left adds turnSpeed to angle (counter-clockwise in BAM)
		const expectedAngle = ((initialAngle + turnSpeed) >>> 0);
		expect(player.angle).toBe(expectedAngle);
	});

	it('rotates left on a key press', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const initialAngle = player.angle;
		const turnSpeed = player.turnSpeed;

		const input: InputState = {
			keys: new Set(['a']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		const expectedAngle = ((initialAngle + turnSpeed) >>> 0);
		expect(player.angle).toBe(expectedAngle);
	});

	it('rotates right on right key press', () => {
		const map = createMapWithPlayerStart(0, 0, 90);
		const player = createPlayer(map);
		const initialAngle = player.angle;
		const turnSpeed = player.turnSpeed;

		const input: InputState = {
			keys: new Set(['right']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		// Right subtracts turnSpeed from angle (clockwise in BAM)
		const expectedAngle = ((initialAngle - turnSpeed) >>> 0);
		expect(player.angle).toBe(expectedAngle);
	});

	it('rotates right on d key press', () => {
		const map = createMapWithPlayerStart(0, 0, 90);
		const player = createPlayer(map);
		const initialAngle = player.angle;
		const turnSpeed = player.turnSpeed;

		const input: InputState = {
			keys: new Set(['d']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		const expectedAngle = ((initialAngle - turnSpeed) >>> 0);
		expect(player.angle).toBe(expectedAngle);
	});

	it('moves forward on up key', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const startX = player.x;
		const startY = player.y;

		const input: InputState = {
			keys: new Set(['up']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		// Player facing east (angle=0): forward movement should increase x
		// With no blocking linedefs, the player should have moved
		const movedX = player.x !== startX;
		const movedY = player.y !== startY;
		expect(movedX || movedY).toBe(true);
	});

	it('moves forward on w key', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const startX = player.x;
		const startY = player.y;

		const input: InputState = {
			keys: new Set(['w']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		const movedX = player.x !== startX;
		const movedY = player.y !== startY;
		expect(movedX || movedY).toBe(true);
	});

	it('does not move with no input', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const startX = player.x;
		const startY = player.y;
		const startAngle = player.angle;

		updatePlayer(player, noInput, map);

		expect(player.x).toBe(startX);
		expect(player.y).toBe(startY);
		expect(player.angle).toBe(startAngle);
	});

	it('moves backward on down/s key', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);
		const startX = player.x;

		const input: InputState = {
			keys: new Set(['down']),
			ctrl: false,
			shift: false,
		};
		updatePlayer(player, input, map);

		// Player facing east (angle=0): backward movement should decrease x
		const movedX = player.x !== startX;
		expect(movedX).toBe(true);
	});
});
