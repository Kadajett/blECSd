/**
 * Warning system for non-fatal screen issues.
 *
 * Provides typed warnings for terminal/screen issues like small sizes,
 * unsupported capabilities, deprecated APIs, and performance problems.
 *
 * @module core/warnings
 *
 * @example
 * ```typescript
 * import { createWarningEmitter, WarningType } from 'blecsd';
 *
 * const warnings = createWarningEmitter();
 *
 * warnings.on('warning', (event) => {
 *   console.warn(`[${event.type}] ${event.message}`);
 * });
 *
 * // Emit a warning
 * warnings.emit('warning', {
 *   type: WarningType.TERMINAL_TOO_SMALL,
 *   message: 'Terminal size is very small',
 *   metadata: { width: 20, height: 10, minWidth: 80, minHeight: 24 },
 *   timestamp: Date.now(),
 * });
 * ```
 */

import { z } from 'zod';
import { createEventBus, type EventBus } from './events';

/**
 * Warning type enumeration.
 */
export const WarningType = {
	/** Terminal resized to very small dimensions */
	TERMINAL_TOO_SMALL: 'terminal-too-small',
	/** Requested terminal capability is not supported */
	UNSUPPORTED_CAPABILITY: 'unsupported-capability',
	/** Using deprecated API */
	DEPRECATED_API: 'deprecated-api',
	/** Performance issue detected (frame drops) */
	PERFORMANCE_ISSUE: 'performance-issue',
} as const;

export type WarningTypeValue = (typeof WarningType)[keyof typeof WarningType];

/**
 * Metadata for terminal too small warnings.
 */
export interface TerminalTooSmallMetadata {
	readonly width: number;
	readonly height: number;
	readonly minWidth: number;
	readonly minHeight: number;
}

/**
 * Metadata for unsupported capability warnings.
 */
export interface UnsupportedCapabilityMetadata {
	readonly capability: string;
	readonly fallback?: string | undefined;
}

/**
 * Metadata for deprecated API warnings.
 */
export interface DeprecatedAPIMetadata {
	readonly api: string;
	readonly replacement: string;
	readonly since: string;
}

/**
 * Metadata for performance warnings.
 */
export interface PerformanceIssueMetadata {
	readonly metric: string;
	readonly value: number;
	readonly threshold: number;
	readonly frameTime?: number | undefined;
}

/**
 * Union type for warning metadata.
 */
export type WarningMetadata =
	| TerminalTooSmallMetadata
	| UnsupportedCapabilityMetadata
	| DeprecatedAPIMetadata
	| PerformanceIssueMetadata;

/**
 * Warning event payload.
 */
export interface WarningEvent {
	readonly type: WarningTypeValue;
	readonly message: string;
	readonly metadata: WarningMetadata;
	readonly timestamp: number;
}

/**
 * Zod schema for terminal too small metadata.
 */
export const TerminalTooSmallMetadataSchema = z.object({
	width: z.number().int().nonnegative(),
	height: z.number().int().nonnegative(),
	minWidth: z.number().int().positive(),
	minHeight: z.number().int().positive(),
});

/**
 * Zod schema for unsupported capability metadata.
 */
export const UnsupportedCapabilityMetadataSchema = z.object({
	capability: z.string(),
	fallback: z.string().optional(),
});

/**
 * Zod schema for deprecated API metadata.
 */
export const DeprecatedAPIMetadataSchema = z.object({
	api: z.string(),
	replacement: z.string(),
	since: z.string(),
});

/**
 * Zod schema for performance issue metadata.
 */
export const PerformanceIssueMetadataSchema = z.object({
	metric: z.string(),
	value: z.number(),
	threshold: z.number(),
	frameTime: z.number().optional(),
});

/**
 * Zod schema for warning events.
 */
export const WarningEventSchema = z.object({
	type: z.enum([
		WarningType.TERMINAL_TOO_SMALL,
		WarningType.UNSUPPORTED_CAPABILITY,
		WarningType.DEPRECATED_API,
		WarningType.PERFORMANCE_ISSUE,
	]),
	message: z.string(),
	metadata: z.union([
		TerminalTooSmallMetadataSchema,
		UnsupportedCapabilityMetadataSchema,
		DeprecatedAPIMetadataSchema,
		PerformanceIssueMetadataSchema,
	]),
	timestamp: z.number(),
});

/**
 * Warning event map for typed event bus.
 */
export interface WarningEventMap {
	warning: WarningEvent;
}

/**
 * Warning emitter type.
 */
export type WarningEmitter = EventBus<WarningEventMap>;

