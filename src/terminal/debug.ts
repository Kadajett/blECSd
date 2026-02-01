/**
 * Debug Logging System
 *
 * Provides debug logging and terminal state dumping for development
 * and debugging purposes.
 *
 * @module terminal/debug
 * @internal
 */

import {
	appendFileSync,
	existsSync,
	unlinkSync as fsUnlinkSync,
	mkdirSync,
	renameSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { inspect } from 'node:util';

/**
 * Log level definitions
 */
export const LogLevel = {
	TRACE: 0,
	DEBUG: 1,
	INFO: 2,
	WARN: 3,
	ERROR: 4,
	SILENT: 5,
} as const;

export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];
export type LogLevelName = keyof typeof LogLevel;

/**
 * Configuration for the debug logger
 */
export interface DebugLoggerConfig {
	/** Enable logging (default: reads from DEBUG env var) */
	enabled?: boolean;
	/** Log file path (default: blecsd-debug.log in current directory) */
	logFile?: string;
	/** Minimum log level to output (default: DEBUG) */
	level?: LogLevelValue;
	/** Include timestamps (default: true) */
	timestamps?: boolean;
	/** Include log level in output (default: true) */
	includeLevel?: boolean;
	/** Maximum log file size in bytes before rotation (default: 10MB) */
	maxFileSize?: number;
	/** Namespace filter (comma-separated, supports wildcards) */
	namespaceFilter?: string;
}

/**
 * Debug logger state
 */
interface DebugLoggerState {
	enabled: boolean;
	logFile: string;
	level: LogLevelValue;
	timestamps: boolean;
	includeLevel: boolean;
	maxFileSize: number;
	namespaceFilter: string[];
	initialized: boolean;
}

/** Default log file name */
const DEFAULT_LOG_FILE = 'blecsd-debug.log';

/** Default max file size (10MB) */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Log level names for output */
const LEVEL_NAMES: Record<LogLevelValue, string> = {
	[LogLevel.TRACE]: 'TRACE',
	[LogLevel.DEBUG]: 'DEBUG',
	[LogLevel.INFO]: 'INFO',
	[LogLevel.WARN]: 'WARN',
	[LogLevel.ERROR]: 'ERROR',
	[LogLevel.SILENT]: 'SILENT',
};

/**
 * Check if debug mode is enabled via environment variables
 */
function isDebugEnabled(): boolean {
	const debugEnv = process.env.DEBUG ?? '';
	const blecsdDebug = process.env.BLECSD_DEBUG ?? '';

	// Check for any blecsd-related debug flags
	if (blecsdDebug === '1' || blecsdDebug.toLowerCase() === 'true') {
		return true;
	}

	// Check DEBUG env for blecsd namespace
	const patterns = debugEnv.split(',').map((p) => p.trim());
	for (const pattern of patterns) {
		if (
			pattern === 'blecsd' ||
			pattern === 'blecsd:*' ||
			pattern === '*' ||
			pattern.startsWith('blecsd:')
		) {
			return true;
		}
	}

	return false;
}

/**
 * Parse namespace filter from DEBUG environment variable
 */
function parseNamespaceFilter(filter?: string): string[] {
	const debugEnv = filter ?? process.env.DEBUG ?? '';
	if (!debugEnv) {
		return ['*'];
	}

	return debugEnv
		.split(',')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}

/**
 * Check if a single filter matches a namespace
 */
function filterMatches(namespace: string, filter: string): boolean {
	if (filter === namespace || filter === '*') {
		return true;
	}
	if (filter.endsWith('*') && namespace.startsWith(filter.slice(0, -1))) {
		return true;
	}
	return false;
}

/**
 * Check if a negative filter excludes a namespace
 */
function isExcludedByFilter(namespace: string, filter: string): boolean {
	if (!filter.startsWith('-')) {
		return false;
	}
	const negated = filter.slice(1);
	return filterMatches(namespace, negated);
}

/**
 * Check if a namespace matches the filter
 */
function matchesFilter(namespace: string, filters: string[]): boolean {
	for (const filter of filters) {
		if (isExcludedByFilter(namespace, filter)) {
			return false;
		}
		if (filterMatches(namespace, filter)) {
			return true;
		}
	}
	return false;
}

/**
 * Global debug logger state
 */
const state: DebugLoggerState = {
	enabled: isDebugEnabled(),
	logFile: DEFAULT_LOG_FILE,
	level: LogLevel.DEBUG,
	timestamps: true,
	includeLevel: true,
	maxFileSize: DEFAULT_MAX_FILE_SIZE,
	namespaceFilter: parseNamespaceFilter(),
	initialized: false,
};

/**
 * Format a timestamp for log output
 */
function formatTimestamp(): string {
	const now = new Date();
	const iso = now.toISOString();
	return iso.replace('T', ' ').replace('Z', '');
}

/**
 * Format a value for logging
 */
