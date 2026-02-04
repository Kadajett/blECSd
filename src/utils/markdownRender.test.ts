/**
 * Tests for Markdown Rendering
 *
 * @module utils/markdownRender.test
 */

import { describe, expect, it } from 'vitest';
import {
	clearMarkdownCache,
	createMarkdownCache,
	getMarkdownStats,
	getTotalLineCount,
	getVisibleMarkdown,
	invalidateLines,
	parseInline,
	parseMarkdown,
	parseMarkdownCached,
	renderBlock,
	renderMarkdown,
} from './markdownRender';
import type { BlockData } from './markdownRender';

function getBlock(
	blocks: readonly { readonly data: BlockData }[],
	index: number,
): { readonly data: BlockData } {
	const block = blocks[index];
	if (!block) {
		throw new Error(`Expected block at index ${index}`);
	}
	return block;
}

function expectBlockData<K extends BlockData['kind']>(
	block: { readonly data: BlockData },
	kind: K,
): Extract<BlockData, { readonly kind: K }> {
	expect(block.data.kind).toBe(kind);
	if (block.data.kind !== kind) {
		throw new Error(`Expected block kind ${kind}`);
	}
	return block.data as Extract<BlockData, { readonly kind: K }>;
}

// =============================================================================
// INLINE PARSING
// =============================================================================

describe('parseInline', () => {
	it('parses plain text', () => {
		const result = parseInline('Hello world');

		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe('text');
		expect(result[0]?.content).toBe('Hello world');
	});

	it('parses bold text', () => {
		const result = parseInline('Hello **world**');

		expect(result).toHaveLength(2);
		expect(result[0]?.type).toBe('text');
		expect(result[1]?.type).toBe('bold');
		expect(result[1]?.content).toBe('world');
	});

	it('parses italic text', () => {
		const result = parseInline('Hello *world*');

		expect(result).toHaveLength(2);
		expect(result[0]?.type).toBe('text');
		expect(result[1]?.type).toBe('italic');
		expect(result[1]?.content).toBe('world');
	});

	it('parses inline code', () => {
		const result = parseInline('Use `console.log`');

		expect(result).toHaveLength(2);
		expect(result[0]?.type).toBe('text');
		expect(result[1]?.type).toBe('code');
		expect(result[1]?.content).toBe('console.log');
	});

	it('parses links', () => {
		const result = parseInline('Click [here](https://example.com)');

		expect(result).toHaveLength(2);
		expect(result[0]?.type).toBe('text');
		expect(result[1]?.type).toBe('link');
		expect(result[1]?.content).toBe('here');
		expect(result[1]?.href).toBe('https://example.com');
	});

	it('parses images', () => {
		const result = parseInline('![alt text](image.png)');

		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe('image');
		expect(result[0]?.content).toBe('alt text');
		expect(result[0]?.href).toBe('image.png');
	});

	it('parses strikethrough', () => {
		const result = parseInline('This is ~~deleted~~');

		expect(result).toHaveLength(2);
		expect(result[0]?.type).toBe('text');
		expect(result[1]?.type).toBe('strikethrough');
		expect(result[1]?.content).toBe('deleted');
	});

	it('parses multiple formats', () => {
		const result = parseInline('**bold** and *italic*');

		expect(result.some((e) => e.type === 'bold')).toBe(true);
		expect(result.some((e) => e.type === 'italic')).toBe(true);
	});
});

// =============================================================================
// BLOCK PARSING
// =============================================================================

describe('parseMarkdown - headings', () => {
	it('parses h1', () => {
		const result = parseMarkdown('# Hello');
		const block = getBlock(result.blocks, 0);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('heading');
		expect(block.data).toMatchObject({
			kind: 'heading',
			level: 1,
			text: 'Hello',
		});
	});

	it('parses h2-h6', () => {
		const md = '## H2\n### H3\n#### H4\n##### H5\n###### H6';
		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(5);
		for (let i = 0; i < 5; i++) {
			expect(result.blocks[i]?.type).toBe('heading');
			const block = getBlock(result.blocks, i);
			const data = expectBlockData(block, 'heading');
			expect(data.level).toBe(i + 2);
		}
	});
});

