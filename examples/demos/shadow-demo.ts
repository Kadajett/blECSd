/**
 * Shadow Demo
 *
 * Demonstrates elements with drop shadows, adjustable offset and opacity.
 * Tab to cycle, arrow keys to move shadow, +/- to adjust opacity, q to exit.
 *
 * Run: npx tsx examples/demos/shadow-demo.ts
 * @module demos/shadow
 */
import {
	createWorld, addEntity, addComponent, Position, Dimensions, Shadow, Border,
	setPosition, setDimensions, setShadow, getShadow, getShadowOffset,
	getShadowOpacity, setShadowOffset, setShadowOpacity, setShadowChar,
	enableShadow, disableShadow, isShadowEnabled, toggleShadow,
	setBorder, SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_DARK,
	DEFAULT_SHADOW_CHAR,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

const world = createWorld() as World;

const boxes = [
	{ eid: addEntity(world) as Entity, label: 'Dialog Box', color: 36, w: 20, h: 5 },
	{ eid: addEntity(world) as Entity, label: 'Alert', color: 31, w: 16, h: 4 },
	{ eid: addEntity(world) as Entity, label: 'Panel', color: 33, w: 22, h: 6 },
];

for (let i = 0; i < boxes.length; i++) {
	const box = boxes[i]!;
	addComponent(world, box.eid, Position);
	addComponent(world, box.eid, Dimensions);
	addComponent(world, box.eid, Shadow);
	addComponent(world, box.eid, Border);
	setPosition(world, box.eid, 4 + i * 26, 5);
	setDimensions(world, box.eid, box.w, box.h);
	setShadow(world, box.eid, { enabled: true, offsetX: 2, offsetY: 1, char: SHADOW_CHAR_MEDIUM, color: 0x333333, opacity: 128 });
	setBorder(world, box.eid, { type: 0 });
}

let focusIdx = 0;
const shadowChars = [SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_DARK];
let charIdx = 1;

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Shadow Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = cycle  |  Arrows = offset  |  +/- = opacity  |  s = char  |  t = toggle\x1b[0m');

	for (let i = 0; i < boxes.length; i++) {
		const box = boxes[i]!;
		const focused = i === focusIdx;
		const shadow = getShadow(world, box.eid);
		const enabled = isShadowEnabled(world, box.eid);
		const borderColor = focused ? `\x1b[1;${box.color}m` : `\x1b[${box.color}m`;
		const col = 4 + i * 26;
		const row = 5;

		// Draw shadow first
		if (enabled && shadow) {
			const shadowCh = String.fromCodePoint(shadow.char);
			for (let sy = 0; sy < box.h; sy++) {
				for (let sx = 0; sx < box.w; sx++) {
					out.push(moveTo(row + sy + shadow.offsetY, col + sx + shadow.offsetX) + `\x1b[90m${shadowCh}\x1b[0m`);
				}
			}
		}

		// Draw box
		out.push(moveTo(row, col) + `${borderColor}┌${'─'.repeat(box.w - 2)}┐\x1b[0m`);
		for (let y = 1; y < box.h - 1; y++) {
			const content = y === 1 ? ` ${box.label}`.padEnd(box.w - 2) : ' '.repeat(box.w - 2);
			out.push(moveTo(row + y, col) + `${borderColor}│\x1b[0m${content}${borderColor}│\x1b[0m`);
		}
		out.push(moveTo(row + box.h - 1, col) + `${borderColor}└${'─'.repeat(box.w - 2)}┘\x1b[0m`);

		// Info
		const infoRow = row + box.h + 2;
		if (shadow) {
			out.push(moveTo(infoRow, col) + `\x1b[90moffset: ${shadow.offsetX},${shadow.offsetY}\x1b[0m`);
			out.push(moveTo(infoRow + 1, col) + `\x1b[90mopacity: ${shadow.opacity}\x1b[0m`);
			out.push(moveTo(infoRow + 2, col) + `\x1b[90menabled: ${enabled}\x1b[0m`);
		}
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Cycle  [Arrows] Offset  [+/-] Opacity  [s] Char  [t] Toggle  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const eid = boxes[focusIdx]!.eid;
	const shadow = getShadow(world, eid);
	if (ch === '\t') focusIdx = (focusIdx + 1) % boxes.length;
	const arrow = parseArrowKey(data);
	if (arrow === 'up' && shadow) setShadowOffset(world, eid, shadow.offsetX, shadow.offsetY - 1);
	if (arrow === 'down' && shadow) setShadowOffset(world, eid, shadow.offsetX, shadow.offsetY + 1);
	if (arrow === 'left' && shadow) setShadowOffset(world, eid, shadow.offsetX - 1, shadow.offsetY);
	if (arrow === 'right' && shadow) setShadowOffset(world, eid, shadow.offsetX + 1, shadow.offsetY);
	if ((ch === '+' || ch === '=') && shadow) setShadowOpacity(world, eid, Math.min(255, shadow.opacity + 25));
	if (ch === '-' && shadow) setShadowOpacity(world, eid, Math.max(0, shadow.opacity - 25));
	if (ch === 's') { charIdx = (charIdx + 1) % shadowChars.length; setShadowChar(world, eid, shadowChars[charIdx]!); }
	if (ch === 't') toggleShadow(world, eid);
	render();
});
