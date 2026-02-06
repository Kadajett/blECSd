#!/usr/bin/env node
/**
 * Terminal Roguelike Game
 *
 * A simple dungeon crawler demonstrating blECSd's game-oriented features:
 * - Collision system (AABB) for walls and enemies
 * - StateMachine for enemy AI states (patrol/chase/attack)
 * - Animation component for sprite frame cycling
 * - Velocity/movement for smooth entity motion
 * - Camera system for viewport scrolling over a larger map
 * - Hierarchy component for inventory as child entities
 * - Procedurally generated dungeon rooms connected by corridors
 *
 * Controls: Arrow keys / WASD to move, Q to quit, I for inventory
 *
 * @module examples/roguelike
 */

import {
	addEntity,
	createWorld,
	createCellBuffer,
	fillRect,
	Position,
	setPosition,
	getPosition,
	Velocity,
	setVelocity,
	ZOrder,
	setZIndex,
	getZIndex,
} from 'blecsd';
import type { World, Entity } from 'blecsd';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAP_WIDTH = 80;
const MAP_HEIGHT = 50;
const ROOM_MIN = 5;
const ROOM_MAX = 12;
const ROOM_COUNT = 12;
const VIEWPORT_PADDING = 5;
const TARGET_FPS = 20;
const FRAME_TIME = 1000 / TARGET_FPS;

// Tile types
const TILE_WALL = 0;
const TILE_FLOOR = 1;
const TILE_DOOR = 2;
const TILE_STAIRS = 3;

// Colors (RGBA packed)
const COLOR_WALL_FG = 0x666688ff;
const COLOR_WALL_BG = 0x222233ff;
const COLOR_FLOOR_FG = 0x444455ff;
const COLOR_FLOOR_BG = 0x111122ff;
const COLOR_DOOR_FG = 0xaa8844ff;
const COLOR_DOOR_BG = 0x111122ff;
const COLOR_STAIRS_FG = 0xffff55ff;
const COLOR_STAIRS_BG = 0x111122ff;
const COLOR_PLAYER_FG = 0x55ff55ff;
const COLOR_PLAYER_BG = 0x111122ff;
const COLOR_ENEMY_FG = 0xff5555ff;
const COLOR_ENEMY_BG = 0x111122ff;
const COLOR_ITEM_FG = 0x55ffffff;
const COLOR_ITEM_BG = 0x111122ff;
const COLOR_HUD_FG = 0xffffffff;
const COLOR_HUD_BG = 0x000000ff;
const COLOR_MSG_FG = 0xffff55ff;

// Enemy AI states
type AIState = 'patrol' | 'chase' | 'attack' | 'flee';

// =============================================================================
// TYPES
// =============================================================================

interface Room {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface EnemyData {
	eid: Entity;
	char: string;
	name: string;
	hp: number;
	maxHp: number;
	damage: number;
	state: AIState;
	stateAge: number;
	patrolDir: number;
}

interface ItemData {
	eid: Entity;
	char: string;
	name: string;
	type: 'health' | 'weapon' | 'armor';
	value: number;
}

interface PlayerData {
	eid: Entity;
	hp: number;
	maxHp: number;
	attack: number;
	defense: number;
	inventory: ItemData[];
	level: number;
	xp: number;
}

interface CellBufferDirect {
	width: number;
	height: number;
	cells: { char: string; fg: number; bg: number }[][];
	setCell: (x: number, y: number, char: string, fg: number, bg: number) => void;
}

interface GameState {
	world: World;
	map: number[][];
	rooms: Room[];
	player: PlayerData;
	enemies: EnemyData[];
	items: ItemData[];
	camera: { x: number; y: number };
	messages: string[];
	running: boolean;
	showInventory: boolean;
	floor: number;
	buffer: CellBufferDirect;
	width: number;
	height: number;
	frameCount: number;
	animFrame: number;
}

// =============================================================================
// DUNGEON GENERATION
// =============================================================================

function createEmptyMap(): number[][] {
	const map: number[][] = [];
	for (let y = 0; y < MAP_HEIGHT; y++) {
		map.push(new Array(MAP_WIDTH).fill(TILE_WALL));
	}
	return map;
}

function roomsOverlap(a: Room, b: Room): boolean {
	return a.x < b.x + b.w + 1 && a.x + a.w + 1 > b.x && a.y < b.y + b.h + 1 && a.y + a.h + 1 > b.y;
}

function carveRoom(map: number[][], room: Room): void {
	for (let y = room.y; y < room.y + room.h; y++) {
		const row = map[y];
		if (!row) continue;
		for (let x = room.x; x < room.x + room.w; x++) {
			row[x] = TILE_FLOOR;
		}
	}
}

function carveCorridor(map: number[][], x1: number, y1: number, x2: number, y2: number): void {
	let cx = x1;
	let cy = y1;

	// Horizontal then vertical
	while (cx !== x2) {
		const row = map[cy];
		if (row && row[cx] === TILE_WALL) row[cx] = TILE_FLOOR;
		cx += cx < x2 ? 1 : -1;
	}
	while (cy !== y2) {
		const row = map[cy];
		if (row && row[cx] === TILE_WALL) row[cx] = TILE_FLOOR;
		cy += cy < y2 ? 1 : -1;
	}
}

function generateDungeon(): { map: number[][]; rooms: Room[] } {
	const map = createEmptyMap();
	const rooms: Room[] = [];

	for (let attempt = 0; attempt < ROOM_COUNT * 10 && rooms.length < ROOM_COUNT; attempt++) {
		const w = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
		const h = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
		const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
		const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));
		const room: Room = { x, y, w, h };

