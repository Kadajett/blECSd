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
 * Input stream handler that processes raw terminal input
 * and emits typed keyboard and mouse events.
 *
 * Handles:
 * - Buffering incomplete escape sequences
 * - Detecting and routing key vs mouse sequences
 * - UTF-8 decoding
 * - Multiple keypresses in a single read
 *
 * @example
 * ```typescript
 * import { InputHandler } from 'blecsd';
 *
 * const handler = new InputHandler(process.stdin);
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
export class InputHandler {
	private stream: NodeJS.ReadableStream;
	private config: Required<InputHandlerConfig>;
	private buffer: Uint8Array = new Uint8Array(0);
	private keyHandlers = new Set<KeyHandler>();
	private mouseHandlers = new Set<MouseHandler>();
	private focusHandlers = new Set<FocusHandler>();
	private escapeTimer: ReturnType<typeof setTimeout> | null = null;
	private running = false;
	private dataHandler: ((chunk: Buffer) => void) | null = null;

	/**
	 * Creates a new input handler.
	 *
	 * @param stream - The readable stream to process (typically process.stdin)
	 * @param config - Optional configuration
	 *
	 * @example
	 * ```typescript
	 * import { InputHandler } from 'blecsd';
	 *
	 * const handler = new InputHandler(process.stdin, {
	 *   maxBufferSize: 8192,
	 *   escapeTimeout: 50,
	 * });
	 * ```
	 */
	constructor(stream: NodeJS.ReadableStream, config: InputHandlerConfig = {}) {
		this.stream = stream;
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Starts listening for input events.
	 * The stream should be in raw mode for proper input handling.
	 *
	 * @example
	 * ```typescript
	 * if (process.stdin.isTTY) {
	 *   process.stdin.setRawMode(true);
	 * }
	 * handler.start();
	 * ```
	 */
	start(): void {
		if (this.running) return;

		this.running = true;
		this.dataHandler = (chunk: Buffer) => this.handleData(chunk);
		this.stream.on('data', this.dataHandler);
	}

	/**
	 * Stops listening for input events.
	 * Clears any pending buffers and timers.
	 *
	 * @example
	 * ```typescript
	 * handler.stop();
	 * if (process.stdin.isTTY) {
	 *   process.stdin.setRawMode(false);
	 * }
	 * ```
	 */
	stop(): void {
		if (!this.running) return;

		this.running = false;

		if (this.dataHandler) {
			this.stream.removeListener('data', this.dataHandler);
			this.dataHandler = null;
		}

		if (this.escapeTimer) {
			clearTimeout(this.escapeTimer);
			this.escapeTimer = null;
		}

		// Process any remaining buffer
		this.flushBuffer();

		this.buffer = new Uint8Array(0);
	}

	/**
	 * Registers a keyboard event handler.
	 *
	 * @param handler - Function to call when a key event is detected
	 * @returns Unsubscribe function to remove the handler
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = handler.onKey((event) => {
	 *   if (event.name === 'escape') {
	 *     unsubscribe();
	 *   }
	 * });
	 * ```
	 */
	onKey(handler: KeyHandler): Unsubscribe {
		this.keyHandlers.add(handler);
		return () => {
			this.keyHandlers.delete(handler);
		};
	}

	/**
	 * Registers a mouse event handler.
	 *
	 * @param handler - Function to call when a mouse event is detected
	 * @returns Unsubscribe function to remove the handler
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = handler.onMouse((event) => {
	 *   if (event.action === 'press' && event.button === 'left') {
	 *     console.log(`Click at ${event.x}, ${event.y}`);
	 *   }
	 * });
	 * ```
	 */
	onMouse(handler: MouseHandler): Unsubscribe {
		this.mouseHandlers.add(handler);
		return () => {
			this.mouseHandlers.delete(handler);
		};
	}

	/**
	 * Registers a focus event handler.
	 *
	 * @param handler - Function to call when a focus event is detected
	 * @returns Unsubscribe function to remove the handler
	 *
	 * @example
	 * ```typescript
	 * handler.onFocus((event) => {
	 *   console.log(`Terminal ${event.focused ? 'focused' : 'unfocused'}`);
	 * });
	 * ```
	 */
	onFocus(handler: FocusHandler): Unsubscribe {
		this.focusHandlers.add(handler);
		return () => {
			this.focusHandlers.delete(handler);
		};
	}

	/**
	 * Checks if the handler is currently running.
	 */
	isRunning(): boolean {
		return this.running;
	}

	/**
	 * Gets the current buffer size.
	 */
	getBufferSize(): number {
		return this.buffer.length;
	}

	/**
	 * Handles incoming data from the stream.
	 */
	private handleData(chunk: Buffer): void {
		// Append to buffer
		const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
		newBuffer.set(this.buffer);
		newBuffer.set(new Uint8Array(chunk), this.buffer.length);
		this.buffer = newBuffer;

		// Force flush if buffer is too large
		if (this.buffer.length >= this.config.maxBufferSize) {
			this.flushBuffer();
			return;
		}

		// Cancel any pending escape timeout
		if (this.escapeTimer) {
			clearTimeout(this.escapeTimer);
			this.escapeTimer = null;
		}

		// Check if buffer might contain an incomplete escape sequence
		if (this.mightBeIncompleteEscape()) {
			// Wait for more data or timeout
			this.escapeTimer = setTimeout(() => {
				this.escapeTimer = null;
				this.flushBuffer();
			}, this.config.escapeTimeout);
			return;
		}

		// Process the buffer immediately
		this.flushBuffer();
	}

	/**
	 * Checks if the buffer might contain an incomplete escape sequence.
	 */
	private mightBeIncompleteEscape(): boolean {
		if (this.buffer.length === 0) return false;

		// Check if buffer ends with ESC - definitely incomplete
		const lastByte = this.buffer[this.buffer.length - 1];
		if (lastByte === 0x1b) return true;

		// If doesn't start with ESC, not an escape sequence
		if (this.buffer[0] !== 0x1b) return false;

		// ESC only - incomplete
		if (this.buffer.length === 1) return true;

		// ESC [ - incomplete, need at least one more byte
		if (this.buffer.length === 2 && this.buffer[1] === 0x5b) return true;

		// Check for complete 3-byte sequences: ESC [ <letter>
		if (this.buffer.length >= 3 && this.buffer[1] === 0x5b) {
			const thirdByte = this.buffer[2];
			// Single letter terminators (A-Z, a-z) for arrows, focus, etc.
			if ((thirdByte >= 0x41 && thirdByte <= 0x5a) || (thirdByte >= 0x61 && thirdByte <= 0x7a)) {
				return false; // Complete sequence
			}
			// If third byte is < for SGR mouse, check for terminator
			if (thirdByte === 0x3c) {
				// SGR mouse sequence - look for M or m terminator
				for (let i = 3; i < this.buffer.length; i++) {
					if (this.buffer[i] === 0x4d || this.buffer[i] === 0x6d) {
						return false; // Found terminator
					}
				}
				return true; // No terminator yet
			}
			// Check for numeric sequences ending with ~ or letter
			if (thirdByte >= 0x30 && thirdByte <= 0x39) {
				// Numeric sequence - look for terminator
				for (let i = 3; i < this.buffer.length; i++) {
					const b = this.buffer[i];
					// Terminators: ~ for function keys, letters for modifiers
					if (b === 0x7e || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)) {
						return false; // Complete
					}
				}
				return true; // No terminator yet
			}
		}

		return false;
	}

	/**
	 * Processes and flushes the current buffer.
	 */
	private flushBuffer(): void {
		if (this.buffer.length === 0) return;

		const buffer = this.buffer;
		this.buffer = new Uint8Array(0);

		this.processBuffer(buffer);
	}

	/**
	 * Processes a buffer and emits events.
	 */
	private processBuffer(buffer: Uint8Array): void {
		let offset = 0;

		while (offset < buffer.length) {
			const remaining = buffer.slice(offset);

			// Try mouse/focus first (they have specific prefixes)
			if (remaining[0] === 0x1b && remaining.length >= 3) {
				const mouseResult = this.tryParseMouse(remaining);
				if (mouseResult) {
					offset += mouseResult.consumed;
					continue;
				}
			}

			// Try key sequence
			const keyResult = this.tryParseKey(remaining);
			if (keyResult) {
				offset += keyResult.consumed;
				continue;
			}

			// Unknown byte, skip it
			offset++;
		}
	}

	/**
	 * Tries to parse a mouse or focus event from the buffer.
	 * Returns the number of bytes consumed, or null if not a mouse sequence.
	 */
	private tryParseMouse(buffer: Uint8Array): { consumed: number } | null {
		// Try to find the end of the mouse sequence
		// SGR: ESC [ < ... m or M
		// X10: ESC [ M + 3 bytes
		// Focus: ESC [ I or O

		const result = parseMouseSequence(buffer);
		if (!result) return null;

		// Estimate consumed bytes based on raw buffer
		const consumed = this.estimateMouseSequenceLength(buffer, result);

		if (result.type === 'mouse') {
			this.emitMouseEvent(result.event);
		} else if (result.type === 'focus') {
			this.emitFocusEvent(result.event);
		}

		return { consumed };
	}

	/**
	 * Estimates the length of a mouse sequence in the buffer.
	 */
	private estimateMouseSequenceLength(buffer: Uint8Array, result: ParseMouseResult): number {
		if (!result) return 0;

		const s = new TextDecoder().decode(buffer);

		// SGR: ESC [ < ... M/m
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC required for terminal parsing
		const sgrMatch = /^\x1b\[<\d+;\d+;\d+[mM]/.exec(s);
		if (sgrMatch) return sgrMatch[0].length;

		// X10: ESC [ M + 3 bytes
		if (buffer.length >= 6 && buffer[0] === 0x1b && buffer[1] === 0x5b && buffer[2] === 0x4d) {
			return 6;
		}

		// Focus: ESC [ I or O
		if (buffer.length >= 3 && buffer[0] === 0x1b && buffer[1] === 0x5b) {
			if (buffer[2] === 0x49 || buffer[2] === 0x4f) {
				return 3;
			}
		}

		// URXVT: ESC [ ... ; ... ; ... M
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC required for terminal parsing
		const urxvtMatch = /^\x1b\[\d+;\d+;\d+M/.exec(s);
		if (urxvtMatch) return urxvtMatch[0].length;

		// Default: use raw buffer length (might be wrong but safe)
		return result.event.raw.length;
	}

	/**
	 * Tries to parse a key event from the buffer.
	 * Returns the number of bytes consumed.
	 */
	private tryParseKey(buffer: Uint8Array): { consumed: number } | null {
		// Skip if this is a mouse sequence
		if (isMouseSequence(buffer)) return null;

		// Try single key/escape sequence first
		const singleEvent = parseKeySequence(buffer);
		if (singleEvent) {
			this.emitKeyEvent(singleEvent);
			return { consumed: singleEvent.raw.length };
		}

		// Try parsing multiple keys
		const events = parseKeyBuffer(buffer);
		if (events.length > 0) {
			for (const event of events) {
				this.emitKeyEvent(event);
			}
			// Calculate total consumed bytes
			let consumed = 0;
			for (const event of events) {
				consumed += event.raw.length;
			}
			return { consumed: Math.max(consumed, 1) };
		}

		// Single character that wasn't recognized
		if (buffer.length > 0) {
			return { consumed: 1 };
		}

		return null;
	}

	/**
	 * Emits a key event to all registered handlers.
	 */
	private emitKeyEvent(event: KeyEvent): void {
		for (const handler of this.keyHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	/**
	 * Emits a mouse event to all registered handlers.
	 */
	private emitMouseEvent(event: MouseEvent): void {
		for (const handler of this.mouseHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	/**
	 * Emits a focus event to all registered handlers.
	 */
	private emitFocusEvent(event: FocusEvent): void {
		for (const handler of this.focusHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}
}

/**
 * Creates a new input handler instance.
 *
 * @param stream - The readable stream to process
 * @param config - Optional configuration
 * @returns A new InputHandler instance
 *
 * @example
 * ```typescript
 * import { createInputHandler } from 'blecsd';
 *
 * const handler = createInputHandler(process.stdin);
 * handler.onKey((e) => console.log(e.name));
 * handler.start();
 * ```
 */
export function createInputHandler(
	stream: NodeJS.ReadableStream,
	config?: InputHandlerConfig,
): InputHandler {
	return new InputHandler(stream, config);
}
