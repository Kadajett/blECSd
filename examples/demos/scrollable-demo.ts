#!/usr/bin/env node
/** Scrollable Demo - keyboard scrolling with position tracking and scrollbar.
 * Run: npx tsx examples/demos/scrollable-demo.ts | Quit: q or Ctrl+C */
import { addEntity, canScroll, createWorld, getScroll, getScrollPercentage, isAtBottom, isAtTop, scrollBy, scrollToBottom, scrollToTop, setScrollable } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const [width, height] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;
const eid = addEntity(world) as Entity;

// Viewport: 15 lines, content: 50 lines
const viewH = 15;
const contentH = 50;
setScrollable(world, eid, { scrollX: 0, scrollY: 0, scrollWidth: width - 10, scrollHeight: contentH, viewportWidth: width - 10, viewportHeight: viewH });

const lines: string[] = [];
for (let i = 0; i < contentH; i++) lines.push(`Line ${String(i + 1).padStart(3, ' ')} | ${'#'.repeat(Math.floor(Math.random() * 30) + 5)}`);

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mScrollable Content Demo\x1b[0m');
	const pos = getScroll(world, eid);
	const pct = getScrollPercentage(world, eid);
	const top = isAtTop(world, eid), bot = isAtBottom(world, eid);
	stdout.write(`\x1b[2;3H\x1b[90mScroll: y=${pos.y} | ${Math.round(pct.y)}% | ${top ? 'TOP' : bot ? 'BOTTOM' : 'middle'} | scrollable=${canScroll(world, eid)}\x1b[0m`);
	// Viewport borders
	const [vx, vy] = [3, 4];
	stdout.write(`\x1b[${vy};${vx}H\x1b[36m${'='.repeat(width - 8)}\x1b[0m`);
	stdout.write(`\x1b[${vy + viewH + 1};${vx}H\x1b[36m${'='.repeat(width - 8)}\x1b[0m`);
	// Visible lines
	for (let i = 0; i < viewH; i++) {
		const line = (lines[pos.y + i] ?? '').substring(0, width - 12);
		stdout.write(`\x1b[${vy + 1 + i};${vx}H\x1b[37m${line}\x1b[0m`);
	}
	// Scrollbar
	const sbX = width - 4;
	const thumbSz = Math.max(1, Math.round((viewH / contentH) * viewH));
	const thumbY = Math.round((pos.y / Math.max(1, contentH - viewH)) * (viewH - thumbSz));
	for (let i = 0; i < viewH; i++) {
		const ch = i >= thumbY && i < thumbY + thumbSz ? '\x1b[46m \x1b[0m' : '\x1b[100m \x1b[0m';
		stdout.write(`\x1b[${vy + 1 + i};${sbX}H${ch}`);
	}
	stdout.write(`\x1b[${Math.min(height - 1, vy + viewH + 3)};1H\x1b[33m[Up/Down] Scroll  [PgUp/PgDn] Page  [Home/End] Jump  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') scrollBy(world, eid, 0, -1);
	if (key === '\x1b[B' || key === 'j') scrollBy(world, eid, 0, 1);
	if (key === '\x1b[5~') scrollBy(world, eid, 0, -viewH);
	if (key === '\x1b[6~') scrollBy(world, eid, 0, viewH);
	if (key === '\x1b[H' || key === 'g') scrollToTop(world, eid);
	if (key === '\x1b[F' || key === 'G') scrollToBottom(world, eid);
	render();
});
