/**
 * Terminal graphics protocol abstraction and backends.
 *
 * @module terminal/graphics
 */

// ANSI backend
export {
	ANSI_BACKEND_NAME,
	clearAnsiImage,
	createAnsiBackend,
	cursorPosition as ansiCursorPosition,
	renderAnsiImage,
} from './ansi';
// Backend abstraction
export type {
	BackendName,
	GraphicsBackend,
	GraphicsCapabilities,
	GraphicsManagerConfig,
	GraphicsManagerState,
	ImageData,
	RenderOptions,
} from './backend';
export {
	clearImage,
	createAutoGraphicsManager,
	createGraphicsManager,
	DEFAULT_FALLBACK_CHAIN,
	GraphicsCapabilitiesSchema,
	GraphicsManagerConfigSchema,
	getActiveBackend,
	getBackendCapabilities,
	ImageDataSchema,
	RenderOptionsSchema,
	refreshBackend,
	registerBackend,
	renderImage,
	selectBackend,
} from './backend';
// Braille backend
export {
	BRAILLE_BACKEND_NAME,
	clearBrailleImage,
	createBrailleBackend,
	cursorPosition as brailleCursorPosition,
	renderBrailleImage,
} from './braille';
// Graphics detection
export type { EnvChecker, GraphicsDetectionResult } from './detect';
export {
	detectAnsiSupport,
	detectBrailleSupport,
	detectGraphicsSupport,
	detectITerm2Support,
	detectKittySupport,
	detectSixelSupport,
	GraphicsDetectionResultSchema,
	getBestBackendName,
} from './detect';

// iTerm2 backend
export type { ITerm2EnvChecker, ITerm2ImageConfig, ITerm2Size, SizeUnit } from './iterm2';
export {
	buildImageSequence,
	buildParams,
	clearITerm2Image,
	createITerm2Backend,
	cursorPosition,
	encodeBase64,
	formatSize,
	ITERM2_BACKEND_NAME,
	ITerm2ImageConfigSchema,
	ITerm2SizeSchema,
	isITerm2Supported,
	OSC_1337_PREFIX,
	renderITerm2Image,
	ST,
	ST_ALT,
} from './iterm2';

// Kitty backend
export type {
	KittyAction,
	KittyControlData,
	KittyDeleteMode,
	KittyEnvChecker,
	KittyFormat,
	KittyFrameConfig,
	KittyImageConfig,
	KittyQuiet,
	KittyTransmission,
} from './kitty';
export {
	APC_PREFIX,
	buildAnimationControl,
	buildAnimationFrame,
	buildChunkedSequences,
	buildDeleteAll,
	buildDeleteAtCursor,
	buildDeleteById,
	buildKittySequence,
	buildPlacement,
	buildQuery,
	buildTransmitAndDisplay,
	buildTransmitOnly,
	chunkBase64,
	clearKittyImage,
	createKittyBackend,
	imageFormatToKitty,
	isKittySupported,
	KITTY_BACKEND_NAME,
	KITTY_ST,
	KittyFrameConfigSchema,
	KittyImageConfigSchema,
	kittyCursorPosition,
	kittyEncodeBase64,
	MAX_CHUNK_SIZE,
	renderKittyImage,
	serializeControlData,
} from './kitty';

// Sixel backend
export type { SixelBackendConfig, SixelEnvChecker } from './sixel';
export {
	buildPalette,
	buildPaletteHeader,
	buildSixelColumn,
	bytesPerPixel,
	clearSixelImage,
	countImageColors,
	createSixelGraphicsBackend,
	cursorPosition as sixelCursorPosition,
	DCS_START,
	DEFAULT_MAX_COLORS,
	encodeSixelData,
	encodeSixelImage,
	findNearestColor,
	getPixelRGBA,
	isSixelSupported,
	mapPixelsToPalette,
	packRGB,
	rawEncodeBand,
	renderSixelImage,
	rleEncodeBand,
	SIXEL_BACKEND_NAME,
	SIXEL_ST,
	SixelBackendConfigSchema,
} from './sixel';

// Vector drawing primitives
export type { BrailleCanvas, RenderedCell } from './vector';
export {
	canvasToCells,
	canvasToString,
	cellToDot,
	clearBrailleCanvas,
	clearDot,
	createBrailleCanvas,
	dotToCell,
	drawArc,
	drawBezier,
	drawCircle,
	drawEllipse,
	drawLine,
	drawRect,
	fillCircle,
	fillRect,
	getDot,
	setCellColor,
	setDot,
} from './vector';

// Vector-to-pixel bridge
export type { VectorRenderOptions } from './vectorBridge';
export {
	canvasToPixelBitmap,
	hasPixelBackend,
	renderVector,
} from './vectorBridge';