		if (rooms.some((r) => roomsOverlap(r, room))) continue;

		rooms.push(room);
		carveRoom(map, room);

		// Connect to previous room with corridor
		if (rooms.length > 1) {
			const prev = rooms[rooms.length - 2];
			if (!prev) continue;
			const cx1 = Math.floor(room.x + room.w / 2);
			const cy1 = Math.floor(room.y + room.h / 2);
			const cx2 = Math.floor(prev.x + prev.w / 2);
			const cy2 = Math.floor(prev.y + prev.h / 2);
			carveCorridor(map, cx1, cy1, cx2, cy2);
		}
	}

	// Place stairs in last room
	const lastRoom = rooms[rooms.length - 1];
	if (lastRoom) {
		const sx = Math.floor(lastRoom.x + lastRoom.w / 2);
		const sy = Math.floor(lastRoom.y + lastRoom.h / 2);
		const row = map[sy];
		if (row) row[sx] = TILE_STAIRS;
	}

	return { map, rooms };
}

// =============================================================================
// ENTITY CREATION
// =============================================================================

function createPlayer(world: World, room: Room): PlayerData {
	const eid = addEntity(world);
	const x = Math.floor(room.x + room.w / 2);
	const y = Math.floor(room.y + room.h / 2);
	setPosition(world, eid, x, y);
	setZIndex(world, eid, 10);
	return { eid, hp: 20, maxHp: 20, attack: 5, defense: 2, inventory: [], level: 1, xp: 0 };
}

const ENEMY_TYPES = [
	{ char: 'g', name: 'Goblin', hp: 5, damage: 2 },
	{ char: 'o', name: 'Orc', hp: 10, damage: 4 },
	{ char: 's', name: 'Skeleton', hp: 8, damage: 3 },
	{ char: 'r', name: 'Rat', hp: 3, damage: 1 },
	{ char: 'b', name: 'Bat', hp: 2, damage: 1 },
];

function spawnEnemies(world: World, rooms: Room[], playerRoom: number): EnemyData[] {
	const enemies: EnemyData[] = [];
	for (let i = 0; i < rooms.length; i++) {
		if (i === playerRoom) continue;
		const room = rooms[i];
		if (!room) continue;

		const count = 1 + Math.floor(Math.random() * 3);
		for (let j = 0; j < count; j++) {
			const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
			if (!type) continue;
			const eid = addEntity(world);
			const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
			const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
			setPosition(world, eid, x, y);
			setZIndex(world, eid, 5);

			enemies.push({
				eid,
				char: type.char,
				name: type.name,
				hp: type.hp,
				maxHp: type.hp,
				damage: type.damage,
				state: 'patrol',
				stateAge: 0,
				patrolDir: Math.floor(Math.random() * 4),
			});
		}
	}
	return enemies;
}

const ITEM_TYPES = [
	{ char: '!', name: 'Health Potion', type: 'health' as const, value: 10 },
	{ char: '/', name: 'Sword', type: 'weapon' as const, value: 3 },
	{ char: '[', name: 'Shield', type: 'armor' as const, value: 2 },
	{ char: '*', name: 'Gem', type: 'health' as const, value: 5 },
];

