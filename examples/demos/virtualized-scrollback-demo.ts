/**
 * Virtualized Scrollback Demo
 *
 * Demonstrates the chunked scrollback buffer for large content.
 * Efficiently handles thousands of lines with windowed access.
 *
 * Run: npx tsx examples/demos/virtualized-scrollback-demo.ts
 * @module demos/virtualized-scrollback
 */
import {
	createScrollbackBuffer, appendLine, appendLines,
	getVisibleLines, getScrollbackLine, getScrollbackStats, getMemoryUsage,
	scrollScrollbackBy, scrollbackToTop, scrollbackToBottom, jumpToLine,
	clearScrollback,
} from 'blecsd';
import type { ScrollbackBuffer } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, parseNavKey, getTerminalSize, moveTo } from './demo-utils';

// Create buffer with small chunk size for demo purposes
let buffer = createScrollbackBuffer({ chunkSize: 100, maxCachedChunks: 50, maxMemoryBytes: 10 * 1024 * 1024 });

// Fill with sample lines
const sampleLines: string[] = [];
for (let i = 0; i < 2000; i++) {
	const types = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
	const type = types[i % types.length]!;
	const color = { INFO: '36', WARN: '33', ERROR: '31', DEBUG: '90' }[type]!;
	sampleLines.push(`\x1b[${color}m[${type}]\x1b[0m Line ${i + 1}: ${type === 'ERROR' ? 'Something went wrong!' : type === 'WARN' ? 'Check this value' : 'Normal operation'}`);
}
buffer = appendLines(buffer, sampleLines);

function render(): void {
	const { width, height } = getTerminalSize();
	const viewH = height - 6;
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Virtualized Scrollback Demo') + '\n');

	const stats = getScrollbackStats(buffer);
	const mem = getMemoryUsage(buffer);
	out.push(`  Lines: \x1b[36m${stats.totalLines}\x1b[0m  Chunks: \x1b[33m${stats.totalChunks}\x1b[0m  Cached: \x1b[32m${stats.cachedChunks}\x1b[0m  Memory: \x1b[90m${(mem / 1024).toFixed(1)}KB\x1b[0m\n`);

	// Get visible window
	const visible = getVisibleLines(buffer, viewH);
	const scrollPos = buffer.scrollOffset;
	const maxScroll = Math.max(0, stats.totalLines - viewH);
	const pct = maxScroll > 0 ? (scrollPos / maxScroll * 100).toFixed(0) : '100';

	out.push(`  Scroll: ${scrollPos}/${maxScroll} (${pct}%)\n`);

	// Render visible lines
	for (let i = 0; i < viewH; i++) {
		const line = visible[i];
		if (line) {
			const lineNum = `\x1b[90m${String(scrollPos + i + 1).padStart(5)}\x1b[0m `;
			const text = line.text.slice(0, width - 8);
			out.push(lineNum + text + '\n');
		} else {
			out.push('\x1b[90m~\x1b[0m\n');
		}
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Scroll  [PgUp/PgDn] Page  [Home/End] Jump  [a] Add 100  [c] Clear  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const dir = parseArrowKey(data);
	const nav = parseNavKey(data);
	const { height } = getTerminalSize();
	const pageSize = height - 6;

	if (dir === 'up') buffer = scrollScrollbackBy(buffer, -1);
	if (dir === 'down') buffer = scrollScrollbackBy(buffer, 1);
	if (nav === 'pageup') buffer = scrollScrollbackBy(buffer, -pageSize);
	if (nav === 'pagedown') buffer = scrollScrollbackBy(buffer, pageSize);
	if (nav === 'home') buffer = scrollbackToTop(buffer);
	if (nav === 'end') buffer = scrollbackToBottom(buffer, pageSize);
	if (ch === 'a') {
		// Add 100 more lines
		const lines: string[] = [];
		const base = getScrollbackStats(buffer).totalLines;
		for (let i = 0; i < 100; i++) lines.push(`\x1b[32m[NEW]\x1b[0m Added line ${base + i + 1}`);
		buffer = appendLines(buffer, lines);
	}
	if (ch === 'c') buffer = clearScrollback(buffer);
	if (ch === 'g') buffer = jumpToLine(buffer, 500, pageSize);
	render();
});
