/**
 * State management for Streaming Markdown Widget.
 */

import { DEFAULT_CONFIG, DEFAULT_THEME } from './constants';
import { parseStreamingBlocks, renderAllBlocks } from './parser';
import type { MarkdownDirtyRegion, StreamingMarkdownConfig, StreamingMarkdownState } from './types';

// STATE MANAGEMENT

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
