/**
 * Shared Demo Utilities
 *
 * Common terminal setup/teardown, rendering helpers, and input utilities
 * used across all blECSd demos.
 *
 * @module demos/demo-utils
 */

const stdout = process.stdout;
const stdin = process.stdin;

// ── Terminal Lifecycle ────────────────────────────────────────────────

/**
 * Enter alt screen, hide cursor, and set stdin to raw mode.
 *
 * @example
 * ```typescript
 * import { setupTerminal } from './demo-utils';
 * setupTerminal();
 * ```
 */
export function setupTerminal(): void {
	stdout.write('\x1b[?1049h\x1b[?25l');
	if (stdin.setRawMode) {
		stdin.setRawMode(true);
	}
	stdin.resume();
}

/**
 * Show cursor, exit alt screen, and restore stdin.
 *
 * @example
 * ```typescript
 * import { shutdownTerminal } from './demo-utils';
 * shutdownTerminal();
 * process.exit(0);
 * ```
 */
export function shutdownTerminal(): void {
	if (stdin.setRawMode) {
		stdin.setRawMode(false);
	}
	stdout.write('\x1b[?25h\x1b[?1049l');
}

/**
 * Register SIGINT and SIGTERM handlers that call the provided cleanup function.
 *
 * @param onShutdown - Cleanup callback (should call shutdownTerminal and process.exit)
 *
 * @example
 * ```typescript
 * import { setupSignalHandlers, shutdownTerminal } from './demo-utils';
 * setupSignalHandlers(() => { shutdownTerminal(); process.exit(0); });
 * ```
 */
export function setupSignalHandlers(onShutdown: () => void): void {
	process.on('SIGINT', onShutdown);
	process.on('SIGTERM', onShutdown);
}

// ── Terminal Dimensions ──────────────────────────────────────────────

/**
 * Get current terminal dimensions with fallback defaults.
 *
 * @returns Object with width (columns) and height (rows)
 *
 * @example
 * ```typescript
 * import { getTerminalSize } from './demo-utils';
 * const { width, height } = getTerminalSize();
 * ```
 */
export function getTerminalSize(): { width: number; height: number } {
	return {
		width: stdout.columns ?? 80,
		height: stdout.rows ?? 24,
	};
}

// ── Rendering Helpers ────────────────────────────────────────────────

/**
 * Return ANSI escape to clear the screen and move cursor to top-left.
 *
 * @example
 * ```typescript
 * import { clearScreen } from './demo-utils';
 * process.stdout.write(clearScreen());
 * ```
 */
export function clearScreen(): string {
	return '\x1b[2J\x1b[H';
}

/**
 * Return ANSI escape to move cursor to a position (1-based row/col).
 *
 * @param row - Row (1-based)
 * @param col - Column (1-based)
 *
 * @example
 * ```typescript
 * import { moveTo } from './demo-utils';
 * process.stdout.write(moveTo(5, 10) + 'Hello');
 * ```
 */
export function moveTo(row: number, col: number): string {
	return `\x1b[${row};${col}H`;
}

/**
 * Format a help bar string for display at the bottom of the screen.
 * Primary commands are shown in yellow, secondary info in dim gray.
 *
 * @param commands - Primary key command descriptions (e.g. "[Tab] Switch  [q] Quit")
 * @param secondary - Optional secondary info string
 * @returns Formatted ANSI string (not positioned, caller should use moveTo)
 *
 * @example
 * ```typescript
 * import { formatHelpBar, moveTo, getTerminalSize } from './demo-utils';
 * const { height } = getTerminalSize();
 * const help = formatHelpBar('[Up/Down] Navigate  [q] Quit', 'Items: 42');
 * process.stdout.write(moveTo(height, 1) + help);
 * ```
 */
export function formatHelpBar(commands: string, secondary?: string): string {
	const cmd = `\x1b[33m${commands}\x1b[0m`;
	if (!secondary) return cmd;
	return `${cmd}  \x1b[90m${secondary}\x1b[0m`;
}

/**
 * Render a styled title line with bold text.
 *
 * @param title - Title text
 * @returns ANSI-formatted bold title string
 *
 * @example
 * ```typescript
 * import { formatTitle } from './demo-utils';
 * process.stdout.write(formatTitle('My Demo'));
 * ```
 */
export function formatTitle(title: string): string {
	return `\x1b[1m  ${title}\x1b[0m`;
}

/**
 * Draw a horizontal rule using box-drawing characters.
 *
 * @param width - Width of the rule in characters
 * @returns String of repeated horizontal line characters
 *
 * @example
 * ```typescript
 * import { horizontalRule } from './demo-utils';
 * process.stdout.write('  ' + horizontalRule(40));
 * ```
 */
export function horizontalRule(width: number): string {
	return '\u2500'.repeat(width);
}

// ── Input Helpers ────────────────────────────────────────────────────

/**
 * Check if the input buffer represents a quit key (q, Q, or Ctrl+C).
 *
 * @param data - Raw input buffer from stdin
 * @returns True if the user wants to quit
 *
 * @example
 * ```typescript
 * import { isQuitKey } from './demo-utils';
 * process.stdin.on('data', (data) => {
 *   if (isQuitKey(data)) { shutdown(); return; }
 * });
 * ```
 */
export function isQuitKey(data: Buffer): boolean {
	const first = data[0];
	if (first === 0x03) return true; // Ctrl+C
	const ch = data.toString('utf8');
	return ch === 'q' || ch === 'Q';
}

/**
 * Parse arrow key input from a raw buffer.
 *
 * @param data - Raw input buffer from stdin
 * @returns Direction string or null if not an arrow key
 *
 * @example
 * ```typescript
 * import { parseArrowKey } from './demo-utils';
 * const dir = parseArrowKey(data);
 * if (dir === 'up') scrollUp();
 * ```
 */
export function parseArrowKey(data: Buffer): 'up' | 'down' | 'left' | 'right' | null {
	const s = data.toString('utf8');
	if (s === '\x1b[A') return 'up';
	if (s === '\x1b[B') return 'down';
	if (s === '\x1b[C') return 'right';
	if (s === '\x1b[D') return 'left';
	return null;
}

/**
 * Parse page up/down and home/end keys from a raw buffer.
 *
 * @param data - Raw input buffer from stdin
 * @returns Key name or null if not a navigation key
 *
 * @example
 * ```typescript
 * import { parseNavKey } from './demo-utils';
 * const nav = parseNavKey(data);
 * if (nav === 'pagedown') scrollPage(1);
 * ```
 */
export function parseNavKey(data: Buffer): 'pageup' | 'pagedown' | 'home' | 'end' | null {
	const s = data.toString('utf8');
	if (s === '\x1b[5~') return 'pageup';
	if (s === '\x1b[6~') return 'pagedown';
	if (s === '\x1b[H') return 'home';
	if (s === '\x1b[F') return 'end';
	return null;
}

// ── Animation Loop ───────────────────────────────────────────────────

/**
 * Start a repeating animation loop at the specified FPS.
 * Returns a stop function.
 *
 * @param callback - Function called each frame
 * @param fps - Frames per second (default: 30)
 * @returns Function to stop the loop
 *
 * @example
 * ```typescript
 * import { startLoop } from './demo-utils';
 * const stop = startLoop(() => { updateState(); render(); }, 60);
 * // Later: stop();
 * ```
 */
export function startLoop(callback: () => void, fps = 30): () => void {
	const interval = setInterval(callback, Math.round(1000 / fps));
	return () => clearInterval(interval);
}
