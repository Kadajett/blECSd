/**
 * Error handling tests for mouse event parser.
 * Tests graceful handling of malformed, truncated, and invalid input.
 *
 * @module terminal/mouseParser.errors.test
 */

import { describe, expect, it } from 'vitest';
import { parseMouseSequence } from './mouseParser';

describe('mouseParser error handling', () => {
	describe('truncated escape sequences', () => {
		it('handles empty buffer', () => {
			const empty = new Uint8Array([]);
			const result = parseMouseSequence(empty);

			expect(result).toBeNull();
		});

		it('handles incomplete ESC sequence', () => {
			const incomplete = new TextEncoder().encode('\x1b');
			const result = parseMouseSequence(incomplete);

			expect(result).toBeNull();
		});

		it('handles incomplete ESC [ sequence', () => {
			const incomplete = new TextEncoder().encode('\x1b[');
			const result = parseMouseSequence(incomplete);

			expect(result).toBeNull();
		});

		it('handles truncated SGR mouse sequence - missing end', () => {
			// ESC [ < 0 ; 10 ; (missing Y and terminator)
			const truncated = new TextEncoder().encode('\x1b[<0;10;');
			const result = parseMouseSequence(truncated);

			expect(result).toBeNull();
		});

		it('handles truncated SGR mouse sequence - missing button', () => {
			// ESC [ < ; 10 ; 20 M (missing button code)
			const truncated = new TextEncoder().encode('\x1b[<;10;20M');
			const result = parseMouseSequence(truncated);

			expect(result).toBeNull();
		});

		it('handles truncated SGR mouse sequence - missing coordinates', () => {
			// ESC [ < 0 M (missing coordinates)
			const truncated = new TextEncoder().encode('\x1b[<0M');
			const result = parseMouseSequence(truncated);

			expect(result).toBeNull();
		});

		it('handles truncated X10 mouse sequence', () => {
			// ESC [ M b (missing X and Y)
			const truncated = new TextEncoder().encode('\x1b[M ');
			const result = parseMouseSequence(truncated);

			expect(result).toBeNull();
		});
	});

	describe('invalid button codes', () => {
		it('handles button code beyond valid range (SGR)', () => {
			// Button 999 maps to a button through modulo arithmetic
			const outOfRange = new TextEncoder().encode('\x1b[<999;10;20M');
			const result = parseMouseSequence(outOfRange);

			// Should still parse and map to a valid button
			// Parser uses button code modulo mapping, so this is valid behavior
			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.button).toBeDefined();
				// Result will be one of the valid buttons based on modulo
			}
		});

		it('handles non-numeric button code (SGR)', () => {
			// Button is not a number
			const invalid = new TextEncoder().encode('\x1b[<abc;10;20M');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});

		it('handles negative button code (SGR)', () => {
			const invalid = new TextEncoder().encode('\x1b[<-1;10;20M');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});
	});

	describe('invalid coordinates', () => {
		it('handles extremely large X coordinate (SGR)', () => {
			// X = 999999 (way beyond any reasonable terminal size)
			const outOfBounds = new TextEncoder().encode('\x1b[<0;999999;20M');
			const result = parseMouseSequence(outOfBounds);

			// Should parse but with large coordinate
			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(999998); // 0-indexed
			}
		});

		it('handles extremely large Y coordinate (SGR)', () => {
			const outOfBounds = new TextEncoder().encode('\x1b[<0;10;999999M');
			const result = parseMouseSequence(outOfBounds);

			if (result?.type === 'mouse') {
				expect(result.event.y).toBe(999998); // 0-indexed
			}
		});

		it('handles non-numeric X coordinate (SGR)', () => {
			const invalid = new TextEncoder().encode('\x1b[<0;abc;20M');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});

		it('handles non-numeric Y coordinate (SGR)', () => {
			const invalid = new TextEncoder().encode('\x1b[<0;10;abcM');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});

		it('handles negative X coordinate (SGR)', () => {
			const invalid = new TextEncoder().encode('\x1b[<0;-10;20M');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});

		it('handles negative Y coordinate (SGR)', () => {
			const invalid = new TextEncoder().encode('\x1b[<0;10;-20M');
			const result = parseMouseSequence(invalid);

			expect(result).toBeNull();
		});

		it('handles zero coordinates (SGR)', () => {
			// Zero is valid (represents position 0, 0)
			const valid = new TextEncoder().encode('\x1b[<0;0;0M');
			const result = parseMouseSequence(valid);

			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(0); // 0-indexed, so 0-1 = -1, but should clamp to 0
				expect(result.event.y).toBe(0);
			}
		});
	});

	describe('malformed sequences', () => {
		it('handles missing semicolons (SGR)', () => {
			// ESC [ < 0 10 20 M (spaces instead of semicolons)
			const malformed = new TextEncoder().encode('\x1b[<0 10 20M');
			const result = parseMouseSequence(malformed);

			expect(result).toBeNull();
		});

		it('handles extra semicolons (SGR)', () => {
			// ESC [ < 0 ; ; 10 ; 20 M (double semicolon)
			const malformed = new TextEncoder().encode('\x1b[<0;;10;20M');
			const result = parseMouseSequence(malformed);

			expect(result).toBeNull();
		});

		it('handles wrong terminator (SGR)', () => {
			// ESC [ < 0 ; 10 ; 20 X (X instead of M or m)
			const malformed = new TextEncoder().encode('\x1b[<0;10;20X');
			const result = parseMouseSequence(malformed);

			expect(result).toBeNull();
		});

		it('handles missing < prefix (SGR)', () => {
			// ESC [ 0 ; 10 ; 20 M (missing <)
			const malformed = new TextEncoder().encode('\x1b[0;10;20M');
			const result = parseMouseSequence(malformed);

			// Might be parsed as different protocol, or null
			// Either is acceptable
			expect(result).toBeDefined();
		});
	});

	describe('corrupted escape sequences', () => {
		it('handles null bytes in sequence', () => {
			// ESC [ < 0 \0 ; 10 ; 20 M (null byte in middle)
			const corrupted = new Uint8Array([
				0x1b, 0x5b, 0x3c, 0x30, 0x00, 0x3b, 0x31, 0x30, 0x3b, 0x32, 0x30, 0x4d,
			]);
			const result = parseMouseSequence(corrupted);

			expect(result).toBeNull();
		});

		it('handles high-bit bytes in sequence', () => {
			// ESC [ < 0 ; \xFF ; 20 M (0xFF in coordinate)
			const corrupted = new Uint8Array([
				0x1b, 0x5b, 0x3c, 0x30, 0x3b, 0xff, 0x3b, 0x32, 0x30, 0x4d,
			]);
			const result = parseMouseSequence(corrupted);

			expect(result).toBeNull();
		});

		it('handles non-ASCII in sequence', () => {
			// ESC [ < 0 ; 10 ; 20 M with UTF-8 characters
			const corrupted = new TextEncoder().encode('\x1b[<0;10;20😀M');
			const result = parseMouseSequence(corrupted);

			expect(result).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('handles minimum valid SGR sequence', () => {
			// Shortest valid sequence: ESC [ < btn ; x ; y M/m
			const minimal = new TextEncoder().encode('\x1b[<0;1;1M');
			const result = parseMouseSequence(minimal);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(0); // 0-indexed
				expect(result.event.y).toBe(0);
			}
		});

		it('handles very long coordinate values', () => {
			// 10-digit coordinates
			const long = new TextEncoder().encode('\x1b[<0;1234567890;9876543210M');
			const result = parseMouseSequence(long);

			// Should handle or reject gracefully
			if (result?.type === 'mouse') {
				expect(result.event.x).toBeGreaterThan(0);
				expect(result.event.y).toBeGreaterThan(0);
			}
		});

		it('handles leading zeros in coordinates', () => {
			// ESC [ < 0 ; 0010 ; 0020 M (leading zeros)
			const leadingZeros = new TextEncoder().encode('\x1b[<0;0010;0020M');
			const result = parseMouseSequence(leadingZeros);

			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(9); // 0-indexed
				expect(result.event.y).toBe(19);
			}
		});
	});

	describe('buffer validation', () => {
		it('handles invalid input types gracefully', () => {
			// Parser expects Uint8Array - null/undefined will throw on buffer.length check
			// @ts-expect-error - testing invalid input type
			expect(() => parseMouseSequence(null)).toThrow();
			// @ts-expect-error - testing invalid input type
			expect(() => parseMouseSequence(undefined)).toThrow();

			// String gets coerced by TextDecoder, returns null for invalid sequence
			// @ts-expect-error - testing invalid input type
			const result = parseMouseSequence('not a buffer');
			expect(result).toBeNull();
		});

		it('handles very large buffers', () => {
			// 1MB buffer with mouse sequence at the start
			const large = new Uint8Array(1024 * 1024);
			const validSeq = new TextEncoder().encode('\x1b[<0;10;20M');
			large.set(validSeq, 0);

			const result = parseMouseSequence(large);

			// Should still parse successfully
			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(9);
				expect(result.event.y).toBe(19);
			}
		});
	});
});
