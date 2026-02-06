/**
 * Virtualized Render Demo
 *
 * Demonstrates virtualized rendering where only visible entities
 * are rendered, efficiently handling large numbers of off-screen entities.
 *
 * Run: npx tsx examples/demos/virtualized-render-demo.ts
 * @module demos/virtualized-render
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, getPosition,
	Dimensions, setDimensions,
	Renderable, setStyle,
	Content, setContent, getContent,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, parseNavKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();

// Create a large virtual world with many entities
const TOTAL = 500;
const WORLD_W = 200;
const WORLD_H = 100;
const entities: number[] = [];
const chars = '\u2588\u2593\u2592\u2591\u00b7*+#@%';
const colors = ['31', '32', '33', '34', '35', '36', '91', '92', '93', '94'];

for (let i = 0; i < TOTAL; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Content);
	setPosition(world, eid, Math.random() * WORLD_W | 0, Math.random() * WORLD_H | 0);
	setDimensions(world, eid, 1, 1);
	setStyle(world, eid, { fg: 0xffffffff });
	setContent(world, eid, chars[i % chars.length]!);
	entities.push(eid);
}

// Camera/viewport
let camX = 0;
let camY = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const viewW = width - 2;
	const viewH = height - 6;
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Virtualized Render Demo') + '\n');

	// Cull: find entities in viewport
	let visible = 0;
	let culled = 0;
	const visibleEntities: Array<{ eid: number; sx: number; sy: number }> = [];

	for (const eid of entities) {
		const pos = getPosition(world, eid);
		const sx = pos.x - camX;
		const sy = pos.y - camY;
		if (sx >= 0 && sx < viewW && sy >= 0 && sy < viewH) {
			visible++;
			visibleEntities.push({ eid, sx, sy });
		} else {
			culled++;
		}
	}

	out.push(`  Entities: \x1b[36m${TOTAL}\x1b[0m  Visible: \x1b[32m${visible}\x1b[0m  Culled: \x1b[90m${culled}\x1b[0m  Camera: (${camX}, ${camY})\n`);
	out.push(`  World: ${WORLD_W}x${WORLD_H}  Viewport: ${viewW}x${viewH}\n`);

	// Render visible entities only
	for (const { eid, sx, sy } of visibleEntities) {
		const ch = getContent(world, eid);
		const colorIdx = eid % colors.length;
		out.push(moveTo(sy + 5, sx + 1) + `\x1b[${colors[colorIdx]}m${ch}\x1b[0m`);
	}

	// Draw viewport border indicator
	out.push(moveTo(4, 1) + '\x1b[90m' + '\u2500'.repeat(viewW) + '\x1b[0m');
	out.push(moveTo(4 + viewH + 1, 1) + '\x1b[90m' + '\u2500'.repeat(viewW) + '\x1b[0m');

	// Minimap
	const mmW = 20;
	const mmH = 5;
	const mmX = width - mmW - 2;
	out.push(moveTo(2, mmX) + '\x1b[90mMinimap:\x1b[0m');
	for (let y = 0; y < mmH; y++) {
		out.push(moveTo(3 + y, mmX));
		for (let x = 0; x < mmW; x++) {
			const wx = (x / mmW) * WORLD_W;
			const wy = (y / mmH) * WORLD_H;
			const inView = wx >= camX && wx < camX + viewW && wy >= camY && wy < camY + viewH;
			out.push(inView ? '\x1b[42m \x1b[0m' : '\x1b[100m \x1b[0m');
		}
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Arrows] Pan  [PgUp/PgDn] Fast  [Home] Reset  [q] Quit', `Rendering ${visible}/${TOTAL}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const dir = parseArrowKey(data);
	const nav = parseNavKey(data);
	if (dir === 'up') camY = Math.max(0, camY - 1);
	if (dir === 'down') camY = Math.min(WORLD_H - 10, camY + 1);
	if (dir === 'left') camX = Math.max(0, camX - 2);
	if (dir === 'right') camX = Math.min(WORLD_W - 20, camX + 2);
	if (nav === 'pageup') camY = Math.max(0, camY - 10);
	if (nav === 'pagedown') camY = Math.min(WORLD_H - 10, camY + 10);
	if (nav === 'home') { camX = 0; camY = 0; }
	render();
});
