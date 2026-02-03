/**
 * BlECSd Error Handling Module
 *
 * Provides a comprehensive error type system for the BlECSd library.
 *
 * @module errors
 *
 * @example
 * ```typescript
 * import {
 *   createValidationError,
 *   ValidationErrorCode,
 *   toNativeError,
 *   isValidationError,
 * } from 'blecsd/errors';
 *
 * // Create a typed error
 * const error = createValidationError(
 *   ValidationErrorCode.INVALID_HEX_COLOR,
 *   'Invalid hex color format',
 *   { context: { data: { input: '#xyz' } } }
 * );
 *
 * // Throw as native error (for try/catch interop)
 * throw toNativeError(error);
 *
 * // Type guard usage
 * if (isValidationError(error)) {
 *   console.log(error.context?.zodIssues);
 * }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
	BlECSdError,
	BlECSdErrorBase,
	BlECSdErrorKind,
	ComponentError,
	ConfigError,
	EntityError,
	ErrorContext,
	InputError,
	InternalError,
	NativeBlECSdError,
	RenderError,
	SystemError,
	TerminalError,
	ValidationError,
} from './types';

export { BLECSD_ERROR_SYMBOL } from './types';

// =============================================================================
// ERROR CODES
// =============================================================================

export type {
	BlECSdErrorCodeType,
	ComponentErrorCodeType,
	ConfigErrorCodeType,
	EntityErrorCodeType,
	InputErrorCodeType,
	InternalErrorCodeType,
	RenderErrorCodeType,
	SystemErrorCodeType,
	TerminalErrorCodeType,
	ValidationErrorCodeType,
} from './codes';
export {
	BlECSdErrorCode,
	ComponentErrorCode,
	ConfigErrorCode,
	EntityErrorCode,
	InputErrorCode,
	InternalErrorCode,
	RenderErrorCode,
	SystemErrorCode,
	TerminalErrorCode,
	ValidationErrorCode,
} from './codes';

// =============================================================================
// FACTORIES
// =============================================================================

export type { ErrorOptions, ValidationErrorOptions } from './factories';

export {
	createComponentError,
	createConfigError,
	createEntityError,
	createInputError,
	createInternalError,
	createRenderError,
	createSystemError,
	createTerminalError,
	createValidationError,
	fromNativeError,
	toNativeError,
	wrapError,
} from './factories';

// =============================================================================
// GUARDS
// =============================================================================

export {
	hasBlECSdErrorShape,
	hasCause,
	hasContext,
	hasErrorCode,
	hasZodIssues,
	isBlECSdError,
	isComponentError,
	isConfigError,
	isEntityError,
	isErrorKind,
	isInputError,
	isInternalError,
	isRenderError,
	isSystemError,
	isTerminalError,
	isValidationError,
} from './guards';

// =============================================================================
// RESULT TYPE
// =============================================================================

export type { Result, ResultErr, ResultOk } from './result';

export {
	err,
	flatMap,
	isErr,
	isOk,
	map,
	mapError,
	ok,
	unwrap,
	unwrapOr,
	unwrapOrElse,
} from './result';
