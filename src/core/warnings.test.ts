/**
 * Tests for warning system.
 */

import { describe, expect, it, vi } from 'vitest';
import {
	createWarningEmitter,
	emitDeprecatedAPIWarning,
	emitPerformanceWarning,
	emitTerminalTooSmallWarning,
	emitUnsupportedCapabilityWarning,
	type WarningEvent,
	WarningType,
} from './warnings';

describe('Warning System', () => {
	describe('createWarningEmitter', () => {
		it('should create a warning emitter', () => {
			const emitter = createWarningEmitter();

			expect(emitter).toBeDefined();
			expect(emitter.on).toBeInstanceOf(Function);
			expect(emitter.emit).toBeInstanceOf(Function);
		});

		it('should allow subscribing to warnings', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();

			emitter.on('warning', handler);
			emitter.emit('warning', {
				type: WarningType.TERMINAL_TOO_SMALL,
				message: 'Test',
				metadata: { width: 10, height: 10, minWidth: 80, minHeight: 24 },
				timestamp: Date.now(),
			});

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('should return unsubscribe function', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();

			const unsubscribe = emitter.on('warning', handler);

			unsubscribe();
			emitter.emit('warning', {
				type: WarningType.TERMINAL_TOO_SMALL,
				message: 'Test',
				metadata: { width: 10, height: 10, minWidth: 80, minHeight: 24 },
				timestamp: Date.now(),
			});

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('emitTerminalTooSmallWarning', () => {
		it('should emit terminal too small warning', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			expect(handler).toHaveBeenCalledTimes(1);
			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.type).toBe(WarningType.TERMINAL_TOO_SMALL);
			expect(event.message).toContain('40x15');
			expect(event.message).toContain('80x24');
		});

		it('should include correct metadata', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				width: 40,
				height: 15,
				minWidth: 80,
				minHeight: 24,
			});
		});

		it('should include timestamp', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			const before = Date.now();
			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);
			const after = Date.now();

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.timestamp).toBeGreaterThanOrEqual(before);
			expect(event.timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe('emitUnsupportedCapabilityWarning', () => {
		it('should emit unsupported capability warning', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitUnsupportedCapabilityWarning(emitter, 'truecolor');

			expect(handler).toHaveBeenCalledTimes(1);
			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.type).toBe(WarningType.UNSUPPORTED_CAPABILITY);
			expect(event.message).toContain('truecolor');
		});

		it('should include fallback in message when provided', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitUnsupportedCapabilityWarning(emitter, 'truecolor', 'Using 256-color mode');

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.message).toContain('Using 256-color mode');
		});

		it('should include correct metadata', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitUnsupportedCapabilityWarning(emitter, 'truecolor', 'Fallback mode');

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				capability: 'truecolor',
				fallback: 'Fallback mode',
			});
		});

		it('should work without fallback', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitUnsupportedCapabilityWarning(emitter, 'mouse');

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				capability: 'mouse',
			});
		});
	});

	describe('emitDeprecatedAPIWarning', () => {
		it('should emit deprecated API warning', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitDeprecatedAPIWarning(emitter, 'oldFunction()', 'newFunction()', 'v2.0.0');

			expect(handler).toHaveBeenCalledTimes(1);
			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.type).toBe(WarningType.DEPRECATED_API);
			expect(event.message).toContain('oldFunction()');
			expect(event.message).toContain('newFunction()');
			expect(event.message).toContain('v2.0.0');
		});

		it('should include correct metadata', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitDeprecatedAPIWarning(emitter, 'oldAPI', 'newAPI', 'v1.5.0');

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				api: 'oldAPI',
				replacement: 'newAPI',
				since: 'v1.5.0',
			});
		});
	});

	describe('emitPerformanceWarning', () => {
		it('should emit performance warning', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitPerformanceWarning(emitter, 'frame-time', 35, 16.67);

			expect(handler).toHaveBeenCalledTimes(1);
			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.type).toBe(WarningType.PERFORMANCE_ISSUE);
			expect(event.message).toContain('frame-time');
			expect(event.message).toContain('35');
			expect(event.message).toContain('16.67');
		});

		it('should include correct metadata', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitPerformanceWarning(emitter, 'frame-time', 35, 16.67);

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				metric: 'frame-time',
				value: 35,
				threshold: 16.67,
			});
		});

		it('should include optional frameTime', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitPerformanceWarning(emitter, 'frame-time', 35, 16.67, 35);

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event.metadata).toEqual({
				metric: 'frame-time',
				value: 35,
				threshold: 16.67,
				frameTime: 35,
			});
		});
	});

	describe('Multiple Listeners', () => {
		it('should notify all listeners', () => {
			const emitter = createWarningEmitter();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			emitter.on('warning', handler1);
			emitter.on('warning', handler2);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('should allow filtering by warning type', () => {
			const emitter = createWarningEmitter();
			const terminalWarnings: WarningEvent[] = [];
			const performanceWarnings: WarningEvent[] = [];

			emitter.on('warning', (event) => {
				if (event.type === WarningType.TERMINAL_TOO_SMALL) {
					terminalWarnings.push(event);
				} else if (event.type === WarningType.PERFORMANCE_ISSUE) {
					performanceWarnings.push(event);
				}
			});

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);
			emitPerformanceWarning(emitter, 'frame-time', 35, 16.67);
			emitTerminalTooSmallWarning(emitter, 30, 10, 80, 24);

			expect(terminalWarnings).toHaveLength(2);
			expect(performanceWarnings).toHaveLength(1);
		});
	});

	describe('Logging Integration', () => {
		it('should integrate with console.warn', () => {
			const emitter = createWarningEmitter();
			const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			emitter.on('warning', (event) => {
				console.warn(`[${event.type}] ${event.message}`);
			});

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('[terminal-too-small]'));
			expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('40x15'));

			consoleWarn.mockRestore();
		});

		it('should allow custom formatting', () => {
			const emitter = createWarningEmitter();
			const logs: string[] = [];

			emitter.on('warning', (event) => {
				logs.push(`Warning at ${event.timestamp}: ${event.message}`);
			});

			emitDeprecatedAPIWarning(emitter, 'oldAPI', 'newAPI', 'v1.0.0');

			expect(logs).toHaveLength(1);
			expect(logs[0]).toMatch(/^Warning at \d+: API 'oldAPI'/);
		});
	});

	describe('Once Listener', () => {
		it('should support once listeners', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();

			emitter.once('warning', handler);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);
			emitTerminalTooSmallWarning(emitter, 30, 10, 80, 24);

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('Event Validation', () => {
		it('should validate warning event structure', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			expect(event).toHaveProperty('type');
			expect(event).toHaveProperty('message');
			expect(event).toHaveProperty('metadata');
			expect(event).toHaveProperty('timestamp');
		});

		it('should validate terminal too small metadata structure', () => {
			const emitter = createWarningEmitter();
			const handler = vi.fn();
			emitter.on('warning', handler);

			emitTerminalTooSmallWarning(emitter, 40, 15, 80, 24);

			const event = handler.mock.calls[0]?.[0] as WarningEvent;
			const metadata = event.metadata as {
				width: number;
				height: number;
				minWidth: number;
				minHeight: number;
			};
			expect(metadata).toHaveProperty('width');
			expect(metadata).toHaveProperty('height');
			expect(metadata).toHaveProperty('minWidth');
			expect(metadata).toHaveProperty('minHeight');
		});
	});
});
