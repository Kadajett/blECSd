/**
 * Terminal security utilities
 *
 * @module terminal/security
 * @internal
 */

// Input sanitization for untrusted text
export type { InputSanitizeOptions, SanitizeResult } from './inputSanitize';
export {
	DEFAULT_INPUT_SANITIZE_OPTIONS,
	hasControlChars,
	hasNullBytes,
	InputSanitizeOptionsSchema,
	isValidUtf8String,
	replaceInvalidUtf16,
	restrictToAscii,
	sanitizeTextInput,
	sanitizeTextInputDetailed,
	stripC1Controls,
	stripControlChars,
	stripNullBytes,
} from './inputSanitize';
export type { SafeStringBuilder, SanitizeOptions } from './sanitize';
export {
	categorizeEscapeSequences,
	containsEscapeSequences,
	createSafeStringBuilder,
	DEFAULT_SANITIZE_OPTIONS,
	extractEscapeSequences,
	isSafeForTerminal,
	SanitizeOptionsSchema,
	sanitizeForTerminal,
} from './sanitize';
