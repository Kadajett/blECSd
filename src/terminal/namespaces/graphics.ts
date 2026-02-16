/**
 * Graphics protocol namespace.
 *
 * Functions for rendering images and vector graphics in the terminal
 * using multiple backend protocols (Kitty, iTerm2, Sixel, ANSI, Braille).
 *
 * @example
 * ```typescript
 * import { graphics } from 'blecsd/terminal';
 *
 * // Create graphics manager with auto-detection
 * const manager = graphics.createAutoGraphicsManager(program);
 *
 * // Render images
 * const imageData = { width: 100, height: 100, data: buffer };
 * graphics.renderImage(manager, imageData, { x: 10, y: 5 });
 *
 * // Create Braille canvas for vector graphics
 * const canvas = graphics.braille.createBrailleCanvas(80, 40);
 * graphics.braille.drawBrailleLine(canvas, 0, 0, 79, 39);
 * graphics.braille.drawBrailleCircle(canvas, 40, 20, 10);
 * const cells = graphics.braille.brailleCanvasToCells(canvas);
 *
 * // Detect graphics support
 * const support = graphics.detect.detectGraphicsSupport();
 * if (graphics.backends.hasPixelBackend(manager)) {
 *   // Use high-quality pixel rendering
 * }
 * ```
 */

import {
	ANSI_BACKEND_NAME,
	APC_PREFIX,
	BRAILLE_BACKEND_NAME,
	canvasToCells as brailleCanvasToCells,
	canvasToString as brailleCanvasToString,
	canvasToPixelBitmap,
	cellToDot,
	clearBrailleCanvas,
	clearDot,
	clearImage,
	createAnsiBackend as createAnsiGraphicsBackend,
	createAutoGraphicsManager,
	createBrailleCanvas,
	createBrailleBackend as createBrailleGraphicsBackend,
	createGraphicsManager,
	createITerm2Backend as createITerm2GraphicsBackend,
	createKittyBackend as createKittyGraphicsBackend,
	createSixelGraphicsBackend,
	DCS_START,
	DEFAULT_FALLBACK_CHAIN,
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
	getActiveBackend,
	getBackendCapabilities,
	getBestBackendName,
	getDot,
	hasPixelBackend,
	ITERM2_BACKEND_NAME,
	KITTY_BACKEND_NAME,
	KITTY_ST,
	OSC_1337_PREFIX,
	refreshBackend,
	registerBackend,
	renderImage,
	renderVector,
	SIXEL_BACKEND_NAME,
	SIXEL_ST,
	selectBackend,
	setCellColor,
	setDot,
} from '../graphics';

/**
 * Braille canvas sub-namespace for vector graphics using Unicode Braille patterns.
 */
const braille = Object.freeze({
	// Braille canvas creation and conversion
	createBrailleCanvas,
	clearBrailleCanvas,
	brailleCanvasToCells,
	brailleCanvasToString,
	canvasToPixelBitmap,

	// Braille dot operations
	getDot,
	setDot,
	clearDot,
	dotToCell,
	cellToDot,
	setCellColor,

	// Braille drawing primitives
	drawBrailleLine,
	drawBrailleRect,
	drawBrailleCircle,
	drawBrailleEllipse,
	drawBrailleArc,
	drawBrailleBezier,
	fillBrailleRect,
	fillBrailleCircle,
});

/**
 * Graphics backends sub-namespace for backend creation and management.
 */
const backends = Object.freeze({
	// Backend creation
	createAnsiGraphicsBackend,
	createBrailleGraphicsBackend,
	createKittyGraphicsBackend,
	createITerm2GraphicsBackend,
	createSixelGraphicsBackend,

	// Backend management
	getActiveBackend,
	selectBackend,
	registerBackend,
	refreshBackend,
	getBackendCapabilities,
	getBestBackendName,
	hasPixelBackend,
});

/**
 * Graphics detection sub-namespace for capability detection.
 */
const detect = Object.freeze({
	detectGraphicsSupport,
	detectAnsiSupport,
	detectBrailleSupport,
	detectKittySupport,
	detectITerm2Support,
	detectSixelSupport,
});

/**
 * Graphics protocol namespace.
 */
export const graphics = Object.freeze({
	// Constants
	ANSI_BACKEND_NAME,
	BRAILLE_BACKEND_NAME,
	ITERM2_BACKEND_NAME,
	KITTY_BACKEND_NAME,
	SIXEL_BACKEND_NAME,
	APC_PREFIX,
	DCS_START,
	KITTY_ST,
	OSC_1337_PREFIX,
	SIXEL_ST,
	DEFAULT_FALLBACK_CHAIN,

	// Manager operations
	createGraphicsManager,
	createAutoGraphicsManager,
	renderImage,
	renderVector,
	clearImage,

	// Sub-namespaces
	braille,
	backends,
	detect,
});

export type GraphicsModule = typeof graphics;