function formatValue(value: unknown): string {
	if (value === undefined) {
		return 'undefined';
	}
	if (value === null) {
		return 'null';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (value instanceof Error) {
		return `${value.name}: ${value.message}\n${value.stack ?? ''}`;
	}

	return inspect(value, {
		depth: 4,
		colors: false,
		maxArrayLength: 100,
		maxStringLength: 1000,
	});
}

/**
 * Ensure log file directory exists
 */
function ensureLogDirectory(filePath: string): void {
	const dir = dirname(filePath);
	if (dir && dir !== '.' && !existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

/**
 * Rotate log file if it exceeds max size
 */
function rotateLogIfNeeded(filePath: string, maxSize: number): void {
	try {
		const stats = existsSync(filePath) ? statSync(filePath) : null;
		if (stats && stats.size > maxSize) {
			// Simple rotation: rename current to .old
			const oldPath = `${filePath}.old`;
			if (existsSync(oldPath)) {
				fsUnlinkSync(oldPath);
			}
			renameSync(filePath, oldPath);
		}
	} catch {
		// Ignore rotation errors
	}
}

/**
 * Write a log entry to file
 */
function writeLog(
	level: LogLevelValue,
	namespace: string,
	message: string,
	...args: unknown[]
): void {
	if (!state.enabled) {
		return;
	}

	if (level < state.level) {
		return;
	}

	if (!matchesFilter(namespace, state.namespaceFilter)) {
		return;
	}

	// Build log line
	const parts: string[] = [];

	if (state.timestamps) {
		parts.push(`[${formatTimestamp()}]`);
	}

	if (state.includeLevel) {
		parts.push(`[${LEVEL_NAMES[level]}]`);
	}

	parts.push(`[${namespace}]`);
	parts.push(message);

	// Add formatted args
	for (const arg of args) {
		parts.push(formatValue(arg));
	}

	const line = `${parts.join(' ')}\n`;

	// Write to file
	try {
		ensureLogDirectory(state.logFile);
		rotateLogIfNeeded(state.logFile, state.maxFileSize);
		appendFileSync(state.logFile, line, 'utf8');
	} catch {
		// Silently ignore write errors
	}
}

/**
 * Configure the debug logger.
 *
 * @param config - Logger configuration options
 *
 * @example
 * ```typescript
 * import { configureDebugLogger, LogLevel } from 'blecsd/terminal';
 *
 * configureDebugLogger({
 *   enabled: true,
 *   logFile: '/tmp/blecsd.log',
 *   level: LogLevel.TRACE,
 * });
 * ```
 */
export function configureDebugLogger(config: DebugLoggerConfig): void {
	if (config.enabled !== undefined) {
		state.enabled = config.enabled;
	}
	if (config.logFile !== undefined) {
		state.logFile = config.logFile;
	}
	if (config.level !== undefined) {
		state.level = config.level;
	}
	if (config.timestamps !== undefined) {
		state.timestamps = config.timestamps;
	}
	if (config.includeLevel !== undefined) {
		state.includeLevel = config.includeLevel;
	}
	if (config.maxFileSize !== undefined) {
		state.maxFileSize = config.maxFileSize;
	}
	if (config.namespaceFilter !== undefined) {
		state.namespaceFilter = parseNamespaceFilter(config.namespaceFilter);
	}

	state.initialized = true;
}

/**
 * Check if debug logging is enabled.
 *
 * @returns True if debug logging is enabled
 *
 * @example
 * ```typescript
 * import { isDebugLoggingEnabled } from 'blecsd/terminal';
 *
 * if (isDebugLoggingEnabled()) {
 *   // Expensive debug-only operation
 * }
 * ```
 */
export function isDebugLoggingEnabled(): boolean {
	return state.enabled;
}

/**
 * Get the current log file path.
 *
 * @returns The path to the log file
 */
export function getLogFile(): string {
	return state.logFile;
}

/**
 * Create a namespaced debug logger.
 *
 * This is the primary way to create debug loggers. Each logger
 * has a namespace that can be filtered via the DEBUG environment
 * variable.
 *
 * @param namespace - The namespace for this logger (e.g., 'blecsd:input')
 * @returns A debug logger function
 *
 * @example
 * ```typescript
 * import { createDebugLogger } from 'blecsd/terminal';
 *
 * const debug = createDebugLogger('blecsd:input');
 *
 * debug('Processing key event:', keyEvent);
 * debug.trace('Low-level trace info');
 * debug.warn('Potential issue:', warning);
 * debug.error('Error occurred:', error);
 * ```
 */
export function createDebugLogger(namespace: string): DebugLogger {
	const log = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.DEBUG, namespace, message, ...args);
	};

	log.trace = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.TRACE, namespace, message, ...args);
	};

	log.debug = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.DEBUG, namespace, message, ...args);
	};

	log.info = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.INFO, namespace, message, ...args);
	};

	log.warn = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.WARN, namespace, message, ...args);
	};

	log.error = (message: string, ...args: unknown[]) => {
		writeLog(LogLevel.ERROR, namespace, message, ...args);
	};

	log.namespace = namespace;

	return log;
}

