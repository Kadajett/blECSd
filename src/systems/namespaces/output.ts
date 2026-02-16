/**
 * Output system namespace.
 *
 * @example
 * ```typescript
 * import { output } from 'blecsd/systems';
 * const world = createWorld();
 * const system = output.create(world);
 * output.clearScreen(world);
 * output.hideCursor(world);
 * output.enterAlternateScreen(world);
 * ```
 */
import {
	beginSyncOutput,
	bell,
	cleanup,
	clearOutputBuffer,
	clearOutputStream,
	clearScreen,
	createOutputState,
	createOutputSystem,
	cursorHome,
	disableBracketedPasteMode,
	disableFocusReporting,
	disableMouseTracking,
	enableBracketedPasteMode,
	enableFocusReporting,
	enableMouseTracking,
	endSyncOutput,
	enterAlternateScreen,
	generateOutput,
	getOutputBuffer,
	getOutputState,
	getOutputStream,
	hideCursor,
	leaveAlternateScreen,
	moveTo,
	outputSystem,
	resetAttributes,
	resetOutputState,
	restoreCursorPosition,
	saveCursorPosition,
	setOutputBuffer,
	setOutputStream,
	setTerminalCursorShape,
	setWindowTitle,
	showCursor,
	writeRaw,
} from '../outputSystem';

export const output = Object.freeze({
	create: createOutputSystem,
	createState: createOutputState,
	system: outputSystem,
	cleanup,
	clearScreen,
	clearBuffer: clearOutputBuffer,
	clearStream: clearOutputStream,
	generate: generateOutput,
	getBuffer: getOutputBuffer,
	setBuffer: setOutputBuffer,
	getStream: getOutputStream,
	setStream: setOutputStream,
	getState: getOutputState,
	reset: resetOutputState,
	writeRaw,
	cursor: Object.freeze({
		hide: hideCursor,
		show: showCursor,
		home: cursorHome,
		moveTo,
		save: saveCursorPosition,
		restore: restoreCursorPosition,
		setShape: setTerminalCursorShape,
	}),
	screen: Object.freeze({
		enterAlternate: enterAlternateScreen,
		leaveAlternate: leaveAlternateScreen,
		setTitle: setWindowTitle,
		resetAttrs: resetAttributes,
		bell,
	}),
	mouse: Object.freeze({
		enable: enableMouseTracking,
		disable: disableMouseTracking,
	}),
	paste: Object.freeze({
		enable: enableBracketedPasteMode,
		disable: disableBracketedPasteMode,
	}),
	focus: Object.freeze({
		enable: enableFocusReporting,
		disable: disableFocusReporting,
	}),
	sync: Object.freeze({
		begin: beginSyncOutput,
		end: endSyncOutput,
	}),
});

export type OutputSystemModule = typeof output;
