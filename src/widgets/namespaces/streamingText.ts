/**
 * StreamingText namespace.
 *
 * @example
 * ```typescript
 * import { streamingText } from 'blecsd/widgets';
 * const st = streamingText.create(world, {});
 * const state = streamingText.createState();
 * streamingText.appendToState(state, 'new text');
 * streamingText.clearState(state);
 * const visibleLines = streamingText.getVisibleLines(state, viewport);
 * streamingText.scrollToLine(state, lineIndex);
 * streamingText.scrollByLines(state, delta);
 * const wrapped = streamingText.wrapLine('long text', maxWidth);
 * const stripped = streamingText.stripAnsi(text);
 * ```
 */
import {
	appendToState,
	clearState,
	createStreamingState,
	createStreamingText,
	getStreamVisibleLines,
	scrollToLine,
	streamingScrollByLines,
	stripAnsiSequences,
	wrapLine,
} from '../streamingText';

export const streamingText = Object.freeze({
	create: createStreamingText,
	createState: createStreamingState,
	appendToState,
	clearState,
	getVisibleLines: getStreamVisibleLines,
	scrollToLine,
	scrollByLines: streamingScrollByLines,
	wrapLine,
	stripAnsi: stripAnsiSequences,
});

export type StreamingTextModule = typeof streamingText;
