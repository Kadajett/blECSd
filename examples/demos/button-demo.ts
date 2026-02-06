/**
 * Button Widget Demo
 *
 * Demonstrates button creation with hover/press states and callbacks.
 * Uses createButtonEntity, attachButtonBehavior, onButtonPress, and pressButton.
 * Tab to switch focus, Enter/Space to press, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/button-demo.ts
 * @module demos/button
 */

import {
	createWorld, addEntity,
	createButtonEntity, attachButtonBehavior, onButtonPress, pressButton,
	getButtonState,
} from 'blecsd';
import type { ButtonState } from 'blecsd';

const world = createWorld();

const buttons = [
	{ label: 'OK',     x: 4,  y: 6, count: 0, eid: 0 },
	{ label: 'Cancel', x: 16, y: 6, count: 0, eid: 0 },
	{ label: 'Help',   x: 30, y: 6, count: 0, eid: 0 },
];

let focusIdx = 0;
let lastPressed = '(none)';

// Create button entities
for (const btn of buttons) {
	const eid = createButtonEntity(world, { label: btn.label, x: btn.x, y: btn.y, width: 10, height: 3 });
	btn.eid = eid;
	attachButtonBehavior(world, eid);
	onButtonPress(eid, () => {
		btn.count++;
		lastPressed = btn.label;
	});
}

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  Button Widget Demo\x1b[0m\n');
	out.push('  Tab = focus next  |  Enter/Space = press  |  q = quit\n');
	out.push('  ──────────────────────────────────────────────────────\n\n');

	for (let i = 0; i < buttons.length; i++) {
		const btn = buttons[i];
		const focused = i === focusIdx;
		const border = focused ? '\x1b[1;33m' : '\x1b[0m';
		const label = btn.label.padStart(Math.floor((8 + btn.label.length) / 2)).padEnd(8);

		out.push(`  ${border}┌──────────┐\x1b[0m\n`);
		out.push(`  ${border}│\x1b[0m ${label} ${border}│\x1b[0m\n`);
		out.push(`  ${border}└──────────┘\x1b[0m  pressed: ${btn.count}\n\n`);
	}

	out.push(`\n  Last pressed: \x1b[32m${lastPressed}\x1b[0m\n`);
	out.push(`  Focused: \x1b[33m${buttons[focusIdx].label}\x1b[0m\n`);

	process.stdout.write(out.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }

		if (ch === '\t') {
			focusIdx = (focusIdx + 1) % buttons.length;
		} else if (ch === '\r' || ch === ' ') {
			pressButton(world, buttons[focusIdx].eid);
		}
		render();
	});
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