describe('parseMarkdown - code blocks', () => {
	it('parses fenced code block', () => {
		const md = '```js\nconst x = 1;\n```';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('code');
		expect(block.data).toMatchObject({
			kind: 'code',
			language: 'js',
			code: 'const x = 1;',
		});
	});

	it('parses code block without language', () => {
		const md = '```\nplain text\n```';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);

		expect(result.blocks).toHaveLength(1);
		expect(block.data.kind).toBe('code');
	});

	it('preserves code block content', () => {
		const code = 'function foo() {\n  return 42;\n}';
		const md = `\`\`\`typescript\n${code}\n\`\`\``;
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);

		expect(block.data).toMatchObject({
			kind: 'code',
			code,
		});
	});
});

describe('parseMarkdown - lists', () => {
	it('parses unordered list', () => {
		const md = '- Item 1\n- Item 2\n- Item 3';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'list');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('list');
		expect(data.ordered).toBe(false);
		expect(data.items).toHaveLength(3);
	});

	it('parses ordered list', () => {
		const md = '1. First\n2. Second\n3. Third';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'list');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('list');
		expect(data.ordered).toBe(true);
		expect(data.items).toHaveLength(3);
	});

	it('parses task list', () => {
		const md = '- [ ] Todo\n- [x] Done';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'list');

		expect(result.blocks).toHaveLength(1);
		expect(data.items[0]?.checked).toBe(false);
		expect(data.items[1]?.checked).toBe(true);
	});
});

describe('parseMarkdown - tables', () => {
	it('parses simple table', () => {
		const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'table');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('table');
		expect(data.headers).toHaveLength(2);
		expect(data.rows).toHaveLength(1);
	});

	it('parses table with alignment', () => {
		const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'table');

		expect(data.alignments[0]).toBe('left');
		expect(data.alignments[1]).toBe('center');
		expect(data.alignments[2]).toBe('right');
	});
});

describe('parseMarkdown - blockquotes', () => {
	it('parses blockquote', () => {
		const md = '> This is a quote';
		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('blockquote');
	});

	it('parses multi-line blockquote', () => {
		const md = '> Line 1\n> Line 2';
		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('blockquote');
	});
});

describe('parseMarkdown - horizontal rules', () => {
	it('parses hr with dashes', () => {
		const result = parseMarkdown('---');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('hr');
	});

	it('parses hr with asterisks', () => {
		const result = parseMarkdown('***');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('hr');
	});

	it('parses hr with underscores', () => {
		const result = parseMarkdown('___');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('hr');
	});
});

describe('parseMarkdown - paragraphs', () => {
	it('parses paragraph', () => {
		const result = parseMarkdown('This is a paragraph.');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('paragraph');
	});

	it('merges consecutive lines', () => {
		const md = 'Line 1\nLine 2\nLine 3';
		const result = parseMarkdown(md);
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'paragraph');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('paragraph');
		expect(data.text).toBe('Line 1 Line 2 Line 3');
	});

	it('separates paragraphs by blank lines', () => {
		const md = 'Para 1\n\nPara 2';
		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(2);
		expect(result.blocks[0]?.type).toBe('paragraph');
		expect(result.blocks[1]?.type).toBe('paragraph');
	});
});

describe('parseMarkdown - mixed content', () => {
	it('parses complex document', () => {
		const md = `# Title

This is a paragraph.

## Section

- Item 1
- Item 2

\`\`\`js
code()
\`\`\`

> Quote
`;
		const result = parseMarkdown(md);

		expect(result.blocks.length).toBeGreaterThan(4);
		expect(result.blocks.some((b) => b.type === 'heading')).toBe(true);
		expect(result.blocks.some((b) => b.type === 'paragraph')).toBe(true);
		expect(result.blocks.some((b) => b.type === 'list')).toBe(true);
		expect(result.blocks.some((b) => b.type === 'code')).toBe(true);
		expect(result.blocks.some((b) => b.type === 'blockquote')).toBe(true);
	});

	it('tracks line numbers', () => {
		const md = '# Title\n\nParagraph\n\n- List';
		const result = parseMarkdown(md);

		expect(result.blocks[0]?.lineStart).toBe(0);
		expect(result.blocks[0]?.lineEnd).toBe(1);
	});
});

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

