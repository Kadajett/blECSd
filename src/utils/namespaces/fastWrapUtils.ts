/**
 * Fast word wrap utilities namespace with caching support.
 *
 * @example
 * ```typescript
 * import { fastWrapUtils } from 'blecsd/utils';
 *
 * const cache = fastWrapUtils.createWrapCache();
 * const result = fastWrapUtils.wrapWithCache(cache, text, width);
 * const visible = fastWrapUtils.wrapVisibleFirst(cache, text, width, startLine, endLine);
 * ```
 */

import {
	clearWrapCache,
	continueWrap,
	createWrapCache,
	DEFAULT_BATCH_SIZE,
	getWrapCacheStats,
	invalidateAll,
	invalidateParagraph,
	invalidateRange,
	lineToPosition,
	MAX_PARAGRAPH_CHUNK,
	positionToLine,
	resizeWrapCache,
	wrapVisibleFirst,
	wrapWithCache,
} from '../fastWrap';

export const fastWrapUtils = Object.freeze({
	wrapWithCache,
	wrapVisibleFirst,
	continueWrap,
	createWrapCache,
	clearWrapCache,
	resizeWrapCache,
	invalidateAll,
	invalidateRange,
	invalidateParagraph,
	lineToPosition,
	positionToLine,
	getWrapCacheStats,
	DEFAULT_BATCH_SIZE,
	MAX_PARAGRAPH_CHUNK,
});

export type FastWrapUtilsModule = typeof fastWrapUtils;
