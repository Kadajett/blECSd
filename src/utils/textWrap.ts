/**
 * Text wrapping utilities with Unicode and ANSI support.
 * @module utils/textWrap
 */

/**
 * Text alignment options.
 */
export type TextAlign = 'left' | 'center' | 'right';

/**
 * Options for text wrapping.
 */
export interface WrapOptions {
	/** Maximum width in characters */
	width: number;
	/** Whether to wrap text (default: true) */
	wrap?: boolean;
	/** Text alignment (default: 'left') */
	align?: TextAlign;
	/** Break mid-word if word exceeds width (default: false) */
	breakWord?: boolean;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require control characters
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x1b\\|\x1b\][^\x07]*\x07/g;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require control characters
const ANSI_CSI_REGEX = /^\x1b\[[0-9;]*[a-zA-Z]/;

/**
 * Removes ANSI escape sequences from a string.
 *
 * @param text - Text with possible ANSI codes
 * @returns Text without ANSI codes
 *
 * @example
 * ```typescript
 * import { stripAnsi } from 'blecsd';
 *
 * const plain = stripAnsi('\x1b[31mRed\x1b[0m');
 * console.log(plain); // "Red"
 * ```
 */
export function stripAnsi(text: string): string {
	return text.replace(ANSI_REGEX, '');
}

/**
 * Gets the visible width of a string (excluding ANSI codes).
 * Currently handles ASCII only. East Asian width support to be added.
 *
 * @param text - Text to measure
 * @returns Visible character width
 *
 * @example
 * ```typescript
 * import { getVisibleWidth } from 'blecsd';
 *
 * console.log(getVisibleWidth('Hello')); // 5
 * console.log(getVisibleWidth('\x1b[31mHello\x1b[0m')); // 5 (ANSI codes not counted)
 * ```
 */
export function getVisibleWidth(text: string): number {
	const stripped = stripAnsi(text);
	// TODO: Add East Asian width support (blessed-etz)
	// For now, treat all characters as single-width
	return stripped.length;
}

/**
 * Finds the next ANSI code in text starting at index.
 */
function findAnsiCode(text: string, startIndex: number): { code: string; length: number } | null {
	const remaining = text.slice(startIndex);
	const match = remaining.match(ANSI_CSI_REGEX);
	if (match) {
		return { code: match[0], length: match[0].length };
	}
	return null;
}

/**
 * Truncates a string to fit within a specified width,
 * preserving ANSI codes and adding ellipsis if truncated.
 *
 * @param text - Text to truncate
 * @param width - Maximum width
 * @param ellipsis - Ellipsis string (default: '…')
 * @returns Truncated text
 *
 * @example
 * ```typescript
 * import { truncate } from 'blecsd';
 *
 * console.log(truncate('Hello World', 8)); // "Hello W…"
 * ```
 */
export function truncate(text: string, width: number, ellipsis = '…'): string {
	if (width <= 0) {
		return '';
	}

	const stripped = stripAnsi(text);
	if (stripped.length <= width) {
		return text;
	}

	const ellipsisWidth = getVisibleWidth(ellipsis);
	const targetWidth = width - ellipsisWidth;

	if (targetWidth <= 0) {
		return ellipsis.slice(0, width);
	}

	// Build truncated string, preserving ANSI codes
	let result = '';
	let visibleCount = 0;
	let textIndex = 0;

	while (visibleCount < targetWidth && textIndex < text.length) {
		const char = text[textIndex];

		// Check for ANSI code
		if (char === '\x1b') {
			const ansi = findAnsiCode(text, textIndex);
			if (ansi) {
				result += ansi.code;
				textIndex += ansi.length;
				continue;
			}
		}

		result += char;
		visibleCount++;
		textIndex++;
	}

	// Add reset if we had ANSI codes
	if (result.includes('\x1b[')) {
		result += '\x1b[0m';
	}

	return result + ellipsis;
}

/**
 * Aligns a line of text within a specified width.
 *
 * @param line - Line to align
 * @param width - Target width
 * @param align - Alignment type
 * @returns Aligned line (padded with spaces)
 *
 * @example
 * ```typescript
 * import { alignLine } from 'blecsd';
 *
 * console.log(alignLine('Hello', 10, 'left'));   // "Hello     "
 * console.log(alignLine('Hello', 10, 'center')); // "  Hello   "
 * console.log(alignLine('Hello', 10, 'right'));  // "     Hello"
 * ```
 */
export function alignLine(line: string, width: number, align: TextAlign): string {
	const visibleWidth = getVisibleWidth(line);

	if (visibleWidth >= width) {
		return line;
	}

	const padding = width - visibleWidth;

	switch (align) {
		case 'left':
			return line + ' '.repeat(padding);

		case 'right':
			return ' '.repeat(padding) + line;

		case 'center': {
			const leftPad = Math.floor(padding / 2);
			const rightPad = padding - leftPad;
			return ' '.repeat(leftPad) + line + ' '.repeat(rightPad);
		}
	}
}

/**
 * Splits text at word boundaries for wrapping.
 */
function splitWords(text: string): string[] {
	const result: string[] = [];
	let current = '';
	let inAnsi = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === undefined) continue;

		// Track ANSI sequences
		if (char === '\x1b') {
			inAnsi = true;
			current += char;
			continue;
		}

		if (inAnsi) {
			current += char;
			if (/[a-zA-Z\\]/.test(char)) {
				inAnsi = false;
			}
			continue;
		}

		// Word boundary
		if (char === ' ' || char === '\t') {
			if (current.length > 0) {
				result.push(current);
				current = '';
			}
			result.push(char);
		} else {
			current += char;
		}
	}

	if (current.length > 0) {
		result.push(current);
	}

	return result;
}

