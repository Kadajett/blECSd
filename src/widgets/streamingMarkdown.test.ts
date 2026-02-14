/**
 * Tests for streaming markdown widget.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import { createWorld } from '../core/world';
import {
	appendMarkdown,
	clearMarkdownState,
	createStreamingMarkdown,
	createStreamingMarkdownState,
	formatInline,
	getMarkdownVisibleLines,
	parseStreamingBlocks,
	renderAllBlocks,
	renderBlock,
	resetStreamingMarkdownStore,
	scrollMarkdownByLines,
	scrollMarkdownToLine,
	wrapText,
} from './streamingMarkdown';

// =============================================================================
// HELPERS
// =============================================================================

const DEFAULT_THEME = {
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

// =============================================================================
// TESTS
// =============================================================================

describe('streamingMarkdown', () => {
	afterEach(() => {
		resetStreamingMarkdownStore();
	});

	describe('parseStreamingBlocks', () => {
		it('parses headings', () => {
			const blocks = parseStreamingBlocks('# Title\n## Subtitle');
			expect(blocks).toHaveLength(2);
			expect(blocks[0]?.type).toBe('heading');
			expect(blocks[0]?.content).toBe('Title');
			expect(blocks[0]?.headingLevel).toBe(1);
			expect(blocks[1]?.type).toBe('heading');
			expect(blocks[1]?.headingLevel).toBe(2);
		});

		it('parses paragraphs', () => {
			const blocks = parseStreamingBlocks('Hello world.\nThis is a paragraph.');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('paragraph');
			expect(blocks[0]?.content).toBe('Hello world. This is a paragraph.');
		});

		it('parses complete code blocks', () => {
			const blocks = parseStreamingBlocks('```typescript\nconst x = 1;\n```');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('code');
			expect(blocks[0]?.language).toBe('typescript');
			expect(blocks[0]?.content).toBe('const x = 1;');
			expect(blocks[0]?.complete).toBe(true);
		});

		it('handles incomplete code blocks', () => {
			const blocks = parseStreamingBlocks('```js\nconst x = 1;');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('code');
			expect(blocks[0]?.complete).toBe(false);
			expect(blocks[0]?.content).toBe('const x = 1;');
		});

		it('parses blockquotes', () => {
			const blocks = parseStreamingBlocks('> This is a quote\n> With two lines');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('blockquote');
			expect(blocks[0]?.content).toContain('This is a quote');
		});

		it('parses unordered lists', () => {
			const blocks = parseStreamingBlocks('- Item 1\n- Item 2\n- Item 3');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('list');
			expect(blocks[0]?.listOrdered).toBe(false);
		});

		it('parses ordered lists', () => {
			const blocks = parseStreamingBlocks('1. First\n2. Second\n3. Third');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('list');
			expect(blocks[0]?.listOrdered).toBe(true);
		});

		it('parses horizontal rules', () => {
			const blocks = parseStreamingBlocks('---');
			expect(blocks).toHaveLength(1);
			expect(blocks[0]?.type).toBe('hr');
		});

		it('parses mixed content', () => {
			const md = '# Title\n\nParagraph text.\n\n```js\ncode\n```\n\n- Item 1\n- Item 2';
			const blocks = parseStreamingBlocks(md);
			expect(blocks[0]?.type).toBe('heading');
			expect(blocks[1]?.type).toBe('paragraph');
			expect(blocks[2]?.type).toBe('code');
			expect(blocks[3]?.type).toBe('list');
		});

		it('handles empty input', () => {
			const blocks = parseStreamingBlocks('');
			expect(blocks).toHaveLength(0);
		});

		it('handles only whitespace', () => {
			const blocks = parseStreamingBlocks('\n\n\n');
			expect(blocks).toHaveLength(0);
		});
	});

	describe('formatInline', () => {
		it('formats bold text', () => {
			const result = formatInline('This is **bold** text', DEFAULT_THEME);
			expect(result).toContain('\x1b[1m');
			expect(result).toContain('bold');
		});

		it('formats italic text', () => {
			const result = formatInline('This is *italic* text', DEFAULT_THEME);
			expect(result).toContain('\x1b[3m');
			expect(result).toContain('italic');
		});

		it('formats inline code', () => {
			const result = formatInline('Use `console.log`', DEFAULT_THEME);
			expect(result).toContain('\x1b[33m');
			expect(result).toContain('console.log');
		});

		it('formats links', () => {
			const result = formatInline('Visit [Google](https://google.com)', DEFAULT_THEME);
			expect(result).toContain('\x1b[4;34m');
			expect(result).toContain('Google');
		});

		it('formats strikethrough', () => {
			const result = formatInline('This is ~~deleted~~ text', DEFAULT_THEME);
			expect(result).toContain('\x1b[9m');
			expect(result).toContain('deleted');
		});

		it('handles no formatting', () => {
			const result = formatInline('Plain text', DEFAULT_THEME);
			expect(result).toBe('Plain text');
		});

		it('handles multiple formats in one line', () => {
			const result = formatInline('**bold** and *italic* and `code`', DEFAULT_THEME);
			expect(result).toContain('\x1b[1m');
			expect(result).toContain('\x1b[3m');
			expect(result).toContain('\x1b[33m');
		});
	});

	describe('wrapText', () => {
		it('returns text unchanged if within width', () => {
			expect(wrapText('short', 80)).toEqual(['short']);
		});

		it('wraps long text at word boundaries', () => {
			const lines = wrapText('Hello World', 6);
			expect(lines.length).toBeGreaterThan(1);
		});

		it('hard-breaks words longer than width', () => {
			const lines = wrapText('abcdefghij', 5);
			expect(lines).toEqual(['abcde', 'fghij']);
		});

		it('handles empty text', () => {
			expect(wrapText('', 80)).toEqual(['']);
		});

		it('handles width of 0', () => {
			expect(wrapText('hello', 0)).toEqual(['hello']);
		});
	});

	describe('renderBlock', () => {
		const config = {
			wrapWidth: 40,
			maxLines: 10000,
			autoScroll: true,
			syntaxHighlight: false,
			thinkingText: 'Thinking...',
			showThinking: true,
			theme: DEFAULT_THEME,
		};

		it('renders headings with formatting', () => {
			const lines = renderBlock(
				{ type: 'heading', content: 'Title', headingLevel: 1, complete: true },
				config,
			);
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('# Title');
			expect(lines[0]).toContain('\x1b[1;36m');
		});

		it('renders code blocks with borders', () => {
			const lines = renderBlock(
				{ type: 'code', content: 'const x = 1;', language: 'js', complete: true },
				config,
			);
			expect(lines.length).toBeGreaterThanOrEqual(3); // top border + code + bottom border
			expect(lines[0]).toContain('\u250c'); // top-left corner
			expect(lines[lines.length - 1]).toContain('\u2514'); // bottom-left corner
		});

		it('renders incomplete code blocks with indicator', () => {
			const lines = renderBlock(
				{ type: 'code', content: 'partial', language: 'js', complete: false },
				config,
			);
			const joined = lines.join('\n');
			expect(joined).toContain('...');
		});

		it('renders horizontal rules', () => {
			const lines = renderBlock({ type: 'hr', content: '', complete: true }, config);
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('\u2500');
		});

		it('renders list items with bullets', () => {
			const lines = renderBlock(
				{
					type: 'list',
					content: 'First\nSecond',
					listOrdered: false,
					complete: true,
				},
				config,
			);
			expect(lines.length).toBeGreaterThanOrEqual(2);
			expect(lines[0]).toContain('\u2022'); // bullet
		});

		it('renders ordered list with numbers', () => {
			const lines = renderBlock(
				{
					type: 'list',
					content: 'First\nSecond',
					listOrdered: true,
					complete: true,
				},
				config,
			);
			expect(lines[0]).toContain('1.');
			expect(lines[1]).toContain('2.');
		});

		it('renders paragraphs with inline formatting', () => {
			const lines = renderBlock(
				{ type: 'paragraph', content: 'Text with **bold**', complete: true },
				config,
			);
			expect(lines[0]).toContain('\x1b[1m');
		});
	});

	describe('renderAllBlocks', () => {
		const config = {
			wrapWidth: 80,
			maxLines: 10000,
			autoScroll: true,
			syntaxHighlight: false,
			thinkingText: 'Thinking...',
			showThinking: true,
			theme: DEFAULT_THEME,
		};

		it('renders multiple blocks with blank lines between them', () => {
			const blocks = [
				{ type: 'heading' as const, content: 'Title', headingLevel: 1, complete: true },
				{ type: 'paragraph' as const, content: 'Body text', complete: true },
			];
			const lines = renderAllBlocks(blocks, config);
			// Should have heading + blank + paragraph
			expect(lines.length).toBeGreaterThanOrEqual(3);
		});

		it('handles empty blocks array', () => {
			expect(renderAllBlocks([], config)).toEqual([]);
		});
	});

	describe('createStreamingMarkdownState', () => {
		it('creates state with defaults', () => {
			const state = createStreamingMarkdownState();
			expect(state.source).toBe('');
			expect(state.blocks).toEqual([]);
			expect(state.renderedLines).toEqual([]);
			expect(state.scrollTop).toBe(0);
			expect(state.viewportHeight).toBe(24);
			expect(state.isStreaming).toBe(false);
			expect(state.hasContent).toBe(false);
			expect(state.config.wrapWidth).toBe(80);
			expect(state.config.autoScroll).toBe(true);
		});

		it('accepts custom config', () => {
			const state = createStreamingMarkdownState({ wrapWidth: 120 });
			expect(state.config.wrapWidth).toBe(120);
		});

		it('accepts custom viewport height', () => {
			const state = createStreamingMarkdownState({}, 40);
			expect(state.viewportHeight).toBe(40);
		});
	});

	describe('appendMarkdown', () => {
		it('appends and parses markdown content', () => {
			let state = createStreamingMarkdownState();
			state = appendMarkdown(state, '# Hello\n\nWorld');
			expect(state.hasContent).toBe(true);
			expect(state.source).toBe('# Hello\n\nWorld');
			expect(state.blocks.length).toBeGreaterThan(0);
			expect(state.renderedLines.length).toBeGreaterThan(0);
		});

		it('accumulates content across appends', () => {
			let state = createStreamingMarkdownState();
			state = appendMarkdown(state, '# Title');
			state = appendMarkdown(state, '\n\nBody text.');
			expect(state.source).toBe('# Title\n\nBody text.');
			expect(state.blocks.length).toBe(2);
		});

		it('handles streaming code blocks', () => {
			let state = createStreamingMarkdownState();
			state = appendMarkdown(state, '```js\n');
			state = appendMarkdown(state, 'const x = 1;\n');
			// Code block is incomplete
			const incompleteBlock = state.blocks.find((b) => b.type === 'code');
			expect(incompleteBlock?.complete).toBe(false);

			// Close the block
			state = appendMarkdown(state, '```\n');
			const completeBlock = state.blocks.find((b) => b.type === 'code');
			expect(completeBlock?.complete).toBe(true);
		});

		it('auto-scrolls to bottom', () => {
			let state = createStreamingMarkdownState({ autoScroll: true }, 5);
			// Add enough content to exceed viewport (separate paragraphs with blank lines)
			const content = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}`).join('\n\n');
			state = appendMarkdown(state, content);
			expect(state.scrollTop).toBeGreaterThan(0);
		});

		it('respects maxLines', () => {
			let state = createStreamingMarkdownState({ maxLines: 5 });
			const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n\n');
			state = appendMarkdown(state, lines);
			expect(state.renderedLines.length).toBeLessThanOrEqual(5);
		});

		it('sets dirty region', () => {
			let state = createStreamingMarkdownState();
			state = appendMarkdown(state, '# Hello');
			expect(state.dirty).not.toBeNull();
			expect(state.dirty?.lineCount).toBeGreaterThan(0);
		});
	});

	describe('clearMarkdownState', () => {
		it('clears all content', () => {
			let state = createStreamingMarkdownState();
			state = appendMarkdown(state, '# Title\n\nContent');
			state = clearMarkdownState(state);
			expect(state.source).toBe('');
			expect(state.blocks).toEqual([]);
			expect(state.renderedLines).toEqual([]);
			expect(state.hasContent).toBe(false);
			expect(state.dirty?.fullRedraw).toBe(true);
		});
	});

	describe('getMarkdownVisibleLines', () => {
		it('returns thinking indicator when streaming with no content', () => {
			const state = createStreamingMarkdownState();
			const streamingState = { ...state, isStreaming: true };
			const lines = getMarkdownVisibleLines(streamingState);
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('Thinking...');
		});

		it('returns content lines when content exists', () => {
			let state = createStreamingMarkdownState({}, 5);
			state = appendMarkdown(state, '# Hello');
			const lines = getMarkdownVisibleLines(state);
			expect(lines.length).toBeGreaterThan(0);
			expect(lines[0]).toContain('Hello');
		});

		it('respects viewport height', () => {
			let state = createStreamingMarkdownState({}, 3);
			const content = Array.from({ length: 10 }, (_, i) => `Line ${i}`).join('\n\n');
			state = appendMarkdown(state, content);
			const lines = getMarkdownVisibleLines(state);
			expect(lines.length).toBeLessThanOrEqual(3);
		});
	});

	describe('scrollMarkdownToLine', () => {
		it('scrolls to a valid position', () => {
			let state = createStreamingMarkdownState({}, 5);
			const content = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n\n');
			state = appendMarkdown(state, content);
			state = scrollMarkdownToLine(state, 5);
			expect(state.scrollTop).toBe(5);
		});

		it('clamps to valid range', () => {
			let state = createStreamingMarkdownState({}, 5);
			state = appendMarkdown(state, '# Short');
			state = scrollMarkdownToLine(state, 100);
			expect(state.scrollTop).toBeLessThanOrEqual(state.renderedLines.length);
		});

		it('does not update if position unchanged', () => {
			const state = createStreamingMarkdownState();
			const result = scrollMarkdownToLine(state, 0);
			expect(result).toBe(state); // Same reference
		});
	});

	describe('scrollMarkdownByLines', () => {
		it('scrolls relative to current position', () => {
			let state = createStreamingMarkdownState({}, 5);
			const content = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n\n');
			state = appendMarkdown(state, content);
			state = scrollMarkdownToLine(state, 5);
			state = scrollMarkdownByLines(state, 3);
			expect(state.scrollTop).toBe(8);
		});

		it('scrolls up with negative delta', () => {
			let state = createStreamingMarkdownState({}, 5);
			const content = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n\n');
			state = appendMarkdown(state, content);
			state = scrollMarkdownToLine(state, 10);
			state = scrollMarkdownByLines(state, -3);
			expect(state.scrollTop).toBe(7);
		});
	});

	describe('createStreamingMarkdown (widget)', () => {
		it('creates a widget with entity', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			expect(widget.eid).toBe(eid);
		});

		it('appends markdown and returns visible lines', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.append('# Hello\n\nWorld');
			const lines = widget.getVisibleLines();
			expect(lines.length).toBeGreaterThan(0);
		});

		it('supports chainable API', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			const result = widget.startStream().append('# Test').endStream();
			expect(result).toBe(widget);
		});

		it('shows thinking indicator during stream', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.startStream();
			const lines = widget.getVisibleLines();
			expect(lines[0]).toContain('Thinking...');
		});

		it('clears thinking after first content', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.startStream().append('# Hello');
			const lines = widget.getVisibleLines();
			expect(lines[0]).not.toContain('Thinking...');
			expect(lines[0]).toContain('Hello');
		});

		it('reports progress', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.startStream().append('# Hello\n\nWorld');
			const progress = widget.getProgress();
			expect(progress.totalChars).toBeGreaterThan(0);
			expect(progress.isStreaming).toBe(true);
			expect(progress.hasContent).toBe(true);
			expect(progress.blockCount).toBeGreaterThan(0);
		});

		it('handles clear', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.append('# Title');
			widget.clear();
			expect(widget.getState().source).toBe('');
			expect(widget.getState().renderedLines).toEqual([]);
		});

		it('handles scroll operations', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid, { wrapWidth: 80 });
			widget.setViewportHeight(5);
			const content = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n\n');
			widget.append(content);

			widget.scrollToTop();
			expect(widget.getState().scrollTop).toBe(0);

			widget.scrollToBottom();
			expect(widget.getState().scrollTop).toBeGreaterThan(0);

			widget.scrollTo(3);
			expect(widget.getState().scrollTop).toBe(3);

			widget.scrollBy(2);
			expect(widget.getState().scrollTop).toBe(5);
		});

		it('handles setWrapWidth', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid, { wrapWidth: 80 });
			widget.append('# Hello World');
			widget.setWrapWidth(40);
			expect(widget.getState().config.wrapWidth).toBe(40);
		});

		it('handles setAutoScroll', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.setAutoScroll(false);
			expect(widget.getState().config.autoScroll).toBe(false);
		});

		it('consumes dirty region', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.append('# Hello');
			const dirty = widget.consumeDirty();
			expect(dirty).not.toBeNull();
			// Second consume returns null
			expect(widget.consumeDirty()).toBeNull();
		});

		it('end stream finalizes blocks', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid);
			widget.startStream().append('```js\nconst x = 1;').endStream();
			expect(widget.getState().isStreaming).toBe(false);
		});

		it('handles syntax highlighting in code blocks', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const widget = createStreamingMarkdown(world, eid, {
				syntaxHighlight: true,
			});
			widget.append('```typescript\nconst x: number = 42;\n```');
			const lines = widget.getVisibleLines();
			// Should contain ANSI highlighting for the keyword
			const codeLine = lines.find((l) => l.includes('const'));
			expect(codeLine).toBeDefined();
		});
	});
});
