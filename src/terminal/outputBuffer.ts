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
 * OutputBuffer interface for type-safe access.
 */
export interface OutputBuffer {
	readonly cursorX: number;
	readonly cursorY: number;
	readonly cursorPosition: CursorPosition;
	readonly length: number;
	readonly chunkCount: number;
	readonly isEmpty: boolean;
	write(data: string): void;
	writeln(data: string): void;
	writeAt(x: number, y: number, data: string): void;
	flush(stream: Writable): void;
	setAutoFlushTarget(stream: Writable | null): void;
	clear(): void;
	getContents(): string;
	resetCursor(x?: number, y?: number): void;
}

// =============================================================================
// Private helpers for cursor tracking (pure functions)
// =============================================================================

function handleControlCharacter(char: string, cx: number, cy: number): { cx: number; cy: number } {
	switch (char) {
		case '\n':
			return { cx: 1, cy: cy + 1 };
		case '\r':
			return { cx: 1, cy };
		case '\t':
			return { cx: Math.floor((cx - 1) / 8) * 8 + 9, cy };
		case '\b':
			return { cx: Math.max(1, cx - 1), cy };
		default:
			if (char >= ' ' && char !== '\x7f') {
				return { cx: cx + 1, cy };
			}
			return { cx, cy };
	}
}

function parseEscapeChar(
	char: string,
	currentParam: string,
	params: number[],
): { done: boolean; result?: string; currentParam: string } {
	if (char >= '0' && char <= '9') {
		return { done: false, currentParam: currentParam + char };
	}
	if (char === ';') {
		params.push(currentParam ? Number.parseInt(currentParam, 10) : 0);
		return { done: false, currentParam: '' };
	}
	if (char === '?') {
		return { done: false, currentParam };
	}
	if (char >= '@' && char <= '~') {
		if (currentParam) {
			params.push(Number.parseInt(currentParam, 10));
		}
		return { done: true, result: char, currentParam };
	}
	return { done: true, currentParam };
}

function parseEscapeSequence(
	data: string,
	start: number,
): { command: string; params: number[]; endIndex: number } | null {
	let i = start + 2;
	const params: number[] = [];
	let currentParam = '';

	while (i < data.length) {
		const char = data[i] ?? '';
		const parsed = parseEscapeChar(char, currentParam, params);

		if (parsed.done) {
			return parsed.result ? { command: parsed.result, params, endIndex: i + 1 } : null;
		}

		currentParam = parsed.currentParam;
		i++;
	}

	return null;
}

function applyCursorSequence(
	command: string,
	params: number[],
	cx: number,
	cy: number,
): { cx: number; cy: number } {
	const n = params[0] ?? 1;

	switch (command) {
		case 'A':
			return { cx, cy: Math.max(1, cy - n) };
		case 'B':
			return { cx, cy: cy + n };
		case 'C':
			return { cx: cx + n, cy };
		case 'D':
			return { cx: Math.max(1, cx - n), cy };
		case 'E':
			return { cx: 1, cy: cy + n };
		case 'F':
			return { cx: 1, cy: Math.max(1, cy - n) };
		case 'G':
			return { cx: n, cy };
		case 'H':
		case 'f':
			return { cx: params[1] ?? 1, cy: params[0] ?? 1 };
		default:
			return { cx, cy };
	}
}

function updateCursorPosition(data: string, cx: number, cy: number): { cx: number; cy: number } {
	let x = cx;
	let y = cy;
	let i = 0;
	while (i < data.length) {
		const char = data[i] ?? '';

		if (char === '\x1b' && data[i + 1] === '[') {
			const seq = parseEscapeSequence(data, i);
			if (seq) {
				const pos = applyCursorSequence(seq.command, seq.params, x, y);
				x = pos.cx;
				y = pos.cy;
				i = seq.endIndex;
				continue;
			}
		}

		const pos = handleControlCharacter(char, x, y);
		x = pos.cx;
		y = pos.cy;
		i++;
	}
	return { cx: x, cy: y };
}

/**
 * Create a new OutputBuffer.
 *
 * Coalesces multiple writes into a single flush for better performance.
 * Optionally tracks cursor position through escape sequences.
 *
 * @param options - Buffer configuration options
 *
 * @example
 * ```typescript
 * const buffer = createOutputBuffer();
 * buffer.write('Hello ');
 * buffer.writeln('World');
 * buffer.write(cursor.move(10, 5));
 * buffer.write('At position');
 * buffer.flush(process.stdout);
 * ```
 */
export function createOutputBuffer(options: OutputBufferOptions = {}): OutputBuffer {
	let chunks: string[] = [];
	let cursorX = 1;
	let cursorY = 1;
	const trackCursor = options.trackCursor ?? true;
	const autoFlush = options.autoFlush ?? false;
	let pendingFlush: ReturnType<typeof setImmediate> | null = null;
	let flushTarget: Writable | null = null;

	function cancelPendingFlush(): void {
		if (pendingFlush) {
			clearImmediate(pendingFlush);
			pendingFlush = null;
		}
	}

	function scheduleFlush(): void {
		if (pendingFlush || !flushTarget) {
			return;
		}
		const target = flushTarget;
		pendingFlush = setImmediate(() => {
			pendingFlush = null;
			if (target) {
				buf.flush(target);
			}
		});
	}

	const buf: OutputBuffer = {
		get cursorX() {
			return cursorX;
		},
		get cursorY() {
			return cursorY;
		},
		get cursorPosition(): CursorPosition {
			return { x: cursorX, y: cursorY };
		},
		get length(): number {
			return chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		},
		get chunkCount(): number {
			return chunks.length;
		},
		get isEmpty(): boolean {
			return chunks.length === 0;
		},
		write(data: string): void {
			if (data.length === 0) {
				return;
			}
			chunks.push(data);
			if (trackCursor) {
				const pos = updateCursorPosition(data, cursorX, cursorY);
				cursorX = pos.cx;
				cursorY = pos.cy;
			}
			if (autoFlush && flushTarget && !pendingFlush) {
				scheduleFlush();
			}
		},
		writeln(data: string): void {
			buf.write(data);
			buf.write('\n');
		},
		writeAt(x: number, y: number, data: string): void {
			buf.write(cursorAnsi.move(x, y));
			buf.write(data);
		},
		flush(stream: Writable): void {
			cancelPendingFlush();
			if (chunks.length === 0) {
				return;
			}
			const output = chunks.join('');
			stream.write(output);
			chunks = [];
		},
		setAutoFlushTarget(stream: Writable | null): void {
			flushTarget = stream;
			if (!stream) {
				cancelPendingFlush();
			}
		},
		clear(): void {
			cancelPendingFlush();
			chunks = [];
		},
		getContents(): string {
			return chunks.join('');
		},
		resetCursor(x = 1, y = 1): void {
			cursorX = x;
			cursorY = y;
		},
	};

	return buf;
}
