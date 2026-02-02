/**
 * Output Buffering System
 *
 * Efficient buffering for terminal output with batched flushing.
 *
 * @module terminal/outputBuffer
 * @internal This module is internal and not exported from the main package.
 */

import type { Writable } from 'node:stream';
import { cursor as cursorAnsi } from './ansi';

/**
 * Options for OutputBuffer
 */
export interface OutputBufferOptions {
	/**
	 * Auto-flush on setImmediate (default: false)
	 */
	autoFlush?: boolean;

	/**
	 * Track cursor position through writes (default: true)
	 */
	trackCursor?: boolean;
}

/**
 * Cursor position
 */
export interface CursorPosition {
	x: number;
	y: number;
}

/**
 * OutputBuffer provides efficient buffered output for terminal rendering.
 *
 * Coalesces multiple writes into a single flush for better performance.
 * Optionally tracks cursor position through escape sequences.
 *
 * @example
 * ```typescript
 * const buffer = new OutputBuffer();
 * buffer.write('Hello ');
 * buffer.writeln('World');
 * buffer.write(cursor.move(10, 5));
 * buffer.write('At position');
 * buffer.flush(process.stdout);
 * ```
 */
export class OutputBuffer {
	private chunks: string[] = [];
	private _cursorX = 1;
	private _cursorY = 1;
	private trackCursor: boolean;
	private autoFlush: boolean;
	private pendingFlush: ReturnType<typeof setImmediate> | null = null;
	private flushTarget: Writable | null = null;

	/**
	 * Create a new OutputBuffer.
	 *
	 * @param options - Buffer configuration options
	 */
	constructor(options: OutputBufferOptions = {}) {
		this.trackCursor = options.trackCursor ?? true;
		this.autoFlush = options.autoFlush ?? false;
	}

	/**
	 * Current cursor X position (1-indexed column).
	 */
	get cursorX(): number {
		return this._cursorX;
	}

	/**
	 * Current cursor Y position (1-indexed row).
	 */
	get cursorY(): number {
		return this._cursorY;
	}

	/**
	 * Current cursor position.
	 */
	get cursorPosition(): CursorPosition {
		return { x: this._cursorX, y: this._cursorY };
	}

	/**
	 * Current buffer length in characters.
	 */
	get length(): number {
		return this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	}

	/**
	 * Number of chunks in the buffer.
	 */
	get chunkCount(): number {
		return this.chunks.length;
	}

	/**
	 * Whether the buffer is empty.
	 */
	get isEmpty(): boolean {
		return this.chunks.length === 0;
	}

	/**
	 * Write data to the buffer.
	 *
	 * @param data - String data to write
	 *
	 * @example
	 * ```typescript
	 * buffer.write('Hello');
	 * buffer.write(style.fg('red'));
	 * buffer.write('Red text');
	 * ```
	 */
	write(data: string): void {
		if (data.length === 0) {
			return;
		}

		this.chunks.push(data);

		if (this.trackCursor) {
			this.updateCursorPosition(data);
		}

		if (this.autoFlush && this.flushTarget && !this.pendingFlush) {
			this.scheduleFlush();
		}
	}

	/**
	 * Write data followed by a newline.
	 *
	 * @param data - String data to write
	 *
	 * @example
	 * ```typescript
	 * buffer.writeln('Line 1');
	 * buffer.writeln('Line 2');
	 * ```
	 */
	writeln(data: string): void {
		this.write(data);
		this.write('\n');
	}

	/**
	 * Move cursor to position and write data.
	 *
	 * @param x - Column (1-indexed)
	 * @param y - Row (1-indexed)
	 * @param data - String data to write
	 *
	 * @example
	 * ```typescript
	 * buffer.writeAt(10, 5, 'Hello');
	 * ```
	 */
	writeAt(x: number, y: number, data: string): void {
		this.write(cursorAnsi.move(x, y));
		this.write(data);
	}

	/**
	 * Flush buffer contents to the output stream.
	 *
	 * @param stream - Writable stream to flush to
	 *
	 * @example
	 * ```typescript
	 * buffer.flush(process.stdout);
	 * ```
	 */
	flush(stream: Writable): void {
		this.cancelPendingFlush();

		if (this.chunks.length === 0) {
			return;
		}

		// Join all chunks and write as single operation
		const output = this.chunks.join('');
		stream.write(output);
		this.chunks = [];
	}

	/**
	 * Set the auto-flush target stream.
	 * When autoFlush is enabled, writes will be batched and flushed on setImmediate.
	 *
	 * @param stream - Target stream for auto-flush, or null to disable
	 */
	setAutoFlushTarget(stream: Writable | null): void {
		this.flushTarget = stream;
		if (!stream) {
			this.cancelPendingFlush();
		}
	}

	/**
	 * Clear the buffer without flushing.
	 *
	 * @example
	 * ```typescript
	 * buffer.write('This will be discarded');
	 * buffer.clear();
	 * // Buffer is now empty
	 * ```
	 */
	clear(): void {
		this.cancelPendingFlush();
		this.chunks = [];
	}

