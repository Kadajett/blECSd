/**
 * ANSI Modern Terminal Features
 *
 * Support for modern terminal features like synchronized output,
 * bracketed paste, clipboard access, and tmux pass-through.
 *
 * @module terminal/ansi/features
 * @internal This module is internal and not exported from the main package.
 */

import { CSI, DCS, OSC, ST } from './constants';

/**
 * Synchronized output mode (DEC private mode 2026).
 *
 * Prevents screen tearing and flicker during rapid updates by
 * buffering output until the end marker is received. Essential
 * for smooth 60fps game rendering.
 *
 * Supported terminals: kitty, foot, contour, WezTerm, iTerm2 (3.5+),
 * mintty (3.6+), and others implementing DEC 2026.
 *
 * @example
 * ```typescript
 * // Manual usage
 * process.stdout.write(sync.begin());
 * // ... render frame ...
 * process.stdout.write(sync.end());
 *
 * // Or use wrap for convenience
 * process.stdout.write(sync.wrap(frameContent));
 * ```
 */
export const sync = {
	/**
	 * Begin synchronized output mode.
	 * Terminal buffers all output until end() is called.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * sync.begin() // Returns: '\x1b[?2026h'
	 * ```
	 */
	begin(): string {
		return `${CSI}?2026h`;
	},

	/**
	 * End synchronized output mode.
	 * Terminal flushes buffered output to screen.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * sync.end() // Returns: '\x1b[?2026l'
	 * ```
	 */
	end(): string {
		return `${CSI}?2026l`;
	},

	/**
	 * Wrap content in synchronized output markers.
	 * Convenience function for single-frame rendering.
	 *
	 * @param content - Content to wrap
	 * @returns Content wrapped in sync begin/end markers
	 *
	 * @example
	 * ```typescript
	 * const frame = renderFrame();
	 * process.stdout.write(sync.wrap(frame));
	 * ```
	 */
	wrap(content: string): string {
		return `${CSI}?2026h${content}${CSI}?2026l`;
	},
} as const;

/**
 * Bracketed paste mode.
 *
 * When enabled, pasted text is wrapped in escape sequences allowing
 * the application to distinguish pasted text from typed text.
 *
 * @example
 * ```typescript
 * // Enable bracketed paste
 * process.stdout.write(bracketedPaste.enable());
 *
 * // Pasted text will be wrapped as:
 * // ESC[200~ <pasted text> ESC[201~
 * ```
 */
export const bracketedPaste = {
	/**
	 * Enable bracketed paste mode.
	 *
	 * @returns ANSI escape sequence
	 */
	enable(): string {
		return `${CSI}?2004h`;
	},

	/**
	 * Disable bracketed paste mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disable(): string {
		return `${CSI}?2004l`;
	},

	/**
	 * Start marker for pasted content (sent by terminal).
	 */
	START_MARKER: `${CSI}200~`,

	/**
	 * End marker for pasted content (sent by terminal).
	 */
	END_MARKER: `${CSI}201~`,
} as const;

/**
 * Clipboard selection identifiers.
 * Used with OSC 52 clipboard operations.
 */
export const ClipboardSelection = {
	/** Primary clipboard (X11 PRIMARY, macOS pasteboard) */
	CLIPBOARD: 'c',
	/** Primary selection (X11 PRIMARY) */
	PRIMARY: 'p',
	/** Secondary selection (X11 SECONDARY) */
	SECONDARY: 's',
	/** Select (cut buffer 0) */
	SELECT: 's',
	/** Cut buffers 0-7 */
	CUT0: '0',
	CUT1: '1',
	CUT2: '2',
	CUT3: '3',
	CUT4: '4',
	CUT5: '5',
	CUT6: '6',
	CUT7: '7',
} as const;

export type ClipboardSelectionType = (typeof ClipboardSelection)[keyof typeof ClipboardSelection];

/**
 * Default maximum clipboard content size (1MB).
 * This limit helps prevent accidental data exfiltration.
 */
export const DEFAULT_CLIPBOARD_MAX_SIZE = 1024 * 1024;

