/**
 * Input stream handler for keyboard and mouse events.
 * Wraps a NodeJS readable stream and emits typed events.
 * @module terminal/inputStream
 */

import { z } from 'zod';
import type { KeyEvent } from './keyParser';
import { isMouseSequence, parseKeyBuffer, parseKeySequence } from './keyParser';
import type { FocusEvent, MouseEvent, ParseMouseResult } from './mouseParser';
import { parseMouseSequence } from './mouseParser';

/**
 * Handler for keyboard events.
 */
export type KeyHandler = (event: KeyEvent) => void;

/**
 * Handler for mouse events.
 */
export type MouseHandler = (event: MouseEvent) => void;

/**
 * Handler for focus events.
 */
export type FocusHandler = (event: FocusEvent) => void;

/**
 * Unsubscribe function returned by event handlers.
 */
export type Unsubscribe = () => void;

/**
 * Configuration for the input handler.
 */
export interface InputHandlerConfig {
	/** Maximum buffer size in bytes before forcing a flush (default: 4096) */
	maxBufferSize?: number;
	/** Timeout in ms to wait for escape sequences to complete (default: 100) */
	escapeTimeout?: number;
}

/**
 * Zod schema for InputHandlerConfig validation.
 *
 * @example
 * ```typescript
 * import { InputHandlerConfigSchema } from 'blecsd';
 *
 * const result = InputHandlerConfigSchema.safeParse({ maxBufferSize: 8192 });
 * if (result.success) {
 *   console.log('Valid config');
 * }
 * ```
 */
export const InputHandlerConfigSchema = z.object({
	maxBufferSize: z.number().int().positive().optional(),
	escapeTimeout: z.number().int().positive().optional(),
});

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<InputHandlerConfig> = {
	maxBufferSize: 4096,
	escapeTimeout: 100,
};

/**
 * InputHandler interface for type-safe access.
 */
export interface InputHandler {
	start(): void;
	stop(): void;
	onKey(handler: KeyHandler): Unsubscribe;
	onMouse(handler: MouseHandler): Unsubscribe;
	onFocus(handler: FocusHandler): Unsubscribe;
	isRunning(): boolean;
	getBufferSize(): number;
}

// =============================================================================
// Private helpers for escape sequence detection
// =============================================================================

function isLetterByte(byte: number): boolean {
	return (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a);
}

function isDigitByte(byte: number): boolean {
	return byte >= 0x30 && byte <= 0x39;
}

function hasMouseTerminator(buffer: Uint8Array, start: number): boolean {
	for (let i = start; i < buffer.length; i++) {
		const byte = buffer[i] ?? 0;
		if (byte === 0x4d || byte === 0x6d) {
			return true;
		}
	}
	return false;
}

function hasNumericTerminator(buffer: Uint8Array, start: number): boolean {
	for (let i = start; i < buffer.length; i++) {
		const byte = buffer[i] ?? 0;
		if (byte === 0x7e || isLetterByte(byte)) {
			return true;
		}
	}
	return false;
}

function isIncompleteCsiSequence(buffer: Uint8Array): boolean {
	const thirdByte = buffer[2] ?? 0;
	if (isLetterByte(thirdByte)) {
		return false;
	}
	if (thirdByte === 0x3c) {
		return !hasMouseTerminator(buffer, 3);
	}
	if (isDigitByte(thirdByte)) {
		return !hasNumericTerminator(buffer, 3);
	}
	return false;
}

function mightBeIncompleteEscape(buffer: Uint8Array): boolean {
	if (buffer.length === 0) return false;
	const lastByte = buffer[buffer.length - 1];
	if (lastByte === 0x1b) return true;
	if (buffer[0] !== 0x1b) return false;
	if (buffer.length === 1) return true;
	if (buffer.length === 2 && buffer[1] === 0x5b) return true;
	if (buffer.length >= 3 && buffer[1] === 0x5b) {
		return isIncompleteCsiSequence(buffer);
	}
	return false;
}

