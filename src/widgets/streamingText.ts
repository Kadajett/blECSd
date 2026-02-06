/**
 * Streaming Text Renderer
 *
 * Efficiently renders text that streams in character-by-character or
 * chunk-by-chunk. Designed for real-time output like terminal logs,
 * Claude Code responses, or any content that arrives incrementally.
 *
 * Features:
 * - Append-only buffer with cursor tracking
 * - Incremental line wrapping (only wrap new content)
 * - Auto-scroll as new content arrives
 * - Dirty region tracking for minimal re-renders
 * - Configurable max buffer size with line eviction
 *
 * @module widgets/streamingText
 */

import { z } from 'zod';
import { markDirty } from '../components/renderable';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the streaming text renderer.
 */
export interface StreamingTextConfig {
	/** Maximum number of lines to retain (default: 10000, 0 = unlimited) */
	readonly maxLines: number;
	/** Width for line wrapping in columns (default: 80) */
	readonly wrapWidth: number;
	/** Whether to auto-scroll to bottom on new content (default: true) */
	readonly autoScroll: boolean;
	/** Whether to strip ANSI escape sequences (default: false) */
	readonly stripAnsi: boolean;
}

/**
 * Zod schema for StreamingTextConfig validation.
 */
export const StreamingTextConfigSchema = z.object({
	maxLines: z.number().int().nonnegative().default(10000),
	wrapWidth: z.number().int().positive().default(80),
	autoScroll: z.boolean().default(true),
	stripAnsi: z.boolean().default(false),
});

/**
 * Progress information for streaming operations.
 */
export interface StreamProgress {
	/** Total bytes received */
	readonly totalBytes: number;
	/** Total lines in buffer */
	readonly totalLines: number;
	/** Lines visible in viewport */
	readonly visibleLines: number;
	/** Whether auto-scrolling is active */
	readonly isAutoScrolling: boolean;
	/** Whether a stream is currently active */
	readonly isStreaming: boolean;
}

/**
 * A dirty region indicating what content needs re-rendering.
 */
export interface StreamDirtyRegion {
	/** First line that changed (0-indexed) */
	readonly startLine: number;
	/** Number of lines that changed */
	readonly lineCount: number;
	/** Whether the entire buffer needs re-render */
	readonly fullRedraw: boolean;
}

/**
 * Streaming text state.
 */
export interface StreamingTextState {
	/** The wrapped lines buffer */
	readonly lines: readonly string[];
	/** Current scroll position (line index at top of viewport) */
	readonly scrollTop: number;
	/** Viewport height in lines */
	readonly viewportHeight: number;
	/** Total bytes received */
	readonly totalBytes: number;
	/** Whether currently streaming */
	readonly isStreaming: boolean;
	/** Configuration */
	readonly config: StreamingTextConfig;
	/** Partial line buffer (incomplete line without newline) */
	readonly partialLine: string;
	/** Dirty region for incremental rendering */
	readonly dirty: StreamDirtyRegion | null;
}

/**
 * Streaming text widget interface.
 */
export interface StreamingTextWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Append text to the buffer */
	append(text: string): StreamingTextWidget;
	/** Append a complete line (adds newline) */
	appendLine(text: string): StreamingTextWidget;
	/** Clear all content */
	clear(): StreamingTextWidget;

	/** Get current state */
	getState(): StreamingTextState;
	/** Get visible lines for rendering */
	getVisibleLines(): readonly string[];
	/** Get streaming progress */
	getProgress(): StreamProgress;
	/** Get and clear dirty region */
	consumeDirty(): StreamDirtyRegion | null;

	/** Scroll to absolute line position */
	scrollTo(line: number): StreamingTextWidget;
	/** Scroll by relative amount */
	scrollBy(delta: number): StreamingTextWidget;
	/** Scroll to bottom */
	scrollToBottom(): StreamingTextWidget;
	/** Scroll to top */
	scrollToTop(): StreamingTextWidget;

	/** Set viewport height */
	setViewportHeight(height: number): StreamingTextWidget;
	/** Set wrap width */
	setWrapWidth(width: number): StreamingTextWidget;
	/** Enable/disable auto-scroll */
	setAutoScroll(enabled: boolean): StreamingTextWidget;

	/** Mark stream as started */
	startStream(): StreamingTextWidget;
	/** Mark stream as ended */
	endStream(): StreamingTextWidget;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: StreamingTextConfig = {
	maxLines: 10000,
	wrapWidth: 80,
	autoScroll: true,
	stripAnsi: false,
};

// =============================================================================
// LINE WRAPPING
// =============================================================================

