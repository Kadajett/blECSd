/**
 * Custom I/O Stream Support for blECSd
 *
 * Allows any Readable/Writable pair to be used as terminal input/output,
 * enabling integration with telnet, SSH, or any custom transport.
 *
 * @module terminal/customStream
 *
 * @example
 * ```typescript
 * import { createStreamSession, writeToSession, endSession } from 'blecsd/terminal';
 * import { PassThrough } from 'node:stream';
 *
 * const input = new PassThrough();
 * const output = new PassThrough();
 *
 * const session = createStreamSession({ input, output, width: 80, height: 24 });
 *
 * // Write terminal output to the session
 * writeToSession(session, '\x1b[2J\x1b[HHello!');
 *
 * // Read input events
 * session.onData((data) => console.log('Input:', data));
 *
 * // Clean up
 * endSession(session);
 * ```
 */

import type { Readable, Writable } from 'node:stream';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a custom stream session.
 */
export interface StreamSessionConfig {
	/** Readable stream for input (e.g., socket, stdin, PassThrough) */
	readonly input: Readable;
	/** Writable stream for output (e.g., socket, stdout, PassThrough) */
	readonly output: Writable;
	/** Terminal width (default: 80) */
	readonly width?: number;
	/** Terminal height (default: 24) */
	readonly height?: number;
	/** Terminal type identifier (default: 'xterm') */
	readonly termType?: string;
	/** Encoding for input data (default: 'utf-8') */
	readonly encoding?: BufferEncoding;
}

/**
 * Data handler callback.
 */
export type StreamDataHandler = (data: string) => void;

/**
 * Resize handler callback.
 */
export type StreamResizeHandler = (width: number, height: number) => void;

/**
 * Close handler callback.
 */
export type StreamCloseHandler = (reason: string) => void;

/**
 * A stream-based terminal session.
 */
export interface StreamSession {
	/** Unique session ID */
	readonly id: string;
	/** Terminal width */
	width: number;
	/** Terminal height */
	height: number;
	/** Terminal type */
	readonly termType: string;
	/** Whether the session is active */
	active: boolean;
	/** The underlying input stream */
	readonly input: Readable;
	/** The underlying output stream */
	readonly output: Writable;
	/** Register a data handler */
	onData(handler: StreamDataHandler): () => void;
	/** Register a resize handler */
	onResize(handler: StreamResizeHandler): () => void;
	/** Register a close handler */
	onClose(handler: StreamCloseHandler): () => void;
	/** Emit a resize event (used by transport layers like telnet NAWS) */
	emitResize(width: number, height: number): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for stream session config validation (non-stream fields only).
 */
export const StreamSessionConfigSchema = z.object({
	width: z.number().int().min(1).max(500).optional(),
	height: z.number().int().min(1).max(500).optional(),
	termType: z.string().optional(),
	encoding: z.string().optional(),
});

// =============================================================================
// STATE
// =============================================================================

let sessionCounter = 0;

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Create a stream session from any Readable/Writable pair.
 *
 * @param config - Stream session configuration
 * @returns A StreamSession that bridges input/output
 */
export function createStreamSession(config: StreamSessionConfig): StreamSession {
	sessionCounter += 1;
	const id = `stream-${Date.now()}-${sessionCounter}`;

	const dataHandlers: StreamDataHandler[] = [];
	const resizeHandlers: StreamResizeHandler[] = [];
	const closeHandlers: StreamCloseHandler[] = [];

	const encoding = config.encoding ?? 'utf-8';

	const session: StreamSession = {
		id,
		width: config.width ?? 80,
		height: config.height ?? 24,
		termType: config.termType ?? 'xterm',
		active: true,
		input: config.input,
		output: config.output,
		onData(handler: StreamDataHandler) {
			dataHandlers.push(handler);
			return () => {
				const idx = dataHandlers.indexOf(handler);
				if (idx >= 0) dataHandlers.splice(idx, 1);
			};
		},
		onResize(handler: StreamResizeHandler) {
			resizeHandlers.push(handler);
			return () => {
				const idx = resizeHandlers.indexOf(handler);
				if (idx >= 0) resizeHandlers.splice(idx, 1);
			};
		},
		onClose(handler: StreamCloseHandler) {
			closeHandlers.push(handler);
			return () => {
				const idx = closeHandlers.indexOf(handler);
				if (idx >= 0) closeHandlers.splice(idx, 1);
			};
		},
		emitResize(width: number, height: number) {
			session.width = width;
			session.height = height;
			for (const handler of resizeHandlers) {
				handler(width, height);
			}
		},
	};

	// Wire up input stream
	const onInputData = (chunk: Buffer | string): void => {
		if (!session.active) return;
		const str = typeof chunk === 'string' ? chunk : chunk.toString(encoding);
		for (const handler of dataHandlers) {
			handler(str);
		}
	};

	const onInputEnd = (): void => {
		if (!session.active) return;
		session.active = false;
		for (const handler of closeHandlers) {
			handler('input ended');
		}
	};

	const onInputError = (err: Error): void => {
		if (!session.active) return;
		session.active = false;
		for (const handler of closeHandlers) {
			handler(`input error: ${err.message}`);
		}
	};

	config.input.on('data', onInputData);
	config.input.on('end', onInputEnd);
	config.input.on('error', onInputError);

	// Handle output stream errors / close
	const onOutputError = (err: Error): void => {
		if (!session.active) return;
		session.active = false;
		for (const handler of closeHandlers) {
			handler(`output error: ${err.message}`);
		}
	};

	const onOutputClose = (): void => {
		if (!session.active) return;
		session.active = false;
		for (const handler of closeHandlers) {
			handler('output closed');
		}
	};

	config.output.on('error', onOutputError);
	config.output.on('close', onOutputClose);

	return session;
}

/**
 * Write terminal output data to a stream session.
 *
 * @param session - The stream session
 * @param data - Terminal output data (ANSI sequences, text, etc.)
 * @returns Whether the write succeeded
 */
export function writeToSession(session: StreamSession, data: string): boolean {
	if (!session.active) return false;
	try {
		session.output.write(data);
		return true;
	} catch {
		return false;
	}
}

/**
 * End a stream session, cleaning up resources.
 *
 * @param session - The stream session to end
 * @param reason - Optional reason for ending
 */
export function endSession(session: StreamSession, _reason = 'ended'): void {
	if (!session.active) return;
	session.active = false;
	try {
		session.output.end();
	} catch {
		// Output may already be closed
	}
}

/**
 * Reset stream session counter (for testing).
 */
export function resetStreamSessionCounter(): void {
	sessionCounter = 0;
}
