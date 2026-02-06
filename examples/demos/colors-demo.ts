/**
 * Colors Demo
 *
 * Demonstrates foreground/background colors, hex colors, and packed color utilities.
 * Tab to cycle sections, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/colors-demo.ts
 * @module demos/colors
 */
import { packColor, unpackColor, hexToColor, colorToHex, interpolateColor } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

let section = 0;
const SECTIONS = ['16 ANSI', '256 Colors', 'True Color', 'Pack/Unpack', 'Interpolate'];

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Colors Demo'));
	out.push(moveTo(2, 3) + SECTIONS.map((s, i) => i === section ? `\x1b[1;33m[${s}]\x1b[0m` : `\x1b[90m ${s} \x1b[0m`).join('  '));

	const row = 4;
	if (section === 0) {
		// 16 standard ANSI colors
		out.push(moveTo(row, 3) + '\x1b[1mStandard 16 ANSI Colors\x1b[0m');
		for (let i = 0; i < 8; i++) out.push(moveTo(row + 2, 3 + i * 6) + `\x1b[${30 + i}m████\x1b[0m`);
		for (let i = 0; i < 8; i++) out.push(moveTo(row + 3, 3 + i * 6) + `\x1b[${90 + i}m████\x1b[0m`);
		out.push(moveTo(row + 5, 3) + '\x1b[90mTop: colors 0-7  |  Bottom: bright 8-15\x1b[0m');
	} else if (section === 1) {
		// 256 color palette
		out.push(moveTo(row, 3) + '\x1b[1m256 Color Palette\x1b[0m');
		for (let i = 0; i < 216; i++) {
			const x = 3 + (i % 36) * 2;
			const y = row + 2 + Math.floor(i / 36);
			out.push(moveTo(y, x) + `\x1b[48;5;${16 + i}m  \x1b[0m`);
		}
		// Grayscale
		for (let i = 0; i < 24; i++) {
			out.push(moveTo(row + 9, 3 + i * 3) + `\x1b[48;5;${232 + i}m   \x1b[0m`);
		}
	} else if (section === 2) {
		// True color gradient
		out.push(moveTo(row, 3) + '\x1b[1mTrue Color (24-bit) Gradients\x1b[0m');
		const gradWidth = Math.min(60, width - 6);
		for (let x = 0; x < gradWidth; x++) {
			const v = Math.round((x / gradWidth) * 255);
			out.push(moveTo(row + 2, 3 + x) + `\x1b[48;2;${v};0;0m \x1b[0m`);
			out.push(moveTo(row + 3, 3 + x) + `\x1b[48;2;0;${v};0m \x1b[0m`);
			out.push(moveTo(row + 4, 3 + x) + `\x1b[48;2;0;0;${v}m \x1b[0m`);
			const hue = (x / gradWidth) * 360;
			const [hr, hg, hb] = hslToRgb(hue, 1, 0.5);
			out.push(moveTo(row + 6, 3 + x) + `\x1b[48;2;${hr};${hg};${hb}m \x1b[0m`);
		}
		out.push(moveTo(row + 5, 3) + '\x1b[90mRed / Green / Blue gradients\x1b[0m');
		out.push(moveTo(row + 7, 3) + '\x1b[90mFull hue spectrum\x1b[0m');
	} else if (section === 3) {
		// Pack/unpack demo
		out.push(moveTo(row, 3) + '\x1b[1mColor Pack/Unpack\x1b[0m');
		const samples = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 170, 0], [255, 0, 255]];
		for (let i = 0; i < samples.length; i++) {
			const [sr, sg, sb] = samples[i]!;
			const packed = packColor(sr, sg, sb);
			const unpacked = unpackColor(packed);
			const hex = colorToHex((sr << 16) | (sg << 8) | sb);
			out.push(moveTo(row + 2 + i * 2, 3) + `\x1b[38;2;${sr};${sg};${sb}m████\x1b[0m  hex=${hex}  packed=${packed}  rgb=(${sr}, ${sg}, ${sb})`);
		}
	} else if (section === 4) {
		// Interpolation
		out.push(moveTo(row, 3) + '\x1b[1mColor Interpolation\x1b[0m');
		const gradWidth = Math.min(50, width - 6);
		const pairs = [[0xff0000, 0x0000ff], [0x00ff00, 0xff00ff], [0xffff00, 0x00ffff]];
		for (let p = 0; p < pairs.length; p++) {
			for (let x = 0; x < gradWidth; x++) {
				const t = x / (gradWidth - 1);
				const c = interpolateColor(pairs[p]![0]!, pairs[p]![1]!, t);
				const cr = (c >> 16) & 0xff, cg = (c >> 8) & 0xff, cb = c & 0xff;
				out.push(moveTo(row + 2 + p * 2, 3 + x) + `\x1b[48;2;${cr};${cg};${cb}m \x1b[0m`);
			}
		}
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Section  [q] Quit', `${section + 1}/${SECTIONS.length}`));
	process.stdout.write(out.join(''));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0, g = 0, b = 0;
	if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
	else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
	else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
	return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\t') section = (section + 1) % SECTIONS.length;
	if (ch === '\x1b[C') section = (section + 1) % SECTIONS.length;
	if (ch === '\x1b[D') section = (section + SECTIONS.length - 1) % SECTIONS.length;
	render();
});
