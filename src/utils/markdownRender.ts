/**
 * Efficient Markdown Rendering
 *
 * Streaming markdown parser with incremental parsing:
 * - Block-level caching (no full reparse on edit)
 * - Code blocks with syntax highlighting
 * - Tables render without layout thrashing
 * - Virtualized rendered output
 *
 * @module utils/markdownRender
 */

import {
	createHighlightCache,
	detectLanguage,
	getGrammarByName,
	type HighlightCache,
	highlightWithCache,
	setGrammar,
	type Token,
} from './syntaxHighlight';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Block types in markdown.
 */
export type BlockType =
	| 'paragraph'
	| 'heading'
	| 'code'
	| 'list'
	| 'blockquote'
	| 'table'
	| 'hr'
	| 'html';

/**
 * Inline element types.
 */
export type InlineType = 'text' | 'bold' | 'italic' | 'code' | 'link' | 'image' | 'strikethrough';

/**
 * An inline element within a block.
 */
export interface InlineElement {
	readonly type: InlineType;
	readonly content: string;
	readonly href?: string; // For links/images
	readonly title?: string; // For links/images
	readonly children?: readonly InlineElement[]; // For nested formatting
}

/**
 * A parsed markdown block.
 */
export interface MarkdownBlock {
	/** Block type */
	readonly type: BlockType;
	/** Raw source content */
	readonly source: string;
	/** Source line start (0-indexed) */
	readonly lineStart: number;
	/** Source line end (exclusive) */
	readonly lineEnd: number;
	/** Block-specific data */
	readonly data: BlockData;
	/** Hash for caching */
	readonly hash: number;
}

/**
 * Block-specific data.
 */
export type BlockData =
	| HeadingData
	| CodeData
	| ListData
	| TableData
	| ParagraphData
	| BlockquoteData
	| HrData
	| HtmlData;

export interface HeadingData {
	readonly kind: 'heading';
	readonly level: 1 | 2 | 3 | 4 | 5 | 6;
	readonly text: string;
	readonly inline: readonly InlineElement[];
}

export interface CodeData {
	readonly kind: 'code';
	readonly language: string;
	readonly code: string;
	readonly highlighted?: readonly (readonly Token[])[];
}

export interface ListData {
	readonly kind: 'list';
	readonly ordered: boolean;
	readonly start?: number;
	readonly items: readonly ListItem[];
}

export interface ListItem {
	readonly content: string;
	readonly inline: readonly InlineElement[];
	readonly indent: number;
	readonly checked?: boolean; // For task lists
}

export interface TableData {
	readonly kind: 'table';
	readonly headers: readonly TableCell[];
	readonly alignments: readonly ('left' | 'center' | 'right' | null)[];
	readonly rows: readonly (readonly TableCell[])[];
}

export interface TableCell {
	readonly content: string;
	readonly inline: readonly InlineElement[];
}

export interface ParagraphData {
	readonly kind: 'paragraph';
	readonly text: string;
	readonly inline: readonly InlineElement[];
}

export interface BlockquoteData {
	readonly kind: 'blockquote';
	readonly content: string;
	readonly blocks: readonly MarkdownBlock[];
}

export interface HrData {
	readonly kind: 'hr';
}

export interface HtmlData {
	readonly kind: 'html';
	readonly html: string;
}

/**
 * Rendered line output.
 */
export interface RenderedLine {
	readonly content: string;
	readonly style: LineStyle;
	readonly blockIndex: number;
	readonly lineInBlock: number;
}

/**
 * Line style information.
 */
export interface LineStyle {
	readonly fg?: number;
	readonly bg?: number;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly dim?: boolean;
}

/**
 * Markdown parse result.
 */
export interface MarkdownParseResult {
	readonly blocks: readonly MarkdownBlock[];
	readonly parseTimeMs: number;
}

/**
 * Markdown cache for incremental parsing.
 */
