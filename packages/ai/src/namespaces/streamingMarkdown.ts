/**
 * Streaming markdown namespace for rendering incrementally arriving markdown.
 *
 * @example
 * ```typescript
 * import { streamingMarkdown } from '@blecsd/ai';
 *
 * const md = streamingMarkdown.createStreamingMarkdown(world, { width: 80, height: 30 });
 * streamingMarkdown.appendMarkdown(eid, '# Hello\n');
 * streamingMarkdown.appendMarkdown(eid, 'This is **markdown**.\n');
 * streamingMarkdown.scrollMarkdownByLines(eid, -5);
 * ```
 */

import {
	appendMarkdown,
	clearMarkdownState,
	createStreamingMarkdown,
	createStreamingMarkdownState,
	formatInline,
	getMarkdownVisibleLines,
	isStreamingMarkdown,
	parseStreamingBlocks,
	renderAllBlocks,
	renderBlock,
	resetStreamingMarkdownStore,
	scrollMarkdownByLines,
	scrollMarkdownToLine,
	streamingMarkdownStateStore,
	wrapText,
} from '../widgets/streamingMarkdown';

export const streamingMarkdown = Object.freeze({
	createStreamingMarkdown,
	isStreamingMarkdown,
	createStreamingMarkdownState,
	appendMarkdown,
	clearMarkdownState,
	getMarkdownVisibleLines,
	scrollMarkdownByLines,
	scrollMarkdownToLine,
	parseStreamingBlocks,
	renderBlock,
	renderAllBlocks,
	formatInline,
	wrapText,
	streamingMarkdownStateStore,
	resetStreamingMarkdownStore,
});

export type StreamingMarkdownModule = typeof streamingMarkdown;