/**
 * Clipboard operations using OSC 52.
 *
 * OSC 52 allows terminal applications to read and write the system clipboard.
 * This is a powerful feature that requires careful security consideration.
 *
 * **Security Warning:**
 * - Remote applications (over SSH) can read/write your local clipboard
 * - Consider disabling clipboard access in untrusted environments
 * - Many terminals disable OSC 52 by default for security
 *
 * **Terminal Support:**
 * - xterm (enabled via allowWindowOps)
 * - iTerm2 (enabled by default for write, disabled for read)
 * - kitty (enabled by default)
 * - foot (enabled by default)
 * - Windows Terminal (enabled by default)
 *
 * @example
 * ```typescript
 * // Write to clipboard
 * process.stdout.write(clipboard.write('Hello World'));
 *
 * // Request clipboard read (response via terminal input)
 * process.stdout.write(clipboard.requestRead());
 * ```
 */
export const clipboard = {
	/**
	 * Write text to clipboard.
	 *
	 * @param text - Text to write to clipboard
	 * @param selection - Clipboard selection (default: 'c' for system clipboard)
	 * @param maxSize - Maximum allowed size in bytes (default: 1MB)
	 * @returns OSC 52 write sequence, or empty string if text exceeds maxSize
	 *
	 * @example
	 * ```typescript
	 * // Write to system clipboard
	 * process.stdout.write(clipboard.write('Hello World'));
	 *
	 * // Write to primary selection (X11)
	 * process.stdout.write(clipboard.write('Selection', 'p'));
	 * ```
	 */
	write(
		text: string,
		selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD,
		maxSize: number = DEFAULT_CLIPBOARD_MAX_SIZE,
	): string {
		// Enforce size limit to prevent accidental data exfiltration
		const bytes = Buffer.byteLength(text, 'utf8');
		if (bytes > maxSize) {
			return '';
		}

		// Encode content as base64
		const encoded = Buffer.from(text, 'utf8').toString('base64');
		return `${OSC}52;${selection};${encoded}${ST}`;
	},

	/**
	 * Request clipboard read from terminal.
	 *
	 * The terminal will respond with the clipboard contents via input.
	 * Response format: OSC 52 ; selection ; base64-data ST
	 *
	 * @param selection - Clipboard selection to read (default: 'c')
	 * @returns OSC 52 read request sequence
	 *
	 * @example
	 * ```typescript
	 * // Request clipboard contents
	 * process.stdout.write(clipboard.requestRead());
	 * // Terminal responds via stdin with base64-encoded contents
	 * ```
	 */
	requestRead(selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD): string {
		return `${OSC}52;${selection};?${ST}`;
	},

	/**
	 * Clear clipboard contents.
	 *
	 * @param selection - Clipboard selection to clear (default: 'c')
	 * @returns OSC 52 clear sequence
	 *
	 * @example
	 * ```typescript
	 * // Clear system clipboard
	 * process.stdout.write(clipboard.clear());
	 * ```
	 */
	clear(selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD): string {
		// Empty base64 data clears the clipboard
		return `${OSC}52;${selection};${ST}`;
	},

	/**
	 * Decode clipboard response from terminal.
	 *
	 * @param response - Raw OSC 52 response from terminal
	 * @returns Decoded text, or null if invalid response
	 *
	 * @example
	 * ```typescript
	 * const text = clipboard.decodeResponse('\x1b]52;c;SGVsbG8=\x1b\\');
	 * // text = 'Hello'
	 * ```
	 */
	decodeResponse(response: string): string | null {
		// Match OSC 52 response format
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
		const match = response.match(/\x1b\]52;([^;]+);([A-Za-z0-9+/=]*)\x1b\\/);
		if (!match) {
			return null;
		}

		const base64Data = match[2];
		if (!base64Data) {
			return '';
		}

		try {
			return Buffer.from(base64Data, 'base64').toString('utf8');
		} catch {
			return null;
		}
	},

	/**
	 * Check if a response is an OSC 52 clipboard response.
	 *
	 * @param response - Response string to check
	 * @returns true if response is an OSC 52 clipboard response
	 */
	isClipboardResponse(response: string): boolean {
		return response.startsWith('\x1b]52;');
	},
} as const;

/**
 * Tmux pass-through escape sequence handling.
 *
 * When running inside tmux, some escape sequences need to be wrapped in
 * DCS (Device Control String) pass-through sequences to reach the underlying
 * terminal. This is necessary for sequences that tmux doesn't understand or
 * that need to be handled by the outer terminal.
 *
 * The pass-through format is:
 * - Start: DCS tmux;
 * - Content: Original sequence with all ESC doubled
 * - End: ST
 *
 * @example
 * ```typescript
 * import { tmux, title } from 'blecsd/terminal/ansi';
 *
 * // Wrap a title sequence for tmux pass-through
 * const titleSeq = title.set('My App');
 * const wrapped = tmux.wrap(titleSeq);
 *
 * // Or wrap multiple sequences together
 * const sequences = cursor.hide() + title.set('App');
 * const wrappedAll = tmux.wrap(sequences);
 * ```
 */
