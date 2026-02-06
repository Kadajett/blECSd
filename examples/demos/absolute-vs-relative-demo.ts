#!/usr/bin/env node
/** Absolute vs Relative Demo - positioning modes comparison.
 * Run: npx tsx examples/demos/absolute-vs-relative-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, setPosition, getPosition, setAbsolute, isAbsolute, moveBy, appendChild } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Parent at (10,8)
const parent = addEntity(world) as Entity;
setPosition(world, parent, 10, 8);
// Relative child at (5,2) from parent => effective (15,10)
const relChild = addEntity(world) as Entity;
setPosition(world, relChild, 5, 2);
appendChild(world, parent, relChild);
// Absolute child at (40,8) regardless of parent
const absChild = addEntity(world) as Entity;
setPosition(world, absChild, 40, 8);
setAbsolute(world, absChild, true);
appendChild(world, parent, absChild);

const items = [
	{ eid: parent, label: 'Parent', color: '36' },
	{ eid: relChild, label: 'Relative Child', color: '32' },
	{ eid: absChild, label: 'Absolute Child', color: '33' },
];
let sel = 0;

function drawEntity(eid: Entity, ch: string, color: string): void {
	const pos = getPosition(world, eid); if (!pos) return;
	// Compute effective position
	let ex = pos.x, ey = pos.y;
	if (!isAbsolute(world, eid)) {
		const pPos = getPosition(world, parent);
		if (pPos) { ex += pPos.x; ey += pPos.y; }
	}
	if (ex >= 0 && ex < termW && ey >= 0 && ey < termH - 2)
		for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 3; dy++)
			stdout.write(`\x1b[${ey + dy};${ex + dx}H\x1b[${color}m${ch}\x1b[0m`);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mAbsolute vs Relative Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mRelative children move with parent, absolute children stay fixed\x1b[0m');
	// Draw entities
	drawEntity(parent, '#', '46;30');
	drawEntity(relChild, 'R', '42;30');
	drawEntity(absChild, 'A', '43;30');
	// Info panel
	for (let i = 0; i < items.length; i++) {
		const it = items[i]!;
		const pos = getPosition(world, it.eid);
		const abs = isAbsolute(world, it.eid);
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		const r = termH - 8 + i;
		stdout.write(`\x1b[${r};3H${marker}\x1b[${it.color}m${it.label.padEnd(16)}\x1b[0m`);
		stdout.write(`\x1b[${r};22H\x1b[90mpos:(${pos?.x.toFixed(0)},${pos?.y.toFixed(0)}) ${abs ? 'ABSOLUTE' : 'RELATIVE'}\x1b[0m`);
	}
	stdout.write(`\x1b[${termH - 4};3H\x1b[90mLegend: \x1b[46m # \x1b[0m\x1b[90m Parent  \x1b[42m R \x1b[0m\x1b[90m Relative  \x1b[43m A \x1b[0m\x1b[90m Absolute\x1b[0m`);
	stdout.write(`\x1b[${termH - 1};1H\x1b[33m[Tab] Select  [Arrows] Move  [t] Toggle abs/rel  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\t') sel = (sel + 1) % items.length;
	const eid = items[sel]!.eid;
	if (key === '\x1b[A') moveBy(world, eid, 0, -1);
	if (key === '\x1b[B') moveBy(world, eid, 0, 1);
	if (key === '\x1b[D') moveBy(world, eid, -1, 0);
	if (key === '\x1b[C') moveBy(world, eid, 1, 0);
	if (key === 't') setAbsolute(world, eid, !isAbsolute(world, eid));
	render();
});
