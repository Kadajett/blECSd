/**
 * Hit Testing Demo
 *
 * Demonstrates click detection on overlapping elements using point-in-entity tests.
 * Arrow keys to move cursor, Enter to test hit, q to exit.
 *
 * Run: npx tsx examples/demos/hit-testing-demo.ts
 * @module demos/hit-testing
 */
import {
	createWorld, addEntity, addComponent, Position, Dimensions, Interactive,
	setPosition, getPosition, setDimensions, getDimensions, setInteractive,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

const world = createWorld() as World;

const boxes = [
	{ eid: addEntity(world) as Entity, label: 'Panel A', color: 31, x: 8, y: 6, w: 16, h: 8 },
	{ eid: addEntity(world) as Entity, label: 'Panel B', color: 32, x: 18, y: 9, w: 16, h: 8 },
	{ eid: addEntity(world) as Entity, label: 'Panel C', color: 34, x: 28, y: 7, w: 16, h: 6 },
];

for (const box of boxes) {
	addComponent(world, box.eid, Position);
	addComponent(world, box.eid, Dimensions);
	addComponent(world, box.eid, Interactive);
	setPosition(world, box.eid, box.x, box.y);
	setDimensions(world, box.eid, box.w, box.h);
	setInteractive(world, box.eid, { clickable: true, hoverable: true, draggable: false });
}

let cursorX = 20, cursorY = 10;
let hitResults: string[] = [];

function testHit(): void {
	hitResults = [];
	for (const box of boxes) {
		if (cursorX >= box.x && cursorX < box.x + box.w && cursorY >= box.y && cursorY < box.y + box.h) {
			hitResults.push(box.label);
		}
	}
	if (hitResults.length === 0) hitResults.push('(empty space)');
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Hit Testing Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mArrows = cursor  |  Enter = test hit  |  q = quit\x1b[0m');
	out.push(moveTo(3, 3) + `\x1b[90mCursor: (${cursorX}, ${cursorY})\x1b[0m`);

	// Draw boxes
	for (const box of boxes) {
		const hit = hitResults.includes(box.label);
		const border = hit ? `\x1b[1;${box.color};7m` : `\x1b[${box.color}m`;
		for (let y = 0; y < box.h; y++) {
			for (let x = 0; x < box.w; x++) {
				const ch = y === 0 && x === 0 ? '┌' : y === 0 && x === box.w - 1 ? '┐'
					: y === box.h - 1 && x === 0 ? '└' : y === box.h - 1 && x === box.w - 1 ? '┘'
					: y === 0 || y === box.h - 1 ? '─' : x === 0 || x === box.w - 1 ? '│'
					: y === 1 && x > 0 && x <= box.label.length ? box.label[x - 1] : ' ';
				out.push(moveTo(box.y + y, box.x + x) + `${border}${ch}\x1b[0m`);
			}
		}
	}

	// Draw cursor crosshair
	out.push(moveTo(cursorY, cursorX) + '\x1b[1;33;7m+\x1b[0m');
	for (let x = cursorX - 2; x <= cursorX + 2; x++) {
		if (x !== cursorX && x > 0) out.push(moveTo(cursorY, x) + '\x1b[33m-\x1b[0m');
	}
	for (let y = cursorY - 1; y <= cursorY + 1; y++) {
		if (y !== cursorY && y > 0) out.push(moveTo(y, cursorX) + '\x1b[33m|\x1b[0m');
	}

	// Hit results
	out.push(moveTo(19, 3) + '\x1b[1mHit Results:\x1b[0m');
	if (hitResults.length > 0) {
		out.push(moveTo(20, 3) + hitResults.map(r => `\x1b[32m${r}\x1b[0m`).join(', '));
		out.push(moveTo(21, 3) + `\x1b[90m${hitResults.length} element(s) at cursor position\x1b[0m`);
	} else {
		out.push(moveTo(20, 3) + '\x1b[90mPress Enter to test\x1b[0m');
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Arrows] Cursor  [Enter] Test Hit  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const arrow = parseArrowKey(data);
	if (arrow === 'up') cursorY = Math.max(1, cursorY - 1);
	if (arrow === 'down') cursorY = Math.min(30, cursorY + 1);
	if (arrow === 'left') cursorX = Math.max(1, cursorX - 1);
	if (arrow === 'right') cursorX = Math.min(60, cursorX + 1);
	if (ch === '\r') testHit();
	render();
});
