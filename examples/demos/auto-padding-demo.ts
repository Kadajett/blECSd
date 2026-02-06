#!/usr/bin/env node
/** Auto-Padding Demo - shows how borders trigger automatic padding.
 * Run: npx tsx examples/demos/auto-padding-demo.ts | Quit: q or Ctrl+C */
import { addEntity, createWorld, createScreenEntity, hasBorder, setBorder, BorderType, setPadding, getPadding } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { getAutoPadding, getEffectivePadding } from '../../src/core/autoPadding';

const stdout = process.stdout;
const [width, height] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;
createScreenEntity(world, { width, height, autoPadding: true });

// Entity with border (auto-padding applies)
const eid1 = addEntity(world) as Entity;
setBorder(world, eid1, { type: BorderType.Line, fg: 0x5cc8ffff, bg: 0 });
// Entity with border + explicit padding
const eid2 = addEntity(world) as Entity;
setBorder(world, eid2, { type: BorderType.Line, fg: 0xffcc00ff, bg: 0 });
setPadding(world, eid2, 2, 1, 2, 1);
// Entity without border (no auto-padding)
const eid3 = addEntity(world) as Entity;

function drawInfo(x: number, y: number, w: number, h: number, label: string, entity: Entity, color: string): void {
	const auto = getAutoPadding(world, entity);
	const eff = getEffectivePadding(world, entity);
	const pad = getPadding(world, entity);
	const bord = hasBorder(world, entity);
	stdout.write(`\x1b[${y};${x}H${color}+${'-'.repeat(w - 2)}+\x1b[0m`);
	for (let r = 1; r < h - 1; r++) { stdout.write(`\x1b[${y + r};${x}H${color}|\x1b[0m`); stdout.write(`\x1b[${y + r};${x + w - 1}H${color}|\x1b[0m`); }
	stdout.write(`\x1b[${y + h - 1};${x}H${color}+${'-'.repeat(w - 2)}+\x1b[0m`);
	stdout.write(`\x1b[${y + 1};${x + 2}H\x1b[1m${label}\x1b[0m`);
	stdout.write(`\x1b[${y + 2};${x + 2}H\x1b[90mBorder: ${bord ? 'yes' : 'no'}\x1b[0m`);
	stdout.write(`\x1b[${y + 3};${x + 2}H\x1b[90mAuto-pad: L=${auto.left} T=${auto.top} R=${auto.right} B=${auto.bottom}\x1b[0m`);
	stdout.write(`\x1b[${y + 4};${x + 2}H\x1b[90mExplicit: L=${pad?.left ?? 0} T=${pad?.top ?? 0} R=${pad?.right ?? 0} B=${pad?.bottom ?? 0}\x1b[0m`);
	stdout.write(`\x1b[${y + 5};${x + 2}H\x1b[32mEffective: L=${eff.left} T=${eff.top} R=${eff.right} B=${eff.bottom}\x1b[0m`);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mAuto-Padding Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mBorders trigger automatic 1-cell padding per side\x1b[0m');
	drawInfo(3, 4, 36, 7, 'Border (auto-pad)', eid1, '\x1b[36m');
	drawInfo(42, 4, 36, 7, 'Border + explicit pad', eid2, '\x1b[33m');
	drawInfo(3, 12, 36, 7, 'No border (no auto-pad)', eid3, '\x1b[90m');
	stdout.write('\x1b[13;42H\x1b[37mAuto-padding adds 1 cell on each\x1b[0m');
	stdout.write('\x1b[14;42H\x1b[37mside with a border. Explicit\x1b[0m');
	stdout.write('\x1b[15;42H\x1b[37mpadding stacks on top of it.\x1b[0m');
	stdout.write(`\x1b[${Math.min(height - 1, 21)};1H\x1b[33m[q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
});
