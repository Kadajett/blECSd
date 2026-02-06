/**
 * Mouse Input Demo
 *
 * Demonstrates mouse click, drag, and scroll tracking using parseMouseSequence.
 * Click, drag, or scroll in the terminal to see events. Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/mouse-input-demo.ts
 * @module demos/mouse-input
 */

import { parseMouseSequence, isMouseBuffer } from 'blecsd';
import type { MouseEvent } from 'blecsd';

let lastEvent = '(none)';
let clickCount = 0;
let scrollCount = 0;
const trail: Array<{ x: number; y: number; ch: string }> = [];

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Mouse Input Demo\x1b[0m\n');
	lines.push('  Click, drag, or scroll  |  q = quit\n');
	lines.push('  ──────────────────────────────────────\n\n');

	lines.push(`  Last Event: \x1b[33m${lastEvent}\x1b[0m\n`);
	lines.push(`  Clicks: \x1b[32m${clickCount}\x1b[0m  Scrolls: \x1b[36m${scrollCount}\x1b[0m\n\n`);

	lines.push('  \x1b[4mRecent Positions:\x1b[0m\n');
	const recent = trail.slice(-8);
	for (const pt of recent) {
		lines.push(`  ${pt.ch} (${pt.x}, ${pt.y})\n`);
	}
	if (trail.length === 0) {
		lines.push('  \x1b[2m(click or move to see positions)\x1b[0m\n');
	}

	process.stdout.write(lines.join(''));
}

function handleMouse(ev: MouseEvent): void {
	lastEvent = `${ev.action} ${ev.button} at (${ev.x}, ${ev.y})`;
	if (ev.action === 'mousedown') {
		clickCount++;
		trail.push({ x: ev.x, y: ev.y, ch: '+' });
	} else if (ev.action === 'mousemove') {
		trail.push({ x: ev.x, y: ev.y, ch: '.' });
	} else if (ev.action === 'wheelup' || ev.action === 'wheeldown') {
		scrollCount++;
	}
	if (trail.length > 50) trail.shift();
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	// Enable SGR mouse mode (1006) and any-event tracking (1003)
	process.stdout.write('\x1b[?1003h\x1b[?1006h');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === '\x03' || str === 'q') { shutdown(); return; }

		const buf = new Uint8Array(data);
		if (isMouseBuffer(buf)) {
			const result = parseMouseSequence(buf);
			if (result && result.type === 'mouse') {
				handleMouse(result.event);
			}
		}
		render();
	});
}

function shutdown(): void {
	process.stdout.write('\x1b[?1006l\x1b[?1003l');
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
