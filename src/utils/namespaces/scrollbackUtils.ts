/**
 * Virtualized scrollback buffer utilities namespace.
 *
 * @example
 * ```typescript
 * import { scrollbackUtils } from 'blecsd/utils';
 *
 * const buffer = scrollbackUtils.createScrollbackBuffer({ maxLines: 10000 });
 * scrollbackUtils.appendLine(buffer, 'Log line 1');
 * const line = scrollbackUtils.getScrollbackLine(buffer, 0);
 * scrollbackUtils.scrollbackScrollBy(buffer, -10);
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

export const scrollbackUtils = Object.freeze({
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

export type ScrollbackUtilsModule = typeof scrollbackUtils;
