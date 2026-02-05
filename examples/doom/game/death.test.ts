import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import {
	GamePhase,
	DEFAULT_LIVES,
	DEATH_ANIM_TICS,
	DEATH_VIEW_HEIGHT,
	createGameState,
	damagePlayer,
	tickDeath,
	respawnPlayer,
	canPlayerAct,
	isAwaitingRespawn,
	isGameOver,
} from './death.js';
import { createPlayer } from './player.js';
import type { PlayerState } from './player.js';
import { createWeaponState } from './weapons.js';
import type { WeaponState } from './weapons.js';
import type { MapData } from '../wad/types.js';
import { FRACBITS } from '../math/fixed.js';
import { generateTables } from '../math/angles.js';

beforeAll(() => {
	generateTables();
});

// ─── Minimal Mocks ──────────────────────────────────────────────────

function createMockMapData(): MapData {
	const buf = new ArrayBuffer(4);
	return {
		name: 'E1M1',
		things: [{ x: 100, y: 200, angle: 90, type: 1, flags: 7 }],
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

let map: MapData;
let player: PlayerState;
let weaponState: WeaponState;

beforeEach(() => {
	map = createMockMapData();
	player = createPlayer(map);
	weaponState = createWeaponState();
});

// ─── createGameState ────────────────────────────────────────────────

describe('createGameState', () => {
	it('starts in PLAYING phase with default lives', () => {
		const gs = createGameState();
		expect(gs.phase).toBe(GamePhase.PLAYING);
		expect(gs.lives).toBe(DEFAULT_LIVES);
		expect(gs.deathTics).toBe(0);
		expect(gs.totalDeaths).toBe(0);
	});

	it('accepts custom lives count', () => {
		const gs = createGameState(5);
		expect(gs.lives).toBe(5);
	});
});

// ─── damagePlayer ───────────────────────────────────────────────────

describe('damagePlayer', () => {
	it('reduces player health by damage amount', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 20);
		expect(player.health).toBe(80);
		expect(gs.phase).toBe(GamePhase.PLAYING);
	});

	it('absorbs damage with armor (1/3 absorbed)', () => {
		const gs = createGameState();
		player.armor = 100;
		damagePlayer(gs, player, 30);
		// 30 / 3 = 10 absorbed by armor, 20 to health
		expect(player.armor).toBe(90);
		expect(player.health).toBe(80);
	});

	it('does not absorb more than available armor', () => {
		const gs = createGameState();
		player.armor = 5;
		damagePlayer(gs, player, 30);
		// Would absorb 10, but only 5 armor available
		// 30 - 5 = 25 to health
		expect(player.armor).toBe(0);
		expect(player.health).toBe(75);
	});

	it('triggers death when health drops to zero', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		expect(player.health).toBe(0);
		expect(gs.phase).toBe(GamePhase.DYING);
	});

	it('triggers death when health drops below zero', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 200);
		expect(player.health).toBe(0);
		expect(gs.phase).toBe(GamePhase.DYING);
	});

	it('zeroes player momentum on death', () => {
		const gs = createGameState();
		player.momx = 50000;
		player.momy = -30000;
		damagePlayer(gs, player, 100);
		expect(player.momx).toBe(0);
		expect(player.momy).toBe(0);
	});

	it('does nothing when already dying', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		expect(gs.phase).toBe(GamePhase.DYING);
		// Try to damage again while dying
		const healthBefore = player.health;
		damagePlayer(gs, player, 50);
		expect(player.health).toBe(healthBefore);
	});

	it('does nothing when game is over', () => {
		const gs = createGameState(0);
		gs.phase = GamePhase.GAME_OVER;
		const healthBefore = player.health;
		damagePlayer(gs, player, 50);
		expect(player.health).toBe(healthBefore);
	});

	it('does nothing for zero or negative damage', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 0);
		expect(player.health).toBe(100);
		damagePlayer(gs, player, -10);
		expect(player.health).toBe(100);
	});

	it('accumulates damage across multiple hits', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 30);
		damagePlayer(gs, player, 30);
		damagePlayer(gs, player, 30);
		expect(player.health).toBe(10);
		expect(gs.phase).toBe(GamePhase.PLAYING);
	});
});

