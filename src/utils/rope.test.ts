/**
 * Tests for Rope Data Structure
 *
 * @module utils/rope.test
 */

import { describe, expect, it } from 'vitest';
import {
	append,
	charAt,
	createEmptyRope,
	createRope,
	deleteRange,
	getLength,
	getLine,
	getLineCount,
	getLineEnd,
	getLineForIndex,
	getLines,
	getLineStart,
	getNewlineCount,
	getStats,
	getText,
	insert,
	isEmpty,
	LEAF_MAX_SIZE,
	prepend,
	replaceRange,
	substring,
	verify,
} from './rope';

// =============================================================================
// CREATION TESTS
// =============================================================================

describe('createRope', () => {
	it('creates empty rope from empty string', () => {
		const rope = createRope('');
		expect(getLength(rope)).toBe(0);
		expect(isEmpty(rope)).toBe(true);
	});

	it('creates rope from short string', () => {
		const rope = createRope('Hello');
		expect(getLength(rope)).toBe(5);
		expect(getText(rope)).toBe('Hello');
	});

	it('creates rope from string with newlines', () => {
		const rope = createRope('Line 1\nLine 2\nLine 3');
		expect(getNewlineCount(rope)).toBe(2);
		expect(getLineCount(rope)).toBe(3);
	});

	it('creates balanced rope from long string', () => {
		const longText = 'x'.repeat(LEAF_MAX_SIZE * 5);
		const rope = createRope(longText);
		expect(getLength(rope)).toBe(longText.length);
		expect(getText(rope)).toBe(longText);
		expect(verify(rope)).toBe(true);
	});
});

describe('createEmptyRope', () => {
	it('creates empty rope', () => {
		const rope = createEmptyRope();
		expect(isEmpty(rope)).toBe(true);
		expect(getLength(rope)).toBe(0);
	});
});

// =============================================================================
// QUERY TESTS
// =============================================================================

describe('getLength', () => {
	it('returns 0 for empty rope', () => {
		expect(getLength(createRope(''))).toBe(0);
	});

	it('returns correct length', () => {
		expect(getLength(createRope('Hello'))).toBe(5);
	});
});

describe('getNewlineCount', () => {
	it('returns 0 for text without newlines', () => {
		expect(getNewlineCount(createRope('Hello'))).toBe(0);
	});

	it('counts newlines correctly', () => {
		expect(getNewlineCount(createRope('a\nb\nc'))).toBe(2);
	});

	it('handles trailing newline', () => {
		expect(getNewlineCount(createRope('a\n'))).toBe(1);
	});
});

describe('getLineCount', () => {
	it('returns 1 for empty rope', () => {
		expect(getLineCount(createRope(''))).toBe(1);
	});

	it('returns 1 for text without newlines', () => {
		expect(getLineCount(createRope('Hello'))).toBe(1);
	});

	it('counts lines correctly', () => {
		expect(getLineCount(createRope('a\nb\nc'))).toBe(3);
	});
});

describe('charAt', () => {
	const rope = createRope('Hello, World!');

	it('returns character at index', () => {
		expect(charAt(rope, 0)).toBe('H');
		expect(charAt(rope, 7)).toBe('W');
		expect(charAt(rope, 12)).toBe('!');
	});

	it('returns undefined for negative index', () => {
		expect(charAt(rope, -1)).toBeUndefined();
	});

	it('returns undefined for index >= length', () => {
		expect(charAt(rope, 13)).toBeUndefined();
		expect(charAt(rope, 100)).toBeUndefined();
	});
});

describe('substring', () => {
	const rope = createRope('Hello, World!');

	it('extracts substring', () => {
		expect(substring(rope, 0, 5)).toBe('Hello');
		expect(substring(rope, 7, 12)).toBe('World');
	});

	it('handles start >= end', () => {
		expect(substring(rope, 5, 5)).toBe('');
		expect(substring(rope, 5, 3)).toBe('');
	});

	it('defaults end to length', () => {
		expect(substring(rope, 7)).toBe('World!');
	});

	it('clamps negative start', () => {
		expect(substring(rope, -5, 5)).toBe('Hello');
	});

	it('clamps end > length', () => {
		expect(substring(rope, 7, 100)).toBe('World!');
	});

	it('works with large ropes', () => {
		const text = 'abcdefghij'.repeat(1000);
		const largeRope = createRope(text);
		expect(substring(largeRope, 5000, 5010)).toBe('abcdefghij');
	});
});

