#!/usr/bin/env node
/** Fast Word Wrap Demo - cached word wrap with dynamic width resizing.
 * Run: npx tsx examples/demos/fast-word-wrap-demo.ts | Quit: q or Ctrl+C */
import { wordWrap } from 'blecsd';
import { createWrapCache, wrapWithCache, resizeWrapCache, getWrapCacheStats } from '../../src/utils/fastWrap';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');

const TEXT = [
	'The quick brown fox jumps over the lazy dog. This classic pangram contains every letter of the English alphabet at least once, making it perfect for testing text rendering.',
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
	'Short paragraph.',
	'blECSd is a modern terminal UI library built on an Entity Component System architecture. It provides high-performance rendering, composable widgets, and game-ready features like particle effects, tilemaps, and audio hooks.',
	'Unicode support: special chars, arrows, symbols, math operators, and box drawing characters are all handled correctly by the width calculation.',
].join('\n\n');

let wrapW = Math.min(50, termW - 10);
const cache = createWrapCache(wrapW);
let scrollY = 0;

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mFast Word Wrap Demo\x1b[0m');
	const t0 = performance.now();
	const cached = wrapWithCache(cache, TEXT);
	const ct = performance.now() - t0;
	const t1 = performance.now();
	wordWrap(TEXT, wrapW);
	const bt = performance.now() - t1;
	const stats = getWrapCacheStats(cache);
	stdout.write(`\x1b[2;3H\x1b[90mWidth: ${wrapW} | Cached: ${ct.toFixed(2)}ms | Basic: ${bt.toFixed(2)}ms\x1b[0m`);
	stdout.write(`\x1b[3;3H\x1b[90mParas: ${stats.paragraphCount} | Cached: ${stats.cachedCount} | Lines: ${stats.totalLines}\x1b[0m`);
	const viewH = termH - 7;
	const x = 3, y = 5;
	// Wrap boundary marker
	for (let r = 0; r < viewH; r++) stdout.write(`\x1b[${y + r};${x + wrapW + 1}H\x1b[90m|\x1b[0m`);
	// Wrapped lines
	for (let i = 0; i < viewH; i++) {
		if (scrollY + i >= cached.length) break;
		stdout.write(`\x1b[${y + i};${x}H\x1b[37m${cached[scrollY + i]}\x1b[0m`);
	}
	stdout.write(`\x1b[${termH - 1};1H\x1b[33m[Left/Right] Width  [Up/Down] Scroll  [q] Quit  \x1b[90m${scrollY + 1}-${Math.min(scrollY + viewH, cached.length)}/${cached.length}\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	const cached = wrapWithCache(cache, TEXT);
	const viewH = termH - 7;
	const maxS = Math.max(0, cached.length - viewH);
	if (key === '\x1b[A' || key === 'k') scrollY = Math.max(0, scrollY - 1);
	if (key === '\x1b[B' || key === 'j') scrollY = Math.min(maxS, scrollY + 1);
	if (key === '\x1b[D' || key === 'h') { wrapW = Math.max(20, wrapW - 5); resizeWrapCache(cache, wrapW); scrollY = 0; }
	if (key === '\x1b[C' || key === 'l') { wrapW = Math.min(termW - 10, wrapW + 5); resizeWrapCache(cache, wrapW); scrollY = 0; }
	render();
});
