/**
 * Entity Factories Demo
 *
 * Demonstrates pre-configured entity creation with factory functions.
 * Factories compose ECS components into reusable archetypes.
 * Press 1-4 to spawn entities, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/entity-factories-demo.ts
 * @module demos/entity-factories
 */
import { createWorld, addEntity, addComponent, Position, Velocity, Renderable, setVelocity, type World, type Entity } from 'blecsd';

const world = createWorld() as World;

// Factory: static label (Position + Renderable, no velocity)
function createLabel(x: number, y: number, fg: number): Entity {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Renderable);
	Position.x[eid] = x;
	Position.y[eid] = y;
	Renderable.fg[eid] = fg;
	Renderable.visible[eid] = 1;
	return eid;
}

// Factory: moving particle (Position + Renderable + Velocity)
function createParticle(x: number, y: number, vx: number, vy: number): Entity {
	const eid = createLabel(x, y, 0x00ff00);
	addComponent(world, eid, Velocity);
	setVelocity(world, eid, vx, vy);
	return eid;
}

// Factory: wall segment (Position + Renderable, gray)
function createWall(x: number, y: number): Entity {
	return createLabel(x, y, 0x888888);
}

// Factory: collectible item (Position + Renderable, yellow + bold)
function createCollectible(x: number, y: number): Entity {
	const eid = createLabel(x, y, 0xffff00);
	Renderable.bold[eid] = 1;
	return eid;
}

interface EntityInfo { eid: Entity; type: string; char: string; count: number }
const spawned: EntityInfo[] = [];
const TYPE_CHARS: Record<string, string> = { Label: 'L', Particle: 'P', Wall: '#', Collectible: '*' };
let spawnCount = 0;

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Entity Factories Demo\x1b[0m\n');
	lines.push('  1 = Label  |  2 = Particle  |  3 = Wall  |  4 = Collectible  |  q = quit\n');
	lines.push('  ──────────────────────────────────────────────────────────────────────────\n\n');

	lines.push('  \x1b[4mFactory Pattern:\x1b[0m\n');
	lines.push('  createLabel(x, y, fg)        -> Position + Renderable\n');
	lines.push('  createParticle(x, y, vx, vy) -> Position + Renderable + Velocity\n');
	lines.push('  createWall(x, y)             -> Position + Renderable (gray)\n');
	lines.push('  createCollectible(x, y)      -> Position + Renderable (bold + yellow)\n\n');

	lines.push(`  \x1b[4mSpawned Entities (${spawned.length}):\x1b[0m\n`);
	const show = spawned.slice(-10);
	for (const info of show) {
		const px = Position.x[info.eid]!;
		const py = Position.y[info.eid]!;
		const vis = Renderable.visible[info.eid] ? 'visible' : 'hidden';
		lines.push(`  #${String(info.count).padStart(3)} [${info.type.padEnd(11)}] pos=(${px.toFixed(0)}, ${py.toFixed(0)}) ${vis}\n`);
	}
	if (spawned.length === 0) lines.push('  \x1b[2m(press 1-4 to spawn entities)\x1b[0m\n');

	// Mini viewport
	lines.push('\n  \x1b[4mViewport:\x1b[0m\n');
	const VW = 40;
	const VH = 6;
	const grid = Array.from({ length: VH }, () => Array.from({ length: VW }, () => ' '));
	for (const info of spawned) {
		const gx = Math.round(Position.x[info.eid]!) % VW;
		const gy = Math.round(Position.y[info.eid]!) % VH;
		if (gx >= 0 && gx < VW && gy >= 0 && gy < VH) grid[gy]![gx] = info.char;
	}
	for (const row of grid) lines.push(`  |${row.join('')}|\n`);

	process.stdout.write(lines.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }
		spawnCount++;
		const rx = Math.floor(Math.random() * 38) + 1;
		const ry = Math.floor(Math.random() * 5);
		if (ch === '1') spawned.push({ eid: createLabel(rx, ry, 0xff0000), type: 'Label', char: 'L', count: spawnCount });
		else if (ch === '2') spawned.push({ eid: createParticle(rx, ry, 1, 0.5), type: 'Particle', char: 'P', count: spawnCount });
		else if (ch === '3') spawned.push({ eid: createWall(rx, ry), type: 'Wall', char: '#', count: spawnCount });
		else if (ch === '4') spawned.push({ eid: createCollectible(rx, ry), type: 'Collectible', char: '*', count: spawnCount });
		render();
	});
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
