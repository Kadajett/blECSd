/**
 * Game Loop Demo
 *
 * Demonstrates a fixed timestep game loop with FPS display.
 * Space to pause/resume, +/- to adjust speed, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/game-loop-demo.ts
 * @module demos/game-loop
 */
import {
	createWorld, addEntity, addComponent, Position, Velocity,
	setPosition, setVelocity, getVelocity,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const world = createWorld() as World;
const FIXED_DT = 1 / 60; // 60 Hz physics

// Spawn a few bouncing entities
const entities: Array<{ eid: Entity; char: string; color: number }> = [];
const CHARS = ['●', '◆', '■', '▲', '★'];
const COLORS = [31, 32, 33, 34, 35];

for (let i = 0; i < 5; i++) {
	const eid = addEntity(world) as Entity;
	addComponent(world, eid, Position);
	addComponent(world, eid, Velocity);
	const cols = (process.stdout.columns ?? 80) - 4;
	const rows = (process.stdout.rows ?? 24) - 8;
	setPosition(world, eid, 4 + Math.random() * cols, 6 + Math.random() * rows);
	setVelocity(world, eid, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15);
	entities.push({ eid, char: CHARS[i]!, color: COLORS[i]! });
}

let paused = false;
let speed = 1.0;
let accumulator = 0;
let frameCount = 0;
let fps = 0;
let lastFpsTime = Date.now();
let physicsSteps = 0;

function physicsUpdate(dt: number): void {
	const cols = (process.stdout.columns ?? 80) - 2;
	const rows = (process.stdout.rows ?? 24) - 3;
	for (const { eid } of entities) {
		const vel = getVelocity(world, eid);
		if (!vel) continue;
		Position.x[eid]! += vel.x * dt;
		Position.y[eid]! += vel.y * dt;
		if (Position.x[eid]! <= 2 || Position.x[eid]! >= cols) { Velocity.x[eid] = -Velocity.x[eid]!; Position.x[eid] = Math.max(2, Math.min(cols, Position.x[eid]!)); }
		if (Position.y[eid]! <= 5 || Position.y[eid]! >= rows) { Velocity.y[eid] = -Velocity.y[eid]!; Position.y[eid] = Math.max(5, Math.min(rows, Position.y[eid]!)); }
	}
	physicsSteps++;
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Game Loop Demo'));
	out.push(moveTo(2, 3) + `\x1b[90mSpace = pause  |  +/- = speed  |  q = quit\x1b[0m`);

	// Stats
	out.push(moveTo(3, 3) + `FPS: \x1b[33m${fps}\x1b[0m  Speed: \x1b[36m${speed.toFixed(1)}x\x1b[0m  Physics: \x1b[32m${physicsSteps}\x1b[0m steps  ${paused ? '\x1b[31mPAUSED\x1b[0m' : '\x1b[32mRUNNING\x1b[0m'}`);

	// Draw entities
	for (const { eid, char, color } of entities) {
		const x = Math.round(Position.x[eid]!);
		const y = Math.round(Position.y[eid]!);
		if (x > 0 && x < width && y > 4 && y < height - 1) {
			out.push(moveTo(y, x) + `\x1b[${color}m${char}\x1b[0m`);
		}
	}

	// Fixed timestep diagram
	out.push(moveTo(height - 3, 3) + `\x1b[90mFixed dt: ${(FIXED_DT * 1000).toFixed(1)}ms | Accumulator: ${(accumulator * 1000).toFixed(1)}ms\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Space] Pause  [+/-] Speed  [q] Quit', `${fps} FPS`));
	process.stdout.write(out.join(''));
}

let lastTime = Date.now();
let timer: ReturnType<typeof setInterval>;

function gameLoop(): void {
	const now = Date.now();
	const dt = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms
	lastTime = now;

	if (!paused) {
		accumulator += dt * speed;
		while (accumulator >= FIXED_DT) {
			physicsUpdate(FIXED_DT);
			accumulator -= FIXED_DT;
		}
	}

	frameCount++;
	if (now - lastFpsTime >= 1000) {
		fps = frameCount;
		frameCount = 0;
		lastFpsTime = now;
		physicsSteps = 0;
	}
	render();
}

function shutdown(): void { clearInterval(timer); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
timer = setInterval(gameLoop, 16); // ~60fps render

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === ' ') paused = !paused;
	if (ch === '+' || ch === '=') speed = Math.min(5, speed + 0.5);
	if (ch === '-') speed = Math.max(0.1, speed - 0.5);
});
