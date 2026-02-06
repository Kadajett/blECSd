/**
 * Text Wrapping Demo
 *
 * Demonstrates word wrap, alignment, and truncation utilities.
 * Resize terminal or press +/- to change wrap width.
 *
 * Run: npx tsx examples/demos/text-wrapping-demo.ts
 * @module demos/text-wrapping
 */
import { wordWrap, truncate, alignLine, stripAnsi, getVisibleWidth } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const sampleText = 'The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';
const coloredText = '\x1b[31mRed text\x1b[0m mixed with \x1b[32mgreen text\x1b[0m and \x1b[34mblue text\x1b[0m in a long sentence that should wrap correctly.';

let wrapWidth = 40;
let mode = 0; // 0=wrap, 1=truncate, 2=align
const modes = ['Word Wrap', 'Truncation', 'Alignment'];
const aligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
let alignIdx = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Text Wrapping Demo') + '\n');
	out.push(`  Mode: \x1b[33m${modes[mode]}\x1b[0m  |  Width: \x1b[36m${wrapWidth}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 60)) + '\n\n');

	if (mode === 0) {
		// Word wrap
		out.push('  \x1b[1mPlain text:\x1b[0m\n');
		const wrapped = wordWrap(sampleText, wrapWidth);
		for (const line of wrapped) out.push(`  \x1b[90m|\x1b[0m${line}\x1b[90m|\x1b[0m\n`);
		out.push('\n  \x1b[1mWith ANSI colors:\x1b[0m\n');
		const colorWrapped = wordWrap(coloredText, wrapWidth);
		for (const line of colorWrapped) out.push(`  \x1b[90m|\x1b[0m${line}\x1b[90m|\x1b[0m\n`);
	} else if (mode === 1) {
		// Truncation
		const lengths = [20, 30, 40, 50];
		out.push('  \x1b[1mTruncation at various widths:\x1b[0m\n\n');
		for (const len of lengths) {
			const t = truncate(sampleText, len);
			out.push(`  [${String(len).padStart(2)}] ${t}\n`);
		}
		out.push('\n  \x1b[1mVisible width check:\x1b[0m\n');
		out.push(`  Plain: "${sampleText.slice(0, 20)}" => width=${getVisibleWidth(sampleText.slice(0, 20))}\n`);
		out.push(`  ANSI:  "${coloredText.slice(0, 40)}..." => width=${getVisibleWidth(coloredText)}\n`);
		out.push(`  Stripped: "${stripAnsi(coloredText).slice(0, 40)}..."\n`);
	} else {
		// Alignment
		const align = aligns[alignIdx]!;
		out.push(`  \x1b[1mAlignment: ${align}\x1b[0m  (press 'a' to cycle)\n\n`);
		const lines = ['Hello World', 'Short', 'A longer line of text', 'Centered?'];
		for (const line of lines) {
			const aligned = alignLine(line, wrapWidth, align);
			out.push(`  \x1b[90m|\x1b[0m${aligned.padEnd(wrapWidth)}\x1b[90m|\x1b[0m\n`);
		}
	}

	out.push(moveTo(height, 1) + formatHelpBar('[m] Mode  [+/-] Width  [a] Align  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '+' || ch === '=') wrapWidth = Math.min(wrapWidth + 5, 80);
	if (ch === '-') wrapWidth = Math.max(wrapWidth - 5, 10);
	if (ch === 'm') mode = (mode + 1) % modes.length;
	if (ch === 'a') alignIdx = (alignIdx + 1) % aligns.length;
	render();
});
