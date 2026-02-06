/**
 * Animation System Demo
 *
 * Demonstrates ECS-based animation with velocity and position components.
 * Entities bounce around the terminal. Press space to add more,
 * f to toggle friction, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/animation-system-demo.ts
 * @module demos/animation-system
 */
import { createWorld, addEntity, addComponent, Position, Velocity, setVelocity, getVelocity, type World, type Entity } from 'blecsd';

const CHARS = ['*', 'o', '+', '#', '@', '~'];
const COLORS = [31, 32, 33, 34, 35, 36]; // ANSI colors
const world = createWorld() as World;
const entities: Array<{ eid: Entity; char: string; color: number }> = [];
let friction = false;

function spawnEntity(): void {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Velocity);
	const cols = process.stdout.columns || 80;
	const rows = process.stdout.rows || 24;
	Position.x[eid] = Math.random() * (cols - 4) + 2;
	Position.y[eid] = Math.random() * (rows - 8) + 4;
	const speed = 3 + Math.random() * 5;
	const angle = Math.random() * Math.PI * 2;
	setVelocity(world, eid, Math.cos(angle) * speed, Math.sin(angle) * speed);
	entities.push({ eid, char: CHARS[entities.length % CHARS.length]!, color: COLORS[entities.length % COLORS.length]! });
}

for (let i = 0; i < 5; i++) spawnEntity();

function tick(): void {
	const cols = process.stdout.columns || 80;
	const rows = process.stdout.rows || 24;
	const dt = 0.15;

	for (const { eid } of entities) {
		const vel = getVelocity(world, eid);
		if (!vel) continue;

		Position.x[eid]! += vel.x * dt;
		Position.y[eid]! += vel.y * dt;

		// Bounce off walls
		if (Position.x[eid]! <= 1 || Position.x[eid]! >= cols - 2) {
			Velocity.x[eid] = -Velocity.x[eid]!;
			Position.x[eid] = Math.max(1, Math.min(cols - 2, Position.x[eid]!));
		}
		if (Position.y[eid]! <= 3 || Position.y[eid]! >= rows - 2) {
			Velocity.y[eid] = -Velocity.y[eid]!;
			Position.y[eid] = Math.max(3, Math.min(rows - 2, Position.y[eid]!));
		}

		if (friction) {
			Velocity.x[eid]! *= 0.99;
			Velocity.y[eid]! *= 0.99;
		}
	}
}

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Animation System Demo\x1b[0m\n');
	lines.push(`  Space = add entity  |  f = friction (${friction ? 'ON' : 'OFF'})  |  q = quit\n`);
	lines.push(`  Entities: ${entities.length}\n`);

	for (const { eid, char, color } of entities) {
		const x = Math.round(Position.x[eid]!);
		const y = Math.round(Position.y[eid]!);
		lines.push(`\x1b[${y};${x}H\x1b[${color}m${char}\x1b[0m`);
	}
	process.stdout.write(lines.join(''));
}

let timer: ReturnType<typeof setInterval>;

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();

	timer = setInterval(() => { tick(); render(); }, 50);

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }
		if (ch === ' ') spawnEntity();
		if (ch === 'f') friction = !friction;
	});
}

function shutdown(): void {
	clearInterval(timer);
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
