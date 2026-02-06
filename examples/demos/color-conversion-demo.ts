/**
 * Color Conversion Demo
 *
 * Demonstrates RGB to 256-color mapping and color space conversions.
 * Arrow keys to adjust RGB values, Tab to switch channel, q to exit.
 *
 * Run: npx tsx examples/demos/color-conversion-demo.ts
 * @module demos/color-conversion
 */
import { packColor, unpackColor, hexToColor, colorToHex, interpolateColor } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

let r = 128, g = 64, b = 200;
let channel = 0; // 0=R, 1=G, 2=B

// Find closest 256-color match
function rgbTo256(cr: number, cg: number, cb: number): number {
	if (cr === cg && cg === cb) {
		if (cr < 8) return 16;
		if (cr > 248) return 231;
		return Math.round((cr - 8) / 247 * 24) + 232;
	}
	return 16 + (36 * Math.round(cr / 255 * 5)) + (6 * Math.round(cg / 255 * 5)) + Math.round(cb / 255 * 5);
}

// RGB to HSL
function rgbToHsl(cr: number, cg: number, cb: number): [number, number, number] {
	const rr = cr / 255, gg = cg / 255, bb = cb / 255;
	const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
	else if (max === gg) h = ((bb - rr) / d + 2) / 6;
	else h = ((rr - gg) / d + 4) / 6;
	return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Color Conversion Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = channel  |  Up/Down = adjust (+1)  |  PgUp/PgDn = adjust (+10)  |  q = quit\x1b[0m');

	// Current color swatch
	out.push(moveTo(4, 3) + '\x1b[1mCurrent Color\x1b[0m');
	for (let y = 0; y < 4; y++) {
		out.push(moveTo(5 + y, 3) + `\x1b[48;2;${r};${g};${b}m${'          '}\x1b[0m`);
	}

	// RGB sliders
	const channels = [
		{ label: 'Red', val: r, color: '\x1b[31m' },
		{ label: 'Green', val: g, color: '\x1b[32m' },
		{ label: 'Blue', val: b, color: '\x1b[34m' },
	];
	for (let i = 0; i < channels.length; i++) {
		const ch = channels[i]!;
		const focused = i === channel;
		const row = 5 + i * 2;
		const col = 16;
		const indicator = focused ? '\x1b[33m>\x1b[0m' : ' ';
		const barWidth = 32;
		const filled = Math.round((ch.val / 255) * barWidth);
		const bar = ch.color + '\u2588'.repeat(filled) + '\x1b[90m' + '\u2591'.repeat(barWidth - filled) + '\x1b[0m';
		out.push(moveTo(row, col) + `${indicator} ${ch.label.padEnd(6)} ${bar} ${ch.val.toString().padStart(3)}`);
	}

	// Conversions
	const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	const c256 = rgbTo256(r, g, b);
	const [h, s, l] = rgbToHsl(r, g, b);
	const packed = packColor(r, g, b);

	out.push(moveTo(12, 3) + '\x1b[1mConversions\x1b[0m');
	out.push(moveTo(13, 3) + `Hex:     ${hex}`);
	out.push(moveTo(14, 3) + `RGB:     rgb(${r}, ${g}, ${b})`);
	out.push(moveTo(15, 3) + `HSL:     hsl(${h}, ${s}%, ${l}%)`);
	out.push(moveTo(16, 3) + `256:     \x1b[48;5;${c256}m  ${c256}  \x1b[0m`);
	out.push(moveTo(17, 3) + `Packed:  ${packed}`);

	// 256-color neighborhood
	out.push(moveTo(19, 3) + '\x1b[1mNearest 256 Colors\x1b[0m');
	for (let i = Math.max(16, c256 - 6); i <= Math.min(255, c256 + 6); i++) {
		const col = 3 + (i - Math.max(16, c256 - 6)) * 4;
		const mark = i === c256 ? '\x1b[1mv\x1b[0m' : ' ';
		out.push(moveTo(20, col) + mark);
		out.push(moveTo(21, col) + `\x1b[48;5;${i}m    \x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Channel  [Up/Down] +/-1  [PgUp/PgDn] +/-10  [q] Quit'));
	process.stdout.write(out.join(''));
}

function adjust(delta: number): void {
	if (channel === 0) r = Math.max(0, Math.min(255, r + delta));
	else if (channel === 1) g = Math.max(0, Math.min(255, g + delta));
	else b = Math.max(0, Math.min(255, b + delta));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') channel = (channel + 1) % 3;
	const arrow = parseArrowKey(data);
	if (arrow === 'up') adjust(1);
	if (arrow === 'down') adjust(-1);
	if (ch === '\x1b[5~') adjust(10);
	if (ch === '\x1b[6~') adjust(-10);
	render();
});