/**
 * Debug logger interface with level methods
 */
export interface DebugLogger {
	(message: string, ...args: unknown[]): void;
	trace(message: string, ...args: unknown[]): void;
	debug(message: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, ...args: unknown[]): void;
	namespace: string;
}

/**
 * Terminal state for dumping
 */
export interface TerminalStateDump {
	/** Current timestamp */
	timestamp: string;
	/** Whether in alternate buffer mode */
	isAlternateBuffer?: boolean;
	/** Whether mouse tracking is enabled */
	isMouseEnabled?: boolean;
	/** Whether in raw mode */
	isRawMode?: boolean;
	/** Terminal size */
	terminalSize?: { rows: number; cols: number };
	/** Environment info */
	environment?: {
		TERM?: string;
		COLORTERM?: string;
		TERM_PROGRAM?: string;
	};
	/** Custom state data */
	custom?: Record<string, unknown>;
}

/**
 * Dump terminal state to log file for debugging.
 *
 * This is useful for diagnosing issues with terminal state.
 *
 * @param state - Terminal state to dump
 * @param label - Optional label for the dump
 *
 * @example
 * ```typescript
 * import { dumpTerminalState } from 'blecsd/terminal';
 *
 * dumpTerminalState({
 *   isAlternateBuffer: true,
 *   isMouseEnabled: true,
 *   terminalSize: { rows: 24, cols: 80 },
 * }, 'Before rendering');
 * ```
 */
export function dumpTerminalState(termState: Partial<TerminalStateDump>, label?: string): void {
	if (!state.enabled) {
		return;
	}

	const dump: TerminalStateDump = {
		timestamp: formatTimestamp(),
		...termState,
		environment: {
			TERM: process.env.TERM,
			COLORTERM: process.env.COLORTERM,
			TERM_PROGRAM: process.env.TERM_PROGRAM,
		},
	};

	const header = label ? `=== Terminal State Dump: ${label} ===` : '=== Terminal State Dump ===';
	const footer = '='.repeat(header.length);

	writeLog(LogLevel.DEBUG, 'blecsd:dump', header);
	writeLog(LogLevel.DEBUG, 'blecsd:dump', formatValue(dump));
	writeLog(LogLevel.DEBUG, 'blecsd:dump', footer);
}

/**
 * Write raw data to log file (useful for debugging escape sequences).
 *
 * @param data - Raw data to write
 * @param label - Optional label for the data
 *
 * @example
 * ```typescript
 * import { dumpRaw } from 'blecsd/terminal';
 *
 * dumpRaw('\x1b[?1049h', 'Alternate buffer on sequence');
 * ```
 */
export function dumpRaw(data: string | Buffer, label?: string): void {
	if (!state.enabled) {
		return;
	}

	const hexDump = Buffer.isBuffer(data)
		? (data
				.toString('hex')
				.match(/.{1,2}/g)
				?.join(' ') ?? '')
		: (Buffer.from(data, 'utf8')
				.toString('hex')
				.match(/.{1,2}/g)
				?.join(' ') ?? '');

	// Replace non-printable control characters (C0: 0x00-0x1F, DEL+C1: 0x7F-0x9F)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional for filtering control chars
	const controlCharRegex = /[\x00-\x1f\x7f-\x9f]/g;
	const printable = Buffer.isBuffer(data)
		? data.toString('utf8').replace(controlCharRegex, '.')
		: data.replace(controlCharRegex, '.');

	const header = label ? `Raw dump: ${label}` : 'Raw dump';

	writeLog(LogLevel.TRACE, 'blecsd:raw', header);
	writeLog(LogLevel.TRACE, 'blecsd:raw', `  Length: ${data.length}`);
	writeLog(LogLevel.TRACE, 'blecsd:raw', `  Hex: ${hexDump}`);
	writeLog(LogLevel.TRACE, 'blecsd:raw', `  Print: ${printable}`);
}

/**
 * Clear the log file.
 *
 * @example
 * ```typescript
 * import { clearLog } from 'blecsd/terminal';
 *
 * clearLog();
 * ```
 */
export function clearLog(): void {
	try {
		ensureLogDirectory(state.logFile);
		writeFileSync(state.logFile, '', 'utf8');
	} catch {
		// Silently ignore errors
	}
}

/**
 * Pre-configured debug loggers for common namespaces.
 */
export const debugLoggers = {
	/** Input system logger */
	input: createDebugLogger('blecsd:input'),
	/** Rendering system logger */
	render: createDebugLogger('blecsd:render'),
	/** Mouse events logger */
	mouse: createDebugLogger('blecsd:mouse'),
	/** Program lifecycle logger */
	program: createDebugLogger('blecsd:program'),
	/** Terminal detection logger */
	detect: createDebugLogger('blecsd:detect'),
	/** ECS system logger */
	ecs: createDebugLogger('blecsd:ecs'),
} as const;
