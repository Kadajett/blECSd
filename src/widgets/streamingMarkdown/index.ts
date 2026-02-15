/**
 * Streaming Markdown Widget
 *
 * Renders markdown content that streams in character-by-character or
 * chunk-by-chunk. Designed for LLM output where markdown arrives
 * incrementally.
 *
 * @module widgets/streamingMarkdown
 */

// Export component and factory
export {
	isStreamingMarkdown,
	resetStreamingMarkdownStore,
	StreamingMarkdown,
	streamingMarkdownStateStore,
} from './component';

// Export config and schema
export { StreamingMarkdownConfigSchema } from './config';

// Export constants
export { DEFAULT_CONFIG, DEFAULT_THEME, SUPPORTED_LANGUAGES } from './constants';
export { createStreamingMarkdown } from './factory';
// Export parser functions
export {
	formatInline,
	parseStreamingBlocks,
	renderAllBlocks,
	renderBlock,
	wrapText,
} from './parser';
// Export state management functions
export {
	appendMarkdown,
	clearMarkdownState,
	createStreamingMarkdownState,
	getMarkdownVisibleLines,
	scrollMarkdownByLines,
	scrollMarkdownToLine,
} from './state';
// Export types
export type {
	MarkdownDirtyRegion,
	StreamingBlock,
	StreamingBlockType,
	StreamingMarkdownConfig,
	StreamingMarkdownProgress,
	StreamingMarkdownState,
	StreamingMarkdownTheme,
	StreamingMarkdownWidget,
} from './types';
