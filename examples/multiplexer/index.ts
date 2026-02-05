#!/usr/bin/env node
/**
 * Terminal Multiplexer Example
 *
 * A tmux-like terminal multiplexer demonstrating blECSd's Terminal widget
 * with multiple independent PTY shells in a 2x2 grid layout.
 *
 * Features:
 * - 2x2 grid of terminal panes
 * - Each pane runs an independent shell
 * - Tab/Shift+Tab to cycle focus
 * - Click to focus pane
 * - Ctrl+D to close focused pane
 * - Visual focus indicator (colored border)
 * - Docked borders (no double lines)
 *
 * Controls:
 * - Tab: Focus next pane
 * - Shift+Tab: Focus previous pane
 * - Ctrl+N: Create new pane (if fewer than 4)
 * - Ctrl+D: Close focused pane
 * - Ctrl+Q: Quit
 * - Click: Focus clicked pane
 *
 * Run: pnpm dev
 *
 * @module examples/multiplexer
 */

import { createWorld, type World } from 'blecsd';
import { createTerminal, type TerminalWidget } from 'blecsd/widgets';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MIN_PANE_WIDTH = 40;
const MIN_PANE_HEIGHT = 12;
const BORDER_NORMAL = '\x1b[90m'; // Gray for unfocused
const BORDER_FOCUSED = '\x1b[1;36m'; // Bright cyan for focused
const RESET = '\x1b[0m';

// =============================================================================
// TYPES
// =============================================================================

interface Pane {
	terminal: TerminalWidget;
	row: number;
	col: number;
	width: number;
	height: number;
	x: number;
	y: number;
}

interface MultiplexerState {
	world: World;
	panes: Pane[];
	focusedIndex: number;
	layout: { rows: number; cols: number };
	screenWidth: number;
	screenHeight: number;
	running: boolean;
	needsRender: boolean;
}

// =============================================================================
// PANE MANAGEMENT
// =============================================================================

/**
 * Creates a new terminal pane.
 */
function createPane(
	state: MultiplexerState,
	row: number,
	col: number,
	x: number,
	y: number,
	width: number,
	height: number,
): Pane {
	const terminal = createTerminal(state.world, {
		width: width - 2, // Account for border
		height: height - 2,
		scrollback: 500,
		cursorBlink: true,
	});

	const pane: Pane = {
		terminal,
		row,
		col,
		width,
		height,
		x,
		y,
	};

	// Welcome message
	terminal.writeln(`\x1b[1;33mPane ${state.panes.length + 1}\x1b[0m`);
	terminal.writeln('\x1b[90mSpawning shell...\x1b[0m');

	// Spawn shell
	try {
		terminal.onData(() => {
			state.needsRender = true;
		});
		terminal.onExit((code) => {
			terminal.writeln('');
			terminal.writeln(`\x1b[90mShell exited (${code})\x1b[0m`);
			state.needsRender = true;
		});
		terminal.spawn(process.env.SHELL || '/bin/bash');

		if (!terminal.isRunning()) {
			terminal.writeln('\x1b[31mFailed to spawn shell.\x1b[0m');
			terminal.writeln('\x1b[90mnode-pty may not be installed.\x1b[0m');
		}
	} catch (err) {
		terminal.writeln(`\x1b[31mError: ${String(err)}\x1b[0m`);
	}

	return pane;
}

/**
 * Calculates layout positions for a 2x2 grid (or smaller).
 */
function calculateLayout(state: MultiplexerState): void {
	const { screenWidth, screenHeight, panes, layout } = state;

	// Calculate pane dimensions
	const paneWidth = Math.floor(screenWidth / layout.cols);
	const paneHeight = Math.floor((screenHeight - 2) / layout.rows); // -2 for status bar

	// Update each pane's position and size
	for (const pane of panes) {
		pane.x = pane.col * paneWidth;
		pane.y = pane.row * paneHeight;
		pane.width = paneWidth;
		pane.height = paneHeight;

		// Resize terminal buffer
		const newWidth = paneWidth - 2;
		const newHeight = paneHeight - 2;
		if (newWidth > 0 && newHeight > 0) {
			pane.terminal.resize(newWidth, newHeight);
		}
	}
}

/**
 * Closes the focused pane.
 */
