import { describe, expect, it, beforeAll } from 'vitest';
import { createPlayer, updatePlayer, thrustPlayer, FRICTION } from './player.js';
import type { PlayerState } from './player.js';
import type { InputState } from './input.js';
import type { MapData } from '../wad/types.js';
import { FRACBITS, FRACUNIT, fixedMul } from '../math/fixed.js';
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

describe('thrustPlayer', () => {
	it('adds forward thrust to momentum (facing east)', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		thrustPlayer(player, player.angle, player.forwardSpeed);

		// Facing east (angle=0): thrust should increase momx
		expect(player.momx).toBeGreaterThan(0);
		// momy should be near zero for angle 0
		expect(Math.abs(player.momy)).toBeLessThan(1000);
	});

	it('adds thrust in reverse direction', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Thrust in opposite direction (angle + 180 degrees)
		thrustPlayer(player, ((player.angle + 0x80000000) >>> 0), player.forwardSpeed);

		// Should produce negative momx (moving west)
		expect(player.momx).toBeLessThan(0);
	});

	it('accumulates thrust over multiple calls', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		thrustPlayer(player, player.angle, player.forwardSpeed);
		const firstMomx = player.momx;

		thrustPlayer(player, player.angle, player.forwardSpeed);

		// Second thrust should roughly double momentum
		expect(player.momx).toBeGreaterThan(firstMomx);
	});

	it('applies lateral thrust for strafing', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Strafe left (angle + 90 degrees)
		thrustPlayer(player, ((player.angle + ANG90) >>> 0), player.sideSpeed);

		// For facing east, strafing left should increase momy
		expect(Math.abs(player.momy)).toBeGreaterThan(0);
	});
});

describe('momentum and friction', () => {
	it('applies friction to reduce momentum each tick', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Give player some momentum
		player.momx = 10 * FRACUNIT;
		player.momy = 0;

		const input: InputState = { keys: new Set(), ctrl: false, shift: false };
		updatePlayer(player, input, map);

		// After one tick with friction, momx should be reduced
		// FRICTION = 0xE800 (~0.906), so momx should be roughly 9.06 * FRACUNIT
		expect(player.momx).toBeLessThan(10 * FRACUNIT);
		expect(player.momx).toBeGreaterThan(0);
	});

	it('momentum decays to zero over multiple ticks', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Give player some initial momentum
		player.momx = 5 * FRACUNIT;
		player.momy = 0;

		const input: InputState = { keys: new Set(), ctrl: false, shift: false };

		// Run many ticks with no input
		for (let i = 0; i < 50; i++) {
			updatePlayer(player, input, map);
		}

		// Momentum should have decayed to zero (killed by threshold)
		expect(player.momx).toBe(0);
		expect(player.momy).toBe(0);
	});

	it('player slides after releasing input', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Apply thrust for one tick
		const moveInput: InputState = { keys: new Set(['up']), ctrl: false, shift: false };
		updatePlayer(player, moveInput, map);
		const posAfterThrust = player.x;

		// Release input, player should still move due to momentum
		const noKeys: InputState = { keys: new Set(), ctrl: false, shift: false };
		updatePlayer(player, noKeys, map);

		expect(player.x).toBeGreaterThan(posAfterThrust);
	});

	it('FRICTION constant is 0xE800', () => {
		expect(FRICTION).toBe(0xe800);
	});

	it('kills very small momentum values to prevent drift', () => {
		const map = createMapWithPlayerStart(0, 0, 0);
		const player = createPlayer(map);

		// Set momentum just above the threshold
		player.momx = 0x0fff;
		player.momy = 0x0fff;

		const input: InputState = { keys: new Set(), ctrl: false, shift: false };
		updatePlayer(player, input, map);

		// After friction, the small values should be zeroed
		expect(player.momx).toBe(0);
		expect(player.momy).toBe(0);
	});
});
