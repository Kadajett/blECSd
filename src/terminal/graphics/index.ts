/**
 * Terminal graphics protocol abstraction and backends.
 *
 * @module terminal/graphics
 */

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
