/**
 * Terminal I/O module
 *
 * Low-level terminal control and ANSI escape sequence generation.
 *
 * @module terminal
 * @internal Most exports are internal. Only select utilities are public.
 */

export type {
	AnsiCodesModule,
	AttrParserModule,
	BackendsModule,
	BracketedPasteModule,
	CapabilitiesModule,
	CleanupModule,
	ClipboardModule,
	ConflictResModule,
	CursorModule,
	DebugModule,
	DetectionModule,
	FocusTrackModule,
	GpmModule,
	GraphicsModule,
	InputCtrlModule,
	InputStreamModule,
	KeyboardProtoModule,
	KeyParsingModule,
	MouseParsingModule,
	MultiCursorModule,
	PresenceModule,
	ProcessModule,
	ProgramModule,
	ResizeModule,
	ResponseParserModule,
	ScreenModule,
	SecurityInputModule,
	SecuritySanitizeModule,
	SuspendModule,
	SyncOutputModule,
	TerminfoModule,
	ThrottledResizeModule,
} from './namespaces';
// ===== NAMESPACES (Phase 1: Non-breaking addition) =====
export {
	ansiCodes,
	attrParser,
	backends,
	bracketedPaste,
	capabilities,
	cleanup,
	clipboard,
	conflictRes,
	cursor,
	debug,
	detection,
	focusTrack,
	gpm,
	graphics,
	inputCtrl,
	inputStream,
	keyboardProto,
	keyParsing,
	mouseParsing,
	multiCursor,
	presence,
	process,
	program,
	resize,
	responseParser,
	screen,
	securityInput,
	securitySanitize,
	suspend,
	syncOutput,
	terminfo,
	throttledResize,
} from './namespaces';

