/**
 * Terminal detection namespace.
 *
 * Functions for detecting terminal emulator type, capabilities,
 * and supported features.
 *
 * @example
 * ```typescript
 * import { detection } from 'blecsd/terminal';
 *
 * // Get terminal information
 * const info = detection.getTerminalInfo();
 * console.log(`Terminal: ${info.name}, Version: ${info.version}`);
 *
 * // Check specific terminal types
 * if (detection.isKitty()) {
 *   // Use Kitty-specific features
 * } else if (detection.isTmux()) {
 *   // Use tmux passthrough sequences
 * }
 *
 * // Check feature support
 * const colorDepth = detection.getColorDepth();
 * if (detection.isTrueColorSupported()) {
 *   // Use 24-bit color
 * }
 * if (detection.isUnicodeSupported()) {
 *   // Use Unicode box drawing
 * }
 * ```
 */

import {
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
} from '../detection';

/**
 * Terminal detection namespace.
 */
export const detection = Object.freeze({
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
});

export type DetectionModule = typeof detection;
