#!/usr/bin/env node
/** VirtualViewport Demo - virtual viewport for large datasets.
 * Run: npx tsx examples/demos/virtual-viewport-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { setVirtualViewport, scrollToLine, scrollByLines, getVisibleRange } from '../../src/components/virtualViewport';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Generate large dataset
const totalLines = 500;
const lines: string[] = [];
for (let i = 0; i < totalLines; i++) {
	if (i % 50 === 0) lines.push(`=== Section ${Math.floor(i / 50) + 1} ===`);
	else lines.push(`  Line ${i.toString().padStart(3, '0')}: ${'*'.repeat((i * 7) % 40 + 5)}`);
}

const viewH = termH - 7;
const vp = addEntity(world) as Entity;
setVirtualViewport(world, vp, { totalLineCount: totalLines, visibleLineCount: viewH, overscanBefore: 3, overscanAfter: 3 });

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mVirtualViewport Demo\x1b[0m');
	const range = getVisibleRange(world, vp);
	if (!range) return;
	stdout.write(`\x1b[2;3H\x1b[90m${totalLines} items | Visible: ${range.start}-${range.end} | Overscan: ${range.overscanStart}-${range.overscanEnd}\x1b[0m`);
	// Render visible lines
	for (let i = 0; i < viewH; i++) {
		const idx = range.start + i;
		if (idx >= totalLines) break;
		const line = (lines[idx] ?? '').substring(0, termW - 6);
		const isSection = line.startsWith('===');
		stdout.write(`\x1b[${4 + i};3H${isSection ? '\x1b[1;33m' : '\x1b[37m'}${line}\x1b[0m`);
	}
	// Scrollbar
	const sbX = termW - 1;
	const thumbSz = Math.max(1, Math.round((viewH / totalLines) * viewH));
	const maxS = Math.max(1, totalLines - viewH);
	const thumbY = Math.round((range.start / maxS) * (viewH - thumbSz));
	for (let i = 0; i < viewH; i++) {
		const ch = i >= thumbY && i < thumbY + thumbSz ? '\x1b[43m \x1b[0m' : '\x1b[100m \x1b[0m';
		stdout.write(`\x1b[${4 + i};${sbX}H${ch}`);
	}
	stdout.write(`\x1b[${termH - 1};1H\x1b[33m[Up/Down] Scroll  [PgUp/PgDn] Page  [Home/End] Jump  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') scrollByLines(world, vp, -1);
	if (key === '\x1b[B' || key === 'j') scrollByLines(world, vp, 1);
	if (key === '\x1b[5~') scrollByLines(world, vp, -viewH);
	if (key === '\x1b[6~') scrollByLines(world, vp, viewH);
	if (key === '\x1b[H' || key === 'g') scrollToLine(world, vp, 0);
	if (key === '\x1b[F' || key === 'G') scrollToLine(world, vp, totalLines - viewH);
	render();
});
