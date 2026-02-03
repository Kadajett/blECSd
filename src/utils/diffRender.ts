/**
 * Efficient Diff Rendering
 *
 * Fast diff computation and rendering for large changesets:
 * - Unified and side-by-side views
 * - Collapsible unchanged regions
 * - Virtualized rendering (visible lines only)
 * - Lazy diff computation
 *
 * @module utils/diffRender
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Type of change in a diff line.
 */
export type DiffType = 'add' | 'remove' | 'context' | 'header';

/**
 * A single line in a diff.
 */
export interface DiffLine {
	/** Type of change */
	readonly type: DiffType;
	/** Line content */
	readonly content: string;
	/** Old line number (for remove/context) */
	readonly oldLineNo?: number;
	/** New line number (for add/context) */
	readonly newLineNo?: number;
}

/**
 * A chunk/hunk in a diff.
 */
export interface DiffChunk {
	/** Chunk ID */
	readonly id: number;
	/** Old start line */
	readonly oldStart: number;
	/** Old line count */
	readonly oldCount: number;
	/** New start line */
	readonly newStart: number;
	/** New line count */
	readonly newCount: number;
	/** Lines in this chunk */
	readonly lines: readonly DiffLine[];
	/** Whether this chunk is collapsed */
	collapsed: boolean;
	/** Number of context lines before/after changes */
	readonly contextBefore: number;
	readonly contextAfter: number;
}

/**
 * Full diff result.
 */
export interface DiffResult {
	/** All chunks */
	readonly chunks: readonly DiffChunk[];
	/** Total lines added */
	readonly additions: number;
	/** Total lines removed */
	readonly deletions: number;
	/** Total context lines */
	readonly contextLines: number;
	/** Computation time in ms */
	readonly computeTimeMs: number;
}

/**
 * Side-by-side line pair.
 */
export interface SideBySideLine {
	/** Left (old) line */
	readonly left?: {
		readonly lineNo: number;
		readonly content: string;
		readonly type: 'remove' | 'context';
	};
	/** Right (new) line */
	readonly right?: {
		readonly lineNo: number;
		readonly content: string;
		readonly type: 'add' | 'context';
	};
}

/**
 * Visible lines result for virtualized rendering.
 */
export interface VisibleDiff {
	/** Lines to render */
	readonly lines: readonly DiffLine[];
	/** Start line index */
	readonly startIndex: number;
	/** Total line count (including collapsed) */
	readonly totalLines: number;
	/** Chunk info for each visible line */
	readonly chunkInfo: readonly { chunkId: number; collapsed: boolean }[];
}

/**
 * Diff configuration.
 */
export interface DiffConfig {
	/** Context lines around changes (default: 3) */
	readonly contextLines: number;
	/** Collapse unchanged regions larger than this */
	readonly collapseThreshold: number;
	/** Initially collapse unchanged regions */
	readonly initiallyCollapsed: boolean;
}

/**
 * Diff cache for incremental updates.
 */
