/**
 * Streaming Renderer Demo
 *
 * Demonstrates real-time output streaming to the terminal.
 * Shows incremental rendering with a spinning animation and live log feed.
 * Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/streaming-renderer-demo.ts
 * @module demos/streaming-renderer
 */

export {};

const spinFrames = ['|', '/', '-', '\\'];
let frame = 0;
let logLines: string[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function timestamp(): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function render(): void {
	const cols = process.stdout.columns || 80;
	const spin = spinFrames[frame % spinFrames.length];
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  Streaming Renderer Demo\x1b[0m\n');
	out.push('  Streams output incrementally at 10 fps  |  q = quit\n');
	out.push('  ──────────────────────────────────────────────────────\n\n');

	// Progress bar
	const barWidth = Math.min(cols - 10, 40);
	const progress = (frame % 100) / 100;
	const filled = Math.floor(progress * barWidth);
	const bar = '\x1b[42m' + ' '.repeat(filled) + '\x1b[0m' + '\x1b[2m' + '░'.repeat(barWidth - filled) + '\x1b[0m';
	out.push(`  [${bar}] ${Math.floor(progress * 100)}%\n\n`);

	// Spinner
	out.push(`  Status: \x1b[33m${spin}\x1b[0m Streaming frame \x1b[1m${frame}\x1b[0m\n\n`);

	// Live log feed
	out.push('  \x1b[4mLive Log:\x1b[0m\n');
	const visible = logLines.slice(-10);
	for (const line of visible) {
		out.push(`  ${line}\n`);
	}

	// Throughput stats
	const chars = out.join('').length;
	out.push(`\n  \x1b[2mFrame bytes: ${chars}  Total frames: ${frame}\x1b[0m\n`);

	process.stdout.write(out.join(''));
}

function tick(): void {
	frame++;
	if (frame % 3 === 0) {
		const messages = ['Rendering cell buffer', 'Flushing output', 'Diffing buffers', 'Writing ANSI', 'Updating display'];
		logLines.push(`\x1b[2m${timestamp()}\x1b[0m  ${messages[frame % messages.length]}`);
		if (logLines.length > 50) logLines = logLines.slice(-30);
	}
	render();
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	timer = setInterval(tick, 100);

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }
	});
}

function shutdown(): void {
	if (timer) clearInterval(timer);
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
