/**
 * BlECSd Error Type System
 *
 * Provides a discriminated union type system for all library errors.
 * Uses plain data objects and factory functions per FP requirements.
 *
 * @module errors/types
 */

import type { core } from 'zod';
import type {
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

// =============================================================================
// ERROR KIND
// =============================================================================

/**
 * Discriminated error kinds for BlECSd errors.
 */
export type BlECSdErrorKind =
	| 'validation'
	| 'terminal'
	| 'system'
	| 'entity'
	| 'component'
	| 'input'
	| 'render'
	| 'config'
	| 'internal';

// =============================================================================
// ERROR CONTEXT
// =============================================================================

/**
 * Context data that can be attached to any error.
 */
export interface ErrorContext {
	/** The entity ID involved (if applicable) */
	readonly entityId?: number;
	/** The component name involved (if applicable) */
	readonly componentName?: string;
	/** The system name involved (if applicable) */
	readonly systemName?: string;
	/** The file path involved (if applicable) */
	readonly filePath?: string;
	/** The function name where error occurred */
	readonly functionName?: string;
	/** Additional data for debugging */
	readonly data?: Readonly<Record<string, unknown>>;
	/** Zod validation issues (for validation errors) */
	readonly zodIssues?: readonly core.$ZodIssue[];
}

// =============================================================================
// BASE ERROR DATA
// =============================================================================

/**
 * Base error data common to all BlECSd errors.
 */
export interface BlECSdErrorBase<K extends BlECSdErrorKind, C extends BlECSdErrorCodeType> {
	/** Discriminant for error kind */
	readonly kind: K;
	/** Error code for programmatic handling */
	readonly code: C;
	/** Human-readable error message */
	readonly message: string;
	/** Timestamp when error was created */
	readonly timestamp: number;
	/** Original cause (if wrapping another error) */
	readonly cause?: Error;
	/** Additional context for debugging */
	readonly context?: ErrorContext;
}

// =============================================================================
// SPECIFIC ERROR TYPES
// =============================================================================

/**
 * Validation error for input/config validation failures.
 */
export interface ValidationError extends BlECSdErrorBase<'validation', ValidationErrorCodeType> {
	readonly kind: 'validation';
}

/**
 * Terminal error for terminal I/O and capability failures.
 */
export interface TerminalError extends BlECSdErrorBase<'terminal', TerminalErrorCodeType> {
	readonly kind: 'terminal';
}

/**
 * System error for ECS system and game loop failures.
 */
export interface SystemError extends BlECSdErrorBase<'system', SystemErrorCodeType> {
	readonly kind: 'system';
}

/**
 * Entity error for ECS entity management failures.
 */
export interface EntityError extends BlECSdErrorBase<'entity', EntityErrorCodeType> {
	readonly kind: 'entity';
}

/**
 * Component error for ECS component failures.
 */
export interface ComponentError extends BlECSdErrorBase<'component', ComponentErrorCodeType> {
	readonly kind: 'component';
}

/**
 * Input error for input handling failures.
 */
export interface InputError extends BlECSdErrorBase<'input', InputErrorCodeType> {
	readonly kind: 'input';
}

/**
 * Render error for rendering failures.
 */
export interface RenderError extends BlECSdErrorBase<'render', RenderErrorCodeType> {
	readonly kind: 'render';
}

/**
 * Config error for configuration failures.
 */
export interface ConfigError extends BlECSdErrorBase<'config', ConfigErrorCodeType> {
	readonly kind: 'config';
}

/**
 * Internal error for library internal failures.
 * These indicate bugs in the library itself.
 */
export interface InternalError extends BlECSdErrorBase<'internal', InternalErrorCodeType> {
	readonly kind: 'internal';
}

// =============================================================================
// UNION TYPE
// =============================================================================

/**
 * Union of all BlECSd error types.
 * Use type guards to narrow to specific error types.
 */
export type BlECSdError =
	| ValidationError
	| TerminalError
	| SystemError
	| EntityError
	| ComponentError
	| InputError
	| RenderError
	| ConfigError
	| InternalError;

// =============================================================================
// NATIVE ERROR WRAPPER
// =============================================================================

/**
 * Symbol used to attach BlECSdError data to native Error instances.
 */
export const BLECSD_ERROR_SYMBOL = Symbol.for('blecsd.error');

/**
 * Native Error with attached BlECSdError data.
 * Used for throw/catch interop with native try/catch.
 */
export interface NativeBlECSdError extends Error {
	readonly [BLECSD_ERROR_SYMBOL]: BlECSdError;
}
