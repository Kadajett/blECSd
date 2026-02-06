/**
 * Lazy content loading and pagination.
 *
 * Enables opening huge files (500MB+ logs) by loading only
 * the visible viewport on initial display, then progressively
 * loading surrounding content in the background. Memory footprint
 * stays bounded regardless of source size.
 *
 * @module utils/lazyContent
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for lazy content loading.
 */
export interface LazyContentConfig {
	/** Size of each content chunk in lines (default: 1000) */
	readonly chunkSize: number;
	/** Number of chunks to keep in memory (default: 50) */
	readonly maxCachedChunks: number;
	/** Lines to pre-load ahead of viewport (default: 500) */
	readonly readAheadLines: number;
	/** Lines to pre-load behind viewport (default: 200) */
	readonly readBehindLines: number;
	/** Maximum memory budget in bytes (default: 100MB) */
	readonly maxMemoryBytes: number;
}

/**
 * A loaded content chunk.
 */
export interface ContentChunk {
	/** Chunk index */
	readonly index: number;
	/** Starting line number (0-based) */
	readonly startLine: number;
	/** Ending line number (exclusive) */
	readonly endLine: number;
	/** Lines of content */
	readonly lines: readonly string[];
	/** Byte size estimate of this chunk */
	readonly byteSize: number;
	/** Timestamp when last accessed */
	readonly lastAccessedAt: number;
}

/**
 * Content source that provides lazy loading capability.
 */
export interface ContentSource {
	/** Total number of lines (may be estimated initially) */
	readonly totalLines: number;
	/** Loads lines in the given range */
	readonly loadRange: (startLine: number, endLine: number) => readonly string[];
	/** Whether the total line count is exact */
	readonly isExactCount: boolean;
}

/**
 * State of the lazy content loader.
 */
export interface LazyContentState {
	/** Loader configuration */
	readonly config: LazyContentConfig;
	/** Total lines available */
	readonly totalLines: number;
	/** Number of loaded chunks */
	readonly loadedChunks: number;
	/** Total bytes in memory */
	readonly memoryUsage: number;
	/** Cache hit rate (0-1) */
	readonly hitRate: number;
}

/**
 * Mutable internal state for the lazy content loader.
 */
