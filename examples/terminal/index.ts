#!/usr/bin/env node
/**
 * Terminal Widget Demo
 *
 * Demonstrates:
 * - Terminal widget with ANSI escape sequence rendering
 * - Color support (16, 256, and RGB colors)
 * - Text styles (bold, italic, underline)
 * - Cursor manipulation
 * - Scrollback buffer and scrolling
 * - Optional PTY shell integration (requires node-pty)
 *
 * Controls:
 * - Up/Down: Scroll history
 * - Page Up/Page Down: Scroll by page
 * - Home: Scroll to top
 * - End: Scroll to bottom
 * - 's': Spawn shell (if node-pty available)
 * - 'r': Reset terminal
 * - 'c': Clear terminal
 * - 'd': Demo ANSI sequences
 * - 'q' or Ctrl+C: Quit
 *
 * Run: pnpm dev
 *
 * @module examples/terminal
 */

import { createWorld, type World } from 'blecsd';
import { createTerminal, handleTerminalKey, type TerminalWidget } from 'blecsd/widgets';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

// =============================================================================
// DEMO CONTENT
// =============================================================================

/**
 * Generates demo content showing various ANSI escape sequences.
 */
function writeDemoContent(terminal: TerminalWidget): void {
	// Header
	terminal.writeln('\x1b[1;36m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
	terminal.writeln('\x1b[1;36m║\x1b[0m                    \x1b[1;33mTerminal Widget Demo\x1b[0m                                   \x1b[1;36m║\x1b[0m');
	terminal.writeln('\x1b[1;36m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m');
	terminal.writeln('');

	// Basic colors (16 colors)
	terminal.writeln('\x1b[1;4mBasic Colors (16-color mode):\x1b[0m');
	terminal.write('  Standard:  ');
	for (let i = 30; i <= 37; i++) {
		terminal.write(`\x1b[${i}m█\x1b[0m`);
	}
	terminal.writeln('');
	terminal.write('  Bright:    ');
	for (let i = 90; i <= 97; i++) {
		terminal.write(`\x1b[${i}m█\x1b[0m`);
	}
	terminal.writeln('');
	terminal.writeln('');

	// 256 colors
	terminal.writeln('\x1b[1;4m256-Color Palette:\x1b[0m');
	terminal.write('  Grayscale: ');
	for (let i = 232; i <= 255; i++) {
		terminal.write(`\x1b[38;5;${i}m█\x1b[0m`);
	}
	terminal.writeln('');
	terminal.write('  Colors:    ');
	for (let i = 16; i < 52; i++) {
		terminal.write(`\x1b[38;5;${i}m█\x1b[0m`);
	}
	terminal.writeln('');
	terminal.writeln('');

	// RGB colors
	terminal.writeln('\x1b[1;4mRGB Colors (24-bit):\x1b[0m');
	terminal.write('  Rainbow:   ');
	const steps = 36;
	for (let i = 0; i < steps; i++) {
		const hue = (i / steps) * 360;
		const { r, g, b } = hslToRgb(hue, 100, 50);
		terminal.write(`\x1b[38;2;${r};${g};${b}m█\x1b[0m`);
	}
	terminal.writeln('');
	terminal.writeln('');

	// Text styles
	terminal.writeln('\x1b[1;4mText Styles:\x1b[0m');
	terminal.writeln('  \x1b[1mBold text\x1b[0m');
	terminal.writeln('  \x1b[2mDim text\x1b[0m');
	terminal.writeln('  \x1b[3mItalic text\x1b[0m');
	terminal.writeln('  \x1b[4mUnderlined text\x1b[0m');
	terminal.writeln('  \x1b[5mBlinking text\x1b[0m');
	terminal.writeln('  \x1b[7mReversed text\x1b[0m');
	terminal.writeln('  \x1b[9mStrikethrough text\x1b[0m');
	terminal.writeln('  \x1b[1;3;4mBold + Italic + Underline\x1b[0m');
	terminal.writeln('');

	// Colored text with backgrounds
	terminal.writeln('\x1b[1;4mColored Backgrounds:\x1b[0m');
	terminal.writeln('  \x1b[41m Red BG \x1b[0m \x1b[42m Green BG \x1b[0m \x1b[44m Blue BG \x1b[0m \x1b[45m Magenta BG \x1b[0m');
	terminal.writeln('  \x1b[30;43m Black on Yellow \x1b[0m \x1b[37;40m White on Black \x1b[0m');
	terminal.writeln('');

	// Box drawing
	terminal.writeln('\x1b[1;4mBox Drawing Characters:\x1b[0m');
	terminal.writeln('  ┌───────┬───────┐');
	terminal.writeln('  │ Cell  │ Cell  │');
	terminal.writeln('  ├───────┼───────┤');
	terminal.writeln('  │ Cell  │ Cell  │');
	terminal.writeln('  └───────┴───────┘');
	terminal.writeln('');

	// Progress bar demo
	terminal.writeln('\x1b[1;4mProgress Bar:\x1b[0m');
	terminal.write('  [');
	for (let i = 0; i < 30; i++) {
		if (i < 20) {
			terminal.write('\x1b[32m█\x1b[0m');
		} else {
			terminal.write('\x1b[90m░\x1b[0m');
		}
	}
	terminal.writeln('] 66%');
	terminal.writeln('');

	// Instructions
	terminal.writeln('\x1b[1;36m─────────────────────────────────────────────────────────────────────────────\x1b[0m');
	terminal.writeln('\x1b[1;33mControls:\x1b[0m');
	terminal.writeln('  \x1b[1mUp/Down\x1b[0m     - Scroll history');
	terminal.writeln('  \x1b[1mPgUp/PgDn\x1b[0m   - Scroll by page');
	terminal.writeln('  \x1b[1mHome/End\x1b[0m    - Jump to top/bottom');
	terminal.writeln('  \x1b[1ms\x1b[0m           - Spawn shell (requires node-pty)');
	terminal.writeln('  \x1b[1mr\x1b[0m           - Reset terminal');
	terminal.writeln('  \x1b[1mc\x1b[0m           - Clear terminal');
	terminal.writeln('  \x1b[1md\x1b[0m           - Show this demo again');
	terminal.writeln('  \x1b[1mq / Ctrl+C\x1b[0m  - Quit');
	terminal.writeln('\x1b[1;36m─────────────────────────────────────────────────────────────────────────────\x1b[0m');
}

/**
 * Converts HSL to RGB.
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	s /= 100;
	l /= 100;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0,
		g = 0,
		b = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

/**
 * Unpack RGBA color to components.
 */
function unpackRgba(color: number): { r: number; g: number; b: number; a: number } {
	return {
		r: (color >> 24) & 0xff,
		g: (color >> 16) & 0xff,
		b: (color >> 8) & 0xff,
		a: color & 0xff,
	};
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders the terminal buffer to stdout with a border.
 * Uses synchronized output to prevent flickering.
 */
function renderTerminal(terminal: TerminalWidget, screenWidth: number, screenHeight: number): void {
	const dims = terminal.getDimensions();
	const cells = terminal.getCells();
	const cursor = terminal.getCursor();
	const state = terminal.getState();

	// Calculate terminal position (centered)
	const termX = Math.floor((screenWidth - dims.width - 2) / 2);
	const termY = Math.floor((screenHeight - dims.height - 4) / 2);

	// Hide cursor during redraw to prevent flash, then move to home
	let output = '\x1b[?25l\x1b[H';

	// Title bar
	output += `\x1b[${termY};${termX}H`;
	output += '\x1b[1;36m┌';
	const title = ' Terminal Widget Demo ';
	const padding = dims.width - title.length;
	const leftPad = Math.floor(padding / 2);
	const rightPad = padding - leftPad;
	output += '─'.repeat(leftPad);
	output += `\x1b[1;33m${title}\x1b[1;36m`;
	output += '─'.repeat(rightPad);
	output += '┐\x1b[0m';

	// Note: Scroll indicator could be added by tracking scroll state

	// Terminal content
	if (cells) {
		for (let row = 0; row < dims.height; row++) {
			output += `\x1b[${termY + row + 1};${termX}H`;
			output += '\x1b[1;36m│\x1b[0m';

			for (let col = 0; col < dims.width; col++) {
				const idx = row * dims.width + col;
				const cell = cells[idx];

				if (cell) {
					// Unpack colors (RGBA format)
					const fg = unpackRgba(cell.fg);
					const bg = unpackRgba(cell.bg);
					const attrs = cell.attrs;

					// Build ANSI codes
					const codes: string[] = [];

					// Handle attributes (same bit flags as Attr enum)
					if (attrs & 1) codes.push('1'); // Bold
					if (attrs & 2) codes.push('2'); // Dim
					if (attrs & 4) codes.push('3'); // Italic
					if (attrs & 8) codes.push('4'); // Underline
					if (attrs & 16) codes.push('5'); // Blink
					if (attrs & 32) codes.push('7'); // Reverse
					if (attrs & 64) codes.push('8'); // Hidden
					if (attrs & 128) codes.push('9'); // Strikethrough

					// Apply RGB colors
					codes.push(`38;2;${fg.r};${fg.g};${fg.b}`);
					codes.push(`48;2;${bg.r};${bg.g};${bg.b}`);

					output += `\x1b[${codes.join(';')}m`;
					output += cell.char || ' ';
					output += '\x1b[0m';
				} else {
					output += ' ';
				}
			}

			output += '\x1b[1;36m│\x1b[0m';
		}
	}

	// Bottom border
	output += `\x1b[${termY + dims.height + 1};${termX}H`;
	output += '\x1b[1;36m└';
	output += '─'.repeat(dims.width);
	output += '┘\x1b[0m';

	// Status bar
	output += `\x1b[${termY + dims.height + 2};${termX}H`;
	const running = terminal.isRunning();
	const status = running ? '\x1b[1;32m● Shell Running\x1b[0m' : '\x1b[1;90m○ No Shell\x1b[0m';
	output += `${status}  Cursor: (${cursor.x}, ${cursor.y})`;

	// Keep hardware cursor hidden - let the terminal content speak for itself
	// Applications like sl, vim, etc. handle their own cursor display via escape sequences
	// We just need to position for any final output
	if (state) {
		const cursorScreenX = termX + cursor.x + 1;
		const cursorScreenY = termY + cursor.y + 1;
		output += `\x1b[${cursorScreenY};${cursorScreenX}H`;
	}
	// Cursor stays hidden (we hid it at start of render)

	process.stdout.write(output);
}

/**
 * Parse escape sequences from raw input to key names.
 */
function parseKey(data: string): { key: string; char?: string; ctrl: boolean; alt: boolean; shift: boolean } {
	const result = { key: '', char: undefined as string | undefined, ctrl: false, alt: false, shift: false };

	// Check for Ctrl+C
	if (data === '\x03') {
		result.key = 'c';
		result.ctrl = true;
		return result;
	}

	// Check for escape sequences
	if (data.startsWith('\x1b')) {
		// Arrow keys and special keys
		if (data === '\x1b[A') {
			result.key = 'up';
		} else if (data === '\x1b[B') {
			result.key = 'down';
		} else if (data === '\x1b[C') {
			result.key = 'right';
		} else if (data === '\x1b[D') {
			result.key = 'left';
		} else if (data === '\x1b[5~') {
			result.key = 'pageup';
		} else if (data === '\x1b[6~') {
			result.key = 'pagedown';
		} else if (data === '\x1b[H' || data === '\x1b[1~') {
			result.key = 'home';
		} else if (data === '\x1b[F' || data === '\x1b[4~') {
			result.key = 'end';
		} else if (data === '\x1b[1;5H') {
			result.key = 'home';
			result.ctrl = true;
		} else if (data === '\x1b[1;5F') {
			result.key = 'end';
			result.ctrl = true;
		} else {
			result.key = 'escape';
		}
		return result;
	}

	// Regular character
	if (data.length === 1) {
		result.key = data;
		result.char = data;
	}

	return result;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const stdout = process.stdout;
	const stdin = process.stdin;

	const screenWidth = stdout.columns ?? DEFAULT_WIDTH;
	const screenHeight = stdout.rows ?? DEFAULT_HEIGHT;

	// Terminal dimensions (leave room for border and status)
	const termWidth = Math.min(80, screenWidth - 4);
	const termHeight = Math.min(24, screenHeight - 6);

	// Create world and terminal
	const world = createWorld() as World;
	const terminal = createTerminal(world, {
		width: termWidth,
		height: termHeight,
		scrollback: 1000,
		cursorBlink: true,
	});

	// Write demo content
	writeDemoContent(terminal);

	// Setup terminal
	stdout.write('\x1b[?1049h'); // Alt screen
	stdout.write('\x1b[2J'); // Clear screen once at start
	stdout.write('\x1b[?25l'); // Hide cursor initially
	stdin.setRawMode?.(true);
	stdin.resume();

	let running = true;
	let needsRender = true;
	let shellHandlersRegistered = false;

	// Mark dirty on any input
	const markDirty = () => {
		needsRender = true;
	};

	// Handle input
	stdin.on('data', (data: Buffer) => {
		markDirty(); // Mark dirty on any input
		const str = data.toString();
		const parsed = parseKey(str);

		// Check for quit
		if (str === 'q' || str === 'Q' || (parsed.ctrl && parsed.key === 'c')) {
			running = false;
			return;
		}

		// If shell is running, forward input
		if (terminal.isRunning()) {
			terminal.input(str);
			return;
		}

		// Handle demo controls
		switch (str) {
			case 's':
			case 'S':
				// Try to spawn shell
				terminal.writeln('');
				terminal.writeln('\x1b[1;33mAttempting to spawn shell...\x1b[0m');
				try {
					// Register handlers once (avoid accumulating handlers on repeated spawn attempts)
					// Note: PTY output is automatically written to the terminal buffer by spawn()
					// We just need to mark dirty so the display updates
					if (!shellHandlersRegistered) {
						terminal.onData(() => {
							markDirty();
						});
						terminal.onExit((code) => {
							terminal.writeln('');
							terminal.writeln(`\x1b[1;33mShell exited with code ${code}\x1b[0m`);
							markDirty();
						});
						shellHandlersRegistered = true;
					}
					// Then spawn
					terminal.spawn(process.env.SHELL || '/bin/bash');
					// Check if it actually started
					if (!terminal.isRunning()) {
						terminal.writeln('\x1b[1;31mFailed to spawn shell. node-pty may not be installed or built.\x1b[0m');
						terminal.writeln('\x1b[90mRun: cd examples/terminal && pnpm approve-builds && pnpm install\x1b[0m');
					} else {
						terminal.writeln('\x1b[1;32mShell started! Type commands or "exit" to quit shell.\x1b[0m');
					}
				} catch (err) {
					terminal.writeln('\x1b[1;31mFailed to spawn shell: ' + String(err) + '\x1b[0m');
					terminal.writeln('\x1b[90mRun: pnpm add node-pty && pnpm approve-builds\x1b[0m');
				}
				break;

			case 'r':
			case 'R':
				terminal.reset();
				terminal.writeln('\x1b[1;32mTerminal reset.\x1b[0m');
				writeDemoContent(terminal);
				break;

			case 'c':
			case 'C':
				terminal.clear();
				terminal.writeln('\x1b[1;32mTerminal cleared.\x1b[0m');
				break;

			case 'd':
			case 'D':
				terminal.clear();
				writeDemoContent(terminal);
				break;

			default:
				// Handle arrow keys and special keys using the widget's handleTerminalKey
				if (parsed.key) {
					handleTerminalKey(terminal, parsed.key, parsed.char, parsed.ctrl, parsed.alt, parsed.shift);
				}
				break;
		}
	});

	// Render loop - only render when dirty, at reduced frame rate
	const FRAME_MS = 1000 / 15; // 15 fps is enough for terminal UI
	const loop = (): void => {
		if (!running) {
			// Cleanup
			terminal.kill();
			stdout.write('\x1b[?25h'); // Show cursor
			stdout.write('\x1b[?1049l'); // Exit alt screen
			stdout.write('\x1b[0m'); // Reset colors
			process.exit(0);
		}

		if (needsRender) {
			renderTerminal(terminal, stdout.columns ?? DEFAULT_WIDTH, stdout.rows ?? DEFAULT_HEIGHT);
			needsRender = false;
		}

		setTimeout(loop, FRAME_MS);
	};

	// Initial render
	renderTerminal(terminal, screenWidth, screenHeight);

	// Start render loop
	loop();

	// Mark dirty on resize
	stdout.on('resize', markDirty);
}

main().catch((err) => {
	// Restore terminal state on error
	process.stdout.write('\x1b[?25h');
	process.stdout.write('\x1b[?1049l');
	process.stdout.write('\x1b[0m');
	console.error('Error:', err);
	process.exit(1);
});