function estimateMouseSequenceLength(buffer: Uint8Array, result: ParseMouseResult): number {
	if (!result) return 0;

	const s = new TextDecoder().decode(buffer);

	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC required for terminal parsing
	const sgrMatch = /^\x1b\[<\d+;\d+;\d+[mM]/.exec(s);
	if (sgrMatch) return sgrMatch[0].length;

	if (buffer.length >= 6 && buffer[0] === 0x1b && buffer[1] === 0x5b && buffer[2] === 0x4d) {
		return 6;
	}

	if (buffer.length >= 3 && buffer[0] === 0x1b && buffer[1] === 0x5b) {
		if (buffer[2] === 0x49 || buffer[2] === 0x4f) {
			return 3;
		}
	}

	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC required for terminal parsing
	const urxvtMatch = /^\x1b\[\d+;\d+;\d+M/.exec(s);
	if (urxvtMatch) return urxvtMatch[0].length;

	return result.event.raw.length;
}

/**
 * Creates a new input handler instance.
 *
 * Processes raw terminal input and emits typed keyboard and mouse events.
 *
 * @param stream - The readable stream to process (typically process.stdin)
 * @param config - Optional configuration
 * @returns A new InputHandler instance
 *
 * @example
 * ```typescript
 * import { createInputHandler } from 'blecsd';
 *
 * const handler = createInputHandler(process.stdin);
 *
 * handler.onKey((event) => {
 *   console.log(`Key: ${event.name}, ctrl: ${event.ctrl}`);
 *   if (event.name === 'q' && event.ctrl) {
 *     handler.stop();
 *   }
 * });
 *
 * handler.onMouse((event) => {
 *   console.log(`Mouse: ${event.action} at ${event.x}, ${event.y}`);
 * });
 *
 * handler.start();
 * ```
 */
export function createInputHandler(
	stream: NodeJS.ReadableStream,
	config: InputHandlerConfig = {},
): InputHandler {
	const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
	let buffer: Uint8Array = new Uint8Array(0);
	const keyHandlers = new Set<KeyHandler>();
	const mouseHandlers = new Set<MouseHandler>();
	const focusHandlers = new Set<FocusHandler>();
	let escapeTimer: ReturnType<typeof setTimeout> | null = null;
	let running = false;
	let dataHandler: ((chunk: Buffer) => void) | null = null;

	function emitKeyEvent(event: KeyEvent): void {
		for (const handler of keyHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	function emitMouseEvent(event: MouseEvent): void {
		for (const handler of mouseHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	function emitFocusEvent(event: FocusEvent): void {
		for (const handler of focusHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	function tryParseMouse(buf: Uint8Array): { consumed: number } | null {
		const result = parseMouseSequence(buf);
		if (!result) return null;

		const consumed = estimateMouseSequenceLength(buf, result);

		if (result.type === 'mouse') {
			emitMouseEvent(result.event);
		} else if (result.type === 'focus') {
			emitFocusEvent(result.event);
		}

		return { consumed };
	}

	function tryParseKey(buf: Uint8Array): { consumed: number } | null {
		if (isMouseSequence(buf)) return null;

		const singleEvent = parseKeySequence(buf);
		if (singleEvent) {
			emitKeyEvent(singleEvent);
			return { consumed: singleEvent.raw.length };
		}

		const events = parseKeyBuffer(buf);
		if (events.length > 0) {
			for (const event of events) {
				emitKeyEvent(event);
			}
			let consumed = 0;
			for (const event of events) {
				consumed += event.raw.length;
			}
			return { consumed: Math.max(consumed, 1) };
		}

		if (buf.length > 0) {
			return { consumed: 1 };
		}

		return null;
	}

	function processBuffer(buf: Uint8Array): void {
		let offset = 0;

		while (offset < buf.length) {
			const remaining = buf.slice(offset);

			if (remaining[0] === 0x1b && remaining.length >= 3) {
				const mouseResult = tryParseMouse(remaining);
				if (mouseResult) {
					offset += mouseResult.consumed;
					continue;
				}
			}

			const keyResult = tryParseKey(remaining);
			if (keyResult) {
				offset += keyResult.consumed;
				continue;
			}

			offset++;
		}
	}

	function flushBuffer(): void {
		if (buffer.length === 0) return;

		const current = buffer;
		buffer = new Uint8Array(0);
		processBuffer(current);
	}

	function handleData(chunk: Buffer): void {
		const newBuffer = new Uint8Array(buffer.length + chunk.length);
		newBuffer.set(buffer);
		newBuffer.set(new Uint8Array(chunk), buffer.length);
		buffer = newBuffer;

		if (buffer.length >= resolvedConfig.maxBufferSize) {
			flushBuffer();
			return;
		}

		if (escapeTimer) {
			clearTimeout(escapeTimer);
			escapeTimer = null;
		}

		if (mightBeIncompleteEscape(buffer)) {
			escapeTimer = setTimeout(() => {
				escapeTimer = null;
				flushBuffer();
			}, resolvedConfig.escapeTimeout);
			return;
		}

		flushBuffer();
	}

	return {
		start(): void {
			if (running) return;
			running = true;
			dataHandler = (chunk: Buffer) => handleData(chunk);
			stream.on('data', dataHandler);
		},
		stop(): void {
			if (!running) return;
			running = false;
			if (dataHandler) {
				stream.removeListener('data', dataHandler);
				dataHandler = null;
			}
			if (escapeTimer) {
				clearTimeout(escapeTimer);
				escapeTimer = null;
			}
			flushBuffer();
			buffer = new Uint8Array(0);
		},
		onKey(handler: KeyHandler): Unsubscribe {
			keyHandlers.add(handler);
			return () => {
				keyHandlers.delete(handler);
			};
		},
		onMouse(handler: MouseHandler): Unsubscribe {
			mouseHandlers.add(handler);
			return () => {
				mouseHandlers.delete(handler);
			};
		},
		onFocus(handler: FocusHandler): Unsubscribe {
			focusHandlers.add(handler);
			return () => {
				focusHandlers.delete(handler);
			};
		},
		isRunning(): boolean {
			return running;
		},
		getBufferSize(): number {
			return buffer.length;
		},
	};
}
