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

export type {
	SoundType,
	SoundMode,
	SoundConfig,
	SoundEvent,
	SoundQueueState,
} from './sound';

export {
	createSoundConfig,
	setSoundEnabled,
	setSoundMode,
	createSoundQueue,
	enqueueSound,
	enqueueSounds,
	dequeueSound,
	clearSoundQueue,
	getBellString,
	getSoundBells,
	isSoundEnabled,
	getSoundDefinition,
	hasPendingSounds,
	getPendingCount,
	getAllSoundTypes,
} from './sound';