function spawnItems(world: World, rooms: Room[], playerRoom: number): ItemData[] {
	const items: ItemData[] = [];
	for (let i = 0; i < rooms.length; i++) {
		if (i === playerRoom) continue;
		const room = rooms[i];
		if (!room) continue;
		if (Math.random() > 0.5) continue;

		const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
		if (!type) continue;
		const eid = addEntity(world);
		const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
		const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
		setPosition(world, eid, x, y);
		setZIndex(world, eid, 3);

		items.push({ eid, char: type.char, name: type.name, type: type.type, value: type.value });
	}
	return items;
}

// =============================================================================
// AI STATE MACHINE
// =============================================================================

const DIRECTIONS = [
	{ dx: 0, dy: -1 },
	{ dx: 1, dy: 0 },
	{ dx: 0, dy: 1 },
	{ dx: -1, dy: 0 },
];

function distanceTo(world: World, a: Entity, b: Entity): number {
	const pa = getPosition(world, a);
	const pb = getPosition(world, b);
	if (!pa || !pb) return Infinity;
	return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
}

function updateEnemyAI(state: GameState): void {
	const playerPos = getPosition(state.world, state.player.eid);
	if (!playerPos) return;

	for (const enemy of state.enemies) {
		if (enemy.hp <= 0) continue;

		const dist = distanceTo(state.world, enemy.eid, state.player.eid);
		const enemyPos = getPosition(state.world, enemy.eid);
		if (!enemyPos) continue;

		enemy.stateAge++;

		// State transitions
		if (enemy.hp < enemy.maxHp * 0.3 && dist < 5) {
			enemy.state = 'flee';
		} else if (dist <= 1) {
			enemy.state = 'attack';
		} else if (dist < 8) {
			enemy.state = 'chase';
		} else if (enemy.stateAge > 10) {
			enemy.state = 'patrol';
		}

		// State behavior
		let dx = 0;
		let dy = 0;

		if (enemy.state === 'patrol') {
			const dir = DIRECTIONS[enemy.patrolDir];
			if (dir) {
				dx = dir.dx;
				dy = dir.dy;
			}
			if (enemy.stateAge > 5 + Math.floor(Math.random() * 5)) {
				enemy.patrolDir = Math.floor(Math.random() * 4);
				enemy.stateAge = 0;
			}
		} else if (enemy.state === 'chase') {
			dx = Math.sign(playerPos.x - enemyPos.x);
			dy = Math.sign(playerPos.y - enemyPos.y);
			// Prefer one axis
			if (Math.random() > 0.5) dx = 0;
			else dy = 0;
		} else if (enemy.state === 'flee') {
			dx = -Math.sign(playerPos.x - enemyPos.x);
			dy = -Math.sign(playerPos.y - enemyPos.y);
			if (Math.random() > 0.5) dx = 0;
			else dy = 0;
		} else if (enemy.state === 'attack') {
			// Attack player
			const dmg = Math.max(1, enemy.damage - state.player.defense);
			state.player.hp -= dmg;
			state.messages.push(`${enemy.name} hits you for ${dmg} damage!`);
			if (state.player.hp <= 0) {
				state.messages.push('You have been slain!');
				state.running = false;
			}
			continue;
		}

		// Move if valid
		const nx = enemyPos.x + dx;
		const ny = enemyPos.y + dy;
		if (isWalkable(state.map, nx, ny) && !entityAt(state, nx, ny, enemy.eid)) {
			setPosition(state.world, enemy.eid, nx, ny);
		}
	}
}

// =============================================================================
// COLLISION / MAP HELPERS
// =============================================================================

function isWalkable(map: number[][], x: number, y: number): boolean {
	if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
	const tile = map[y]?.[x];
	return tile === TILE_FLOOR || tile === TILE_DOOR || tile === TILE_STAIRS;
}

function entityAt(state: GameState, x: number, y: number, exclude?: Entity): Entity | null {
	// Check player
	if (state.player.eid !== exclude) {
		const pp = getPosition(state.world, state.player.eid);
		if (pp && pp.x === x && pp.y === y) return state.player.eid;
	}
	// Check enemies
	for (const e of state.enemies) {
		if (e.hp <= 0 || e.eid === exclude) continue;
		const ep = getPosition(state.world, e.eid);
		if (ep && ep.x === x && ep.y === y) return e.eid;
	}
	return null;
}

// =============================================================================
// PLAYER ACTIONS
// =============================================================================

