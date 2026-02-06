#!/usr/bin/env node
/** Checkbox Demo - toggle on/off with state machine and visual feedback.
 * Run: npx tsx examples/demos/checkbox-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, attachCheckboxBehavior, isChecked, toggleCheckbox, getCheckboxState, onCheckboxChange } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

const items = [
	{ eid: addEntity(world) as Entity, label: 'Enable notifications' },
	{ eid: addEntity(world) as Entity, label: 'Dark mode' },
	{ eid: addEntity(world) as Entity, label: 'Auto-save' },
	{ eid: addEntity(world) as Entity, label: 'Sound effects' },
	{ eid: addEntity(world) as Entity, label: 'Show tooltips' },
];
// Attach checkbox behavior; pre-check items 1 and 2
for (let i = 0; i < items.length; i++) attachCheckboxBehavior(world, items[i]!.eid, i === 1 || i === 2);

const changes: string[] = [];
for (const item of items)
	onCheckboxChange(item.eid, (checked) => {
		changes.push(`${item.label}: ${checked ? 'ON' : 'OFF'}`);
		if (changes.length > 4) changes.shift();
	});
let sel = 0;

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mCheckbox Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mToggle checkboxes with Space, navigate with arrows\x1b[0m');
	for (let i = 0; i < items.length; i++) {
		const item = items[i]!;
		const checked = isChecked(world, item.eid);
		const state = getCheckboxState(world, item.eid) ?? 'unknown';
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		const box = checked ? '\x1b[32m[x]' : '\x1b[90m[ ]';
		stdout.write(`\x1b[${4 + i};5H${marker}${box} \x1b[37m${item.label}\x1b[0m`);
		stdout.write(`\x1b[${4 + i};50H\x1b[90m(${state})\x1b[0m`);
	}
	const checkedCount = items.filter((it) => isChecked(world, it.eid)).length;
	stdout.write(`\x1b[11;5H\x1b[90mChecked: ${checkedCount}/${items.length}\x1b[0m`);
	if (changes.length > 0) {
		stdout.write('\x1b[13;5H\x1b[90mRecent changes:\x1b[0m');
		for (let i = 0; i < changes.length; i++) stdout.write(`\x1b[${14 + i};7H\x1b[90m${changes[i]}\x1b[0m`);
	}
	stdout.write(`\x1b[${Math.min(height - 1, 20)};1H\x1b[33m[Up/Down] Navigate  [Space] Toggle  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') sel = (sel - 1 + items.length) % items.length;
	if (key === '\x1b[B' || key === 'j') sel = (sel + 1) % items.length;
	if (key === ' ') toggleCheckbox(world, items[sel]!.eid);
	render();
});
