/**
 * Padding Demo
 *
 * Demonstrates elements with various padding values.
 * Shows how padding affects content area inside bordered boxes.
 *
 * Run: npx tsx examples/demos/padding-demo.ts
 * @module demos/padding
 */
import { createWorld, addEntity, addComponent, Position, setPosition, Dimensions, setDimensions, Padding, setPadding, setPaddingAll, setPaddingHV, getPadding, getHorizontalPadding, getVerticalPadding, hasPaddingValue, Content, setContent, getContent } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();

// Create boxes with different padding configurations
interface BoxInfo { eid: number; label: string; desc: string }
const boxes: BoxInfo[] = [];

function makeBox(x: number, y: number, w: number, h: number, label: string, desc: string): BoxInfo {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Padding);
	addComponent(world, eid, Content);
	setPosition(world, eid, x, y);
	setDimensions(world, eid, w, h);
	setContent(world, eid, 'Hello');
	const info = { eid, label, desc };
	boxes.push(info);
	return info;
}

// No padding
makeBox(2, 3, 16, 5, 'None', 'padding: 0');

// Uniform padding
const b1 = makeBox(20, 3, 16, 7, 'All: 1', 'paddingAll(1)');
setPaddingAll(world, b1.eid, 1);

// Horizontal/Vertical
const b2 = makeBox(38, 3, 20, 7, 'H:2 V:1', 'paddingHV(2,1)');
setPaddingHV(world, b2.eid, 2, 1);

// Individual sides
const b3 = makeBox(2, 12, 20, 8, 'Custom', 'T:0 R:3 B:1 L:1');
setPadding(world, b3.eid, { top: 0, right: 3, bottom: 1, left: 1 });

// Large padding
const b4 = makeBox(24, 12, 22, 9, 'Large', 'All: 3');
setPaddingAll(world, b4.eid, 3);

let selected = 0;

function renderBox(out: string[], box: BoxInfo, isSel: boolean): void {
	const pos = { x: Position.x[box.eid]!, y: Position.y[box.eid]! };
	const dim = { w: Dimensions.width[box.eid]!, h: Dimensions.height[box.eid]! };
	const pad = getPadding(world, box.eid);
	const border = isSel ? '\x1b[1;33m' : '\x1b[90m';
	const content = getContent(world, box.eid);

	// Draw border
	out.push(moveTo(pos.y, pos.x) + `${border}\u250c${'\u2500'.repeat(dim.w - 2)}\u2510\x1b[0m`);
	for (let dy = 1; dy < dim.h - 1; dy++) {
		out.push(moveTo(pos.y + dy, pos.x) + `${border}\u2502\x1b[0m`);
		// Fill interior showing padding areas
		for (let dx = 1; dx < dim.w - 1; dx++) {
			const inPadTop = dy - 1 < pad.top;
			const inPadBottom = dy > dim.h - 2 - pad.bottom;
			const inPadLeft = dx - 1 < pad.left;
			const inPadRight = dx > dim.w - 2 - pad.right;
			const inPad = inPadTop || inPadBottom || inPadLeft || inPadRight;
			if (inPad) out.push('\x1b[46m\u00b7\x1b[0m');
			else {
				const cy = dy - 1 - pad.top;
				const cx = dx - 1 - pad.left;
				out.push(cy === 0 && cx < content.length ? content[cx]! : ' ');
			}
		}
		out.push(`${border}\u2502\x1b[0m`);
	}
	out.push(moveTo(pos.y + dim.h - 1, pos.x) + `${border}\u2514${'\u2500'.repeat(dim.w - 2)}\u2518\x1b[0m`);

	// Label
	out.push(moveTo(pos.y - 1, pos.x) + `\x1b[1m${box.label}\x1b[0m \x1b[90m${box.desc}\x1b[0m`);
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Padding Demo') + '\n');
	out.push('  \x1b[46m\u00b7\x1b[0m = padding area  |  Content rendered inside padding\n');

	for (let i = 0; i < boxes.length; i++) renderBox(out, boxes[i]!, i === selected);

	const box = boxes[selected]!;
	const pad = getPadding(world, box.eid);
	const hpad = getHorizontalPadding(world, box.eid);
	const vpad = getVerticalPadding(world, box.eid);
	out.push(moveTo(height - 2, 2) + `\x1b[1mSelected:\x1b[0m ${box.label}  T:${pad.top} R:${pad.right} B:${pad.bottom} L:${pad.left}  H:${hpad} V:${vpad}  hasPad:${hasPaddingValue(world, box.eid)}`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Select box  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	if (data.toString() === '\t') selected = (selected + 1) % boxes.length;
	render();
});
