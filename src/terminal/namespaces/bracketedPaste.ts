/**
 * Bracketed paste mode namespace.
 *
 * Functions for handling bracketed paste mode, which marks pasted text
 * with escape sequences to distinguish it from typed text.
 *
 * @example
 * ```typescript
 * import { bracketedPaste } from 'blecsd/terminal';
 *
 * // Enable bracketed paste mode
 * const state = bracketedPaste.createPasteState();
 * bracketedPaste.enableBracketedPaste(program);
 *
 * // Process paste events
 * const result = bracketedPaste.processPasteBuffer(buffer, state);
 * if (result.type === 'complete') {
 *   const content = bracketedPaste.extractPasteContent(result);
 *   const safe = bracketedPaste.sanitizePastedText(content);
 * }
 *
 * // Disable when done
 * bracketedPaste.disableBracketedPaste(program);
 * ```
 */

import {
	createPasteState,
	disableBracketedPaste,
	enableBracketedPaste,
	extractPasteContent,
	findPasteEnd,
	isPasteStart,
	mightBePasteStart,
	processPasteBuffer,
	sanitizePastedText,
	truncatePaste,
} from '../bracketedPaste';

/**
 * Bracketed paste mode namespace.
 */
export const bracketedPaste = Object.freeze({
	createPasteState,
	disableBracketedPaste,
	enableBracketedPaste,
	extractPasteContent,
	findPasteEnd,
	isPasteStart,
	mightBePasteStart,
	processPasteBuffer,
	sanitizePastedText,
	truncatePaste,
});

export type BracketedPasteModule = typeof bracketedPaste;
