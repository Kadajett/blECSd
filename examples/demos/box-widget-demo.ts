#!/usr/bin/env node
/** Box Widget Demo - borders, padding, content alignment, focus cycling.
 * Run: npx tsx examples/demos/box-widget-demo.ts | Quit: q or Ctrl+C */
import { addEntity, createWorld } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { createBox } from 'blecsd/widgets';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

const boxes = [
	createBox(world, addEntity(world) as Entity, {
		left: 2, top: 1, width: 30, height: 7,
		content: 'Single Border\nWith padding\nand left align',
		border: { type: 'line', ch: 'single', fg: '#5cc8ff' },
		padding: 1, fg: '#ffffff',
	}),
	createBox(world, addEntity(world) as Entity, {
		left: 35, top: 1, width: 30, height: 7,
		content: 'Double Border\nCentered text\ninside the box',
		border: { type: 'line', ch: 'double', fg: '#ffcc00' },
		padding: 1, align: 'center', fg: '#ffffff',
	}),
	createBox(world, addEntity(world) as Entity, {
		left: 2, top: 10, width: 30, height: 7,
		content: 'Rounded Border\nRight aligned\ncontent here',
		border: { type: 'line', ch: 'rounded', fg: '#ff6b6b' },
		padding: 1, align: 'right', fg: '#ffffff',
	}),
	createBox(world, addEntity(world) as Entity, {
		left: 35, top: 10, width: 30, height: 7,
		content: 'Bold Border\nBold and bright\ncustom bg color',
		border: { type: 'line', ch: 'bold', fg: '#8bff7a' },
		padding: 1, fg: '#ffffff', bg: '#1a1a2e',
	}),
];

let sel = 0, counter = 0;
const labels = ['Single', 'Double', 'Rounded', 'Bold'];

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	for (let i = 0; i < boxes.length; i++) {
		const box = boxes[i]; if (!box) continue;
		const col = i % 2 === 0 ? 2 : 35;
		const row = i < 2 ? 1 : 10;
		const marker = i === sel ? '\x1b[33m>>>' : '\x1b[90m   ';
		stdout.write(`\x1b[${row};${col}H${marker} ${labels[i]} Border\x1b[0m`);
		const lines = box.getContent().split('\n');
		for (let j = 0; j < lines.length; j++) stdout.write(`\x1b[${row + 1 + j};${col + 4}H\x1b[37m${lines[j]}\x1b[0m`);
	}
	const r = Math.min(height - 2, 19);
	stdout.write(`\x1b[${r};1H\x1b[33m[Tab] Switch box  [Space] Update content  [q] Quit\x1b[0m`);
	stdout.write(`\x1b[${r + 1};1H\x1b[90mSelected: ${labels[sel]} | Boxes: ${boxes.length}\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\t') sel = (sel + 1) % boxes.length;
	if (key === ' ') { counter++; boxes[sel]?.setContent(`Updated #${counter}\nBox: ${labels[sel]}\nPress Space again`); }
	render();
});
