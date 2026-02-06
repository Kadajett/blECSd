/**
 * Screen Entity Demo
 *
 * Demonstrates screen component and entity for managing terminal viewport.
 * Resize terminal to see updates, Tab to cycle info, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/screen-entity-demo.ts
 * @module demos/screen-entity
 */
import {
	createWorld, createScreenEntity, addEntity, addComponent,
	Position, Dimensions, setPosition, setDimensions, getPosition, getDimensions,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, horizontalRule } from './demo-utils';

const world = createWorld() as World;
const screenEid = createScreenEntity(world, {
	width: process.stdout.columns ?? 80,
	height: process.stdout.rows ?? 24,
	title: 'blECSd Screen Demo',
});

// Create child entities positioned relative to screen
const children = [
	{ eid: addEntity(world) as Entity, label: 'Header', rel: 'top' },
	{ eid: addEntity(world) as Entity, label: 'Sidebar', rel: 'left' },
	{ eid: addEntity(world) as Entity, label: 'Content', rel: 'center' },
	{ eid: addEntity(world) as Entity, label: 'Footer', rel: 'bottom' },
];

for (const child of children) {
	addComponent(world, child.eid, Position);
	addComponent(world, child.eid, Dimensions);
}

function layoutChildren(): void {
	const { width, height } = getTerminalSize();
	setPosition(world, children[0]!.eid, 1, 5); setDimensions(world, children[0]!.eid, width - 2, 3);
	setPosition(world, children[1]!.eid, 1, 8); setDimensions(world, children[1]!.eid, 20, height - 12);
	setPosition(world, children[2]!.eid, 22, 8); setDimensions(world, children[2]!.eid, width - 24, height - 12);
	setPosition(world, children[3]!.eid, 1, height - 3); setDimensions(world, children[3]!.eid, width - 2, 2);
}

function drawBox(out: string[], label: string, x: number, y: number, w: number, h: number, color: string): void {
	if (w < 3 || h < 3) return;
	out.push(moveTo(y, x) + `${color}┌${'─'.repeat(w - 2)}┐\x1b[0m`);
	for (let r = 1; r < h - 1; r++) {
		const text = r === 1 ? ` ${label}`.padEnd(w - 2).slice(0, w - 2) : ' '.repeat(w - 2);
		out.push(moveTo(y + r, x) + `${color}│\x1b[0m${text}${color}│\x1b[0m`);
	}
	out.push(moveTo(y + h - 1, x) + `${color}└${'─'.repeat(w - 2)}┘\x1b[0m`);
}

function render(): void {
	const { width, height } = getTerminalSize();
	layoutChildren();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Screen Entity Demo'));
	out.push(moveTo(2, 3) + `\x1b[90mScreen: ${width}x${height}  |  Entity: ${screenEid}  |  Children: ${children.length}\x1b[0m`);
	out.push(moveTo(3, 3) + '\x1b[90mResize terminal to see layout update  |  q = quit\x1b[0m');

	const colors = ['\x1b[36m', '\x1b[33m', '\x1b[32m', '\x1b[35m'];
	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const pos = getPosition(world, child.eid);
		const dim = getDimensions(world, child.eid);
		if (!pos || !dim) continue;
		drawBox(out, child.label, pos.x, pos.y, dim.width, dim.height, colors[i]!);
	}

	// Info panel inside content area
	const content = children[2]!;
	const cPos = getPosition(world, content.eid);
	const cDim = getDimensions(world, content.eid);
	if (cPos && cDim && cDim.width > 10) {
		const infoX = cPos.x + 2;
		const infoY = cPos.y + 2;
		out.push(moveTo(infoY, infoX) + `Screen entity: ${screenEid}`);
		out.push(moveTo(infoY + 1, infoX) + `Terminal: ${width} cols x ${height} rows`);
		out.push(moveTo(infoY + 2, infoX) + `Children: ${children.map(c => c.label).join(', ')}`);
		out.push(moveTo(infoY + 3, infoX) + 'Layout: auto-sized to terminal');
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Resize] Update  [q] Quit', `${width}x${height}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
process.stdout.on('resize', render);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	render();
});