// ─── tickDeath ──────────────────────────────────────────────────────

describe('tickDeath', () => {
	it('increments deathTics each tic', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		tickDeath(gs, player);
		expect(gs.deathTics).toBe(1);
		tickDeath(gs, player);
		expect(gs.deathTics).toBe(2);
	});

	it('sinks viewheight during death animation', () => {
		const gs = createGameState();
		const initialViewheight = player.viewheight;
		damagePlayer(gs, player, 100);
		tickDeath(gs, player);
		expect(player.viewheight).toBeLessThan(initialViewheight);
	});

	it('does not sink viewheight below DEATH_VIEW_HEIGHT', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		// Tick many times
		for (let i = 0; i < DEATH_ANIM_TICS + 10; i++) {
			tickDeath(gs, player);
		}
		expect(player.viewheight).toBeGreaterThanOrEqual(DEATH_VIEW_HEIGHT);
	});

	it('transitions to DEAD after animation completes (with lives)', () => {
		const gs = createGameState(2);
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		expect(gs.phase).toBe(GamePhase.DEAD);
	});

	it('transitions to GAME_OVER after animation completes (no lives)', () => {
		const gs = createGameState(0);
		gs.phase = GamePhase.DYING;
		gs.deathTics = 0;
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		expect(gs.phase).toBe(GamePhase.GAME_OVER);
	});

	it('does nothing when not in DYING phase', () => {
		const gs = createGameState();
		const viewBefore = player.viewheight;
		tickDeath(gs, player);
		expect(player.viewheight).toBe(viewBefore);
		expect(gs.deathTics).toBe(0);
	});

	it('updates viewz from sinking viewheight', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		tickDeath(gs, player);
		expect(player.viewz).toBe(player.z + player.viewheight);
	});
});

// ─── respawnPlayer ──────────────────────────────────────────────────

describe('respawnPlayer', () => {
	it('resets player to start position', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		// Run death animation to completion
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		expect(gs.phase).toBe(GamePhase.DEAD);

		// Move player away from start
		player.x = 9999 << FRACBITS;
		player.y = 9999 << FRACBITS;

		respawnPlayer(gs, player, weaponState, map);

		expect(player.x).toBe(100 << FRACBITS);
		expect(player.y).toBe(200 << FRACBITS);
		expect(gs.phase).toBe(GamePhase.PLAYING);
	});

	it('decrements lives on respawn', () => {
		const gs = createGameState(3);
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}

		respawnPlayer(gs, player, weaponState, map);
		expect(gs.lives).toBe(2);
		expect(gs.totalDeaths).toBe(1);
	});

	it('resets player health and armor', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}

		respawnPlayer(gs, player, weaponState, map);
		expect(player.health).toBe(100);
		expect(player.armor).toBe(0);
	});

	it('resets viewheight to normal', () => {
		const gs = createGameState();
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}

		respawnPlayer(gs, player, weaponState, map);
		expect(player.viewheight).toBe(41 << FRACBITS);
	});

	it('resets weapon state to pistol with 50 bullets', () => {
		const gs = createGameState();
		weaponState.current = 2; // shotgun
		weaponState.ammo = [0, 0, 0]; // no ammo

		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}

		respawnPlayer(gs, player, weaponState, map);
		expect(weaponState.current).toBe(1); // pistol
		expect(weaponState.ammo[1]).toBe(50); // 50 bullets
	});

	it('does nothing when not in DEAD phase', () => {
		const gs = createGameState();
		const livesBefore = gs.lives;
		respawnPlayer(gs, player, weaponState, map);
		expect(gs.lives).toBe(livesBefore);
		expect(gs.phase).toBe(GamePhase.PLAYING);
	});

	it('does nothing when no lives remain', () => {
		const gs = createGameState(0);
		gs.phase = GamePhase.DEAD;
		respawnPlayer(gs, player, weaponState, map);
		// Should not change phase since 0 lives
		expect(gs.phase).toBe(GamePhase.DEAD);
	});
});

