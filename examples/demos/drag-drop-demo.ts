/**
 * Drag & Drop Demo
 *
 * Demonstrates draggable elements with keyboard-based movement.
 * Tab to select, arrows to drag, space to pick up/drop, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/drag-drop-demo.ts
 * @module demos/drag-drop
 */
import {
	createWorld, addEntity, addComponent, Position, Dimensions, Interactive,
	setPosition, getPosition, setDimensions, setInteractive, setDraggable,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

const world = createWorld() as World;

const items = [
	{ eid: addEntity(world) as Entity, label: 'Box A', color: 31, w: 10, h: 4 },
	{ eid: addEntity(world) as Entity, label: 'Box B', color: 32, w: 10, h: 4 },
	{ eid: addEntity(world) as Entity, label: 'Box C', color: 34, w: 10, h: 4 },
];

for (let i = 0; i < items.length; i++) {
	const item = items[i]!;
	addComponent(world, item.eid, Position);
	addComponent(world, item.eid, Dimensions);
	addComponent(world, item.eid, Interactive);
	setPosition(world, item.eid, 5 + i * 15, 8);
	setDimensions(world, item.eid, item.w, item.h);
	setInteractive(world, item.eid, { clickable: true, draggable: true, hoverable: true });
}

// Drop zones
const zones = [
	{ x: 5, y: 18, w: 12, h: 3, label: 'Zone 1', color: 90 },
	{ x: 20, y: 18, w: 12, h: 3, label: 'Zone 2', color: 90 },
	{ x: 35, y: 18, w: 12, h: 3, label: 'Zone 3', color: 90 },
];

let selectedIdx = 0;
let dragging = false;
let dropMsg = '';

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Drag & Drop Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = select  |  Space = pick up/drop  |  Arrows = move  |  q = quit\x1b[0m');
	out.push(moveTo(3, 3) + `\x1b[90mDragging: ${dragging ? '\x1b[33mYES\x1b[90m' : 'NO'}\x1b[0m`);

	// Draw drop zones
	for (const zone of zones) {
		out.push(moveTo(zone.y, zone.x) + `\x1b[${zone.color}m┌${'─'.repeat(zone.w - 2)}┐\x1b[0m`);
		out.push(moveTo(zone.y + 1, zone.x) + `\x1b[${zone.color}m│\x1b[0m ${zone.label.padEnd(zone.w - 3)}\x1b[${zone.color}m│\x1b[0m`);
		out.push(moveTo(zone.y + 2, zone.x) + `\x1b[${zone.color}m└${'─'.repeat(zone.w - 2)}┘\x1b[0m`);
	}

	// Draw items
	for (let i = 0; i < items.length; i++) {
		const item = items[i]!;
		const pos = getPosition(world, item.eid);
		if (!pos) continue;
		const selected = i === selectedIdx;
		const border = selected && dragging ? '\x1b[1;33m' : selected ? `\x1b[1;${item.color}m` : `\x1b[${item.color}m`;

		out.push(moveTo(pos.y, pos.x) + `${border}┌${'─'.repeat(item.w - 2)}┐\x1b[0m`);
		for (let r = 1; r < item.h - 1; r++) {
			const content = r === 1 ? ` ${item.label}`.padEnd(item.w - 2) : ' '.repeat(item.w - 2);
			out.push(moveTo(pos.y + r, pos.x) + `${border}│\x1b[0m${content}${border}│\x1b[0m`);
		}
		out.push(moveTo(pos.y + item.h - 1, pos.x) + `${border}└${'─'.repeat(item.w - 2)}┘\x1b[0m`);
		if (selected) out.push(moveTo(pos.y, pos.x - 2) + `${border}▶\x1b[0m`);
	}

	if (dropMsg) out.push(moveTo(22, 4) + `\x1b[32m${dropMsg}\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Select  [Space] Grab/Drop  [Arrows] Move  [q] Quit'));
	process.stdout.write(out.join(''));
}

function checkDrop(): void {
	const item = items[selectedIdx]!;
	const pos = getPosition(world, item.eid);
	if (!pos) return;
	for (const zone of zones) {
		if (pos.x >= zone.x - 2 && pos.x <= zone.x + zone.w && pos.y >= zone.y - 2 && pos.y <= zone.y + zone.h) {
			dropMsg = `${item.label} dropped on ${zone.label}!`;
			return;
		}
	}
	dropMsg = `${item.label} dropped at (${pos.x}, ${pos.y})`;
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') { dragging = false; selectedIdx = (selectedIdx + 1) % items.length; }
	if (ch === ' ') { if (dragging) { checkDrop(); dragging = false; } else { dragging = true; dropMsg = ''; } }
	if (dragging) {
		const pos = getPosition(world, items[selectedIdx]!.eid);
		if (pos) {
			const arrow = parseArrowKey(data);
			if (arrow === 'up') setPosition(world, items[selectedIdx]!.eid, pos.x, Math.max(4, pos.y - 1));
			if (arrow === 'down') setPosition(world, items[selectedIdx]!.eid, pos.x, pos.y + 1);
			if (arrow === 'left') setPosition(world, items[selectedIdx]!.eid, Math.max(1, pos.x - 1), pos.y);
			if (arrow === 'right') setPosition(world, items[selectedIdx]!.eid, pos.x + 1, pos.y);
		}
	}
	render();
});
