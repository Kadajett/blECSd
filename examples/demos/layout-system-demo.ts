/**
 * Layout System Demo
 *
 * Demonstrates layout calculation with nested containers and auto-sizing.
 * Tab to select element, arrows to resize, space to toggle layout, q to exit.
 *
 * Run: npx tsx examples/demos/layout-system-demo.ts
 * @module demos/layout-system
 */
import {
	createWorld, addEntity, addComponent, Position, Dimensions, Border,
	setPosition, setDimensions, getDimensions, setBorder, getPosition,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

const world = createWorld() as World;

type LayoutMode = 'horizontal' | 'vertical' | 'grid';
let layoutMode: LayoutMode = 'horizontal';

const container = { eid: addEntity(world) as Entity, x: 4, y: 6, w: 60, h: 16 };
const children = [
	{ eid: addEntity(world) as Entity, label: 'Panel A', color: 36, flex: 1 },
	{ eid: addEntity(world) as Entity, label: 'Panel B', color: 33, flex: 2 },
	{ eid: addEntity(world) as Entity, label: 'Panel C', color: 32, flex: 1 },
	{ eid: addEntity(world) as Entity, label: 'Panel D', color: 35, flex: 1 },
];

for (const child of [container, ...children]) {
	addComponent(world, child.eid, Position);
	addComponent(world, child.eid, Dimensions);
	addComponent(world, child.eid, Border);
}

let selectedIdx = 0;
let gap = 1;

function computeLayout(): void {
	const totalFlex = children.reduce((s, c) => s + c.flex, 0);
	const totalGap = gap * (children.length - 1);

	if (layoutMode === 'horizontal') {
		const availW = container.w - 2 - totalGap;
		let x = container.x + 1;
		for (const child of children) {
			const w = Math.max(3, Math.floor((child.flex / totalFlex) * availW));
			setPosition(world, child.eid, x, container.y + 1);
			setDimensions(world, child.eid, w, container.h - 2);
			x += w + gap;
		}
	} else if (layoutMode === 'vertical') {
		const availH = container.h - 2 - totalGap;
		let y = container.y + 1;
		for (const child of children) {
			const h = Math.max(2, Math.floor((child.flex / totalFlex) * availH));
			setPosition(world, child.eid, container.x + 1, y);
			setDimensions(world, child.eid, container.w - 2, h);
			y += h + gap;
		}
	} else {
		// Grid 2x2
		const cellW = Math.floor((container.w - 3) / 2);
		const cellH = Math.floor((container.h - 3) / 2);
		for (let i = 0; i < children.length; i++) {
			const col = i % 2, row = Math.floor(i / 2);
			setPosition(world, children[i]!.eid, container.x + 1 + col * (cellW + 1), container.y + 1 + row * (cellH + 1));
			setDimensions(world, children[i]!.eid, cellW, cellH);
		}
	}
}

function drawBox(out: string[], x: number, y: number, w: number, h: number, color: string, label: string): void {
	if (w < 3 || h < 2) return;
	out.push(moveTo(y, x) + `${color}┌${'─'.repeat(w - 2)}┐\x1b[0m`);
	for (let r = 1; r < h - 1; r++) {
		const text = r === 1 ? ` ${label}`.slice(0, w - 2).padEnd(w - 2) : ' '.repeat(w - 2);
		out.push(moveTo(y + r, x) + `${color}│\x1b[0m${text}${color}│\x1b[0m`);
	}
	out.push(moveTo(y + h - 1, x) + `${color}└${'─'.repeat(w - 2)}┘\x1b[0m`);
}

function render(): void {
	const { height } = getTerminalSize();
	computeLayout();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Layout System Demo'));
	out.push(moveTo(2, 3) + `\x1b[90mLayout: \x1b[33m${layoutMode}\x1b[90m  |  Gap: ${gap}  |  Tab = select  |  Space = layout  |  q = quit\x1b[0m`);

	// Container
	drawBox(out, container.x, container.y, container.w, container.h, '\x1b[90m', 'Container');

	// Children
	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const pos = getPosition(world, child.eid);
		const dim = getDimensions(world, child.eid);
		if (!pos || !dim) continue;
		const sel = i === selectedIdx;
		const color = sel ? `\x1b[1;${child.color}m` : `\x1b[${child.color}m`;
		drawBox(out, pos.x, pos.y, dim.width, dim.height, color, `${child.label} (flex:${child.flex})`);
	}

	out.push(moveTo(container.y + container.h + 1, 4) + `\x1b[90mContainer: ${container.w}x${container.h}  Children: ${children.length}  Selected: ${children[selectedIdx]!.label}\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Select  [Space] Layout  [+/-] Flex  [g] Gap  [Arrows] Resize  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') selectedIdx = (selectedIdx + 1) % children.length;
	if (ch === ' ') { const modes: LayoutMode[] = ['horizontal', 'vertical', 'grid']; layoutMode = modes[(modes.indexOf(layoutMode) + 1) % modes.length]!; }
	if (ch === '+' || ch === '=') children[selectedIdx]!.flex = Math.min(5, children[selectedIdx]!.flex + 1);
	if (ch === '-') children[selectedIdx]!.flex = Math.max(1, children[selectedIdx]!.flex - 1);
	if (ch === 'g') gap = (gap + 1) % 4;
	const arrow = parseArrowKey(data);
	if (arrow === 'right') container.w = Math.min(80, container.w + 2);
	if (arrow === 'left') container.w = Math.max(20, container.w - 2);
	if (arrow === 'down') container.h = Math.min(22, container.h + 1);
	if (arrow === 'up') container.h = Math.max(8, container.h - 1);
	render();
});
