/**
 * Virtualized scrollback buffer utilities namespace.
 *
 * @example
 * ```typescript
 * import { scrollback } from 'blecsd/utils';
 *
 * const buffer = scrollback.createScrollbackBuffer({ maxLines: 10000 });
 * scrollback.appendLine(buffer, 'Log line 1');
 * const line = scrollback.getScrollbackLine(buffer, 0);
 * scrollback.scrollbackScrollBy(buffer, -10);
 * ```
 */

import {
	appendLine,
	appendLines,
	COMPRESSION_RATIO,
	clearScrollback,
	compressOldChunks,
	createScrollbackBuffer,
	DEFAULT_CHUNK_SIZE,
	DEFAULT_MAX_CACHED,
	DEFAULT_MAX_MEMORY,
	decompressAll,
	exportToText,
	getLine,
	getLineRange,
	getMemoryUsage,
	getScrollbackStats,
	getVisibleLines,
	jumpToLine,
	loadFromText,
	scrollbackScrollBy,
	scrollbackScrollToBottom,
	scrollbackScrollToTop,
	trimToLineCount,
} from '../virtualScrollback';

export const scrollback = Object.freeze({
	createScrollbackBuffer,
	appendLine,
	appendLines,
	getLine,
	getLineRange,
	scrollbackScrollBy,
	scrollbackScrollToTop,
	scrollbackScrollToBottom,
	jumpToLine,
	exportToText,
	loadFromText,
	clearScrollback,
	trimToLineCount,
	getVisibleLines,
	getScrollbackStats,
	getMemoryUsage,
	compressOldChunks,
	decompressAll,
	DEFAULT_CHUNK_SIZE,
	DEFAULT_MAX_CACHED,
	DEFAULT_MAX_MEMORY,
	COMPRESSION_RATIO,
});

export type ScrollbackModule = typeof scrollback;