/**
 * Breaks a long word into chunks that fit within width.
 */
function breakLongWord(word: string, width: number): string[] {
	const chunks: string[] = [];
	let remaining = word;

	while (getVisibleWidth(remaining) > width) {
		let breakPoint = 0;
		let breakWidth = 0;

		for (let i = 0; i < remaining.length; i++) {
			const char = remaining[i];
			if (char === undefined) continue;

			if (char === '\x1b') {
				const ansi = findAnsiCode(remaining, i);
				if (ansi) {
					breakPoint = i + ansi.length;
					continue;
				}
			}

			if (breakWidth >= width) {
				break;
			}
			breakPoint = i + 1;
			breakWidth++;
		}

		chunks.push(remaining.slice(0, breakPoint));
		remaining = remaining.slice(breakPoint);
	}

	if (remaining.length > 0) {
		chunks.push(remaining);
	}

	return chunks;
}

/**
 * Wraps text to fit within a specified width, breaking at word boundaries.
 *
 * @param text - Text to wrap
 * @param width - Maximum width per line
 * @returns Array of wrapped lines
 *
 * @example
 * ```typescript
 * import { wordWrap } from 'blecsd';
 *
 * const lines = wordWrap('The quick brown fox jumps over the lazy dog', 20);
 * // ["The quick brown fox", "jumps over the lazy", "dog"]
 * ```
 */
export function wordWrap(text: string, width: number): string[] {
	if (width <= 0) {
		return [''];
	}

	const lines: string[] = [];
	const paragraphs = text.split('\n');

	for (const paragraph of paragraphs) {
		if (paragraph.length === 0) {
			lines.push('');
			continue;
		}

		const wrapped = wrapParagraph(paragraph, width);
		lines.push(...wrapped);
	}

	return lines;
}

/**
 * Wraps a single paragraph.
 */
function wrapParagraph(paragraph: string, width: number): string[] {
	const lines: string[] = [];
	const words = splitWords(paragraph);
	let currentLine = '';
	let currentWidth = 0;

	for (const word of words) {
		const wordWidth = getVisibleWidth(word);

		// Handle whitespace
		if (word === ' ' || word === '\t') {
			if (currentWidth + 1 <= width) {
				currentLine += ' ';
				currentWidth += 1;
			}
			continue;
		}

		// Word fits on current line
		if (currentWidth + wordWidth <= width) {
			currentLine += word;
			currentWidth += wordWidth;
			continue;
		}

		// Word needs new line but fits on its own line
		if (wordWidth <= width) {
			if (currentLine.length > 0) {
				lines.push(currentLine.trimEnd());
			}
			currentLine = word;
			currentWidth = wordWidth;
			continue;
		}

		// Word is too long, must break it
		if (currentLine.length > 0) {
			lines.push(currentLine.trimEnd());
			currentLine = '';
			currentWidth = 0;
		}

		const chunks = breakLongWord(word, width);
		for (let i = 0; i < chunks.length - 1; i++) {
			const chunk = chunks[i];
			if (chunk !== undefined) {
				lines.push(chunk);
			}
		}

		const lastChunk = chunks[chunks.length - 1];
		if (lastChunk !== undefined) {
			currentLine = lastChunk;
			currentWidth = getVisibleWidth(lastChunk);
		}
	}

	if (currentLine.length > 0) {
		lines.push(currentLine.trimEnd());
	}

	return lines;
}

