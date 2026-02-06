/**
 * VirtualizedList Demo
 *
 * Demonstrates a virtualized list widget that efficiently renders
 * only visible items from a large dataset.
 *
 * Run: npx tsx examples/demos/virtualized-list-demo.ts
 * @module demos/virtualized-list
 */
import { createWorld } from 'blecsd';
import { createVirtualizedList, handleVirtualizedListKey } from 'blecsd/widgets';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();

// Generate a large dataset
const lines: string[] = [];
const categories = ['File', 'Folder', 'Image', 'Video', 'Audio', 'Archive', 'Script', 'Config'];
const exts = ['.ts', '.js', '.json', '.png', '.mp4', '.zip', '.sh', '.yaml'];
for (let i = 0; i < 10000; i++) {
	const cat = categories[i % categories.length]!;
	const ext = exts[i % exts.length]!;
	lines.push(`${cat}-${String(i + 1).padStart(5, '0')}${ext}`);
}

const { height: termH } = getTerminalSize();
const viewHeight = Math.max(10, termH - 7);

// Create the VirtualizedList widget (returns an object with methods)
const list = createVirtualizedList(world, {
	width: 60,
	height: viewHeight,
	lines,
});

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('VirtualizedList Demo') + '\n');

	const total = list.getLineCount();
	const cursor = list.getCursor();
	const scrollInfo = list.getScrollInfo();
	const firstVisible = scrollInfo?.scrollTop ?? 0;

	out.push(`  Items: \x1b[36m${total}\x1b[0m  Cursor: \x1b[33m${cursor + 1}\x1b[0m  Visible from: \x1b[32m${firstVisible + 1}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 62)) + '\n');

	// Render visible lines manually
	for (let i = 0; i < viewHeight; i++) {
		const lineIdx = firstVisible + i;
		const line = list.getLine(lineIdx);
		if (line === undefined) { out.push(' \x1b[90m~\x1b[0m\n'); continue; }
		const isSelected = lineIdx === cursor;
		const prefix = isSelected ? '\x1b[33m> ' : '  ';
		const bg = isSelected ? '\x1b[7m' : '';
		const lineNum = `\x1b[90m${String(lineIdx + 1).padStart(6)}\x1b[0m`;
		out.push(`${prefix}${lineNum} ${bg}${line}\x1b[0m\n`);
	}

	const scrollPct = total > 0 ? ((cursor + 1) / total * 100).toFixed(0) : '0';
	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Navigate  [PgUp/PgDn] Page  [Home/End] Jump  [q] Quit', `${scrollPct}%`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { list.destroy(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();

	// Manual key handling since widget's key handler may not cover everything
	if (ch === '\x1b[A') list.cursorUp();
	else if (ch === '\x1b[B') list.cursorDown();
	else if (ch === '\x1b[5~') list.scrollPage(-1);
	else if (ch === '\x1b[6~') list.scrollPage(1);
	else if (ch === '\x1b[H') list.scrollToTop();
	else if (ch === '\x1b[F') list.scrollToBottom();
	else handleVirtualizedListKey(list, ch);

	render();
});