// ─── Query Helpers ──────────────────────────────────────────────────

describe('canPlayerAct', () => {
	it('returns true when PLAYING', () => {
		const gs = createGameState();
		expect(canPlayerAct(gs)).toBe(true);
	});

	it('returns false when DYING', () => {
		const gs = createGameState();
		gs.phase = GamePhase.DYING;
		expect(canPlayerAct(gs)).toBe(false);
	});

	it('returns false when DEAD', () => {
		const gs = createGameState();
		gs.phase = GamePhase.DEAD;
		expect(canPlayerAct(gs)).toBe(false);
	});

	it('returns false when GAME_OVER', () => {
		const gs = createGameState();
		gs.phase = GamePhase.GAME_OVER;
		expect(canPlayerAct(gs)).toBe(false);
	});
});

describe('isAwaitingRespawn', () => {
	it('returns true when DEAD', () => {
		const gs = createGameState();
		gs.phase = GamePhase.DEAD;
		expect(isAwaitingRespawn(gs)).toBe(true);
	});

	it('returns false for other phases', () => {
		const gs = createGameState();
		expect(isAwaitingRespawn(gs)).toBe(false);
		gs.phase = GamePhase.DYING;
		expect(isAwaitingRespawn(gs)).toBe(false);
		gs.phase = GamePhase.GAME_OVER;
		expect(isAwaitingRespawn(gs)).toBe(false);
	});
});

describe('isGameOver', () => {
	it('returns true when GAME_OVER', () => {
		const gs = createGameState();
		gs.phase = GamePhase.GAME_OVER;
		expect(isGameOver(gs)).toBe(true);
	});

	it('returns false for other phases', () => {
		const gs = createGameState();
		expect(isGameOver(gs)).toBe(false);
		gs.phase = GamePhase.DYING;
		expect(isGameOver(gs)).toBe(false);
		gs.phase = GamePhase.DEAD;
		expect(isGameOver(gs)).toBe(false);
	});
});

// ─── Full Lifecycle ─────────────────────────────────────────────────

describe('full death-respawn lifecycle', () => {
	it('complete cycle: damage -> death animation -> respawn', () => {
		const gs = createGameState(2);

		// Take damage
		damagePlayer(gs, player, 50);
		expect(player.health).toBe(50);
		expect(canPlayerAct(gs)).toBe(true);

		// Kill player
		damagePlayer(gs, player, 50);
		expect(player.health).toBe(0);
		expect(gs.phase).toBe(GamePhase.DYING);
		expect(canPlayerAct(gs)).toBe(false);

		// Run death animation
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		expect(gs.phase).toBe(GamePhase.DEAD);
		expect(isAwaitingRespawn(gs)).toBe(true);

		// Respawn
		respawnPlayer(gs, player, weaponState, map);
		expect(gs.phase).toBe(GamePhase.PLAYING);
		expect(gs.lives).toBe(1);
		expect(player.health).toBe(100);
		expect(canPlayerAct(gs)).toBe(true);
	});

	it('game over after last life used', () => {
		const gs = createGameState(1);

		// Kill and respawn (uses last life)
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		respawnPlayer(gs, player, weaponState, map);
		expect(gs.lives).toBe(0);
		expect(gs.phase).toBe(GamePhase.PLAYING);

		// Kill again, now 0 lives
		damagePlayer(gs, player, 100);
		for (let i = 0; i < DEATH_ANIM_TICS; i++) {
			tickDeath(gs, player);
		}
		expect(gs.phase).toBe(GamePhase.GAME_OVER);
		expect(isGameOver(gs)).toBe(true);
	});
});
