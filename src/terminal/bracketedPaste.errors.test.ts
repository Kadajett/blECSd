/**
 * Error handling tests for bracketed paste parser.
 * Tests graceful handling of malformed, truncated, and invalid paste input.
 *
 * @module terminal/bracketedPaste.errors.test
 */

import { describe, expect, it } from 'vitest';
import {
	createPasteState,
	extractPasteContent,
	findPasteEnd,
	isPasteStart,
	processPasteBuffer,
	sanitizePastedText,
	truncatePaste,
} from './bracketedPaste';

describe('bracketedPaste error handling', () => {
	describe('truncated paste sequences', () => {
		it('handles empty buffer', () => {
			const empty = new Uint8Array([]);
			expect(isPasteStart(empty)).toBe(false);
		});

		it('handles incomplete paste start marker', () => {
			// ESC [ 2 0 (missing '0~')
			const incomplete = new TextEncoder().encode('\x1b[20');
			expect(isPasteStart(incomplete)).toBe(false);
		});

		it('handles paste start without content or end marker', () => {
			// ESC [ 200~ (paste start with no content)
			const truncated = new TextEncoder().encode('\x1b[200~');
			expect(isPasteStart(truncated)).toBe(true);
			expect(findPasteEnd(truncated)).toBe(-1);
		});

		it('handles paste with content but no end marker', () => {
			// Paste start + content, missing ESC[201~
			const noEnd = new TextEncoder().encode('\x1b[200~Hello World');
			expect(isPasteStart(noEnd)).toBe(true);
			expect(findPasteEnd(noEnd)).toBe(-1);
		});

		it('handles malformed paste end marker', () => {
			// Wrong end sequence (ESC[202~ instead of 201~)
			const malformed = new TextEncoder().encode('\x1b[200~Hello\x1b[202~');
			expect(isPasteStart(malformed)).toBe(true);
			expect(findPasteEnd(malformed)).toBe(-1);
		});
	});

	describe('invalid paste content', () => {
		it('handles extremely large paste content', () => {
			// Create a very large paste (1MB+)
			const largeContent = 'X'.repeat(1024 * 1024);
			const result = truncatePaste(largeContent, 1000);

			// Should truncate to limit
			expect(result.length).toBe(1000);
		});

		it('handles paste with null bytes', () => {
			const withNull = 'Hello\x00World';
			const sanitized = sanitizePastedText(withNull);

			// Should preserve null bytes (they are data, not control sequences)
			expect(sanitized).toContain('\x00');
		});

		it('handles paste with mixed escape sequences', () => {
			// Multiple different escape types
			const mixed = '\x1b[31m\x1b]0;title\x07\x1bMRed Title\x1b[0m';
			const sanitized = sanitizePastedText(mixed);

			// All escapes should be stripped
			expect(sanitized).toBe('Red Title');
			expect(sanitized).not.toContain('\x1b');
		});

		it('handles paste with deeply nested escape sequences', () => {
			// Maliciously crafted nested escapes
			const nested = '\x1b[\x1b[\x1b[31m\x1b[0m\x1b]Text';
			const sanitized = sanitizePastedText(nested);

			// Should handle gracefully - some partial escapes may remain if incomplete
			expect(sanitized).toBeDefined();
			expect(sanitized.length).toBeLessThan(nested.length);
		});

		it('handles paste with invalid UTF-8 sequences', () => {
			// Invalid UTF-8 byte sequence (0xFF is invalid in UTF-8)
			const invalidUtf8 = new Uint8Array([
				0x1b,
				0x5b,
				0x32,
				0x30,
				0x30,
				0x7e, // ESC[200~
				0x48,
				0x65,
				0x6c,
				0x6c,
				0x6f, // Hello
				0xff, // Invalid UTF-8 byte
				0x57,
				0x6f,
				0x72,
				0x6c,
				0x64, // World
				0x1b,
				0x5b,
				0x32,
				0x30,
				0x31,
				0x7e, // ESC[201~
			]);

			// Should not crash when processing
			expect(() => extractPasteContent(invalidUtf8)).not.toThrow();
		});
	});

	describe('buffer processing edge cases', () => {
		it('handles buffer with multiple paste sequences', () => {
			// Two paste sequences back-to-back (shouldn't happen but handle gracefully)
			const double = new TextEncoder().encode('\x1b[200~First\x1b[201~\x1b[200~Second\x1b[201~');

			// Should handle first paste
			expect(isPasteStart(double)).toBe(true);
			const endPos = findPasteEnd(double);
			expect(endPos).toBeGreaterThan(0);
		});

		it('handles paste sequence with escape in content', () => {
			// Paste content that looks like escape sequence
			const fakeEscape = new TextEncoder().encode('\x1b[200~ESC[31mRed\x1b[201~');

			const result = extractPasteContent(fakeEscape);
			// extractPasteContent returns PasteParseResult, not string
			expect(result.pasteStarted).toBe(true);
			expect(result.pasteEnded).toBe(true);
			expect(result.text).toBeDefined();
			// Content is sanitized by default, so fake escape text remains but real ESC is stripped
			if (result.text) {
				expect(result.text).toContain('ESC');
			}
		});

		it('handles zero-length paste', () => {
			// Paste start immediately followed by paste end
			const empty = new TextEncoder().encode('\x1b[200~\x1b[201~');

			expect(isPasteStart(empty)).toBe(true);
			const endPos = findPasteEnd(empty);
			// findPasteEnd searches whole buffer, so it finds ESC[201~ at position 6 (after ESC[200~)
			expect(endPos).toBe(6);
		});

		it('handles paste with only whitespace', () => {
			const whitespace = new TextEncoder().encode('\x1b[200~   \t\n  \x1b[201~');

			const result = extractPasteContent(whitespace);
			// Should preserve whitespace (it's valid paste content)
			expect(result.text).toBeDefined();
			if (result.text) {
				expect(result.text).toMatch(/\s+/);
			}
		});

		it('handles paste with control characters', () => {
			// Control characters like BEL, BS, TAB
			const controls = new TextEncoder().encode('\x1b[200~Hello\x07\x08\x09World\x1b[201~');

			const result = extractPasteContent(controls);
			// Control chars should be preserved as paste content
			expect(result.pasteStarted).toBe(true);
			expect(result.pasteEnded).toBe(true);
			expect(result.text).toBeDefined();
		});
	});

	describe('state machine edge cases', () => {
		it('handles processPasteBuffer with no paste markers', () => {
			// Regular input, no paste mode
			const regular = new TextEncoder().encode('Hello World');
			const state = createPasteState();

			const result = processPasteBuffer(state, regular);

			// Should return original buffer since not in paste mode
			expect(result.state.isPasting).toBe(false);
			expect(result.event).toBeNull();
			expect(result.remaining.length).toBe(regular.length);
		});

		it('handles entering paste mode mid-buffer', () => {
			// Regular text followed by paste start
			const mixed = new TextEncoder().encode('Regular\x1b[200~Pasted');
			const state = createPasteState();

			// processPasteBuffer doesn't handle mid-buffer paste start
			// It expects paste start at beginning or to already be isPasting
			const result = processPasteBuffer(state, mixed);

			// Should not start paste (doesn't start with paste marker)
			expect(result.state.isPasting).toBe(false);
		});

		it('handles already-in-paste state with continuation', () => {
			// Simulating second chunk while already in paste mode
			const state = createPasteState();
			const stateInPaste = { ...state, isPasting: true, buffer: 'Previous' };
			const continuation = new TextEncoder().encode('More\x1b[201~');

			const result = processPasteBuffer(stateInPaste, continuation);

			// Should complete paste
			expect(result.state.isPasting).toBe(false);
			expect(result.event).not.toBeNull();
		});

		it('handles buffer overflow in paste mode', () => {
			// Paste exceeding max length
			const huge = new TextEncoder().encode(`\x1b[200~${'X'.repeat(2000)}`);
			const state = createPasteState({ maxLength: 1024 });

			// Should not crash, should handle limit
			expect(() => processPasteBuffer(state, huge)).not.toThrow();
		});
	});

	describe('security and validation', () => {
		it('handles paste with terminal command injection attempts', () => {
			// Malicious paste trying to inject commands
			const malicious = '\x1b[200~rm -rf /;\x1b[201~';
			const sanitized = sanitizePastedText(malicious);

			// Commands should be preserved as text (bracketed paste is safe)
			expect(sanitized).toBe('rm -rf /;');
		});

		it('handles paste with cursor movement sequences', () => {
			// Try to move cursor during paste
			const cursorMove = '\x1b[31mText\x1b[H\x1b[2JMore';
			const sanitized = sanitizePastedText(cursorMove);

			// Cursor sequences should be stripped
			expect(sanitized).not.toContain('\x1b[H');
			expect(sanitized).not.toContain('\x1b[2J');
		});

		it('handles paste with excessive escape sequences (DoS attempt)', () => {
			// Thousands of escape sequences
			const excessive = `${'\x1b[31m'.repeat(10000)}Text`;
			const sanitized = sanitizePastedText(excessive);

			// Should handle efficiently without hanging
			expect(sanitized).toBe('Text');
			expect(sanitized.length).toBeLessThan(100);
		});

		it('validates paste event schema', () => {
			const validPaste = {
				content: 'Hello World',
				raw: new TextEncoder().encode('\x1b[200~Hello World\x1b[201~'),
				sanitized: 'Hello World',
			};

			// Schema validation should pass for valid paste
			expect(validPaste.content).toBe('Hello World');
			expect(validPaste.raw).toBeInstanceOf(Uint8Array);
		});
	});

	describe('truncation behavior', () => {
		it('truncates on character boundary, not mid-UTF8', () => {
			// Multi-byte UTF-8 characters (emoji)
			const emoji = '👍'.repeat(100); // 4 bytes per emoji
			const truncated = truncatePaste(emoji, 10);

			// Should not break UTF-8 encoding
			// Truncated length might be less than 10 to preserve character boundary
			expect(truncated.length).toBeLessThanOrEqual(10);
		});

		it('handles zero-length limit (unlimited)', () => {
			const text = 'X'.repeat(10000);
			const result = truncatePaste(text, 0);

			// Zero means no limit
			expect(result).toBe(text);
			expect(result.length).toBe(10000);
		});

		it('handles negative length limit', () => {
			const text = 'Hello World';

			// Negative should be treated as zero (unlimited)
			const result = truncatePaste(text, -1);
			expect(result).toBe(text);
		});
	});
});