describe('MarkdownCache', () => {
	it('creates empty cache', () => {
		const cache = createMarkdownCache();

		expect(cache.blocks.size).toBe(0);
		expect(cache.sourceHash).toBe(0);
	});

	it('clears cache', () => {
		const cache = createMarkdownCache();
		parseMarkdownCached(cache, '# Test');

		clearMarkdownCache(cache);

		expect(cache.blocks.size).toBe(0);
		expect(cache.sourceHash).toBe(0);
	});

	it('caches parsed result', () => {
		const cache = createMarkdownCache();
		const md = '# Title\n\nParagraph';

		parseMarkdownCached(cache, md);
		const result2 = parseMarkdownCached(cache, md);

		expect(result2.parseTimeMs).toBeLessThan(1); // Cache hit is very fast
	});

	it('invalidates on change', () => {
		const cache = createMarkdownCache();

		parseMarkdownCached(cache, '# Title');
		const result2 = parseMarkdownCached(cache, '# New Title');

		expect(result2.parseTimeMs).toBeGreaterThan(0); // Re-parsed
	});

	it('invalidates specific lines', () => {
		const cache = createMarkdownCache();
		parseMarkdownCached(cache, '# Title\n\nParagraph');

		invalidateLines(cache, 0, 1);

		expect(cache.blocks.size).toBeLessThan(2);
	});
});

// =============================================================================
// RENDERING
// =============================================================================

describe('renderBlock', () => {
	it('renders heading', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('## Hello');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(1);
		expect(lines[0]?.content).toBe('## Hello');
		expect(lines[0]?.style.bold).toBe(true);
	});

	it('renders paragraph', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('Hello world');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(1);
		expect(lines[0]?.content).toBe('Hello world');
	});

	it('renders code block', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('```js\nconst x = 1;\n```');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(1);
		expect(lines[0]?.content).toBe('const x = 1;');
		expect(lines[0]?.style.dim).toBe(true);
	});

	it('renders list', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('- A\n- B');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(2);
		expect(lines[0]?.content).toContain('A');
		expect(lines[1]?.content).toContain('B');
	});

	it('renders table', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(3);
		expect(lines[0]?.style.bold).toBe(true); // Header
	});

	it('renders blockquote', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('> Quote');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines[0]?.content).toContain('>');
		expect(lines[0]?.style.italic).toBe(true);
	});

	it('renders hr', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('---');
		const lines = renderBlock(result.blocks[0]!, cache);

		expect(lines).toHaveLength(1);
		expect(lines[0]?.style.dim).toBe(true);
	});
});

describe('renderMarkdown', () => {
	it('renders all blocks', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# Title\n\nParagraph');
		const lines = renderMarkdown(result, cache);

		expect(lines.length).toBeGreaterThan(1);
	});

	it('caches rendered lines', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# Title');

		renderMarkdown(result, cache);
		const lines2 = renderMarkdown(result, cache);

		expect(cache.renderedLines).toBe(lines2);
	});

	it('adds blank lines between blocks', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# Title\n\nPara');
		const lines = renderMarkdown(result, cache);

		expect(lines.some((l) => l.content === '')).toBe(true);
	});
});

// =============================================================================
// VIRTUALIZED RENDERING
// =============================================================================

describe('getVisibleMarkdown', () => {
	it('returns visible range', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# A\n\n# B\n\n# C\n\n# D\n\n# E');

		const visible = getVisibleMarkdown(result, cache, 0, 3);

		expect(visible.lines).toHaveLength(3);
		expect(visible.startIndex).toBe(0);
		expect(visible.endIndex).toBe(3);
	});

	it('handles offset', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# A\n\n# B\n\n# C\n\n# D\n\n# E');

		const visible = getVisibleMarkdown(result, cache, 2, 3);

		expect(visible.startIndex).toBe(2);
	});

	it('returns total line count', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# A\n\n# B\n\n# C');

		const visible = getVisibleMarkdown(result, cache, 0, 100);

		expect(visible.totalLines).toBeGreaterThan(0);
	});
});

