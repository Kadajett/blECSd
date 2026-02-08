/**
 * Shared text editing utilities for Textbox and Textarea widgets.
 * Pure functions for cursor movement, text manipulation, and word navigation.
 * @module widgets/textEditing
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cursor position in a multi-line text buffer.
 */
export interface CursorPosition {
	/** Line index (0-based) */
	readonly line: number;
	/** Column index (0-based, character position within line) */
	readonly column: number;
}

/**
 * Text selection range.
 */
export interface TextSelection {
	/** Selection start position */
	readonly start: CursorPosition;
	/** Selection end position */
	readonly end: CursorPosition;
}

/**
 * Result of a text editing operation.
 */
export interface EditResult {
	/** New text content */
	readonly text: string;
	/** New cursor position */
	readonly cursor: CursorPosition;
	/** New selection (null if no selection) */
	readonly selection: TextSelection | null;
}

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

/**
 * Converts a linear offset to a cursor position in multi-line text.
 *
 * @param text - The text content
 * @param offset - Linear character offset
 * @returns Cursor position
 *
 * @example
 * ```typescript
 * const pos = offsetToCursor('Hello\nWorld', 6);
 * // Returns { line: 1, column: 0 }
 * ```
 */
export function offsetToCursor(text: string, offset: number): CursorPosition {
	const lines = text.split('\n');
	let remaining = offset;
	let line = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineLength = (lines[i] ?? '').length;
		if (remaining <= lineLength) {
			line = i;
			break;
		}
		// +1 for the newline character
		remaining -= lineLength + 1;
		line = i + 1;
	}

	return { line: Math.max(0, line), column: Math.max(0, remaining) };
}

/**
 * Converts a cursor position to a linear offset.
 *
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns Linear character offset
 *
 * @example
 * ```typescript
 * const offset = cursorToOffset('Hello\nWorld', { line: 1, column: 0 });
 * // Returns 6
 * ```
 */
export function cursorToOffset(text: string, cursor: CursorPosition): number {
	const lines = text.split('\n');
	let offset = 0;

	for (let i = 0; i < cursor.line && i < lines.length; i++) {
		offset += (lines[i] ?? '').length + 1; // +1 for newline
	}

	const currentLine = lines[cursor.line];
	if (currentLine) {
		offset += Math.min(cursor.column, currentLine.length);
	}

	return offset;
}

/**
 * Clamps a cursor position to valid bounds within the text.
 *
 * @param text - The text content
 * @param cursor - Cursor position to clamp
 * @returns Clamped cursor position
 */
export function clampCursor(text: string, cursor: CursorPosition): CursorPosition {
	const lines = text.split('\n');
	const line = Math.max(0, Math.min(cursor.line, lines.length - 1));
	const lineText = lines[line] ?? '';
	const column = Math.max(0, Math.min(cursor.column, lineText.length));

	return { line, column };
}

// =============================================================================
// TEXT MANIPULATION
// =============================================================================

/**
 * Inserts text at the cursor position.
 *
 * @param text - Current text content
 * @param cursor - Cursor position
 * @param insertText - Text to insert
 * @returns Edit result with new text and cursor position
 *
 * @example
 * ```typescript
 * const result = insertAt('Hello', { line: 0, column: 5 }, ' World');
 * // Returns { text: 'Hello World', cursor: { line: 0, column: 11 }, selection: null }
 * ```
 */
export function insertAt(text: string, cursor: CursorPosition, insertText: string): EditResult {
	const offset = cursorToOffset(text, cursor);
	const newText = text.slice(0, offset) + insertText + text.slice(offset);
	const newCursor = offsetToCursor(newText, offset + insertText.length);

	return { text: newText, cursor: newCursor, selection: null };
}

