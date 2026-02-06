/**
 * Collision System Demo
 *
 * Demonstrates AABB collision detection between moving entities.
 * Space to add entity, f to freeze, r to reset, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/collision-system-demo.ts
 * @module demos/collision-system
 */
import {
	createWorld, addEntity, addComponent, Position, Velocity, Dimensions,
	setPosition, setVelocity, getVelocity, setDimensions,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, startLoop } from './demo-utils';

const world = createWorld() as World;

interface Box { eid: Entity; w: number; h: number; color: number; colliding: boolean }
const boxes: Box[] = [];
const COLORS = [31, 32, 33, 34, 35, 36];
let collisionCount = 0;
let frozen = false;

function spawnBox(): void {
	const eid = addEntity(world) as Entity;
	const w = 4 + Math.floor(Math.random() * 4);
	const h = 2 + Math.floor(Math.random() * 2);
	addComponent(world, eid, Position);
	addComponent(world, eid, Velocity);
	addComponent(world, eid, Dimensions);
	const cols = (process.stdout.columns ?? 80) - w - 2;
	const rows = (process.stdout.rows ?? 24) - h - 4;
	setPosition(world, eid, 2 + Math.random() * cols, 5 + Math.random() * rows);
	setVelocity(world, eid, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5);
	setDimensions(world, eid, w, h);
	boxes.push({ eid, w, h, color: COLORS[boxes.length % COLORS.length]!, colliding: false });
}

for (let i = 0; i < 4; i++) spawnBox();

// AABB collision check
function checkAABB(a: Box, b: Box): boolean {
	const ax = Position.x[a.eid]!, ay = Position.y[a.eid]!;
	const bx = Position.x[b.eid]!, by = Position.y[b.eid]!;
	return ax < bx + b.w && ax + a.w > bx && ay < by + b.h && ay + a.h > by;
}

function tick(): void {
	if (frozen) return;
	const cols = (process.stdout.columns ?? 80) - 2;
	const rows = (process.stdout.rows ?? 24) - 3;
	const dt = 0.15;

	for (const box of boxes) {
		const vel = getVelocity(world, box.eid);
		if (!vel) continue;
		Position.x[box.eid]! += vel.x * dt;
		Position.y[box.eid]! += vel.y * dt;
		if (Position.x[box.eid]! <= 1 || Position.x[box.eid]! >= cols - box.w) { Velocity.x[box.eid] = -Velocity.x[box.eid]!; Position.x[box.eid] = Math.max(1, Math.min(cols - box.w, Position.x[box.eid]!)); }
		if (Position.y[box.eid]! <= 5 || Position.y[box.eid]! >= rows - box.h) { Velocity.y[box.eid] = -Velocity.y[box.eid]!; Position.y[box.eid] = Math.max(5, Math.min(rows - box.h, Position.y[box.eid]!)); }
	}

	// Check collisions
	collisionCount = 0;
	for (const box of boxes) box.colliding = false;
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			if (checkAABB(boxes[i]!, boxes[j]!)) {
				boxes[i]!.colliding = true;
				boxes[j]!.colliding = true;
				collisionCount++;
			}
		}
	}
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Collision System Demo'));
	out.push(moveTo(2, 3) + `\x1b[90mSpace = add  |  f = freeze (${frozen ? 'ON' : 'OFF'})  |  r = reset  |  q = quit\x1b[0m`);
	out.push(moveTo(3, 3) + `Entities: \x1b[33m${boxes.length}\x1b[0m  Collisions: \x1b[${collisionCount > 0 ? '31' : '32'}m${collisionCount}\x1b[0m`);

	for (const box of boxes) {
		const x = Math.round(Position.x[box.eid]!);
		const y = Math.round(Position.y[box.eid]!);
		const color = box.colliding ? '\x1b[1;31;7m' : `\x1b[${box.color}m`;
		out.push(moveTo(y, x) + `${color}┌${'─'.repeat(Math.max(0, box.w - 2))}┐\x1b[0m`);
		for (let r = 1; r < box.h - 1; r++) {
			out.push(moveTo(y + r, x) + `${color}│${' '.repeat(Math.max(0, box.w - 2))}│\x1b[0m`);
		}
		if (box.h > 1) out.push(moveTo(y + box.h - 1, x) + `${color}└${'─'.repeat(Math.max(0, box.w - 2))}┘\x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Space] Add  [f] Freeze  [r] Reset  [q] Quit', `${collisionCount} collisions`));
	process.stdout.write(out.join(''));
}

function reset(): void {
	boxes.length = 0;
	for (let i = 0; i < 4; i++) spawnBox();
}

const stop = startLoop(() => { tick(); render(); }, 30);

function shutdown(): void { stop(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === ' ') spawnBox();
	if (ch === 'f') frozen = !frozen;
	if (ch === 'r') reset();
});
