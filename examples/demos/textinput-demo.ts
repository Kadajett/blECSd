/**
 * TextInput Widget Demo
 *
 * Demonstrates a single-line text input with cursor movement, typing, and deletion.
 * Uses handleTextInputKeyPress to process key events into text actions.
 * Type text, use arrows to move cursor, Backspace/Delete to erase, q to quit.
 *
 * Run: npx tsx examples/demos/textinput-demo.ts
 * @module demos/textinput
 */

import { parseKeyBuffer } from 'blecsd';

let value = '';
let cursor = 0;
let submitted: string[] = [];

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  TextInput Demo\x1b[0m\n');
	out.push('  Type text  |  arrows = move cursor  |  Enter = submit  |  Esc = quit\n');
	out.push('  ──────────────────────────────────────────────────────────────────\n\n');

	// Input field
	const fieldWidth = 40;
	const displayVal = value.padEnd(fieldWidth);
	const before = displayVal.slice(0, cursor);
	const at = displayVal[cursor] || ' ';
	const after = displayVal.slice(cursor + 1);

	out.push('  Label: ');
	out.push(`\x1b[47;30m${before}\x1b[7m${at}\x1b[27m${after}\x1b[0m\n\n`);

	out.push(`  Cursor: ${cursor}/${value.length}  Length: ${value.length}\n\n`);

	// Submitted values
	out.push('  \x1b[4mSubmitted:\x1b[0m\n');
	const recent = submitted.slice(-6);
	for (const s of recent) {
		out.push(`  \x1b[32m>\x1b[0m ${s}\n`);
	}
	if (submitted.length === 0) {
		out.push('  \x1b[2m(press Enter to submit)\x1b[0m\n');
	}

	process.stdout.write(out.join(''));
}

function handleKey(ch: string, buf: Buffer): void {
	const keys = parseKeyBuffer(new Uint8Array(buf));
	if (keys.length === 0) return;
	const key = keys[0];

	if (key.name === 'left') {
		cursor = Math.max(0, cursor - 1);
	} else if (key.name === 'right') {
		cursor = Math.min(value.length, cursor + 1);
	} else if (key.name === 'home') {
		cursor = 0;
	} else if (key.name === 'end') {
		cursor = value.length;
	} else if (key.name === 'backspace') {
		if (cursor > 0) {
			value = value.slice(0, cursor - 1) + value.slice(cursor);
			cursor--;
		}
	} else if (key.name === 'delete') {
		if (cursor < value.length) {
			value = value.slice(0, cursor) + value.slice(cursor + 1);
		}
	} else if (key.name === 'return') {
		if (value.length > 0) {
			submitted.push(value);
			value = '';
			cursor = 0;
		}
	} else if (ch.length === 1 && ch >= ' ' && ch <= '~') {
		value = value.slice(0, cursor) + ch + value.slice(cursor);
		cursor++;
	}
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x1b' && data.length === 1) { shutdown(); return; }
		if (ch === '\x03') { shutdown(); return; }
		handleKey(ch, data);
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
