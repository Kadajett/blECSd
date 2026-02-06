/**
 * Virtual Data Structure Demo
 *
 * Demonstrates virtualized text storage: appending bulk content,
 * scrolling through a viewport, and viewing store statistics.
 * Press j/k to scroll, a to append more lines, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/virtual-data-structure-demo.ts
 * @module demos/virtual-data-structure
 */
import { createLineStore, getLineAtIndex, getStoreStats, appendToStore } from '../../src/utils/virtualizedLineStore';

let store = createLineStore(
	Array.from({ length: 200 }, (_, i) => `Line ${i + 1}: Sample content for virtualized storage testing.`).join('\n'),
);
let scrollOffset = 0;
const VIEWPORT = 15;

function render(): void {
	const stats = getStoreStats(store);
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Virtual Data Structure Demo\x1b[0m\n');
	lines.push('  j/k = scroll  |  J/K = page  |  a = append 100 lines  |  q = quit\n');
	lines.push('  ─────────────────────────────────────────────────────────────────\n\n');

	// Show viewport of lines
	lines.push('  \x1b[4mViewport:\x1b[0m\n');
	for (let i = 0; i < VIEWPORT; i++) {
		const idx = scrollOffset + i;
		const text = getLineAtIndex(store, idx);
		if (text === undefined) {
			lines.push('  \x1b[2m~\x1b[0m\n');
		} else {
			const preview = text.length > 60 ? text.slice(0, 60) + '...' : text;
			lines.push(`  ${String(idx + 1).padStart(5)} | ${preview}\n`);
		}
	}

	// Show store statistics
	lines.push('\n  \x1b[4mStore Statistics:\x1b[0m\n');
	lines.push(`  Total lines:   ${stats.lineCount}\n`);
	lines.push(`  Byte size:     ${stats.byteSize}\n`);
	lines.push(`  Avg line len:  ${stats.avgLineLength.toFixed(1)}\n`);
	lines.push(`  Scroll offset: ${scrollOffset}\n`);
	lines.push(`  Viewing:       ${scrollOffset + 1}-${Math.min(scrollOffset + VIEWPORT, stats.lineCount)} of ${stats.lineCount}\n`);
	process.stdout.write(lines.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }

		const stats = getStoreStats(store);
		if (ch === 'j') {
			scrollOffset = Math.min(scrollOffset + 1, Math.max(0, stats.lineCount - VIEWPORT));
		} else if (ch === 'k') {
			scrollOffset = Math.max(0, scrollOffset - 1);
		} else if (ch === 'J') {
			scrollOffset = Math.min(scrollOffset + VIEWPORT, Math.max(0, stats.lineCount - VIEWPORT));
		} else if (ch === 'K') {
			scrollOffset = Math.max(0, scrollOffset - VIEWPORT);
		} else if (ch === 'a') {
			const base = stats.lineCount;
			const extra = Array.from({ length: 100 }, (_, i) => `Line ${base + i + 1}: Dynamically appended content.`).join('\n');
			store = appendToStore(store, '\n' + extra);
		}
		render();
	});
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
