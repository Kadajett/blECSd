/**
 * Output sanitization namespace.
 *
 * Functions for sanitizing terminal output to prevent escape sequence
 * injection and ensure safe rendering of untrusted content.
 *
 * @example
 * ```typescript
 * import { securitySanitize } from 'blecsd/terminal';
 *
 * // Sanitize untrusted output
 * const untrusted = 'User input \x1b[31m with \x1b]0;evil\x07 escape codes';
 * const safe = securitySanitize.sanitizeForTerminal(untrusted, {
 *   allowAnsi: false,
 *   allowOsc: false,
 * });
 *
 * // Check if content is safe
 * if (!securitySanitize.isSafeForTerminal(untrusted)) {
 *   console.warn('Potentially dangerous content');
 * }
 *
 * // Check for escape sequences
 * if (securitySanitize.containsEscapeSequences(untrusted)) {
 *   // Extract and categorize them
 *   const sequences = securitySanitize.extractEscapeSequences(untrusted);
 *   const categorized = securitySanitize.categorizeEscapeSequences(sequences);
 *   console.log('Found:', categorized);
 * }
 *
 * // Build safe strings
 * const builder = securitySanitize.createSafeStringBuilder();
 * builder.append('Safe ');
 * builder.append('content');
 * const result = builder.toString();
 * ```
 */

import {
	categorizeEscapeSequences,
	containsEscapeSequences,
	createSafeStringBuilder,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	sanitizeForTerminal,
} from '../security/sanitize';

/**
 * Output sanitization namespace.
 */
export const securitySanitize = Object.freeze({
	categorizeEscapeSequences,
	containsEscapeSequences,
	createSafeStringBuilder,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	sanitizeForTerminal,
});

export type SecuritySanitizeModule = typeof securitySanitize;
