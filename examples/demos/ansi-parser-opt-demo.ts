/**
 * ANSI Parser Optimization Demo
 *
 * Demonstrates optimized ANSI sequence parsing performance.
 * Benchmarks parsing speed and shows parsed output.
 *
 * Run: npx tsx examples/demos/ansi-parser-opt-demo.ts
 * @module demos/ansi-parser-opt
 */
import { stripAnsi, getVisibleWidth, parseKeyBuffer } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

// Sample ANSI strings for parsing
const samples = [
	{ name: 'Colors', text: '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m' },
	{ name: 'Bold+Color', text: '\x1b[1;33mBold Yellow\x1b[0m normal \x1b[4;36mUnderline Cyan\x1b[0m' },
	{ name: 'RGB', text: '\x1b[38;2;255;100;50mRGB(255,100,50)\x1b[0m \x1b[48;2;0;100;200mBG RGB\x1b[0m' },
	{ name: 'Nested', text: '\x1b[1m\x1b[31m\x1b[4mBold+Red+Underline\x1b[0m' },
	{ name: 'Mixed', text: 'Plain \x1b[7mInverted\x1b[27m \x1b[9mStrike\x1b[29m normal' },
	{ name: 'Cursor', text: '\x1b[2;5H\x1b[K\x1b[1A\x1b[2B' },
];

let selectedSample = 0;
let benchResults: Array<{ name: string; ops: number; time: number }> = [];

function runBenchmark(): void {
	benchResults = [];
	for (const sample of samples) {
		const iterations = 10000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			stripAnsi(sample.text);
			getVisibleWidth(sample.text);
		}
		const elapsed = performance.now() - start;
		benchResults.push({
			name: sample.name,
			ops: Math.round(iterations * 2 / (elapsed / 1000)),
			time: elapsed,
		});
	}

	// Bulk benchmark
	const bigStr = samples.map((s) => s.text).join(' ').repeat(100);
	const bulkIters = 1000;
	const bulkStart = performance.now();
	for (let i = 0; i < bulkIters; i++) stripAnsi(bigStr);
	const bulkTime = performance.now() - bulkStart;
	benchResults.push({
		name: 'Bulk (100x concat)',
		ops: Math.round(bulkIters / (bulkTime / 1000)),
		time: bulkTime,
	});
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('ANSI Parser Optimization Demo') + '\n\n');

	// Show samples
	out.push('  \x1b[1mSamples:\x1b[0m\n');
	for (let i = 0; i < samples.length; i++) {
		const s = samples[i]!;
		const sel = i === selectedSample ? '\x1b[33m> ' : '  ';
		out.push(`  ${sel}${s.name.padEnd(12)}\x1b[0m ${s.text}\n`);
	}

	// Show parsed details for selected sample
	const sample = samples[selectedSample]!;
	out.push('\n  \x1b[1mParsed Details:\x1b[0m\n');
	out.push(`    Raw length:     \x1b[36m${sample.text.length}\x1b[0m bytes\n`);
	out.push(`    Stripped:       "\x1b[32m${stripAnsi(sample.text)}\x1b[0m"\n`);
	out.push(`    Visible width:  \x1b[36m${getVisibleWidth(sample.text)}\x1b[0m\n`);
	out.push(`    ANSI overhead:  \x1b[33m${sample.text.length - stripAnsi(sample.text).length}\x1b[0m bytes\n`);

	// Benchmark results
	if (benchResults.length > 0) {
		out.push('\n  \x1b[1mBenchmark Results:\x1b[0m\n');
		for (const r of benchResults) {
			const bar = '\x1b[42m' + ' '.repeat(Math.min(30, Math.floor(r.ops / 50000))) + '\x1b[0m';
			out.push(`    ${r.name.padEnd(20)} ${String(r.ops).padStart(10)} ops/s  ${r.time.toFixed(1)}ms  ${bar}\n`);
		}
	} else {
		out.push('\n  \x1b[90mPress [b] to run benchmark\x1b[0m\n');
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Select  [b] Benchmark  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\x1b[A') selectedSample = Math.max(0, selectedSample - 1);
	if (ch === '\x1b[B') selectedSample = Math.min(samples.length - 1, selectedSample + 1);
	if (ch === 'b') runBenchmark();
	render();
});
