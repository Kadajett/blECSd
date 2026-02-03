/**
 * Terminal Initialization and Cleanup
 *
 * Handles terminal setup, cleanup, CLI argument parsing, and signal handling.
 *
 * @module balatro/terminal/init
 */

import type { WriteStream, ReadStream } from 'node:tty';

// =============================================================================
// TYPES
// =============================================================================

export interface TerminalConfig {
	readonly mouseEnabled: boolean;
	readonly soundEnabled: boolean;
	readonly seed: number | null;
}

export interface TerminalState {
	readonly stdout: WriteStream;
	readonly stdin: ReadStream;
	readonly width: number;
	readonly height: number;
	readonly config: TerminalConfig;
	readonly isInitialized: boolean;
}

export interface ParsedArgs {
	readonly mouseEnabled: boolean;
	readonly soundEnabled: boolean;
	readonly seed: number | null;
	readonly help: boolean;
	readonly version: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** App version */
export const VERSION = '0.1.0';

/** App name */
export const APP_NAME = 'balatro-terminal';

/** Help text */
export const HELP_TEXT = `
${APP_NAME} v${VERSION}

A terminal-based poker roguelike inspired by Balatro.

USAGE:
  npx balatro [options]

OPTIONS:
  --no-mouse    Disable mouse support
  --no-sound    Disable sound (terminal bells)
  --seed <n>    Set random seed for reproducible games
  --help, -h    Show this help message
  --version     Show version

CONTROLS:
  ↑/↓ or j/k    Navigate
  Enter/Space   Select
  1-8           Select card by position
  P             Play selected cards
  D             Discard selected cards
  Q or Ctrl+C   Quit

`;

// =============================================================================
// CLI PARSING
// =============================================================================

/**
 * Parses command-line arguments.
 *
 * @param argv - Command-line arguments (process.argv.slice(2))
 * @returns Parsed arguments
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
	let mouseEnabled = true;
	let soundEnabled = true;
	let seed: number | null = null;
	let help = false;
	let version = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		switch (arg) {
			case '--no-mouse':
				mouseEnabled = false;
				break;
			case '--no-sound':
				soundEnabled = false;
				break;
			case '--seed': {
				const nextArg = argv[i + 1];
				if (nextArg && !nextArg.startsWith('-')) {
					const parsed = parseInt(nextArg, 10);
					if (!isNaN(parsed)) {
						seed = parsed;
					}
					i++;
				}
				break;
			}
			case '--help':
			case '-h':
				help = true;
				break;
			case '--version':
				version = true;
				break;
		}
	}

	return { mouseEnabled, soundEnabled, seed, help, version };
}

/**
 * Creates terminal config from parsed args.
 *
 * @param args - Parsed arguments
 * @returns Terminal config
 */
export function createConfigFromArgs(args: ParsedArgs): TerminalConfig {
	return {
		mouseEnabled: args.mouseEnabled,
		soundEnabled: args.soundEnabled,
		seed: args.seed,
	};
}

// =============================================================================
// TERMINAL SETUP
// =============================================================================

/**
 * Initializes the terminal for the game.
 *
 * @param stdout - Write stream (process.stdout)
 * @param stdin - Read stream (process.stdin)
 * @param config - Terminal configuration
 * @returns Terminal state
 */
export function initializeTerminal(
	stdout: WriteStream,
	stdin: ReadStream,
	config: TerminalConfig,
): TerminalState {
	// Enter alternate screen buffer
	stdout.write('\x1b[?1049h');

	// Hide cursor
	stdout.write('\x1b[?25l');

	// Clear screen
	stdout.write('\x1b[2J');

	// Move to top-left
	stdout.write('\x1b[H');

	// Enable mouse tracking (if enabled)
	if (config.mouseEnabled) {
		// Enable SGR mouse mode (button events)
		stdout.write('\x1b[?1000h'); // Mouse button tracking
		stdout.write('\x1b[?1002h'); // Mouse button motion tracking
		stdout.write('\x1b[?1006h'); // SGR extended coordinates
	}

	// Enable raw mode for keyboard
	if (stdin.setRawMode) {
		stdin.setRawMode(true);
	}

	// Resume stdin to receive input
	stdin.resume();

	return {
		stdout,
		stdin,
		width: stdout.columns ?? 80,
		height: stdout.rows ?? 24,
		config,
		isInitialized: true,
	};
}

/**
 * Cleans up the terminal state.
 *
 * @param state - Terminal state
 */
export function cleanupTerminal(state: TerminalState): void {
	const { stdout, stdin, config } = state;

	// Disable mouse tracking
	if (config.mouseEnabled) {
		stdout.write('\x1b[?1006l');
		stdout.write('\x1b[?1002l');
		stdout.write('\x1b[?1000l');
	}

	// Show cursor
	stdout.write('\x1b[?25h');

	// Reset colors/attributes
	stdout.write('\x1b[0m');

	// Exit alternate screen buffer
	stdout.write('\x1b[?1049l');

	// Disable raw mode
	if (stdin.setRawMode) {
		stdin.setRawMode(false);
	}
}

// =============================================================================
// SIGNAL HANDLING
// =============================================================================

export type CleanupCallback = () => void;

/**
 * Sets up signal handlers for clean exit.
 *
 * @param cleanup - Cleanup callback to run on exit
 * @returns Function to remove handlers
 */
export function setupSignalHandlers(cleanup: CleanupCallback): () => void {
	const handleSignal = (): void => {
		cleanup();
		process.exit(0);
	};

	const handleUncaught = (error: Error): void => {
		cleanup();
		console.error('Uncaught error:', error);
		process.exit(1);
	};

	// Handle SIGINT (Ctrl+C)
	process.on('SIGINT', handleSignal);

	// Handle SIGTERM
	process.on('SIGTERM', handleSignal);

	// Handle uncaught exceptions
	process.on('uncaughtException', handleUncaught);

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason) => {
		cleanup();
		console.error('Unhandled rejection:', reason);
		process.exit(1);
	});

	// Return function to remove handlers
	return () => {
		process.removeListener('SIGINT', handleSignal);
		process.removeListener('SIGTERM', handleSignal);
		process.removeListener('uncaughtException', handleUncaught);
	};
}

