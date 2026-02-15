/**
 * Markdown parsing and rendering for Streaming Markdown Widget.
 */

import { highlightCode, type SupportedLanguage } from '../../text/syntaxHighlight';
import { SUPPORTED_LANGUAGES } from './constants';
import type { StreamingBlock, StreamingMarkdownConfig, StreamingMarkdownTheme } from './types';

// MARKDOWN PARSING (STREAMING-AWARE)

// --- Block type regex patterns ---
const HR_PATTERN = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const CODE_FENCE_OPEN = /^```(\w*)/;
const CODE_FENCE_CLOSE = /^```\s*$/;
const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const BLOCK_START_PATTERN = /^(#{1,6}\s|```|>|(-{3,}|\*{3,}|_{3,})\s*$)/;

// --- Parse result for sub-parsers ---
interface ParseResult {
	readonly block: StreamingBlock;
	readonly nextIndex: number;
}

function parseCodeBlock(lines: readonly string[], startIndex: number, lang: string): ParseResult {
	const codeLines: string[] = [];
	let i = startIndex;
	let closed = false;
	while (i < lines.length) {
		const codeLine = lines[i];
		if (codeLine === undefined) {
			i++;
			continue;
		}
		if (CODE_FENCE_CLOSE.test(codeLine)) {
			closed = true;
			i++;
			break;
		}
		codeLines.push(codeLine);
		i++;
	}
	const codeBlock: StreamingBlock = {
		type: 'code',
		content: codeLines.join('\n'),
		complete: closed,
	};
	return { block: lang ? { ...codeBlock, language: lang } : codeBlock, nextIndex: i };
}

function parseBlockquote(lines: readonly string[], startIndex: number): ParseResult {
	const quoteLines: string[] = [];
	let i = startIndex;
	while (i < lines.length) {
		const qLine = lines[i];
		if (qLine === undefined || (!qLine.startsWith('>') && qLine.trim() === '')) break;
		quoteLines.push(qLine.startsWith('>') ? qLine.slice(1).trimStart() : qLine);
		i++;
	}
	return {
		block: { type: 'blockquote', content: quoteLines.join('\n'), complete: true },
		nextIndex: i,
	};
}

function parseList(lines: readonly string[], startIndex: number, isOrdered: boolean): ParseResult {
	const listLines: string[] = [];
	let i = startIndex;
	while (i < lines.length) {
		const lLine = lines[i];
		if (lLine === undefined) break;
		const itemMatch = LIST_ITEM_PATTERN.exec(lLine);
		if (itemMatch) {
			listLines.push(itemMatch[3] ?? lLine);
			i++;
			continue;
		}
		if (lLine.trim() === '') {
			i++;
			break;
		}
		if (/^\s+/.test(lLine)) {
			listLines.push(lLine.trim());
			i++;
			continue;
		}
		break;
	}
	return {
		block: { type: 'list', content: listLines.join('\n'), listOrdered: isOrdered, complete: true },
		nextIndex: i,
	};
}

function parseParagraph(
	lines: readonly string[],
	startIndex: number,
	firstLine: string,
): ParseResult {
	const paraLines: string[] = [firstLine];
	let i = startIndex;
	while (i < lines.length) {
		const pLine = lines[i];
		if (pLine === undefined || pLine.trim() === '') break;
		if (BLOCK_START_PATTERN.test(pLine)) break;
		if (LIST_ITEM_PATTERN.test(pLine)) break;
		paraLines.push(pLine);
		i++;
	}
	return {
		block: { type: 'paragraph', content: paraLines.join(' '), complete: true },
		nextIndex: i,
	};
}

/** Parses a single block from the current position. */
function parseSingleBlock(
	lines: readonly string[],
	index: number,
	line: string,
): { block: StreamingBlock; nextIndex: number } {
	// Horizontal rule
	if (HR_PATTERN.test(line)) {
		return {
			block: { type: 'hr', content: '', complete: true },
			nextIndex: index + 1,
		};
	}

	// Heading
	const headingMatch = HEADING_PATTERN.exec(line);
	if (headingMatch) {
		return {
			block: {
				type: 'heading',
				content: headingMatch[2] ?? '',
				headingLevel: (headingMatch[1] ?? '').length,
				complete: true,
			},
			nextIndex: index + 1,
		};
	}

	// Code block
	const codeMatch = CODE_FENCE_OPEN.exec(line);
	if (codeMatch) {
		return parseCodeBlock(lines, index + 1, codeMatch[1] ?? '');
	}

	// Blockquote
	if (line.startsWith('>')) {
		return parseBlockquote(lines, index);
	}

	// List
	const listMatch = LIST_ITEM_PATTERN.exec(line);
	if (listMatch) {
		const isOrdered = /^\d+\./.test(listMatch[2] ?? '');
		return parseList(lines, index, isOrdered);
	}

	// Paragraph (default)
	return parseParagraph(lines, index + 1, line);
}

/**
 * Parses raw markdown source into blocks, handling incomplete/streaming content.
 *
 * @param source - The raw markdown source
 * @returns Array of parsed blocks
 *
 * @example
 * ```typescript
 * import { parseStreamingBlocks } from 'blecsd';
 *
 * // Handles incomplete code blocks gracefully
 * const blocks = parseStreamingBlocks('# Title\n\n```js\nconst x');
 * // Last block is marked complete: false
 * ```
 */
export function parseStreamingBlocks(source: string): readonly StreamingBlock[] {
	const lines = source.split('\n');
	const blocks: StreamingBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined || line.trim() === '') {
			i++;
			continue;
		}

		const result = parseSingleBlock(lines, i, line);
		blocks.push(result.block);
		i = result.nextIndex;
	}

	return blocks;
}