	/**
	 * Get the current buffer contents without flushing.
	 *
	 * @returns Current buffer contents as a single string
	 */
	getContents(): string {
		return this.chunks.join('');
	}

	/**
	 * Reset cursor position tracking.
	 *
	 * @param x - Initial X position (default: 1)
	 * @param y - Initial Y position (default: 1)
	 */
	resetCursor(x = 1, y = 1): void {
		this._cursorX = x;
		this._cursorY = y;
	}

	/**
	 * Update cursor position based on written data.
	 * Parses escape sequences to track cursor movement.
	 */
	private updateCursorPosition(data: string): void {
		let i = 0;
		while (i < data.length) {
			const char = data[i] ?? '';

			// Check for escape sequence
			if (char === '\x1b' && data[i + 1] === '[') {
				const seq = this.parseEscapeSequence(data, i);
				if (seq) {
					this.applyCursorSequence(seq.command, seq.params);
					i = seq.endIndex;
					continue;
				}
			}

			this.handleControlCharacter(char);
			i++;
		}
	}

	/**
	 * Handle a single control or printable character for cursor tracking.
	 */
	private handleControlCharacter(char: string): void {
		switch (char) {
			case '\n':
				this._cursorY++;
				this._cursorX = 1;
				break;
			case '\r':
				this._cursorX = 1;
				break;
			case '\t':
				// Tab stops at every 8 columns
				this._cursorX = Math.floor((this._cursorX - 1) / 8) * 8 + 9;
				break;
			case '\b':
				// Backspace
				this._cursorX = Math.max(1, this._cursorX - 1);
				break;
			default:
				// Printable character (excluding control chars and DEL)
				if (char >= ' ' && char !== '\x7f') {
					this._cursorX++;
				}
		}
	}

	/**
	 * Parse an escape sequence starting at the given index.
	 */
	private parseEscapeSequence(
		data: string,
		start: number,
	): { command: string; params: number[]; endIndex: number } | null {
		// Skip ESC [
		let i = start + 2;
		const params: number[] = [];
		let currentParam = '';

		while (i < data.length) {
			const char = data[i] ?? '';
			const parsed = this.parseEscapeChar(char, currentParam, params);

			if (parsed.done) {
				return parsed.result ? { command: parsed.result, params, endIndex: i + 1 } : null;
			}

			currentParam = parsed.currentParam;
			i++;
		}

		return null;
	}

	/**
	 * Parse a single character in an escape sequence.
	 */
	private parseEscapeChar(
		char: string,
		currentParam: string,
		params: number[],
	): { done: boolean; result?: string; currentParam: string } {
		// Digit - accumulate parameter
		if (char >= '0' && char <= '9') {
			return { done: false, currentParam: currentParam + char };
		}

		// Semicolon - end current parameter, start next
		if (char === ';') {
			params.push(currentParam ? Number.parseInt(currentParam, 10) : 0);
			return { done: false, currentParam: '' };
		}

		// Private mode prefix - skip
		if (char === '?') {
			return { done: false, currentParam };
		}

		// Command character - finalize sequence
		if (char >= '@' && char <= '~') {
			if (currentParam) {
				params.push(Number.parseInt(currentParam, 10));
			}
			return { done: true, result: char, currentParam };
		}

		// Unknown - abort
		return { done: true, currentParam };
	}

	/**
	 * Apply cursor movement from escape sequence.
	 */
	private applyCursorSequence(command: string, params: number[]): void {
		const n = params[0] ?? 1;

		switch (command) {
			case 'A': // Cursor up
				this._cursorY = Math.max(1, this._cursorY - n);
				break;
			case 'B': // Cursor down
				this._cursorY += n;
				break;
			case 'C': // Cursor forward
				this._cursorX += n;
				break;
			case 'D': // Cursor back
				this._cursorX = Math.max(1, this._cursorX - n);
				break;
			case 'E': // Cursor next line
				this._cursorY += n;
				this._cursorX = 1;
				break;
			case 'F': // Cursor previous line
				this._cursorY = Math.max(1, this._cursorY - n);
				this._cursorX = 1;
				break;
			case 'G': // Cursor horizontal absolute
				this._cursorX = n;
				break;
			case 'H': // Cursor position
			case 'f': // Horizontal and vertical position
				this._cursorY = params[0] ?? 1;
				this._cursorX = params[1] ?? 1;
				break;
			// SGR, erase, and other commands don't affect cursor position
		}
	}

	/**
	 * Schedule a batched flush on setImmediate.
	 */
	private scheduleFlush(): void {
		if (this.pendingFlush || !this.flushTarget) {
			return;
		}

		this.pendingFlush = setImmediate(() => {
			this.pendingFlush = null;
			if (this.flushTarget) {
				this.flush(this.flushTarget);
			}
		});
	}

	/**
	 * Cancel any pending flush.
	 */
	private cancelPendingFlush(): void {
		if (this.pendingFlush) {
			clearImmediate(this.pendingFlush);
			this.pendingFlush = null;
		}
	}
}
