/**
 * Keyboard Input Demo
 *
 * Displays parsed key names and modifier states as you type.
 * Press Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/keyboard-input-demo.ts
 * @module demos/keyboard-input
 */
import { parseKeyBuffer, type KeyEvent } from 'blecsd';

const history: string[] = [];
const MAX_HISTORY = 15;

function formatKey(ev: KeyEvent): string {
	const mods: string[] = [];
	if (ev.ctrl) mods.push('Ctrl');
	if (ev.meta) mods.push('Alt');
	if (ev.shift) mods.push('Shift');
	const modStr = mods.length > 0 ? mods.join('+') + '+' : '';
	return `${modStr}${ev.name}`;
}

function formatRaw(data: Buffer): string {
	return Array.from(data)
		.map((b) => (b < 32 || b > 126 ? `\\x${b.toString(16).padStart(2, '0')}` : String.fromCharCode(b)))
		.join('');
}

function render(): void {
	const lines: string[] = [];
	lines.push('\x1b[2J\x1b[H');
	lines.push('\x1b[1m  Keyboard Input Demo\x1b[0m\n');
	lines.push('  Press any key to see parsed output. Ctrl+C to quit.\n');
	lines.push('  ───────────────────────────────────────────────────\n\n');
	lines.push('  \x1b[4mParsed Key          Modifiers         Raw Bytes\x1b[0m\n');

	for (const line of history) {
		lines.push(`  ${line}\n`);
	}

	if (history.length === 0) {
		lines.push('  \x1b[2m(waiting for input...)\x1b[0m\n');
	}
	process.stdout.write(lines.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		if (data[0] === 0x03) {
			shutdown();
			return;
		}

		const events = parseKeyBuffer(new Uint8Array(data));
		const rawStr = formatRaw(data);

		for (const ev of events) {
			const keyStr = formatKey(ev).padEnd(20);
			const mods = [ev.ctrl ? 'C' : '-', ev.meta ? 'A' : '-', ev.shift ? 'S' : '-'].join('');
			const modStr = `[${mods}]`.padEnd(18);
			history.push(`${keyStr}${modStr}${rawStr}`);
		}

		while (history.length > MAX_HISTORY) history.shift();
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
