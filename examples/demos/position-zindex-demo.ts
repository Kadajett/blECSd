/**
 * Position & Z-Index Demo
 *
 * Demonstrates overlapping elements with layering via Position and ZOrder.
 * Arrow keys move the selected box, Tab switches selection, +/- changes z-index.
 *
 * Run: npx tsx examples/demos/position-zindex-demo.ts
 * @module demos/position-zindex
 */
import { createWorld, addEntity, addComponent, Position, setPosition, getPosition, ZOrder, setZIndex, getZIndex, Dimensions, setDimensions, Renderable, setStyle, sortByZIndex } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();
const colors = ['\x1b[41m', '\x1b[42m', '\x1b[44m', '\x1b[45m'];
const labels = ['Red', 'Green', 'Blue', 'Magenta'];
const entities: number[] = [];

// Create 4 overlapping boxes
for (let i = 0; i < 4; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, ZOrder);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	setPosition(world, eid, 5 + i * 6, 4 + i * 2);
	setZIndex(world, eid, i);
	setDimensions(world, eid, 14, 5);
	setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
	entities.push(eid);
}

let selected = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Position & Z-Index Demo') + '\n\n');

	// Sort entities by z-index for proper layering
	const sorted = [...entities].sort((a, b) => sortByZIndex(a, b));

	// Render to a simple grid
	const grid: string[][] = Array.from({ length: height - 4 }, () => Array.from({ length: width }, () => ' '));
	const colorGrid: string[][] = Array.from({ length: height - 4 }, () => Array.from({ length: width }, () => '\x1b[0m'));

	for (const eid of sorted) {
		const pos = getPosition(world, eid);
		const z = getZIndex(world, eid);
		const idx = entities.indexOf(eid);
		const color = colors[idx]!;
		const label = `${labels[idx]} z=${z}`;
		const isSel = idx === selected;
		for (let dy = 0; dy < 5; dy++) {
			for (let dx = 0; dx < 14; dx++) {
				const gy = pos.y + dy;
				const gx = pos.x + dx;
				if (gy >= 0 && gy < grid.length && gx >= 0 && gx < width) {
					// Box border
					const isBorder = dy === 0 || dy === 4 || dx === 0 || dx === 13;
					const ch = isBorder ? (isSel ? '\x1b[1;33m#\x1b[0m' : '.') :
						(dy === 2 && dx >= 1 && dx <= label.length) ? label[dx - 1]! : ' ';
					grid[gy]![gx] = ch;
					colorGrid[gy]![gx] = isBorder ? '' : color;
				}
			}
		}
	}

	for (let y = 0; y < Math.min(grid.length, height - 5); y++) {
		let line = '';
		for (let x = 0; x < width; x++) line += colorGrid[y]![x] + grid[y]![x] + '\x1b[0m';
		out.push(line + '\n');
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Arrows] Move  [Tab] Select  [+/-] Z-index  [q] Quit', `Selected: ${labels[selected]}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const dir = parseArrowKey(data);
	const eid = entities[selected]!;
	if (dir === 'up') setPosition(world, eid, getPosition(world, eid).x, getPosition(world, eid).y - 1);
	if (dir === 'down') setPosition(world, eid, getPosition(world, eid).x, getPosition(world, eid).y + 1);
	if (dir === 'left') setPosition(world, eid, getPosition(world, eid).x - 1, getPosition(world, eid).y);
	if (dir === 'right') setPosition(world, eid, getPosition(world, eid).x + 1, getPosition(world, eid).y);
	if (ch === '\t') selected = (selected + 1) % entities.length;
	if (ch === '+' || ch === '=') setZIndex(world, eid, getZIndex(world, eid) + 1);
	if (ch === '-') setZIndex(world, eid, getZIndex(world, eid) - 1);
	render();
});