/**
 * Wraps a single line to the given width.
 *
 * @param line - The line to wrap
 * @param width - Maximum width in columns
 * @returns Array of wrapped lines
 *
 * @example
 * ```typescript
 * import { wrapLine } from 'blecsd';
 *
 * const lines = wrapLine('Hello World, this is a long line', 10);
 * // ['Hello Worl', 'd, this is', ' a long li', 'ne']
 * ```
 */
export function wrapLine(line: string, width: number): readonly string[] {
	if (width <= 0) return [line];
	if (line.length <= width) return [line];

	const result: string[] = [];
	let remaining = line;
	while (remaining.length > width) {
		result.push(remaining.slice(0, width));
		remaining = remaining.slice(width);
	}
	if (remaining.length > 0) {
		result.push(remaining);
	}
	return result;
}

/**
 * Strips ANSI escape sequences from text.
 *
 * @param text - Text potentially containing ANSI sequences
 * @returns Clean text
 */
export function stripAnsiSequences(text: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for ANSI detection
	return text.replace(/\x1b(?:\[[0-9;?]*[a-zA-Z~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?|[^[\]])/g, '');
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial streaming text state.
 *
 * @param config - Optional configuration
 * @param viewportHeight - Initial viewport height (default: 24)
 * @returns Initial streaming text state
 */
export function createStreamingState(
	config?: Partial<StreamingTextConfig>,
	viewportHeight = 24,
): StreamingTextState {
	return {
		lines: [],
		scrollTop: 0,
		viewportHeight,
		totalBytes: 0,
		isStreaming: false,
		config: { ...DEFAULT_CONFIG, ...config },
		partialLine: '',
		dirty: null,
	};
}

/**
 * Appends text to the streaming state, handling line wrapping and eviction.
 *
 * @param state - Current state
 * @param text - Text to append
 * @returns Updated state
 */
export function appendToState(state: StreamingTextState, text: string): StreamingTextState {
	let processedText = text;
	if (state.config.stripAnsi) {
		processedText = stripAnsiSequences(processedText);
	}

	const totalBytes = state.totalBytes + processedText.length;

	// Combine with any partial line from previous append
	const combined = state.partialLine + processedText;

	// Split into lines (keeping track of trailing partial)
	const parts = combined.split('\n');
	const partialLine = parts.pop() ?? '';

	// Wrap each complete line
	const newWrapped: string[] = [];
	for (const part of parts) {
		const wrapped = wrapLine(part, state.config.wrapWidth);
		for (const w of wrapped) {
			newWrapped.push(w);
		}
	}

	// Build new lines array
	let lines = [...state.lines, ...newWrapped];

	// Evict old lines if needed
	let evicted = 0;
	if (state.config.maxLines > 0 && lines.length > state.config.maxLines) {
		evicted = lines.length - state.config.maxLines;
		lines = lines.slice(evicted);
	}

	// Calculate dirty region
	const dirtyStartLine = Math.max(0, lines.length - newWrapped.length);
	const dirty: StreamDirtyRegion = {
		startLine: dirtyStartLine,
		lineCount: newWrapped.length,
		fullRedraw: evicted > 0,
	};

	// Auto-scroll to bottom
	let scrollTop = state.scrollTop;
	if (evicted > 0) {
		scrollTop = Math.max(0, scrollTop - evicted);
	}
	if (state.config.autoScroll) {
		scrollTop = Math.max(0, lines.length - state.viewportHeight);
	}

	return {
		...state,
		lines,
		scrollTop,
		totalBytes,
		partialLine,
		dirty,
	};
}

/**
 * Clears all content from the streaming state.
 *
 * @param state - Current state
 * @returns Cleared state
 */
export function clearState(state: StreamingTextState): StreamingTextState {
	return {
		...state,
		lines: [],
		scrollTop: 0,
		totalBytes: 0,
		partialLine: '',
		dirty: { startLine: 0, lineCount: 0, fullRedraw: true },
	};
}

/**
 * Gets the visible lines for the current scroll position.
 *
 * @param state - Current state
 * @returns Array of visible lines
 */
export function getStreamVisibleLines(state: StreamingTextState): readonly string[] {
	const start = state.scrollTop;
	const end = Math.min(start + state.viewportHeight, state.lines.length);
	return state.lines.slice(start, end);
}

/**
 * Scrolls to an absolute line position.
 *
 * @param state - Current state
 * @param line - Target line index
 * @returns Updated state
 */
export function scrollToLine(state: StreamingTextState, line: number): StreamingTextState {
	const maxScroll = Math.max(0, state.lines.length - state.viewportHeight);
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
export function scrollByLines(state: StreamingTextState, delta: number): StreamingTextState {
	return scrollToLine(state, state.scrollTop + delta);
}

// =============================================================================
// WIDGET FACTORY
// =============================================================================

/**
 * Creates a streaming text widget for efficient real-time text rendering.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach to
 * @param config - Optional configuration
 * @returns Streaming text widget
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import { createStreamingText } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const stream = createStreamingText(world, eid, {
 *   wrapWidth: 80,
 *   maxLines: 5000,
 *   autoScroll: true,
 * });
 *
 * // Append streaming content
 * stream.append('Loading');
 * stream.append('...');
 * stream.appendLine(' done!');
 *
 * // Get visible lines for rendering
 * const visible = stream.getVisibleLines();
 *
 * // Stream from async source
 * stream.startStream();
 * for await (const chunk of asyncSource) {
 *   stream.append(chunk);
 * }
 * stream.endStream();
 * ```
 */
export function createStreamingText(
	world: World,
	entity: Entity,
	config?: Partial<StreamingTextConfig>,
): StreamingTextWidget {
	const eid = entity;
	let state = createStreamingState(config);

	const widget: StreamingTextWidget = {
		eid,

		append(text: string): StreamingTextWidget {
			state = appendToState(state, text);
			markDirty(world, eid);
			return widget;
		},

		appendLine(text: string): StreamingTextWidget {
			state = appendToState(state, `${text}\n`);
			markDirty(world, eid);
			return widget;
		},

		clear(): StreamingTextWidget {
			state = clearState(state);
			markDirty(world, eid);
			return widget;
		},

		getState(): StreamingTextState {
			return state;
		},

		getVisibleLines(): readonly string[] {
			return getStreamVisibleLines(state);
		},

		getProgress(): StreamProgress {
			return {
				totalBytes: state.totalBytes,
				totalLines: state.lines.length,
				visibleLines: Math.min(state.viewportHeight, state.lines.length),
				isAutoScrolling: state.config.autoScroll,
				isStreaming: state.isStreaming,
			};
		},

		consumeDirty(): StreamDirtyRegion | null {
			const dirty = state.dirty;
			state = { ...state, dirty: null };
			return dirty;
		},

		scrollTo(line: number): StreamingTextWidget {
			state = scrollToLine(state, line);
			markDirty(world, eid);
			return widget;
		},

		scrollBy(delta: number): StreamingTextWidget {
			state = scrollByLines(state, delta);
			markDirty(world, eid);
			return widget;
		},

		scrollToBottom(): StreamingTextWidget {
			const maxScroll = Math.max(0, state.lines.length - state.viewportHeight);
			state = scrollToLine(state, maxScroll);
			markDirty(world, eid);
			return widget;
		},

		scrollToTop(): StreamingTextWidget {
			state = scrollToLine(state, 0);
			markDirty(world, eid);
			return widget;
		},

		setViewportHeight(height: number): StreamingTextWidget {
			state = { ...state, viewportHeight: height };
			return widget;
		},

		setWrapWidth(width: number): StreamingTextWidget {
			// Re-wrap all content with new width
			const cfg = { ...state.config, wrapWidth: width };
			const allText = state.lines.join('\n') + (state.partialLine ? state.partialLine : '');
			state = createStreamingState(cfg, state.viewportHeight);
			if (allText.length > 0) {
				state = appendToState(state, allText);
			}
			markDirty(world, eid);
			return widget;
		},

		setAutoScroll(enabled: boolean): StreamingTextWidget {
			state = {
				...state,
				config: { ...state.config, autoScroll: enabled },
			};
			return widget;
		},

		startStream(): StreamingTextWidget {
			state = { ...state, isStreaming: true };
			return widget;
		},

		endStream(): StreamingTextWidget {
			// Flush any remaining partial line
			if (state.partialLine.length > 0) {
				const wrapped = wrapLine(state.partialLine, state.config.wrapWidth);
				const lines = [...state.lines, ...wrapped];
				state = {
					...state,
					lines,
					partialLine: '',
					isStreaming: false,
					dirty: {
						startLine: Math.max(0, lines.length - wrapped.length),
						lineCount: wrapped.length,
						fullRedraw: false,
					},
				};
				if (state.config.autoScroll) {
					state = {
						...state,
						scrollTop: Math.max(0, lines.length - state.viewportHeight),
					};
				}
				markDirty(world, eid);
			} else {
				state = { ...state, isStreaming: false };
			}
			return widget;
		},
	};

	return widget;
}
