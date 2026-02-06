/**
 * Render System Demo
 *
 * Demonstrates the entity rendering pipeline: background, borders, content.
 * Shows how renderBackground, renderBorder, and renderContent work together.
 *
 * Run: npx tsx examples/demos/render-system-demo.ts
 * @module demos/render-system
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, getPosition,
	Dimensions, setDimensions,
	Renderable, setStyle, setVisible, isVisible,
	Content, setContent,
	Border, setBorder, setBorderChars, BORDER_SINGLE, BORDER_DOUBLE, BORDER_ROUNDED, BORDER_BOLD,
	markDirty,
} from 'blecsd';
import type { BorderCharset } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();

// Pipeline stages shown
const stages = ['Background', 'Border', 'Content', 'Full'];
let stageIdx = 3; // Start with full render

interface Panel { eid: number; name: string; style: string; charset: BorderCharset }
const panels: Panel[] = [];
const borderStyles: BorderCharset[] = [BORDER_SINGLE, BORDER_DOUBLE, BORDER_ROUNDED, BORDER_BOLD];
const styleNames = ['Single', 'Double', 'Rounded', 'Bold'];
const bgColors = ['\x1b[44m', '\x1b[42m', '\x1b[45m', '\x1b[43m'];

for (let i = 0; i < 4; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Content);
	addComponent(world, eid, Border);
	setPosition(world, eid, 3 + (i % 2) * 34, 4 + Math.floor(i / 2) * 9);
	setDimensions(world, eid, 30, 7);
	setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
	setContent(world, eid, `Panel ${i + 1}: ${styleNames[i]}`);
	setBorder(world, eid, { top: true, right: true, bottom: true, left: true });
	setBorderChars(world, eid, borderStyles[i]!);
	markDirty(world, eid);
	panels.push({ eid, name: `Panel ${i + 1}`, style: styleNames[i]!, charset: borderStyles[i]! });
}

let selected = 0;

// Helper to convert char code to character string
function ch(code: number): string { return String.fromCharCode(code); }

function renderPanel(out: string[], panel: Panel, idx: number): void {
	const pos = getPosition(world, panel.eid);
	const w = 30, h = 7;
	const isSel = idx === selected;
	const bg = bgColors[idx]!;
	const cs = panel.charset;

	// Stage 1: Background
	if (stageIdx >= 0) {
		for (let dy = 0; dy < h; dy++) {
			out.push(moveTo(pos.y + dy, pos.x));
			for (let dx = 0; dx < w; dx++) out.push(stageIdx === 0 || stageIdx === 3 ? `${bg} \x1b[0m` : ' ');
		}
	}

	// Stage 2: Border
	if (stageIdx >= 1 && stageIdx !== 0) {
		const bc = isSel ? '\x1b[1;33m' : '\x1b[37m';
		out.push(moveTo(pos.y, pos.x) + `${bc}${ch(cs.topLeft)}${ch(cs.horizontal).repeat(w - 2)}${ch(cs.topRight)}\x1b[0m`);
		for (let dy = 1; dy < h - 1; dy++) {
			out.push(moveTo(pos.y + dy, pos.x) + `${bc}${ch(cs.vertical)}\x1b[0m`);
			out.push(moveTo(pos.y + dy, pos.x + w - 1) + `${bc}${ch(cs.vertical)}\x1b[0m`);
		}
		out.push(moveTo(pos.y + h - 1, pos.x) + `${bc}${ch(cs.bottomLeft)}${ch(cs.horizontal).repeat(w - 2)}${ch(cs.bottomRight)}\x1b[0m`);
	}

	// Stage 3: Content
	if (stageIdx >= 2) {
		const content = `${panel.name}: ${panel.style}`;
		out.push(moveTo(pos.y + 2, pos.x + 2) + `\x1b[1m${content}\x1b[0m`);
		out.push(moveTo(pos.y + 4, pos.x + 2) + `\x1b[90mvis=${isVisible(world, panel.eid)}\x1b[0m`);
	}
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Render System Demo') + '\n');
	out.push(`  Pipeline stage: \x1b[33m${stages[stageIdx]}\x1b[0m  (press 1-4 to select stage)\n`);

	for (let i = 0; i < panels.length; i++) renderPanel(out, panels[i]!, i);

	out.push(moveTo(height, 1) + formatHelpBar('[1-4] Stage  [Tab] Select  [v] Toggle visible  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch >= '1' && ch <= '4') stageIdx = Number(ch) - 1;
	if (ch === '\t') selected = (selected + 1) % panels.length;
	if (ch === 'v') { const v = isVisible(world, panels[selected]!.eid); setVisible(world, panels[selected]!.eid, !v); }
	render();
});
