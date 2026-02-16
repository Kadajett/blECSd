/**
 * Fast word wrap utilities namespace with caching support.
 *
 * @example
 * ```typescript
 * import { fastWrap } from 'blecsd/utils';
 *
 * const cache = fastWrap.createWrapCache();
 * const result = fastWrap.wrapWithCache(cache, text, width);
 * const visible = fastWrap.wrapVisibleFirst(cache, text, width, startLine, endLine);
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

export const fastWrap = Object.freeze({
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

export type FastWrapModule = typeof fastWrap;
