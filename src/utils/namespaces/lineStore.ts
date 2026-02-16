/**
 * Virtualized line store utilities namespace for large text content.
 *
 * @example
 * ```typescript
 * import { lineStore } from 'blecsd/utils';
 *
 * const store = lineStore.createLineStore();
 * lineStore.appendToStore(store, 'Line 1\nLine 2\n');
 * const line = lineStore.getLineAtIndex(store, 0);
 * const range = lineStore.getLineStoreRange(store, 0, 10);
 * ```
 */

import {
	appendLines,
	appendToStore,
	CHUNKED_THRESHOLD,
	createEmptyLineStore,
	createLineStore,
	createLineStoreFromLines,
	exportContent,
	exportLineRange,
	getByteSize,
	getLineAtIndex,
	getLineCount,
	getLineForOffset,
	getLineInfo,
	getLineRange,
	getOffsetForLine,
	getStoreStats,
	getVisibleLines,
	isStoreEmpty,
	LineIndexSchema,
	LineRangeParamsSchema,
	TrimParamsSchema,
	trimToLineCount,
	VisibleLinesParamsSchema,
} from '../virtualizedLineStore';

export const lineStore = Object.freeze({
	createLineStore,
	createLineStoreFromLines,
	createEmptyLineStore,
	appendToStore,
	appendLines,
	getLineAtIndex,
	getLineRange,
	getLineCount,
	getLineForOffset,
	getOffsetForLine,
	getLineInfo,
	getVisibleLines,
	exportContent,
	exportLineRange,
	getStoreStats,
	getByteSize,
	isStoreEmpty,
	trimToLineCount,
	CHUNKED_THRESHOLD,
	LineIndexSchema,
	LineRangeParamsSchema,
	TrimParamsSchema,
	VisibleLinesParamsSchema,
});

export type LineStoreModule = typeof lineStore;
