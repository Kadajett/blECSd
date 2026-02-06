/**
 * Cell Buffer Demo
 *
 * Demonstrates basic cell type and screen buffer operations.
 * Arrow keys to move cursor, space to paint, c to clear, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/cell-buffer-demo.ts
 * @module demos/cell-buffer
 */
import { createCellBuffer } from 'blecsd';
import type { CellBuffer } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, parseArrowKey, isQuitKey } from './demo-utils';

const BUF_W = 40;
const BUF_H = 15;
const COLORS = [0x00ff00, 0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
const CHARS = ['█', '▓', '▒', '░', '●', '◆'];

// CellBuffer cells is a 2D array: cells[y][x]
let buf = createCellBuffer(BUF_W, BUF_H);
let curX = 0;
let curY = 0;
let colorIdx = 0;
let charIdx = 0;

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Cell Buffer Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mArrows = move  |  Space = paint  |  1-6 = color  |  Tab = char  |  c = clear\x1b[0m');

	// Draw buffer contents
	const startRow = 4;
	const startCol = 4;
	for (let y = 0; y < BUF_H; y++) {
		let line = '';
		for (let x = 0; x < BUF_W; x++) {
			const row = (buf as { cells: Array<Array<{ char: string; fg: number; bg: number }>> }).cells[y];
			const cell = row?.[x];
			if (cell && cell.char !== ' ') {
				const r = (cell.fg >> 16) & 0xff;
				const g = (cell.fg >> 8) & 0xff;
				const b = cell.fg & 0xff;
				line += `\x1b[38;2;${r};${g};${b}m${cell.char}\x1b[0m`;
			} else {
				line += '\x1b[90m·\x1b[0m';
			}
		}
		out.push(moveTo(startRow + y, startCol) + line);
	}

	// Draw cursor
	out.push(moveTo(startRow + curY, startCol + curX) + '\x1b[7m \x1b[0m');

	// Info panel
	const infoCol = startCol + BUF_W + 4;
	out.push(moveTo(startRow, infoCol) + '\x1b[1mBuffer Info\x1b[0m');
	out.push(moveTo(startRow + 1, infoCol) + `Size: ${BUF_W}x${BUF_H}`);
	out.push(moveTo(startRow + 2, infoCol) + `Cursor: ${curX},${curY}`);
	const cr = (COLORS[colorIdx]! >> 16) & 0xff;
	const cg = (COLORS[colorIdx]! >> 8) & 0xff;
	const cb = COLORS[colorIdx]! & 0xff;
	out.push(moveTo(startRow + 3, infoCol) + `Color: \x1b[38;2;${cr};${cg};${cb}m████\x1b[0m [${colorIdx + 1}]`);
	out.push(moveTo(startRow + 4, infoCol) + `Char: ${CHARS[charIdx]} [Tab]`);

	out.push(moveTo(height, 1) + formatHelpBar('[Arrows] Move  [Space] Paint  [1-6] Color  [Tab] Char  [c] Clear  [q] Quit'));
	process.stdout.write(out.join(''));
}

function paint(): void {
	// Use setCell method from CellBuffer interface
	buf.setCell(curX, curY, CHARS[charIdx]!, COLORS[colorIdx]!);
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }

setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const arrow = parseArrowKey(data);
	if (arrow === 'up') curY = Math.max(0, curY - 1);
	if (arrow === 'down') curY = Math.min(BUF_H - 1, curY + 1);
	if (arrow === 'left') curX = Math.max(0, curX - 1);
	if (arrow === 'right') curX = Math.min(BUF_W - 1, curX + 1);
	if (ch === ' ') paint();
	if (ch === 'c') buf = createCellBuffer(BUF_W, BUF_H);
	if (ch === '\t') charIdx = (charIdx + 1) % CHARS.length;
	if (ch >= '1' && ch <= '6') colorIdx = Number.parseInt(ch) - 1;
	render();
});
