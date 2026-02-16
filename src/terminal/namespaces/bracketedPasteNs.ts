/**
 * Bracketed paste mode namespace.
 *
 * Functions for handling bracketed paste mode, which marks pasted text
 * with escape sequences to distinguish it from typed text.
 *
 * @example
 * ```typescript
 * import { bracketedPasteNs } from 'blecsd/terminal';
 *
 * // Enable bracketed paste mode
 * const state = bracketedPasteNs.createPasteState();
 * bracketedPasteNs.enableBracketedPaste(program);
 *
 * // Process paste events
 * const result = bracketedPasteNs.processPasteBuffer(buffer, state);
 * if (result.type === 'complete') {
 *   const content = bracketedPasteNs.extractPasteContent(result);
 *   const safe = bracketedPasteNs.sanitizePastedText(content);
 * }
 *
 * // Disable when done
 * bracketedPasteNs.disableBracketedPaste(program);
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
export const bracketedPasteNs = Object.freeze({
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

export type BracketedPasteNsModule = typeof bracketedPasteNs;
