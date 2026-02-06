/**
 * Double Buffering Demo
 *
 * Demonstrates front/back buffer swapping for flicker-free rendering.
 * Uses createDoubleBuffer, getBackBuffer, markDirtyRegion, getMinimalUpdates, swapBuffers.
 * Press Space to advance frame, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/double-buffering-demo.ts
 * @module demos/double-buffering
 */

import { createDoubleBuffer } from 'blecsd';
import {
	getBackBuffer, swapBuffers, markDirtyRegion,
	getMinimalUpdates, clearDirtyRegions,
} from '../../src/terminal/screen/doubleBuffer';
import { createCell, setCell } from '../../src/terminal/screen/cell';

const W = 30;
const H = 10;
const db = createDoubleBuffer(W, H);

let frame = 0;
let totalUpdates = 0;
let lastDirtyCount = 0;

function writeFrame(): void {
	const back = getBackBuffer(db);
	// Write a pattern that changes each frame
	const chars = ['.', 'o', 'O', '@', '#'];
	const ch = chars[frame % chars.length];

	// Move a horizontal bar across the buffer
	const barY = frame % H;
	for (let x = 0; x < W; x++) {
		setCell(back, x, barY, createCell(ch, 0x00ff00ff, 0x000000ff));
	}
	markDirtyRegion(db, 0, barY, W, 1);

	// Clear the previous bar position
	const prevY = (frame - 1 + H) % H;
	if (prevY !== barY) {
		for (let x = 0; x < W; x++) {
			setCell(back, x, prevY, createCell(' ', 0xffffffff, 0x000000ff));
		}
		markDirtyRegion(db, 0, prevY, W, 1);
	}
}

function render(): void {
	const updates = getMinimalUpdates(db);
	lastDirtyCount = updates.length;
	totalUpdates += updates.length;
	swapBuffers(db);
	clearDirtyRegions(db);

	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  Double Buffering Demo\x1b[0m\n');
	out.push('  Space = next frame  |  q = quit\n');
	out.push('  ──────────────────────────────────────\n\n');

	out.push(`  Frame: \x1b[33m${frame}\x1b[0m  Dirty cells: \x1b[32m${lastDirtyCount}\x1b[0m  Total: ${totalUpdates}\n\n`);

	// Visualize the front buffer
	out.push('  \x1b[4mFront Buffer:\x1b[0m\n');
	const front = db.frontBuffer;
	out.push('  ┌' + '─'.repeat(W) + '┐\n');
	for (let y = 0; y < H; y++) {
		let row = '  │';
		for (let x = 0; x < W; x++) {
			const idx = y * W + x;
			const cell = front.cells[idx];
			if (cell && cell.char !== ' ') {
				row += `\x1b[32m${cell.char}\x1b[0m`;
			} else {
				row += ' ';
			}
		}
		row += '│';
		out.push(row + '\n');
	}
	out.push('  └' + '─'.repeat(W) + '┘\n\n');

	// Show update visualization
	out.push('  \x1b[4mDirty Cells This Frame:\x1b[0m\n');
	if (updates.length > 0) {
		const shown = updates.slice(0, 10);
		for (const u of shown) {
			out.push(`  (${u.x}, ${u.y}) = '${u.cell.char}'\n`);
		}
		if (updates.length > 10) out.push(`  ... and ${updates.length - 10} more\n`);
	} else {
		out.push('  \x1b[2m(no changes)\x1b[0m\n');
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
		if (ch === ' ') {
			frame++;
			writeFrame();
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
