/**
 * Streaming Markdown Widget
 *
 * Renders markdown content that streams in character-by-character or
 * chunk-by-chunk. Designed for LLM output where markdown arrives
 * incrementally. Handles incomplete blocks (unclosed code fences,
 * partial headers) gracefully.
 *
 * Features:
 * - Incremental markdown parsing as content streams in
 * - Syntax highlighting for code blocks (via syntaxHighlight module)
 * - Auto-scroll with detach-on-scroll-up behavior
 * - "Thinking" indicator while waiting for first token
 * - Dirty region tracking for minimal re-renders
 * - Handles partial/incomplete markdown blocks
 *
 * @module widgets/streamingMarkdown
 */

import { z } from 'zod';
import { markDirty } from '../components/renderable';
import type { Entity, World } from '../core/types';
import { highlightCode, type SupportedLanguage } from '../text/syntaxHighlight';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the streaming markdown widget.
 */
export interface StreamingMarkdownConfig {
	/** Width for line wrapping in columns (default: 80) */
	readonly wrapWidth: number;
	/** Maximum number of rendered lines to retain (default: 10000, 0 = unlimited) */
	readonly maxLines: number;
	/** Whether to auto-scroll to bottom on new content (default: true) */
	readonly autoScroll: boolean;
	/** Whether to enable syntax highlighting in code blocks (default: true) */
	readonly syntaxHighlight: boolean;
	/** Text to show while waiting for first token (default: 'Thinking...') */
	readonly thinkingText: string;
	/** Whether to show the thinking indicator (default: true) */
	readonly showThinking: boolean;
	/** Theme colors for markdown elements */
	readonly theme: StreamingMarkdownTheme;
}

/**
 * Theme colors for markdown rendering.
 */
export interface StreamingMarkdownTheme {
	/** Color for headings (ANSI escape) */
	readonly heading: string;
	/** Color for bold text */
	readonly bold: string;
	/** Color for italic text */
	readonly italic: string;
	/** Color for inline code */
	readonly code: string;
	/** Color for code block border/background */
	readonly codeBlock: string;
	/** Color for blockquotes */
	readonly quote: string;
	/** Color for list bullets */
	readonly bullet: string;
	/** Color for links */
	readonly link: string;
	/** Color for horizontal rules */
	readonly hr: string;
	/** Color for thinking indicator */
	readonly thinking: string;
	/** Reset sequence */
	readonly reset: string;
}

/**
 * A parsed markdown block in the streaming context.
 */
export type StreamingBlockType =
	| 'paragraph'
	| 'heading'
	| 'code'
	| 'blockquote'
	| 'list'
	| 'hr'
	| 'empty';

/**
 * A streaming markdown block with rendering metadata.
 */
export interface StreamingBlock {
	readonly type: StreamingBlockType;
	readonly content: string;
	readonly language?: string;
	readonly headingLevel?: number;
	readonly listOrdered?: boolean;
	readonly complete: boolean;
}

/**
 * Dirty region for incremental rendering.
 */
export interface MarkdownDirtyRegion {
	/** First line that changed (0-indexed) */
	readonly startLine: number;
	/** Number of lines that changed */
	readonly lineCount: number;
	/** Whether the entire buffer needs re-render */
	readonly fullRedraw: boolean;
}

/**
 * Streaming markdown state.
 */
export interface StreamingMarkdownState {
	/** Raw markdown source accumulated so far */
	readonly source: string;
	/** Parsed blocks */
	readonly blocks: readonly StreamingBlock[];
	/** Rendered output lines */
	readonly renderedLines: readonly string[];
	/** Current scroll position (line index at top of viewport) */
	readonly scrollTop: number;
	/** Viewport height in lines */
	readonly viewportHeight: number;
	/** Whether currently streaming */
	readonly isStreaming: boolean;
	/** Whether we've received any content yet */
	readonly hasContent: boolean;
	/** Configuration */
	readonly config: StreamingMarkdownConfig;
	/** Dirty region for incremental rendering */
	readonly dirty: MarkdownDirtyRegion | null;
}

/**
 * Progress information for streaming markdown.
 */