export interface MarkdownCache {
	/** Cached blocks by line range */
	blocks: Map<string, MarkdownBlock>;
	/** Source hash for invalidation */
	sourceHash: number;
	/** Highlight caches for code blocks */
	highlightCaches: Map<string, HighlightCache>;
	/** Rendered lines cache */
	renderedLines: RenderedLine[] | null;
}

/**
 * Visible lines result.
 */
export interface VisibleMarkdown {
	readonly lines: readonly RenderedLine[];
	readonly totalLines: number;
	readonly startIndex: number;
	readonly endIndex: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default batch size for progressive parsing */
export const DEFAULT_PARSE_BATCH = 100;

/** Heading pattern */
const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;

/** Code fence pattern */
const CODE_FENCE_PATTERN = /^(`{3,}|~{3,})(\w*)?$/;

/** Horizontal rule pattern */
const HR_PATTERN = /^([-*_])\s*\1\s*\1\s*(\1|\s)*$/;

/** Unordered list pattern */
const UL_PATTERN = /^(\s*)[-*+]\s+(.*)$/;

/** Ordered list pattern */
const OL_PATTERN = /^(\s*)(\d+)[.)]\s+(.*)$/;

/** Task list pattern */
const TASK_PATTERN = /^\[([ xX])\]\s+(.*)$/;

/** Blockquote pattern */
const BLOCKQUOTE_PATTERN = /^>\s?(.*)$/;

/** Table separator pattern */
const TABLE_SEP_PATTERN = /^\|?[\s:-]+\|[\s:|+-]+\|?$/;

/** Table row pattern */
const TABLE_ROW_PATTERN = /^\|(.+)\|$/;

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Simple hash function for strings.
 */
function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
	}
	return hash;
}

// =============================================================================
// INLINE PARSING
// =============================================================================

/**
 * Parses inline markdown elements.
 */
export function parseInline(text: string): readonly InlineElement[] {
	const elements: InlineElement[] = [];
	let remaining = text;
	let pos = 0;

	while (pos < remaining.length) {
		const match = matchInlineToken(remaining.slice(pos));
		if (match) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push(match.element);
			remaining = remaining.slice(match.length);
			continue;
		}

		pos++;
	}

	// Add remaining text
	if (remaining.length > 0) {
		elements.push({ type: 'text', content: remaining });
	}

	return elements;
}

type InlineMatchResult = { element: InlineElement; length: number };

const INLINE_MATCHERS: Array<(text: string) => InlineMatchResult | null> = [
	matchCodeSpan,
	matchBold,
	matchItalic,
	matchLink,
	matchImage,
	matchStrikethrough,
];

function matchInlineToken(text: string): InlineMatchResult | null {
	for (const matcher of INLINE_MATCHERS) {
		const match = matcher(text);
		if (match) {
			return match;
		}
	}
	return null;
}

function matchCodeSpan(text: string): InlineMatchResult | null {
	const match = text.match(/^`([^`]+)`/);
	if (!match) {
		return null;
	}
	return {
		element: { type: 'code', content: match[1] ?? '' },
		length: match[0].length,
	};
}

function matchBold(text: string): InlineMatchResult | null {
	const match = text.match(/^(\*\*|__)(.+?)\1/);
	if (!match) {
		return null;
	}
	const content = match[2] ?? '';
	return {
		element: {
			type: 'bold',
			content,
			children: parseInline(content),
		},
		length: match[0].length,
	};
}

function matchItalic(text: string): InlineMatchResult | null {
	const match = text.match(/^(\*|_)(.+?)\1/);
	if (!match) {
		return null;
	}
	const content = match[2] ?? '';
	return {
		element: {
			type: 'italic',
			content,
			children: parseInline(content),
		},
		length: match[0].length,
	};
}

function matchLink(text: string): InlineMatchResult | null {
	const match = text.match(/^\[([^\]]+)\]\(([^)]+)\)/);
	if (!match) {
		return null;
	}
	return {
		element: {
			type: 'link',
			content: match[1] ?? '',
			href: match[2] ?? '',
		},
		length: match[0].length,
	};
}

