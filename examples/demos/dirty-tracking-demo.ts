/**
 * Dirty Tracking Demo
 *
 * Demonstrates dirty tracking and marking entities for redraw.
 * Shows how only changed entities need re-rendering.
 *
 * Run: npx tsx examples/demos/dirty-tracking-demo.ts
 * @module demos/dirty-tracking
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, getPosition,
	Renderable, setStyle, isDirty, markDirty, markClean,
	Dimensions, setDimensions,
	Content, setContent, getContent,
	queryRenderable, filterDirty, filterVisibleDirty,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();

interface BoxInfo { eid: number; name: string; color: string }
const boxes: BoxInfo[] = [];
const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m'];

// Create entities
for (let i = 0; i < 6; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Content);
	setPosition(world, eid, 4 + (i % 3) * 22, 5 + Math.floor(i / 3) * 7);
	setDimensions(world, eid, 18, 5);
	setStyle(world, eid, { fg: 0xffffffff });
	setContent(world, eid, `Box ${i + 1}`);
	boxes.push({ eid, name: `Box ${i + 1}`, color: colors[i]! });
}

let selected = 0;
let renderCount = 0;
let dirtyRenders = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Dirty Tracking Demo') + '\n');

	// Query dirty entities
	const all = queryRenderable(world);
	const dirty = filterDirty(world, all);
	dirtyRenders += dirty.length;
	renderCount++;

	out.push(`  Total: \x1b[36m${all.length}\x1b[0m  Dirty: \x1b[33m${dirty.length}\x1b[0m  Renders: \x1b[90m${renderCount}\x1b[0m  Dirty renders: \x1b[90m${dirtyRenders}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 60)) + '\n');

	// Draw boxes
	for (let i = 0; i < boxes.length; i++) {
		const box = boxes[i]!;
		const pos = getPosition(world, box.eid);
		const dirtyFlag = isDirty(world, box.eid);
		const isSel = i === selected;
		const border = isSel ? '\x1b[1;33m' : '\x1b[90m';
		const status = dirtyFlag ? `${box.color}\u25cf DIRTY\x1b[0m` : '\x1b[90m\u25cb clean\x1b[0m';

		out.push(moveTo(pos.y, pos.x) + `${border}\u250c${'─'.repeat(16)}\u2510\x1b[0m`);
		out.push(moveTo(pos.y + 1, pos.x) + `${border}\u2502\x1b[0m ${box.color}${box.name.padEnd(8)}\x1b[0m ${status} ${border}\u2502\x1b[0m`);
		out.push(moveTo(pos.y + 2, pos.x) + `${border}\u2502\x1b[0m${''.padEnd(16)}${border}\u2502\x1b[0m`);
		out.push(moveTo(pos.y + 3, pos.x) + `${border}\u2502\x1b[0m \x1b[90m${getContent(world, box.eid).padEnd(15)}\x1b[0m${border}\u2502\x1b[0m`);
		out.push(moveTo(pos.y + 4, pos.x) + `${border}\u2514${'─'.repeat(16)}\u2518\x1b[0m`);
	}

	out.push(moveTo(height - 1, 2) + `\x1b[90mPress [d] to dirty selected, [c] to clean, [a] to dirty all, [x] to clean all\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Select  [d] Dirty  [c] Clean  [a/x] All  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') selected = (selected + 1) % boxes.length;
	if (ch === 'd') markDirty(world, boxes[selected]!.eid);
	if (ch === 'c') markClean(world, boxes[selected]!.eid);
	if (ch === 'a') boxes.forEach((b) => markDirty(world, b.eid));
	if (ch === 'x') boxes.forEach((b) => markClean(world, b.eid));
	render();
});