export interface StreamingMarkdownProgress {
	/** Total characters received */
	readonly totalChars: number;
	/** Number of rendered lines */
	readonly totalLines: number;
	/** Lines visible in viewport */
	readonly visibleLines: number;
	/** Whether auto-scrolling is active */
	readonly isAutoScrolling: boolean;
	/** Whether a stream is currently active */
	readonly isStreaming: boolean;
	/** Whether any content has been received */
	readonly hasContent: boolean;
	/** Number of parsed blocks */
	readonly blockCount: number;
}

/**
 * Streaming markdown widget interface.
 */
export interface StreamingMarkdownWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Append raw markdown text */
	append(text: string): StreamingMarkdownWidget;
	/** Clear all content */
	clear(): StreamingMarkdownWidget;

	/** Get current state */
	getState(): StreamingMarkdownState;
	/** Get visible rendered lines for display */
	getVisibleLines(): readonly string[];
	/** Get streaming progress */
	getProgress(): StreamingMarkdownProgress;
	/** Get and clear dirty region */
	consumeDirty(): MarkdownDirtyRegion | null;

	/** Scroll to absolute line position */
	scrollTo(line: number): StreamingMarkdownWidget;
	/** Scroll by relative amount */
	scrollBy(delta: number): StreamingMarkdownWidget;
	/** Scroll to bottom */
	scrollToBottom(): StreamingMarkdownWidget;
	/** Scroll to top */
	scrollToTop(): StreamingMarkdownWidget;

	/** Set viewport height */
	setViewportHeight(height: number): StreamingMarkdownWidget;
	/** Set wrap width */
	setWrapWidth(width: number): StreamingMarkdownWidget;
	/** Enable/disable auto-scroll */
	setAutoScroll(enabled: boolean): StreamingMarkdownWidget;

	/** Mark stream as started (shows thinking indicator) */
	startStream(): StreamingMarkdownWidget;
	/** Mark stream as ended (flushes pending content) */
	endStream(): StreamingMarkdownWidget;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for StreamingMarkdownConfig validation.
 */
export const StreamingMarkdownConfigSchema = z.object({
	wrapWidth: z.number().int().positive().default(80),
	maxLines: z.number().int().nonnegative().default(10000),
	autoScroll: z.boolean().default(true),
	syntaxHighlight: z.boolean().default(true),
	thinkingText: z.string().default('Thinking...'),
	showThinking: z.boolean().default(true),
	theme: z
		.object({
			heading: z.string().default('\x1b[1;36m'),
			bold: z.string().default('\x1b[1m'),
			italic: z.string().default('\x1b[3m'),
			code: z.string().default('\x1b[33m'),
			codeBlock: z.string().default('\x1b[90m'),
			quote: z.string().default('\x1b[3;90m'),
			bullet: z.string().default('\x1b[36m'),
			link: z.string().default('\x1b[4;34m'),
			hr: z.string().default('\x1b[90m'),
			thinking: z.string().default('\x1b[2;3m'),
			reset: z.string().default('\x1b[0m'),
		})
		.optional(),
});

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_THEME: StreamingMarkdownTheme = {
	heading: '\x1b[1;36m',
	bold: '\x1b[1m',
	italic: '\x1b[3m',
	code: '\x1b[33m',
	codeBlock: '\x1b[90m',
	quote: '\x1b[3;90m',
	bullet: '\x1b[36m',
	link: '\x1b[4;34m',
	hr: '\x1b[90m',
	thinking: '\x1b[2;3m',
	reset: '\x1b[0m',
};

const DEFAULT_CONFIG: StreamingMarkdownConfig = {
	wrapWidth: 80,
	maxLines: 10000,
	autoScroll: true,
	syntaxHighlight: true,
	thinkingText: 'Thinking...',
	showThinking: true,
	theme: DEFAULT_THEME,
};

const SUPPORTED_LANGUAGES = new Set(['javascript', 'typescript', 'json', 'bash', 'shell', 'sh']);

// =============================================================================
// MARKDOWN PARSING (STREAMING-AWARE)
// =============================================================================

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