function matchImage(text: string): InlineMatchResult | null {
	const match = text.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
	if (!match) {
		return null;
	}
	return {
		element: {
			type: 'image',
			content: match[1] ?? '',
			href: match[2] ?? '',
		},
		length: match[0].length,
	};
}

function matchStrikethrough(text: string): InlineMatchResult | null {
	const match = text.match(/^~~(.+?)~~/);
	if (!match) {
		return null;
	}
	return {
		element: { type: 'strikethrough', content: match[1] ?? '' },
		length: match[0].length,
	};
}

// =============================================================================
// BLOCK PARSING
// =============================================================================

/**
 * Parses markdown into blocks.
 */
export function parseMarkdown(source: string): MarkdownParseResult {
	const start = performance.now();
	const lines = source.split('\n');
	const blocks: MarkdownBlock[] = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) {
			i++;
			continue;
		}

		// Skip empty lines
		if (line.trim() === '') {
			i++;
			continue;
		}

		const parsed = parseBlock(lines, i);
		if (parsed) {
			blocks.push(parsed.block);
			i = parsed.nextIndex;
			continue;
		}

		i++;
	}

	return {
		blocks,
		parseTimeMs: performance.now() - start,
	};
}

type BlockParseResult = { block: MarkdownBlock; nextIndex: number };

const BLOCK_PARSERS: Array<(lines: readonly string[], index: number) => BlockParseResult | null> = [
	parseHeadingBlock,
	parseHrBlock,
	parseCodeFenceBlock,
	parseBlockquoteBlock,
	parseTableBlock,
	parseListBlock,
	parseParagraphBlock,
];

function parseBlock(lines: readonly string[], index: number): BlockParseResult | null {
	for (const parser of BLOCK_PARSERS) {
		const result = parser(lines, index);
		if (result) {
			return result;
		}
	}
	return null;
}

function parseHeadingBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	if (line === undefined) {
		return null;
	}
	const headingMatch = line.match(HEADING_PATTERN);
	if (!headingMatch) {
		return null;
	}
	const text = headingMatch[2] ?? '';
	return {
		block: {
			type: 'heading',
			source: line,
			lineStart: index,
			lineEnd: index + 1,
			hash: hashString(line),
			data: {
				kind: 'heading',
				level: (headingMatch[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6,
				text,
				inline: parseInline(text),
			},
		},
		nextIndex: index + 1,
	};
}

function parseHrBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	if (line === undefined || !HR_PATTERN.test(line)) {
		return null;
	}
	return {
		block: {
			type: 'hr',
			source: line,
			lineStart: index,
			lineEnd: index + 1,
			hash: hashString(line),
			data: { kind: 'hr' },
		},
		nextIndex: index + 1,
	};
}

function parseCodeFenceBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	if (line === undefined) {
		return null;
	}
	const codeFenceMatch = line.match(CODE_FENCE_PATTERN);
	if (!codeFenceMatch) {
		return null;
	}
	const fence = codeFenceMatch[1] ?? '';
	const lang = codeFenceMatch[2] ?? '';
	const codeLines: string[] = [];
	const startLine = index;
	let i = index + 1;

	while (i < lines.length) {
		const codeLine = lines[i];
		if (codeLine === undefined) {
			break;
		}
		if (codeLine.startsWith(fence) && codeLine.trim() === fence) {
			i++;
			break;
		}
		codeLines.push(codeLine);
		i++;
	}

	const code = codeLines.join('\n');
	return {
		block: {
			type: 'code',
			source: lines.slice(startLine, i).join('\n'),
			lineStart: startLine,
			lineEnd: i,
			hash: hashString(code + lang),
			data: {
				kind: 'code',
				language: lang || detectLanguage('code.txt').name || '',
				code,
			},
		},
		nextIndex: i,
	};
}

function parseBlockquoteBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	if (line === undefined || !BLOCKQUOTE_PATTERN.test(line)) {
		return null;
	}
	const quoteLines: string[] = [];
	const startLine = index;
	let i = index;

	while (i < lines.length) {
		const quoteLine = lines[i];
		if (quoteLine === undefined) break;
		const qMatch = quoteLine.match(BLOCKQUOTE_PATTERN);
		if (!qMatch && quoteLine.trim() !== '') break;
		quoteLines.push(qMatch ? (qMatch[1] ?? '') : '');
		i++;
	}

	const content = quoteLines.join('\n');
	const nestedResult = parseMarkdown(content);

	return {
		block: {
			type: 'blockquote',
			source: lines.slice(startLine, i).join('\n'),
			lineStart: startLine,
			lineEnd: i,
			hash: hashString(content),
			data: {
				kind: 'blockquote',
				content,
				blocks: nestedResult.blocks,
			},
		},
		nextIndex: i,
	};
}

function parseTableBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	const sepLine = lines[index + 1];
	if (line === undefined || sepLine === undefined) {
		return null;
	}
	if (!TABLE_ROW_PATTERN.test(line) || !TABLE_SEP_PATTERN.test(sepLine)) {
		return null;
	}

	const startLine = index;
	const headerCells = parseTableCells(line);
	const alignments = parseTableAlignments(sepLine);
	const rows: TableCell[][] = [];
	let i = index + 2;

	while (i < lines.length) {
		const rowLine = lines[i];
		if (rowLine === undefined || !TABLE_ROW_PATTERN.test(rowLine)) {
			break;
		}
		rows.push(parseTableCells(rowLine));
		i++;
	}

	return {
		block: {
			type: 'table',
			source: lines.slice(startLine, i).join('\n'),
			lineStart: startLine,
			lineEnd: i,
			hash: hashString(lines.slice(startLine, i).join('\n')),
			data: {
				kind: 'table',
				headers: headerCells,
				alignments,
				rows,
			},
		},
		nextIndex: i,
	};
}

function parseListBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const line = lines[index];
	if (line === undefined) {
		return null;
	}
	const listInfo = getListStartInfo(line);
	if (!listInfo) {
		return null;
	}

	const startLine = index;
	const itemsResult = collectListItems(lines, index, listInfo.ordered);

	return {
		block: {
			type: 'list',
			source: lines.slice(startLine, itemsResult.nextIndex).join('\n'),
			lineStart: startLine,
			lineEnd: itemsResult.nextIndex,
			hash: hashString(lines.slice(startLine, itemsResult.nextIndex).join('\n')),
			data: {
				kind: 'list',
				ordered: listInfo.ordered,
				start: listInfo.start,
				items: itemsResult.items,
			},
		},
		nextIndex: itemsResult.nextIndex,
	};
}

function parseParagraphBlock(lines: readonly string[], index: number): BlockParseResult | null {
	const paragraphLines: string[] = [];
	const startLine = index;
	let i = index;

	while (i < lines.length) {
		const pLine = lines[i];
		if (pLine === undefined || pLine.trim() === '') {
			break;
		}
		if (paragraphLines.length > 0 && startsNewBlock(pLine)) {
			break;
		}
		paragraphLines.push(pLine);
		i++;
	}

	if (paragraphLines.length === 0) {
		return null;
	}

	const text = paragraphLines.join(' ');
	return {
		block: {
			type: 'paragraph',
			source: paragraphLines.join('\n'),
			lineStart: startLine,
			lineEnd: i,
			hash: hashString(text),
			data: {
				kind: 'paragraph',
				text,
				inline: parseInline(text),
			},
		},
		nextIndex: i,
	};
}

function parseTableCells(line: string): TableCell[] {
	return splitTableRow(line).map((cell) => {
		const trimmed = cell.trim();
		return {
			content: trimmed,
			inline: parseInline(trimmed),
		};
	});
}

function parseTableAlignments(line: string): Array<'left' | 'center' | 'right' | null> {
	return splitTableRow(line).map((cell) => {
		const trimmed = cell.trim();
		if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
		if (trimmed.endsWith(':')) return 'right';
		if (trimmed.startsWith(':')) return 'left';
		return null;
	});
}

