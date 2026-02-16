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
 * const canvas = graphics.createBrailleCanvas(80, 40);
 * graphics.drawBrailleLine(canvas, 0, 0, 79, 39);
 * graphics.drawBrailleCircle(canvas, 40, 20, 10);
 * const cells = graphics.brailleCanvasToCells(canvas);
 *
 * // Detect graphics support
 * const support = graphics.detectGraphicsSupport();
 * if (graphics.hasPixelBackend(manager)) {
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
 * Graphics protocol namespace.
 */
export const graphics = Object.freeze({
	// Backend names
	ANSI_BACKEND_NAME,
	BRAILLE_BACKEND_NAME,
	ITERM2_BACKEND_NAME,
	KITTY_BACKEND_NAME,
	SIXEL_BACKEND_NAME,

	// Protocol constants
	APC_PREFIX,
	DCS_START,
	KITTY_ST,
	OSC_1337_PREFIX,
	SIXEL_ST,

	// Other constants
	DEFAULT_FALLBACK_CHAIN,

	// Braille canvas functions
	brailleCanvasToCells,
	brailleCanvasToString,
	canvasToPixelBitmap,
	cellToDot,
	clearBrailleCanvas,
	clearDot,
	createBrailleCanvas,
	dotToCell,
	drawBrailleArc,
	drawBrailleBezier,
	drawBrailleCircle,
	drawBrailleEllipse,
	drawBrailleLine,
	drawBrailleRect,
	fillBrailleCircle,
	fillBrailleRect,
	getDot,
	setCellColor,
	setDot,

	// Graphics backend functions
	clearImage,
	createAnsiGraphicsBackend,
	createAutoGraphicsManager,
	createBrailleGraphicsBackend,
	createGraphicsManager,
	createITerm2GraphicsBackend,
	createKittyGraphicsBackend,
	createSixelGraphicsBackend,
	detectAnsiSupport,
	detectBrailleSupport,
	detectGraphicsSupport,
	detectITerm2Support,
	detectKittySupport,
	detectSixelSupport,
	getActiveBackend,
	getBackendCapabilities,
	getBestBackendName,
	hasPixelBackend,
	refreshBackend,
	registerBackend,
	renderImage,
	renderVector,
	selectBackend,
});

export type GraphicsModule = typeof graphics;
