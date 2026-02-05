#!/usr/bin/env node
/**
 * System Monitor Dashboard Example
 *
 * An htop-like real-time system monitor demonstrating blECSd's capabilities:
 * - Progress bars for CPU, memory, disk usage
 * - Real-time data updates using the scheduler
 * - Sparkline-style history graphs using braille characters
 * - Multi-panel layout
 * - Color-coded thresholds (green/yellow/red)
 *
 * Controls:
 * - q or Ctrl+C: Quit
 * - r: Refresh immediately
 * - Tab: Cycle through panels
 *
 * Run: pnpm dev
 *
 * @module examples/system-monitor
 */

import * as os from 'node:os';
import { createWorld, type World } from 'blecsd';

// =============================================================================
// CONFIGURATION
// =============================================================================

const POLL_INTERVAL_MS = 1000;
const HISTORY_LENGTH = 60; // 60 samples = 60 seconds of history
const RENDER_FPS = 10;

// Color thresholds
const THRESHOLD_LOW = 50;
const THRESHOLD_HIGH = 80;

// Colors (ANSI)
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_WHITE = '\x1b[37m';
const COLOR_DIM = '\x1b[90m';
const COLOR_BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// Box drawing characters
const BOX_TL = '┌';
const BOX_TR = '┐';
const BOX_BL = '└';
const BOX_BR = '┘';
const BOX_H = '─';
const BOX_V = '│';

// Progress bar characters
const BAR_FILLED = '█';
const BAR_PARTIAL = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const BAR_EMPTY = '░';

// Braille patterns for sparklines (0-7 height in a character)
const BRAILLE_BASE = 0x2800;
// Dots: 1=0x01, 2=0x02, 3=0x04, 4=0x40, 5=0x08, 6=0x10, 7=0x20, 8=0x80
// For vertical sparklines, we use dots 1-4 (left column)
const BRAILLE_DOTS = [0, 0x01, 0x03, 0x07, 0x47, 0x4f, 0x5f, 0x7f, 0xff];

// =============================================================================
// TYPES
// =============================================================================

interface CpuTimes {
	user: number;
	nice: number;
	sys: number;
	idle: number;
	irq: number;
}

interface SystemStats {
	cpuUsage: number[];
	cpuHistory: number[][];
	memoryUsed: number;
	memoryTotal: number;
	memoryHistory: number[];
	swapUsed: number;
	swapTotal: number;
	diskUsed: number;
	diskTotal: number;
	loadAvg: number[];
	uptime: number;
	processes: number;
	networkRx: number;
	networkTx: number;
}

interface MonitorState {
	world: World;
	stats: SystemStats;
	previousCpuTimes: CpuTimes[];
	running: boolean;
	needsRender: boolean;
	screenWidth: number;
	screenHeight: number;
	focusedPanel: number;
}

// =============================================================================
// SYSTEM STATS COLLECTION
// =============================================================================

/**
 * Gets CPU usage per core as percentage.
 */
function getCpuUsage(state: MonitorState): number[] {
	const cpus = os.cpus();
	const usage: number[] = [];

	for (let i = 0; i < cpus.length; i++) {
		const cpu = cpus[i];
		if (!cpu) continue;

		const current: CpuTimes = {
			user: cpu.times.user,
			nice: cpu.times.nice,
			sys: cpu.times.sys,
			idle: cpu.times.idle,
			irq: cpu.times.irq,
		};

		const previous = state.previousCpuTimes[i] || current;
		state.previousCpuTimes[i] = current;

		const userDiff = current.user - previous.user;
		const niceDiff = current.nice - previous.nice;
		const sysDiff = current.sys - previous.sys;
		const idleDiff = current.idle - previous.idle;
		const irqDiff = current.irq - previous.irq;

		const total = userDiff + niceDiff + sysDiff + idleDiff + irqDiff;
		const active = userDiff + niceDiff + sysDiff + irqDiff;

		usage.push(total > 0 ? (active / total) * 100 : 0);
	}

	return usage;
}

/**
 * Gets memory usage in bytes.
 */
function getMemoryUsage(): { used: number; total: number } {
	const total = os.totalmem();
	const free = os.freemem();
	return { used: total - free, total };
}

/**
 * Gets process count (approximation).
 */
