/**
 * Bracketed Paste Mode
 *
 * Distinguishes pasted text from typed input by detecting ESC[200~ / ESC[201~
 * markers that terminals send when bracketed paste mode is enabled.
 *
 * Provides paste event parsing, sanitization, and integration with the
 * input stream handler.
 *
 * @module terminal/bracketedPaste
 */

import { z } from 'zod';
import { bracketedPaste as ansiPaste } from './ansi';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A paste event detected from bracketed paste mode markers.
 */
export interface PasteEvent {
	/** Event type discriminator */
	readonly type: 'paste';
	/** The pasted text content */
	readonly text: string;
	/** Timestamp when paste was detected */
	readonly timestamp: number;
	/** Whether the text was sanitized */
	readonly sanitized: boolean;
	/** Original byte length before sanitization */
	readonly originalLength: number;
}

/**
 * Zod schema for PasteEvent validation.
 *
 * @example
 * ```typescript
 * import { PasteEventSchema } from 'blecsd';
 *
 * const result = PasteEventSchema.safeParse(event);
 * if (result.success) {
 *   console.log('Valid paste event');
 * }
 * ```
 */
export const PasteEventSchema = z.object({
	type: z.literal('paste'),
	text: z.string(),
	timestamp: z.number(),
	sanitized: z.boolean(),
	originalLength: z.number().int().nonnegative(),
});

/**
 * Configuration for paste handling.
 */
export interface PasteConfig {
	/** Whether to sanitize pasted content (strip escape sequences) (default: true) */
	readonly sanitize: boolean;
	/** Maximum paste length in bytes (default: 1MB, 0 = unlimited) */
	readonly maxLength: number;
	/** Whether bracketed paste mode is enabled (default: true) */
	readonly enabled: boolean;
}

/**
 * Zod schema for PasteConfig validation.
 */
export const PasteConfigSchema = z.object({
	sanitize: z.boolean().default(true),
	maxLength: z
		.number()
		.int()
		.nonnegative()
		.default(1024 * 1024),
	enabled: z.boolean().default(true),
});

/**
 * Handler for paste events.
 */
export type PasteHandler = (event: PasteEvent) => void;

/**
 * Result of parsing a buffer for paste sequences.
 */