interface MutableLazyState {
	config: LazyContentConfig;
	source: ContentSource;
	chunks: Map<number, ContentChunk>;
	accessOrder: number[];
	hits: number;
	misses: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_LAZY_CONFIG: LazyContentConfig = {
	chunkSize: 1000,
	maxCachedChunks: 50,
	readAheadLines: 500,
	readBehindLines: 200,
	maxMemoryBytes: 100 * 1024 * 1024,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates a lazy content loader for a content source.
 *
 * @param source - The content source to load from
 * @param config - Optional configuration
 * @returns The mutable lazy state (opaque handle)
 *
 * @example
 * ```typescript
 * import { createLazyContent, getLazyLines } from 'blecsd';
 *
 * const source = {
 *   totalLines: 1000000,
 *   isExactCount: true,
 *   loadRange: (start, end) => fileLines.slice(start, end),
 * };
 * const loader = createLazyContent(source);
 * const visible = getLazyLines(loader, 500, 540); // Get 40 visible lines
 * ```
 */
export function createLazyContent(
	source: ContentSource,
	config?: Partial<LazyContentConfig>,
): MutableLazyState {
	return {
		config: { ...DEFAULT_LAZY_CONFIG, ...config },
		source,
		chunks: new Map(),
		accessOrder: [],
		hits: 0,
		misses: 0,
	};
}

/**
 * Gets lines from the lazy loader, loading chunks as needed.
 *
 * @param state - The lazy content state
 * @param startLine - First line to retrieve (0-based)
 * @param endLine - Last line (exclusive)
 * @returns Array of lines for the requested range
 *
 * @example
 * ```typescript
 * import { createLazyContent, getLazyLines } from 'blecsd';
 *
 * const loader = createLazyContent(mySource);
 * const lines = getLazyLines(loader, 0, 40); // First 40 lines
 * ```
 */
export function getLazyLines(
	state: MutableLazyState,
	startLine: number,
	endLine: number,
): readonly string[] {
	const clamped = {
		start: Math.max(0, startLine),
		end: Math.min(endLine, state.source.totalLines),
	};

	const result: string[] = [];
	const chunkSize = state.config.chunkSize;

	const firstChunk = Math.floor(clamped.start / chunkSize);
	const lastChunk = Math.floor(Math.max(0, clamped.end - 1) / chunkSize);

	for (let ci = firstChunk; ci <= lastChunk; ci++) {
		const chunk = ensureChunkLoaded(state, ci);
		if (!chunk) continue;

		const chunkStartLine = ci * chunkSize;
		const localStart = Math.max(0, clamped.start - chunkStartLine);
		const localEnd = Math.min(chunk.lines.length, clamped.end - chunkStartLine);

		for (let i = localStart; i < localEnd; i++) {
			result.push(chunk.lines[i]!);
		}
	}

	return result;
}

/**
 * Pre-loads chunks around a viewport for smooth scrolling.
 *
 * @param state - The lazy content state
 * @param viewportStart - First visible line
 * @param viewportEnd - Last visible line (exclusive)
 *
 * @example
 * ```typescript
 * import { createLazyContent, prefetchAround } from 'blecsd';
 *
 * const loader = createLazyContent(mySource);
 * prefetchAround(loader, 500, 540); // Pre-load around viewport
 * ```
 */
export function prefetchAround(
	state: MutableLazyState,
	viewportStart: number,
	viewportEnd: number,
): void {
	const { readAheadLines, readBehindLines, chunkSize } = state.config;
	const prefetchStart = Math.max(0, viewportStart - readBehindLines);
	const prefetchEnd = Math.min(state.source.totalLines, viewportEnd + readAheadLines);

	const firstChunk = Math.floor(prefetchStart / chunkSize);
	const lastChunk = Math.floor(Math.max(0, prefetchEnd - 1) / chunkSize);

	for (let ci = firstChunk; ci <= lastChunk; ci++) {
		ensureChunkLoaded(state, ci);
	}
}

/**
 * Evicts the least recently used chunks to free memory.
 *
 * @param state - The lazy content state
 * @param targetChunks - Target number of chunks to keep (default: config.maxCachedChunks)
 * @returns Number of chunks evicted
 */
export function evictChunks(state: MutableLazyState, targetChunks?: number): number {
	const max = targetChunks ?? state.config.maxCachedChunks;
	let evicted = 0;

	while (state.chunks.size > max && state.accessOrder.length > 0) {
		const oldest = state.accessOrder.shift()!;
		if (state.chunks.has(oldest)) {
			state.chunks.delete(oldest);
			evicted++;
		}
	}

	return evicted;
}

/**
 * Clears all cached chunks.
 *
 * @param state - The lazy content state
 */
export function clearLazyContent(state: MutableLazyState): void {
	state.chunks.clear();
	state.accessOrder = [];
	state.hits = 0;
	state.misses = 0;
}

/**
 * Gets the current lazy loader statistics.
 *
 * @param state - The lazy content state
 * @returns Current state snapshot
 *
 * @example
 * ```typescript
 * import { createLazyContent, getLazyContentState } from 'blecsd';
 *
 * const loader = createLazyContent(mySource);
 * const stats = getLazyContentState(loader);
 * console.log(`${stats.loadedChunks} chunks, ${stats.memoryUsage} bytes`);
 * ```
 */
export function getLazyContentState(state: MutableLazyState): LazyContentState {
	let memoryUsage = 0;
	for (const chunk of state.chunks.values()) {
		memoryUsage += chunk.byteSize;
	}

	const totalAccesses = state.hits + state.misses;
	return {
		config: state.config,
		totalLines: state.source.totalLines,
		loadedChunks: state.chunks.size,
		memoryUsage,
		hitRate: totalAccesses > 0 ? state.hits / totalAccesses : 0,
	};
}

/**
 * Checks if a specific line range is already loaded.
 *
 * @param state - The lazy content state
 * @param startLine - First line to check
 * @param endLine - Last line to check (exclusive)
 * @returns Whether all lines in the range are loaded
 */
export function isRangeLoaded(
	state: MutableLazyState,
	startLine: number,
	endLine: number,
): boolean {
	const chunkSize = state.config.chunkSize;
	const firstChunk = Math.floor(startLine / chunkSize);
	const lastChunk = Math.floor(Math.max(0, endLine - 1) / chunkSize);

	for (let ci = firstChunk; ci <= lastChunk; ci++) {
		if (!state.chunks.has(ci)) return false;
	}
	return true;
}

/**
 * Creates a content source from an array of lines.
 * Useful for testing or for in-memory content.
 *
 * @param lines - Array of text lines
 * @returns A content source
 *
 * @example
 * ```typescript
 * import { createArraySource, createLazyContent, getLazyLines } from 'blecsd';
 *
 * const source = createArraySource(['line 1', 'line 2', 'line 3']);
 * const loader = createLazyContent(source);
 * ```
 */
export function createArraySource(lines: readonly string[]): ContentSource {
	return {
		totalLines: lines.length,
		isExactCount: true,
		loadRange: (start, end) => lines.slice(start, end),
	};
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function ensureChunkLoaded(state: MutableLazyState, chunkIndex: number): ContentChunk | undefined {
	const existing = state.chunks.get(chunkIndex);
	if (existing) {
		state.hits++;
		// Update access order
		touchChunk(state, chunkIndex);
		return { ...existing, lastAccessedAt: Date.now() };
	}

	state.misses++;

	const chunkSize = state.config.chunkSize;
	const startLine = chunkIndex * chunkSize;
	const endLine = Math.min(startLine + chunkSize, state.source.totalLines);

	if (startLine >= state.source.totalLines) return undefined;

	// Evict if at capacity
	if (state.chunks.size >= state.config.maxCachedChunks) {
		evictChunks(state, state.config.maxCachedChunks - 1);
	}

	const lines = state.source.loadRange(startLine, endLine);
	let byteSize = 0;
	for (const line of lines) byteSize += line.length * 2; // rough UTF-16 estimate

	const chunk: ContentChunk = {
		index: chunkIndex,
		startLine,
		endLine,
		lines,
		byteSize,
		lastAccessedAt: Date.now(),
	};

	state.chunks.set(chunkIndex, chunk);
	state.accessOrder.push(chunkIndex);

	return chunk;
}

function touchChunk(state: MutableLazyState, chunkIndex: number): void {
	const idx = state.accessOrder.indexOf(chunkIndex);
	if (idx >= 0) {
		state.accessOrder.splice(idx, 1);
	}
	state.accessOrder.push(chunkIndex);
}
