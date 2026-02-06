/**
 * Buffer Output Demo
 *
 * Demonstrates buffered terminal output using createOutputBuffer and flushToStream.
 * Compares direct writes vs buffered writes for performance visualization.
 * Press Space to flush, r to reset, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/buffer-output-demo.ts
 * @module demos/buffer-output
 */

import {
	createOutputBuffer, writeRaw, flushToStream, beginFrame, endFrame,
} from '../../src/terminal/optimizedOutput';

const buffer = createOutputBuffer({ trackStats: true });
let writeCount = 0;
let flushCount = 0;
let mode: 'buffered' | 'direct' = 'buffered';

function render(): void {
	beginFrame(buffer);

	const header = [
		'\x1b[2J\x1b[H',
		'\x1b[1m  Buffer Output Demo\x1b[0m\n',
		`  Mode: \x1b[33m${mode}\x1b[0m  |  Space = write  |  f = flush  |  m = toggle mode  |  q = quit\n`,
		'  ──────────────────────────────────────────────────────────────────\n\n',
	].join('');

	if (mode === 'buffered') {
		writeRaw(buffer, header);
		writeRaw(buffer, `  Writes: \x1b[32m${writeCount}\x1b[0m  Flushes: \x1b[36m${flushCount}\x1b[0m\n\n`);

		writeRaw(buffer, '  \x1b[4mHow Buffered Output Works:\x1b[0m\n');
		writeRaw(buffer, '  1. Collect all writes into a single buffer\n');
		writeRaw(buffer, '  2. Call flush once to send everything to the terminal\n');
		writeRaw(buffer, '  3. Reduces syscalls and prevents tearing\n\n');

		// Write a visual indicator of buffer activity
		const barLen = Math.min(writeCount, 40);
		writeRaw(buffer, '  Buffer: [');
		writeRaw(buffer, '\x1b[42m' + ' '.repeat(barLen) + '\x1b[0m');
		writeRaw(buffer, ' '.repeat(Math.max(0, 40 - barLen)));
		writeRaw(buffer, ']\n\n');

		// Show some sample content
		writeRaw(buffer, '  \x1b[4mSample Buffered Content:\x1b[0m\n');
		for (let i = 0; i < 5; i++) {
			const c = (writeCount + i) % 8;
			writeRaw(buffer, `  \x1b[3${c}mLine ${i + 1}: Color ${c} text written to buffer\x1b[0m\n`);
		}

		endFrame(buffer);
		flushToStream(buffer, process.stdout);
	} else {
		// Direct mode: write straight to stdout
		process.stdout.write(header);
		process.stdout.write(`  Writes: \x1b[32m${writeCount}\x1b[0m  Flushes: \x1b[36m${flushCount}\x1b[0m\n\n`);
		process.stdout.write('  \x1b[4mDirect Write Mode:\x1b[0m\n');
		process.stdout.write('  Each write goes directly to stdout\n');
		process.stdout.write('  Multiple syscalls per frame\n\n');

		for (let i = 0; i < 5; i++) {
			const c = (writeCount + i) % 8;
			process.stdout.write(`  \x1b[3${c}mLine ${i + 1}: Direct write ${c}\x1b[0m\n`);
		}
	}
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }

		if (ch === ' ') {
			writeCount++;
		} else if (ch === 'f') {
			flushCount++;
		} else if (ch === 'm') {
			mode = mode === 'buffered' ? 'direct' : 'buffered';
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