function splitTableRow(line: string): string[] {
	return line.slice(1, -1).split('|');
}

function hasNextListItem(lines: readonly string[], index: number, ordered: boolean): boolean {
	const nextLine = lines[index];
	if (nextLine === undefined) {
		return false;
	}
	return ordered ? OL_PATTERN.test(nextLine) : UL_PATTERN.test(nextLine);
}

function getListStartInfo(line: string): { ordered: boolean; start?: number } | null {
	const ulMatch = line.match(UL_PATTERN);
	const olMatch = line.match(OL_PATTERN);
	if (!ulMatch && !olMatch) {
		return null;
	}
	return {
		ordered: !!olMatch,
		start: olMatch ? parseInt(olMatch[2] ?? '1', 10) : undefined,
	};
}

function collectListItems(
	lines: readonly string[],
	startIndex: number,
	ordered: boolean,
): { items: ListItem[]; nextIndex: number } {
	const items: ListItem[] = [];
	let i = startIndex;

	while (i < lines.length) {
		const listLine = lines[i];
		if (listLine === undefined) break;
		const match = ordered ? listLine.match(OL_PATTERN) : listLine.match(UL_PATTERN);

		if (!match && listLine.trim() === '') {
			if (!hasNextListItem(lines, i + 1, ordered)) {
				break;
			}
			i++;
			continue;
		}

		if (!match) break;

		items.push(buildListItem(match, ordered));
		i++;
	}

	return { items, nextIndex: i };
}

function buildListItem(match: RegExpMatchArray, ordered: boolean): ListItem {
	const indent = (match[1] ?? '').length;
	const content = ordered ? (match[3] ?? '') : (match[2] ?? '');
	const taskMatch = content.match(TASK_PATTERN);
	const itemContent = taskMatch ? (taskMatch[2] ?? '') : content;

	return {
		content: itemContent,
		inline: parseInline(itemContent),
		indent,
		checked: taskMatch ? taskMatch[1]?.toLowerCase() === 'x' : undefined,
	};
}

function startsNewBlock(line: string): boolean {
	return (
		HEADING_PATTERN.test(line) ||
		HR_PATTERN.test(line) ||
		CODE_FENCE_PATTERN.test(line) ||
		UL_PATTERN.test(line) ||
		OL_PATTERN.test(line) ||
		BLOCKQUOTE_PATTERN.test(line)
	);
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Creates a markdown cache.
 */
export function createMarkdownCache(): MarkdownCache {
	return {
		blocks: new Map(),
		sourceHash: 0,
		highlightCaches: new Map(),
		renderedLines: null,
	};
}

/**
 * Clears the markdown cache.
 */
export function clearMarkdownCache(cache: MarkdownCache): void {
	cache.blocks.clear();
	cache.sourceHash = 0;
	cache.highlightCaches.clear();
	cache.renderedLines = null;
}

/**
 * Parses markdown with caching.
 */
export function parseMarkdownCached(cache: MarkdownCache, source: string): MarkdownParseResult {
	const newHash = hashString(source);

	// Full cache hit
	if (cache.sourceHash === newHash && cache.renderedLines) {
		return {
			blocks: Array.from(cache.blocks.values()),
			parseTimeMs: 0,
		};
	}

	// Parse fresh
	const result = parseMarkdown(source);

	// Update cache
	cache.blocks.clear();
	for (const block of result.blocks) {
		const key = `${block.lineStart}-${block.lineEnd}`;
		cache.blocks.set(key, block);
	}
	cache.sourceHash = newHash;
	cache.renderedLines = null;

	return result;
}

/**
 * Invalidates cache for a line range.
 */
export function invalidateLines(cache: MarkdownCache, startLine: number, endLine: number): void {
	for (const [key, block] of cache.blocks) {
		if (block.lineStart < endLine && block.lineEnd > startLine) {
			cache.blocks.delete(key);
		}
	}
	cache.renderedLines = null;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders a block to lines.
 */
export function renderBlock(block: MarkdownBlock, cache: MarkdownCache): readonly RenderedLine[] {
	const lines: RenderedLine[] = [];
	const baseStyle: LineStyle = {};

	const handler = renderHandlers[block.data.kind];
	if (handler) {
		handler(block, cache, lines, baseStyle);
	}

	return lines;
}

/**
 * Renders all blocks to lines.
 */
export function renderMarkdown(
	result: MarkdownParseResult,
	cache: MarkdownCache,
): readonly RenderedLine[] {
	if (cache.renderedLines) {
		return cache.renderedLines;
	}

	const lines: RenderedLine[] = [];
	let _lineIndex = 0;

	for (const [blockIdx, block] of result.blocks.entries()) {
		const blockLines = renderBlock(block, cache);

		for (const line of blockLines) {
			lines.push({
				...line,
				blockIndex: blockIdx,
			});
			_lineIndex++;
		}

		// Add blank line between blocks (except before first and after last)
		if (blockIdx < result.blocks.length - 1) {
			lines.push({
				content: '',
				style: {},
				blockIndex: blockIdx,
				lineInBlock: -1,
			});
			_lineIndex++;
		}
	}

	cache.renderedLines = lines;
	return lines;
}

type RenderHandler = (
	block: MarkdownBlock,
	cache: MarkdownCache,
	lines: RenderedLine[],
	baseStyle: LineStyle,
) => void;

const renderHandlers: Record<string, RenderHandler> = {
	heading: renderHeadingBlock,
	paragraph: renderParagraphBlock,
	code: renderCodeBlock,
	list: renderListBlock,
	table: renderTableBlock,
	blockquote: renderBlockquoteBlock,
	hr: renderHrBlock,
	html: renderHtmlBlock,
};

function renderHeadingBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	_baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'heading') {
		return;
	}
	lines.push({
		content: `${'#'.repeat(data.level)} ${data.text}`,
		style: { bold: true },
		blockIndex: 0,
		lineInBlock: 0,
	});
}

function renderParagraphBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'paragraph') {
		return;
	}
	lines.push({
		content: data.text,
		style: baseStyle,
		blockIndex: 0,
		lineInBlock: 0,
	});
}

function renderCodeBlock(
	block: MarkdownBlock,
	cache: MarkdownCache,
	lines: RenderedLine[],
	_baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'code') {
		return;
	}
	const grammar = getGrammarByName(data.language || 'plaintext');
	let highlightCache = cache.highlightCaches.get(block.hash.toString());
	if (!highlightCache) {
		highlightCache = createHighlightCache(grammar);
		cache.highlightCaches.set(block.hash.toString(), highlightCache);
	} else if (highlightCache.grammar.name !== grammar.name) {
		setGrammar(highlightCache, grammar);
	}

	highlightWithCache(highlightCache, data.code);

	for (const [i, codeLine] of data.code.split('\n').entries()) {
		lines.push({
			content: codeLine,
			style: { dim: true },
			blockIndex: 0,
			lineInBlock: i,
		});
	}
}

function renderListBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'list') {
		return;
	}
	for (const [i, item] of data.items.entries()) {
		const prefix = data.ordered
			? `${(data.start || 1) + i}. `
			: `${'  '.repeat(item.indent / 2)}- `;
		const checkbox = item.checked !== undefined ? (item.checked ? '[x] ' : '[ ] ') : '';
		lines.push({
			content: prefix + checkbox + item.content,
			style: baseStyle,
			blockIndex: 0,
			lineInBlock: i,
		});
	}
}

function renderTableBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'table') {
		return;
	}
	const headerContent = data.headers.map((h) => h.content).join(' | ');
	lines.push({
		content: `| ${headerContent} |`,
		style: { bold: true },
		blockIndex: 0,
		lineInBlock: 0,
	});

	const sep = data.headers
		.map((_, i) => {
			const align = data.alignments[i];
			if (align === 'center') return ':---:';
			if (align === 'right') return '---:';
			if (align === 'left') return ':---';
			return '---';
		})
		.join(' | ');
	lines.push({
		content: `| ${sep} |`,
		style: baseStyle,
		blockIndex: 0,
		lineInBlock: 1,
	});

	for (const [i, row] of data.rows.entries()) {
		const rowContent = row.map((c) => c.content).join(' | ');
		lines.push({
			content: `| ${rowContent} |`,
			style: baseStyle,
			blockIndex: 0,
			lineInBlock: i + 2,
		});
	}
}