export const tmux = {
	/**
	 * The DCS introducer for tmux pass-through.
	 * Format: ESC P tmux;
	 */
	PT_START: `${DCS}tmux;`,

	/**
	 * Wrap an escape sequence for tmux pass-through.
	 *
	 * This function wraps the given escape sequence(s) in a DCS pass-through
	 * envelope, doubling any ESC characters in the content as required by tmux.
	 *
	 * @param sequence - The escape sequence(s) to wrap
	 * @returns The wrapped sequence for tmux pass-through
	 *
	 * @example
	 * ```typescript
	 * // Wrap a single sequence
	 * const wrapped = tmux.wrap('\x1b]0;Title\x07');
	 * // Returns: '\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\'
	 *
	 * // Wrap multiple sequences
	 * const wrapped = tmux.wrap(cursor.hide() + title.set('App'));
	 * ```
	 */
	wrap(sequence: string): string {
		// Double all ESC characters in the sequence
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		const doubled = sequence.replace(/\x1b/g, '\x1b\x1b');
		return `${DCS}tmux;${doubled}${ST}`;
	},

	/**
	 * Unwrap a tmux pass-through sequence.
	 *
	 * This reverses the wrapping done by wrap(), extracting the original
	 * sequence with doubled ESC characters restored to single ESC.
	 *
	 * @param wrapped - The wrapped sequence
	 * @returns The original sequence, or null if not a valid tmux pass-through
	 *
	 * @example
	 * ```typescript
	 * const original = tmux.unwrap('\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\');
	 * // Returns: '\x1b]0;Title\x07'
	 * ```
	 */
	unwrap(wrapped: string): string | null {
		// Match the tmux pass-through format
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		const match = wrapped.match(/^\x1bPtmux;([\s\S]*)\x1b\\$/);
		if (!match) {
			return null;
		}

		// Restore doubled ESC characters to single
		const content = match[1] ?? '';
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		return content.replace(/\x1b\x1b/g, '\x1b');
	},

	/**
	 * Check if a sequence is already wrapped for tmux pass-through.
	 *
	 * @param sequence - The sequence to check
	 * @returns true if the sequence is wrapped for tmux
	 */
	isWrapped(sequence: string): boolean {
		return sequence.startsWith(`${DCS}tmux;`) && sequence.endsWith(ST);
	},

	/**
	 * Conditionally wrap a sequence for tmux if needed.
	 *
	 * Use this when you want to wrap a sequence only if running inside tmux.
	 * The sequence is returned unchanged if not in tmux or if already wrapped.
	 *
	 * @param sequence - The escape sequence(s) to potentially wrap
	 * @param inTmux - Whether currently running inside tmux
	 * @returns The sequence, wrapped if in tmux and not already wrapped
	 *
	 * @example
	 * ```typescript
	 * import { tmux, title } from 'blecsd/terminal/ansi';
	 * import { isTmux } from 'blecsd/terminal/detection';
	 *
	 * // Conditionally wrap based on environment
	 * const seq = tmux.wrapIf(title.set('App'), isTmux());
	 * ```
	 */
	wrapIf(sequence: string, inTmux: boolean): string {
		if (!inTmux) {
			return sequence;
		}
		if (tmux.isWrapped(sequence)) {
			return sequence;
		}
		return tmux.wrap(sequence);
	},

	/**
	 * Begin pass-through mode for multiple sequences.
	 *
	 * This returns just the DCS introducer, allowing you to send the
	 * content and ST separately. Remember to double ESC characters manually.
	 *
	 * @returns The DCS tmux; prefix
	 *
	 * @example
	 * ```typescript
	 * // Manual pass-through mode
	 * process.stdout.write(tmux.begin());
	 * process.stdout.write(content.replace(/\x1b/g, '\x1b\x1b'));
	 * process.stdout.write(tmux.end());
	 * ```
	 */
	begin(): string {
		return `${DCS}tmux;`;
	},

	/**
	 * End pass-through mode.
	 *
	 * @returns The ST string terminator
	 */
	end(): string {
		return ST;
	},
} as const;
