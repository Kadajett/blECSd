#!/usr/bin/env node
/** Alpha Blending Demo - transparency and color blending.
 * Run: npx tsx examples/demos/alpha-blending-demo.ts | Quit: q or Ctrl+C */
import { blendColors, blendCellColors } from '../../src/terminal/screen/transparency';
import { packColor, unpackColor } from '../../src/components/renderable';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');

let opacity = 100; // 0-100 as percentage
const bgColor = packColor(30, 60, 120); // Deep blue
const fgColor = packColor(255, 100, 50); // Orange

function toAnsi(packed: number): string {
	const { r, g, b } = unpackColor(packed);
	return `\x1b[48;2;${r};${g};${b}m`;
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mAlpha Blending Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90mOpacity: ${opacity}% | Left/Right to adjust\x1b[0m`);
	const op = opacity / 100;
	// Background layer
	const bgC = unpackColor(bgColor);
	stdout.write(`\x1b[4;3H\x1b[90mBackground: rgb(${bgC.r},${bgC.g},${bgC.b})\x1b[0m`);
	for (let y = 0; y < 6; y++) for (let x = 0; x < 30; x++) stdout.write(`\x1b[${6 + y};${3 + x}H${toAnsi(bgColor)} \x1b[0m`);
	// Foreground layer with blending
	const fgC = unpackColor(fgColor);
	stdout.write(`\x1b[4;36H\x1b[90mForeground: rgb(${fgC.r},${fgC.g},${fgC.b}) @ ${opacity}%\x1b[0m`);
	const blended = blendColors(fgColor, bgColor, op);
	const bC = unpackColor(blended);
	stdout.write(`\x1b[5;36H\x1b[90mBlended: rgb(${bC.r},${bC.g},${bC.b})\x1b[0m`);
	for (let y = 0; y < 6; y++) for (let x = 0; x < 30; x++) stdout.write(`\x1b[${6 + y};${36 + x}H${toAnsi(blended)} \x1b[0m`);
	// Gradient bar showing 0-100% blend
	stdout.write('\x1b[14;3H\x1b[90mOpacity gradient (0% to 100%):\x1b[0m');
	const barW = Math.min(60, termW - 6);
	for (let x = 0; x < barW; x++) {
		const pct = x / (barW - 1);
		const c = blendColors(fgColor, bgColor, pct);
		stdout.write(`\x1b[15;${3 + x}H${toAnsi(c)} \x1b[0m`);
	}
	// Cell blending demo
	stdout.write('\x1b[18;3H\x1b[90mCell blend (fg on bg):\x1b[0m');
	const cell = blendCellColors(fgColor, bgColor, op);
	const cellFg = unpackColor(cell.fg), cellBg = unpackColor(cell.bg);
	stdout.write(`\x1b[19;3H\x1b[38;2;${cellFg.r};${cellFg.g};${cellFg.b}m${toAnsi(cell.bg)}  Sample Text  \x1b[0m`);
	stdout.write(`\x1b[${Math.min(termH - 1, 22)};1H\x1b[33m[Left/Right] Opacity  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[C' || key === 'l') opacity = Math.min(100, opacity + 5);
	if (key === '\x1b[D' || key === 'h') opacity = Math.max(0, opacity - 5);
	render();
});
