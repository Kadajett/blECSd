#!/usr/bin/env node
/** ScrollableBox Widget Demo - box container with built-in scrolling and scrollbar.
 * Run: npx tsx examples/demos/scrollable-box-demo.ts | Quit: q or Ctrl+C */
import { addEntity, createWorld } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { createScrollableBox } from 'blecsd/widgets';

const stdout = process.stdout;
const [width, height] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Generate long document
const contentLines: string[] = [];
for (let i = 0; i < 60; i++) {
	if (i % 10 === 0) contentLines.push(`--- Section ${Math.floor(i / 10) + 1} ---`);
	else contentLines.push(`  Item ${i}: ${'*'.repeat((i * 7) % 30 + 5)}`);
}

const viewH = 15;
const boxW = Math.min(60, width - 6);
const box = createScrollableBox(world, addEntity(world) as Entity, {
	left: 3, top: 4, width: boxW, height: viewH + 2,
	content: contentLines.join('\n'),
	border: { type: 'line', ch: 'rounded', fg: '#5cc8ff' },
	padding: 1, fg: '#ffffff',
	scrollbar: { mode: 'always', fg: '#ffcc00', bg: '#333333' },
	scrollWidth: 55, scrollHeight: contentLines.length, keys: true, mouse: true,
});

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mScrollableBox Widget Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mA box with built-in scroll support\x1b[0m');
	const scroll = box.getScroll();
	const [x, y] = [3, 4];
	// Borders
	stdout.write(`\x1b[${y};${x}H\x1b[36m${'╭'}${'─'.repeat(boxW - 2)}${'╮'}\x1b[0m`);
	for (let i = 0; i < viewH; i++) {
		const line = (contentLines[scroll.y + i] ?? '').substring(0, boxW - 4).padEnd(boxW - 4, ' ');
		stdout.write(`\x1b[${y + 1 + i};${x}H\x1b[36m│\x1b[0m \x1b[37m${line}\x1b[0m \x1b[36m│\x1b[0m`);
	}
	stdout.write(`\x1b[${y + viewH + 1};${x}H\x1b[36m${'╰'}${'─'.repeat(boxW - 2)}${'╯'}\x1b[0m`);
	// Scrollbar
	const sbX = x + boxW - 1;
	const thumbSz = Math.max(1, Math.round((viewH / contentLines.length) * viewH));
	const maxS = Math.max(1, contentLines.length - viewH);
	const thumbY = Math.round((scroll.y / maxS) * (viewH - thumbSz));
	for (let i = 0; i < viewH; i++) {
		const ch = i >= thumbY && i < thumbY + thumbSz ? '\x1b[43m \x1b[0m' : '\x1b[100m \x1b[0m';
		stdout.write(`\x1b[${y + 1 + i};${sbX}H${ch}`);
	}
	const iy = y + viewH + 3;
	stdout.write(`\x1b[${iy};3H\x1b[90mScroll: y=${scroll.y} | ${box.isAtTop() ? 'TOP' : box.isAtBottom() ? 'BOTTOM' : 'middle'} | Lines: ${contentLines.length}\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 1, iy + 2)};1H\x1b[33m[Up/Down] Scroll  [PgUp/PgDn] Page  [Home/End] Jump  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') box.scrollBy(0, -1);
	if (key === '\x1b[B' || key === 'j') box.scrollBy(0, 1);
	if (key === '\x1b[5~') box.scrollBy(0, -viewH);
	if (key === '\x1b[6~') box.scrollBy(0, viewH);
	if (key === '\x1b[H' || key === 'g') box.scrollToTop();
	if (key === '\x1b[F' || key === 'G') box.scrollToBottom();
	render();
});