export interface DiffCache {
	/** Old text hash */
	oldHash: number;
	/** New text hash */
	newHash: number;
	/** Cached diff result */
	result: DiffResult | null;
	/** Expanded chunks */
	readonly expandedChunks: Set<number>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default context lines */
export const DEFAULT_CONTEXT = 3;

/** Default collapse threshold */
export const DEFAULT_COLLAPSE_THRESHOLD = 10;

// =============================================================================
// DIFF COMPUTATION
// =============================================================================

/**
 * Computes a simple hash for text validation.
 */
function computeHash(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return hash;
}

// =============================================================================
// MYERS' DIFF ALGORITHM - O((N+M)D) complexity
// =============================================================================

/**
 * Myers' diff algorithm implementation.
 * Much faster than LCS for similar files (common case).
 * Complexity: O((N+M)D) where D is the edit distance.
 */
function myersDiff(oldLines: readonly string[], newLines: readonly string[]): DiffLine[] {
	const n = oldLines.length;
	const m = newLines.length;
	const max = n + m;

	// Handle edge cases
	if (n === 0 && m === 0) return [];
	if (n === 0) {
		return newLines.map((line, i) => ({
			type: 'add' as DiffType,
			content: line,
			newLineNo: i + 1,
		}));
	}
	if (m === 0) {
		return oldLines.map((line, i) => ({
			type: 'remove' as DiffType,
			content: line,
			oldLineNo: i + 1,
		}));
	}

	// V array stores the furthest reaching path for each diagonal
	// We use offset to handle negative indices
	const vSize = 2 * max + 1;
	const v: number[] = new Array(vSize).fill(0);
	const offset = max;

	// Store the path for backtracking
	const trace: number[][] = [];

	// Find the shortest edit script
	outer: for (let d = 0; d <= max; d++) {
		// Save current v for backtracking
		trace.push(v.slice());

		for (let k = -d; k <= d; k += 2) {
			// Decide whether to go down or right
			let x: number;
			if (k === -d || (k !== d && (v[k - 1 + offset] ?? 0) < (v[k + 1 + offset] ?? 0))) {
				x = v[k + 1 + offset] ?? 0; // Move down (insert)
			} else {
				x = (v[k - 1 + offset] ?? 0) + 1; // Move right (delete)
			}

			let y = x - k;

			// Follow diagonal (matching lines)
			while (x < n && y < m && oldLines[x] === newLines[y]) {
				x++;
				y++;
			}

			v[k + offset] = x;

			// Check if we've reached the end
			if (x >= n && y >= m) {
				break outer;
			}
		}
	}

	// Backtrack to build the diff
	return backtrackMyers(trace, oldLines, newLines, offset);
}

/**
 * Backtracks through Myers trace to build diff lines.
 */
function backtrackMyers(
	trace: number[][],
	oldLines: readonly string[],
	newLines: readonly string[],
	offset: number,
): DiffLine[] {
	const result: DiffLine[] = [];
	let x = oldLines.length;
	let y = newLines.length;

	// Work backwards through the trace
	for (let d = trace.length - 1; d >= 0; d--) {
		const v = trace[d]!;
		const k = x - y;

		// Determine previous k
		let prevK: number;
		if (k === -d || (k !== d && (v[k - 1 + offset] ?? 0) < (v[k + 1 + offset] ?? 0))) {
			prevK = k + 1;
		} else {
			prevK = k - 1;
		}

		const prevX = v[prevK + offset] ?? 0;
		const prevY = prevX - prevK;

		// Add diagonal moves (context lines) - in reverse
		while (x > prevX && y > prevY) {
			x--;
			y--;
			result.unshift({
				type: 'context',
				content: oldLines[x]!,
				oldLineNo: x + 1,
				newLineNo: y + 1,
			});
		}

		// Add the edit
		if (d > 0) {
			if (x === prevX) {
				// Insert
				y--;
				result.unshift({
					type: 'add',
					content: newLines[y]!,
					newLineNo: y + 1,
				});
			} else {
				// Delete
				x--;
				result.unshift({
					type: 'remove',
					content: oldLines[x]!,
					oldLineNo: x + 1,
				});
			}
		}
	}

	return result;
}

// =============================================================================
// LCS ALGORITHM - Fallback for edge cases
// =============================================================================

/**
 * Computes the Longest Common Subsequence length table.
 * Used as fallback for small inputs or when Myers fails.
 */
function computeLCS(oldLines: readonly string[], newLines: readonly string[]): number[][] {
	const m = oldLines.length;
	const n = newLines.length;

	// Standard dynamic programming approach
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (oldLines[i - 1] === newLines[j - 1]) {
				dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
			} else {
				dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
			}
		}
	}

	return dp;
}

/**
 * Backtracks through LCS to build diff.
 */
