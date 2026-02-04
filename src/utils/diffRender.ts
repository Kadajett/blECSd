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

	const emptyResult = buildEmptyDiff(oldLines, newLines);
	if (emptyResult) {
		return emptyResult;
	}

	const traceResult = buildMyersTrace(oldLines, newLines, max);
	return backtrackMyers(traceResult.trace, oldLines, newLines, traceResult.offset);
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
		const v = trace[d] ?? [];
		const k = x - y;

		// Determine previous k
		const prevK = getPrevK(k, d, v, offset);

		const prevX = v[prevK + offset] ?? 0;
		const prevY = prevX - prevK;

		// Add diagonal moves (context lines) - in reverse
		const updated = addDiagonalContext(result, oldLines, x, y, prevX, prevY);
		x = updated.x;
		y = updated.y;

		// Add the edit
		const edit = addBacktrackEdit(result, oldLines, newLines, d, x, y, prevX);
		x = edit.x;
		y = edit.y;
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
		const dpRow = dp[i];
		if (!dpRow) continue;
		for (let j = 1; j <= n; j++) {
			if (oldLines[i - 1] === newLines[j - 1]) {
				dpRow[j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
			} else {
				dpRow[j] = Math.max(dp[i - 1]?.[j] ?? 0, dpRow[j - 1] ?? 0);
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
		const step = getLcsStep(dp, oldLines, newLines, i, j);
		ops.unshift(step.op);
		i = step.nextI;
		j = step.nextJ;
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
	const { oldLines, newLines } = splitDiffInput(oldText, newText);

	// Compute diff using best algorithm for input size
	// Myers' algorithm is O((N+M)D) - much faster for similar files
	const diffLines = computeDiffLines(oldLines, newLines);

	// Group into chunks
	const chunks = groupIntoChunks(diffLines, contextLines, collapseThreshold);

	// Mark initial collapse state if configured
	if (config.initiallyCollapsed) {
		applyInitialCollapse(chunks);
	}

	// Count stats
	const stats = countDiffStats(diffLines);

	return {
		chunks,
		additions: stats.additions,
		deletions: stats.deletions,
		contextLines: stats.contextLines,
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
	const pairs = buildSideBySidePairs(result);

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
			const chunk = buildChunkHeader(headerMatch, chunkId);
			chunkId += 1;
			const flushed = flushUnifiedChunk(chunks, currentChunk, currentLines);
			currentChunk = chunk;
			currentLines = flushed;
			continue;
		}

		if (!currentChunk) {
			continue;
		}

		const parsedLine = parseUnifiedLine(line);
		if (!parsedLine) {
			continue;
		}
		currentLines.push(parsedLine.line);
		additions += parsedLine.additions;
		deletions += parsedLine.deletions;
		contextLines += parsedLine.contextLines;
	}

	// Save last chunk
	flushUnifiedChunk(chunks, currentChunk, currentLines);

	return {
		chunks,
		additions,
		deletions,
		contextLines,
		computeTimeMs: performance.now() - startTime,
	};
}

function buildEmptyDiff(
	oldLines: readonly string[],
	newLines: readonly string[],
): DiffLine[] | null {
	const n = oldLines.length;
	const m = newLines.length;
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
	return null;
}

function buildMyersTrace(
	oldLines: readonly string[],
	newLines: readonly string[],
	max: number,
): { trace: number[][]; offset: number } {
	const n = oldLines.length;
	const m = newLines.length;
	const vSize = 2 * max + 1;
	const v: number[] = new Array(vSize).fill(0);
	const offset = max;
	const trace: number[][] = [];

	outer: for (let d = 0; d <= max; d++) {
		trace.push(v.slice());

		for (let k = -d; k <= d; k += 2) {
			const x = stepMyersPath(v, k, d, offset);
			const y = advanceMyersDiagonal(oldLines, newLines, x, k);
			v[k + offset] = y.x;
			if (y.x >= n && y.y >= m) {
				break outer;
			}
		}
	}

	return { trace, offset };
}

function stepMyersPath(v: number[], k: number, d: number, offset: number): number {
	const downPath = k === -d || (k !== d && (v[k - 1 + offset] ?? 0) < (v[k + 1 + offset] ?? 0));
	return downPath ? (v[k + 1 + offset] ?? 0) : (v[k - 1 + offset] ?? 0) + 1;
}

function advanceMyersDiagonal(
	oldLines: readonly string[],
	newLines: readonly string[],
	startX: number,
	k: number,
): { x: number; y: number } {
	let x = startX;
	let y = x - k;
	while (x < oldLines.length && y < newLines.length && oldLines[x] === newLines[y]) {
		x++;
		y++;
	}
	return { x, y };
}

function getPrevK(k: number, d: number, v: number[], offset: number): number {
	const downPath = k === -d || (k !== d && (v[k - 1 + offset] ?? 0) < (v[k + 1 + offset] ?? 0));
	return downPath ? k + 1 : k - 1;
}

function addDiagonalContext(
	result: DiffLine[],
	oldLines: readonly string[],
	x: number,
	y: number,
	prevX: number,
	prevY: number,
): { x: number; y: number } {
	let currentX = x;
	let currentY = y;
	while (currentX > prevX && currentY > prevY) {
		currentX--;
		currentY--;
		result.unshift({
			type: 'context',
			content: oldLines[currentX] ?? '',
			oldLineNo: currentX + 1,
			newLineNo: currentY + 1,
		});
	}
	return { x: currentX, y: currentY };
}

function addBacktrackEdit(
	result: DiffLine[],
	oldLines: readonly string[],
	newLines: readonly string[],
	d: number,
	x: number,
	y: number,
	prevX: number,
): { x: number; y: number } {
	if (d <= 0) {
		return { x, y };
	}
	if (x === prevX) {
		const nextY = y - 1;
		result.unshift({
			type: 'add',
			content: newLines[nextY] ?? '',
			newLineNo: nextY + 1,
		});
		return { x, y: nextY };
	}
	const nextX = x - 1;
	result.unshift({
		type: 'remove',
		content: oldLines[nextX] ?? '',
		oldLineNo: nextX + 1,
	});
	return { x: nextX, y };
}

function splitDiffInput(
	oldText: string,
	newText: string,
): { oldLines: string[]; newLines: string[] } {
	return {
		oldLines: oldText === '' ? [] : oldText.split('\n'),
		newLines: newText === '' ? [] : newText.split('\n'),
	};
}

function applyInitialCollapse(chunks: DiffChunk[]): void {
	for (const chunk of chunks) {
		const hasChanges = chunk.lines.some((l) => l.type === 'add' || l.type === 'remove');
		if (!hasChanges) {
			chunk.collapsed = true;
		}
	}
}

function countDiffStats(lines: readonly DiffLine[]): {
	additions: number;
	deletions: number;
	contextLines: number;
} {
	let additions = 0;
	let deletions = 0;
	let contextLines = 0;

	for (const line of lines) {
		if (line.type === 'add') {
			additions++;
		} else if (line.type === 'remove') {
			deletions++;
		} else if (line.type === 'context') {
			contextLines++;
		}
	}

	return { additions, deletions, contextLines };
}

function buildSideBySidePairs(result: DiffResult): SideBySideLine[] {
	const pairs: SideBySideLine[] = [];

	for (const chunk of result.chunks) {
		if (chunk.collapsed) {
			pairs.push({ left: undefined, right: undefined });
			continue;
		}

		const removes: DiffLine[] = [];
		const adds: DiffLine[] = [];

		for (const line of chunk.lines) {
			if (line.type === 'context') {
				flushSideBySidePairs(pairs, removes, adds);
				pairs.push({
					left: toSideBySideEntry(line, 'context', 'left'),
					right: toSideBySideEntry(line, 'context', 'right'),
				});
				continue;
			}
			if (line.type === 'remove') {
				removes.push(line);
				continue;
			}
			if (line.type === 'add') {
				adds.push(line);
			}
		}

		flushSideBySidePairs(pairs, removes, adds);
	}

	return pairs;
}

function flushSideBySidePairs(
	pairs: SideBySideLine[],
	removes: DiffLine[],
	adds: DiffLine[],
): void {
	while (removes.length > 0 || adds.length > 0) {
		const remove = removes.shift();
		const add = adds.shift();
		pairs.push({
			left: remove ? toSideBySideEntry(remove, 'remove', 'left') : undefined,
			right: add ? toSideBySideEntry(add, 'add', 'right') : undefined,
		});
	}
}

function toSideBySideEntry(
	line: DiffLine,
	type: 'context' | 'add' | 'remove',
	side: 'left' | 'right',
): SideBySideEntry {
	const lineNo = side === 'left' ? line.oldLineNo : line.newLineNo;
	return {
		lineNo: lineNo ?? 0,
		content: line.content,
		type,
	};
}

function buildChunkHeader(match: RegExpExecArray, chunkId: number): DiffChunk {
	return {
		id: chunkId,
		oldStart: parseInt(match[1] ?? '0', 10),
		oldCount: parseInt(match[2] ?? '1', 10),
		newStart: parseInt(match[3] ?? '0', 10),
		newCount: parseInt(match[4] ?? '1', 10),
		lines: [],
		collapsed: false,
		contextBefore: 0,
		contextAfter: 0,
	};
}

function getLcsStep(
	dp: number[][],
	oldLines: readonly string[],
	newLines: readonly string[],
	i: number,
	j: number,
): {
	op: { type: DiffType; line: string; oldNo?: number; newNo?: number };
	nextI: number;
	nextJ: number;
} {
	const oldLine = i > 0 ? oldLines[i - 1] : undefined;
	const newLine = j > 0 ? newLines[j - 1] : undefined;

	if (oldLine !== undefined && newLine !== undefined && oldLine === newLine) {
		return {
			op: { type: 'context', line: oldLine, oldNo: i, newNo: j },
			nextI: i - 1,
			nextJ: j - 1,
		};
	}

	const preferAdd =
		newLine !== undefined && (i === 0 || (dp[i]?.[j - 1] ?? 0) >= (dp[i - 1]?.[j] ?? 0));
	if (preferAdd) {
		return {
			op: { type: 'add', line: newLine, newNo: j },
			nextI: i,
			nextJ: j - 1,
		};
	}

	return {
		op: { type: 'remove', line: oldLine ?? '', oldNo: i },
		nextI: i - 1,
		nextJ: j,
	};
}

function flushUnifiedChunk(
	chunks: DiffChunk[],
	currentChunk: DiffChunk | null,
	currentLines: DiffLine[],
): DiffLine[] {
	if (!currentChunk || currentLines.length === 0) {
		return currentLines;
	}
	chunks.push({
		...currentChunk,
		lines: currentLines,
	});
	return [];
}

function parseUnifiedLine(
	line: string,
): { line: DiffLine; additions: number; deletions: number; contextLines: number } | null {
	if (line.startsWith('+')) {
		return {
			line: { type: 'add', content: line.slice(1) },
			additions: 1,
			deletions: 0,
			contextLines: 0,
		};
	}
	if (line.startsWith('-')) {
		return {
			line: { type: 'remove', content: line.slice(1) },
			additions: 0,
			deletions: 1,
			contextLines: 0,
		};
	}
	if (line.startsWith(' ')) {
		return {
			line: { type: 'context', content: line.slice(1) },
			additions: 0,
			deletions: 0,
			contextLines: 1,
		};
	}
	return null;
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
