/**
 * Resize Handling Demo
 *
 * Demonstrates terminal resize detection and response.
 * Resize your terminal window to see the UI adapt in real time.
 * Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/resize-handling-demo.ts
 * @module demos/resize-handling
 */

export {};
let cols = process.stdout.columns || 80;
let rows = process.stdout.rows || 24;
let resizeCount = 0;
const history: Array<{ cols: number; rows: number; time: string }> = [];

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Resize Handling Demo\x1b[0m\n');
	lines.push('  Resize the terminal to see changes  |  q = quit\n');
	lines.push('  ────────────────────────────────────────────────\n\n');

	lines.push('  \x1b[4mCurrent Size:\x1b[0m\n');
	lines.push(`  Columns: \x1b[33m${cols}\x1b[0m\n`);
	lines.push(`  Rows:    \x1b[33m${rows}\x1b[0m\n`);
	lines.push(`  Resizes: ${resizeCount}\n\n`);

	// Draw a border that adapts to terminal size
	const boxW = Math.min(cols - 4, 50);
	const boxH = Math.min(rows - 18, 8);
	lines.push('  \x1b[4mAdaptive Box:\x1b[0m\n');
	lines.push(`  ${'┌' + '─'.repeat(Math.max(0, boxW - 2)) + '┐'}\n`);
	for (let r = 0; r < Math.max(0, boxH); r++) {
		const inner = `${cols}x${rows}`.padStart(Math.floor((boxW - 2) / 2) + Math.floor(`${cols}x${rows}`.length / 2)).padEnd(boxW - 2);
		lines.push(`  │${r === Math.floor(boxH / 2) ? inner : ' '.repeat(Math.max(0, boxW - 2))}│\n`);
	}
	lines.push(`  ${'└' + '─'.repeat(Math.max(0, boxW - 2)) + '┘'}\n\n`);

	// Resize history
	lines.push('  \x1b[4mResize History:\x1b[0m\n');
	const recent = history.slice(-6);
	for (const entry of recent) {
		lines.push(`  ${entry.time}  ${entry.cols}x${entry.rows}\n`);
	}
	if (history.length === 0) {
		lines.push('  \x1b[2m(resize terminal to see history)\x1b[0m\n');
	}

	process.stdout.write(lines.join(''));
}

function onResize(): void {
	cols = process.stdout.columns || 80;
	rows = process.stdout.rows || 24;
	resizeCount++;
	const now = new Date();
	const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
	history.push({ cols, rows, time });
	render();
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();

	// Listen for SIGWINCH (terminal resize signal)
	process.on('SIGWINCH', onResize);

	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }
		render();
	});
}

function shutdown(): void {
	process.removeListener('SIGWINCH', onResize);
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