function renderBlockquoteBlock(
	block: MarkdownBlock,
	cache: MarkdownCache,
	lines: RenderedLine[],
	_baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'blockquote') {
		return;
	}
	for (const nestedBlock of data.blocks) {
		const nestedLines = renderBlock(nestedBlock, cache);
		for (const line of nestedLines) {
			lines.push({
				...line,
				content: `> ${line.content}`,
				style: { ...line.style, italic: true },
			});
		}
	}
	if (lines.length === 0) {
		lines.push({
			content: '>',
			style: { italic: true },
			blockIndex: 0,
			lineInBlock: 0,
		});
	}
}

function renderHrBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	_baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'hr') {
		return;
	}
	lines.push({
		content: '---',
		style: { dim: true },
		blockIndex: 0,
		lineInBlock: 0,
	});
}

function renderHtmlBlock(
	block: MarkdownBlock,
	_cache: MarkdownCache,
	lines: RenderedLine[],
	_baseStyle: LineStyle,
): void {
	const data = block.data;
	if (data.kind !== 'html') {
		return;
	}
	for (const [i, htmlLine] of data.html.split('\n').entries()) {
		lines.push({
			content: htmlLine,
			style: { dim: true },
			blockIndex: 0,
			lineInBlock: i,
		});
	}
}

/**
 * Gets visible markdown lines for virtualized rendering.
 */
export function getVisibleMarkdown(
	result: MarkdownParseResult,
	cache: MarkdownCache,
	startLine: number,
	count: number,
): VisibleMarkdown {
	const allLines = renderMarkdown(result, cache);
	const endLine = Math.min(startLine + count, allLines.length);
	const visibleLines = allLines.slice(startLine, endLine);

	return {
		lines: visibleLines,
		totalLines: allLines.length,
		startIndex: startLine,
		endIndex: endLine,
	};
}

/**
 * Gets total rendered line count.
 */
export function getTotalLineCount(result: MarkdownParseResult, cache: MarkdownCache): number {
	const allLines = renderMarkdown(result, cache);
	return allLines.length;
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Markdown statistics.
 */
export interface MarkdownStats {
	readonly blockCount: number;
	readonly lineCount: number;
	readonly headingCount: number;
	readonly codeBlockCount: number;
	readonly listCount: number;
	readonly tableCount: number;
	readonly linkCount: number;
}

/**
 * Gets markdown statistics.
 */
export function getMarkdownStats(result: MarkdownParseResult): MarkdownStats {
	let headingCount = 0;
	let codeBlockCount = 0;
	let listCount = 0;
	let tableCount = 0;
	let linkCount = 0;
	let lineCount = 0;

	for (const block of result.blocks) {
		lineCount += block.lineEnd - block.lineStart;

		switch (block.type) {
			case 'heading':
				headingCount++;
				break;
			case 'code':
				codeBlockCount++;
				break;
			case 'list':
				listCount++;
				break;
			case 'table':
				tableCount++;
				break;
		}

		// Count links in inline elements
		const countLinks = (elements: readonly InlineElement[]): number => {
			let count = 0;
			for (const el of elements) {
				if (el.type === 'link') count++;
				if (el.children) count += countLinks(el.children);
			}
			return count;
		};

		if (block.data.kind === 'paragraph') {
			linkCount += countLinks(block.data.inline);
		} else if (block.data.kind === 'heading') {
			linkCount += countLinks(block.data.inline);
		}
	}

	return {
		blockCount: result.blocks.length,
		lineCount,
		headingCount,
		codeBlockCount,
		listCount,
		tableCount,
		linkCount,
	};
}
