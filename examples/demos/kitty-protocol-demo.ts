/**
 * Kitty Protocol Demo
 *
 * Demonstrates Kitty keyboard protocol detection and key event parsing.
 * Shows the protocol query, response parsing, and enhanced key events
 * including press/release detection. Press Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/kitty-protocol-demo.ts
 * @module demos/kitty-protocol
 */
import { parseKeyBuffer, type KeyEvent } from 'blecsd';

// Kitty keyboard protocol constants
const CSI = '\x1b[';
const KITTY_QUERY = `${CSI}?u`; // Query current keyboard mode
const KITTY_PUSH = `${CSI}>1u`; // Push mode 1: disambiguate escape codes
const KITTY_POP = `${CSI}<u`; // Pop (restore previous mode)

let kittyActive = false;
let kittySupported: boolean | null = null;
const eventLog: string[] = [];
const MAX_LOG = 12;

function formatRaw(data: Buffer): string {
	return Array.from(data)
		.map((b) => (b < 32 || b > 126 ? `\\x${b.toString(16).padStart(2, '0')}` : String.fromCharCode(b)))
		.join('');
}

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Kitty Protocol Demo\x1b[0m\n');
	lines.push('  k = toggle Kitty mode  |  Ctrl+C = quit\n');
	lines.push('  ────────────────────────────────────────\n\n');

	lines.push('  \x1b[4mProtocol Status:\x1b[0m\n');
	const supportStr = kittySupported === null ? '\x1b[33munknown\x1b[0m' : kittySupported ? '\x1b[32myes\x1b[0m' : '\x1b[31mno\x1b[0m';
	lines.push(`  Kitty supported: ${supportStr}\n`);
	lines.push(`  Kitty active:    ${kittyActive ? '\x1b[32mON\x1b[0m (mode 1: disambiguate)' : '\x1b[2mOFF\x1b[0m'}\n`);
	lines.push(`  Sequences:       Query=${formatRaw(Buffer.from(KITTY_QUERY))}  Push=${formatRaw(Buffer.from(KITTY_PUSH))}\n\n`);

	lines.push('  \x1b[4mKey Events:\x1b[0m\n');
	for (const entry of eventLog) {
		lines.push(`  ${entry}\n`);
	}
	if (eventLog.length === 0) {
		lines.push('  \x1b[2m(press any key to see events)\x1b[0m\n');
	}

	lines.push('\n  \x1b[2mNote: Kitty protocol requires a compatible terminal (Kitty, WezTerm, foot, etc.)\x1b[0m\n');
	process.stdout.write(lines.join(''));
}

function logEvent(label: string, data: Buffer): void {
	const events = parseKeyBuffer(new Uint8Array(data));
	const raw = formatRaw(data);
	for (const ev of events) {
		const mods: string[] = [];
		if (ev.ctrl) mods.push('C');
		if (ev.meta) mods.push('A');
		if (ev.shift) mods.push('S');
		const modStr = mods.length > 0 ? `[${mods.join('')}]` : '[---]';
		eventLog.push(`${label} ${ev.name.padEnd(12)} ${modStr.padEnd(6)} raw=${raw}`);
	}
	while (eventLog.length > MAX_LOG) eventLog.shift();
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str[0] === '\x03') { shutdown(); return; }

		// Check for Kitty protocol response: CSI ? <flags> u
		if (str.startsWith('\x1b[?') && str.endsWith('u')) {
			kittySupported = true;
			eventLog.push(`  Protocol response: ${formatRaw(data)}`);
			while (eventLog.length > MAX_LOG) eventLog.shift();
			render();
			return;
		}

		// Toggle Kitty mode
		if (str === 'k' && !kittyActive) {
			kittyActive = true;
			process.stdout.write(KITTY_PUSH);
			eventLog.push('  >> Pushed Kitty mode 1 (disambiguate)');
		} else if (str === 'k' && kittyActive) {
			kittyActive = false;
			process.stdout.write(KITTY_POP);
			eventLog.push('  >> Popped Kitty mode (legacy)');
		} else {
			logEvent(kittyActive ? 'KITTY' : 'LEGCY', data);
		}
		while (eventLog.length > MAX_LOG) eventLog.shift();
		render();
	});

	// Query if kitty is supported
	process.stdout.write(KITTY_QUERY);
	setTimeout(() => {
		if (kittySupported === null) kittySupported = false;
		render();
	}, 200);
}

function shutdown(): void {
	if (kittyActive) process.stdout.write(KITTY_POP);
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
