/**
 * Fold regions utilities namespace.
 *
 * @example
 * ```typescript
 * import { foldUtils } from 'blecsd/utils';
 *
 * const state = foldUtils.createFoldState(100);
 * foldUtils.addFoldRegion(state, { start: 10, end: 20, level: 0 });
 * foldUtils.foldRegion(state, 0);
 * const visible = foldUtils.getVisibleFoldLines(state, 0, 50);
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

export const foldUtils = Object.freeze({
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

export type FoldUtilsModule = typeof foldUtils;
