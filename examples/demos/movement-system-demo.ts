/**
 * Movement System Demo
 *
 * Demonstrates entities moving with velocity and acceleration.
 * Arrow keys apply velocity, Space toggles friction, 'r' resets.
 *
 * Run: npx tsx examples/demos/movement-system-demo.ts
 * @module demos/movement-system
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, getPosition,
	Velocity, setVelocity, getVelocity, hasVelocity,
	Acceleration, setAcceleration, getAcceleration, hasAcceleration,
	applyVelocityToEntity, applyAccelerationToEntity, applyFrictionToEntity,
	setFriction, setMaxSpeed, getSpeed, stopEntity,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, getTerminalSize, moveTo, startLoop } from './demo-utils';

const world = createWorld();

// Create a player entity
const player = addEntity(world);
addComponent(world, player, Position);
addComponent(world, player, Velocity);
addComponent(world, player, Acceleration);
setPosition(world, player, 40, 12);
setVelocity(world, player, 0, 0);
setMaxSpeed(world, player, 15);
setFriction(world, player, 0.92);

// Create some bouncing particles
const particles: number[] = [];
for (let i = 0; i < 5; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Velocity);
	setPosition(world, eid, 10 + i * 12, 5 + i * 3);
	setVelocity(world, eid, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6);
	particles.push(eid);
}

let useFriction = true;
const chars = ['@', '*', '+', 'o', '#', '~'];

function update(): void {
	const { width, height } = getTerminalSize();
	const dt = 1 / 30;

	// Apply physics to player
	applyAccelerationToEntity(world, player, dt);
	if (useFriction) applyFrictionToEntity(world, player);
	applyVelocityToEntity(world, player, dt);

	// Clamp player to screen
	const pp = getPosition(world, player);
	const cx = Math.max(1, Math.min(width - 2, pp.x));
	const cy = Math.max(3, Math.min(height - 3, pp.y));
	setPosition(world, player, cx, cy);

	// Update particles with wall bouncing
	for (const eid of particles) {
		applyVelocityToEntity(world, eid, dt);
		const p = getPosition(world, eid);
		const v = getVelocity(world, eid);
		let vx = v.x, vy = v.y;
		if (p.x <= 1 || p.x >= width - 2) vx = -vx;
		if (p.y <= 3 || p.y >= height - 3) vy = -vy;
		setVelocity(world, eid, vx, vy);
		setPosition(world, eid, Math.max(1, Math.min(width - 2, p.x)), Math.max(3, Math.min(height - 3, p.y)));
	}
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Movement System Demo') + '\n');
	const pv = getVelocity(world, player);
	const spd = getSpeed(world, player);
	out.push(`  Vel: (${pv.x.toFixed(1)}, ${pv.y.toFixed(1)})  Speed: ${spd.toFixed(1)}  Friction: ${useFriction ? '\x1b[32mON\x1b[0m' : '\x1b[31mOFF\x1b[0m'}\n`);

	// Draw particles
	for (let i = 0; i < particles.length; i++) {
		const p = getPosition(world, particles[i]!);
		out.push(moveTo(Math.round(p.y), Math.round(p.x)) + `\x1b[3${i + 1}m${chars[i + 1]}\x1b[0m`);
	}

	// Draw player
	const pp = getPosition(world, player);
	out.push(moveTo(Math.round(pp.y), Math.round(pp.x)) + '\x1b[1;33m@\x1b[0m');

	out.push(moveTo(height, 1) + formatHelpBar('[Arrows] Accelerate  [Space] Friction  [s] Stop  [r] Reset  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { stop(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
const stop = startLoop(() => { update(); render(); }, 30);

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const dir = parseArrowKey(data);
	const acc = 30;
	if (dir === 'up') setAcceleration(world, player, getAcceleration(world, player).x, -acc);
	else if (dir === 'down') setAcceleration(world, player, getAcceleration(world, player).x, acc);
	else if (dir === 'left') setAcceleration(world, player, -acc, getAcceleration(world, player).y);
	else if (dir === 'right') setAcceleration(world, player, acc, getAcceleration(world, player).y);
	else setAcceleration(world, player, 0, 0);
	if (ch === ' ') useFriction = !useFriction;
	if (ch === 's') stopEntity(world, player);
	if (ch === 'r') { setPosition(world, player, 40, 12); stopEntity(world, player); }
});