/**
 * Creates a new warning event emitter.
 *
 * @returns A new warning emitter
 *
 * @example
 * ```typescript
 * import { createWarningEmitter } from 'blecsd';
 *
 * const warnings = createWarningEmitter();
 *
 * // Listen for all warnings
 * warnings.on('warning', (event) => {
 *   console.warn(`Warning: ${event.message}`);
 * });
 * ```
 */
export function createWarningEmitter(): WarningEmitter {
	return createEventBus<WarningEventMap>();
}

/**
 * Creates and emits a terminal too small warning.
 *
 * @param emitter - The warning emitter
 * @param width - Current terminal width
 * @param height - Current terminal height
 * @param minWidth - Minimum recommended width
 * @param minHeight - Minimum recommended height
 *
 * @example
 * ```typescript
 * import { emitTerminalTooSmallWarning } from 'blecsd';
 *
 * emitTerminalTooSmallWarning(warnings, 40, 15, 80, 24);
 * ```
 */
export function emitTerminalTooSmallWarning(
	emitter: WarningEmitter,
	width: number,
	height: number,
	minWidth: number,
	minHeight: number,
): void {
	const metadata: TerminalTooSmallMetadata = { width, height, minWidth, minHeight };
	const event: WarningEvent = {
		type: WarningType.TERMINAL_TOO_SMALL,
		message: `Terminal size (${width}x${height}) is smaller than recommended (${minWidth}x${minHeight})`,
		metadata,
		timestamp: Date.now(),
	};
	emitter.emit('warning', WarningEventSchema.parse(event));
}

/**
 * Creates and emits an unsupported capability warning.
 *
 * @param emitter - The warning emitter
 * @param capability - The unsupported capability name
 * @param fallback - Optional fallback description
 *
 * @example
 * ```typescript
 * import { emitUnsupportedCapabilityWarning } from 'blecsd';
 *
 * emitUnsupportedCapabilityWarning(
 *   warnings,
 *   'truecolor',
 *   'Falling back to 256-color mode'
 * );
 * ```
 */
export function emitUnsupportedCapabilityWarning(
	emitter: WarningEmitter,
	capability: string,
	fallback?: string,
): void {
	const metadata: UnsupportedCapabilityMetadata = { capability, fallback };
	const event: WarningEvent = {
		type: WarningType.UNSUPPORTED_CAPABILITY,
		message: `Terminal capability '${capability}' is not supported${fallback ? `. ${fallback}` : ''}`,
		metadata,
		timestamp: Date.now(),
	};
	emitter.emit('warning', WarningEventSchema.parse(event));
}

/**
 * Creates and emits a deprecated API warning.
 *
 * @param emitter - The warning emitter
 * @param api - The deprecated API name
 * @param replacement - The replacement API
 * @param since - Version since deprecated
 *
 * @example
 * ```typescript
 * import { emitDeprecatedAPIWarning } from 'blecsd';
 *
 * emitDeprecatedAPIWarning(
 *   warnings,
 *   'oldFunction()',
 *   'newFunction()',
 *   'v2.0.0'
 * );
 * ```
 */
export function emitDeprecatedAPIWarning(
	emitter: WarningEmitter,
	api: string,
	replacement: string,
	since: string,
): void {
	const metadata: DeprecatedAPIMetadata = { api, replacement, since };
	const event: WarningEvent = {
		type: WarningType.DEPRECATED_API,
		message: `API '${api}' is deprecated since ${since}. Use '${replacement}' instead.`,
		metadata,
		timestamp: Date.now(),
	};
	emitter.emit('warning', WarningEventSchema.parse(event));
}

/**
 * Creates and emits a performance issue warning.
 *
 * @param emitter - The warning emitter
 * @param metric - The performance metric name
 * @param value - The measured value
 * @param threshold - The threshold value
 * @param frameTime - Optional frame time in milliseconds
 *
 * @example
 * ```typescript
 * import { emitPerformanceWarning } from 'blecsd';
 *
 * emitPerformanceWarning(
 *   warnings,
 *   'frame-time',
 *   35,
 *   16.67,
 *   35
 * );
 * ```
 */
export function emitPerformanceWarning(
	emitter: WarningEmitter,
	metric: string,
	value: number,
	threshold: number,
	frameTime?: number,
): void {
	const metadata: PerformanceIssueMetadata = { metric, value, threshold, frameTime };
	const event: WarningEvent = {
		type: WarningType.PERFORMANCE_ISSUE,
		message: `Performance issue: ${metric} (${value.toFixed(2)}) exceeds threshold (${threshold.toFixed(2)})`,
		metadata,
		timestamp: Date.now(),
	};
	emitter.emit('warning', WarningEventSchema.parse(event));
}