describe('getText', () => {
	it('returns empty string for empty rope', () => {
		expect(getText(createRope(''))).toBe('');
	});

	it('returns full text', () => {
		const text = 'Hello, World!';
		expect(getText(createRope(text))).toBe(text);
	});

	it('reconstructs long text correctly', () => {
		const text = 'Line\n'.repeat(1000);
		expect(getText(createRope(text))).toBe(text);
	});
});

// =============================================================================
// LINE OPERATION TESTS
// =============================================================================

describe('getLineForIndex', () => {
	const rope = createRope('Line 1\nLine 2\nLine 3');

	it('returns 0 for index in first line', () => {
		expect(getLineForIndex(rope, 0)).toBe(0);
		expect(getLineForIndex(rope, 5)).toBe(0);
	});

	it('returns correct line for later positions', () => {
		expect(getLineForIndex(rope, 7)).toBe(1); // Start of Line 2
		expect(getLineForIndex(rope, 14)).toBe(2); // Start of Line 3
	});

	it('handles index at newline', () => {
		expect(getLineForIndex(rope, 6)).toBe(0); // At first \n
	});

	it('handles negative index', () => {
		expect(getLineForIndex(rope, -1)).toBe(0);
	});

	it('handles index >= length', () => {
		expect(getLineForIndex(rope, 100)).toBe(2);
	});
});

describe('getLineStart', () => {
	const rope = createRope('Line 1\nLine 2\nLine 3');

	it('returns 0 for line 0', () => {
		expect(getLineStart(rope, 0)).toBe(0);
	});

	it('returns correct start for other lines', () => {
		expect(getLineStart(rope, 1)).toBe(7); // After "Line 1\n"
		expect(getLineStart(rope, 2)).toBe(14); // After "Line 1\nLine 2\n"
	});

	it('returns -1 for negative line', () => {
		expect(getLineStart(rope, -1)).toBe(-1);
	});

	it('returns -1 for line > total lines', () => {
		expect(getLineStart(rope, 5)).toBe(-1);
	});
});

describe('getLineEnd', () => {
	const rope = createRope('Line 1\nLine 2\nLine 3');

	it('returns newline position for first line', () => {
		expect(getLineEnd(rope, 0)).toBe(6);
	});

	it('returns correct end for other lines', () => {
		expect(getLineEnd(rope, 1)).toBe(13);
	});

	it('returns length for last line', () => {
		expect(getLineEnd(rope, 2)).toBe(20);
	});

	it('returns -1 for invalid lines', () => {
		expect(getLineEnd(rope, -1)).toBe(-1);
		expect(getLineEnd(rope, 5)).toBe(-1);
	});
});

describe('getLine', () => {
	const rope = createRope('Line 1\nLine 2\nLine 3');

	it('gets first line', () => {
		const line = getLine(rope, 0);
		expect(line).toBeDefined();
		expect(line?.text).toBe('Line 1');
		expect(line?.start).toBe(0);
		expect(line?.end).toBe(6);
		expect(line?.lineNumber).toBe(0);
	});

	it('gets middle line', () => {
		const line = getLine(rope, 1);
		expect(line?.text).toBe('Line 2');
		expect(line?.start).toBe(7);
		expect(line?.end).toBe(13);
	});

	it('gets last line', () => {
		const line = getLine(rope, 2);
		expect(line?.text).toBe('Line 3');
		expect(line?.start).toBe(14);
		expect(line?.end).toBe(20);
	});

	it('returns undefined for invalid line', () => {
		expect(getLine(rope, -1)).toBeUndefined();
		expect(getLine(rope, 5)).toBeUndefined();
	});
});