// INLINE FORMATTING

/**
 * Applies inline markdown formatting (bold, italic, code, links) to text.
 *
 * @param text - Raw text with markdown inline formatting
 * @param theme - Theme colors to use
 * @returns Formatted text with ANSI sequences
 */
export function formatInline(text: string, theme: StreamingMarkdownTheme): string {
	let result = text;

	// Code (backticks) - must be done before bold/italic to avoid conflicts
	result = result.replace(/`([^`]+)`/g, `${theme.code}\`$1\`${theme.reset}`);

	// Bold + italic (***text*** or ___text___)
	result = result.replace(/\*{3}(.+?)\*{3}/g, `${theme.bold}${theme.italic}$1${theme.reset}`);

	// Bold (**text** or __text__)
	result = result.replace(/\*{2}(.+?)\*{2}/g, `${theme.bold}$1${theme.reset}`);
	result = result.replace(/__(.+?)__/g, `${theme.bold}$1${theme.reset}`);

	// Italic (*text* or _text_) - avoid matching inside words for underscore
	result = result.replace(/\*(.+?)\*/g, `${theme.italic}$1${theme.reset}`);
	result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, `${theme.italic}$1${theme.reset}`);

	// Links [text](url)
	result = result.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		`${theme.link}$1${theme.reset} (${theme.code}$2${theme.reset})`,
	);

	// Strikethrough ~~text~~
	result = result.replace(/~~(.+?)~~/g, `\x1b[9m$1${theme.reset}`);

	return result;
}

// BLOCK RENDERING

