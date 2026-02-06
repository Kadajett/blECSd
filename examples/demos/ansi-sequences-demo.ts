/**
 * ANSI Sequences Demo
 *
 * Shows direct ANSI escape sequence usage for colors, styles, and cursor control.
 * Press 1-4 to switch views, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/ansi-sequences-demo.ts
 * @module demos/ansi-sequences
 */

export {};

let view: 1 | 2 | 3 | 4 = 1;

function renderColors(): string[] {
	const lines: string[] = [];
	lines.push('  \x1b[4m16 Basic Colors:\x1b[0m\n');
	let row = '  ';
	for (let c = 0; c < 8; c++) row += `\x1b[4${c}m  \x1b[0m`;
	lines.push(row + '\n  ');
	for (let c = 0; c < 8; c++) row = '';
	row = '  ';
	for (let c = 0; c < 8; c++) row += `\x1b[10${c}m  \x1b[0m`;
	lines.push(row + '\n\n');

	lines.push('  \x1b[4m256-Color Palette (partial):\x1b[0m\n  ');
	for (let c = 16; c < 52; c++) {
		lines.push(`\x1b[48;5;${c}m  \x1b[0m`);
		if ((c - 16) % 36 === 35) lines.push('\n  ');
	}
	lines.push('\n  ');
	for (let c = 52; c < 88; c++) {
		lines.push(`\x1b[48;5;${c}m  \x1b[0m`);
	}
	lines.push('\n\n  \x1b[4mTruecolor Gradient:\x1b[0m\n  ');
	for (let i = 0; i < 40; i++) {
		const r = Math.floor((i / 40) * 255);
		const b = 255 - r;
		lines.push(`\x1b[48;2;${r};0;${b}m \x1b[0m`);
	}
	lines.push('\n');
	return lines;
}

function renderStyles(): string[] {
	return [
		'  \x1b[4mText Attributes:\x1b[0m\n',
		'  \x1b[1mBold\x1b[0m  \x1b[2mDim\x1b[0m  \x1b[3mItalic\x1b[0m  \x1b[4mUnderline\x1b[0m  \x1b[7mReverse\x1b[0m  \x1b[9mStrike\x1b[0m\n\n',
		'  \x1b[4mCombined:\x1b[0m\n',
		'  \x1b[1;31mBold Red\x1b[0m  \x1b[4;32mUnderline Green\x1b[0m  \x1b[1;4;33mBold+Underline Yellow\x1b[0m\n',
		'  \x1b[3;36mItalic Cyan\x1b[0m  \x1b[1;7;35mBold Reverse Magenta\x1b[0m\n\n',
		'  \x1b[4mForeground Colors:\x1b[0m\n',
		'  \x1b[30mBlack\x1b[0m \x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[33mYellow\x1b[0m \x1b[34mBlue\x1b[0m \x1b[35mMagenta\x1b[0m \x1b[36mCyan\x1b[0m \x1b[37mWhite\x1b[0m\n',
		'  \x1b[90mBrBlack\x1b[0m \x1b[91mBrRed\x1b[0m \x1b[92mBrGreen\x1b[0m \x1b[93mBrYellow\x1b[0m \x1b[94mBrBlue\x1b[0m \x1b[95mBrMagenta\x1b[0m \x1b[96mBrCyan\x1b[0m \x1b[97mBrWhite\x1b[0m\n',
	];
}

function renderCursor(): string[] {
	return [
		'  \x1b[4mCursor Sequences:\x1b[0m\n\n',
		'  \\x1b[H       \x1b[2m- Move to home (0,0)\x1b[0m\n',
		'  \\x1b[<r>;<c>H \x1b[2m- Move to row;col\x1b[0m\n',
		'  \\x1b[<n>A     \x1b[2m- Move up n lines\x1b[0m\n',
		'  \\x1b[<n>B     \x1b[2m- Move down n lines\x1b[0m\n',
		'  \\x1b[<n>C     \x1b[2m- Move forward n cols\x1b[0m\n',
		'  \\x1b[<n>D     \x1b[2m- Move backward n cols\x1b[0m\n',
		'  \\x1b[?25l    \x1b[2m- Hide cursor\x1b[0m\n',
		'  \\x1b[?25h    \x1b[2m- Show cursor\x1b[0m\n',
		'  \\x1b[s       \x1b[2m- Save cursor position\x1b[0m\n',
		'  \\x1b[u       \x1b[2m- Restore cursor position\x1b[0m\n',
	];
}

function renderScreen(): string[] {
	return [
		'  \x1b[4mScreen Control:\x1b[0m\n\n',
		'  \\x1b[2J       \x1b[2m- Clear entire screen\x1b[0m\n',
		'  \\x1b[K        \x1b[2m- Clear to end of line\x1b[0m\n',
		'  \\x1b[1K       \x1b[2m- Clear to start of line\x1b[0m\n',
		'  \\x1b[2K       \x1b[2m- Clear entire line\x1b[0m\n',
		'  \\x1b[?1049h   \x1b[2m- Enter alt screen\x1b[0m\n',
		'  \\x1b[?1049l   \x1b[2m- Leave alt screen\x1b[0m\n',
		'  \\x1b[0m       \x1b[2m- Reset all attributes\x1b[0m\n',
		'  \\x1b[<n>m     \x1b[2m- Set SGR attribute\x1b[0m\n',
	];
}

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  ANSI Sequences Demo\x1b[0m\n');
	out.push('  1=Colors  2=Styles  3=Cursor  4=Screen  |  q = quit\n');
	out.push('  ──────────────────────────────────────────────────────\n\n');

	if (view === 1) out.push(...renderColors());
	else if (view === 2) out.push(...renderStyles());
	else if (view === 3) out.push(...renderCursor());
	else out.push(...renderScreen());

	process.stdout.write(out.join(''));
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
		else if (ch === '4') view = 4;
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