function closePane(state: MultiplexerState): void {
	if (state.panes.length <= 1) {
		return; // Keep at least one pane
	}

	const pane = state.panes[state.focusedIndex];
	if (pane) {
		pane.terminal.kill();
		pane.terminal.destroy();
		state.panes.splice(state.focusedIndex, 1);

		// Recalculate positions based on remaining panes
		redistributePanes(state);

		// Adjust focus
		if (state.focusedIndex >= state.panes.length) {
			state.focusedIndex = state.panes.length - 1;
		}
	}
	state.needsRender = true;
}

/**
 * Redistribute panes after one is closed.
 */
function redistributePanes(state: MultiplexerState): void {
	const count = state.panes.length;

	// Update layout based on pane count
	if (count <= 1) {
		state.layout = { rows: 1, cols: 1 };
	} else if (count <= 2) {
		state.layout = { rows: 1, cols: 2 };
	} else {
		state.layout = { rows: 2, cols: 2 };
	}

	// Reassign positions
	let idx = 0;
	for (let row = 0; row < state.layout.rows; row++) {
		for (let col = 0; col < state.layout.cols; col++) {
			if (idx < count) {
				const pane = state.panes[idx];
				if (pane) {
					pane.row = row;
					pane.col = col;
				}
				idx++;
			}
		}
	}

	calculateLayout(state);
}

/**
 * Add a new pane if there's room.
 */
function addPane(state: MultiplexerState): void {
	if (state.panes.length >= 4) {
		return; // Max 4 panes
	}

	const count = state.panes.length;
	let row = 0;
	let col = 0;

	// Find next available slot
	if (count === 1) {
		state.layout = { rows: 1, cols: 2 };
		col = 1;
	} else if (count === 2) {
		state.layout = { rows: 2, cols: 2 };
		row = 1;
		col = 0;
	} else if (count === 3) {
		row = 1;
		col = 1;
	}

	calculateLayout(state);

	const paneWidth = Math.floor(state.screenWidth / state.layout.cols);
	const paneHeight = Math.floor((state.screenHeight - 2) / state.layout.rows);
	const x = col * paneWidth;
	const y = row * paneHeight;

	const pane = createPane(state, row, col, x, y, paneWidth, paneHeight);
	state.panes.push(pane);
	state.focusedIndex = state.panes.length - 1;
	state.needsRender = true;
}

// =============================================================================
// RENDERING
// =============================================================================

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

/**
 * Draws a single pane with border.
 */
function renderPane(pane: Pane, isFocused: boolean): string {
	let output = '';
	const borderColor = isFocused ? BORDER_FOCUSED : BORDER_NORMAL;
	const dims = pane.terminal.getDimensions();
	const cells = pane.terminal.getCells();

	// Top border
	output += `\x1b[${pane.y + 1};${pane.x + 1}H`;
	output += borderColor;
	output += '┌';
	output += '─'.repeat(dims.width);
	output += '┐';
	output += RESET;

	// Content rows
	if (cells) {
		for (let row = 0; row < dims.height; row++) {
			output += `\x1b[${pane.y + row + 2};${pane.x + 1}H`;
			output += borderColor + '│' + RESET;

			for (let col = 0; col < dims.width; col++) {
				const idx = row * dims.width + col;
				const cell = cells[idx];

				if (cell) {
					const fg = unpackRgba(cell.fg);
					const bg = unpackRgba(cell.bg);
					const attrs = cell.attrs;

					const codes: string[] = [];
					if (attrs & 1) codes.push('1');
					if (attrs & 2) codes.push('2');
					if (attrs & 4) codes.push('3');
					if (attrs & 8) codes.push('4');
					if (attrs & 16) codes.push('5');
					if (attrs & 32) codes.push('7');
					if (attrs & 64) codes.push('8');
					if (attrs & 128) codes.push('9');

					codes.push(`38;2;${fg.r};${fg.g};${fg.b}`);
					codes.push(`48;2;${bg.r};${bg.g};${bg.b}`);

					output += `\x1b[${codes.join(';')}m`;
					output += cell.char || ' ';
					output += RESET;
				} else {
					output += ' ';
				}
			}

			output += borderColor + '│' + RESET;
		}
	}

	// Bottom border
	output += `\x1b[${pane.y + dims.height + 2};${pane.x + 1}H`;
	output += borderColor;
	output += '└';
	output += '─'.repeat(dims.width);
	output += '┘';
	output += RESET;

	return output;
}