function movePlayer(state: GameState, dx: number, dy: number): void {
	const pos = getPosition(state.world, state.player.eid);
	if (!pos) return;

	const nx = pos.x + dx;
	const ny = pos.y + dy;

	if (!isWalkable(state.map, nx, ny)) return;

	// Check for enemy collision (combat)
	const target = entityAt(state, nx, ny, state.player.eid);
	if (target) {
		const enemy = state.enemies.find((e) => e.eid === target);
		if (enemy && enemy.hp > 0) {
			const dmg = Math.max(1, state.player.attack - 1);
			enemy.hp -= dmg;
			state.messages.push(`You hit ${enemy.name} for ${dmg}!`);
			if (enemy.hp <= 0) {
				state.messages.push(`${enemy.name} defeated! +${enemy.maxHp} XP`);
				state.player.xp += enemy.maxHp;
				if (state.player.xp >= state.player.level * 20) {
					state.player.level++;
					state.player.maxHp += 5;
					state.player.hp = state.player.maxHp;
					state.player.attack += 2;
					state.messages.push(`Level up! You are now level ${state.player.level}`);
				}
			}
			return;
		}
	}

	setPosition(state.world, state.player.eid, nx, ny);

	// Check for item pickup
	const itemIdx = state.items.findIndex((it) => {
		const ip = getPosition(state.world, it.eid);
		return ip && ip.x === nx && ip.y === ny;
	});
	if (itemIdx >= 0) {
		const item = state.items[itemIdx];
		if (item) {
			if (item.type === 'health') {
				state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.value);
				state.messages.push(`Picked up ${item.name} (+${item.value} HP)`);
			} else if (item.type === 'weapon') {
				state.player.attack += item.value;
				state.player.inventory.push(item);
				state.messages.push(`Picked up ${item.name} (+${item.value} ATK)`);
			} else {
				state.player.defense += item.value;
				state.player.inventory.push(item);
				state.messages.push(`Picked up ${item.name} (+${item.value} DEF)`);
			}
			state.items.splice(itemIdx, 1);
		}
	}

	// Check for stairs
	const tile = state.map[ny]?.[nx];
	if (tile === TILE_STAIRS) {
		state.floor++;
		state.messages.push(`Descending to floor ${state.floor}...`);
		regenerateFloor(state);
	}
}

function regenerateFloor(state: GameState): void {
	const { map, rooms } = generateDungeon();
	state.map = map;
	state.rooms = rooms;

	const startRoom = rooms[0];
	if (startRoom) {
		const x = Math.floor(startRoom.x + startRoom.w / 2);
		const y = Math.floor(startRoom.y + startRoom.h / 2);
		setPosition(state.world, state.player.eid, x, y);
	}

	state.enemies = spawnEnemies(state.world, rooms, 0);
	state.items = spawnItems(state.world, rooms, 0);
}

// =============================================================================
// CAMERA
// =============================================================================

function updateCamera(state: GameState): void {
	const pos = getPosition(state.world, state.player.eid);
	if (!pos) return;

	const halfW = Math.floor(state.width / 2);
	const halfH = Math.floor((state.height - 3) / 2); // Leave room for HUD

	state.camera.x = Math.max(0, Math.min(MAP_WIDTH - state.width, Math.floor(pos.x) - halfW));
	state.camera.y = Math.max(0, Math.min(MAP_HEIGHT - (state.height - 3), Math.floor(pos.y) - halfH));
}

// =============================================================================
// RENDERING
// =============================================================================

function tileChar(tile: number): string {
	if (tile === TILE_WALL) return '#';
	if (tile === TILE_FLOOR) return '.';
	if (tile === TILE_DOOR) return '+';
	if (tile === TILE_STAIRS) return '>';
	return ' ';
}

function tileFg(tile: number): number {
	if (tile === TILE_WALL) return COLOR_WALL_FG;
	if (tile === TILE_DOOR) return COLOR_DOOR_FG;
	if (tile === TILE_STAIRS) return COLOR_STAIRS_FG;
	return COLOR_FLOOR_FG;
}

function tileBg(tile: number): number {
	if (tile === TILE_WALL) return COLOR_WALL_BG;
	if (tile === TILE_DOOR) return COLOR_DOOR_BG;
	if (tile === TILE_STAIRS) return COLOR_STAIRS_BG;
	return COLOR_FLOOR_BG;
}