describe('getLines', () => {
	const rope = createRope('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

	it('gets range of lines', () => {
		const lines = getLines(rope, 1, 4);
		expect(lines).toHaveLength(3);
		expect(lines[0]?.text).toBe('Line 2');
		expect(lines[1]?.text).toBe('Line 3');
		expect(lines[2]?.text).toBe('Line 4');
	});

	it('handles out of bounds end', () => {
		const lines = getLines(rope, 3, 100);
		expect(lines).toHaveLength(2);
		expect(lines[0]?.text).toBe('Line 4');
		expect(lines[1]?.text).toBe('Line 5');
	});

	it('returns empty for invalid range', () => {
		expect(getLines(rope, 5, 3)).toHaveLength(0);
	});
});

// =============================================================================
// MUTATION TESTS
// =============================================================================

describe('insert', () => {
	it('inserts at beginning', () => {
		const rope = createRope('World');
		const result = insert(rope, 0, 'Hello ');
		expect(getText(result)).toBe('Hello World');
	});

	it('inserts in middle', () => {
		const rope = createRope('Hello World');
		const result = insert(rope, 6, 'Beautiful ');
		expect(getText(result)).toBe('Hello Beautiful World');
	});

	it('inserts at end', () => {
		const rope = createRope('Hello');
		const result = insert(rope, 5, ' World');
		expect(getText(result)).toBe('Hello World');
	});

	it('handles empty insert', () => {
		const rope = createRope('Hello');
		const result = insert(rope, 2, '');
		expect(getText(result)).toBe('Hello');
	});

	it('clamps negative index', () => {
		const rope = createRope('World');
		const result = insert(rope, -5, 'Hello ');
		expect(getText(result)).toBe('Hello World');
	});

	it('clamps index > length', () => {
		const rope = createRope('Hello');
		const result = insert(rope, 100, ' World');
		expect(getText(result)).toBe('Hello World');
	});

	it('maintains validity after many inserts', () => {
		let rope = createRope('');
		for (let i = 0; i < 100; i++) {
			rope = insert(rope, i, 'x');
		}
		expect(getLength(rope)).toBe(100);
		expect(verify(rope)).toBe(true);
	});
});

describe('append', () => {
	it('appends text', () => {
		const rope = createRope('Hello');
		const result = append(rope, ' World');
		expect(getText(result)).toBe('Hello World');
	});

	it('appends to empty rope', () => {
		const rope = createEmptyRope();
		const result = append(rope, 'Hello');
		expect(getText(result)).toBe('Hello');
	});
});

describe('prepend', () => {
	it('prepends text', () => {
		const rope = createRope('World');
		const result = prepend(rope, 'Hello ');
		expect(getText(result)).toBe('Hello World');
	});
});

describe('deleteRange', () => {
	it('deletes from beginning', () => {
		const rope = createRope('Hello World');
		const result = deleteRange(rope, 0, 6);
		expect(getText(result)).toBe('World');
	});

	it('deletes from middle', () => {
		const rope = createRope('Hello Beautiful World');
		const result = deleteRange(rope, 6, 16);
		expect(getText(result)).toBe('Hello World');
	});

	it('deletes from end', () => {
		const rope = createRope('Hello World');
		const result = deleteRange(rope, 5, 11);
		expect(getText(result)).toBe('Hello');
	});

	it('handles empty delete', () => {
		const rope = createRope('Hello');
		const result = deleteRange(rope, 2, 2);
		expect(getText(result)).toBe('Hello');
	});

	it('handles inverted range', () => {
		const rope = createRope('Hello');
		const result = deleteRange(rope, 4, 2);
		expect(getText(result)).toBe('Hello');
	});

	it('clamps bounds', () => {
		const rope = createRope('Hello');
		const result = deleteRange(rope, -5, 100);
		expect(getText(result)).toBe('');
	});

	it('maintains validity after many deletes', () => {
		let rope = createRope('x'.repeat(1000));
		for (let i = 0; i < 100; i++) {
			rope = deleteRange(rope, 0, 1);
		}
		expect(getLength(rope)).toBe(900);
		expect(verify(rope)).toBe(true);
	});
});

describe('replaceRange', () => {
	it('replaces text', () => {
		const rope = createRope('Hello World');
		const result = replaceRange(rope, 6, 11, 'Universe');
		expect(getText(result)).toBe('Hello Universe');
	});

	it('handles empty replacement', () => {
		const rope = createRope('Hello World');
		const result = replaceRange(rope, 5, 11, '');
		expect(getText(result)).toBe('Hello');
	});

	it('handles insertion (empty range)', () => {
		const rope = createRope('HelloWorld');
		const result = replaceRange(rope, 5, 5, ' ');
		expect(getText(result)).toBe('Hello World');
	});
});

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe('getStats', () => {
	it('returns correct stats for small rope', () => {
		const rope = createRope('Hello');
		const stats = getStats(rope);
		expect(stats.length).toBe(5);
		expect(stats.newlines).toBe(0);
		expect(stats.leafCount).toBe(1);
		expect(stats.depth).toBe(0);
	});

	it('returns correct stats for large rope', () => {
		const text = 'Line\n'.repeat(1000);
		const rope = createRope(text);
		const stats = getStats(rope);
		expect(stats.length).toBe(5000);
		expect(stats.newlines).toBe(1000);
		expect(stats.leafCount).toBeGreaterThan(1);
		expect(stats.depth).toBeGreaterThan(0);
	});
});

describe('verify', () => {
	it('returns true for valid rope', () => {
		const rope = createRope('Hello, World!');
		expect(verify(rope)).toBe(true);
	});

	it('returns true after operations', () => {
		let rope = createRope('Hello');
		rope = insert(rope, 5, ' World');
		rope = deleteRange(rope, 0, 6);
		expect(verify(rope)).toBe(true);
	});
});

// =============================================================================
// LARGE SCALE TESTS
// =============================================================================

describe('large scale operations', () => {
	it('handles 1 million character rope', () => {
		const text = 'Line of text\n'.repeat(77000); // ~1M chars
		const rope = createRope(text);
		expect(getLength(rope)).toBe(text.length);
		expect(verify(rope)).toBe(true);
	});

	it('efficiently accesses line in large document', () => {
		const text = 'Line of text\n'.repeat(100000);
		const rope = createRope(text);

		// Access line 50000
		const line = getLine(rope, 50000);
		expect(line?.text).toBe('Line of text');
		expect(line?.lineNumber).toBe(50000);
	});

	it('efficiently inserts in middle of large document', () => {
		const text = 'x'.repeat(100000);
		let rope = createRope(text);

		// Insert in middle
		rope = insert(rope, 50000, 'INSERTED');
		expect(getLength(rope)).toBe(100008);
		expect(substring(rope, 49998, 50010)).toBe('xxINSERTEDxx');
		expect(verify(rope)).toBe(true);
	});

	it('efficiently deletes range in large document', () => {
		const text = 'x'.repeat(100000);
		let rope = createRope(text);

		// Delete from middle
		rope = deleteRange(rope, 40000, 60000);
		expect(getLength(rope)).toBe(80000);
		expect(verify(rope)).toBe(true);
	});
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('edge cases', () => {
	it('handles unicode characters', () => {
		const rope = createRope('Hello 世界 🌍');
		expect(getText(rope)).toBe('Hello 世界 🌍');
	});

	it('handles only newlines', () => {
		const rope = createRope('\n\n\n');
		expect(getNewlineCount(rope)).toBe(3);
		expect(getLineCount(rope)).toBe(4);
	});

	it('handles Windows line endings', () => {
		const rope = createRope('Line 1\r\nLine 2\r\n');
		// \r is just a regular character, only \n counts as line break
		expect(getNewlineCount(rope)).toBe(2);
	});

	it('handles very long lines', () => {
		const longLine = 'x'.repeat(10000);
		const rope = createRope(`${longLine}\n${longLine}`);
		expect(getLineCount(rope)).toBe(2);
		const line = getLine(rope, 0);
		expect(line?.text.length).toBe(10000);
	});
});
