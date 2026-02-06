#!/usr/bin/env node
/** Text Widget Demo - text display with alignment, styling, and updates.
 * Run: npx tsx examples/demos/text-widget-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { createText } from 'blecsd/widgets';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

const texts = [
	createText(world, addEntity(world) as Entity, { left: 3, top: 4, content: 'Left-aligned text\nDefault styling', fg: '#ffffff' }),
	createText(world, addEntity(world) as Entity, { left: 3, top: 8, content: 'Centered text\nWith cyan color', align: 'center', fg: '#5cc8ff', width: 40 }),
	createText(world, addEntity(world) as Entity, { left: 3, top: 12, content: 'Right-aligned\nWith green color', align: 'right', fg: '#8bff7a', width: 40 }),
	createText(world, addEntity(world) as Entity, { left: 50, top: 4, content: 'Custom BG color\nYellow on dark', fg: '#ffcc00', bg: '#1a1a2e' }),
];
const labels = ['Left', 'Center', 'Right', 'Custom BG'];
let sel = 0, counter = 0;

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mText Widget Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mMultiple text widgets with different alignments\x1b[0m');
	for (let i = 0; i < texts.length; i++) {
		const t = texts[i]!;
		const marker = i === sel ? '\x1b[33m>> ' : '\x1b[90m   ';
		const content = t.getContent();
		const lines = content.split('\n');
		const row = i < 3 ? 4 + i * 4 : 4;
		const col = i < 3 ? 3 : 50;
		stdout.write(`\x1b[${row - 1};${col}H${marker}${labels[i]}\x1b[0m`);
		for (let j = 0; j < lines.length; j++) stdout.write(`\x1b[${row + j};${col + 3}H\x1b[37m${lines[j]}\x1b[0m`);
	}
	stdout.write(`\x1b[${Math.min(height - 2, 18)};1H\x1b[33m[Tab] Select  [Space] Update content  [q] Quit\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 1, 19)};1H\x1b[90mSelected: ${labels[sel]} | Updates: ${counter}\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\t') sel = (sel + 1) % texts.length;
	if (key === ' ') { counter++; texts[sel]!.setContent(`Updated #${counter}\n${labels[sel]} widget`); }
	render();
});
