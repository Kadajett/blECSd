/**
 * Terminal security utilities
 *
 * @module terminal/security
 * @internal
 */

export type { SanitizeOptions } from './sanitize';
export {
	categorizeEscapeSequences,
	containsEscapeSequences,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	SafeStringBuilder,
	SanitizeOptionsSchema,
	sanitizeForTerminal,
} from './sanitize';
