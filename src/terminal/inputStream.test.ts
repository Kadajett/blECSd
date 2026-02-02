import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInputHandler, InputHandler, InputHandlerConfigSchema } from './inputStream';

/**
 * Creates a mock readable stream for testing.
 */
function createMockStream(): NodeJS.ReadableStream & EventEmitter {
	return new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
}

describe('InputHandler', () => {
	let handler: InputHandler;
	let stream: EventEmitter;

	beforeEach(() => {
		stream = createMockStream();
		handler = new InputHandler(stream as NodeJS.ReadableStream);
	});

	afterEach(() => {
		if (handler.isRunning()) {
			handler.stop();
		}
	});

	describe('constructor', () => {
		it('creates handler with default config', () => {
			const h = new InputHandler(stream as NodeJS.ReadableStream);
			expect(h.isRunning()).toBe(false);
			expect(h.getBufferSize()).toBe(0);
		});

		it('creates handler with custom config', () => {
			const h = new InputHandler(stream as NodeJS.ReadableStream, {
				maxBufferSize: 8192,
				escapeTimeout: 50,
			});
			expect(h.isRunning()).toBe(false);
		});
	});

	describe('start()', () => {
		it('starts listening for input', () => {
			handler.start();
			expect(handler.isRunning()).toBe(true);
		});

		it('is idempotent', () => {
			handler.start();
			handler.start();
			expect(handler.isRunning()).toBe(true);
		});

		it('attaches data listener to stream', () => {
			const listenerCount = stream.listenerCount('data');
			handler.start();
			expect(stream.listenerCount('data')).toBe(listenerCount + 1);
		});
	});

	describe('stop()', () => {
		it('stops listening for input', () => {
			handler.start();
			handler.stop();
			expect(handler.isRunning()).toBe(false);
		});

		it('is idempotent', () => {
			handler.start();
			handler.stop();
			handler.stop();
			expect(handler.isRunning()).toBe(false);
		});

		it('removes data listener from stream', () => {
			handler.start();
			const listenerCount = stream.listenerCount('data');
			handler.stop();
			expect(stream.listenerCount('data')).toBe(listenerCount - 1);
		});

		it('clears buffer', () => {
			handler.start();
			stream.emit('data', Buffer.from('abc'));
			handler.stop();
			expect(handler.getBufferSize()).toBe(0);
		});
	});

	describe('onKey()', () => {
		it('registers key handler', () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			// Emit a simple key
			stream.emit('data', Buffer.from('a'));

			expect(keyHandler).toHaveBeenCalledTimes(1);
			expect(keyHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'a',
					ctrl: false,
					meta: false,
					shift: false,
				}),
			);
		});

		it('returns unsubscribe function', () => {
			const keyHandler = vi.fn();
			const unsubscribe = handler.onKey(keyHandler);
			handler.start();

			stream.emit('data', Buffer.from('a'));
			expect(keyHandler).toHaveBeenCalledTimes(1);

			unsubscribe();
			stream.emit('data', Buffer.from('b'));
			expect(keyHandler).toHaveBeenCalledTimes(1);
		});

		it('handles multiple key handlers', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			handler.onKey(handler1);
			handler.onKey(handler2);
			handler.start();

			stream.emit('data', Buffer.from('x'));

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledTimes(1);
		});

		it('parses control characters', () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			// Ctrl+C (0x03)
			stream.emit('data', Buffer.from([0x03]));

			expect(keyHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'c',
					ctrl: true,
				}),
			);
		});

		it('parses escape sequences', () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			// Up arrow: ESC [ A
			stream.emit('data', Buffer.from([0x1b, 0x5b, 0x41]));

			expect(keyHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'up',
				}),
			);
		});

		it('handles multiple keys in one buffer', () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			stream.emit('data', Buffer.from('abc'));

			expect(keyHandler).toHaveBeenCalledTimes(3);
		});
	});

	describe('onMouse()', () => {
		it('registers mouse handler', () => {
			const mouseHandler = vi.fn();
			handler.onMouse(mouseHandler);
			handler.start();

			// SGR mouse press: ESC [ < 0 ; 10 ; 20 M
			stream.emit('data', Buffer.from('\x1b[<0;10;20M'));

			expect(mouseHandler).toHaveBeenCalledTimes(1);
			expect(mouseHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					x: 9, // 0-indexed
					y: 19, // 0-indexed
					button: 'left',
					action: 'press',
				}),
			);
		});

		it('returns unsubscribe function', () => {
			const mouseHandler = vi.fn();
			const unsubscribe = handler.onMouse(mouseHandler);
			handler.start();

			stream.emit('data', Buffer.from('\x1b[<0;10;20M'));
			expect(mouseHandler).toHaveBeenCalledTimes(1);

			unsubscribe();
			stream.emit('data', Buffer.from('\x1b[<0;15;25M'));
			expect(mouseHandler).toHaveBeenCalledTimes(1);
		});

		it('handles mouse release', () => {
			const mouseHandler = vi.fn();
			handler.onMouse(mouseHandler);
			handler.start();

			// SGR mouse release: ESC [ < 0 ; 10 ; 20 m (lowercase m)
			stream.emit('data', Buffer.from('\x1b[<0;10;20m'));

			expect(mouseHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					action: 'release',
				}),
			);
		});
	});

	describe('onFocus()', () => {
		it('registers focus handler', () => {
			const focusHandler = vi.fn();
			handler.onFocus(focusHandler);
			handler.start();

			// Focus in: ESC [ I
			stream.emit('data', Buffer.from('\x1b[I'));

			expect(focusHandler).toHaveBeenCalledTimes(1);
			expect(focusHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					focused: true,
				}),
			);
		});

		it('handles focus out', () => {
			const focusHandler = vi.fn();
			handler.onFocus(focusHandler);
			handler.start();

			// Focus out: ESC [ O
			stream.emit('data', Buffer.from('\x1b[O'));

			expect(focusHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					focused: false,
				}),
			);
		});

		it('returns unsubscribe function', () => {
			const focusHandler = vi.fn();
			const unsubscribe = handler.onFocus(focusHandler);
			handler.start();

			stream.emit('data', Buffer.from('\x1b[I'));
			expect(focusHandler).toHaveBeenCalledTimes(1);

			unsubscribe();
			stream.emit('data', Buffer.from('\x1b[O'));
			expect(focusHandler).toHaveBeenCalledTimes(1);
		});
	});

	describe('buffering', () => {
		it('buffers incomplete escape sequences', async () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			// Send incomplete escape sequence
			stream.emit('data', Buffer.from([0x1b]));

			// Should not fire immediately
			expect(keyHandler).not.toHaveBeenCalled();

			// Wait for timeout
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should have processed as escape key
			expect(keyHandler).toHaveBeenCalled();
		});

		it('handles split escape sequences', () => {
			const keyHandler = vi.fn();
			handler.onKey(keyHandler);
			handler.start();

			// Send complete escape sequence in parts that form a complete sequence
			stream.emit('data', Buffer.from([0x1b, 0x5b, 0x41])); // ESC [ A (up arrow)

			expect(keyHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'up',
				}),
			);
		});

		it('flushes buffer when max size reached', () => {
			const h = new InputHandler(stream as NodeJS.ReadableStream, {
				maxBufferSize: 10,
			});
			const keyHandler = vi.fn();
			h.onKey(keyHandler);
			h.start();

			// Send more than max buffer size
			stream.emit('data', Buffer.from('abcdefghijklmnop'));

			expect(keyHandler.mock.calls.length).toBeGreaterThan(0);
			h.stop();
		});
	});

	describe('error handling', () => {
		it('continues processing after handler error', () => {
			const errorHandler = vi.fn(() => {
				throw new Error('Handler error');
			});
			const goodHandler = vi.fn();

			handler.onKey(errorHandler);
			handler.onKey(goodHandler);
			handler.start();

			// Should not throw
			expect(() => stream.emit('data', Buffer.from('a'))).not.toThrow();
			expect(goodHandler).toHaveBeenCalled();
		});
	});
});

describe('createInputHandler()', () => {
	it('creates a new InputHandler instance', () => {
		const stream = createMockStream();
		const handler = createInputHandler(stream as NodeJS.ReadableStream);
		expect(handler).toBeInstanceOf(InputHandler);
	});

	it('passes config to handler', () => {
		const stream = createMockStream();
		const handler = createInputHandler(stream as NodeJS.ReadableStream, {
			escapeTimeout: 50,
		});
		expect(handler).toBeInstanceOf(InputHandler);
	});
});

describe('InputHandlerConfigSchema', () => {
	it('validates valid config', () => {
		const result = InputHandlerConfigSchema.safeParse({
			maxBufferSize: 8192,
			escapeTimeout: 50,
		});
		expect(result.success).toBe(true);
	});

	it('validates empty config', () => {
		const result = InputHandlerConfigSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('rejects negative values', () => {
		const result = InputHandlerConfigSchema.safeParse({
			maxBufferSize: -1,
		});
		expect(result.success).toBe(false);
	});

	it('rejects zero values', () => {
		const result = InputHandlerConfigSchema.safeParse({
			escapeTimeout: 0,
		});
		expect(result.success).toBe(false);
	});
});
