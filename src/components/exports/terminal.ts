/**
 * Terminal-specific components (accessibility, terminalBuffer, textSelection)
 * @module components/exports/terminal
 */

// Accessibility component
export type { AccessibleRole } from '../accessibility';
export {
	Accessible,
	announce,
	clearAccessibilityLabels,
	getAccessibleLabel,
	getAccessibleRole,
	setAccessibleLabel,
	setAccessibleRole,
} from '../accessibility';

// TerminalBuffer component
export type {
	CursorShape as TerminalCursorShape,
	TerminalBufferConfig,
	TerminalState,
} from '../terminalBuffer';
export {
	clearTerminal,
	DEFAULT_SCROLLBACK_LINES,
	DEFAULT_TERMINAL_HEIGHT,
	DEFAULT_TERMINAL_WIDTH,
	getTerminalBuffer,
	getTerminalCells,
	getTerminalState,
	hasTerminalBuffer,
	removeTerminalBuffer,
	renderTerminalToAnsi,
	resetTerminal,
	resetTerminalBufferStore,
	resizeTerminalBuffer,
	scrollTerminalDown,
	scrollTerminalToBottom,
	scrollTerminalToTop,
	scrollTerminalUp,
	setCursorPosition,
	setCursorVisible,
	setTerminalBuffer,
	TerminalBuffer,
	TerminalBufferConfigSchema,
	writeChar,
	writeToTerminal,
} from '../terminalBuffer';

// TextSelection component for virtualized content
export type {
	CopyProgress,
	LineSelectionInfo,
	SelectionMode,
	SelectionPosition,
	SelectionRange,
	TextSelectionState,
} from '../textSelection';
export {
	BACKGROUND_COPY_CHUNK_SIZE,
	clearTextSelection,
	createBackgroundCopy,
	createSelectionState,
	getLineSelectionInfo,
	getNormalizedRange,
	getSelectedLinesInViewport,
	getSelectedText,
	getSelectionDirtyRanges,
	getSelectionLineCount,
	getSelectionState,
	hasActiveSelection,
	hasSelectionState,
	isLineSelected,
	registerSelectionState,
	removeSelectionState,
	resetSelectionStore,
	SelectionModeSchema,
	SelectionPositionSchema,
	SYNC_COPY_LINE_LIMIT,
	selectAll,
	selectLine,
	selectLineRange,
	setSelectionMode,
	snapshotSelection,
	startSelection,
	updateSelection,
} from '../textSelection';
