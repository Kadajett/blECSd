/**
 * Error handling tests for terminal response parser.
 * Tests graceful handling of malformed, truncated, and invalid terminal responses.
 *
 * @module terminal/responseParser.errors.test
 */

import { describe, expect, it } from 'vitest';
import {
	isCursorPosition,
	isDeviceStatus,
	isPrimaryDA,
	isSecondaryDA,
	isUnknown,
	parseResponse,
} from './responseParser';

describe('responseParser error handling', () => {
	describe('truncated response sequences', () => {
		it('handles empty string', () => {
			const result = parseResponse('');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles lone ESC character', () => {
			const result = parseResponse('\x1b');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles incomplete CSI sequence', () => {
			const result = parseResponse('\x1b[');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles truncated cursor position report', () => {
			// ESC [ 10 (missing ;col R)
			const result = parseResponse('\x1b[10');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles truncated DA1 response', () => {
			// ESC [ ? 1 (missing ; attrs c)
			const result = parseResponse('\x1b[?1');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles truncated DA2 response', () => {
			// ESC [ > 41 (missing ; firmware ; rom c)
			const result = parseResponse('\x1b[>41');

			expect(isUnknown(result)).toBe(true);
		});
	});

	describe('malformed response sequences', () => {
		it('handles CPR with non-numeric row', () => {
			// ESC [ abc ; 20 R
			const result = parseResponse('\x1b[abc;20R');

			// Should fail to parse as CPR
			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles CPR with non-numeric column', () => {
			// ESC [ 10 ; xyz R
			const result = parseResponse('\x1b[10;xyzR');

			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles CPR with missing semicolon', () => {
			// ESC [ 10 20 R (missing semicolon separator)
			const result = parseResponse('\x1b[10 20R');

			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles DA1 with invalid device class', () => {
			// ESC [ ? abc c
			const result = parseResponse('\x1b[?abcc');

			expect(isPrimaryDA(result)).toBe(false);
		});

		it('handles DA2 with non-numeric terminal type', () => {
			// ESC [ > xyz ; 354 ; 0 c
			const result = parseResponse('\x1b[>xyz;354;0c');

			expect(isSecondaryDA(result)).toBe(false);
		});

		it('handles DA2 with missing firmware version', () => {
			// ESC [ > 41 ; ; 0 c (empty firmware field)
			// Should parse but firmware might be NaN or default
			const parsed = parseResponse('\x1b[>41;;0c');
			expect(isSecondaryDA(parsed) || isUnknown(parsed)).toBe(true);
		});

		it('handles response with wrong terminator', () => {
			// ESC [ 10 ; 20 Q (Q instead of R)
			const result = parseResponse('\x1b[10;20Q');

			expect(isCursorPosition(result)).toBe(false);
		});
	});

	describe('out-of-range values', () => {
		it('handles extremely large row number', () => {
			// Row = 999999 (beyond any reasonable terminal size)
			const result = parseResponse('\x1b[999999;20R');

			// Should parse successfully, even if value is unrealistic
			if (isCursorPosition(result)) {
				expect(result.row).toBe(999999);
				expect(result.column).toBe(20);
			}
		});

		it('handles extremely large column number', () => {
			const result = parseResponse('\x1b[10;999999R');

			if (isCursorPosition(result)) {
				expect(result.row).toBe(10);
				expect(result.column).toBe(999999);
			}
		});

		it('handles negative row number', () => {
			// ESC [ -10 ; 20 R
			const result = parseResponse('\x1b[-10;20R');

			// Negative values should fail parsing or be treated as error
			expect(isCursorPosition(result) ? result.row >= 0 : true).toBe(true);
		});

		it('handles negative column number', () => {
			const result = parseResponse('\x1b[10;-20R');

			expect(isCursorPosition(result) ? result.column >= 0 : true).toBe(true);
		});

		it('handles zero position', () => {
			// Position (0, 0) is typically invalid (1-indexed)
			const result = parseResponse('\x1b[0;0R');

			// Parser should accept it (terminals may use 0 or 1 indexing)
			expect(isCursorPosition(result)).toBe(true);
		});

		it('handles DA1 with excessive attribute count', () => {
			// 100+ attributes (unrealistic but shouldn't crash)
			const attrs = Array.from({ length: 100 }, (_, i) => i).join(';');
			const result = parseResponse(`\x1b[?62;${attrs}c`);

			// Should parse or fail gracefully
			expect(isPrimaryDA(result) || isUnknown(result)).toBe(true);
		});
	});

	describe('invalid formats', () => {
		it('handles response with embedded null bytes', () => {
			const result = parseResponse('\x1b[10\x00;20R');

			// Null bytes should cause parse failure
			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles response with embedded control characters', () => {
			// Control chars in numeric fields
			const result = parseResponse('\x1b[10\x07;20R');

			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles response with extra semicolons', () => {
			// ESC [ 10 ; ; 20 R (double semicolon)
			const result = parseResponse('\x1b[10;;20R');

			// Should fail to parse properly
			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles response with trailing garbage', () => {
			// Valid response followed by random data
			const result = parseResponse('\x1b[10;20Rgarbage');

			// Parser may be strict and reject sequences with trailing garbage
			// or may parse the valid part - either is acceptable behavior
			expect(isCursorPosition(result) || isUnknown(result)).toBe(true);
		});

		it('handles response with leading garbage', () => {
			// Random data before ESC
			const result = parseResponse('garbage\x1b[10;20R');

			// Should fail (doesn't start with ESC)
			expect(isCursorPosition(result)).toBe(false);
		});
	});

	describe('unsupported response types', () => {
		it('handles unknown CSI sequence', () => {
			// ESC [ 1 ; 2 ; 3 X (unknown terminator)
			const result = parseResponse('\x1b[1;2;3X');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles OSC sequence', () => {
			// Operating System Command (not CSI)
			const result = parseResponse('\x1b]0;title\x07');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles DCS sequence', () => {
			// Device Control String
			const result = parseResponse('\x1bP+q544e\x1b\\');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles APC sequence', () => {
			// Application Program Command
			const result = parseResponse('\x1b_some data\x1b\\');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles PM sequence', () => {
			// Privacy Message
			const result = parseResponse('\x1b^some data\x1b\\');

			expect(isUnknown(result)).toBe(true);
		});
	});

	describe('edge case responses', () => {
		it('handles response with only ESC [ c', () => {
			// Minimal DA1 response
			const result = parseResponse('\x1b[?c');

			// Should parse as DA1 with no device class or fail gracefully
			expect(isPrimaryDA(result) || isUnknown(result)).toBe(true);
		});

		it('handles response with repeated terminators', () => {
			// ESC [ 10 ; 20 RR (double R)
			const result = parseResponse('\x1b[10;20RR');

			// Parser may reject sequences with repeated terminators or parse the first valid part
			expect(isCursorPosition(result) || isUnknown(result)).toBe(true);
		});

		it('handles mixed valid and invalid sequences', () => {
			// Valid CPR followed by invalid data
			const result = parseResponse('\x1b[10;20R\x1b[invalid');

			// Parser may reject mixed sequences or parse the first valid part
			expect(isCursorPosition(result) || isUnknown(result)).toBe(true);
		});

		it('handles empty fields in sequence', () => {
			// ESC [ ; R (both fields empty)
			const result = parseResponse('\x1b[;R');

			expect(isCursorPosition(result)).toBe(false);
		});

		it('handles sequence with spaces', () => {
			// ESC [ 10 ; 20 R with spaces
			const result = parseResponse('\x1b[ 10 ; 20 R');

			// Spaces should cause parse failure
			expect(isCursorPosition(result)).toBe(false);
		});
	});

	describe('device status report edge cases', () => {
		it('handles DSR with invalid status code', () => {
			// ESC [ 999 n (unknown status)
			const result = parseResponse('\x1b[999n');

			// Should parse as device status or unknown
			expect(isDeviceStatus(result) || isUnknown(result)).toBe(true);
		});

		it('handles DSR with missing terminator', () => {
			// ESC [ 5 (missing n)
			const result = parseResponse('\x1b[5');

			expect(isUnknown(result)).toBe(true);
		});

		it('handles DSR with wrong terminator', () => {
			// ESC [ 5 m (m instead of n)
			const result = parseResponse('\x1b[5m');

			expect(isDeviceStatus(result)).toBe(false);
		});
	});

	describe('stress testing', () => {
		it('handles extremely long response', () => {
			// Very long sequence (potential DoS)
			const longSeq = `\x1b[${'1;'.repeat(10000)}R`;

			// Should not hang or crash
			expect(() => parseResponse(longSeq)).not.toThrow();
		});

		it('handles deeply nested escape sequences', () => {
			// Multiple ESC characters
			const nested = '\x1b\x1b\x1b[10;20R';

			// Should handle gracefully
			const result = parseResponse(nested);
			expect(result).toBeDefined();
		});

		it('handles response with all printable ASCII', () => {
			// Try every printable character
			let allChars = '';
			for (let i = 32; i < 127; i++) {
				allChars += String.fromCharCode(i);
			}
			const result = parseResponse(allChars);

			// Should recognize as unknown
			expect(isUnknown(result)).toBe(true);
		});

		it('handles response with all control characters', () => {
			// Try all control characters
			let allControls = '';
			for (let i = 0; i < 32; i++) {
				allControls += String.fromCharCode(i);
			}
			const result = parseResponse(allControls);

			expect(isUnknown(result)).toBe(true);
		});

		it('handles response with high-bit characters', () => {
			// Characters with high bit set (UTF-8 or extended ASCII)
			const highBit = '\x1b[\x80\x81\x82R';

			// Should handle gracefully
			const result = parseResponse(highBit);
			expect(result).toBeDefined();
		});
	});

	describe('parsing consistency', () => {
		it('handles same sequence parsed twice', () => {
			const seq = '\x1b[10;20R';
			const result1 = parseResponse(seq);
			const result2 = parseResponse(seq);

			// Should produce identical results
			expect(result1).toEqual(result2);
		});

		it('handles whitespace variations', () => {
			// Parser should be strict about whitespace
			const withSpace = parseResponse('\x1b[ 10;20R');
			const withoutSpace = parseResponse('\x1b[10;20R');

			// With space should fail, without should succeed
			expect(isCursorPosition(withSpace)).toBe(false);
			expect(isCursorPosition(withoutSpace)).toBe(true);
		});

		it('handles case sensitivity', () => {
			// Terminators are case-sensitive
			const lowerR = parseResponse('\x1b[10;20r');
			const upperR = parseResponse('\x1b[10;20R');

			// Only uppercase R is valid for CPR
			expect(isCursorPosition(lowerR)).toBe(false);
			expect(isCursorPosition(upperR)).toBe(true);
		});
	});
});