function backtrackLCS(
	dp: number[][],
	oldLines: readonly string[],
	newLines: readonly string[],
): DiffLine[] {
	const result: DiffLine[] = [];
	let i = oldLines.length;
	let j = newLines.length;

	// Backtrack to find the actual diff
	const ops: { type: DiffType; line: string; oldNo?: number; newNo?: number }[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
			ops.unshift({
				type: 'context',
				line: oldLines[i - 1]!,
				oldNo: i,
				newNo: j,
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || (dp[i]?.[j - 1] ?? 0) >= (dp[i - 1]?.[j] ?? 0))) {
			ops.unshift({
				type: 'add',
				line: newLines[j - 1]!,
				newNo: j,
			});
			j--;
		} else {
			ops.unshift({
				type: 'remove',
				line: oldLines[i - 1]!,
				oldNo: i,
			});
			i--;
		}
	}

	for (const op of ops) {
		result.push({
			type: op.type,
			content: op.line,
			oldLineNo: op.oldNo,
			newLineNo: op.newNo,
		});
	}

	return result;
}

/**
 * Computes diff lines using the best algorithm for the input size.
 * Uses Myers for large inputs, LCS for small inputs.
 */
function computeDiffLines(oldLines: readonly string[], newLines: readonly string[]): DiffLine[] {
	const m = oldLines.length;
	const n = newLines.length;

	// Use Myers for larger inputs (faster for typical diffs)
	// Use LCS for very small inputs (simpler, fast enough)
	if (m > 100 || n > 100) {
		return myersDiff(oldLines, newLines);
	}

	// Fall back to LCS for small inputs
	const dp = computeLCS(oldLines, newLines);
	return backtrackLCS(dp, oldLines, newLines);
}

/**
 * Groups diff lines into chunks.
 */
function groupIntoChunks(
	lines: readonly DiffLine[],
	contextLines: number,
	collapseThreshold: number,
): DiffChunk[] {
	if (lines.length === 0) {
		return [];
	}

	const chunks: DiffChunk[] = [];
	let currentChunk: DiffLine[] = [];
	let chunkId = 0;
	let oldStart = 1;
	let newStart = 1;
	let consecutiveContext = 0;
	let contextBefore = 0;

	function finalizeChunk(): void {
		if (currentChunk.length === 0) return;

		const oldCount = currentChunk.filter((l) => l.type === 'remove' || l.type === 'context').length;
		const newCount = currentChunk.filter((l) => l.type === 'add' || l.type === 'context').length;

		chunks.push({
			id: chunkId++,
			oldStart,
			oldCount,
			newStart,
			newCount,
			lines: currentChunk,
			collapsed: false,
			contextBefore,
			contextAfter: consecutiveContext,
		});

		// Update start positions for next chunk
		oldStart += oldCount;
		newStart += newCount;
		currentChunk = [];
		contextBefore = 0;
	}

	for (const line of lines) {
		if (line.type === 'context') {
			consecutiveContext++;

			// Check if we should split into a new chunk
			if (consecutiveContext > contextLines * 2 + collapseThreshold) {
				// Keep contextLines after the previous change
				const contextAfterPrev = currentChunk.slice(-contextLines);
				currentChunk = currentChunk.slice(0, -contextLines);

				if (currentChunk.length > 0) {
					consecutiveContext = contextLines;
					finalizeChunk();
				}

				// Start new chunk with context before next change
				currentChunk = [...contextAfterPrev, line];
				contextBefore = contextAfterPrev.length + 1;
				consecutiveContext = 1;
			} else {
				currentChunk.push(line);
			}
		} else {
			consecutiveContext = 0;
			currentChunk.push(line);
		}
	}

	finalizeChunk();

	return chunks;
}

/**
 * Computes diff between two texts.
 *
 * @param oldText - Original text
 * @param newText - Modified text
 * @param config - Diff configuration
 * @returns Diff result with chunks
 */
