/**
 * VirtualizedLineStore Demo
 *
 * Demonstrates the line store for efficient large content management.
 * Shows chunk-based storage, line access, and memory stats.
 *
 * Run: npx tsx examples/demos/virtualized-line-store-demo.ts
 * @module demos/virtualized-line-store
 */
import { createLineStoreFromLines, appendToStore, getLineAtIndex, getStoreStats, getByteSize, isStoreEmpty } from 'blecsd/utils';
import type { VirtualizedLineStore } from 'blecsd/utils';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, parseNavKey, getTerminalSize, moveTo } from './demo-utils';

// Create a line store with sample content
const lines: string[] = [];
for (let i = 0; i < 5000; i++) {
	const indent = '  '.repeat(Math.floor(Math.random() * 4));
	const types = ['function', 'const', 'let', 'if', 'for', 'return', '//'];
	const type = types[i % types.length]!;
	lines.push(`${indent}${type} line_${i + 1}(${i % 10 === 0 ? '/* block */' : ''})`);
}

let store = createLineStoreFromLines(lines);
let scrollPos = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const viewH = height - 8;
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('VirtualizedLineStore Demo') + '\n');

	const stats = getStoreStats(store);
	const bytes = getByteSize(store);
	out.push(`  Lines: \x1b[36m${stats.lineCount}\x1b[0m  Chunks: \x1b[33m${stats.chunkCount}\x1b[0m  Size: \x1b[32m${(bytes / 1024).toFixed(1)}KB\x1b[0m  Empty: ${isStoreEmpty(store) ? 'yes' : 'no'}\n`);
	out.push(`  Scroll: \x1b[90m${scrollPos + 1}-${Math.min(scrollPos + viewH, stats.lineCount)} of ${stats.lineCount}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 70)) + '\n');

	// Display visible lines
	for (let i = 0; i < viewH; i++) {
		const lineIdx = scrollPos + i;
		const line = getLineAtIndex(store, lineIdx);
		if (line !== undefined) {
			const num = `\x1b[90m${String(lineIdx + 1).padStart(5)}\x1b[0m`;
			const text = line.slice(0, width - 9);
			// Simple syntax highlighting
			const highlighted = text
				.replace(/\b(function|const|let|if|for|return)\b/g, '\x1b[35m$1\x1b[0m')
				.replace(/(\/\/.*)/g, '\x1b[90m$1\x1b[0m')
				.replace(/(\/\*.*?\*\/)/g, '\x1b[90m$1\x1b[0m');
			out.push(` ${num} ${highlighted}\n`);
		} else {
			out.push(' \x1b[90m~\x1b[0m\n');
		}
	}

	const maxScroll = Math.max(0, stats.lineCount - viewH);
	const pct = maxScroll > 0 ? ((scrollPos / maxScroll) * 100).toFixed(0) : '100';
	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Scroll  [PgUp/PgDn] Page  [a] Add lines  [q] Quit', `${pct}%`));
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
	const viewH = height - 8;
	const stats = getStoreStats(store);
	const maxScroll = Math.max(0, stats.lineCount - viewH);

	if (dir === 'up') scrollPos = Math.max(0, scrollPos - 1);
	if (dir === 'down') scrollPos = Math.min(maxScroll, scrollPos + 1);
	if (nav === 'pageup') scrollPos = Math.max(0, scrollPos - viewH);
	if (nav === 'pagedown') scrollPos = Math.min(maxScroll, scrollPos + viewH);
	if (nav === 'home') scrollPos = 0;
	if (nav === 'end') scrollPos = maxScroll;
	if (ch === 'a') {
		// Append more lines
		let batch = '';
		for (let i = 0; i < 500; i++) batch += `// appended line ${stats.lineCount + i + 1}\n`;
		store = appendToStore(store, batch);
	}
	render();
});
