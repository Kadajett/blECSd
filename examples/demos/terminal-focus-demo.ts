/**
 * Terminal Focus Demo
 *
 * Demonstrates terminal focus/blur event detection.
 * Switch to another window and back to see focus events.
 * Requires a terminal that supports focus reporting (xterm, iTerm2, etc.).
 * Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/terminal-focus-demo.ts
 * @module demos/terminal-focus
 */
import { parseMouseSequence, type FocusEvent } from 'blecsd';

// Focus reporting escape sequences
const ENABLE_FOCUS = '\x1b[?1004h';  // Enable focus reporting mode
const DISABLE_FOCUS = '\x1b[?1004s'; // Save and later restore

let focused = true;
let focusCount = 0;
let blurCount = 0;
const eventLog: Array<{ type: string; time: string }> = [];
const MAX_LOG = 10;

function timestamp(): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function render(): void {
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Terminal Focus Demo\x1b[0m\n');
	lines.push('  Switch windows to trigger focus/blur events  |  q = quit\n');
	lines.push('  ────────────────────────────────────────────────────────\n\n');

	// Visual focus indicator
	if (focused) {
		lines.push('  Status: \x1b[42m\x1b[30m  FOCUSED  \x1b[0m\n\n');
	} else {
		lines.push('  Status: \x1b[41m\x1b[37m  BLURRED  \x1b[0m\n\n');
	}

	lines.push(`  Focus events: \x1b[32m${focusCount}\x1b[0m  |  Blur events: \x1b[31m${blurCount}\x1b[0m\n\n`);

	// Event log
	lines.push('  \x1b[4mEvent Log:\x1b[0m\n');
	for (const entry of eventLog) {
		const icon = entry.type === 'focus' ? '\x1b[32m+\x1b[0m' : '\x1b[31m-\x1b[0m';
		lines.push(`  ${icon} ${entry.time}  ${entry.type}\n`);
	}
	if (eventLog.length === 0) {
		lines.push('  \x1b[2m(switch to another window and back)\x1b[0m\n');
	}

	// Dim the entire UI when not focused
	if (!focused) {
		lines.push('\n  \x1b[2m(terminal is not focused)\x1b[0m\n');
	}

	lines.push('\n  \x1b[2mRequires focus reporting support (xterm, iTerm2, WezTerm, etc.)\x1b[0m\n');
	process.stdout.write(lines.join(''));
}

function handleFocus(ev: FocusEvent): void {
	focused = ev.focused;
	if (ev.focused) {
		focusCount++;
		eventLog.push({ type: 'focus', time: timestamp() });
	} else {
		blurCount++;
		eventLog.push({ type: 'blur', time: timestamp() });
	}
	while (eventLog.length > MAX_LOG) eventLog.shift();
	render();
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	// Enable focus reporting
	process.stdout.write(ENABLE_FOCUS);
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === '\x03' || str === 'q') { shutdown(); return; }

		// Check for focus events: ESC[I (focus in) or ESC[O (focus out)
		const buf = new Uint8Array(data);
		const result = parseMouseSequence(buf);
		if (result && result.type === 'focus') {
			handleFocus(result.event);
			return;
		}

		// Manual fallback check for focus sequences
		if (str === '\x1b[I') {
			handleFocus({ focused: true, raw: buf });
		} else if (str === '\x1b[O') {
			handleFocus({ focused: false, raw: buf });
		}
		render();
	});
}

function shutdown(): void {
	// Disable focus reporting
	process.stdout.write('\x1b[?1004l');
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
