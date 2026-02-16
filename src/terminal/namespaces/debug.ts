/**
 * Debug logging namespace.
 *
 * Functions for configuring debug logging, dumping terminal state,
 * and troubleshooting terminal I/O issues.
 *
 * @example
 * ```typescript
 * import { debug } from 'blecsd/terminal';
 *
 * // Create and configure logger
 * const logger = debug.createDebugLogger('myapp', { level: debug.LogLevel.DEBUG });
 * debug.configureDebugLogger(logger, { level: debug.LogLevel.TRACE });
 *
 * // Log messages
 * logger.debug('Something happened');
 * logger.error('Error occurred', error);
 *
 * // Dump terminal state for debugging
 * const state = debug.dumpTerminalState(program);
 * debug.dumpRaw(buffer);
 *
 * // Check if logging enabled
 * if (debug.isDebugLoggingEnabled()) {
 *   // Expensive debug operation
 * }
 * ```
 */

import {
	clearLog,
	configureDebugLogger,
	createDebugLogger,
	debugLoggers,
	dumpRaw,
	dumpTerminalState,
	getLogFile,
	isDebugLoggingEnabled,
	LogLevel,
} from '../debug';

/**
 * Debug logging namespace.
 */
export const debug = Object.freeze({
	clearLog,
	configureDebugLogger,
	createDebugLogger,
	debugLoggers: Object.freeze(debugLoggers),
	dumpRaw,
	dumpTerminalState,
	getLogFile,
	isDebugLoggingEnabled,
	LogLevel: Object.freeze(LogLevel),
});

export type DebugModule = typeof debug;