/**
 * Wraps text to a given width, respecting word boundaries where possible.
 *
 * @param text - Text to wrap
 * @param width - Maximum width
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, width: number): readonly string[] {
	if (width <= 0) return [text];
	if (text.length <= width) return [text];

	const words = text.split(/(\s+)/);
	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		if (current.length + word.length <= width) {
			current += word;
		} else if (current.length === 0) {
			// Word longer than width, hard break
			let remaining = word;
			while (remaining.length > width) {
				lines.push(remaining.slice(0, width));
				remaining = remaining.slice(width);
			}
			current = remaining;
		} else {
			lines.push(current);
			current = word.trimStart();
		}
	}
	if (current.length > 0) {
		lines.push(current);
	}

	return lines;
}

// --- Per-block-type renderers ---

function renderHeadingBlock(
	block: StreamingBlock,
	theme: StreamingMarkdownTheme,
): readonly string[] {
	const level = block.headingLevel ?? 1;
	const prefix = '#'.repeat(level);
	return [`${theme.heading}${prefix} ${formatInline(block.content, theme)}${theme.reset}`];
}

function renderCodeBlockLines(
	block: StreamingBlock,
	config: StreamingMarkdownConfig,
): readonly string[] {
	const { theme, wrapWidth } = config;
	const lines: string[] = [];
	const lang = block.language ?? '';
	const langLabel = lang ? ` ${lang}` : '';
	const borderChar = '\u2500';

	lines.push(
		`${theme.codeBlock}\u250c${borderChar.repeat(Math.max(0, wrapWidth - 2 - langLabel.length))}${langLabel}${theme.reset}`,
	);

	const codeLines = block.content.split('\n');
	const shouldHighlight = config.syntaxHighlight && lang && SUPPORTED_LANGUAGES.has(lang);
	for (const codeLine of codeLines) {
		const formatted = shouldHighlight
			? highlightCode(codeLine, lang as SupportedLanguage)
			: codeLine;
		lines.push(`${theme.codeBlock}\u2502${theme.reset} ${formatted}`);
	}

	if (!block.complete) {
		lines.push(`${theme.codeBlock}\u2502 ${theme.thinking}...${theme.reset}`);
	}

	lines.push(
		`${theme.codeBlock}\u2514${borderChar.repeat(Math.max(0, wrapWidth - 2))}${theme.reset}`,
	);
	return lines;
}

function renderListBlock(
	block: StreamingBlock,
	theme: StreamingMarkdownTheme,
	wrapWidth: number,
): readonly string[] {
	const items = block.content.split('\n');
	const lines: string[] = [];
	const indent = block.listOrdered ? 4 : 3;

	for (let idx = 0; idx < items.length; idx++) {
		const item = items[idx];
		if (item === undefined) continue;
		const bullet = block.listOrdered
			? `${theme.bullet}${idx + 1}.${theme.reset}`
			: `${theme.bullet}\u2022${theme.reset}`;
		const wrapped = wrapText(item, wrapWidth - indent);
		for (let j = 0; j < wrapped.length; j++) {
			const w = wrapped[j];
			if (w === undefined) continue;
			lines.push(
				j === 0
					? `  ${bullet} ${formatInline(w, theme)}`
					: `${' '.repeat(indent + 1)}${formatInline(w, theme)}`,
			);
		}
	}
	return lines;
}

/**
 * Renders a single block to output lines.
 *
 * @param block - The parsed block
 * @param config - Configuration
 * @returns Array of rendered lines
 */
export function renderBlock(
	block: StreamingBlock,
	config: StreamingMarkdownConfig,
): readonly string[] {
	const { theme, wrapWidth } = config;

	switch (block.type) {
		case 'heading':
			return renderHeadingBlock(block, theme);
		case 'code':
			return renderCodeBlockLines(block, config);
		case 'blockquote': {
			const quoteLines = block.content.split('\n');
			return quoteLines.map((line) => {
				const wrapped = wrapText(line, wrapWidth - 4);
				return wrapped
					.map((w) => `${theme.quote}\u2502 ${formatInline(w, theme)}${theme.reset}`)
					.join('\n');
			});
		}
		case 'list':
			return renderListBlock(block, theme, wrapWidth);
		case 'hr':
			return [`${theme.hr}${'\u2500'.repeat(wrapWidth)}${theme.reset}`];
		case 'paragraph':
			return wrapText(block.content, wrapWidth).map((line) => formatInline(line, theme));
		case 'empty':
			return [''];
	}
}

/**
 * Renders all blocks to output lines.
 *
 * @param blocks - Parsed blocks
 * @param config - Configuration
 * @returns Array of rendered lines
 */
export function renderAllBlocks(
	blocks: readonly StreamingBlock[],
	config: StreamingMarkdownConfig,
): readonly string[] {
	const lines: string[] = [];

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		if (block === undefined) continue;
		const blockLines = renderBlock(block, config);
		for (const line of blockLines) {
			lines.push(line);
		}
		// Blank line between blocks
		if (i < blocks.length - 1) {
			lines.push('');
		}
	}

	return lines;
}