/**
 * Deletes text between two cursor positions.
 *
 * @param text - Current text content
 * @param start - Start position
 * @param end - End position
 * @returns Edit result with new text and cursor position
 *
 * @example
 * ```typescript
 * const result = deleteRange('Hello World', { line: 0, column: 5 }, { line: 0, column: 11 });
 * // Returns { text: 'Hello', cursor: { line: 0, column: 5 }, selection: null }
 * ```
 */
export function deleteRange(text: string, start: CursorPosition, end: CursorPosition): EditResult {
	const startOffset = cursorToOffset(text, start);
	const endOffset = cursorToOffset(text, end);
	const actualStart = Math.min(startOffset, endOffset);
	const actualEnd = Math.max(startOffset, endOffset);

	const newText = text.slice(0, actualStart) + text.slice(actualEnd);
	const newCursor = offsetToCursor(newText, actualStart);

	return { text: newText, cursor: newCursor, selection: null };
}

/**
 * Deletes character before cursor (backspace).
 *
 * @param text - Current text content
 * @param cursor - Cursor position
 * @returns Edit result with new text and cursor position
 */
export function deleteBackward(text: string, cursor: CursorPosition): EditResult {
	const offset = cursorToOffset(text, cursor);
	if (offset === 0) {
		return { text, cursor, selection: null };
	}

	const newText = text.slice(0, offset - 1) + text.slice(offset);
	const newCursor = offsetToCursor(newText, offset - 1);

	return { text: newText, cursor: newCursor, selection: null };
}

/**
 * Deletes character at cursor (delete key).
 *
 * @param text - Current text content
 * @param cursor - Cursor position
 * @returns Edit result with new text and cursor position
 */
export function deleteForward(text: string, cursor: CursorPosition): EditResult {
	const offset = cursorToOffset(text, cursor);
	if (offset >= text.length) {
		return { text, cursor, selection: null };
	}

	const newText = text.slice(0, offset) + text.slice(offset + 1);

	return { text: newText, cursor, selection: null };
}

// =============================================================================
// CURSOR MOVEMENT
// =============================================================================

/**
 * Moves cursor left by one character.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorLeft(text: string, cursor: CursorPosition): CursorPosition {
	if (cursor.column > 0) {
		return { line: cursor.line, column: cursor.column - 1 };
	}

	if (cursor.line > 0) {
		const lines = text.split('\n');
		const prevLine = lines[cursor.line - 1];
		return { line: cursor.line - 1, column: prevLine ? prevLine.length : 0 };
	}

	return cursor;
}

/**
 * Moves cursor right by one character.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorRight(text: string, cursor: CursorPosition): CursorPosition {
	const lines = text.split('\n');
	const currentLine = lines[cursor.line];

	if (currentLine && cursor.column < currentLine.length) {
		return { line: cursor.line, column: cursor.column + 1 };
	}

	if (cursor.line < lines.length - 1) {
		return { line: cursor.line + 1, column: 0 };
	}

	return cursor;
}

/**
 * Moves cursor up by one line.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorUp(text: string, cursor: CursorPosition): CursorPosition {
	if (cursor.line === 0) {
		return cursor;
	}

	const lines = text.split('\n');
	const newLine = cursor.line - 1;
	const newLineText = lines[newLine];
	const newColumn = newLineText ? Math.min(cursor.column, newLineText.length) : 0;

	return { line: newLine, column: newColumn };
}

/**
 * Moves cursor down by one line.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorDown(text: string, cursor: CursorPosition): CursorPosition {
	const lines = text.split('\n');
	if (cursor.line >= lines.length - 1) {
		return cursor;
	}

	const newLine = cursor.line + 1;
	const newLineText = lines[newLine];
	const newColumn = newLineText ? Math.min(cursor.column, newLineText.length) : 0;

	return { line: newLine, column: newColumn };
}

/**
 * Moves cursor to start of line.
 *
 * @param _text - The text content (unused)
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorHome(_text: string, cursor: CursorPosition): CursorPosition {
	return { line: cursor.line, column: 0 };
}

/**
 * Moves cursor to end of line.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorEnd(text: string, cursor: CursorPosition): CursorPosition {
	const lines = text.split('\n');
	const currentLine = lines[cursor.line];
	return { line: cursor.line, column: currentLine ? currentLine.length : 0 };
}

/**
 * Moves cursor to start of document.
 *
 * @param _text - The text content (unused)
 * @param _cursor - Current cursor position (unused)
 * @returns New cursor position
 */