export interface PasteParseResult {
	/** Whether a paste start marker was found */
	readonly pasteStarted: boolean;
	/** Whether a paste end marker was found */
	readonly pasteEnded: boolean;
	/** Text content extracted from paste (only if complete) */
	readonly text: string | null;
	/** Number of bytes consumed from the buffer */
	readonly consumed: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: PasteConfig = {
	sanitize: true,
	maxLength: 1024 * 1024,
	enabled: true,
};

// Paste boundary markers as byte sequences
const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Strips ANSI escape sequences from pasted text.
 * This prevents escape sequence injection through paste.
 *
 * @param text - The raw pasted text
 * @returns Sanitized text with escape sequences removed
 *
 * @example
 * ```typescript
 * import { sanitizePastedText } from 'blecsd';
 *
 * const clean = sanitizePastedText('Hello\x1b[31mRed\x1b[0m World');
 * // 'HelloRed World'
 * ```
 */
export function sanitizePastedText(text: string): string {
	// Strip all escape sequences: ESC followed by various patterns
	// CSI sequences: ESC [ ... (letter)
	// OSC sequences: ESC ] ... (ST or BEL)
	// Simple escapes: ESC (single char)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for escape sequence detection
	return text.replace(/\x1b(?:\[[0-9;?]*[a-zA-Z~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?|[^[\]])/g, '');
}

/**
 * Truncates text to the maximum allowed paste length.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (0 = no limit)
 * @returns Truncated text
 */
export function truncatePaste(text: string, maxLength: number): string {
	if (maxLength <= 0) return text;
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength);
}

// =============================================================================
// PASTE DETECTION
// =============================================================================

/**
 * Checks if a buffer starts with the paste start marker (ESC[200~).
 *
 * @param buffer - Buffer to check
 * @returns True if the buffer starts with the paste start marker
 *
 * @example
 * ```typescript
 * import { isPasteStart } from 'blecsd';
 *
 * const buf = Buffer.from('\x1b[200~Hello\x1b[201~');
 * console.log(isPasteStart(buf)); // true
 * ```
 */
export function isPasteStart(buffer: Uint8Array): boolean {
	if (buffer.length < PASTE_START.length) return false;

	const s = new TextDecoder().decode(buffer.subarray(0, PASTE_START.length));
	return s === PASTE_START;
}

/**
 * Checks if a buffer might be the beginning of a paste start marker.
 * Used for incomplete sequence detection.
 *
 * @param buffer - Buffer to check
 * @returns True if the buffer could be a partial paste start marker
 */
export function mightBePasteStart(buffer: Uint8Array): boolean {
	if (buffer.length === 0) return false;
	if (buffer.length >= PASTE_START.length) return isPasteStart(buffer);

	const s = new TextDecoder().decode(buffer);
	return PASTE_START.startsWith(s);
}

/**
 * Finds the paste end marker in a buffer.
 *
 * @param buffer - Buffer to search
 * @returns Index of the end marker, or -1 if not found
 */
export function findPasteEnd(buffer: Uint8Array): number {
	const s = new TextDecoder().decode(buffer);
	return s.indexOf(PASTE_END);
}

/**
 * Extracts pasted text from a buffer containing paste markers.
 * Returns the text between ESC[200~ and ESC[201~.
 *
 * @param buffer - Buffer containing paste content
 * @param config - Paste configuration
 * @returns Parse result with extracted text, or null markers
 *
 * @example
 * ```typescript
 * import { extractPasteContent } from 'blecsd';
 *
 * const buf = Buffer.from('\x1b[200~Hello World\x1b[201~');
 * const result = extractPasteContent(buf);
 * // { pasteStarted: true, pasteEnded: true, text: 'Hello World', consumed: 24 }
 * ```
 */
export function extractPasteContent(
	buffer: Uint8Array,
	config?: Partial<PasteConfig>,
): PasteParseResult {
	const cfg: PasteConfig = { ...DEFAULT_CONFIG, ...config };
	const s = new TextDecoder().decode(buffer);

	// Check for paste start marker
	if (!s.startsWith(PASTE_START)) {
		return { pasteStarted: false, pasteEnded: false, text: null, consumed: 0 };
	}

	// Look for paste end marker
	const endIndex = s.indexOf(PASTE_END);
	if (endIndex === -1) {
		// Paste started but not yet complete
		return { pasteStarted: true, pasteEnded: false, text: null, consumed: 0 };
	}

	// Extract text between markers
	const startOffset = PASTE_START.length;
	let text = s.slice(startOffset, endIndex);

	// Apply sanitization
	if (cfg.sanitize) {
		text = sanitizePastedText(text);
	}

	// Apply max length
	text = truncatePaste(text, cfg.maxLength);

	const consumed = endIndex + PASTE_END.length;

	return { pasteStarted: true, pasteEnded: true, text, consumed };
}

// =============================================================================
// PASTE STATE MANAGER
// =============================================================================

/**
 * State for tracking an ongoing paste operation.
 */
export interface PasteState {
	/** Whether we are currently inside a paste sequence */
	readonly isPasting: boolean;
	/** Accumulated paste content (during multi-chunk paste) */
	readonly buffer: string;
	/** Configuration */
	readonly config: PasteConfig;
}

/**
 * Creates initial paste state.
 *
 * @param config - Optional paste configuration
 * @returns Initial paste state
 *
 * @example
 * ```typescript
 * import { createPasteState } from 'blecsd';
 *
 * const state = createPasteState({ sanitize: true, maxLength: 1024 });
 * ```
 */
export function createPasteState(config?: Partial<PasteConfig>): PasteState {
	return {
		isPasting: false,
		buffer: '',
		config: { ...DEFAULT_CONFIG, ...config },
	};
}

/**
 * Result of processing a buffer chunk through the paste state machine.
 */
export interface PasteProcessResult {
	/** Updated paste state */
	readonly state: PasteState;
	/** Completed paste event, if paste ended in this chunk */
	readonly event: PasteEvent | null;
	/** Number of bytes consumed from the buffer */
	readonly consumed: number;
	/** Remaining bytes that were not part of the paste */
	readonly remaining: Uint8Array;
}

/**
 * Processes a buffer chunk through the paste state machine.
 *
 * Handles multi-chunk paste content: when paste data arrives across
 * multiple read() calls, this accumulates content until the end marker.
 *
 * @param state - Current paste state
 * @param buffer - New buffer chunk to process
 * @returns Updated state, completed event if any, and remaining buffer
 *
 * @example
 * ```typescript
 * import { createPasteState, processPasteBuffer } from 'blecsd';
 *
 * let state = createPasteState();
 *
 * // First chunk: paste start + partial content
 * const result1 = processPasteBuffer(state, Buffer.from('\x1b[200~Hello'));
 * state = result1.state;
 * // state.isPasting === true, no event yet
 *
 * // Second chunk: rest of content + paste end
 * const result2 = processPasteBuffer(state, Buffer.from(' World\x1b[201~'));
 * state = result2.state;
 * // result2.event.text === 'Hello World'
 * ```
 */
export function processPasteBuffer(state: PasteState, buffer: Uint8Array): PasteProcessResult {
	const s = new TextDecoder().decode(buffer);

	if (!state.isPasting) {
		// Not currently in a paste - check for paste start
		if (!s.startsWith(PASTE_START)) {
			return {
				state,
				event: null,
				consumed: 0,
				remaining: buffer,
			};
		}

		// Paste started - check if end is in same buffer
		const contentStart = PASTE_START.length;
		const endIndex = s.indexOf(PASTE_END, contentStart);

		if (endIndex === -1) {
			// Paste started but not complete - accumulate
			const content = s.slice(contentStart);
			return {
				state: {
					...state,
					isPasting: true,
					buffer: content,
				},
				event: null,
				consumed: buffer.length,
				remaining: new Uint8Array(0),
			};
		}

		// Complete paste in one buffer
		let text = s.slice(contentStart, endIndex);
		const originalLength = text.length;

		if (state.config.sanitize) {
			text = sanitizePastedText(text);
		}
		text = truncatePaste(text, state.config.maxLength);

		const consumed = endIndex + PASTE_END.length;
		const remainingBytes = new TextEncoder().encode(s.slice(consumed));

		return {
			state: { ...state, isPasting: false, buffer: '' },
			event: {
				type: 'paste',
				text,
				timestamp: Date.now(),
				sanitized: state.config.sanitize,
				originalLength,
			},
			consumed,
			remaining: remainingBytes,
		};
	}

	// Currently pasting - look for end marker
	const endIndex = s.indexOf(PASTE_END);

	if (endIndex === -1) {
		// No end marker yet - accumulate
		return {
			state: {
				...state,
				buffer: state.buffer + s,
			},
			event: null,
			consumed: buffer.length,
			remaining: new Uint8Array(0),
		};
	}

	// Found end marker - complete the paste
	let text = state.buffer + s.slice(0, endIndex);
	const originalLength = text.length;

	if (state.config.sanitize) {
		text = sanitizePastedText(text);
	}
	text = truncatePaste(text, state.config.maxLength);

	const consumed = endIndex + PASTE_END.length;
	const remainingBytes = new TextEncoder().encode(s.slice(consumed));

	return {
		state: { ...state, isPasting: false, buffer: '' },
		event: {
			type: 'paste',
			text,
			timestamp: Date.now(),
			sanitized: state.config.sanitize,
			originalLength,
		},
		consumed,
		remaining: remainingBytes,
	};
}

// =============================================================================
// ENABLE/DISABLE HELPERS
// =============================================================================

/**
 * Returns the escape sequence to enable bracketed paste mode.
 *
 * @returns ANSI escape sequence string
 *
 * @example
 * ```typescript
 * import { enableBracketedPaste } from 'blecsd';
 *
 * process.stdout.write(enableBracketedPaste());
 * ```
 */
export function enableBracketedPaste(): string {
	return ansiPaste.enable();
}

/**
 * Returns the escape sequence to disable bracketed paste mode.
 *
 * @returns ANSI escape sequence string
 *
 * @example
 * ```typescript
 * import { disableBracketedPaste } from 'blecsd';
 *
 * process.stdout.write(disableBracketedPaste());
 * ```
 */
export function disableBracketedPaste(): string {
	return ansiPaste.disable();
}
