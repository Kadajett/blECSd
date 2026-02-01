/**
 * Tests for debug logging system
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	clearLog,
	configureDebugLogger,
	createDebugLogger,
	type DebugLogger,
	type DebugLoggerConfig,
	debugLoggers,
	dumpRaw,
	dumpTerminalState,
	getLogFile,
	isDebugLoggingEnabled,
	LogLevel,
	type TerminalStateDump,
} from './debug';

// Generate unique temp file for each test to avoid conflicts
function getTempLogFile(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return join(tmpdir(), `blecsd-test-${timestamp}-${random}.log`);
}

describe('LogLevel', () => {
	it('defines all log levels', () => {
		expect(LogLevel.TRACE).toBe(0);
		expect(LogLevel.DEBUG).toBe(1);
		expect(LogLevel.INFO).toBe(2);
		expect(LogLevel.WARN).toBe(3);
		expect(LogLevel.ERROR).toBe(4);
		expect(LogLevel.SILENT).toBe(5);
	});

	it('levels are ordered correctly', () => {
		expect(LogLevel.TRACE).toBeLessThan(LogLevel.DEBUG);
		expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
		expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
		expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
		expect(LogLevel.ERROR).toBeLessThan(LogLevel.SILENT);
	});
});

describe('configureDebugLogger', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
	});

	afterEach(() => {
		// Clean up temp file
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('configures log file path', () => {
		configureDebugLogger({
			logFile: tempFile,
		});
		expect(getLogFile()).toBe(tempFile);
	});

	it('enables logging', () => {
		configureDebugLogger({
			enabled: true,
		});
		expect(isDebugLoggingEnabled()).toBe(true);
	});

	it('disables logging', () => {
		configureDebugLogger({
			enabled: false,
		});
		expect(isDebugLoggingEnabled()).toBe(false);
	});

	it('accepts all configuration options', () => {
		const config: DebugLoggerConfig = {
			enabled: true,
			logFile: tempFile,
			level: LogLevel.TRACE,
			timestamps: false,
			includeLevel: false,
			maxFileSize: 1024 * 1024,
			namespaceFilter: 'blecsd:*',
		};

		// Should not throw
		configureDebugLogger(config);
		expect(getLogFile()).toBe(tempFile);
	});
});

describe('createDebugLogger', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.TRACE,
			timestamps: true,
			includeLevel: true,
			namespaceFilter: '*',
		});
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('creates a namespaced logger', () => {
		const debug = createDebugLogger('test:namespace');
		expect(debug.namespace).toBe('test:namespace');
	});

	it('logger is callable', () => {
		const debug = createDebugLogger('test:callable');
		// Should not throw
		debug('test message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[test:callable]');
		expect(content).toContain('test message');
	});

	it('has trace method', () => {
		const debug = createDebugLogger('test:trace');
		debug.trace('trace message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[TRACE]');
		expect(content).toContain('trace message');
	});

	it('has debug method', () => {
		const debug = createDebugLogger('test:debug');
		debug.debug('debug message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[DEBUG]');
		expect(content).toContain('debug message');
	});

	it('has info method', () => {
		const debug = createDebugLogger('test:info');
		debug.info('info message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[INFO]');
		expect(content).toContain('info message');
	});

	it('has warn method', () => {
		const debug = createDebugLogger('test:warn');
		debug.warn('warn message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[WARN]');
		expect(content).toContain('warn message');
	});

	it('has error method', () => {
		const debug = createDebugLogger('test:error');
		debug.error('error message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('[ERROR]');
		expect(content).toContain('error message');
	});

	it('formats objects in logs', () => {
		const debug = createDebugLogger('test:object');
		debug('object test:', { foo: 'bar', num: 42 });

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('foo');
		expect(content).toContain('bar');
	});

	it('formats errors in logs', () => {
		const debug = createDebugLogger('test:error-format');
		const err = new Error('Test error message');
		debug.error('caught error:', err);

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Test error message');
		expect(content).toContain('Error:');
	});
});

describe('log level filtering', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('filters out messages below configured level', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.WARN,
			namespaceFilter: '*',
		});

		const debug = createDebugLogger('test:filter');
		debug.trace('trace - should not appear');
		debug.debug('debug - should not appear');
		debug.info('info - should not appear');
		debug.warn('warn - should appear');
		debug.error('error - should appear');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).not.toContain('trace - should not appear');
		expect(content).not.toContain('debug - should not appear');
		expect(content).not.toContain('info - should not appear');
		expect(content).toContain('warn - should appear');
		expect(content).toContain('error - should appear');
	});

	it('SILENT level suppresses all output', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.SILENT,
			namespaceFilter: '*',
		});

		const debug = createDebugLogger('test:silent');
		debug.error('should not appear');

		// File might not exist or be empty
		const exists = existsSync(tempFile);
		if (exists) {
			const content = readFileSync(tempFile, 'utf8');
			expect(content).not.toContain('should not appear');
		}
	});
});

describe('namespace filtering', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('filters by exact namespace', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			namespaceFilter: 'blecsd:input',
		});

		const inputLogger = createDebugLogger('blecsd:input');
		const renderLogger = createDebugLogger('blecsd:render');

		inputLogger('input message');
		renderLogger('render message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('input message');
		expect(content).not.toContain('render message');
	});

	it('filters by wildcard', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			namespaceFilter: 'blecsd:*',
		});

		const blecsdLogger = createDebugLogger('blecsd:test');
		const otherLogger = createDebugLogger('other:test');

		blecsdLogger('blecsd message');
		otherLogger('other message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('blecsd message');
		expect(content).not.toContain('other message');
	});

	it('accepts multiple namespaces', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			namespaceFilter: 'blecsd:input,blecsd:render',
		});

		const inputLogger = createDebugLogger('blecsd:input');
		const renderLogger = createDebugLogger('blecsd:render');
		const mouseLogger = createDebugLogger('blecsd:mouse');

		inputLogger('input message');
		renderLogger('render message');
		mouseLogger('mouse message');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('input message');
		expect(content).toContain('render message');
		expect(content).not.toContain('mouse message');
	});
});

describe('timestamps', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('includes timestamps by default', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			timestamps: true,
			namespaceFilter: '*',
		});

		const debug = createDebugLogger('test:ts');
		debug('message with timestamp');

		const content = readFileSync(tempFile, 'utf8');
		// Timestamp format: [YYYY-MM-DD HH:MM:SS.mmm]
		expect(content).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/);
	});

	it('can disable timestamps', () => {
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			timestamps: false,
			namespaceFilter: '*',
		});

		const debug = createDebugLogger('test:nots');
		debug('message without timestamp');

		const content = readFileSync(tempFile, 'utf8');
		// Should not have timestamp format
		expect(content).not.toMatch(/\[\d{4}-\d{2}-\d{2}/);
	});
});

describe('dumpTerminalState', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			namespaceFilter: '*',
		});
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('dumps terminal state to log', () => {
		dumpTerminalState({
			isAlternateBuffer: true,
			isMouseEnabled: true,
			terminalSize: { rows: 24, cols: 80 },
		});

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Terminal State Dump');
		expect(content).toContain('isAlternateBuffer');
		expect(content).toContain('isMouseEnabled');
	});

	it('includes custom label', () => {
		dumpTerminalState({}, 'Test Label');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Test Label');
	});

	it('includes environment info', () => {
		dumpTerminalState({});

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('environment');
	});

	it('includes custom state', () => {
		dumpTerminalState({
			custom: { myState: 'value' },
		});

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('myState');
		expect(content).toContain('value');
	});
});

describe('dumpRaw', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.TRACE,
			namespaceFilter: '*',
		});
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('dumps raw string data', () => {
		dumpRaw('\x1b[?1049h', 'Alternate buffer on');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Alternate buffer on');
		expect(content).toContain('Hex:');
		expect(content).toContain('1b'); // ESC in hex
	});

	it('dumps raw buffer data', () => {
		const buffer = Buffer.from([0x1b, 0x5b, 0x48]); // ESC [ H
		dumpRaw(buffer, 'Cursor home');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Cursor home');
		expect(content).toContain('1b 5b 48');
	});

	it('shows printable representation', () => {
		dumpRaw('Hello');

		const content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('Print: Hello');
	});
});

describe('clearLog', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
		configureDebugLogger({
			enabled: true,
			logFile: tempFile,
			level: LogLevel.DEBUG,
			namespaceFilter: '*',
		});
	});

	afterEach(() => {
		configureDebugLogger({ enabled: false });
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('clears the log file', () => {
		const debug = createDebugLogger('test:clear');
		debug('message before clear');

		let content = readFileSync(tempFile, 'utf8');
		expect(content).toContain('message before clear');

		clearLog();

		content = readFileSync(tempFile, 'utf8');
		expect(content).toBe('');
	});
});

describe('debugLoggers', () => {
	it('has pre-configured loggers', () => {
		expect(debugLoggers.input).toBeDefined();
		expect(debugLoggers.render).toBeDefined();
		expect(debugLoggers.mouse).toBeDefined();
		expect(debugLoggers.program).toBeDefined();
		expect(debugLoggers.detect).toBeDefined();
		expect(debugLoggers.ecs).toBeDefined();
	});

	it('loggers have correct namespaces', () => {
		expect(debugLoggers.input.namespace).toBe('blecsd:input');
		expect(debugLoggers.render.namespace).toBe('blecsd:render');
		expect(debugLoggers.mouse.namespace).toBe('blecsd:mouse');
		expect(debugLoggers.program.namespace).toBe('blecsd:program');
		expect(debugLoggers.detect.namespace).toBe('blecsd:detect');
		expect(debugLoggers.ecs.namespace).toBe('blecsd:ecs');
	});
});

describe('disabled logging', () => {
	let tempFile: string;

	beforeEach(() => {
		tempFile = getTempLogFile();
		configureDebugLogger({
			enabled: false,
			logFile: tempFile,
		});
	});

	afterEach(() => {
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore
		}
	});

	it('does not create log file when disabled', () => {
		const debug = createDebugLogger('test:disabled');
		debug('should not be logged');

		expect(existsSync(tempFile)).toBe(false);
	});

	it('dumpTerminalState does nothing when disabled', () => {
		dumpTerminalState({ isAlternateBuffer: true });
		expect(existsSync(tempFile)).toBe(false);
	});

	it('dumpRaw does nothing when disabled', () => {
		dumpRaw('test data');
		expect(existsSync(tempFile)).toBe(false);
	});
});

describe('DebugLogger interface', () => {
	it('has expected properties', () => {
		const logger: DebugLogger = createDebugLogger('test:interface');

		// Is callable
		expect(typeof logger).toBe('function');

		// Has level methods
		expect(typeof logger.trace).toBe('function');
		expect(typeof logger.debug).toBe('function');
		expect(typeof logger.info).toBe('function');
		expect(typeof logger.warn).toBe('function');
		expect(typeof logger.error).toBe('function');

		// Has namespace
		expect(typeof logger.namespace).toBe('string');
	});
});

describe('TerminalStateDump interface', () => {
	it('has expected properties', () => {
		const dump: TerminalStateDump = {
			timestamp: '2024-01-01 12:00:00.000',
			isAlternateBuffer: true,
			isMouseEnabled: true,
			isRawMode: true,
			terminalSize: { rows: 24, cols: 80 },
			environment: {
				TERM: 'xterm-256color',
				COLORTERM: 'truecolor',
				TERM_PROGRAM: 'iTerm.app',
			},
			custom: { key: 'value' },
		};

		expect(dump.timestamp).toBe('2024-01-01 12:00:00.000');
		expect(dump.isAlternateBuffer).toBe(true);
		expect(dump.terminalSize?.rows).toBe(24);
	});
});

describe('DebugLoggerConfig interface', () => {
	it('has expected properties', () => {
		const config: DebugLoggerConfig = {
			enabled: true,
			logFile: '/tmp/test.log',
			level: LogLevel.DEBUG,
			timestamps: true,
			includeLevel: true,
			maxFileSize: 1024 * 1024,
			namespaceFilter: 'blecsd:*',
		};

		expect(config.enabled).toBe(true);
		expect(config.level).toBe(LogLevel.DEBUG);
	});
});
