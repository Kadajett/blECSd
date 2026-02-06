#!/usr/bin/env node
/** Element Clipping Demo - overflow modes and clip regions.
 * Run: npx tsx examples/demos/element-clipping-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, setPosition } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { setOverflow, Overflow, getClipRect, isPointVisible } from '../../src/core/clipping';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Create containers with different overflow modes
const containers = [
	{ eid: addEntity(world) as Entity, label: 'HIDDEN', mode: Overflow.HIDDEN, color: '31' },
	{ eid: addEntity(world) as Entity, label: 'VISIBLE', mode: Overflow.VISIBLE, color: '32' },
	{ eid: addEntity(world) as Entity, label: 'SCROLL', mode: Overflow.SCROLL, color: '33' },
];
for (const c of containers) { setPosition(world, c.eid, 0, 0); setOverflow(world, c.eid, c.mode); }
let sel = 0, offX = 0;

function drawBox(x: number, y: number, w: number, h: number, color: string, label: string): void {
	stdout.write(`\x1b[${y};${x}H\x1b[${color}m+${'-'.repeat(w - 2)}+\x1b[0m`);
	for (let r = 1; r < h - 1; r++) stdout.write(`\x1b[${y + r};${x}H\x1b[${color}m|${' '.repeat(w - 2)}|\x1b[0m`);
	stdout.write(`\x1b[${y + h - 1};${x}H\x1b[${color}m+${'-'.repeat(w - 2)}+\x1b[0m`);
	stdout.write(`\x1b[${y};${x + 2}H\x1b[${color}m ${label} \x1b[0m`);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mElement Clipping Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mOverflow modes: HIDDEN clips, VISIBLE shows all, SCROLL clips+scrolls\x1b[0m');
	const boxW = 22, boxH = 8;
	for (let i = 0; i < containers.length; i++) {
		const c = containers[i]!;
		const bx = 3 + i * (boxW + 3), by = 5;
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		stdout.write(`\x1b[4;${bx}H${marker}\x1b[${c.color}m${c.label}\x1b[0m`);
		drawBox(bx, by, boxW, boxH, c.color, c.label);
		// Content that exceeds box bounds
		const content = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const clipR = { x: bx + 1, y: by + 1, width: boxW - 2, height: boxH - 2 };
		for (let j = 0; j < 3; j++) {
			const textX = bx + 2 + offX, textY = by + 2 + j * 2;
			for (let k = 0; k < content.length; k++) {
				const px = textX + k, py = textY;
				const inBounds = c.mode === Overflow.VISIBLE || isPointVisible(clipR, px - bx, py - by);
				if (inBounds && px > 0 && px <= termW && py > 0 && py < termH - 2)
					stdout.write(`\x1b[${py};${px}H\x1b[${c.color}m${content[k]}\x1b[0m`);
			}
		}
	}
	const r = Math.min(termH - 1, 16);
	stdout.write(`\x1b[${r};3H\x1b[90mOffset: ${offX} | Mode: ${containers[sel]!.label}\x1b[0m`);
	stdout.write(`\x1b[${r + 1};1H\x1b[33m[Tab] Select  [Left/Right] Slide content  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\t') sel = (sel + 1) % containers.length;
	if (key === '\x1b[C' || key === 'l') offX++;
	if (key === '\x1b[D' || key === 'h') offX--;
	render();
});
