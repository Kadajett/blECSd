/**
 * Fold regions utilities namespace.
 *
 * @example
 * ```typescript
 * import { fold } from 'blecsd/utils';
 *
 * const state = fold.createFoldState(100);
 * fold.addFoldRegion(state, { start: 10, end: 20, level: 0 });
 * fold.foldRegion(state, 0);
 * const visible = fold.getVisibleFoldLines(state, 0, 50);
 * ```
 */

import {
	addFoldRegion,
	createFoldState,
	foldAll,
	foldAtDepth,
	foldRegion,
	getAllFoldRegions,
	getFoldAtLine,
	getFoldStats,
	getVisibleFoldLines,
	originalToVisibleLine,
	removeFoldRegion,
	toggleFold,
	unfoldAll,
	unfoldRegion,
	updateTotalLines,
	visibleToOriginalLine,
} from '../foldRegions';

export const fold = Object.freeze({
	createFoldState,
	addFoldRegion,
	removeFoldRegion,
	foldRegion,
	unfoldRegion,
	toggleFold,
	foldAll,
	unfoldAll,
	foldAtDepth,
	getVisibleFoldLines,
	getAllFoldRegions,
	getFoldAtLine,
	getFoldStats,
	originalToVisibleLine,
	visibleToOriginalLine,
	updateTotalLines,
});

export type FoldModule = typeof fold;
