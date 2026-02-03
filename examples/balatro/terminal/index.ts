/**
 * Terminal layer exports
 * @module balatro/terminal
 */

export type {
	TerminalConfig,
	TerminalState,
	ParsedArgs,
	CleanupCallback,
	ResizeCallback,
} from './init';

export {
	VERSION,
	APP_NAME,
	HELP_TEXT,
	parseArgs,
	createConfigFromArgs,
	initializeTerminal,
	cleanupTerminal,
	setupSignalHandlers,
	setupResizeHandler,
	getTerminalSize,
	isTTY,
	playBell,
	writeToTerminal,
	moveCursor,
	clearScreen,
	createDefaultConfig,
} from './init';
