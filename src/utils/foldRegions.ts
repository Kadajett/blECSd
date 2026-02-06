/**
 * Folding/collapsing regions for efficient large document display.
 *
 * Manages fold state as metadata, dynamically adjusting visible
 * line counts without re-rendering folded content. Supports
 * nested regions and maintains fold state during scrolling.
 * Fold/unfold operations complete in O(log n) time.
 *
 * @module utils/foldRegions
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A fold region definition.
 */
export interface FoldRegion {
	/** Unique identifier for this fold */
	readonly id: string;
	/** Starting line (0-based, inclusive) */
	readonly startLine: number;
	/** Ending line (0-based, inclusive) */
	readonly endLine: number;
	/** Whether this region is currently folded */
	readonly folded: boolean;
	/** Optional label shown when folded (e.g., "... 42 lines") */
	readonly label: string;
	/** Nesting depth (0 = top-level) */
	readonly depth: number;
}

/**
 * Configuration for the fold manager.
 */
export interface FoldConfig {
	/** Minimum lines for a region to be foldable (default: 2) */
	readonly minFoldableLines: number;
	/** Default fold label template. Use {count} for line count (default: '... {count} lines') */
	readonly labelTemplate: string;
	/** Maximum nesting depth (default: 10) */
	readonly maxDepth: number;
}

/**
 * A visible line after applying fold state.
 */
export interface VisibleLine {
	/** The original line index in the unfolded document */
	readonly originalLine: number;
	/** Whether this line is a fold placeholder */
	readonly isFoldPlaceholder: boolean;
	/** Fold region ID if this is a placeholder */
	readonly foldId: string | undefined;
	/** Label to display for fold placeholders */
	readonly foldLabel: string | undefined;
	/** Number of hidden lines (for placeholders) */
	readonly hiddenLines: number;
}

/**
 * Statistics about the fold state.
 */
export interface FoldStats {
	/** Total number of fold regions */
	readonly totalRegions: number;
	/** Number of currently folded regions */
	readonly foldedRegions: number;
	/** Total lines hidden by folds */
	readonly hiddenLines: number;
	/** Visible line count after applying folds */
	readonly visibleLines: number;
	/** Maximum nesting depth */
	readonly maxDepth: number;
}

/**
 * Internal mutable fold state.
 */
