/**
 * Result Type for Recoverable Operations
 *
 * A discriminated union type for representing success or failure.
 * Inspired by Rust's Result<T, E> type.
 *
 * @module errors/result
 */

import type { BlECSdError } from './types';

// =============================================================================
// RESULT TYPE
// =============================================================================

/**
 * Successful result containing a value.
 */
export interface ResultOk<T> {
	readonly ok: true;
	readonly value: T;
}

/**
 * Failed result containing an error.
 */
export interface ResultErr<E> {
	readonly ok: false;
	readonly error: E;
}

/**
 * Result type representing either success (Ok) or failure (Err).
 *
 * @typeParam T - The success value type
 * @typeParam E - The error type (defaults to BlECSdError)
 *
 * @example
 * ```typescript
 * import { Result, ok, err, unwrapOr } from 'blecsd/errors';
 *
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * const value = unwrapOr(result, 0); // 5
 * ```
 */
export type Result<T, E = BlECSdError> = ResultOk<T> | ResultErr<E>;

// =============================================================================
// CONSTRUCTORS
// =============================================================================

/**
 * Creates a successful Result containing a value.
 *
 * @param value - The success value
 * @returns A Result with ok: true
 *
 * @example
 * ```typescript
 * import { ok } from 'blecsd/errors';
 *
 * const result = ok(42);
 * // result: { ok: true, value: 42 }
 * ```
 */
export function ok<T>(value: T): ResultOk<T> {
	return { ok: true, value };
}

/**
 * Creates a failed Result containing an error.
 *
 * @param error - The error value
 * @returns A Result with ok: false
 *
 * @example
 * ```typescript
 * import { err, createValidationError, ValidationErrorCode } from 'blecsd/errors';
 *
 * const result = err(createValidationError(
 *   ValidationErrorCode.INVALID_INPUT,
 *   'Invalid input'
 * ));
 * ```
 */
export function err<E>(error: E): ResultErr<E> {
	return { ok: false, error };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Checks if a Result is Ok (successful).
 *
 * @param result - The Result to check
 * @returns True if the Result is Ok
 *
 * @example
 * ```typescript
 * import { isOk, ok, err } from 'blecsd/errors';
 *
 * isOk(ok(42));        // true
 * isOk(err('error'));  // false
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is ResultOk<T> {
	return result.ok === true;
}

/**
 * Checks if a Result is Err (failed).
 *
 * @param result - The Result to check
 * @returns True if the Result is Err
 *
 * @example
 * ```typescript
 * import { isErr, ok, err } from 'blecsd/errors';
 *
 * isErr(ok(42));        // false
 * isErr(err('error'));  // true
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is ResultErr<E> {
	return result.ok === false;
}

// =============================================================================
// UNWRAP FUNCTIONS
// =============================================================================

/**
 * Extracts the value from an Ok Result, or throws if Err.
 *
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws Error if the Result is Err
 *
 * @example
 * ```typescript
 * import { unwrap, ok, err } from 'blecsd/errors';
 *
 * unwrap(ok(42));        // 42
 * unwrap(err('error'));  // throws Error
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
	if (result.ok) {
		return result.value;
	}
	const errorMessage =
		result.error instanceof Error
			? result.error.message
			: typeof result.error === 'object' && result.error !== null && 'message' in result.error
				? String((result.error as { message: unknown }).message)
				: String(result.error);
	throw new Error(`Called unwrap on Err: ${errorMessage}`);
}

/**
 * Extracts the value from an Ok Result, or returns a default value if Err.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The value to return if Err
 * @returns The success value or the default value
 *
 * @example
 * ```typescript
 * import { unwrapOr, ok, err } from 'blecsd/errors';
 *
 * unwrapOr(ok(42), 0);        // 42
 * unwrapOr(err('error'), 0);  // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	return result.ok ? result.value : defaultValue;
}

/**
 * Extracts the value from an Ok Result, or computes a default value if Err.
 *
 * @param result - The Result to unwrap
 * @param fn - Function to compute the default value (receives the error)
 * @returns The success value or the computed default value
 *
 * @example
 * ```typescript
 * import { unwrapOrElse, ok, err } from 'blecsd/errors';
 *
 * unwrapOrElse(ok(42), () => 0);                    // 42
 * unwrapOrElse(err('error'), (e) => e.length);      // 5
 * ```
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
	return result.ok ? result.value : fn(result.error);
}

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Maps a function over the Ok value, leaving Err unchanged.
 *
 * @param result - The Result to map
 * @param fn - Function to apply to the Ok value
 * @returns A new Result with the mapped value
 *
 * @example
 * ```typescript
 * import { map, ok, err } from 'blecsd/errors';
 *
 * map(ok(42), (x) => x * 2);        // ok(84)
 * map(err('error'), (x) => x * 2);  // err('error')
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
	if (result.ok) {
		return ok(fn(result.value));
	}
	return result;
}

/**
 * Maps a function over the Err error, leaving Ok unchanged.
 *
 * @param result - The Result to map
 * @param fn - Function to apply to the Err error
 * @returns A new Result with the mapped error
 *
 * @example
 * ```typescript
 * import { mapError, ok, err } from 'blecsd/errors';
 *
 * mapError(ok(42), (e) => new Error(e));        // ok(42)
 * mapError(err('oops'), (e) => new Error(e));   // err(Error('oops'))
 * ```
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
	if (result.ok) {
		return result;
	}
	return err(fn(result.error));
}

/**
 * Chains Result-returning functions, short-circuiting on Err.
 *
 * @param result - The Result to chain
 * @param fn - Function that returns a Result
 * @returns The Result from the function, or the original Err
 *
 * @example
 * ```typescript
 * import { flatMap, ok, err, Result } from 'blecsd/errors';
 *
 * function sqrt(x: number): Result<number, string> {
 *   return x >= 0 ? ok(Math.sqrt(x)) : err('negative number');
 * }
 *
 * flatMap(ok(16), sqrt);   // ok(4)
 * flatMap(ok(-1), sqrt);   // err('negative number')
 * flatMap(err('x'), sqrt); // err('x')
 * ```
 */
export function flatMap<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, E>,
): Result<U, E> {
	if (result.ok) {
		return fn(result.value);
	}
	return result;
}