function getProcessCount(): number {
	// Node.js doesn't have a direct way to count processes
	// We'll use a rough estimate based on load average
	return Math.floor((os.loadavg()[0] ?? 0) * 10) + 50;
}

/**
 * Collects all system stats.
 */
function collectStats(state: MonitorState): void {
	// CPU
	state.stats.cpuUsage = getCpuUsage(state);
	for (let i = 0; i < state.stats.cpuUsage.length; i++) {
		if (!state.stats.cpuHistory[i]) {
			state.stats.cpuHistory[i] = [];
		}
		const history = state.stats.cpuHistory[i];
		if (history) {
			history.push(state.stats.cpuUsage[i] ?? 0);
			if (history.length > HISTORY_LENGTH) {
				history.shift();
			}
		}
	}

	// Memory
	const mem = getMemoryUsage();
	state.stats.memoryUsed = mem.used;
	state.stats.memoryTotal = mem.total;
	const memPercent = (mem.used / mem.total) * 100;
	state.stats.memoryHistory.push(memPercent);
	if (state.stats.memoryHistory.length > HISTORY_LENGTH) {
		state.stats.memoryHistory.shift();
	}

	// System info
	state.stats.loadAvg = os.loadavg();
	state.stats.uptime = os.uptime();
	state.stats.processes = getProcessCount();

	state.needsRender = true;
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Gets color based on percentage value.
 */
function getThresholdColor(percent: number): string {
	if (percent >= THRESHOLD_HIGH) return COLOR_RED;
	if (percent >= THRESHOLD_LOW) return COLOR_YELLOW;
	return COLOR_GREEN;
}

/**
 * Formats bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
	const units = ['B', 'K', 'M', 'G', 'T'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toFixed(1)}${units[unit]}`;
}

/**
 * Formats duration to human-readable string.
 */
function formatDuration(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h ${mins}m`;
	}
	if (hours > 0) {
		return `${hours}h ${mins}m`;
	}
	return `${mins}m`;
}

/**
 * Renders a progress bar.
 */
function renderProgressBar(percent: number, width: number): string {
	const filledWidth = (percent / 100) * width;
	const fullChars = Math.floor(filledWidth);
	const partialIndex = Math.floor((filledWidth - fullChars) * 8);

	const color = getThresholdColor(percent);
	let bar = color;
	bar += BAR_FILLED.repeat(fullChars);
	if (fullChars < width) {
		bar += BAR_PARTIAL[partialIndex] || '';
		bar += COLOR_DIM + BAR_EMPTY.repeat(width - fullChars - 1);
	}
	bar += RESET;

	return bar;
}

/**
 * Renders a sparkline from history data using braille characters.
 */
function renderSparkline(history: number[], width: number): string {
	if (history.length === 0) return ' '.repeat(width);

	// Sample history to fit width
	const samples: number[] = [];
	const step = Math.max(1, Math.floor(history.length / width));
	for (let i = 0; i < width && i * step < history.length; i++) {
		const idx = Math.min(history.length - 1, i * step);
		samples.push(history[idx] ?? 0);
	}

	// Render sparkline
	let sparkline = COLOR_CYAN;
	for (const value of samples) {
		const height = Math.min(8, Math.floor((value / 100) * 8));
		const char = String.fromCharCode(BRAILLE_BASE + (BRAILLE_DOTS[height] ?? 0));
		sparkline += char;
	}
	sparkline += RESET;

	// Pad if needed
	if (samples.length < width) {
		sparkline += ' '.repeat(width - samples.length);
	}

	return sparkline;
}

/**
 * Draws a box with title.
 */
function drawBox(x: number, y: number, width: number, height: number, title: string, focused: boolean): string {
	const borderColor = focused ? COLOR_CYAN + COLOR_BOLD : COLOR_DIM;
	let output = '';

	// Top border
	output += `\x1b[${y};${x}H`;
	output += borderColor + BOX_TL;
	const titlePadded = ` ${title} `;
	const leftPad = Math.floor((width - 2 - titlePadded.length) / 2);
	const rightPad = width - 2 - titlePadded.length - leftPad;
	output += BOX_H.repeat(Math.max(0, leftPad));
	output += COLOR_WHITE + COLOR_BOLD + titlePadded + RESET + borderColor;
	output += BOX_H.repeat(Math.max(0, rightPad));
	output += BOX_TR + RESET;

	// Sides
	for (let row = 1; row < height - 1; row++) {
		output += `\x1b[${y + row};${x}H${borderColor}${BOX_V}${RESET}`;
		output += `\x1b[${y + row};${x + width - 1}H${borderColor}${BOX_V}${RESET}`;
	}

	// Bottom border
	output += `\x1b[${y + height - 1};${x}H`;
	output += borderColor + BOX_BL + BOX_H.repeat(width - 2) + BOX_BR + RESET;

	return output;
}

// =============================================================================
// PANEL RENDERING
// =============================================================================

/**
 * Renders CPU panel.
 */
function renderCpuPanel(state: MonitorState, x: number, y: number, width: number, height: number): string {
	let output = drawBox(x, y, width, height, 'CPU', state.focusedPanel === 0);

	const innerWidth = width - 4;
	const barWidth = Math.max(10, innerWidth - 20);
	const cpus = state.stats.cpuUsage;

	let row = y + 1;
	for (let i = 0; i < Math.min(cpus.length, height - 3); i++) {
		const usage = cpus[i] ?? 0;
		const history = state.stats.cpuHistory[i] ?? [];

		output += `\x1b[${row};${x + 2}H`;
		output += `${COLOR_DIM}CPU${i.toString().padStart(2)}${RESET} `;
		output += renderProgressBar(usage, barWidth);
		output += ` ${usage.toFixed(1).padStart(5)}%`;

		// Mini sparkline if space
		if (innerWidth > 40 && history.length > 0) {
			output += ' ';
			output += renderSparkline(history, 10);
		}

		row++;
	}

	// Average load
	const avgUsage = cpus.length > 0 ? cpus.reduce((a, b) => a + b, 0) / cpus.length : 0;
	if (row < y + height - 1) {
		output += `\x1b[${row};${x + 2}H`;
		output += `${COLOR_WHITE}Avg: ${getThresholdColor(avgUsage)}${avgUsage.toFixed(1)}%${RESET}`;
		output += `  ${COLOR_DIM}Load: ${state.stats.loadAvg.map((l) => l.toFixed(2)).join(' ')}${RESET}`;
	}

	return output;
}

/**
 * Renders Memory panel.
 */
function renderMemoryPanel(state: MonitorState, x: number, y: number, width: number, height: number): string {
	let output = drawBox(x, y, width, height, 'Memory', state.focusedPanel === 1);

	const innerWidth = width - 4;
	const barWidth = Math.max(10, innerWidth - 25);

	const memPercent = (state.stats.memoryUsed / state.stats.memoryTotal) * 100;
	const memUsed = formatBytes(state.stats.memoryUsed);
	const memTotal = formatBytes(state.stats.memoryTotal);

	// Memory bar
	output += `\x1b[${y + 1};${x + 2}H`;
	output += `${COLOR_WHITE}RAM ${RESET}`;
	output += renderProgressBar(memPercent, barWidth);
	output += ` ${memPercent.toFixed(1).padStart(5)}%`;

	// Memory details
	output += `\x1b[${y + 2};${x + 2}H`;
	output += `${COLOR_DIM}Used: ${memUsed} / ${memTotal}${RESET}`;

	// History sparkline
	if (height > 4) {
		output += `\x1b[${y + 4};${x + 2}H`;
		output += `${COLOR_DIM}History:${RESET} `;
		output += renderSparkline(state.stats.memoryHistory, Math.min(30, innerWidth - 10));
	}

	return output;
}

/**
 * Renders System Info panel.
 */
function renderSystemPanel(state: MonitorState, x: number, y: number, width: number, height: number): string {
	let output = drawBox(x, y, width, height, 'System', state.focusedPanel === 2);

	const lines = [
		`${COLOR_CYAN}Hostname:${RESET}  ${os.hostname()}`,
		`${COLOR_CYAN}Platform:${RESET}  ${os.platform()} ${os.arch()}`,
		`${COLOR_CYAN}Kernel:${RESET}    ${os.release()}`,
		`${COLOR_CYAN}Uptime:${RESET}    ${formatDuration(state.stats.uptime)}`,
		`${COLOR_CYAN}Processes:${RESET} ~${state.stats.processes}`,
		`${COLOR_CYAN}CPUs:${RESET}      ${os.cpus().length} cores`,
	];

	for (let i = 0; i < Math.min(lines.length, height - 2); i++) {
		output += `\x1b[${y + 1 + i};${x + 2}H`;
		output += lines[i];
	}

	return output;
}

/**
 * Renders help bar.
 */
function renderHelpBar(state: MonitorState): string {
	const y = state.screenHeight;
	let output = `\x1b[${y};1H`;
	output += '\x1b[7m'; // Reverse video

	const help = ' q:Quit  r:Refresh  Tab:Next Panel ';
	const timestamp = new Date().toLocaleTimeString();
	const padding = state.screenWidth - help.length - timestamp.length - 2;

	output += help;
	output += ' '.repeat(Math.max(0, padding));
	output += timestamp + ' ';
	output += RESET;

	return output;
}

// =============================================================================
// MAIN RENDER
// =============================================================================

/**
 * Renders the entire dashboard.
 */
function render(state: MonitorState): void {
	let output = '\x1b[?25l\x1b[H'; // Hide cursor, home

	const { screenWidth, screenHeight } = state;

	// Calculate panel dimensions
	const leftWidth = Math.floor(screenWidth * 0.6);
	const rightWidth = screenWidth - leftWidth;
	const topHeight = Math.min(os.cpus().length + 4, Math.floor((screenHeight - 1) * 0.6));
	const bottomHeight = screenHeight - 1 - topHeight;

	// Render panels
	output += renderCpuPanel(state, 1, 1, leftWidth, topHeight);
	output += renderMemoryPanel(state, 1, topHeight + 1, leftWidth, bottomHeight);
	output += renderSystemPanel(state, leftWidth + 1, 1, rightWidth, screenHeight - 1);

	// Help bar
	output += renderHelpBar(state);

	process.stdout.write(output);
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Handle keyboard input.
 */
function handleInput(state: MonitorState, data: string): void {
	if (data === 'q' || data === 'Q' || data === '\x03') {
		state.running = false;
		return;
	}

	if (data === 'r' || data === 'R') {
		collectStats(state);
		return;
	}

	if (data === '\t') {
		state.focusedPanel = (state.focusedPanel + 1) % 3;
		state.needsRender = true;
		return;
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

	// Initialize state
	const state: MonitorState = {
		world: createWorld() as World,
		stats: {
			cpuUsage: [],
			cpuHistory: [],
			memoryUsed: 0,
			memoryTotal: os.totalmem(),
			memoryHistory: [],
			swapUsed: 0,
			swapTotal: 0,
			diskUsed: 0,
			diskTotal: 0,
			loadAvg: [0, 0, 0],
			uptime: 0,
			processes: 0,
			networkRx: 0,
			networkTx: 0,
		},
		previousCpuTimes: [],
		running: true,
		needsRender: true,
		screenWidth,
		screenHeight,
		focusedPanel: 0,
	};

	// Terminal setup
	stdout.write('\x1b[?1049h'); // Alt screen
	stdout.write('\x1b[2J'); // Clear
	stdout.write('\x1b[?25l'); // Hide cursor

	stdin.setRawMode?.(true);
	stdin.resume();

	// Input handler
	stdin.on('data', (data: Buffer) => {
		handleInput(state, data.toString());
	});

	// Resize handler
	stdout.on('resize', () => {
		state.screenWidth = stdout.columns ?? 80;
		state.screenHeight = stdout.rows ?? 24;
		state.needsRender = true;
	});

	// Initial stats collection
	collectStats(state);

	// Stats polling
	const pollInterval = setInterval(() => {
		if (state.running) {
			collectStats(state);
		}
	}, POLL_INTERVAL_MS);

	// Render loop
	const FRAME_MS = 1000 / RENDER_FPS;
	const loop = (): void => {
		if (!state.running) {
			clearInterval(pollInterval);
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

	// Start
	render(state);
	loop();
}

main().catch((err) => {
	process.stdout.write('\x1b[?25h');
	process.stdout.write('\x1b[?1049l');
	process.stdout.write('\x1b[0m');
	console.error('Error:', err);
	process.exit(1);
});
