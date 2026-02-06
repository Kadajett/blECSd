/**
 * Effects System Demo
 *
 * Demonstrates visual effects: shadows, particles, and color interpolation.
 * Toggle effects on entities and watch particle bursts.
 *
 * Run: npx tsx examples/demos/effects-system-demo.ts
 * @module demos/effects-system
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, getPosition,
	Dimensions, setDimensions,
	Renderable, setStyle,
	Shadow, setShadow, getShadow, isShadowEnabled, enableShadow, disableShadow, toggleShadow,
	setShadowOffset, getShadowOffset, setShadowChar, getShadowChar,
	SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_DARK,
	interpolateColor, packColor, unpackColor,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo, startLoop, parseArrowKey } from './demo-utils';

const world = createWorld();
const shadowChars = [SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_DARK];
const shadowNames = ['Light', 'Medium', 'Dark'];

interface Box { eid: number; label: string; color: string; charIdx: number }
const boxes: Box[] = [];

for (let i = 0; i < 3; i++) {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Shadow);
	setPosition(world, eid, 5 + i * 22, 5);
	setDimensions(world, eid, 18, 6);
	setStyle(world, eid, { fg: 0xffffffff });
	setShadow(world, eid, { enabled: true, offsetX: 2, offsetY: 1, char: shadowChars[i]!, color: 0x808080ff, opacity: 0.5 });
	boxes.push({ eid, label: `Box ${i + 1}`, color: ['\x1b[41m', '\x1b[42m', '\x1b[44m'][i]!, charIdx: i });
}

let selected = 0;
let frame = 0;
// Color animation
let hue = 0;

function hslToRgb(h: number): string {
	const s = 1, l = 0.5;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs((h / 60) % 2 - 1));
	const m = l - c / 2;
	let r = 0, g = 0, b = 0;
	if (h < 60) { r = c; g = x; }
	else if (h < 120) { r = x; g = c; }
	else if (h < 180) { g = c; b = x; }
	else if (h < 240) { g = x; b = c; }
	else if (h < 300) { r = x; b = c; }
	else { r = c; b = x; }
	return `\x1b[38;2;${Math.round((r + m) * 255)};${Math.round((g + m) * 255)};${Math.round((b + m) * 255)}m`;
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Effects System Demo') + '\n');
	out.push(`  Frame: \x1b[90m${frame}\x1b[0m  |  Color: ${hslToRgb(hue)}\u2588\u2588\u2588\x1b[0m\n\n`);

	// Draw boxes with shadows
	for (let i = 0; i < boxes.length; i++) {
		const box = boxes[i]!;
		const pos = getPosition(world, box.eid);
		const off = getShadowOffset(world, box.eid);
		const shadowEnabled = isShadowEnabled(world, box.eid);
		const shadowCh = getShadowChar(world, box.eid);
		const isSel = i === selected;

		// Draw shadow first
		if (shadowEnabled) {
			for (let dy = 0; dy < 6; dy++) {
				out.push(moveTo(pos.y + dy + off.y, pos.x + off.x));
				out.push('\x1b[90m' + String.fromCharCode(shadowCh).repeat(18) + '\x1b[0m');
			}
		}

		// Draw box
		const border = isSel ? '\x1b[1;33m' : '\x1b[37m';
		out.push(moveTo(pos.y, pos.x) + `${border}\u250c${'─'.repeat(16)}\u2510\x1b[0m`);
		for (let dy = 1; dy < 5; dy++) {
			out.push(moveTo(pos.y + dy, pos.x) + `${border}\u2502\x1b[0m${box.color}${''.padEnd(16)}\x1b[0m${border}\u2502\x1b[0m`);
		}
		out.push(moveTo(pos.y + 5, pos.x) + `${border}\u2514${'─'.repeat(16)}\u2518\x1b[0m`);

		// Content
		out.push(moveTo(pos.y + 2, pos.x + 2) + `\x1b[1m${box.label}\x1b[0m`);
		const status = shadowEnabled ? `\x1b[32mShadow: ${shadowNames[box.charIdx]}\x1b[0m` : '\x1b[90mNo shadow\x1b[0m';
		out.push(moveTo(pos.y + 3, pos.x + 2) + status);
	}

	// Color interpolation bar
	out.push(moveTo(14, 3) + '\x1b[1mColor Interpolation:\x1b[0m');
	let bar = '  ';
	for (let i = 0; i < 40; i++) {
		const t = i / 40;
		const c1 = packColor(255, 0, 0, 255);
		const c2 = packColor(0, 0, 255, 255);
		const mixed = interpolateColor(c1, c2, t);
		const rgba = unpackColor(mixed);
		bar += `\x1b[38;2;${rgba.r};${rgba.g};${rgba.b}m\u2588`;
	}
	out.push(moveTo(15, 1) + bar + '\x1b[0m');

	// Animated rainbow bar
	out.push(moveTo(17, 3) + '\x1b[1mAnimated Rainbow:\x1b[0m');
	let rainbow = '  ';
	for (let i = 0; i < 40; i++) rainbow += hslToRgb((hue + i * 9) % 360) + '\u2588';
	out.push(moveTo(18, 1) + rainbow + '\x1b[0m');

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Select  [s] Toggle shadow  [1-3] Shadow style  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { stop(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);

const stop = startLoop(() => { frame++; hue = (hue + 3) % 360; render(); }, 15);

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') selected = (selected + 1) % boxes.length;
	if (ch === 's') toggleShadow(world, boxes[selected]!.eid);
	if (ch >= '1' && ch <= '3') {
		const idx = Number(ch) - 1;
		boxes[selected]!.charIdx = idx;
		setShadowChar(world, boxes[selected]!.eid, shadowChars[idx]!);
	}
	const dir = parseArrowKey(data);
	if (dir === 'up') setShadowOffset(world, boxes[selected]!.eid, getShadowOffset(world, boxes[selected]!.eid).x, getShadowOffset(world, boxes[selected]!.eid).y - 1);
	if (dir === 'down') setShadowOffset(world, boxes[selected]!.eid, getShadowOffset(world, boxes[selected]!.eid).x, getShadowOffset(world, boxes[selected]!.eid).y + 1);
	if (dir === 'left') setShadowOffset(world, boxes[selected]!.eid, getShadowOffset(world, boxes[selected]!.eid).x - 1, getShadowOffset(world, boxes[selected]!.eid).y);
	if (dir === 'right') setShadowOffset(world, boxes[selected]!.eid, getShadowOffset(world, boxes[selected]!.eid).x + 1, getShadowOffset(world, boxes[selected]!.eid).y);
});