// ===== FLAT EXPORTS (existing, maintained for backwards compatibility) =====

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
	// ANSI escape sequence constant objects
	boxDrawing,
	bracketedPaste as bracketedPasteSeq,
	ClipboardSelection,
	CSI,
	CursorShape,
	charset,
	clipboard as clipboardSeq,
	cursor as cursorSeq,
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
	screen as screenSeq,
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
	attributesEqual,
	attrToSgrCodes,
	ColorType,
	cloneAttribute,
	codeAttr,
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
// 2D Render backends
export type {
	AnsiBackendConfig,
	KittyBackendConfig,
	RenderBackend,
	RenderBackendCapabilities,
	RenderBackendPreference,
	RenderBackendType,
	RenderCell,
} from './backends';
export {
	createAnsiBackend,
	createKittyRenderBackend,
	createRenderBackendByType,
	detectRenderBackend,
	encodeKittyImage,
	getAvailableBackends,
} from './backends';
// Bracketed paste mode
export type {
	PasteConfig,
	PasteEvent,
	PasteHandler,
	PasteParseResult,
	PasteProcessResult,
	PasteState,
} from './bracketedPaste';
export {
	createPasteState,
	disableBracketedPaste,
	enableBracketedPaste,
	extractPasteContent,
	findPasteEnd,
	isPasteStart,
	mightBePasteStart,
	PasteConfigSchema,
	PasteEventSchema,
	processPasteBuffer,
	sanitizePastedText,
	truncatePaste,
} from './bracketedPaste';
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
// Clipboard manager
export type {
	ClipboardManager,
	ClipboardManagerConfig,
	ClipboardProgress,
	ClipboardResult,
} from './clipboardManager';
export {
	chunkText,
	createClipboardManager,
	streamPaste,
} from './clipboardManager';
export { CSS_COLORS, matchColor, matchColorCached, nameToColor } from './colors';
export {
	blend,
	blendAlpha,
	blendWithAlpha,
	complement,
	contrastRatio,
	darken,
	darken256,
	desaturate,
	gradient,
	gradient256,
	grayscale,
	invert,
	isReadable,
	lighten,
	lighten256,
	luminance,
	mix,
	rotateHue,
	saturate,
} from './colors/blend';
export type { ColorValue } from './colors/convert';
export {
	color256ToHex,
	color256ToRgb,
	color256ToTruecolor,
	hexToColor256,
	hexToRgb,
	hexToTruecolor,
	hslaToRgba,
	hslToRgb,
	parseColor as parseColorValue,
	rgbaToHex,
	rgbaToHsla,
	rgbToColor256,
	rgbToColorCube,
	rgbToGrayscale256,
	rgbToHex,
	rgbToHsl,
	rgbToTruecolor,
	sgrBg256,
	sgrBgRgb,
	sgrFg256,
	sgrFgRgb,
	toColor256,
	toHex,
	toTruecolor,
	truecolorToColor256,
	truecolorToHex,
	truecolorToRgb,
} from './colors/convert';
// Color types and utilities
export type { HSL, HSLA, RGB, RGBA } from './colors/palette';
export {
	ANSI,
	asColor256,
	COLOR_CUBE_LEVELS,
	COLORS,
	Color256Schema,
	colorCubeIndex,
	getHex,
	getRGB,
	grayscaleIndex,
	HexColorSchema,
	HSLASchema,
	HSLSchema,
	isColor256,
	isColorCube,
	isGrayscale,
	isRGB,
	isStandardColor,
	PALETTE_HEX,
	PALETTE_RGB,
	RGBASchema,
	RGBSchema,
} from './colors/palette';
// Conflict resolution (CRDTs for collaborative editing)
export type {
	CharId,
	CharNode,
	ConflictResult,
	LWWMap,
	LWWRegister,
	TextCRDT,
	TextOp,
} from './conflictResolution';
export {
	applyRemoteOp,
	compactDocument,
	createLWWMap,
	createLWWRegister,
	createTextCRDT,
	deleteChar,
	deleteText,
	getDocumentOps,
	getLWWMapKeys,
	getLWWMapSize,
	getLWWMapValue,
	getLWWMetadata,
	getLWWValue,
	getTextLength,
	getTextValue,
	getTombstoneCount,
	getTotalNodeCount,
	hasLWWMapKey,
	insertChar,
	insertText,
	mergeLWWMaps,
	mergeLWWRegisters,
	resolveLWWConflict,
	setLWWMapValue,
	setLWWValue,
	TextOpSchema,
} from './conflictResolution';
// Artificial cursor
export type {
	ArtificialCursor,
	ArtificialCursorOptions,
	CursorManager,
	CursorShape as ArtificialCursorShapeType,
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
	moveCursorBy,
	moveCursorTo,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	SHOW_TERMINAL_CURSOR,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
} from './cursor';
// Custom stream sessions
export type {
	StreamCloseHandler,
	StreamDataHandler,
	StreamResizeHandler,
	StreamSession,
	StreamSessionConfig,
} from './customStream';
export {
	createStreamSession,
	endSession,
	StreamSessionConfigSchema,
	writeToSession,
} from './customStream';
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
// Focus tracking
export type { FocusTrackerState, FocusTrackingEventMap } from './focusTracking';
export {
	createFocusTracker,
	disableFocusTracking,
	enableFocusTracking,
	getFocusTracker,
	getTerminalFocusEventBus,
	isTerminalFocused,
	resetTerminalFocusEventBus,
	triggerFocusEvent,
} from './focusTracking';
// GPM mouse client (Linux console mouse support)
export type { GpmClient, GpmClientConfig, GpmClientState, GpmRawEvent } from './gpmClient';
export {
	buildGpmConnectPacket,
	createGpmClient,
	detectVirtualConsole,
	GpmButton,
	GpmClientConfigSchema,
	GpmEventType,
	gpmButtonToMouseButton,
	gpmEventToMouseEvent,
	gpmTypeToMouseAction,
	isGpmAvailable,
	parseGpmEventBuffer,
	parseGpmModifiers,
} from './gpmClient';
// Graphics protocol backends
export type {
	BackendName,
	BrailleCanvas,
	EnvChecker,
	GraphicsBackend,
	GraphicsCapabilities,
	GraphicsDetectionResult,
	GraphicsManagerConfig,
	GraphicsManagerState,
	ImageData as GraphicsImageData,
	RenderedCell,
	RenderOptions as GraphicsRenderOptions,
	VectorRenderOptions,
} from './graphics';
export {
	// Backend name constants
	ANSI_BACKEND_NAME,
	// Kitty protocol constants
	APC_PREFIX,
	BRAILLE_BACKEND_NAME,
	buildPalette,
	canvasToCells as brailleCanvasToCells,
	// Vector-to-pixel bridge
	canvasToPixelBitmap,
	canvasToString as brailleCanvasToString,
	cellToDot,
	clearBrailleCanvas,
	clearDot,
	// Backend abstraction
	clearImage,
	// Graphics backend factories (aliased to avoid collision with 3D render backends)
	createAnsiBackend as createAnsiGraphicsBackend,
	createAutoGraphicsManager,
	createBrailleBackend as createBrailleGraphicsBackend,
	// Vector drawing (aliased to avoid collision with canvas/3d draw functions)
	createBrailleCanvas,
	createGraphicsManager,
	createITerm2Backend as createITerm2GraphicsBackend,
	createKittyBackend as createKittyGraphicsBackend,
	createSixelGraphicsBackend,
	// Sixel protocol constants
	DCS_START,
	DEFAULT_FALLBACK_CHAIN,
	// Detection
	detectAnsiSupport,
	detectBrailleSupport,
	detectGraphicsSupport,
	detectITerm2Support,
	detectKittySupport,
	detectSixelSupport,
	dotToCell,
	drawArc as drawBrailleArc,
	drawBezier as drawBrailleBezier,
	drawCircle as drawBrailleCircle,
	drawEllipse as drawBrailleEllipse,
	drawLine as drawBrailleLine,
	drawRect as drawBrailleRect,
	fillCircle as fillBrailleCircle,
	fillRect as fillBrailleRect,
	// Zod schemas for graphics validation
	GraphicsCapabilitiesSchema,
	GraphicsDetectionResultSchema,
	GraphicsManagerConfigSchema,
	getActiveBackend,
	getBackendCapabilities,
	getBestBackendName,
	getDot,
	hasPixelBackend,
	ImageDataSchema,
	ITERM2_BACKEND_NAME,
	KITTY_BACKEND_NAME,
	KITTY_ST,
	// iTerm2 protocol constants (ST aliased to avoid collision with ansi ST)
	OSC_1337_PREFIX,
	RenderOptionsSchema as GraphicsRenderOptionsSchema,
	refreshBackend,
	registerBackend,
	renderImage,
	renderVector,
	SIXEL_BACKEND_NAME,
	SIXEL_ST,
	ST as ITERM2_ST,
	ST_ALT as ITERM2_ST_ALT,
	selectBackend,
	setCellColor,
	setDot,
} from './graphics';
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
// Input stream handler
export type {
	FocusHandler,
	InputHandler,
	InputHandlerConfig,
	KeyHandler,
	MouseHandler,
	Unsubscribe,
} from './inputStream';
export { createInputHandler, InputHandlerConfigSchema } from './inputStream';
// Keyboard protocols
export type {
	KittyConfig,
	KittyEventType,
	KittyKeyEvent,
	KittyModifiers,
	KittyProtocolLevel,
	KittyProtocolState,
} from './keyboardProtocols';
export {
	activateProtocol,
	createKittyConfig,
	createKittyProtocolState,
	deactivateProtocol,
	generatePopSequence,
	generatePushSequence,
	generateQuerySequence,
	isKittyKeyEvent,
	isKittyResponse,
	isKittySupported,
	KittyFlags,
	kittyKeyToName,
	parseKittyKeyEvent,
	parseKittyQueryResponse,
	updateProtocolState,
} from './keyboardProtocols';
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
// Multi-cursor overlay system (collaborative cursors)
export type {
	CursorCell,
	CursorLabel,
	CursorPosition as OverlayCursorPosition,
	OverlayConfig,
	OverlayEvent,
	OverlayEventHandler,
	OverlayManager,
	OverlaySelection,
	SessionOverlay,
} from './multiCursor';
export {
	addSessionOverlay,
	buildFocusMap,
	clearCursorOverlay,
	clearSelectionOverlay,
	createOverlayManager,
	cursorCellToAnsi,
	cursorLabelToAnsi,
	getActiveCursors,
	getOverlayState,
	getSessionOverlay,
	getSessionOverlayCount,
	getSessionsFocusingEntity,
	MultiCursor,
	OverlayConfigSchema,
	onOverlayEvent,
	pruneInactiveCursors,
	removeSessionOverlay,
	renderCursorLabels,
	renderCursorOverlays,
	renderOverlaysToAnsi,
	resetOverlayState,
	setCursorOverlay,
	setFocusOverlay,
	setLabelVisibility,
	setSelectionOverlay,
} from './multiCursor';
// Output buffering (internal)
export type { CursorPosition, OutputBuffer, OutputBufferOptions } from './outputBuffer';
// Presence system
export type {
	CursorPosition as PresenceCursorPosition,
	PresenceConfig,
	PresenceEvent,
	PresenceEventHandler,
	PresenceManager,
	PresenceUser,
	UserStatus,
} from './presence';
export {
	addUser,
	createPresenceManager,
	formatPresenceBar,
	getActiveUsers,
	getPresenceState,
	getUser,
	getUserCount,
	getUserCursors,
	moveUserCursor,
	onPresenceEvent,
	Presence,
	PresenceConfigSchema,
	removeUser,
	resetPresenceState,
	setUserFocus,
	updatePresenceStatus,
} from './presence';
// Process utilities (internal)
export type { EditorOptions, ExecOptions, ExecResult, SpawnOptions } from './process';
export { exec, execSync, getDefaultEditor, processUtils, readEditor, spawn } from './process';
// Program (internal)
export type { KeyEvent, MouseEvent, Program, ProgramConfig, ResizeEvent } from './program';
export { createProgram, ProgramConfigSchema } from './program';
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
// Double buffer (from screen/doubleBuffer, not included in ./screen cherry-picks above)
export type { DoubleBufferData } from './screen/doubleBuffer';
export { clearDirtyRegions, createDoubleBuffer, getBackBuffer } from './screen/doubleBuffer';
// Screen buffer management (internal)
export type { CleanupCallback, ScreenBuffer } from './screenBuffer';
// Input sanitization
export type { InputSanitizeOptions, SanitizeResult } from './security/inputSanitize';
export {
	DEFAULT_INPUT_SANITIZE_OPTIONS,
	hasControlChars,
	hasNullBytes,
	InputSanitizeOptionsSchema,
	isValidUtf8String,
	replaceInvalidUtf16,
	restrictToAscii,
	sanitizeTextInput,
	sanitizeTextInputDetailed,
	stripC1Controls,
	stripControlChars,
	stripNullBytes,
} from './security/inputSanitize';
// Security utilities (internal)
export type { SafeStringBuilder, SanitizeOptions } from './security/sanitize';
export {
	categorizeEscapeSequences,
	containsEscapeSequences,
	createSafeStringBuilder,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	SanitizeOptionsSchema,
	sanitizeForTerminal,
} from './security/sanitize';
// Server app factory
export type {
	ServerApp,
	ServerAppConfig,
	ServerMode,
	SSHServerAppConfig,
	TCPServerAppConfig,
	TelnetServerAppConfig,
} from './serverApp';
export { createServerApp } from './serverApp';
// Serve web (high-level API)
export type {
	ServeWebConfig,
	ServeWebResult,
} from './serveWeb';
export { serveWeb } from './serveWeb';
// SSH server
export type {
	SSHAuthorizedKey,
	SSHServerConfig,
	SSHServerState,
} from './sshServer';
export {
	createSSHServer,
	getSSHClientCount,
	SSHServerConfigSchema,
	startSSHServer,
	stopSSHServer,
} from './sshServer';
// Suspend/resume handling (internal)
export type { SuspendManager, SuspendManagerOptions, SuspendState } from './suspend';
export {
	createSuspendManager,
	suspend as suspendProcess,
	suspendSequences,
} from './suspend';
// Synchronized output (internal)
export type { SynchronizedOutput, SyncOutputOptions } from './syncOutput';
export { createSynchronizedOutput, isSyncOutputSupported } from './syncOutput';
// Telnet server
export type {
	TelnetServerConfig,
	TelnetServerState,
} from './telnetServer';
export {
	createTelnetServer,
	getTelnetClientCount,
	startTelnetServer,
	stopTelnetServer,
	TELNET,
	TELNET_OPT,
	TelnetServerConfigSchema,
} from './telnetServer';
// Terminfo
export type {
	BooleanCapability,
	NumberCapability,
	StringCapability,
	TerminfoData,
	Tput,
	TputConfig,
} from './terminfo';
export {
	ACS,
	ACSC_CODES,
	countFormatArgs,
	createFormatter,
	createTput,
	detect256Color,
	detectFeatures,
	detectTrueColor,
	detectUnicode,
	getDefaultTput,
	getDefaultXtermData,
	isValidFormat,
	parseAcsc,
	parseFormat,
	resetDefaultTput,
	sprintf,
} from './terminfo';
// Throttled resize
export type {
	ResizeCallback,
	ThrottledResizeConfig,
	ThrottledResizeState,
} from './throttledResize';
export {
	createThrottledResize,
	debounceResize,
	throttleResize,
} from './throttledResize';
// WebSocket server
export type {
	WebServerConfig,
	WebServerState,
} from './webSocket';
export {
	createWebServer,
	getWebClientCount,
	startWebServer,
	stopWebServer,
	WebServer,
	webBroadcast,
	webSendTo,
} from './webSocket';
