/**
 * Type Guards for BlECSd Errors
 *
 * Type guards for narrowing BlECSdError union types.
 *
 * @module errors/guards
 */

import type {
	BlECSdError,
	BlECSdErrorKind,
	ComponentError,
	ConfigError,
	EntityError,
	InputError,
	InternalError,
	RenderError,
	SystemError,
	TerminalError,
	ValidationError,
} from './types';
import { BLECSD_ERROR_SYMBOL } from './types';

// =============================================================================
// KIND GUARDS
// =============================================================================

/**
 * Checks if an error is a ValidationError.
 *
 * @param error - The error to check
 * @returns True if the error is a ValidationError
 *
 * @example
 * ```typescript
 * import { isValidationError } from 'blecsd/errors';
 *
 * if (isValidationError(error)) {
 *   // error is narrowed to ValidationError
 *   console.log(error.context?.zodIssues);
 * }
 * ```
 */
export function isValidationError(error: BlECSdError): error is ValidationError {
	return error.kind === 'validation';
}

/**
 * Checks if an error is a TerminalError.
 *
 * @param error - The error to check
 * @returns True if the error is a TerminalError
 */
export function isTerminalError(error: BlECSdError): error is TerminalError {
	return error.kind === 'terminal';
}

/**
 * Checks if an error is a SystemError.
 *
 * @param error - The error to check
 * @returns True if the error is a SystemError
 */
export function isSystemError(error: BlECSdError): error is SystemError {
	return error.kind === 'system';
}

/**
 * Checks if an error is an EntityError.
 *
 * @param error - The error to check
 * @returns True if the error is an EntityError
 */
export function isEntityError(error: BlECSdError): error is EntityError {
	return error.kind === 'entity';
}

/**
 * Checks if an error is a ComponentError.
 *
 * @param error - The error to check
 * @returns True if the error is a ComponentError
 */
export function isComponentError(error: BlECSdError): error is ComponentError {
	return error.kind === 'component';
}

/**
 * Checks if an error is an InputError.
 *
 * @param error - The error to check
 * @returns True if the error is an InputError
 */
export function isInputError(error: BlECSdError): error is InputError {
	return error.kind === 'input';
}

/**
 * Checks if an error is a RenderError.
 *
 * @param error - The error to check
 * @returns True if the error is a RenderError
 */
export function isRenderError(error: BlECSdError): error is RenderError {
	return error.kind === 'render';
}

/**
 * Checks if an error is a ConfigError.
 *
 * @param error - The error to check
 * @returns True if the error is a ConfigError
 */
export function isConfigError(error: BlECSdError): error is ConfigError {
	return error.kind === 'config';
}

/**
 * Checks if an error is an InternalError.
 *
 * @param error - The error to check
 * @returns True if the error is an InternalError
 */
export function isInternalError(error: BlECSdError): error is InternalError {
	return error.kind === 'internal';
}

// =============================================================================
// GENERIC GUARDS
// =============================================================================

/**
 * Checks if an error is of a specific kind.
 *
 * @param error - The error to check
 * @param kind - The kind to check for
 * @returns True if the error is of the specified kind
 *
 * @example
 * ```typescript
 * import { isErrorKind } from 'blecsd/errors';
 *
 * if (isErrorKind(error, 'validation')) {
 *   // error is narrowed to ValidationError
 * }
 * ```
 */
export function isErrorKind<K extends BlECSdErrorKind>(
	error: BlECSdError,
	kind: K,
): error is Extract<BlECSdError, { kind: K }> {
	return error.kind === kind;
}

/**
 * Checks if an error has a specific code.
 *
 * @param error - The error to check
 * @param code - The code to check for
 * @returns True if the error has the specified code
 *
 * @example
 * ```typescript
 * import { hasErrorCode, ValidationErrorCode } from 'blecsd/errors';
 *
 * if (hasErrorCode(error, ValidationErrorCode.INVALID_HEX_COLOR)) {
 *   // Handle specific error case
 * }
 * ```
 */
export function hasErrorCode(error: BlECSdError, code: string): boolean {
	return error.code === code;
}

/**
 * Checks if an unknown value is a BlECSdError (via NativeBlECSdError).
 *
 * @param value - The value to check
 * @returns True if the value contains a BlECSdError
 *
 * @example
 * ```typescript
 * import { isBlECSdError } from 'blecsd/errors';
 *
 * try {
 *   someFunction();
 * } catch (e) {
 *   if (isBlECSdError(e)) {
 *     // e contains a BlECSdError
 *   }
 * }
 * ```
 */
export function isBlECSdError(value: unknown): value is {
	[BLECSD_ERROR_SYMBOL]: BlECSdError;
} {
	return value != null && typeof value === 'object' && BLECSD_ERROR_SYMBOL in value;
}

/**
 * Checks if an unknown value looks like a BlECSdError object (duck typing).
 *
 * This checks the shape of the object rather than the symbol.
 * Useful for deserializing errors or cross-realm scenarios.
 *
 * @param value - The value to check
 * @returns True if the value has the shape of a BlECSdError
 */
export function hasBlECSdErrorShape(value: unknown): value is BlECSdError {
	if (value == null || typeof value !== 'object') {
		return false;
	}

	const obj = value as Record<string, unknown>;
	return (
		typeof obj.kind === 'string' &&
		typeof obj.code === 'string' &&
		typeof obj.message === 'string' &&
		typeof obj.timestamp === 'number'
	);
}

// =============================================================================
// CONTEXT GUARDS
// =============================================================================

/**
 * Checks if an error has context data.
 *
 * @param error - The error to check
 * @returns True if the error has context
 */
export function hasContext(
	error: BlECSdError,
): error is BlECSdError & { context: NonNullable<BlECSdError['context']> } {
	return error.context != null;
}

/**
 * Checks if an error has a cause.
 *
 * @param error - The error to check
 * @returns True if the error has a cause
 */
export function hasCause(error: BlECSdError): error is BlECSdError & { cause: Error } {
	return error.cause != null;
}

/**
 * Checks if an error has Zod issues in its context.
 *
 * @param error - The error to check
 * @returns True if the error has Zod issues
 */
export function hasZodIssues(error: BlECSdError): error is BlECSdError & {
	context: NonNullable<BlECSdError['context']> & {
		zodIssues: NonNullable<BlECSdError['context']>['zodIssues'];
	};
} {
	return (
		error.context != null && error.context.zodIssues != null && error.context.zodIssues.length > 0
	);
}