export function moveCursorStart(_text: string, _cursor: CursorPosition): CursorPosition {
	return { line: 0, column: 0 };
}

/**
 * Moves cursor to end of document.
 *
 * @param text - The text content
 * @param _cursor - Current cursor position (unused)
 * @returns New cursor position
 */
export function moveCursorEndOfDocument(text: string, _cursor: CursorPosition): CursorPosition {
	const lines = text.split('\n');
	const lastLine = lines.length - 1;
	const lastLineText = lines[lastLine];
	return { line: lastLine, column: lastLineText ? lastLineText.length : 0 };
}

// =============================================================================
// WORD NAVIGATION
// =============================================================================

/**
 * Checks if a character is a word boundary.
 *
 * @param char - Character to check
 * @returns true if character is whitespace or punctuation
 */
export function isWordBoundary(char: string): boolean {
	return /[\s\p{P}]/u.test(char);
}

/**
 * Finds the start of the word at or before the cursor.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns Position of word start
 */
export function findWordStart(text: string, cursor: CursorPosition): CursorPosition {
	const offset = cursorToOffset(text, cursor);

	// If at start, can't go further back
	if (offset === 0) {
		return cursor;
	}

	let pos = offset - 1;

	// Skip any word boundaries before current position
	while (pos > 0 && isWordBoundary(text[pos] ?? '')) {
		pos--;
	}

	// If we found a word boundary at the very beginning, stop there
	if (pos === 0 && isWordBoundary(text[0] ?? '')) {
		return offsetToCursor(text, 0);
	}

	// Find start of the word we're now in
	while (pos > 0 && !isWordBoundary(text[pos - 1] ?? '')) {
		pos--;
	}

	return offsetToCursor(text, pos);
}

/**
 * Finds the end of the word at or after the cursor.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns Position of word end
 */
export function findWordEnd(text: string, cursor: CursorPosition): CursorPosition {
	const offset = cursorToOffset(text, cursor);

	// If at end, can't go further forward
	if (offset >= text.length) {
		return cursor;
	}

	let pos = offset;

	// Skip any word boundaries at current position
	while (pos < text.length && isWordBoundary(text[pos] ?? '')) {
		pos++;
	}

	// Find end of word
	while (pos < text.length && !isWordBoundary(text[pos] ?? '')) {
		pos++;
	}

	return offsetToCursor(text, pos);
}

/**
 * Moves cursor to the start of the previous word.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorWordLeft(text: string, cursor: CursorPosition): CursorPosition {
	return findWordStart(text, cursor);
}

/**
 * Moves cursor to the start of the next word.
 *
 * @param text - The text content
 * @param cursor - Current cursor position
 * @returns New cursor position
 */
export function moveCursorWordRight(text: string, cursor: CursorPosition): CursorPosition {
	return findWordEnd(text, cursor);
}

/**
 * Deletes the word before the cursor.
 *
 * @param text - Current text content
 * @param cursor - Cursor position
 * @returns Edit result with new text and cursor position
 */
export function deleteWordBackward(text: string, cursor: CursorPosition): EditResult {
	const wordStart = findWordStart(text, cursor);
	return deleteRange(text, wordStart, cursor);
}

/**
 * Deletes the word after the cursor.
 *
 * @param text - Current text content
 * @param cursor - Cursor position
 * @returns Edit result with new text and cursor position
 */
export function deleteWordForward(text: string, cursor: CursorPosition): EditResult {
	const wordEnd = findWordEnd(text, cursor);
	return deleteRange(text, cursor, wordEnd);
}
