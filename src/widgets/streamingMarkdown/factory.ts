/**
 * Factory function for Streaming Markdown Widget.
 */

import { markDirty } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { streamingMarkdownStateStore } from './component';
import { parseStreamingBlocks, renderAllBlocks } from './parser';
import {
	appendMarkdown,
	clearMarkdownState,
	createStreamingMarkdownState,
	getMarkdownVisibleLines,
	scrollMarkdownByLines,
	scrollMarkdownToLine,
} from './state';
import type {
	MarkdownDirtyRegion,
	StreamingMarkdownConfig,
	StreamingMarkdownProgress,
	StreamingMarkdownState,
	StreamingMarkdownWidget,
} from './types';

export function createStreamingMarkdown(
	world: World,
	entity: Entity,
	config?: Partial<StreamingMarkdownConfig>,
): StreamingMarkdownWidget {
	const eid = entity;
	let state = createStreamingMarkdownState(config);
	streamingMarkdownStateStore.set(eid, state);

	const updateStore = (): void => {
		streamingMarkdownStateStore.set(eid, state);
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