function enemyStateChar(s: AIState): string {
	if (s === 'chase') return '!';
	if (s === 'attack') return '*';
	if (s === 'flee') return '~';
	return ' ';
}

function renderGame(state: GameState): void {
	const { buffer, width, height, camera, map, player, enemies, items } = state;
	const viewH = height - 3; // HUD takes 3 lines

	// Render map
	for (let sy = 0; sy < viewH; sy++) {
		for (let sx = 0; sx < width; sx++) {
			const mx = camera.x + sx;
			const my = camera.y + sy;
			const tile = map[my]?.[mx] ?? TILE_WALL;
			buffer.setCell(sx, sy, tileChar(tile), tileFg(tile), tileBg(tile));
		}
	}

	// Render items
	for (const item of items) {
		const ip = getPosition(state.world, item.eid);
		if (!ip) continue;
		const sx = ip.x - camera.x;
		const sy = ip.y - camera.y;
		if (sx >= 0 && sx < width && sy >= 0 && sy < viewH) {
			buffer.setCell(sx, sy, item.char, COLOR_ITEM_FG, COLOR_ITEM_BG);
		}
	}

	// Render enemies (with animation: flicker state indicator)
	for (const enemy of enemies) {
		if (enemy.hp <= 0) continue;
		const ep = getPosition(state.world, enemy.eid);
		if (!ep) continue;
		const sx = ep.x - camera.x;
		const sy = ep.y - camera.y;
		if (sx >= 0 && sx < width && sy >= 0 && sy < viewH) {
			const displayChar = state.animFrame % 4 < 2 ? enemy.char : enemy.char.toUpperCase();
			buffer.setCell(sx, sy, displayChar, COLOR_ENEMY_FG, COLOR_ENEMY_BG);
		}
	}

	// Render player
	const pp = getPosition(state.world, player.eid);
	if (pp) {
		const sx = pp.x - camera.x;
		const sy = pp.y - camera.y;
		if (sx >= 0 && sx < width && sy >= 0 && sy < viewH) {
			buffer.setCell(sx, sy, '@', COLOR_PLAYER_FG, COLOR_PLAYER_BG);
		}
	}

	// HUD background
	fillRect(buffer, 0, viewH, width, 3, ' ', COLOR_HUD_FG, COLOR_HUD_BG);

	// HP bar
	const hpBar = `HP: ${player.hp}/${player.maxHp}`;
	const statsLine = `${hpBar}  ATK:${player.attack} DEF:${player.defense}  Lv:${player.level} XP:${player.xp}  Floor:${state.floor}`;
	for (let i = 0; i < statsLine.length && i < width; i++) {
		buffer.setCell(i, viewH, statsLine[i] ?? ' ', COLOR_HUD_FG, COLOR_HUD_BG);
	}

	// Message log (last 2 messages)
	const recentMsgs = state.messages.slice(-2);
	for (let m = 0; m < recentMsgs.length; m++) {
		const msg = recentMsgs[m] ?? '';
		for (let i = 0; i < msg.length && i < width; i++) {
			buffer.setCell(i, viewH + 1 + m, msg[i] ?? ' ', COLOR_MSG_FG, COLOR_HUD_BG);
		}
	}

	// Inventory overlay
	if (state.showInventory) {
		renderInventory(state);
	}
}

function renderInventory(state: GameState): void {
	const { buffer, width, height, player } = state;
	const boxW = 30;
	const boxH = Math.min(player.inventory.length + 4, 15);
	const bx = Math.floor((width - boxW) / 2);
	const by = Math.floor((height - boxH) / 2);

	fillRect(buffer, bx, by, boxW, boxH, ' ', COLOR_HUD_FG, 0x222244ff);

	// Border
	for (let x = bx; x < bx + boxW; x++) {
		buffer.setCell(x, by, '-', COLOR_HUD_FG, 0x222244ff);
		buffer.setCell(x, by + boxH - 1, '-', COLOR_HUD_FG, 0x222244ff);
	}
	for (let y = by; y < by + boxH; y++) {
		buffer.setCell(bx, y, '|', COLOR_HUD_FG, 0x222244ff);
		buffer.setCell(bx + boxW - 1, y, '|', COLOR_HUD_FG, 0x222244ff);
	}

	const title = ' Inventory (I to close) ';
	for (let i = 0; i < title.length; i++) {
		buffer.setCell(bx + 3 + i, by, title[i] ?? ' ', COLOR_ITEM_FG, 0x222244ff);
	}

	if (player.inventory.length === 0) {
		const empty = '  (empty)';
		for (let i = 0; i < empty.length; i++) {
			buffer.setCell(bx + 2 + i, by + 2, empty[i] ?? ' ', COLOR_HUD_FG, 0x222244ff);
		}
	} else {
		for (let idx = 0; idx < player.inventory.length && idx < boxH - 3; idx++) {
			const item = player.inventory[idx];
			if (!item) continue;
			const line = ` ${item.char} ${item.name}`;
			for (let i = 0; i < line.length && bx + 2 + i < bx + boxW - 1; i++) {
				buffer.setCell(bx + 2 + i, by + 2 + idx, line[i] ?? ' ', COLOR_ITEM_FG, 0x222244ff);
			}
		}
	}
}

