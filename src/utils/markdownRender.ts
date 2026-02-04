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
		// Check for code spans (highest priority)
		const codeMatch = remaining.slice(pos).match(/^`([^`]+)`/);
		if (codeMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({ type: 'code', content: codeMatch[1]! });
			remaining = remaining.slice(codeMatch[0].length);
			continue;
		}

		// Check for bold (**text** or __text__)
		const boldMatch = remaining.slice(pos).match(/^(\*\*|__)(.+?)\1/);
		if (boldMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({
				type: 'bold',
				content: boldMatch[2]!,
				children: parseInline(boldMatch[2]!),
			});
			remaining = remaining.slice(boldMatch[0].length);
			continue;
		}

		// Check for italic (*text* or _text_)
		const italicMatch = remaining.slice(pos).match(/^(\*|_)(.+?)\1/);
		if (italicMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({
				type: 'italic',
				content: italicMatch[2]!,
				children: parseInline(italicMatch[2]!),
			});
			remaining = remaining.slice(italicMatch[0].length);
			continue;
		}

		// Check for links [text](url)
		const linkMatch = remaining.slice(pos).match(/^\[([^\]]+)\]\(([^)]+)\)/);
		if (linkMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({
				type: 'link',
				content: linkMatch[1]!,
				href: linkMatch[2]!,
			});
			remaining = remaining.slice(linkMatch[0].length);
			continue;
		}

		// Check for images ![alt](url)
		const imageMatch = remaining.slice(pos).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
		if (imageMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({
				type: 'image',
				content: imageMatch[1]!,
				href: imageMatch[2]!,
			});
			remaining = remaining.slice(imageMatch[0].length);
			continue;
		}

		// Check for strikethrough ~~text~~
		const strikeMatch = remaining.slice(pos).match(/^~~(.+?)~~/);
		if (strikeMatch) {
			if (pos > 0) {
				elements.push({ type: 'text', content: remaining.slice(0, pos) });
				remaining = remaining.slice(pos);
				pos = 0;
			}
			elements.push({
				type: 'strikethrough',
				content: strikeMatch[1]!,
			});
			remaining = remaining.slice(strikeMatch[0].length);
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
		const line = lines[i]!;

		// Skip empty lines
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Check for heading
		const headingMatch = line.match(HEADING_PATTERN);
		if (headingMatch) {
			blocks.push({
				type: 'heading',
				source: line,
				lineStart: i,
				lineEnd: i + 1,
				hash: hashString(line),
				data: {
					kind: 'heading',
					level: headingMatch[1]?.length as 1 | 2 | 3 | 4 | 5 | 6,
					text: headingMatch[2]!,
					inline: parseInline(headingMatch[2]!),
				},
			});
			i++;
			continue;
		}

		// Check for horizontal rule
		if (HR_PATTERN.test(line)) {
			blocks.push({
				type: 'hr',
				source: line,
				lineStart: i,
				lineEnd: i + 1,
				hash: hashString(line),
				data: { kind: 'hr' },
			});
			i++;
			continue;
		}

		// Check for code fence
		const codeFenceMatch = line.match(CODE_FENCE_PATTERN);
		if (codeFenceMatch) {
			const fence = codeFenceMatch[1]!;
			const lang = codeFenceMatch[2] || '';
			const codeLines: string[] = [];
			const startLine = i;
			i++;

			while (i < lines.length) {
				const codeLine = lines[i]!;
				if (codeLine.startsWith(fence) && codeLine.trim() === fence) {
					i++;
					break;
				}
				codeLines.push(codeLine);
				i++;
			}

			const code = codeLines.join('\n');
			blocks.push({
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
			});
			continue;
		}

		// Check for blockquote
		const blockquoteMatch = line.match(BLOCKQUOTE_PATTERN);
		if (blockquoteMatch) {
			const quoteLines: string[] = [];
			const startLine = i;

			while (i < lines.length) {
				const quoteLine = lines[i];
				if (!quoteLine) break;
				const qMatch = quoteLine.match(BLOCKQUOTE_PATTERN);
				if (!qMatch && quoteLine.trim() !== '') break;
				quoteLines.push(qMatch ? qMatch[1]! : '');
				i++;
			}

			const content = quoteLines.join('\n');
			const nestedResult = parseMarkdown(content);

			blocks.push({
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
			});
			continue;
		}

		// Check for table
		if (
			i + 1 < lines.length &&
			TABLE_ROW_PATTERN.test(line) &&
			TABLE_SEP_PATTERN.test(lines[i + 1]!)
		) {
			const startLine = i;
			const headerLine = line;
			const sepLine = lines[i + 1]!;

			// Parse headers
			const headerCells = headerLine
				.slice(1, -1)
				.split('|')
				.map((cell) => ({
					content: cell.trim(),
					inline: parseInline(cell.trim()),
				}));

			// Parse alignments
			const alignments = sepLine
				.slice(1, -1)
				.split('|')
				.map((cell): 'left' | 'center' | 'right' | null => {
					const trimmed = cell.trim();
					if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
					if (trimmed.endsWith(':')) return 'right';
					if (trimmed.startsWith(':')) return 'left';
					return null;
				});

			i += 2;
			const rows: TableCell[][] = [];

			while (i < lines.length && TABLE_ROW_PATTERN.test(lines[i]!)) {
				const rowLine = lines[i]!;
				const rowCells = rowLine
					.slice(1, -1)
					.split('|')
					.map((cell) => ({
						content: cell.trim(),
						inline: parseInline(cell.trim()),
					}));
				rows.push(rowCells);
				i++;
			}

			blocks.push({
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
			});
			continue;
		}

		// Check for list
		const ulMatch = line.match(UL_PATTERN);
		const olMatch = line.match(OL_PATTERN);
		if (ulMatch || olMatch) {
			const startLine = i;
			const items: ListItem[] = [];
			const ordered = !!olMatch;
			const start = olMatch ? parseInt(olMatch[2]!, 10) : undefined;

			while (i < lines.length) {
				const listLine = lines[i];
				if (!listLine) break;

				const ulm = listLine.match(UL_PATTERN);
				const olm = listLine.match(OL_PATTERN);
				const match = ordered ? olm : ulm;

				if (!match && listLine.trim() === '') {
					// Empty line might end the list
					if (i + 1 < lines.length) {
						const nextLine = lines[i + 1]!;
						const nextMatch = ordered ? nextLine.match(OL_PATTERN) : nextLine.match(UL_PATTERN);
						if (!nextMatch) break;
					} else {
						break;
					}
					i++;
					continue;
				}

				if (!match) break;

				const indent = (match[1] || '').length;
				const content = ordered ? (match as RegExpMatchArray)[3]! : match[2]!;
				const taskMatch = content.match(TASK_PATTERN);

				items.push({
					content: taskMatch ? taskMatch[2]! : content,
					inline: parseInline(taskMatch ? taskMatch[2]! : content),
					indent,
					checked: taskMatch ? taskMatch[1]?.toLowerCase() === 'x' : undefined,
				});
				i++;
			}

			blocks.push({
				type: 'list',
				source: lines.slice(startLine, i).join('\n'),
				lineStart: startLine,
				lineEnd: i,
				hash: hashString(lines.slice(startLine, i).join('\n')),
				data: {
					kind: 'list',
					ordered,
					start,
					items,
				},
			});
			continue;
		}

		// Default: paragraph
		const paragraphLines: string[] = [];
		const startLine = i;

		while (i < lines.length) {
			const pLine = lines[i];
			if (pLine === undefined) break;
			if (pLine.trim() === '') break;
			// Check if next line starts a different block
			if (HEADING_PATTERN.test(pLine) && paragraphLines.length > 0) break;
			if (HR_PATTERN.test(pLine) && paragraphLines.length > 0) break;
			if (CODE_FENCE_PATTERN.test(pLine)) break;
			if (UL_PATTERN.test(pLine) && paragraphLines.length > 0) break;
			if (OL_PATTERN.test(pLine) && paragraphLines.length > 0) break;
			if (BLOCKQUOTE_PATTERN.test(pLine) && paragraphLines.length > 0) break;

			paragraphLines.push(pLine);
			i++;
		}

		if (paragraphLines.length > 0) {
			const text = paragraphLines.join(' ');
			blocks.push({
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
			});
		}
	}

	return {
		blocks,
		parseTimeMs: performance.now() - start,
	};
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

	switch (block.data.kind) {
		case 'heading': {
			const data = block.data;
			lines.push({
				content: `${'#'.repeat(data.level)} ${data.text}`,
				style: { bold: true },
				blockIndex: 0,
				lineInBlock: 0,
			});
			break;
		}

		case 'paragraph': {
			const data = block.data;
			lines.push({
				content: data.text,
				style: baseStyle,
				blockIndex: 0,
				lineInBlock: 0,
			});
			break;
		}

		case 'code': {
			const data = block.data;
			// Get grammar for the language
			const grammar = getGrammarByName(data.language || 'plaintext');

			// Get or create highlight cache
			let highlightCache = cache.highlightCaches.get(block.hash.toString());
			if (!highlightCache) {
				highlightCache = createHighlightCache(grammar);
				cache.highlightCaches.set(block.hash.toString(), highlightCache);
			} else if (highlightCache.grammar.name !== grammar.name) {
				// Update grammar if language changed
				setGrammar(highlightCache, grammar);
			}

			// Highlight the code (result stored in cache but we use raw lines for terminal)
			highlightWithCache(highlightCache, data.code);

			const codeLines = data.code.split('\n');
			for (let i = 0; i < codeLines.length; i++) {
				lines.push({
					content: codeLines[i]!,
					style: { dim: true }, // Code blocks are dimmed
					blockIndex: 0,
					lineInBlock: i,
				});
			}
			break;
		}

		case 'list': {
			const data = block.data;
			for (let i = 0; i < data.items.length; i++) {
				const item = data.items[i]!;
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
			break;
		}

		case 'table': {
			const data = block.data;
			// Header row
			const headerContent = data.headers.map((h) => h.content).join(' | ');
			lines.push({
				content: `| ${headerContent} |`,
				style: { bold: true },
				blockIndex: 0,
				lineInBlock: 0,
			});

			// Separator
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

			// Data rows
			for (let i = 0; i < data.rows.length; i++) {
				const row = data.rows[i]!;
				const rowContent = row.map((c) => c.content).join(' | ');
				lines.push({
					content: `| ${rowContent} |`,
					style: baseStyle,
					blockIndex: 0,
					lineInBlock: i + 2,
				});
			}
			break;
		}

		case 'blockquote': {
			const data = block.data;
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
				// Empty blockquote
				lines.push({
					content: '>',
					style: { italic: true },
					blockIndex: 0,
					lineInBlock: 0,
				});
			}
			break;
		}

		case 'hr': {
			lines.push({
				content: '---',
				style: { dim: true },
				blockIndex: 0,
				lineInBlock: 0,
			});
			break;
		}

		case 'html': {
			const data = block.data;
			const htmlLines = data.html.split('\n');
			for (let i = 0; i < htmlLines.length; i++) {
				lines.push({
					content: htmlLines[i]!,
					style: { dim: true },
					blockIndex: 0,
					lineInBlock: i,
				});
			}
			break;
		}
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

	for (let blockIdx = 0; blockIdx < result.blocks.length; blockIdx++) {
		const block = result.blocks[blockIdx]!;
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
