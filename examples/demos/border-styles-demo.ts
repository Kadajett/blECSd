/**
 * Border Styles Demo
 *
 * Displays all five built-in border character sets: single, double, rounded, bold, ASCII.
 * Press 1-5 to highlight a style, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/border-styles-demo.ts
 * @module demos/border-styles
 */

import { BOX_SINGLE, BOX_DOUBLE, BOX_ROUNDED, BOX_BOLD, BOX_ASCII } from 'blecsd';

const styles = [
	{ name: 'Single',  chars: BOX_SINGLE },
	{ name: 'Double',  chars: BOX_DOUBLE },
	{ name: 'Rounded', chars: BOX_ROUNDED },
	{ name: 'Bold',    chars: BOX_BOLD },
	{ name: 'ASCII',   chars: BOX_ASCII },
];

let selected = 0;

function drawBox(chars: typeof BOX_SINGLE, w: number, h: number, highlight: boolean): string[] {
	const fg = highlight ? '\x1b[33m' : '\x1b[0m';
	const reset = '\x1b[0m';
	const lines: string[] = [];
	lines.push(`${fg}${chars.topLeft}${chars.horizontal.repeat(w - 2)}${chars.topRight}${reset}`);
	for (let r = 0; r < h - 2; r++) {
		lines.push(`${fg}${chars.vertical}${' '.repeat(w - 2)}${chars.vertical}${reset}`);
	}
	lines.push(`${fg}${chars.bottomLeft}${chars.horizontal.repeat(w - 2)}${chars.bottomRight}${reset}`);
	return lines;
}

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  Border Styles Demo\x1b[0m\n');
	out.push('  Press 1-5 to highlight  |  q = quit\n');
	out.push('  ──────────────────────────────────────\n\n');

	for (let i = 0; i < styles.length; i++) {
		const s = styles[i];
		const hi = i === selected;
		const label = hi ? `\x1b[1;33m${s.name}\x1b[0m` : s.name;
		out.push(`  ${label}\n`);
		const box = drawBox(s.chars, 20, 4, hi);
		for (const line of box) {
			out.push(`  ${line}\n`);
		}
		out.push('\n');
	}

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
		const num = Number.parseInt(ch, 10);
		if (num >= 1 && num <= 5) selected = num - 1;
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
