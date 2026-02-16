/**
 * Diff rendering utilities namespace.
 *
 * @example
 * ```typescript
 * import { diffRenderer } from 'blecsd/utils';
 *
 * const diff = diffRenderer.computeDiff(oldLines, newLines);
 * const cache = diffRenderer.createDiffCache();
 * const cached = diffRenderer.computeDiffCached(cache, oldLines, newLines);
 * const stats = diffRenderer.getDiffStats(diff);
 * ```
 */

import {
	clearDiffCache,
	collapseChunk,
	collapseUnchanged,
	computeDiff,
	computeDiffCached,
	createDiffCache,
	DEFAULT_COLLAPSE_THRESHOLD,
	DEFAULT_CONTEXT,
	expandAll,
	expandChunk,
	getDiffStats,
	getSideBySideView,
	getTotalLineCount,
	getVisibleDiffLines,
	parseUnifiedDiff,
	toggleChunk,
	toUnifiedDiff,
} from '../diffRender';

export const diffRenderer = Object.freeze({
	computeDiff,
	computeDiffCached,
	getDiffStats,
	getSideBySideView,
	parseUnifiedDiff,
	toUnifiedDiff,
	createDiffCache,
	clearDiffCache,
	collapseUnchanged,
	collapseChunk,
	expandChunk,
	expandAll,
	toggleChunk,
	getVisibleDiffLines,
	getTotalLineCount,
	DEFAULT_CONTEXT,
	DEFAULT_COLLAPSE_THRESHOLD,
});

export type DiffRendererModule = typeof diffRenderer;