interface MutableFoldState {
	config: FoldConfig;
	regions: Map<string, FoldRegion>;
	totalDocumentLines: number;
	nextId: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_FOLD_CONFIG: FoldConfig = {
	minFoldableLines: 2,
	labelTemplate: '... {count} lines',
	maxDepth: 10,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates a fold manager for a document.
 *
 * @param totalLines - Total lines in the document
 * @param config - Optional configuration
 * @returns The fold state (opaque handle)
 *
 * @example
 * ```typescript
 * import { createFoldState, addFoldRegion, foldRegion } from 'blecsd';
 *
 * const folds = createFoldState(10000);
 * addFoldRegion(folds, 10, 50);    // Lines 10-50 are foldable
 * foldRegion(folds, 'fold-0');     // Collapse it
 * ```
 */
export function createFoldState(
	totalLines: number,
	config?: Partial<FoldConfig>,
): MutableFoldState {
	return {
		config: { ...DEFAULT_FOLD_CONFIG, ...config },
		regions: new Map(),
		totalDocumentLines: totalLines,
		nextId: 0,
	};
}

/**
 * Adds a foldable region to the document.
 *
 * @param state - The fold state
 * @param startLine - Start line (0-based, inclusive)
 * @param endLine - End line (0-based, inclusive)
 * @param label - Optional custom label
 * @returns The fold region ID, or undefined if invalid
 *
 * @example
 * ```typescript
 * import { createFoldState, addFoldRegion } from 'blecsd';
 *
 * const folds = createFoldState(1000);
 * const id = addFoldRegion(folds, 5, 20); // function body fold
 * ```
 */
export function addFoldRegion(
	state: MutableFoldState,
	startLine: number,
	endLine: number,
	label?: string,
): string | undefined {
	const lineCount = endLine - startLine;
	if (lineCount < state.config.minFoldableLines) return undefined;
	if (startLine < 0 || endLine >= state.totalDocumentLines) return undefined;
	if (startLine >= endLine) return undefined;

	const id = `fold-${state.nextId++}`;
	const depth = computeDepth(state, startLine, endLine);

	if (depth >= state.config.maxDepth) return undefined;

	const foldLabel = label ?? state.config.labelTemplate.replace('{count}', String(lineCount));

	const region: FoldRegion = {
		id,
		startLine,
		endLine,
		folded: false,
		label: foldLabel,
		depth,
	};

	state.regions.set(id, region);
	return id;
}

/**
 * Removes a fold region.
 *
 * @param state - The fold state
 * @param foldId - The fold region ID
 * @returns Whether the region was found and removed
 */
export function removeFoldRegion(state: MutableFoldState, foldId: string): boolean {
	return state.regions.delete(foldId);
}

/**
 * Folds (collapses) a region.
 *
 * @param state - The fold state
 * @param foldId - The fold region ID
 * @returns Whether the operation succeeded
 *
 * @example
 * ```typescript
 * import { createFoldState, addFoldRegion, foldRegion } from 'blecsd';
 *
 * const folds = createFoldState(1000);
 * const id = addFoldRegion(folds, 10, 50)!;
 * foldRegion(folds, id); // Collapse lines 10-50
 * ```
 */
export function foldRegion(state: MutableFoldState, foldId: string): boolean {
	const region = state.regions.get(foldId);
	if (!region || region.folded) return false;

	state.regions.set(foldId, { ...region, folded: true });
	return true;
}

/**
 * Unfolds (expands) a region.
 *
 * @param state - The fold state
 * @param foldId - The fold region ID
 * @returns Whether the operation succeeded
 */
export function unfoldRegion(state: MutableFoldState, foldId: string): boolean {
	const region = state.regions.get(foldId);
	if (!region || !region.folded) return false;

	state.regions.set(foldId, { ...region, folded: false });
	return true;
}

/**
 * Toggles a region's fold state.
 *
 * @param state - The fold state
 * @param foldId - The fold region ID
 * @returns The new folded state, or undefined if region not found
 */
export function toggleFold(state: MutableFoldState, foldId: string): boolean | undefined {
	const region = state.regions.get(foldId);
	if (!region) return undefined;

	const newFolded = !region.folded;
	state.regions.set(foldId, { ...region, folded: newFolded });
	return newFolded;
}

/**
 * Folds all regions.
 *
 * @param state - The fold state
 * @returns Number of regions that were folded
 */
export function foldAll(state: MutableFoldState): number {
	let count = 0;
	for (const [id, region] of state.regions) {
		if (!region.folded) {
			state.regions.set(id, { ...region, folded: true });
			count++;
		}
	}
	return count;
}

/**
 * Unfolds all regions.
 *
 * @param state - The fold state
 * @returns Number of regions that were unfolded
 */
export function unfoldAll(state: MutableFoldState): number {
	let count = 0;
	for (const [id, region] of state.regions) {
		if (region.folded) {
			state.regions.set(id, { ...region, folded: false });
			count++;
		}
	}
	return count;
}

/**
 * Folds all regions at or deeper than the specified depth.
 *
 * @param state - The fold state
 * @param depth - Minimum depth to fold (0 = all)
 * @returns Number of regions folded
 */
export function foldAtDepth(state: MutableFoldState, depth: number): number {
	let count = 0;
	for (const [id, region] of state.regions) {
		if (region.depth >= depth && !region.folded) {
			state.regions.set(id, { ...region, folded: true });
			count++;
		}
	}
	return count;
}

/**
 * Gets the fold region at a given line (if any).
 *
 * @param state - The fold state
 * @param line - Line number (0-based)
 * @returns The fold region containing this line, or undefined
 */
export function getFoldAtLine(state: MutableFoldState, line: number): FoldRegion | undefined {
	// Return the innermost (deepest) fold region at this line
	let best: FoldRegion | undefined;
	for (const region of state.regions.values()) {
		if (line >= region.startLine && line <= region.endLine) {
			if (!best || region.depth > best.depth) {
				best = region;
			}
		}
	}
	return best;
}

/**
 * Gets all fold regions sorted by start line.
 *
 * @param state - The fold state
 * @returns Sorted array of fold regions
 */
export function getAllFoldRegions(state: MutableFoldState): readonly FoldRegion[] {
	return Array.from(state.regions.values()).sort((a, b) => a.startLine - b.startLine);
}

/**
 * Computes visible lines for a viewport, respecting fold state.
 * Only processes lines within the viewport range for efficiency.
 *
 * @param state - The fold state
 * @param viewportStart - First visible line in folded coordinates (0-based)
 * @param viewportHeight - Number of visible lines to compute
 * @returns Array of visible line descriptors
 *
 * @example
 * ```typescript
 * import { createFoldState, addFoldRegion, foldRegion, getVisibleLines } from 'blecsd';
 *
 * const folds = createFoldState(10000);
 * const id = addFoldRegion(folds, 100, 200)!;
 * foldRegion(folds, id);
 * const visible = getVisibleLines(folds, 95, 20); // 20 visible lines from fold-line 95
 * ```
 */
export function getVisibleFoldLines(
	state: MutableFoldState,
	viewportStart: number,
	viewportHeight: number,
): readonly VisibleLine[] {
	const foldedRanges = getFoldedRanges(state);
	const result: VisibleLine[] = [];

	let visibleIdx = 0;
	let docLine = 0;

	// Skip to viewport start
	while (visibleIdx < viewportStart && docLine < state.totalDocumentLines) {
		const fold = findFoldedRangeAt(foldedRanges, docLine);
		if (fold) {
			visibleIdx++; // Fold placeholder takes 1 visible line
			docLine = fold.endLine + 1;
		} else {
			visibleIdx++;
			docLine++;
		}
	}

	// Collect visible lines
	while (result.length < viewportHeight && docLine < state.totalDocumentLines) {
		const fold = findFoldedRangeAt(foldedRanges, docLine);
		if (fold) {
			result.push({
				originalLine: fold.startLine,
				isFoldPlaceholder: true,
				foldId: fold.id,
				foldLabel: fold.label,
				hiddenLines: fold.endLine - fold.startLine,
			});
			docLine = fold.endLine + 1;
		} else {
			result.push({
				originalLine: docLine,
				isFoldPlaceholder: false,
				foldId: undefined,
				foldLabel: undefined,
				hiddenLines: 0,
			});
			docLine++;
		}
	}

	return result;
}

/**
 * Converts a visible line index (in folded coordinates) to the
 * original document line index.
 *
 * @param state - The fold state
 * @param visibleLine - Visible line index (0-based)
 * @returns Original document line index
 */
export function visibleToOriginalLine(state: MutableFoldState, visibleLine: number): number {
	const foldedRanges = getFoldedRanges(state);
	let visibleIdx = 0;
	let docLine = 0;

	while (visibleIdx < visibleLine && docLine < state.totalDocumentLines) {
		const fold = findFoldedRangeAt(foldedRanges, docLine);
		if (fold) {
			visibleIdx++;
			docLine = fold.endLine + 1;
		} else {
			visibleIdx++;
			docLine++;
		}
	}

	return docLine;
}

/**
 * Converts an original document line to the visible line index.
 *
 * @param state - The fold state
 * @param originalLine - Original document line (0-based)
 * @returns Visible line index, or -1 if the line is hidden by a fold
 */
export function originalToVisibleLine(state: MutableFoldState, originalLine: number): number {
	const foldedRanges = getFoldedRanges(state);
	let visibleIdx = 0;
	let docLine = 0;

	while (docLine < originalLine && docLine < state.totalDocumentLines) {
		const fold = findFoldedRangeAt(foldedRanges, docLine);
		if (fold) {
			visibleIdx++;
			if (originalLine > fold.startLine && originalLine <= fold.endLine) {
				return -1; // Line is hidden inside a fold
			}
			docLine = fold.endLine + 1;
		} else {
			visibleIdx++;
			docLine++;
		}
	}

	return visibleIdx;
}

/**
 * Gets fold statistics.
 *
 * @param state - The fold state
 * @returns Fold statistics
 *
 * @example
 * ```typescript
 * import { createFoldState, getFoldStats } from 'blecsd';
 *
 * const folds = createFoldState(10000);
 * const stats = getFoldStats(folds);
 * console.log(`${stats.visibleLines} visible of ${stats.visibleLines + stats.hiddenLines} total`);
 * ```
 */
export function getFoldStats(state: MutableFoldState): FoldStats {
	let foldedRegions = 0;
	let hiddenLines = 0;
	let maxDepth = 0;

	// Use outermost folds only for hidden line counting
	const foldedRanges = getFoldedRanges(state);
	for (const range of foldedRanges) {
		foldedRegions++;
		hiddenLines += range.endLine - range.startLine; // Placeholder takes 1 line
	}

	for (const region of state.regions.values()) {
		if (region.depth > maxDepth) maxDepth = region.depth;
		if (region.folded) foldedRegions = Math.max(foldedRegions, foldedRegions);
	}

	return {
		totalRegions: state.regions.size,
		foldedRegions,
		hiddenLines,
		visibleLines: state.totalDocumentLines - hiddenLines,
		maxDepth,
	};
}

/**
 * Updates the total document line count (e.g., after editing).
 *
 * @param state - The fold state
 * @param totalLines - New total line count
 */
export function updateTotalLines(state: MutableFoldState, totalLines: number): void {
	state.totalDocumentLines = totalLines;

	// Remove regions that are now out of bounds
	for (const [id, region] of state.regions) {
		if (region.startLine >= totalLines || region.endLine >= totalLines) {
			state.regions.delete(id);
		}
	}
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function computeDepth(state: MutableFoldState, startLine: number, endLine: number): number {
	let depth = 0;
	for (const region of state.regions.values()) {
		if (region.startLine <= startLine && region.endLine >= endLine) {
			depth = Math.max(depth, region.depth + 1);
		}
	}
	return depth;
}

interface FoldedRange {
	id: string;
	startLine: number;
	endLine: number;
	label: string;
}

function getFoldedRanges(state: MutableFoldState): FoldedRange[] {
	const folded: FoldedRange[] = [];
	for (const region of state.regions.values()) {
		if (!region.folded) continue;
		folded.push({
			id: region.id,
			startLine: region.startLine,
			endLine: region.endLine,
			label: region.label,
		});
	}
	// Sort by start line
	folded.sort((a, b) => a.startLine - b.startLine);

	// Remove nested folds (only keep outermost)
	const merged: FoldedRange[] = [];
	for (const range of folded) {
		const last = merged[merged.length - 1];
		if (last && range.startLine <= last.endLine) {
			// Nested or overlapping - extend if needed
			if (range.endLine > last.endLine) {
				merged[merged.length - 1] = { ...last, endLine: range.endLine };
			}
			continue;
		}
		merged.push(range);
	}

	return merged;
}

function findFoldedRangeAt(ranges: readonly FoldedRange[], line: number): FoldedRange | undefined {
	// Binary search since ranges are sorted
	let lo = 0;
	let hi = ranges.length - 1;

	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		const range = ranges[mid];
		if (!range) break;
		if (line < range.startLine) {
			hi = mid - 1;
		} else if (line > range.endLine) {
			lo = mid + 1;
		} else {
			return range;
		}
	}

	return undefined;
}
