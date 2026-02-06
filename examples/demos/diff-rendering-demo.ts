/**
 * Diff Rendering Demo
 *
 * Demonstrates efficient diff display by comparing old and new content,
 * highlighting only the changed cells. Shows how double buffering works.
 *
 * Run: npx tsx examples/demos/diff-rendering-demo.ts
 * @module demos/diff-rendering
 */
import { createDoubleBuffer } from 'blecsd';
import type { DoubleBufferData } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo, startLoop } from './demo-utils';

// Simple diff tracking
interface DiffCell { ch: string; changed: boolean }

const W = 40;
const H = 12;
let prevGrid: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ' '));
let currGrid: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ' '));
let diffCells: DiffCell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: ' ', changed: false })));
let changeCount = 0;
let totalCells = W * H;
let frame = 0;
let mode = 0; // 0=random, 1=wave, 2=text

// Fill with initial content
function fillRandom(): void {
	const chars = '░▒▓█ ·.·:;';
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			currGrid[y]![x] = chars[Math.floor(Math.random() * chars.length)]!;
}

function fillWave(t: number): void {
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const v = Math.sin(x * 0.3 + t * 0.1) + Math.sin(y * 0.5 + t * 0.15);
			const idx = Math.floor((v + 2) / 4 * 4);
			currGrid[y]![x] = ' ░▒▓█'[Math.max(0, Math.min(4, idx))]!;
		}
}

function fillText(t: number): void {
	const msg = 'Hello blECSd!  Diff rendering rocks!  ';
	const offset = Math.floor(t * 0.5) % msg.length;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (y === Math.floor(H / 2)) currGrid[y]![x] = msg[(x + offset) % msg.length]!;
			else currGrid[y]![x] = ' ';
		}
}

function computeDiff(): void {
	changeCount = 0;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const changed = currGrid[y]![x] !== prevGrid[y]![x];
			diffCells[y]![x] = { ch: currGrid[y]![x]!, changed };
			if (changed) changeCount++;
		}
}

function swapBuffers(): void {
	prevGrid = currGrid.map((row) => [...row]);
}

function render(): void {
	const { width, height } = getTerminalSize();
	const modes = ['Random', 'Wave', 'Text Scroll'];
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Diff Rendering Demo') + '\n');
	out.push(`  Mode: \x1b[33m${modes[mode]}\x1b[0m  Frame: ${frame}  Changed: \x1b[31m${changeCount}\x1b[0m/${totalCells} (\x1b[36m${(changeCount / totalCells * 100).toFixed(1)}%\x1b[0m)\n`);
	out.push('  ' + '\u2500'.repeat(W + 4) + '\n');

	// Draw grid showing diffs
	for (let y = 0; y < H; y++) {
		out.push('  \x1b[90m│\x1b[0m');
		for (let x = 0; x < W; x++) {
			const cell = diffCells[y]![x]!;
			if (cell.changed) out.push(`\x1b[42;30m${cell.ch}\x1b[0m`); // Green bg = changed
			else out.push(`\x1b[90m${cell.ch}\x1b[0m`); // Dim = unchanged
		}
		out.push('\x1b[90m│\x1b[0m\n');
	}

	out.push('  ' + '\u2500'.repeat(W + 4) + '\n');
	out.push('  \x1b[42;30m█\x1b[0m = changed cell  \x1b[90m█\x1b[0m = unchanged\n');
	out.push(`  \x1b[90mEfficiency: only ${changeCount} cells need update vs ${totalCells} full redraw\x1b[0m\n`);

	out.push(moveTo(height, 1) + formatHelpBar('[m] Mode  [Space] Step  [q] Quit'));
	process.stdout.write(out.join(''));
}

function step(): void {
	frame++;
	if (mode === 0) fillRandom();
	else if (mode === 1) fillWave(frame);
	else fillText(frame);
	computeDiff();
	swapBuffers();
}

function shutdown(): void { stop(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
step(); render();

const stop = startLoop(() => { step(); render(); }, 10);

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === 'm') mode = (mode + 1) % 3;
	if (ch === ' ') { step(); render(); }
});