// =============================================================================
// RESIZE HANDLING
// =============================================================================

export type ResizeCallback = (width: number, height: number) => void;

/**
 * Sets up resize handler.
 *
 * @param stdout - Write stream
 * @param callback - Callback to run on resize
 * @returns Function to remove handler
 */
export function setupResizeHandler(
	stdout: WriteStream,
	callback: ResizeCallback,
): () => void {
	const handleResize = (): void => {
		const width = stdout.columns ?? 80;
		const height = stdout.rows ?? 24;
		callback(width, height);
	};

	// Handle SIGWINCH
	process.on('SIGWINCH', handleResize);

	// Also listen on stdout resize event
	stdout.on('resize', handleResize);

	return () => {
		process.removeListener('SIGWINCH', handleResize);
		stdout.removeListener('resize', handleResize);
	};
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the current terminal dimensions.
 *
 * @param stdout - Write stream
 * @returns Width and height
 */
export function getTerminalSize(stdout: WriteStream): { width: number; height: number } {
	return {
		width: stdout.columns ?? 80,
		height: stdout.rows ?? 24,
	};
}

/**
 * Checks if the terminal is a TTY.
 *
 * @param stdout - Write stream
 * @returns True if TTY
 */
export function isTTY(stdout: WriteStream): boolean {
	return stdout.isTTY === true;
}

/**
 * Plays a terminal bell sound.
 *
 * @param stdout - Write stream
 * @param enabled - Whether sound is enabled
 */
export function playBell(stdout: WriteStream, enabled: boolean): void {
	if (enabled) {
		stdout.write('\x07');
	}
}

/**
 * Writes directly to the terminal.
 *
 * @param stdout - Write stream
 * @param content - Content to write
 */
export function writeToTerminal(stdout: WriteStream, content: string): void {
	stdout.write(content);
}

/**
 * Moves the cursor to a position.
 *
 * @param stdout - Write stream
 * @param x - X position (0-indexed)
 * @param y - Y position (0-indexed)
 */
export function moveCursor(stdout: WriteStream, x: number, y: number): void {
	// ANSI uses 1-indexed positions
	stdout.write(`\x1b[${y + 1};${x + 1}H`);
}

/**
 * Clears the screen.
 *
 * @param stdout - Write stream
 */
export function clearScreen(stdout: WriteStream): void {
	stdout.write('\x1b[2J\x1b[H');
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

/**
 * Creates default terminal config.
 */
export function createDefaultConfig(): TerminalConfig {
	return {
		mouseEnabled: true,
		soundEnabled: true,
		seed: null,
	};
}
