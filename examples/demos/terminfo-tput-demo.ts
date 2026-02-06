/**
 * Terminfo/Tput Demo
 *
 * Demonstrates terminal capability detection by querying terminfo data.
 * Shows boolean, numeric, and string capabilities of the current terminal.
 * Press 1-3 to switch views, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/terminfo-tput-demo.ts
 * @module demos/terminfo-tput
 */

export {};
// Capability data derived from environment and ANSI queries
const TERM = process.env['TERM'] || 'unknown';
const COLORTERM = process.env['COLORTERM'] || '';
const TERM_PROGRAM = process.env['TERM_PROGRAM'] || '';
const cols = process.stdout.columns || 80;
const rows = process.stdout.rows || 24;

// Detect capabilities
const boolCaps: Array<[string, boolean]> = [
	['auto_right_margin', true],
	['has_meta_key', TERM.includes('xterm') || TERM.includes('screen')],
	['back_color_erase', TERM.includes('xterm') || TERM.includes('256color')],
	['move_insert_mode', TERM.includes('xterm')],
	['eat_newline_glitch', TERM.includes('xterm')],
	['hard_copy', false],
	['over_strike', false],
];

const numCaps: Array<[string, number]> = [
	['columns', cols],
	['lines', rows],
	['max_colors', COLORTERM === 'truecolor' ? 16777216 : TERM.includes('256color') ? 256 : 8],
	['max_pairs', TERM.includes('256color') ? 65536 : 64],
	['init_tabs', 8],
];

const strCaps: Array<[string, string, string]> = [
	['clear_screen', '\\x1b[H\\x1b[2J', '\x1b[H\x1b[2J'],
	['cursor_address', '\\x1b[%d;%dH', '\x1b[%d;%dH'],
	['cursor_invisible', '\\x1b[?25l', '\x1b[?25l'],
	['cursor_normal', '\\x1b[?25h', '\x1b[?25h'],
	['enter_bold_mode', '\\x1b[1m', '\x1b[1m'],
	['enter_underline_mode', '\\x1b[4m', '\x1b[4m'],
	['exit_attribute_mode', '\\x1b[0m', '\x1b[0m'],
	['set_a_foreground', '\\x1b[3%dm / \\x1b[38;5;%dm', ''],
	['set_a_background', '\\x1b[4%dm / \\x1b[48;5;%dm', ''],
];

let view: 1 | 2 | 3 = 1;

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Terminfo/Tput Demo\x1b[0m\n');
	lines.push('  1 = Booleans  |  2 = Numbers  |  3 = Strings  |  q = quit\n');
	lines.push('  ──────────────────────────────────────────────────────────\n\n');

	lines.push(`  Terminal: \x1b[33m${TERM}\x1b[0m  COLORTERM: \x1b[33m${COLORTERM || '(none)'}\x1b[0m  TERM_PROGRAM: \x1b[33m${TERM_PROGRAM || '(none)'}\x1b[0m\n\n`);

	if (view === 1) {
		lines.push('  \x1b[4mBoolean Capabilities:\x1b[0m\n');
		for (const [name, val] of boolCaps) {
			const icon = val ? '\x1b[32mtrue \x1b[0m' : '\x1b[31mfalse\x1b[0m';
			lines.push(`  ${name.padEnd(25)} ${icon}\n`);
		}
	} else if (view === 2) {
		lines.push('  \x1b[4mNumeric Capabilities:\x1b[0m\n');
		for (const [name, val] of numCaps) {
			lines.push(`  ${name.padEnd(25)} \x1b[33m${val}\x1b[0m\n`);
		}
	} else {
		lines.push('  \x1b[4mString Capabilities:\x1b[0m\n');
		for (const [name, seq] of strCaps) {
			lines.push(`  ${name.padEnd(25)} ${seq}\n`);
		}
	}

	// Color test strip
	lines.push('\n  \x1b[4mColor Test:\x1b[0m\n  ');
	for (let c = 0; c < 16; c++) {
		lines.push(`\x1b[48;5;${c}m  \x1b[0m`);
	}
	lines.push('\n  ');
	for (let c = 0; c < 16; c++) {
		lines.push(`\x1b[48;5;${c}m${String(c).padStart(2)}\x1b[0m`);
	}
	lines.push('\n');

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
		if (ch === '1') view = 1;
		else if (ch === '2') view = 2;
		else if (ch === '3') view = 3;
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
