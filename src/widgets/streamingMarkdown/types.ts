/**
 * Type definitions for Streaming Markdown Widget.
 */

import type { Entity } from '../../core/types';

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
