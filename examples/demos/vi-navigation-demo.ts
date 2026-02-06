/**
 * Vi Navigation Demo
 *
 * Move a cursor with h/j/k/l (Vi-style) in a grid.
 * Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/vi-navigation-demo.ts
 * @module demos/vi-navigation
 */
export {};
const GRID_W = 20;
const GRID_H = 10;
let curX = 10;
let curY = 5;
let mode: 'NORMAL' | 'INSERT' = 'NORMAL';
const trail: Array<[number, number]> = [];

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Vi Navigation Demo\x1b[0m\n');
	lines.push(`  Mode: \x1b[33m${mode}\x1b[0m  |  h/j/k/l = move  |  i = insert mode  |  Esc = normal  |  q = quit\n`);
	lines.push('  ' + '─'.repeat(GRID_W + 2) + '\n');

	for (let y = 0; y < GRID_H; y++) {
		let row = '  |';
		for (let x = 0; x < GRID_W; x++) {
			if (x === curX && y === curY) {
				row += mode === 'INSERT' ? '\x1b[42m\x1b[30mI\x1b[0m' : '\x1b[46m\x1b[30m@\x1b[0m';
			} else if (trail.some(([tx, ty]) => tx === x && ty === y)) {
				row += '\x1b[2m.\x1b[0m';
			} else {
				row += ' ';
			}
		}
		row += '|';
		lines.push(row + '\n');
	}

	lines.push('  ' + '─'.repeat(GRID_W + 2) + '\n');
	lines.push(`  Position: (${curX}, ${curY})  Trail: ${trail.length} steps\n`);
	process.stdout.write(lines.join(''));
}

function move(dx: number, dy: number): void {
	trail.push([curX, curY]);
	if (trail.length > 50) trail.shift();
	curX = Math.max(0, Math.min(GRID_W - 1, curX + dx));
	curY = Math.max(0, Math.min(GRID_H - 1, curY + dy));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || (ch === 'q' && mode === 'NORMAL')) { shutdown(); return; }

		if (mode === 'NORMAL') {
			if (ch === 'h') move(-1, 0);
			else if (ch === 'j') move(0, 1);
			else if (ch === 'k') move(0, -1);
			else if (ch === 'l') move(1, 0);
			else if (ch === 'i') mode = 'INSERT';
			else if (ch === '0') { trail.push([curX, curY]); curX = 0; }
			else if (ch === '$') { trail.push([curX, curY]); curX = GRID_W - 1; }
			else if (ch === 'g') { trail.push([curX, curY]); curY = 0; }
			else if (ch === 'G') { trail.push([curX, curY]); curY = GRID_H - 1; }
		} else {
			if (ch === '\x1b') mode = 'NORMAL';
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
