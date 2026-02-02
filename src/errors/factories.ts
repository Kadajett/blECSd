/**
 * Error Factory Functions
 *
 * Factory functions for creating BlECSd errors.
 * All errors are immutable plain objects per FP requirements.
 *
 * @module errors/factories
 */

import type { core } from 'zod';
import type {
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
import type {
	BlECSdError,
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
import { BLECSD_ERROR_SYMBOL } from './types';

// =============================================================================
// FACTORY OPTIONS
// =============================================================================

/**
 * Options for creating errors.
 */
export interface ErrorOptions {
	/** Original cause (if wrapping another error) */
	readonly cause?: Error;
	/** Additional context for debugging */
	readonly context?: ErrorContext;
}

/**
 * Options for validation errors with Zod issues.
 */
export interface ValidationErrorOptions extends ErrorOptions {
	/** Zod validation issues */
	readonly zodIssues?: readonly core.$ZodIssue[];
}

// =============================================================================
// VALIDATION ERROR FACTORY
// =============================================================================

/**
 * Creates a validation error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A ValidationError object
 *
 * @example
 * ```typescript
 * import { createValidationError, ValidationErrorCode } from 'blecsd/errors';
 *
 * const error = createValidationError(
 *   ValidationErrorCode.INVALID_HEX_COLOR,
 *   'Invalid hex color format: #xyz',
 *   { context: { data: { input: '#xyz' } } }
 * );
 * ```
 */
export function createValidationError(
	code: ValidationErrorCodeType,
	message: string,
	options?: ValidationErrorOptions,
): ValidationError {
	return {
		kind: 'validation',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.zodIssues
			? { ...options.context, zodIssues: options.zodIssues }
			: options?.context,
	};
}

// =============================================================================
// TERMINAL ERROR FACTORY
// =============================================================================

/**
 * Creates a terminal error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A TerminalError object
 *
 * @example
 * ```typescript
 * import { createTerminalError, TerminalErrorCode } from 'blecsd/errors';
 *
 * const error = createTerminalError(
 *   TerminalErrorCode.TERMINFO_NOT_FOUND,
 *   'Terminfo file not found for terminal: xterm-256color'
 * );
 * ```
 */
export function createTerminalError(
	code: TerminalErrorCodeType,
	message: string,
	options?: ErrorOptions,
): TerminalError {
	return {
		kind: 'terminal',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// SYSTEM ERROR FACTORY
// =============================================================================

/**
 * Creates a system error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A SystemError object
 *
 * @example
 * ```typescript
 * import { createSystemError, SystemErrorCode } from 'blecsd/errors';
 *
 * const error = createSystemError(
 *   SystemErrorCode.LOOP_ALREADY_RUNNING,
 *   'Cannot start game loop: already running',
 *   { context: { systemName: 'GameLoop' } }
 * );
 * ```
 */
export function createSystemError(
	code: SystemErrorCodeType,
	message: string,
	options?: ErrorOptions,
): SystemError {
	return {
		kind: 'system',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// ENTITY ERROR FACTORY
// =============================================================================

/**
 * Creates an entity error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns An EntityError object
 *
 * @example
 * ```typescript
 * import { createEntityError, EntityErrorCode } from 'blecsd/errors';
 *
 * const error = createEntityError(
 *   EntityErrorCode.NOT_FOUND,
 *   'Entity not found: 42',
 *   { context: { entityId: 42 } }
 * );
 * ```
 */
export function createEntityError(
	code: EntityErrorCodeType,
	message: string,
	options?: ErrorOptions,
): EntityError {
	return {
		kind: 'entity',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// COMPONENT ERROR FACTORY
// =============================================================================

/**
 * Creates a component error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A ComponentError object
 *
 * @example
 * ```typescript
 * import { createComponentError, ComponentErrorCode } from 'blecsd/errors';
 *
 * const error = createComponentError(
 *   ComponentErrorCode.NOT_FOUND,
 *   'Component Position not found on entity 42',
 *   { context: { entityId: 42, componentName: 'Position' } }
 * );
 * ```
 */
export function createComponentError(
	code: ComponentErrorCodeType,
	message: string,
	options?: ErrorOptions,
): ComponentError {
	return {
		kind: 'component',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// INPUT ERROR FACTORY
// =============================================================================

/**
 * Creates an input error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns An InputError object
 *
 * @example
 * ```typescript
 * import { createInputError, InputErrorCode } from 'blecsd/errors';
 *
 * const error = createInputError(
 *   InputErrorCode.INVALID_KEY_SEQUENCE,
 *   'Unrecognized escape sequence'
 * );
 * ```
 */
export function createInputError(
	code: InputErrorCodeType,
	message: string,
	options?: ErrorOptions,
): InputError {
	return {
		kind: 'input',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// RENDER ERROR FACTORY
// =============================================================================

/**
 * Creates a render error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A RenderError object
 *
 * @example
 * ```typescript
 * import { createRenderError, RenderErrorCode } from 'blecsd/errors';
 *
 * const error = createRenderError(
 *   RenderErrorCode.INVALID_COORDINATES,
 *   'Cell coordinates out of bounds: (100, 50)',
 *   { context: { data: { x: 100, y: 50 } } }
 * );
 * ```
 */
export function createRenderError(
	code: RenderErrorCodeType,
	message: string,
	options?: ErrorOptions,
): RenderError {
	return {
		kind: 'render',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// CONFIG ERROR FACTORY
// =============================================================================

/**
 * Creates a config error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns A ConfigError object
 *
 * @example
 * ```typescript
 * import { createConfigError, ConfigErrorCode } from 'blecsd/errors';
 *
 * const error = createConfigError(
 *   ConfigErrorCode.INVALID_GAME_CONFIG,
 *   'Invalid game configuration: width must be positive'
 * );
 * ```
 */
export function createConfigError(
	code: ConfigErrorCodeType,
	message: string,
	options?: ErrorOptions,
): ConfigError {
	return {
		kind: 'config',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// INTERNAL ERROR FACTORY
// =============================================================================

/**
 * Creates an internal error.
 *
 * @param code - The error code
 * @param message - Human-readable error message
 * @param options - Additional options
 * @returns An InternalError object
 *
 * @example
 * ```typescript
 * import { createInternalError, InternalErrorCode } from 'blecsd/errors';
 *
 * const error = createInternalError(
 *   InternalErrorCode.ASSERTION_FAILED,
 *   'Assertion failed: expected x > 0'
 * );
 * ```
 */
export function createInternalError(
	code: InternalErrorCodeType,
	message: string,
	options?: ErrorOptions,
): InternalError {
	return {
		kind: 'internal',
		code,
		message,
		timestamp: Date.now(),
		cause: options?.cause,
		context: options?.context,
	};
}

// =============================================================================
// NATIVE ERROR CONVERSION
// =============================================================================

/**
 * Converts a BlECSdError to a native Error for throw/catch.
 *
 * The returned Error has the BlECSdError attached via symbol,
 * allowing recovery with `fromNativeError()`.
 *
 * @param error - The BlECSdError to convert
 * @returns A native Error with the BlECSdError attached
 *
 * @example
 * ```typescript
 * import { createValidationError, toNativeError, ValidationErrorCode } from 'blecsd/errors';
 *
 * const blecsdError = createValidationError(
 *   ValidationErrorCode.INVALID_HEX_COLOR,
 *   'Invalid hex color'
 * );
 * throw toNativeError(blecsdError);
 * ```
 */
export function toNativeError(error: BlECSdError): NativeBlECSdError {
	const nativeError = new Error(error.message) as NativeBlECSdError;
	nativeError.name = `BlECSd${capitalize(error.kind)}Error`;

	// Attach the BlECSdError via symbol
	(nativeError as { [BLECSD_ERROR_SYMBOL]: BlECSdError })[BLECSD_ERROR_SYMBOL] = error;

	// Set cause if available
	if (error.cause) {
		nativeError.cause = error.cause;
	}

	return nativeError;
}

/**
 * Extracts a BlECSdError from a native Error (if it was created with `toNativeError()`).
 *
 * @param error - The caught error (unknown type from catch block)
 * @returns The BlECSdError if present, null otherwise
 *
 * @example
 * ```typescript
 * import { fromNativeError } from 'blecsd/errors';
 *
 * try {
 *   someFunction();
 * } catch (e) {
 *   const blecsdError = fromNativeError(e);
 *   if (blecsdError) {
 *     console.log('BlECSd error:', blecsdError.code);
 *   } else {
 *     console.log('Unknown error:', e);
 *   }
 * }
 * ```
 */
export function fromNativeError(error: unknown): BlECSdError | null {
	if (error == null || typeof error !== 'object') {
		return null;
	}

	if (BLECSD_ERROR_SYMBOL in error) {
		return (error as NativeBlECSdError)[BLECSD_ERROR_SYMBOL];
	}

	return null;
}

/**
 * Wraps an unknown error as a BlECSdError.
 *
 * If the error is already a BlECSdError (via toNativeError), returns it.
 * Otherwise, wraps it in an InternalError.
 *
 * @param error - The unknown error
 * @param fallbackCode - Error code to use if not a BlECSdError
 * @param fallbackMessage - Message prefix to use if not a BlECSdError
 * @returns A BlECSdError
 *
 * @example
 * ```typescript
 * import { wrapError, InternalErrorCode } from 'blecsd/errors';
 *
 * try {
 *   riskyOperation();
 * } catch (e) {
 *   const error = wrapError(
 *     e,
 *     InternalErrorCode.UNEXPECTED_STATE,
 *     'Unexpected error in riskyOperation'
 *   );
 *   // error is always a BlECSdError
 * }
 * ```
 */
export function wrapError(
	error: unknown,
	fallbackCode: InternalErrorCodeType,
	fallbackMessage: string,
): BlECSdError {
	// Check if already a BlECSdError
	const existing = fromNativeError(error);
	if (existing) {
		return existing;
	}

	// Wrap native Error
	const cause = error instanceof Error ? error : undefined;
	const message =
		error instanceof Error
			? `${fallbackMessage}: ${error.message}`
			: `${fallbackMessage}: ${String(error)}`;

	return createInternalError(fallbackCode, message, { cause });
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