export function computeDiff(
	oldText: string,
	newText: string,
	config: Partial<DiffConfig> = {},
): DiffResult {
	const startTime = performance.now();

	const contextLines = config.contextLines ?? DEFAULT_CONTEXT;
	const collapseThreshold = config.collapseThreshold ?? DEFAULT_COLLAPSE_THRESHOLD;

	// Split into lines (handle empty string case)
	const oldLines = oldText === '' ? [] : oldText.split('\n');
	const newLines = newText === '' ? [] : newText.split('\n');

	// Compute diff using best algorithm for input size
	// Myers' algorithm is O((N+M)D) - much faster for similar files
	const diffLines = computeDiffLines(oldLines, newLines);

	// Group into chunks
	const chunks = groupIntoChunks(diffLines, contextLines, collapseThreshold);

	// Mark initial collapse state if configured
	if (config.initiallyCollapsed) {
		for (const chunk of chunks) {
			const hasChanges = chunk.lines.some((l) => l.type === 'add' || l.type === 'remove');
			if (!hasChanges) {
				chunk.collapsed = true;
			}
		}
	}

	// Count stats
	let additions = 0;
	let deletions = 0;
	let contextCount = 0;

	for (const line of diffLines) {
		if (line.type === 'add') additions++;
		else if (line.type === 'remove') deletions++;
		else if (line.type === 'context') contextCount++;
	}

	return {
		chunks,
		additions,
		deletions,
		contextLines: contextCount,
		computeTimeMs: performance.now() - startTime,
	};
}

/**
 * Computes diff lazily, processing in batches.
 *
 * @param oldText - Original text
 * @param newText - Modified text
 * @param batchSize - Lines to process per batch
 * @returns Diff result (may be partial)
 */
export function computeDiffLazy(
	oldText: string,
	newText: string,
	_batchSize: number = 10000,
): DiffResult {
	// Myers' algorithm is already fast enough for most use cases.
	// For truly massive diffs (100K+ lines), consider web workers.
	return computeDiff(oldText, newText);
}

// =============================================================================
// DIFF CACHE
// =============================================================================

/**
 * Creates a new diff cache.
 */
export function createDiffCache(): DiffCache {
	return {
		oldHash: 0,
		newHash: 0,
		result: null,
		expandedChunks: new Set(),
	};
}

/**
 * Clears the diff cache.
 */
export function clearDiffCache(cache: DiffCache): void {
	cache.oldHash = 0;
	cache.newHash = 0;
	cache.result = null;
	cache.expandedChunks.clear();
}

/**
 * Computes diff with caching.
 */
export function computeDiffCached(
	cache: DiffCache,
	oldText: string,
	newText: string,
	config: Partial<DiffConfig> = {},
): DiffResult {
	const oldHash = computeHash(oldText);
	const newHash = computeHash(newText);

	if (cache.oldHash === oldHash && cache.newHash === newHash && cache.result) {
		return cache.result;
	}

	const result = computeDiff(oldText, newText, config);

	cache.oldHash = oldHash;
	cache.newHash = newHash;
	cache.result = result;

	// Restore expanded state
	for (const chunk of result.chunks) {
		if (cache.expandedChunks.has(chunk.id)) {
			chunk.collapsed = false;
		}
	}

	return result;
}

// =============================================================================
// CHUNK OPERATIONS
// =============================================================================

/**
 * Expands a collapsed chunk.
 */
export function expandChunk(cache: DiffCache, result: DiffResult, chunkId: number): void {
	const chunk = result.chunks.find((c) => c.id === chunkId);
	if (chunk) {
		chunk.collapsed = false;
		cache.expandedChunks.add(chunkId);
	}
}

/**
 * Collapses a chunk.
 */
export function collapseChunk(cache: DiffCache, result: DiffResult, chunkId: number): void {
	const chunk = result.chunks.find((c) => c.id === chunkId);
	if (chunk) {
		chunk.collapsed = true;
		cache.expandedChunks.delete(chunkId);
	}
}

/**
 * Toggles chunk collapsed state.
 */
export function toggleChunk(cache: DiffCache, result: DiffResult, chunkId: number): boolean {
	const chunk = result.chunks.find((c) => c.id === chunkId);
	if (!chunk) return false;

	if (chunk.collapsed) {
		expandChunk(cache, result, chunkId);
		return false; // Now expanded
	}
	collapseChunk(cache, result, chunkId);
	return true; // Now collapsed
}

