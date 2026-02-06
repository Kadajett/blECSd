#!/usr/bin/env node
/** Dimensions Demo - auto-sizing, percentages, absolute, and mixed dimensions.
 * Run: npx tsx examples/demos/dimensions-demo.ts | Quit: q or Ctrl+C */
import { addEntity, AUTO_DIMENSION, createWorld, decodePercentage, encodePercentage, getDimensions, isPercentage, setDimensions } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Create entities with different dimension modes
const items: { eid: Entity; label: string; w: number; h: number; desc: string }[] = [];
const e1 = addEntity(world) as Entity;
setDimensions(world, e1, 40, 10);
items.push({ eid: e1, label: 'Absolute', w: 40, h: 10, desc: 'width=40, height=10' });

const e2 = addEntity(world) as Entity;
const [pW, pH] = [encodePercentage(50), encodePercentage(30)];
setDimensions(world, e2, pW, pH);
items.push({ eid: e2, label: 'Percentage', w: pW, h: pH, desc: 'width=50%, height=30%' });

const e3 = addEntity(world) as Entity;
setDimensions(world, e3, AUTO_DIMENSION, AUTO_DIMENSION);
items.push({ eid: e3, label: 'Auto', w: AUTO_DIMENSION, h: AUTO_DIMENSION, desc: 'width=auto, height=auto' });

const e4 = addEntity(world) as Entity;
const mW = encodePercentage(75);
setDimensions(world, e4, mW, 5);
items.push({ eid: e4, label: 'Mixed', w: mW, h: 5, desc: 'width=75%, height=5' });

let selected = 0;

function resolve(v: number, total: number): string {
	if (v === AUTO_DIMENSION) return 'auto';
	if (isPercentage(v)) { const p = decodePercentage(v) ?? 0; return `${p}% (=${Math.round(p / 100 * total)}px)`; }
	return `${v}px`;
}

function drawBox(x: number, y: number, w: number, color: string): void {
	const dw = Math.min(w, termW - x - 1);
	stdout.write(`\x1b[${y};${x}H${color}${'#'.repeat(dw)}\x1b[0m`);
	stdout.write(`\x1b[${y + 1};${x}H${color}#${' '.repeat(Math.max(0, dw - 2))}#\x1b[0m`);
	stdout.write(`\x1b[${y + 2};${x}H${color}${'#'.repeat(dw)}\x1b[0m`);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mDimensions Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90mTerminal: ${termW}x${termH} | Auto, percentages, absolute sizes\x1b[0m`);
	const colors = ['\x1b[36m', '\x1b[33m', '\x1b[32m', '\x1b[35m'];
	let row = 4;
	for (let i = 0; i < items.length; i++) {
		const e = items[i]; if (!e) continue;
		const dims = getDimensions(world, e.eid);
		const marker = i === selected ? '\x1b[33m>>> ' : '    ';
		const color = colors[i] ?? '\x1b[37m';
		stdout.write(`\x1b[${row};3H${marker}${color}\x1b[1m${e.label}\x1b[0m  \x1b[90m${e.desc}\x1b[0m`);
		stdout.write(`\x1b[${row + 1};7H\x1b[90mStored: w=${dims?.width ?? '?'} h=${dims?.height ?? '?'}\x1b[0m`);
		stdout.write(`\x1b[${row + 1};40H\x1b[32mw=${resolve(e.w, termW)} h=${resolve(e.h, termH)}\x1b[0m`);
		const vw = isPercentage(e.w) ? Math.round(((decodePercentage(e.w) ?? 50) / 100) * (termW - 10)) : Math.min(e.w === AUTO_DIMENSION ? 20 : e.w, termW - 10);
		drawBox(7, row + 2, Math.min(vw, termW - 10), color);
		row += 6;
	}
	stdout.write(`\x1b[${row};3H\x1b[90mencodePercentage(50)=${encodePercentage(50)} | AUTO_DIMENSION=${AUTO_DIMENSION}\x1b[0m`);
	stdout.write(`\x1b[${Math.min(termH - 1, row + 2)};1H\x1b[33m[Up/Down] Select  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') selected = Math.max(0, selected - 1);
	if (key === '\x1b[B' || key === 'j') selected = Math.min(items.length - 1, selected + 1);
	render();
});
