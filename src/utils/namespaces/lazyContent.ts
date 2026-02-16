/**
 * Lazy content loading utilities namespace.
 *
 * @example
 * ```typescript
 * import { lazyContent } from 'blecsd/utils';
 *
 * const source = lazyContent.createArraySource(lines);
 * const content = lazyContent.createLazyContent(source, { chunkSize: 100 });
 * const lines = lazyContent.getLazyLines(content, 0, 50);
 * lazyContent.prefetchAround(content, 100);
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

export const lazyContent = Object.freeze({
	createLazyContent,
	createArraySource,
	getLazyLines,
	prefetchAround,
	evictChunks,
	isRangeLoaded,
	getLazyContentState,
	clearLazyContent,
});

export type LazyContentModule = typeof lazyContent;
