/**
 * Input sanitization namespace.
 *
 * Functions for sanitizing text input to prevent control character injection,
 * null byte attacks, and invalid UTF-8 sequences.
 *
 * @example
 * ```typescript
 * import { securityInput } from 'blecsd/terminal';
 *
 * // Sanitize user input
 * const userInput = '\x00malicious\x1b[31m input';
 * const safe = securityInput.sanitizeTextInput(userInput, {
 *   stripNullBytes: true,
 *   stripC1Controls: true,
 *   restrictToAscii: false,
 * });
 *
 * // Check for dangerous content
 * if (securityInput.hasControlChars(userInput)) {
 *   console.warn('Input contains control characters');
 * }
 *
 * if (securityInput.hasNullBytes(userInput)) {
 *   console.warn('Input contains null bytes');
 * }
 *
 * // Validate UTF-8
 * if (!securityInput.isValidUtf8String(userInput)) {
 *   console.error('Invalid UTF-8 sequence');
 * }
 *
 * // Detailed sanitization
 * const result = securityInput.sanitizeTextInputDetailed(userInput);
 * console.log(`Removed: ${result.removed.length} chars`);
 * ```
 */

import {
	DEFAULT_INPUT_SANITIZE_OPTIONS,
	hasControlChars,
	hasNullBytes,
	isValidUtf8String,
	replaceInvalidUtf16,
	restrictToAscii,
	sanitizeTextInput,
	sanitizeTextInputDetailed,
	stripC1Controls,
	stripControlChars,
	stripNullBytes,
} from '../security/inputSanitize';

/**
 * Input sanitization namespace.
 */
export const securityInput = Object.freeze({
	DEFAULT_INPUT_SANITIZE_OPTIONS,
	hasControlChars,
	hasNullBytes,
	isValidUtf8String,
	replaceInvalidUtf16,
	restrictToAscii,
	sanitizeTextInput,
	sanitizeTextInputDetailed,
	stripC1Controls,
	stripControlChars,
	stripNullBytes,
});

export type SecurityInputModule = typeof securityInput;