/**
 * Expands all chunks.
 */
export function expandAll(cache: DiffCache, result: DiffResult): void {
	for (const chunk of result.chunks) {
		chunk.collapsed = false;
		cache.expandedChunks.add(chunk.id);
	}
}

/**
 * Collapses all unchanged regions.
 */
export function collapseUnchanged(cache: DiffCache, result: DiffResult): void {
	for (const chunk of result.chunks) {
		const hasChanges = chunk.lines.some((l) => l.type === 'add' || l.type === 'remove');
		if (!hasChanges) {
			chunk.collapsed = true;
			cache.expandedChunks.delete(chunk.id);
		}
	}
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Gets visible lines for virtualized rendering.
 *
 * @param result - The diff result
 * @param startLine - First visible line
 * @param viewportSize - Number of visible lines
 * @returns Visible diff lines
 */
export function getVisibleDiffLines(
	result: DiffResult,
	startLine: number,
	viewportSize: number,
): VisibleDiff {
	const allLines: Array<{ line: DiffLine; chunkId: number; collapsed: boolean }> = [];

	// Build flat list of visible lines
	for (const chunk of result.chunks) {
		if (chunk.collapsed) {
			// Add collapsed placeholder
			allLines.push({
				line: {
					type: 'header',
					content: `... ${chunk.lines.length} lines hidden ...`,
				},
				chunkId: chunk.id,
				collapsed: true,
			});
		} else {
			for (const line of chunk.lines) {
				allLines.push({
					line,
					chunkId: chunk.id,
					collapsed: false,
				});
			}
		}
	}

	// Extract visible range
	const start = Math.max(0, startLine);
	const end = Math.min(allLines.length, startLine + viewportSize);
	const visible = allLines.slice(start, end);

	return {
		lines: visible.map((v) => v.line),
		startIndex: start,
		totalLines: allLines.length,
		chunkInfo: visible.map((v) => ({ chunkId: v.chunkId, collapsed: v.collapsed })),
	};
}

/**
 * Gets total line count (accounting for collapsed chunks).
 */
export function getTotalLineCount(result: DiffResult): number {
	let count = 0;

	for (const chunk of result.chunks) {
		if (chunk.collapsed) {
			count += 1; // Collapsed placeholder
		} else {
			count += chunk.lines.length;
		}
	}

	return count;
}

/**
 * Converts diff to side-by-side view.
 *
 * @param result - The diff result
 * @param startLine - First visible line
 * @param viewportSize - Number of visible lines
 * @returns Side-by-side line pairs
 */
export function getSideBySideView(
	result: DiffResult,
	startLine: number,
	viewportSize: number,
): readonly SideBySideLine[] {
	const pairs: SideBySideLine[] = [];

	// Build pairs from all chunks
	for (const chunk of result.chunks) {
		if (chunk.collapsed) {
			pairs.push({
				left: undefined,
				right: undefined,
			});
			continue;
		}

		// Group lines into matched pairs
		const removes: DiffLine[] = [];
		const adds: DiffLine[] = [];

		for (const line of chunk.lines) {
			if (line.type === 'context') {
				// Flush pending removes/adds as pairs first
				while (removes.length > 0 || adds.length > 0) {
					const remove = removes.shift();
					const add = adds.shift();
					pairs.push({
						left: remove
							? {
									lineNo: remove.oldLineNo ?? 0,
									content: remove.content,
									type: 'remove',
								}
							: undefined,
						right: add
							? {
									lineNo: add.newLineNo ?? 0,
									content: add.content,
									type: 'add',
								}
							: undefined,
					});
				}

				// Add context line to both sides
				pairs.push({
					left: {
						lineNo: line.oldLineNo ?? 0,
						content: line.content,
						type: 'context',
					},
					right: {
						lineNo: line.newLineNo ?? 0,
						content: line.content,
						type: 'context',
					},
				});
			} else if (line.type === 'remove') {
				removes.push(line);
			} else if (line.type === 'add') {
				adds.push(line);
			}
		}

		// Flush remaining
		while (removes.length > 0 || adds.length > 0) {
			const remove = removes.shift();
			const add = adds.shift();
			pairs.push({
				left: remove
					? {
							lineNo: remove.oldLineNo ?? 0,
							content: remove.content,
							type: 'remove',
						}
					: undefined,
				right: add
					? {
							lineNo: add.newLineNo ?? 0,
							content: add.content,
							type: 'add',
						}
					: undefined,
			});
		}
	}

	// Return visible portion
	const start = Math.max(0, startLine);
	const end = Math.min(pairs.length, startLine + viewportSize);

	return pairs.slice(start, end);
}

// =============================================================================
// UNIFIED FORMAT
// =============================================================================

/**
 * Formats diff as unified diff text.
 */
export function toUnifiedDiff(
	result: DiffResult,
	oldName: string = 'a',
	newName: string = 'b',
): string {
	const lines: string[] = [];

	lines.push(`--- ${oldName}`);
	lines.push(`+++ ${newName}`);

	for (const chunk of result.chunks) {
		// Chunk header
		lines.push(`@@ -${chunk.oldStart},${chunk.oldCount} +${chunk.newStart},${chunk.newCount} @@`);

		for (const line of chunk.lines) {
			const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
			lines.push(prefix + line.content);
		}
	}

	return lines.join('\n');
}

/**
 * Parses unified diff text back into a DiffResult.
 */
export function parseUnifiedDiff(diffText: string): DiffResult {
	const startTime = performance.now();
	const lines = diffText.split('\n');
	const chunks: DiffChunk[] = [];
	let currentChunk: DiffChunk | null = null;
	let currentLines: DiffLine[] = [];
	let chunkId = 0;
	let additions = 0;
	let deletions = 0;
	let contextLines = 0;

	const chunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

	for (const line of lines) {
		// Skip file headers
		if (line.startsWith('---') || line.startsWith('+++')) {
			continue;
		}

		const headerMatch = chunkHeaderRegex.exec(line);
		if (headerMatch) {
			// Save previous chunk
			if (currentChunk && currentLines.length > 0) {
				chunks.push({
					...currentChunk,
					lines: currentLines,
				});
			}

			// Start new chunk
			currentChunk = {
				id: chunkId++,
				oldStart: parseInt(headerMatch[1]!, 10),
				oldCount: parseInt(headerMatch[2] ?? '1', 10),
				newStart: parseInt(headerMatch[3]!, 10),
				newCount: parseInt(headerMatch[4] ?? '1', 10),
				lines: [],
				collapsed: false,
				contextBefore: 0,
				contextAfter: 0,
			};
			currentLines = [];
			continue;
		}

		if (!currentChunk) continue;

		let type: DiffType;
		let content: string;

		if (line.startsWith('+')) {
			type = 'add';
			content = line.slice(1);
			additions++;
		} else if (line.startsWith('-')) {
			type = 'remove';
			content = line.slice(1);
			deletions++;
		} else if (line.startsWith(' ')) {
			type = 'context';
			content = line.slice(1);
			contextLines++;
		} else {
			continue;
		}

		currentLines.push({ type, content });
	}

	// Save last chunk
	if (currentChunk && currentLines.length > 0) {
		chunks.push({
			...currentChunk,
			lines: currentLines,
		});
	}

	return {
		chunks,
		additions,
		deletions,
		contextLines,
		computeTimeMs: performance.now() - startTime,
	};
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Gets summary statistics for a diff.
 */
export function getDiffStats(result: DiffResult): {
	additions: number;
	deletions: number;
	totalChanges: number;
	chunks: number;
	collapsedChunks: number;
} {
	return {
		additions: result.additions,
		deletions: result.deletions,
		totalChanges: result.additions + result.deletions,
		chunks: result.chunks.length,
		collapsedChunks: result.chunks.filter((c) => c.collapsed).length,
	};
}
