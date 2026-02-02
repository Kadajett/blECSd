/**
 * Terminal I/O module
 *
 * Low-level terminal control and ANSI escape sequence generation.
 *
 * @module terminal
 * @internal Most exports are internal. Only select utilities are public.
 */

// ANSI escape code generator (internal)
export type {
	BasicColor,
	BoxDrawingSet,
	CharacterSetId,
	CharacterSetRegister,
	ClipboardSelectionType,
	Color,
	Color256,
	CursorShapeType,
	HyperlinkOptions,
	HyperlinkProtocol,
	LocatorButtonValue,
	LocatorEventValue,
	MediaCopyModeValue,
	RGBColor,
} from './ansi';
export {
	// Constants
	BEL,
	// Namespaces
	boxDrawing,
	bracketedPaste,
	ClipboardSelection,
	CSI,
	CursorShape,
	charset,
	clipboard,
	cursor,
	DCS,
	DEC_SPECIAL_GRAPHICS,
	DEFAULT_CLIPBOARD_MAX_SIZE,
	ESC,
	HYPERLINK_ALLOWED_PROTOCOLS,
	hyperlink,
	isHyperlinkAllowed,
	LocatorButton,
	LocatorEvent,
	locator,
	MediaCopyMode,
	MouseMode,
	mediaCopy,
	mouse,
	OSC,
	rectangle,
	SGR,
	ST,
	screen,
	style,
	sync,
	title,
	tmux,
	UNICODE_TO_ASCII,
	windowOps,
} from './ansi';
// ANSI attribute parser (internal)
export type { Attribute, CodeAttrOptions, InternalColor, OutputColorDepth } from './ansi/parser';
export {
	AttributeSchema,
	applySgrCodes,
	attrCode,
	attrToSgrCodes,
	attributesEqual,
	codeAttr,
	ColorType,
	cloneAttribute,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	sgrReset,
	stripAnsi,
	TextStyle,
	unpackRgb,
	visibleLength,
} from './ansi/parser';
// Capability negotiation (internal)
export type {
	CapabilityNegotiator,
	GraphicsProtocolValue,
	KittyKeyboardLevelValue,
	NegotiationTimingValue,
	NegotiatorConfig,
	TerminalCapabilities,
} from './capabilities';
export {
	capabilityQuery,
	createCapabilityNegotiator,
	DEFAULT_QUERY_TIMEOUT,
	GraphicsProtocol,
	getDefaultNegotiator,
	getTerminalCapabilities,
	hasCapability,
	KittyKeyboardLevel,
	MAX_QUERY_TIMEOUT,
	MIN_QUERY_TIMEOUT,
	NegotiationTiming,
	NegotiatorConfigSchema,
	resetDefaultNegotiator,
} from './capabilities';
// Cleanup and signal handling (internal)
export type { CleanupHandler, ExitHandler, ExitInfo, ExitReason } from './cleanup';
export {
	CleanupManager,
	onExit,
	registerForCleanup,
	unregisterFromCleanup,
} from './cleanup';
// Debug logging (internal)
export type {
	DebugLogger,
	DebugLoggerConfig,
	LogLevelName,
	LogLevelValue,
	TerminalStateDump,
} from './debug';
export {
	clearLog,
	configureDebugLogger,
	createDebugLogger,
	debugLoggers,
	dumpRaw,
	dumpTerminalState,
	getLogFile,
	isDebugLoggingEnabled,
	LogLevel,
} from './debug';
// Terminal detection (public utilities)
export type { ColorSupport, TerminalInfo } from './detection';
export {
	getColorDepth,
	getTerminalInfo,
	getTerminalVersion,
	isAlacritty,
	isBracketedPasteSupported,
	isColorSupported,
	isITerm2,
	isKitty,
	isMouseSupported,
	isScreen,
	isTmux,
	isTrueColorSupported,
	isUnicodeSupported,
	isVSCode,
	isVTE,
	isWindowsTerminal,
	isXterm,
} from './detection';
// Input stream handler
export type {
	FocusHandler,
	InputHandlerConfig,
	KeyHandler,
	MouseHandler,
	Unsubscribe,
} from './inputStream';
export { createInputHandler, InputHandler, InputHandlerConfigSchema } from './inputStream';
// Key parsing
export type { KeyEvent as ParsedKeyEvent, KeyName } from './keyParser';
export { isMouseSequence, KeyEventSchema, parseKeyBuffer, parseKeySequence } from './keyParser';
// Mouse parsing
export type {
	FocusEvent,
	MouseAction,
	MouseButton,
	MouseEvent as ParsedMouseEvent,
	MouseProtocol,
	ParseMouseResult,
} from './mouseParser';
export {
	FocusEventSchema,
	isMouseBuffer,
	MouseEventSchema,
	parseMouseSequence,
} from './mouseParser';
// Output buffering (internal)
export type { CursorPosition, OutputBufferOptions } from './outputBuffer';
export { OutputBuffer } from './outputBuffer';
// Optimized output buffering (public)
export type {
	ColorState,
	OutputBufferData,
	OutputBufferOptions as OptimizedOutputBufferOptions,
	OutputStats,
} from './optimizedOutput';
export {
	ATTR_BLINK,
	ATTR_BOLD,
	ATTR_DIM,
	ATTR_HIDDEN,
	ATTR_INVERSE,
	ATTR_ITALIC,
	ATTR_STRIKETHROUGH,
	ATTR_UNDERLINE,
	beginFrame,
	clearBuffer as clearOutputBuffer,
	clearLine,
	clearScreen as clearOutputScreen,
	clearToEnd,
	createOutputBuffer,
	DEFAULT_COLOR,
	endFrame,
	estimateBytesSaved,
	flushToStream,
	getBufferLength,
	getContents,
	getOutputStats,
	hideCursor,
	moveCursor,
	resetBuffer,
	resetColorState,
	resetStats as resetOutputStats,
	setAttributes,
	setBackground,
	setForeground,
	setScreenSize,
	showCursor,
	writeCellAt,
	writeChar,
	writeRaw,
	writeStringAt,
} from './optimizedOutput';
// Process utilities (internal)
export type { EditorOptions, ExecOptions, ExecResult, SpawnOptions } from './process';
export { exec, execSync, getDefaultEditor, processUtils, readEditor, spawn } from './process';
// Program (internal)
export type { KeyEvent, MouseEvent, ProgramConfig, ResizeEvent } from './program';
export { Program, ProgramConfigSchema } from './program';
// Response parser (internal)
export type {
	CharCellSizeResponse,
	CursorPositionResponse,
	DeviceStatusResponse,
	IconLabelResponse,
	LocatorPositionResponse,
	ParsedResponse,
	PrimaryDAResponse,
	ResponseTypeValue,
	ScreenSizeResponse,
	SecondaryDAResponse,
	TerminalResponse,
	TextAreaSizeResponse,
	UnknownResponse,
	WindowPositionResponse,
	WindowSizePixelsResponse,
	WindowStateResponse,
	WindowTitleResponse,
} from './responseParser';
export {
	CursorPositionSchema,
	isCharCellSize,
	isCursorPosition,
	isDeviceStatus,
	isIconLabel,
	isLocatorPosition,
	isPrimaryDA,
	isScreenSize,
	isSecondaryDA,
	isTextAreaSize,
	isUnknown,
	isWindowPosition,
	isWindowSizePixels,
	isWindowState,
	isWindowTitle,
	parseResponse,
	query,
	ResponseType,
} from './responseParser';
// Screen buffer and cell management
export type { AttrFlags, Cell, CellChange, ScreenBufferData } from './screen';
export {
	Attr,
	cellIndex,
	cellsEqual,
	clearBuffer,
	cloneCell,
	copyRegion,
	createCell,
	createScreenBuffer,
	DEFAULT_BG as CELL_DEFAULT_BG,
	DEFAULT_CHAR,
	DEFAULT_FG as CELL_DEFAULT_FG,
	diffBuffers,
	fillRect,
	getCell,
	hasAttr,
	isInBounds,
	resizeBuffer,
	setCell,
	setChar,
	withAttr,
	withoutAttr,
	writeString,
} from './screen';
// Screen buffer management (internal)
export type { CleanupCallback } from './screenBuffer';
export { ScreenBuffer } from './screenBuffer';
// Security utilities (internal)
export type { SanitizeOptions } from './security/sanitize';
export {
	categorizeEscapeSequences,
	containsEscapeSequences,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	SafeStringBuilder,
	SanitizeOptionsSchema,
	sanitizeForTerminal,
} from './security/sanitize';
// Suspend/resume handling (internal)
export type { SuspendManagerOptions, SuspendState } from './suspend';
export { SuspendManager, suspend, suspendSequences } from './suspend';
// Synchronized output (internal)
export type { SyncOutputOptions } from './syncOutput';
export { isSyncOutputSupported, SynchronizedOutput } from './syncOutput';
// Terminfo (internal)
export type {
	BooleanCapability,
	NumberCapability,
	StringCapability,
	TerminfoData,
	Tput,
	TputConfig,
} from './terminfo';
export { createTput, getDefaultTput, getDefaultXtermData, resetDefaultTput } from './terminfo';
// Resize handling
export type {
	ResizeEventData,
	ResizeEventMap,
	ResizeHandler,
	ResizeHandlerState,
} from './resize';
export {
	createResizeHandler,
	disableResizeHandling,
	enableResizeHandling,
	getResizeEventBus,
	getResizeHandler,
	resetResizeEventBus,
	setupSigwinchHandler,
	triggerResize,
} from './resize';
// Input control
export type {
	InputControlEventData,
	InputControlEventMap,
	InputControlOptions,
	InputControlState,
	MouseModeValue,
} from './inputControl';
export {
	areKeysEnabled,
	createInputControl,
	destroyInputControl,
	disableInput,
	disableKeys,
	disableMouse,
	disableWorldInput,
	disableWorldKeys,
	disableWorldMouse,
	enableInput,
	enableKeys,
	enableMouse,
	enableWorldInput,
	enableWorldKeys,
	enableWorldMouse,
	getInputControl,
	getInputControlEventBus,
	getMouseMode,
	isInputEnabled,
	isMouseEnabled,
	MouseTrackingMode,
	resetInputControlEventBus,
	setMouseMode,
} from './inputControl';
// Artificial cursor
export type {
	ArtificialCursor,
	ArtificialCursorOptions,
	CursorManager,
	CursorShape,
	RenderedCursor,
} from './cursor';
export {
	addCursor,
	BAR_CURSOR_CHAR,
	BLOCK_CURSOR_CHAR,
	createArtificialCursor,
	createCursorCell,
	createCursorManager,
	getCursorAt,
	getPrimaryCursor,
	getVisibleCursors,
	HIDE_TERMINAL_CURSOR,
	hideTerminalCursor,
	isCursorVisible,
	moveCursorTo,
	moveCursorBy,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	SHOW_TERMINAL_CURSOR,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
} from './cursor';