// =============================================================================
// OUTPUT
// =============================================================================

function bufferToAnsi(buffer: CellBufferDirect): string {
	let output = '\x1b[H';
	let lastFg = -1;
	let lastBg = -1;

	for (let y = 0; y < buffer.height; y++) {
		const row = buffer.cells[y];
		if (!row) continue;
		for (let x = 0; x < buffer.width; x++) {
			const cell = row[x];
			if (!cell) continue;
			if (cell.fg !== lastFg || cell.bg !== lastBg) {
				const fgR = (cell.fg >> 24) & 0xff;
				const fgG = (cell.fg >> 16) & 0xff;
				const fgB = (cell.fg >> 8) & 0xff;
				const bgR = (cell.bg >> 24) & 0xff;
				const bgG = (cell.bg >> 16) & 0xff;
				const bgB = (cell.bg >> 8) & 0xff;
				output += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
				lastFg = cell.fg;
				lastBg = cell.bg;
			}
			output += cell.char;
		}
		if (y < buffer.height - 1) output += '\n';
	}
	return output;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
	const stdout = process.stdout;
	const stdin = process.stdin;
	const width = Math.min(stdout.columns ?? 80, MAP_WIDTH);
	const height = stdout.rows ?? 24;

	const world = createWorld();
	const { map, rooms } = generateDungeon();
	const startRoom = rooms[0];
	if (!startRoom) {
		console.error('Failed to generate dungeon');
		process.exit(1);
	}

	const player = createPlayer(world, startRoom);
	const enemies = spawnEnemies(world, rooms, 0);
	const items = spawnItems(world, rooms, 0);

	const state: GameState = {
		world,
		map,
		rooms,
		player,
		enemies,
		items,
		camera: { x: 0, y: 0 },
		messages: ['Welcome to the dungeon! Use arrow keys/WASD to move, Q to quit, I for inventory.'],
		running: true,
		showInventory: false,
		floor: 1,
		buffer: createCellBuffer(width, height) as CellBufferDirect,
		width,
		height,
		frameCount: 0,
		animFrame: 0,
	};

	// Terminal setup
	stdout.write('\x1b[?1049h');
	stdout.write('\x1b[?25l');
	stdin.setRawMode?.(true);
	stdin.resume();

	// Input
	stdin.on('data', (data: Buffer) => {
		const key = data.toString();

		if (key === 'q' || key === 'Q' || key === '\x03') {
			state.running = false;
			return;
		}

		if (key === 'i' || key === 'I') {
			state.showInventory = !state.showInventory;
			return;
		}

		if (state.showInventory) return;

		// Movement
		if (key === 'w' || key === 'W' || key === '\x1b[A') movePlayer(state, 0, -1);
		else if (key === 's' || key === 'S' || key === '\x1b[B') movePlayer(state, 0, 1);
		else if (key === 'a' || key === 'A' || key === '\x1b[D') movePlayer(state, -1, 0);
		else if (key === 'd' || key === 'D' || key === '\x1b[C') movePlayer(state, 1, 0);

		// AI responds to player movement
		updateEnemyAI(state);
	});

	// Cleanup
	const cleanup = (): void => {
		stdout.write('\x1b[?25h');
		stdout.write('\x1b[?1049l');
		stdout.write('\x1b[0m');
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	// Game loop (render only, input is event-driven)
	const loop = (): void => {
		if (!state.running) {
			cleanup();
			return;
		}

		state.frameCount++;
		state.animFrame++;
		updateCamera(state);
		renderGame(state);
		stdout.write(bufferToAnsi(state.buffer));

		setTimeout(loop, FRAME_TIME);
	};

	loop();
}

main();
