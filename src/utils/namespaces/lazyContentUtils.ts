/**
 * Lazy content loading utilities namespace.
 *
 * @example
 * ```typescript
 * import { lazyContentUtils } from 'blecsd/utils';
 *
 * const source = lazyContentUtils.createArraySource(lines);
 * const content = lazyContentUtils.createLazyContent(source, { chunkSize: 100 });
 * const lines = lazyContentUtils.getLazyLines(content, 0, 50);
 * lazyContentUtils.prefetchAround(content, 100);
 * ```
 */

import {
	clearLazyContent,
	createArraySource,
	createLazyContent,
	evictChunks,
	getLazyContentState,
	getLazyLines,
	isRangeLoaded,
	prefetchAround,
} from '../lazyContent';

export const lazyContentUtils = Object.freeze({
	createLazyContent,
	createArraySource,
	getLazyLines,
	prefetchAround,
	evictChunks,
	isRangeLoaded,
	getLazyContentState,
	clearLazyContent,
});

export type LazyContentUtilsModule = typeof lazyContentUtils;
