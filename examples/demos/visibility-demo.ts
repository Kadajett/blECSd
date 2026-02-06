#!/usr/bin/env node
/** Visibility Demo - show, hide, toggle, and effective visibility.
 * Run: npx tsx examples/demos/visibility-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, setPosition, setVisible, isVisible, show, hide, toggle } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Create 5 entities with positions
const entities: Entity[] = [];
const labels = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
const colors = ['31', '32', '33', '34', '35'];
for (let i = 0; i < 5; i++) {
	const eid = addEntity(world) as Entity;
	setPosition(world, eid, 6 + i * 14, 6);
	setVisible(world, eid, true);
	entities.push(eid);
}
let sel = 0;

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mVisibility Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mToggle visibility on individual entities\x1b[0m');
	// Entity display
	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i]!;
		const vis = isVisible(world, eid);
		const col = 6 + i * 14;
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		stdout.write(`\x1b[5;${col}H${marker}\x1b[${colors[i]}m${labels[i]}\x1b[0m`);
		if (vis) {
			stdout.write(`\x1b[7;${col}H\x1b[${colors[i]}m  [${'#'.repeat(8)}]\x1b[0m`);
			stdout.write(`\x1b[8;${col}H\x1b[${colors[i]}m  [${'#'.repeat(8)}]\x1b[0m`);
		} else {
			stdout.write(`\x1b[7;${col}H\x1b[90m  [  hidden  ]\x1b[0m`);
			stdout.write(`\x1b[8;${col}H\x1b[90m  [  hidden  ]\x1b[0m`);
		}
		stdout.write(`\x1b[9;${col}H  ${vis ? '\x1b[32mvisible' : '\x1b[31mhidden '}\x1b[0m`);
	}
	// Summary
	const visCount = entities.filter((e) => isVisible(world, e)).length;
	stdout.write(`\x1b[12;3H\x1b[90mVisible: ${visCount}/${entities.length}\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 2, 15)};1H\x1b[33m[Left/Right] Select  [Space] Toggle  [s] Show  [h] Hide  [a] Show All  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[C' || key === 'l') sel = (sel + 1) % entities.length;
	if (key === '\x1b[D' || key === 'h') sel = (sel - 1 + entities.length) % entities.length;
	if (key === ' ') toggle(world, entities[sel]!);
	if (key === 's') show(world, entities[sel]!);
	if (key === 'h') hide(world, entities[sel]!);
	if (key === 'a') entities.forEach((e) => show(world, e));
	render();
});
