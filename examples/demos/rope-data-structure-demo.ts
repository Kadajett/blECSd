/**
 * Rope Data Structure Demo
 *
 * Interactive text buffer using blECSd's rope data structure.
 * Type to insert at cursor, Backspace to delete, showing structure
 * stats. Press Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/rope-data-structure-demo.ts
 * @module demos/rope-data-structure
 */
import { createRope, insert, deleteRange, getText, getLength, getLineCount, getLine, verify } from '../../src/utils/rope';

const INITIAL = 'Hello, World!\nThis is a rope data structure.\nIt handles large text efficiently.\nTry typing or pressing Backspace.';
let rope = createRope(INITIAL);
let cursor = getLength(rope);

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Rope Data Structure Demo\x1b[0m\n');
	lines.push('  Type to insert at cursor  |  Backspace = delete  |  Ctrl+C = quit\n');
	lines.push('  ────────────────────────────────────────────────────────────────\n\n');

	const text = getText(rope);
	const lineCount = getLineCount(rope);
	const len = getLength(rope);
	const valid = verify(rope);

	// Show text with cursor marker
	const before = text.slice(0, cursor);
	const after = text.slice(cursor);
	const display = before + '\x1b[7m \x1b[0m' + after;

	lines.push('  \x1b[4mBuffer Contents:\x1b[0m\n');
	for (const line of display.split('\n')) {
		lines.push(`  ${line}\n`);
	}

	lines.push('\n  \x1b[4mStructure Stats:\x1b[0m\n');
	lines.push(`  Length:     ${len} chars\n`);
	lines.push(`  Lines:      ${lineCount}\n`);
	lines.push(`  Cursor:     ${cursor}\n`);
	lines.push(`  Integrity:  ${valid ? '\x1b[32mOK\x1b[0m' : '\x1b[31mFAILED\x1b[0m'}\n`);

	// Show first few lines via getLine API
	lines.push('\n  \x1b[4mLine Access (getLine API):\x1b[0m\n');
	for (let i = 0; i < Math.min(lineCount, 5); i++) {
		const info = getLine(rope, i);
		if (info) {
			const preview = info.text.length > 40 ? info.text.slice(0, 40) + '...' : info.text;
			lines.push(`  [${i}] offset=${String(info.start).padStart(4)} "${preview}"\n`);
		}
	}

	process.stdout.write(lines.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === '\x03') { shutdown(); return; }

		if (str === '\x7f' || str === '\b') {
			if (cursor > 0) {
				rope = deleteRange(rope, cursor - 1, cursor);
				cursor--;
			}
		} else if (str === '\x1b[D') {
			cursor = Math.max(0, cursor - 1);
		} else if (str === '\x1b[C') {
			cursor = Math.min(getLength(rope), cursor + 1);
		} else if (str === '\r') {
			rope = insert(rope, cursor, '\n');
			cursor++;
		} else if (str.length === 1 && str.charCodeAt(0) >= 32) {
			rope = insert(rope, cursor, str);
			cursor++;
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