describe('getTotalLineCount', () => {
	it('counts all lines', () => {
		const cache = createMarkdownCache();
		const result = parseMarkdown('# Title\n\nParagraph\n\n- Item');

		const count = getTotalLineCount(result, cache);

		expect(count).toBeGreaterThan(0);
	});
});

// =============================================================================
// STATISTICS
// =============================================================================

describe('getMarkdownStats', () => {
	it('counts blocks', () => {
		const result = parseMarkdown('# Title\n\nParagraph');

		const stats = getMarkdownStats(result);

		expect(stats.blockCount).toBe(2);
	});

	it('counts headings', () => {
		const result = parseMarkdown('# H1\n\n## H2\n\n### H3');

		const stats = getMarkdownStats(result);

		expect(stats.headingCount).toBe(3);
	});

	it('counts code blocks', () => {
		const result = parseMarkdown('```\ncode\n```\n\n```\nmore\n```');

		const stats = getMarkdownStats(result);

		expect(stats.codeBlockCount).toBe(2);
	});

	it('counts lists', () => {
		const result = parseMarkdown('- A\n- B\n\n1. One\n2. Two');

		const stats = getMarkdownStats(result);

		expect(stats.listCount).toBe(2);
	});

	it('counts tables', () => {
		const result = parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');

		const stats = getMarkdownStats(result);

		expect(stats.tableCount).toBe(1);
	});

	it('counts links', () => {
		const result = parseMarkdown('Click [here](url) and [there](url2)');

		const stats = getMarkdownStats(result);

		expect(stats.linkCount).toBe(2);
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles 1K line document', () => {
		const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`);
		const md = lines.join('\n\n');

		const result = parseMarkdown(md);

		expect(result.blocks.length).toBeGreaterThan(0);
	});

	it('handles large code blocks', () => {
		const code = Array.from({ length: 500 }, (_, i) => `const x${i} = ${i};`).join('\n');
		const md = `\`\`\`javascript\n${code}\n\`\`\``;

		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('code');
	});

	it('handles complex tables', () => {
		const headers = Array.from({ length: 10 }, (_, i) => `Col${i}`).join(' | ');
		const sep = Array.from({ length: 10 }, () => '---').join(' | ');
		const rows = Array.from({ length: 50 }, (_, r) =>
			Array.from({ length: 10 }, (_, c) => `R${r}C${c}`).join(' | '),
		);

		const md = `| ${headers} |\n| ${sep} |\n${rows.map((r) => `| ${r} |`).join('\n')}`;

		const result = parseMarkdown(md);

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('table');
	});

	it('parses 10K line document in reasonable time', () => {
		const sections = Array.from({ length: 100 }, (_, s) => {
			const heading = `## Section ${s}`;
			const para = `This is paragraph ${s} with some content.`;
			const list = Array.from({ length: 5 }, (_, i) => `- Item ${i}`).join('\n');
			const code = '```js\nconst x = 1;\n```';
			return [heading, para, list, code].join('\n\n');
		});

		const md = sections.join('\n\n');
		const lines = md.split('\n').length;

		const start = performance.now();
		const result = parseMarkdown(md);
		const elapsed = performance.now() - start;

		expect(lines).toBeGreaterThan(1000);
		expect(result.blocks.length).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(500); // Should be much faster
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles empty document', () => {
		const result = parseMarkdown('');

		expect(result.blocks).toHaveLength(0);
	});

	it('handles only whitespace', () => {
		const result = parseMarkdown('   \n\n   \n');

		expect(result.blocks).toHaveLength(0);
	});

	it('handles unclosed code fence', () => {
		const result = parseMarkdown('```js\ncode without end');

		expect(result.blocks).toHaveLength(1);
	});

	it('handles nested formatting', () => {
		const result = parseInline('**bold *and italic***');

		expect(result.some((e) => e.type === 'bold')).toBe(true);
	});

	it('handles special characters', () => {
		const result = parseMarkdown('# Hello < World & "Test"');

		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.type).toBe('heading');
	});

	it('handles unicode', () => {
		const result = parseMarkdown('# Hello 世界 🌍');
		const block = getBlock(result.blocks, 0);
		const data = expectBlockData(block, 'heading');

		expect(result.blocks).toHaveLength(1);
		expect(data.text).toContain('世界');
		expect(data.text).toContain('🌍');
	});
});
