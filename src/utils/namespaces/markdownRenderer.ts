/**
 * Markdown rendering utilities namespace.
 *
 * @example
 * ```typescript
 * import { markdownRenderer } from 'blecsd/utils';
 *
 * const result = markdownRenderer.parseMarkdown(text);
 * const cache = markdownRenderer.createMarkdownCache();
 * const cached = markdownRenderer.parseMarkdownCached(cache, text);
 * const visible = markdownRenderer.getVisibleMarkdown(result, 0, 50);
 * ```
 */

import {
	clearMarkdownCache,
	createMarkdownCache,
	DEFAULT_PARSE_BATCH,
	getMarkdownStats,
	getTotalLineCount,
	getVisibleMarkdown,
	invalidateLines,
	parseInline,
	parseMarkdown,
	parseMarkdownCached,
	renderBlock,
	renderMarkdown,
} from '../markdownRender';

export const markdownRenderer = Object.freeze({
	parseMarkdown,
	renderMarkdown,
	getVisibleMarkdown,
	parseMarkdownCached,
	createMarkdownCache,
	clearMarkdownCache,
	invalidateLines,
	parseInline,
	renderBlock,
	getMarkdownStats,
	getTotalLineCount,
	DEFAULT_PARSE_BATCH,
});

export type MarkdownRendererModule = typeof markdownRenderer;