/**
 * Wraps text with breakWord option.
 */
function wrapWithBreak(text: string, width: number): string[] {
	const lines: string[] = [];
	const paragraphs = text.split('\n');

	for (const paragraph of paragraphs) {
		if (paragraph.length === 0) {
			lines.push('');
			continue;
		}

		const wrapped = breakParagraph(paragraph, width);
		lines.push(...wrapped);
	}

	return lines;
}

/**
 * Breaks a paragraph at exact width boundaries.
 */
function breakParagraph(paragraph: string, width: number): string[] {
	const lines: string[] = [];
	let remaining = paragraph;

	while (getVisibleWidth(remaining) > width) {
		let breakPoint = 0;
		let breakWidth = 0;
		let inAnsi = false;

		for (let i = 0; i < remaining.length && breakWidth < width; i++) {
			const char = remaining[i];
			if (char === undefined) continue;

			if (char === '\x1b') {
				inAnsi = true;
				continue;
			}

			if (inAnsi) {
				if (/[a-zA-Z\\]/.test(char)) {
					inAnsi = false;
				}
				continue;
			}

			breakWidth++;
			breakPoint = i + 1;
		}

		lines.push(remaining.slice(0, breakPoint));
		remaining = remaining.slice(breakPoint);
	}

	if (remaining.length > 0) {
		lines.push(remaining);
	}

	return lines;
}

/**
 * Wraps and aligns text with full options.
 *
 * @param text - Text to wrap
 * @param options - Wrapping options
 * @returns Array of wrapped and aligned lines
 *
 * @example
 * ```typescript
 * import { wrapText } from 'blecsd';
 *
 * const lines = wrapText('Hello world, this is a test', {
 *   width: 15,
 *   wrap: true,
 *   align: 'center'
 * });
 * // ["  Hello world  ", " this is a test"]
 * ```
 */
export function wrapText(text: string, options: WrapOptions): string[] {
	const { width, wrap = true, align = 'left', breakWord = false } = options;

	if (width <= 0) {
		return [''];
	}

	// If not wrapping, just align and possibly truncate
	if (!wrap) {
		return text.split('\n').map((line) => {
			const visibleWidth = getVisibleWidth(line);
			if (visibleWidth > width) {
				return truncate(line, width);
			}
			return alignLine(line, width, align);
		});
	}

	// Wrap text
	const lines = breakWord ? wrapWithBreak(text, width) : wordWrap(text, width);

	// Align all lines
	return lines.map((line) => alignLine(line, width, align));
}

/**
 * Pads text to a specific height by adding empty lines.
 *
 * @param lines - Array of lines
 * @param height - Target height
 * @param width - Line width for padding
 * @param valign - Vertical alignment ('top' | 'middle' | 'bottom')
 * @returns Array of lines padded to height
 *
 * @example
 * ```typescript
 * import { padHeight } from 'blecsd';
 *
 * const lines = padHeight(['Hello'], 3, 10, 'middle');
 * // ["          ", "Hello     ", "          "]
 * ```
 */
export function padHeight(
	lines: string[],
	height: number,
	width: number,
	valign: 'top' | 'middle' | 'bottom' = 'top',
): string[] {
	if (lines.length >= height) {
		return lines.slice(0, height);
	}

	const emptyLine = ' '.repeat(width);
	const padding = height - lines.length;

	switch (valign) {
		case 'top':
			return [...lines, ...Array<string>(padding).fill(emptyLine)];

		case 'bottom':
			return [...Array<string>(padding).fill(emptyLine), ...lines];

		case 'middle': {
			const topPad = Math.floor(padding / 2);
			const bottomPad = padding - topPad;
			return [
				...Array<string>(topPad).fill(emptyLine),
				...lines,
				...Array<string>(bottomPad).fill(emptyLine),
			];
		}
	}
}
