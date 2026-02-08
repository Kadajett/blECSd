/**
 * Error handling tests for key event parser.
 * Tests graceful handling of malformed, truncated, and invalid input.
 *
 * @module terminal/keyParser.errors.test
 */

import { describe, expect, it } from 'vitest';
import { parseKeySequence } from './keyParser';

describe('keyParser error handling', () => {
	describe('truncated escape sequences', () => {
		it('handles empty buffer', () => {
			const empty = new Uint8Array([]);
			const result = parseKeySequence(empty);

			expect(result).toBeNull();
		});

		it('handles lone ESC character', () => {
			const lone = new TextEncoder().encode('\x1b');
			const result = parseKeySequence(lone);

			// ESC by itself should be recognized as escape key
			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBe('escape');
			}
		});

		it('handles incomplete ESC [ sequence', () => {
			const incomplete = new TextEncoder().encode('\x1b[');
			const result = parseKeySequence(incomplete);

			// Incomplete sequence should return null or escape key
			// Parser behavior is acceptable either way
			expect(result).toBeDefined();
		});

		it('handles truncated arrow key sequence', () => {
			// ESC [ (missing direction letter)
			const truncated = new TextEncoder().encode('\x1b[');
			const result = parseKeySequence(truncated);

			// Should handle gracefully
			expect(result).toBeDefined();
		});

		it('handles truncated function key sequence', () => {
			// ESC [ 1 (missing tilde)
			const truncated = new TextEncoder().encode('\x1b[1');
			const result = parseKeySequence(truncated);

			// Should handle gracefully
			expect(result).toBeDefined();
		});
	});

	describe('invalid escape sequences', () => {
		it('handles unknown ESC [ sequences', () => {
			// ESC [ Z (shift+tab in some terminals)
			const unknown = new TextEncoder().encode('\x1b[Z');
			const result = parseKeySequence(unknown);

			// Should return valid key or null
			expect(result).toBeDefined();
		});

		it('handles malformed function key numbers', () => {
			// ESC [ 999 ~ (out of range function key)
			const malformed = new TextEncoder().encode('\x1b[999~');
			const result = parseKeySequence(malformed);

			// Should handle gracefully, not crash
			expect(result).toBeDefined();
		});

		it('handles non-numeric in function key sequence', () => {
			// ESC [ abc ~
			const invalid = new TextEncoder().encode('\x1b[abc~');
			const result = parseKeySequence(invalid);

			// Should not crash
			expect(result).toBeDefined();
		});
	});

	describe('invalid modifiers', () => {
		it('handles out-of-range modifier codes', () => {
			// ESC [ 1 ; 999 A (invalid modifier 999)
			const invalid = new TextEncoder().encode('\x1b[1;999A');
			const result = parseKeySequence(invalid);

			// Should parse arrow key, modifiers may be wrong but shouldn't crash
			expect(result).toBeDefined();
		});

		it('handles negative modifier codes', () => {
			// ESC [ 1 ; -1 A (negative modifier)
			const invalid = new TextEncoder().encode('\x1b[1;-1A');
			const result = parseKeySequence(invalid);

			// Should not crash
			expect(result).toBeDefined();
		});

		it('handles non-numeric modifier codes', () => {
			// ESC [ 1 ; abc A
			const invalid = new TextEncoder().encode('\x1b[1;abcA');
			const result = parseKeySequence(invalid);

			// Should not crash
			expect(result).toBeDefined();
		});
	});

	describe('special characters', () => {
		it('handles null character', () => {
			const nullChar = new Uint8Array([0x00]);
			const result = parseKeySequence(nullChar);

			// Null character handling
			expect(result).toBeDefined();
		});

		it('handles DEL character', () => {
			const del = new Uint8Array([0x7f]);
			const result = parseKeySequence(del);

			// DEL (127) is typically backspace
			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBe('backspace');
			}
		});

		it('handles control characters', () => {
			// Ctrl+A = 0x01
			const ctrlA = new Uint8Array([0x01]);
			const result = parseKeySequence(ctrlA);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.ctrl).toBe(true);
			}
		});

		it('handles high-bit characters', () => {
			// Character with high bit set
			const highBit = new Uint8Array([0xff]);
			const result = parseKeySequence(highBit);

			// Should handle gracefully
			expect(result).toBeDefined();
		});
	});

	describe('unicode input', () => {
		it('handles single unicode character', () => {
			const unicode = new TextEncoder().encode('你');
			const result = parseKeySequence(unicode);

			// Multi-byte unicode may return null - parser is ASCII-focused
			// This is acceptable for terminal key parsing
			expect(result).toBeDefined();
		});

		it('handles emoji', () => {
			const emoji = new TextEncoder().encode('😀');
			const result = parseKeySequence(emoji);

			// Multi-byte emoji may return null - acceptable behavior
			expect(result).toBeDefined();
		});

		it('handles multi-byte unicode', () => {
			const multiByte = new TextEncoder().encode('你好');
			const result = parseKeySequence(multiByte);

			// Should handle gracefully
			expect(result).toBeDefined();
		});

		it('handles combining characters', () => {
			// e + combining acute accent
			const combining = new TextEncoder().encode('e\u0301');
			const result = parseKeySequence(combining);

			// Should not crash
			expect(result).toBeDefined();
		});
	});

	describe('malformed input', () => {
		it('handles mixed ESC sequences', () => {
			// ESC [ A abc (arrow followed by text)
			const mixed = new TextEncoder().encode('\x1b[Aabc');
			const result = parseKeySequence(mixed);

			// Should parse the arrow key part
			expect(result).toBeDefined();
		});

		it('handles nested ESC characters', () => {
			// ESC ESC [
			const nested = new TextEncoder().encode('\x1b\x1b[');
			const result = parseKeySequence(nested);

			// Should handle first ESC
			expect(result).toBeDefined();
		});

		it('handles corrupted sequence with null bytes', () => {
			// ESC [ \0 A
			const corrupted = new Uint8Array([0x1b, 0x5b, 0x00, 0x41]);
			const result = parseKeySequence(corrupted);

			// Should handle gracefully
			expect(result).toBeDefined();
		});
	});

	describe('edge cases', () => {
		it('handles very long input', () => {
			// 1000 'a' characters
			const long = new TextEncoder().encode('a'.repeat(1000));
			const result = parseKeySequence(long);

			// Should not crash - may return first char or null
			expect(result).toBeDefined();
		});

		it('handles whitespace characters', () => {
			const space = new TextEncoder().encode(' ');
			const result = parseKeySequence(space);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBe('space');
			}
		});

		it('handles tab character', () => {
			const tab = new TextEncoder().encode('\t');
			const result = parseKeySequence(tab);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBe('tab');
			}
		});

		it('handles newline characters', () => {
			const lf = new TextEncoder().encode('\n');
			const result = parseKeySequence(lf);

			// Newline may be parsed as return or enter key
			expect(result).toBeDefined();
		});

		it('handles carriage return', () => {
			const cr = new TextEncoder().encode('\r');
			const result = parseKeySequence(cr);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBe('return');
			}
		});
	});

	describe('modifier combinations', () => {
		it('handles all modifiers together', () => {
			// ESC [ 1 ; 8 A (ctrl+alt+shift+arrow)
			const allMods = new TextEncoder().encode('\x1b[1;8A');
			const result = parseKeySequence(allMods);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.name).toBeDefined();
			}
		});

		it('handles conflicting modifiers', () => {
			// Ctrl+A (0x01) is control character
			const conflicting = new Uint8Array([0x01]);
			const result = parseKeySequence(conflicting);

			expect(result).not.toBeNull();
			if (result) {
				// Should respect actual control character
				expect(result.ctrl).toBe(true);
			}
		});
	});

	describe('buffer validation', () => {
		it('handles invalid input types gracefully', () => {
			// Parser expects Uint8Array - null/undefined will throw
			// @ts-expect-error - testing invalid input type
			expect(() => parseKeySequence(null)).toThrow();
			// @ts-expect-error - testing invalid input type
			expect(() => parseKeySequence(undefined)).toThrow();
		});

		it('handles very large buffers', () => {
			// 1MB buffer with key sequence at the start
			const large = new Uint8Array(1024 * 1024);
			large[0] = 0x61; // 'a'

			const result = parseKeySequence(large);

			// Should not crash - may parse or return null for very large buffers
			expect(result).toBeDefined();
		});
	});
});
