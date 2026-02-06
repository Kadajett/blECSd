#!/usr/bin/env node
/**
 * Box Drawing Demo
 *
 * Demonstrates box rendering utilities with all border charsets:
 * single, double, rounded, bold, and ASCII.
 *
 * Run: npx tsx examples/demos/box-drawing-demo.ts
 * Quit: q or Ctrl+C
 */

import {
	BOX_ASCII,
	BOX_BOLD,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
	type BoxChars,
	charsetToBoxChars,
	BORDER_SINGLE,
} from 'blecsd';

const stdout = process.stdout;
const height = stdout.rows ?? 24;

stdout.write('\x1b[?1049h\x1b[?25l');

// Draw a box at the given position with label
function drawBox(x: number, y: number, w: number, h: number, chars: BoxChars, label: string, color: string): void {
	stdout.write(`\x1b[${y};${x}H${color}${chars.topLeft}${chars.horizontal.repeat(w - 2)}${chars.topRight}\x1b[0m`);
	for (let row = 1; row < h - 1; row++) {
		stdout.write(`\x1b[${y + row};${x}H${color}${chars.vertical}\x1b[0m`);
		stdout.write(`\x1b[${y + row};${x + w - 1}H${color}${chars.vertical}\x1b[0m`);
	}
	stdout.write(`\x1b[${y + h - 1};${x}H${color}${chars.bottomLeft}${chars.horizontal.repeat(w - 2)}${chars.bottomRight}\x1b[0m`);
	// Label inside the box
	stdout.write(`\x1b[${y + 1};${x + 2}H\x1b[1m${label}\x1b[0m`);
	// Show charset characters
	const info = `TL:${chars.topLeft} TR:${chars.topRight} H:${chars.horizontal} V:${chars.vertical}`;
	stdout.write(`\x1b[${y + 2};${x + 2}H\x1b[90m${info}\x1b[0m`);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mBox Drawing Charsets\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mAll available border styles in blECSd\x1b[0m');

	const boxW = 32;
	const boxH = 5;

	// Row 1: Single and Double
	drawBox(3, 4, boxW, boxH, BOX_SINGLE, 'Single', '\x1b[37m');
	drawBox(38, 4, boxW, boxH, BOX_DOUBLE, 'Double', '\x1b[33m');

	// Row 2: Rounded and Bold
	drawBox(3, 10, boxW, boxH, BOX_ROUNDED, 'Rounded', '\x1b[32m');
	drawBox(38, 10, boxW, boxH, BOX_BOLD, 'Bold', '\x1b[35m');

	// Row 3: ASCII and a nested box
	drawBox(3, 16, boxW, boxH, BOX_ASCII, 'ASCII', '\x1b[31m');

	// Nested boxes demonstration
	drawBox(38, 16, boxW, boxH + 2, BOX_ROUNDED, 'Nested Boxes', '\x1b[36m');
	drawBox(41, 18, boxW - 6, boxH - 2, BOX_SINGLE, 'Inner', '\x1b[33m');

	// Verify charsetToBoxChars works correctly
	const converted = charsetToBoxChars(BORDER_SINGLE);
	stdout.write(`\x1b[${boxH + 17};3H\x1b[90mcharsetToBoxChars(BORDER_SINGLE).topLeft = "${converted.topLeft}"\x1b[0m`);

	// Controls
	const row = Math.min(height - 1, 24);
	stdout.write(`\x1b[${row};1H\x1b[33m[q] Quit\x1b[0m`);
}

render();

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') {
		stdout.write('\x1b[?25h\x1b[?1049l');
		process.exit(0);
	}
});