/**
 * Renders the entire multiplexer screen.
 */
function render(state: MultiplexerState): void {
	let output = '\x1b[?25l\x1b[H'; // Hide cursor, home

	// Render all panes
	for (let i = 0; i < state.panes.length; i++) {
		const pane = state.panes[i];
		if (pane) {
			output += renderPane(pane, i === state.focusedIndex);
		}
	}

	// Status bar at bottom
	const statusY = state.screenHeight;
	output += `\x1b[${statusY};1H`;
	output += '\x1b[7m'; // Reverse video for status bar

	const focusedPane = state.panes[state.focusedIndex];
	const paneInfo = focusedPane?.terminal.isRunning() ? '\x1b[32m●\x1b[0m\x1b[7m Shell' : '\x1b[31m○\x1b[0m\x1b[7m No shell';

	const left = ` Pane ${state.focusedIndex + 1}/${state.panes.length} ${paneInfo} `;
	const right = ' Tab:Next  Ctrl+N:New  Ctrl+D:Close  Ctrl+Q:Quit ';
	const padding = state.screenWidth - left.length - right.length + 14; // +14 accounts for ANSI codes

	output += left;
	output += ' '.repeat(Math.max(0, padding));
	output += right;
	output += RESET;

	// Position cursor in focused pane
	if (focusedPane) {
		const cursor = focusedPane.terminal.getCursor();
		const cursorX = focusedPane.x + cursor.x + 2;
		const cursorY = focusedPane.y + cursor.y + 2;
		output += `\x1b[${cursorY};${cursorX}H`;
	}

	process.stdout.write(output);
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Parse escape sequences from raw input.
 */
function parseInput(data: string): { key: string; ctrl: boolean; shift: boolean; mouseX?: number; mouseY?: number } {
	const result = { key: '', ctrl: false, shift: false, mouseX: undefined as number | undefined, mouseY: undefined as number | undefined };

	// Ctrl combinations
	if (data === '\x03') {
		result.key = 'c';
		result.ctrl = true;
	} else if (data === '\x04') {
		result.key = 'd';
		result.ctrl = true;
	} else if (data === '\x0e') {
		result.key = 'n';
		result.ctrl = true;
	} else if (data === '\x11') {
		result.key = 'q';
		result.ctrl = true;
	} else if (data === '\t') {
		result.key = 'tab';
	} else if (data === '\x1b[Z') {
		result.key = 'tab';
		result.shift = true;
	} else if (data.startsWith('\x1b[M') || data.startsWith('\x1b[<')) {
		// Mouse click
		const match = data.match(/\x1b\[<?\d+;(\d+);(\d+)/);
		if (match && match[1] && match[2]) {
			result.key = 'mouse';
			result.mouseX = Number.parseInt(match[1], 10);
			result.mouseY = Number.parseInt(match[2], 10);
		}
	} else if (data.length === 1) {
		result.key = data;
	}

	return result;
}

/**
 * Determine which pane was clicked.
 */
function getPaneAtPosition(state: MultiplexerState, x: number, y: number): number {
	for (let i = 0; i < state.panes.length; i++) {
		const pane = state.panes[i];
		if (pane && x >= pane.x && x < pane.x + pane.width && y >= pane.y && y < pane.y + pane.height) {
			return i;
		}
	}
	return -1;
}

/**
 * Handle keyboard/mouse input.
 */
function handleInput(state: MultiplexerState, data: string): void {
	const parsed = parseInput(data);

	// Global keybindings
	if (parsed.ctrl && parsed.key === 'q') {
		state.running = false;
		return;
	}

	if (parsed.ctrl && parsed.key === 'c') {
		// Forward Ctrl+C to shell if running, otherwise quit
		const focusedPane = state.panes[state.focusedIndex];
		if (focusedPane?.terminal.isRunning()) {
			focusedPane.terminal.input(data);
			return;
		}
		state.running = false;
		return;
	}

	if (parsed.ctrl && parsed.key === 'd') {
		closePane(state);
		return;
	}

	if (parsed.ctrl && parsed.key === 'n') {
		addPane(state);
		return;
	}

	if (parsed.key === 'tab') {
		if (parsed.shift) {
			state.focusedIndex = (state.focusedIndex - 1 + state.panes.length) % state.panes.length;
		} else {
			state.focusedIndex = (state.focusedIndex + 1) % state.panes.length;
		}
		state.needsRender = true;
		return;
	}

	if (parsed.key === 'mouse' && parsed.mouseX !== undefined && parsed.mouseY !== undefined) {
		const clicked = getPaneAtPosition(state, parsed.mouseX - 1, parsed.mouseY - 1);
		if (clicked >= 0 && clicked !== state.focusedIndex) {
			state.focusedIndex = clicked;
			state.needsRender = true;
		}
		return;
	}

	// Forward all other input to focused pane's shell
	const focusedPane = state.panes[state.focusedIndex];
	if (focusedPane?.terminal.isRunning()) {
		focusedPane.terminal.input(data);
	}
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const stdout = process.stdout;
	const stdin = process.stdin;

	const screenWidth = stdout.columns ?? 80;
	const screenHeight = stdout.rows ?? 24;

	// Validate minimum size
	if (screenWidth < MIN_PANE_WIDTH * 2 || screenHeight < MIN_PANE_HEIGHT * 2 + 2) {
		console.error(`Terminal too small. Minimum size: ${MIN_PANE_WIDTH * 2}x${MIN_PANE_HEIGHT * 2 + 2}`);
		process.exit(1);
	}

	// Initialize state
	const state: MultiplexerState = {
		world: createWorld() as World,
		panes: [],
		focusedIndex: 0,
		layout: { rows: 2, cols: 2 },
		screenWidth,
		screenHeight,
		running: true,
		needsRender: true,
	};

	// Calculate initial layout
	const paneWidth = Math.floor(screenWidth / 2);
	const paneHeight = Math.floor((screenHeight - 2) / 2);

	// Create 4 panes in 2x2 grid
	for (let row = 0; row < 2; row++) {
		for (let col = 0; col < 2; col++) {
			const x = col * paneWidth;
			const y = row * paneHeight;
			const pane = createPane(state, row, col, x, y, paneWidth, paneHeight);
			state.panes.push(pane);
		}
	}

	// Terminal setup
	stdout.write('\x1b[?1049h'); // Alt screen
	stdout.write('\x1b[2J'); // Clear
	stdout.write('\x1b[?25l'); // Hide cursor
	stdout.write('\x1b[?1000h'); // Enable mouse tracking
	stdout.write('\x1b[?1006h'); // Enable SGR mouse mode

	stdin.setRawMode?.(true);
	stdin.resume();

	// Input handler
	stdin.on('data', (data: Buffer) => {
		handleInput(state, data.toString());
		state.needsRender = true;
	});

	// Resize handler
	stdout.on('resize', () => {
		state.screenWidth = stdout.columns ?? 80;
		state.screenHeight = stdout.rows ?? 24;
		calculateLayout(state);
		state.needsRender = true;
	});

	// Render loop
	const FRAME_MS = 1000 / 30;
	const loop = (): void => {
		if (!state.running) {
			// Cleanup
			for (const pane of state.panes) {
				pane.terminal.kill();
				pane.terminal.destroy();
			}
			stdout.write('\x1b[?1000l'); // Disable mouse
			stdout.write('\x1b[?1006l'); // Disable SGR mouse
			stdout.write('\x1b[?25h'); // Show cursor
			stdout.write('\x1b[?1049l'); // Exit alt screen
			stdout.write('\x1b[0m');
			process.exit(0);
		}

		if (state.needsRender) {
			render(state);
			state.needsRender = false;
		}

		setTimeout(loop, FRAME_MS);
	};

	// Initial render
	render(state);

	// Start loop
	loop();
}

main().catch((err) => {
	process.stdout.write('\x1b[?1000l');
	process.stdout.write('\x1b[?1006l');
	process.stdout.write('\x1b[?25h');
	process.stdout.write('\x1b[?1049l');
	process.stdout.write('\x1b[0m');
	console.error('Error:', err);
	process.exit(1);
});