function parseParagraph(lines: readonly string[], startIndex: number, firstLine: string): ParseResult {
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

// =============================================================================
// INLINE FORMATTING
// =============================================================================

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

// =============================================================================
// BLOCK RENDERING
// =============================================================================

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

function renderHeadingBlock(block: StreamingBlock, theme: StreamingMarkdownTheme): readonly string[] {
	const level = block.headingLevel ?? 1;
	const prefix = '#'.repeat(level);
	return [`${theme.heading}${prefix} ${formatInline(block.content, theme)}${theme.reset}`];
}

function renderCodeBlockLines(block: StreamingBlock, config: StreamingMarkdownConfig): readonly string[] {
	const { theme, wrapWidth } = config;
	const lines: string[] = [];
	const lang = block.language ?? '';
	const langLabel = lang ? ` ${lang}` : '';
	const borderChar = '\u2500';

	lines.push(`${theme.codeBlock}\u250c${borderChar.repeat(Math.max(0, wrapWidth - 2 - langLabel.length))}${langLabel}${theme.reset}`);

	const codeLines = block.content.split('\n');
	const shouldHighlight = config.syntaxHighlight && lang && SUPPORTED_LANGUAGES.has(lang);
	for (const codeLine of codeLines) {
		const formatted = shouldHighlight ? highlightCode(codeLine, lang as SupportedLanguage) : codeLine;
		lines.push(`${theme.codeBlock}\u2502${theme.reset} ${formatted}`);
	}

	if (!block.complete) {
		lines.push(`${theme.codeBlock}\u2502 ${theme.thinking}...${theme.reset}`);
	}

	lines.push(`${theme.codeBlock}\u2514${borderChar.repeat(Math.max(0, wrapWidth - 2))}${theme.reset}`);
	return lines;
}

function renderListBlock(block: StreamingBlock, theme: StreamingMarkdownTheme, wrapWidth: number): readonly string[] {
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
			lines.push(j === 0 ? `  ${bullet} ${formatInline(w, theme)}` : `${' '.repeat(indent + 1)}${formatInline(w, theme)}`);
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

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial streaming markdown state.
 *
 * @param config - Optional configuration overrides
 * @param viewportHeight - Initial viewport height (default: 24)
 * @returns Initial state
 *
 * @example
 * ```typescript
 * import { createStreamingMarkdownState } from 'blecsd';
 *
 * const state = createStreamingMarkdownState({ wrapWidth: 120 });
 * ```
 */
export function createStreamingMarkdownState(
	config?: Partial<StreamingMarkdownConfig>,
	viewportHeight = 24,
): StreamingMarkdownState {
	const mergedTheme = { ...DEFAULT_THEME, ...config?.theme };
	const mergedConfig = { ...DEFAULT_CONFIG, ...config, theme: mergedTheme };

	return {
		source: '',
		blocks: [],
		renderedLines: [],
		scrollTop: 0,
		viewportHeight,
		isStreaming: false,
		hasContent: false,
		config: mergedConfig,
		dirty: null,
	};
}

/**
 * Appends markdown text to the state, re-parsing and re-rendering.
 *
 * @param state - Current state
 * @param text - Markdown text to append
 * @returns Updated state
 *
 * @example
 * ```typescript
 * import { createStreamingMarkdownState, appendMarkdown } from 'blecsd';
 *
 * let state = createStreamingMarkdownState();
 * state = appendMarkdown(state, '# Hello\n\n');
 * state = appendMarkdown(state, 'World');
 * ```
 */
export function appendMarkdown(
	state: StreamingMarkdownState,
	text: string,
): StreamingMarkdownState {
	const newSource = state.source + text;
	const blocks = parseStreamingBlocks(newSource);
	const renderedLines = renderAllBlocks(blocks, state.config);
	const previousLineCount = state.renderedLines.length;

	// Evict old lines if needed
	let finalLines = renderedLines;
	let evicted = 0;
	if (state.config.maxLines > 0 && finalLines.length > state.config.maxLines) {
		evicted = finalLines.length - state.config.maxLines;
		finalLines = finalLines.slice(evicted);
	}

	// Calculate dirty region
	const dirtyStartLine = Math.max(0, previousLineCount - 1);
	const dirty: MarkdownDirtyRegion = {
		startLine: dirtyStartLine,
		lineCount: Math.max(1, finalLines.length - dirtyStartLine),
		fullRedraw: evicted > 0 || finalLines.length < previousLineCount,
	};

	// Auto-scroll
	let scrollTop = state.scrollTop;
	if (evicted > 0) {
		scrollTop = Math.max(0, scrollTop - evicted);
	}
	if (state.config.autoScroll) {
		scrollTop = Math.max(0, finalLines.length - state.viewportHeight);
	}

	return {
		...state,
		source: newSource,
		blocks,
		renderedLines: finalLines,
		scrollTop,
		hasContent: true,
		dirty,
	};
}

/**
 * Clears all content from the state.
 *
 * @param state - Current state
 * @returns Cleared state
 */
export function clearMarkdownState(state: StreamingMarkdownState): StreamingMarkdownState {
	return {
		...state,
		source: '',
		blocks: [],
		renderedLines: [],
		scrollTop: 0,
		hasContent: false,
		dirty: { startLine: 0, lineCount: 0, fullRedraw: true },
	};
}

/**
 * Gets visible lines for the current scroll position.
 *
 * @param state - Current state
 * @returns Array of visible lines
 */
export function getMarkdownVisibleLines(state: StreamingMarkdownState): readonly string[] {
	// Show thinking indicator if streaming with no content
	if (state.isStreaming && !state.hasContent && state.config.showThinking) {
		return [
			`${state.config.theme.thinking}${state.config.thinkingText}${state.config.theme.reset}`,
		];
	}

	const start = state.scrollTop;
	const end = Math.min(start + state.viewportHeight, state.renderedLines.length);
	return state.renderedLines.slice(start, end);
}

/**
 * Scrolls to an absolute line position.
 *
 * @param state - Current state
 * @param line - Target line index
 * @returns Updated state
 */
export function scrollMarkdownToLine(
	state: StreamingMarkdownState,
	line: number,
): StreamingMarkdownState {
	const maxScroll = Math.max(0, state.renderedLines.length - state.viewportHeight);
	const scrollTop = Math.max(0, Math.min(line, maxScroll));
	if (scrollTop === state.scrollTop) return state;

	return {
		...state,
		scrollTop,
		dirty: {
			startLine: 0,
			lineCount: state.viewportHeight,
			fullRedraw: true,
		},
	};
}

/**
 * Scrolls by a relative amount.
 *
 * @param state - Current state
 * @param delta - Lines to scroll (positive = down, negative = up)
 * @returns Updated state
 */
export function scrollMarkdownByLines(
	state: StreamingMarkdownState,
	delta: number,
): StreamingMarkdownState {
	return scrollMarkdownToLine(state, state.scrollTop + delta);
}

// =============================================================================
// WIDGET STORE
// =============================================================================

const streamingMarkdownStore = new Map<Entity, StreamingMarkdownState>();

/**
 * Resets the streaming markdown store (for testing).
 */
export function resetStreamingMarkdownStore(): void {
	streamingMarkdownStore.clear();
}

/**
 * Checks if an entity is a streaming markdown widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID to check
 * @returns True if the entity has streaming markdown state
 */
export function isStreamingMarkdown(_world: World, eid: Entity): boolean {
	return streamingMarkdownStore.has(eid);
}

// =============================================================================
// NAMESPACE
// =============================================================================

/**
 * Streaming markdown widget namespace providing factory-style access.
 *
 * @example
 * ```typescript
 * import { StreamingMarkdown } from 'blecsd';
 *
 * const widget = StreamingMarkdown.create(world, entity, {
 *   wrapWidth: 100,
 *   syntaxHighlight: true,
 * });
 * widget.startStream();
 * widget.append('# Response\n\nHere is some **bold** text.');
 * widget.endStream();
 * ```
 */
export const StreamingMarkdown = {
	create: createStreamingMarkdown,
	is: isStreamingMarkdown,
	resetStore: resetStreamingMarkdownStore,
};

// =============================================================================
// WIDGET FACTORY
// =============================================================================

/**
 * Creates a streaming markdown widget for rendering LLM output with
 * proper markdown formatting, syntax highlighting, and streaming support.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach to
 * @param config - Optional configuration
 * @returns Streaming markdown widget
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import { createStreamingMarkdown } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const md = createStreamingMarkdown(world, eid, {
 *   wrapWidth: 100,
 *   syntaxHighlight: true,
 * });
 *
 * // Stream LLM output
 * md.startStream();
 * md.append('# Analysis\n\n');
 * md.append('The code has **3 issues**:\n\n');
 * md.append('```typescript\n');
 * md.append('const x = 1;\n');
 * md.append('```\n');
 * md.endStream();
 *
 * // Get formatted output
 * const lines = md.getVisibleLines();
 * ```
 */
export function createStreamingMarkdown(
	world: World,
	entity: Entity,
	config?: Partial<StreamingMarkdownConfig>,
): StreamingMarkdownWidget {
	const eid = entity;
	let state = createStreamingMarkdownState(config);
	streamingMarkdownStore.set(eid, state);

	const updateStore = (): void => {
		streamingMarkdownStore.set(eid, state);
	};

	const widget: StreamingMarkdownWidget = {
		eid,

		append(text: string): StreamingMarkdownWidget {
			state = appendMarkdown(state, text);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		clear(): StreamingMarkdownWidget {
			state = clearMarkdownState(state);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		getState(): StreamingMarkdownState {
			return state;
		},

		getVisibleLines(): readonly string[] {
			return getMarkdownVisibleLines(state);
		},

		getProgress(): StreamingMarkdownProgress {
			return {
				totalChars: state.source.length,
				totalLines: state.renderedLines.length,
				visibleLines: Math.min(state.viewportHeight, state.renderedLines.length),
				isAutoScrolling: state.config.autoScroll,
				isStreaming: state.isStreaming,
				hasContent: state.hasContent,
				blockCount: state.blocks.length,
			};
		},

		consumeDirty(): MarkdownDirtyRegion | null {
			const dirty = state.dirty;
			state = { ...state, dirty: null };
			updateStore();
			return dirty;
		},

		scrollTo(line: number): StreamingMarkdownWidget {
			state = scrollMarkdownToLine(state, line);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		scrollBy(delta: number): StreamingMarkdownWidget {
			state = scrollMarkdownByLines(state, delta);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		scrollToBottom(): StreamingMarkdownWidget {
			const maxScroll = Math.max(0, state.renderedLines.length - state.viewportHeight);
			state = scrollMarkdownToLine(state, maxScroll);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		scrollToTop(): StreamingMarkdownWidget {
			state = scrollMarkdownToLine(state, 0);
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		setViewportHeight(height: number): StreamingMarkdownWidget {
			state = { ...state, viewportHeight: height };
			updateStore();
			return widget;
		},

		setWrapWidth(width: number): StreamingMarkdownWidget {
			const newConfig = { ...state.config, wrapWidth: width };
			// Re-render with new width
			const blocks = parseStreamingBlocks(state.source);
			const renderedLines = renderAllBlocks(blocks, newConfig);
			state = {
				...state,
				config: newConfig,
				blocks,
				renderedLines,
				dirty: { startLine: 0, lineCount: renderedLines.length, fullRedraw: true },
			};
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		setAutoScroll(enabled: boolean): StreamingMarkdownWidget {
			state = {
				...state,
				config: { ...state.config, autoScroll: enabled },
			};
			updateStore();
			return widget;
		},

		startStream(): StreamingMarkdownWidget {
			state = { ...state, isStreaming: true };
			updateStore();
			markDirty(world, eid);
			return widget;
		},

		endStream(): StreamingMarkdownWidget {
			state = { ...state, isStreaming: false };
			// Re-parse to finalize any incomplete blocks
			if (state.source.length > 0) {
				const blocks = parseStreamingBlocks(state.source);
				const renderedLines = renderAllBlocks(blocks, state.config);
				state = {
					...state,
					blocks,
					renderedLines,
					dirty: {
						startLine: 0,
						lineCount: renderedLines.length,
						fullRedraw: true,
					},
				};
			}
			updateStore();
			markDirty(world, eid);
			return widget;
		},
	};

	return widget;
}
