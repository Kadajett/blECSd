/**
 * Text Styles Demo
 *
 * Demonstrates text styles: bold, dim, italic, underline, blink, inverse, strikethrough.
 * Tab to highlight style, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/text-styles-demo.ts
 * @module demos/text-styles
 */
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const styles = [
	{ name: 'Bold', code: '\x1b[1m', desc: 'SGR 1 - Increased intensity' },
	{ name: 'Dim', code: '\x1b[2m', desc: 'SGR 2 - Decreased intensity' },
	{ name: 'Italic', code: '\x1b[3m', desc: 'SGR 3 - Italic text' },
	{ name: 'Underline', code: '\x1b[4m', desc: 'SGR 4 - Underlined text' },
	{ name: 'Blink', code: '\x1b[5m', desc: 'SGR 5 - Slow blink' },
	{ name: 'Inverse', code: '\x1b[7m', desc: 'SGR 7 - Swap fg/bg colors' },
	{ name: 'Hidden', code: '\x1b[8m', desc: 'SGR 8 - Hidden/concealed' },
	{ name: 'Strikethrough', code: '\x1b[9m', desc: 'SGR 9 - Crossed out' },
	{ name: 'Double Underline', code: '\x1b[21m', desc: 'SGR 21 - Double underline' },
	{ name: 'Overline', code: '\x1b[53m', desc: 'SGR 53 - Overlined text' },
];

let selected = 0;
const SAMPLE = 'The quick brown fox jumps over the lazy dog';

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Text Styles Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mUp/Down = navigate  |  Tab = next  |  q = quit\x1b[0m');

	// Style list
	for (let i = 0; i < styles.length; i++) {
		const s = styles[i]!;
		const focused = i === selected;
		const row = 4 + i;
		const indicator = focused ? '\x1b[33m▶\x1b[0m' : ' ';
		out.push(moveTo(row, 2) + `${indicator} ${s.code}${s.name.padEnd(18)}\x1b[0m ${focused ? '\x1b[90m' + s.desc + '\x1b[0m' : ''}`);
	}

	// Preview area
	const previewRow = 4 + styles.length + 2;
	out.push(moveTo(previewRow, 3) + '\x1b[1mPreview\x1b[0m');
	out.push(moveTo(previewRow + 1, 3) + `${styles[selected]!.code}${SAMPLE}\x1b[0m`);

	// Combination examples
	out.push(moveTo(previewRow + 3, 3) + '\x1b[1mCombinations\x1b[0m');
	out.push(moveTo(previewRow + 4, 3) + '\x1b[1;4mBold + Underline\x1b[0m');
	out.push(moveTo(previewRow + 5, 3) + '\x1b[1;3mBold + Italic\x1b[0m');
	out.push(moveTo(previewRow + 6, 3) + '\x1b[2;3;4mDim + Italic + Underline\x1b[0m');
	out.push(moveTo(previewRow + 7, 3) + '\x1b[1;31mBold + Red\x1b[0m  \x1b[3;32mItalic + Green\x1b[0m  \x1b[4;34mUnderline + Blue\x1b[0m');

	// Color + style grid
	out.push(moveTo(previewRow + 9, 3) + '\x1b[1mColors × Styles\x1b[0m');
	const colors = [31, 32, 33, 34, 35, 36];
	const colorNames = ['Red', 'Grn', 'Yel', 'Blu', 'Mag', 'Cyn'];
	for (let c = 0; c < colors.length; c++) {
		out.push(moveTo(previewRow + 10 + c, 3) + `\x1b[${colors[c]}m${colorNames[c]}\x1b[0m  \x1b[1;${colors[c]}mBold\x1b[0m  \x1b[3;${colors[c]}mItalic\x1b[0m  \x1b[4;${colors[c]}mUnder\x1b[0m  \x1b[7;${colors[c]}mInverse\x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Navigate  [Tab] Next  [q] Quit', `Style: ${styles[selected]!.name}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\x1b[A' || ch === 'k') selected = (selected + styles.length - 1) % styles.length;
	if (ch === '\x1b[B' || ch === 'j' || ch === '\t') selected = (selected + 1) % styles.length;
	render();
});
