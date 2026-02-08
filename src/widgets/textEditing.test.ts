/**
 * Tests for text editing utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	type CursorPosition,
	clampCursor,
	cursorToOffset,
	deleteBackward,
	deleteForward,
	deleteRange,
	deleteWordBackward,
	deleteWordForward,
	findWordEnd,
	findWordStart,
	insertAt,
	isWordBoundary,
	moveCursorDown,
	moveCursorEnd,
	moveCursorEndOfDocument,
	moveCursorHome,
	moveCursorLeft,
	moveCursorRight,
	moveCursorStart,
	moveCursorUp,
	moveCursorWordLeft,
	moveCursorWordRight,
	offsetToCursor,
} from './textEditing';

describe('textEditing', () => {
	describe('offsetToCursor', () => {
		it('converts offset to cursor position in single line', () => {
			const cursor = offsetToCursor('Hello World', 6);
			expect(cursor).toEqual({ line: 0, column: 6 });
		});

		it('converts offset to cursor position in multi-line text', () => {
			const cursor = offsetToCursor('Hello\nWorld', 6);
			expect(cursor).toEqual({ line: 1, column: 0 });
		});

		it('handles offset at start of second line', () => {
			const cursor = offsetToCursor('Foo\nBar', 4);
			expect(cursor).toEqual({ line: 1, column: 0 });
		});

		it('handles offset in middle of second line', () => {
			const cursor = offsetToCursor('Foo\nBar', 6);
			expect(cursor).toEqual({ line: 1, column: 2 });
		});

		it('handles offset at end', () => {
			const cursor = offsetToCursor('Hello', 5);
			expect(cursor).toEqual({ line: 0, column: 5 });
		});

		it('handles empty text', () => {
			const cursor = offsetToCursor('', 0);
			expect(cursor).toEqual({ line: 0, column: 0 });
		});
	});

	describe('cursorToOffset', () => {
		it('converts cursor to offset in single line', () => {
			const offset = cursorToOffset('Hello World', { line: 0, column: 6 });
			expect(offset).toBe(6);
		});

		it('converts cursor to offset in multi-line text', () => {
			const offset = cursorToOffset('Hello\nWorld', { line: 1, column: 0 });
			expect(offset).toBe(6);
		});

		it('converts cursor in second line', () => {
			const offset = cursorToOffset('Foo\nBar', { line: 1, column: 2 });
			expect(offset).toBe(6);
		});

		it('handles cursor at end', () => {
			const offset = cursorToOffset('Hello', { line: 0, column: 5 });
			expect(offset).toBe(5);
		});
	});

	describe('clampCursor', () => {
		it('clamps line to text bounds', () => {
			const cursor = clampCursor('Foo\nBar', { line: 5, column: 0 });
			expect(cursor).toEqual({ line: 1, column: 0 });
		});

		it('clamps column to line length', () => {
			const cursor = clampCursor('Foo\nBar', { line: 0, column: 10 });
			expect(cursor).toEqual({ line: 0, column: 3 });
		});

		it('clamps negative positions to zero', () => {
			const cursor = clampCursor('Foo', { line: -1, column: -5 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});

		it('returns valid cursor unchanged', () => {
			const cursor = clampCursor('Foo\nBar', { line: 1, column: 2 });
			expect(cursor).toEqual({ line: 1, column: 2 });
		});
	});

	describe('insertAt', () => {
		it('inserts text at cursor position', () => {
			const result = insertAt('Hello', { line: 0, column: 5 }, ' World');
			expect(result.text).toBe('Hello World');
			expect(result.cursor).toEqual({ line: 0, column: 11 });
			expect(result.selection).toBeNull();
		});

		it('inserts text in middle', () => {
			const result = insertAt('Hello', { line: 0, column: 2 }, 'XX');
			expect(result.text).toBe('HeXXllo');
			expect(result.cursor).toEqual({ line: 0, column: 4 });
		});

		it('inserts newline', () => {
			const result = insertAt('Hello', { line: 0, column: 5 }, '\n');
			expect(result.text).toBe('Hello\n');
			expect(result.cursor).toEqual({ line: 1, column: 0 });
		});

		it('inserts multi-line text', () => {
			const result = insertAt('', { line: 0, column: 0 }, 'Foo\nBar');
			expect(result.text).toBe('Foo\nBar');
			expect(result.cursor).toEqual({ line: 1, column: 3 });
		});
	});

	describe('deleteRange', () => {
		it('deletes text between positions', () => {
			const result = deleteRange('Hello World', { line: 0, column: 5 }, { line: 0, column: 11 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 5 });
		});

		it('handles reversed range', () => {
			const result = deleteRange('Hello World', { line: 0, column: 11 }, { line: 0, column: 5 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 5 });
		});

		it('deletes across lines', () => {
			const result = deleteRange('Foo\nBar\nBaz', { line: 0, column: 2 }, { line: 1, column: 2 });
			expect(result.text).toBe('For\nBaz');
		});

		it('deletes entire line', () => {
			const result = deleteRange('Foo\nBar\nBaz', { line: 1, column: 0 }, { line: 2, column: 0 });
			expect(result.text).toBe('Foo\nBaz');
		});
	});

	describe('deleteBackward', () => {
		it('deletes character before cursor', () => {
			const result = deleteBackward('Hello', { line: 0, column: 5 });
			expect(result.text).toBe('Hell');
			expect(result.cursor).toEqual({ line: 0, column: 4 });
		});

		it('does nothing at start of text', () => {
			const result = deleteBackward('Hello', { line: 0, column: 0 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 0 });
		});

		it('deletes newline', () => {
			const result = deleteBackward('Foo\nBar', { line: 1, column: 0 });
			expect(result.text).toBe('FooBar');
			expect(result.cursor).toEqual({ line: 0, column: 3 });
		});
	});

	describe('deleteForward', () => {
		it('deletes character at cursor', () => {
			const result = deleteForward('Hello', { line: 0, column: 0 });
			expect(result.text).toBe('ello');
			expect(result.cursor).toEqual({ line: 0, column: 0 });
		});

		it('does nothing at end of text', () => {
			const result = deleteForward('Hello', { line: 0, column: 5 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 5 });
		});

		it('deletes newline', () => {
			const result = deleteForward('Foo\nBar', { line: 0, column: 3 });
			expect(result.text).toBe('FooBar');
			expect(result.cursor).toEqual({ line: 0, column: 3 });
		});
	});

	describe('moveCursorLeft', () => {
		it('moves left within line', () => {
			const cursor = moveCursorLeft('Hello', { line: 0, column: 3 });
			expect(cursor).toEqual({ line: 0, column: 2 });
		});

		it('does nothing at start of text', () => {
			const cursor = moveCursorLeft('Hello', { line: 0, column: 0 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});

		it('moves to end of previous line', () => {
			const cursor = moveCursorLeft('Foo\nBar', { line: 1, column: 0 });
			expect(cursor).toEqual({ line: 0, column: 3 });
		});
	});

	describe('moveCursorRight', () => {
		it('moves right within line', () => {
			const cursor = moveCursorRight('Hello', { line: 0, column: 2 });
			expect(cursor).toEqual({ line: 0, column: 3 });
		});

		it('does nothing at end of text', () => {
			const cursor = moveCursorRight('Hello', { line: 0, column: 5 });
			expect(cursor).toEqual({ line: 0, column: 5 });
		});

		it('moves to start of next line', () => {
			const cursor = moveCursorRight('Foo\nBar', { line: 0, column: 3 });
			expect(cursor).toEqual({ line: 1, column: 0 });
		});
	});

	describe('moveCursorUp', () => {
		it('moves up one line', () => {
			const cursor = moveCursorUp('Foo\nBar', { line: 1, column: 2 });
			expect(cursor).toEqual({ line: 0, column: 2 });
		});

		it('does nothing on first line', () => {
			const cursor = moveCursorUp('Foo\nBar', { line: 0, column: 2 });
			expect(cursor).toEqual({ line: 0, column: 2 });
		});

		it('clamps column to shorter line', () => {
			const cursor = moveCursorUp('Foo\nLonger', { line: 1, column: 5 });
			expect(cursor).toEqual({ line: 0, column: 3 });
		});
	});

	describe('moveCursorDown', () => {
		it('moves down one line', () => {
			const cursor = moveCursorDown('Foo\nBar', { line: 0, column: 2 });
			expect(cursor).toEqual({ line: 1, column: 2 });
		});

		it('does nothing on last line', () => {
			const cursor = moveCursorDown('Foo\nBar', { line: 1, column: 2 });
			expect(cursor).toEqual({ line: 1, column: 2 });
		});

		it('clamps column to shorter line', () => {
			const cursor = moveCursorDown('Longer\nFoo', { line: 0, column: 5 });
			expect(cursor).toEqual({ line: 1, column: 3 });
		});
	});

	describe('moveCursorHome', () => {
		it('moves to start of line', () => {
			const cursor = moveCursorHome('Hello World', { line: 0, column: 6 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});

		it('stays at start if already there', () => {
			const cursor = moveCursorHome('Hello', { line: 0, column: 0 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});
	});

	describe('moveCursorEnd', () => {
		it('moves to end of line', () => {
			const cursor = moveCursorEnd('Hello World', { line: 0, column: 0 });
			expect(cursor).toEqual({ line: 0, column: 11 });
		});

		it('stays at end if already there', () => {
			const cursor = moveCursorEnd('Hello', { line: 0, column: 5 });
			expect(cursor).toEqual({ line: 0, column: 5 });
		});

		it('works on multi-line text', () => {
			const cursor = moveCursorEnd('Foo\nBar\nBaz', { line: 1, column: 0 });
			expect(cursor).toEqual({ line: 1, column: 3 });
		});
	});

	describe('moveCursorStart', () => {
		it('moves to start of document', () => {
			const cursor = moveCursorStart('Foo\nBar\nBaz', { line: 2, column: 3 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});
	});

	describe('moveCursorEndOfDocument', () => {
		it('moves to end of document', () => {
			const cursor = moveCursorEndOfDocument('Foo\nBar\nBaz', { line: 0, column: 0 });
			expect(cursor).toEqual({ line: 2, column: 3 });
		});
	});

	describe('isWordBoundary', () => {
		it('returns true for spaces', () => {
			expect(isWordBoundary(' ')).toBe(true);
		});

		it('returns true for punctuation', () => {
			expect(isWordBoundary('.')).toBe(true);
			expect(isWordBoundary(',')).toBe(true);
			expect(isWordBoundary('!')).toBe(true);
		});

		it('returns false for letters', () => {
			expect(isWordBoundary('a')).toBe(false);
			expect(isWordBoundary('Z')).toBe(false);
		});

		it('returns false for digits', () => {
			expect(isWordBoundary('0')).toBe(false);
			expect(isWordBoundary('9')).toBe(false);
		});
	});

	describe('findWordStart', () => {
		it('finds start of current word', () => {
			const pos = findWordStart('Hello World', { line: 0, column: 8 });
			expect(pos).toEqual({ line: 0, column: 6 });
		});

		it('skips spaces to find previous word', () => {
			// When in whitespace, find start of previous word "Hello"
			const pos = findWordStart('Hello   World', { line: 0, column: 8 });
			expect(pos).toEqual({ line: 0, column: 0 });
		});

		it('handles start of text', () => {
			const pos = findWordStart('Hello', { line: 0, column: 2 });
			expect(pos).toEqual({ line: 0, column: 0 });
		});

		it('stays at start if already at boundary', () => {
			const pos = findWordStart('Hello World', { line: 0, column: 0 });
			expect(pos).toEqual({ line: 0, column: 0 });
		});
	});

	describe('findWordEnd', () => {
		it('finds end of current word', () => {
			const pos = findWordEnd('Hello World', { line: 0, column: 2 });
			expect(pos).toEqual({ line: 0, column: 5 });
		});

		it('skips spaces to find next word end', () => {
			const pos = findWordEnd('Hello   World', { line: 0, column: 5 });
			expect(pos).toEqual({ line: 0, column: 13 });
		});

		it('handles end of text', () => {
			const pos = findWordEnd('Hello', { line: 0, column: 5 });
			expect(pos).toEqual({ line: 0, column: 5 });
		});
	});

	describe('moveCursorWordLeft', () => {
		it('moves to start of previous word', () => {
			const cursor = moveCursorWordLeft('Hello World Test', { line: 0, column: 12 });
			expect(cursor).toEqual({ line: 0, column: 6 });
		});

		it('handles start of text', () => {
			const cursor = moveCursorWordLeft('Hello', { line: 0, column: 2 });
			expect(cursor).toEqual({ line: 0, column: 0 });
		});
	});

	describe('moveCursorWordRight', () => {
		it('moves to start of next word', () => {
			const cursor = moveCursorWordRight('Hello World Test', { line: 0, column: 0 });
			expect(cursor).toEqual({ line: 0, column: 5 });
		});

		it('handles end of text', () => {
			const cursor = moveCursorWordRight('Hello', { line: 0, column: 5 });
			expect(cursor).toEqual({ line: 0, column: 5 });
		});
	});

	describe('deleteWordBackward', () => {
		it('deletes word before cursor', () => {
			const result = deleteWordBackward('Hello World', { line: 0, column: 11 });
			expect(result.text).toBe('Hello ');
			expect(result.cursor).toEqual({ line: 0, column: 6 });
		});

		it('handles start of text', () => {
			const result = deleteWordBackward('Hello', { line: 0, column: 0 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 0 });
		});
	});

	describe('deleteWordForward', () => {
		it('deletes word after cursor', () => {
			const result = deleteWordForward('Hello World', { line: 0, column: 0 });
			expect(result.text).toBe(' World');
			expect(result.cursor).toEqual({ line: 0, column: 0 });
		});

		it('handles end of text', () => {
			const result = deleteWordForward('Hello', { line: 0, column: 5 });
			expect(result.text).toBe('Hello');
			expect(result.cursor).toEqual({ line: 0, column: 5 });
		});
	});

	describe('roundtrip conversions', () => {
		it('offset -> cursor -> offset should match', () => {
			const text = 'Hello\nWorld\nTest';
			const originalOffset = 10;
			const cursor = offsetToCursor(text, originalOffset);
			const convertedOffset = cursorToOffset(text, cursor);
			expect(convertedOffset).toBe(originalOffset);
		});

		it('cursor -> offset -> cursor should match', () => {
			const text = 'Hello\nWorld\nTest';
			const originalCursor: CursorPosition = { line: 1, column: 3 };
			const offset = cursorToOffset(text, originalCursor);
			const convertedCursor = offsetToCursor(text, offset);
			expect(convertedCursor).toEqual(originalCursor);
		});
	});
});
