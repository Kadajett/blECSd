/**
 * Virtualized Scrollback Buffer
 *
 * Efficient storage and retrieval for unlimited scrollback history:
 * - Chunked storage (N lines per chunk)
 * - LRU cache for recently viewed chunks
 * - Optional compression for old content
 * - Fast position lookups via line index
 *
 * @module utils/virtualScrollback
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single line of content with optional metadata.
 */
export interface ScrollbackLine {
	/** The text content of the line */
	readonly text: string;
	/** ANSI formatting preserved */
	readonly ansi?: string | undefined;
	/** Timestamp when line was added */
	readonly timestamp?: number | undefined;
	/** Custom metadata */
	readonly meta?: Record<string, unknown> | undefined;
}

/**
 * A chunk of lines.
 */
export interface Chunk {
	/** Chunk ID (sequential) */
	readonly id: number;
	/** Lines in this chunk */
	readonly lines: ScrollbackLine[];
	/** First line index in the buffer */
	readonly startLine: number;
	/** Number of lines in this chunk */
	readonly lineCount: number;
	/** Whether this chunk is compressed */
	compressed: boolean;
	/** Compressed data (when compressed=true) */
	compressedData?: string | undefined;
	/** Approximate memory usage in bytes */
	memorySize: number;
	/** Last access time for LRU */
	lastAccess: number;
}

/**
 * Scrollback buffer configuration.
 */
export interface ScrollbackConfig {
	/** Lines per chunk (default: 1000) */
	readonly chunkSize: number;
	/** Max chunks to keep in memory (LRU cache size) */
	readonly maxCachedChunks: number;
	/** Enable compression for old chunks */
	readonly enableCompression: boolean;
	/** Max total lines before eviction (0 = unlimited) */
	readonly maxLines: number;
	/** Memory limit in bytes (0 = unlimited) */
	readonly maxMemory: number;
}

/**
 * Line range query result.
 */
export interface LineRange {
	/** Lines in the range */
	readonly lines: readonly ScrollbackLine[];
	/** Start line index (actual, may differ from requested) */
	readonly startLine: number;
	/** End line index (exclusive) */
	readonly endLine: number;
	/** Whether all requested lines are available */
	readonly complete: boolean;
	/** Time to load in milliseconds */
	readonly loadTimeMs: number;
}

/**
 * Scrollback buffer statistics.
 */
export interface ScrollbackStats {
	/** Total line count */
	readonly totalLines: number;
	/** Total chunk count */
	readonly totalChunks: number;
	/** Chunks currently in memory */
	readonly cachedChunks: number;
	/** Compressed chunk count */
	readonly compressedChunks: number;
	/** Approximate memory usage in bytes */
	readonly memoryBytes: number;
	/** Memory usage in MB */
	readonly memoryMB: number;
}

/**
 * The virtualized scrollback buffer.
 */
export interface ScrollbackBuffer {
	/** Configuration */
	readonly config: ScrollbackConfig;
	/** All chunks */
	readonly chunks: Map<number, Chunk>;
	/** LRU cache order (chunk IDs, most recent last) */
	readonly lruOrder: number[];
	/** Total line count */
	totalLines: number;
	/** Current memory usage estimate */
	memoryBytes: number;
	/** Next chunk ID */
	nextChunkId: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default lines per chunk */
export const DEFAULT_CHUNK_SIZE = 1000;

/** Default max cached chunks */
export const DEFAULT_MAX_CACHED = 100;

/** Default max memory (200MB) */
export const DEFAULT_MAX_MEMORY = 200 * 1024 * 1024;

/** Approximate bytes per character */
const BYTES_PER_CHAR = 2;

/** Compression ratio estimate (used for memory projections) */
export const COMPRESSION_RATIO = 0.5;

// =============================================================================
// BUFFER CREATION
// =============================================================================

/**
 * Creates a new scrollback buffer.
 *
 * @param config - Configuration options
 * @returns New scrollback buffer
 *
 * @example
 * ```typescript
 * const buffer = createScrollbackBuffer({
 *   chunkSize: 1000,
 *   maxCachedChunks: 100,
 *   enableCompression: true,
 * });
 * ```
 */
export function createScrollbackBuffer(config: Partial<ScrollbackConfig> = {}): ScrollbackBuffer {
	return {
		config: {
			chunkSize: config.chunkSize ?? DEFAULT_CHUNK_SIZE,
			maxCachedChunks: config.maxCachedChunks ?? DEFAULT_MAX_CACHED,
			enableCompression: config.enableCompression ?? true,
			maxLines: config.maxLines ?? 0,
			maxMemory: config.maxMemory ?? DEFAULT_MAX_MEMORY,
		},
		chunks: new Map(),
		lruOrder: [],
		totalLines: 0,
		memoryBytes: 0,
		nextChunkId: 0,
	};
}

/**
 * Clears all content from the buffer.
 *
 * @param buffer - The buffer to clear
 */
export function clearScrollback(buffer: ScrollbackBuffer): void {
	buffer.chunks.clear();
	buffer.lruOrder.length = 0;
	buffer.totalLines = 0;
	buffer.memoryBytes = 0;
	buffer.nextChunkId = 0;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Estimates memory size of a line.
 */
function estimateLineSize(line: ScrollbackLine): number {
	let size = line.text.length * BYTES_PER_CHAR;
	if (line.ansi) {
		size += line.ansi.length * BYTES_PER_CHAR;
	}
	if (line.meta) {
		size += JSON.stringify(line.meta).length * BYTES_PER_CHAR;
	}
	return size + 50; // Object overhead
}

/**
 * Estimates memory size of a chunk.
 */
function estimateChunkSize(chunk: Chunk): number {
	if (chunk.compressed && chunk.compressedData) {
		return chunk.compressedData.length * BYTES_PER_CHAR + 100;
	}
	let size = 0;
	for (const line of chunk.lines) {
		size += estimateLineSize(line);
	}
	return size + 100; // Object overhead
}

/**
 * Simple compression using LZ-style encoding.
 * In production, you'd use a real compression library.
 */
function compressChunk(chunk: Chunk): string {
	const data = JSON.stringify(chunk.lines);
	// Simple run-length encoding for repeated characters
	return data.replace(/(.)\1{3,}/g, (match, char) => `${char}\x00${match.length}\x00`);
}

/**
 * Decompresses chunk data.
 */
function decompressChunk(data: string): ScrollbackLine[] {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL character is intentional for RLE encoding
	const decompressed = data.replace(/(.)\x00(\d+)\x00/g, (_, char, count) =>
		char.repeat(parseInt(count, 10)),
	);
	return JSON.parse(decompressed) as ScrollbackLine[];
}

/**
 * Updates LRU order when a chunk is accessed.
 */
function touchChunk(buffer: ScrollbackBuffer, chunkId: number): void {
	const index = buffer.lruOrder.indexOf(chunkId);
	if (index !== -1) {
		buffer.lruOrder.splice(index, 1);
	}
	buffer.lruOrder.push(chunkId);

	const chunk = buffer.chunks.get(chunkId);
	if (chunk) {
		chunk.lastAccess = Date.now();
	}
}

/**
 * Evicts least recently used chunks to free memory.
 */
function evictChunks(buffer: ScrollbackBuffer): void {
	const { maxCachedChunks, maxMemory, enableCompression } = buffer.config;

	// First, compress old chunks if enabled
	if (enableCompression) {
		const chunksToCompress = buffer.lruOrder.slice(0, -maxCachedChunks);
		for (const chunkId of chunksToCompress) {
			const chunk = buffer.chunks.get(chunkId);
			if (chunk && !chunk.compressed) {
				compressChunkInPlace(buffer, chunk);
			}
		}
	}

	// Then evict if we're over memory limit
	while (buffer.memoryBytes > maxMemory && buffer.lruOrder.length > 1) {
		const oldestId = buffer.lruOrder[0];
		if (oldestId === undefined) break;

		const chunk = buffer.chunks.get(oldestId);
		if (chunk) {
			buffer.memoryBytes -= chunk.memorySize;
			buffer.chunks.delete(oldestId);
			buffer.lruOrder.shift();
		}
	}
}

/**
 * Compresses a chunk in place.
 */
function compressChunkInPlace(buffer: ScrollbackBuffer, chunk: Chunk): void {
	if (chunk.compressed) return;

	const oldSize = chunk.memorySize;
	chunk.compressedData = compressChunk(chunk);
	chunk.compressed = true;
	chunk.lines.length = 0; // Clear uncompressed data

	chunk.memorySize = chunk.compressedData.length * BYTES_PER_CHAR + 100;
	buffer.memoryBytes += chunk.memorySize - oldSize;
}

/**
 * Decompresses a chunk in place.
 */
function decompressChunkInPlace(buffer: ScrollbackBuffer, chunk: Chunk): void {
	if (!chunk.compressed || !chunk.compressedData) return;

	const oldSize = chunk.memorySize;
	const lines = decompressChunk(chunk.compressedData);

	// Replace chunk lines
	(chunk.lines as ScrollbackLine[]).push(...lines);
	chunk.compressed = false;
	chunk.compressedData = undefined;

	chunk.memorySize = estimateChunkSize(chunk);
	buffer.memoryBytes += chunk.memorySize - oldSize;
}

/**
 * Gets or creates the current (last) chunk for appending.
 */
function getCurrentChunk(buffer: ScrollbackBuffer): Chunk {
	// Find the last chunk
	let lastChunk: Chunk | undefined;
	let maxStartLine = -1;

	for (const chunk of buffer.chunks.values()) {
		if (chunk.startLine > maxStartLine) {
			maxStartLine = chunk.startLine;
			lastChunk = chunk;
		}
	}

	// Check if last chunk has room
	if (lastChunk && lastChunk.lineCount < buffer.config.chunkSize) {
		// Decompress if needed
		if (lastChunk.compressed) {
			decompressChunkInPlace(buffer, lastChunk);
		}
		return lastChunk;
	}

	// Create new chunk
	const newChunk: Chunk = {
		id: buffer.nextChunkId++,
		lines: [],
		startLine: buffer.totalLines,
		lineCount: 0,
		compressed: false,
		memorySize: 100,
		lastAccess: Date.now(),
	};

	buffer.chunks.set(newChunk.id, newChunk);
	buffer.lruOrder.push(newChunk.id);
	buffer.memoryBytes += newChunk.memorySize;

	return newChunk;
}

/**
 * Gets the chunk containing a specific line.
 */
function getChunkForLine(buffer: ScrollbackBuffer, lineIndex: number): Chunk | undefined {
	for (const chunk of buffer.chunks.values()) {
		if (lineIndex >= chunk.startLine && lineIndex < chunk.startLine + chunk.lineCount) {
			return chunk;
		}
	}
	return undefined;
}

// =============================================================================
// LINE OPERATIONS
// =============================================================================

/**
 * Appends a line to the buffer.
 *
 * @param buffer - The buffer to append to
 * @param text - The line text
 * @param ansi - Optional ANSI formatting
 * @param meta - Optional metadata
 *
 * @example
 * ```typescript
 * appendLine(buffer, 'Hello, world!');
 * appendLine(buffer, '\x1b[31mRed text\x1b[0m', { color: 'red' });
 * ```
 */
export function appendLine(
	buffer: ScrollbackBuffer,
	text: string,
	ansi?: string,
	meta?: Record<string, unknown>,
): void {
	const line: ScrollbackLine = {
		text,
		ansi,
		timestamp: Date.now(),
		meta,
	};

	const chunk = getCurrentChunk(buffer);
	(chunk.lines as ScrollbackLine[]).push(line);
	(chunk as { lineCount: number }).lineCount++;

	const lineSize = estimateLineSize(line);
	chunk.memorySize += lineSize;
	buffer.memoryBytes += lineSize;
	buffer.totalLines++;

	touchChunk(buffer, chunk.id);

	// Check if we need to evict
	evictChunks(buffer);
}

/**
 * Appends multiple lines at once.
 *
 * @param buffer - The buffer to append to
 * @param lines - Lines to append
 */
export function appendLines(buffer: ScrollbackBuffer, lines: readonly string[]): void {
	for (const line of lines) {
		appendLine(buffer, line);
	}
}

/**
 * Gets a single line by index.
 *
 * @param buffer - The buffer to read from
 * @param lineIndex - The line index (0-based)
 * @returns The line or undefined if not found
 */
export function getLine(buffer: ScrollbackBuffer, lineIndex: number): ScrollbackLine | undefined {
	if (lineIndex < 0 || lineIndex >= buffer.totalLines) {
		return undefined;
	}

	const chunk = getChunkForLine(buffer, lineIndex);
	if (!chunk) {
		return undefined;
	}

	// Decompress if needed
	if (chunk.compressed) {
		decompressChunkInPlace(buffer, chunk);
	}

	touchChunk(buffer, chunk.id);
	evictChunks(buffer);

	const localIndex = lineIndex - chunk.startLine;
	return chunk.lines[localIndex];
}

/**
 * Gets a range of lines.
 *
 * @param buffer - The buffer to read from
 * @param startLine - Start line index (inclusive)
 * @param endLine - End line index (exclusive)
 * @returns Line range result
 */
export function getLineRange(
	buffer: ScrollbackBuffer,
	startLine: number,
	endLine: number,
): LineRange {
	const loadStart = performance.now();

	// Clamp to valid range
	const start = Math.max(0, startLine);
	const end = Math.min(buffer.totalLines, endLine);

	if (start >= end) {
		return {
			lines: [],
			startLine: start,
			endLine: start,
			complete: true,
			loadTimeMs: performance.now() - loadStart,
		};
	}

	const lines: ScrollbackLine[] = [];

	// Get chunks that overlap with the range and sort by startLine
	// Map iteration order may not match logical chunk order after evictions
	const overlappingChunks: Chunk[] = [];
	for (const chunk of buffer.chunks.values()) {
		const chunkEnd = chunk.startLine + chunk.lineCount;

		if (chunk.startLine >= end || chunkEnd <= start) {
			continue; // No overlap
		}
		overlappingChunks.push(chunk);
	}

	// Sort by startLine to ensure correct order
	overlappingChunks.sort((a, b) => a.startLine - b.startLine);

	for (const chunk of overlappingChunks) {
		// Decompress if needed
		if (chunk.compressed) {
			decompressChunkInPlace(buffer, chunk);
		}

		touchChunk(buffer, chunk.id);

		// Get the overlapping portion
		const overlapStart = Math.max(0, start - chunk.startLine);
		const overlapEnd = Math.min(chunk.lineCount, end - chunk.startLine);

		for (let i = overlapStart; i < overlapEnd; i++) {
			const line = chunk.lines[i];
			if (line) {
				lines.push(line);
			}
		}
	}

	evictChunks(buffer);

	return {
		lines,
		startLine: start,
		endLine: end,
		complete: lines.length === end - start,
		loadTimeMs: performance.now() - loadStart,
	};
}

/**
 * Gets visible lines for a viewport.
 *
 * @param buffer - The buffer to read from
 * @param viewportStart - First visible line
 * @param viewportSize - Number of visible lines
 * @returns Lines in the viewport
 */
export function getVisibleLines(
	buffer: ScrollbackBuffer,
	viewportStart: number,
	viewportSize: number,
): LineRange {
	return getLineRange(buffer, viewportStart, viewportStart + viewportSize);
}

// =============================================================================
// SCROLLING
// =============================================================================

/**
 * Jumps to a specific line (preloads surrounding context).
 *
 * @param buffer - The buffer
 * @param lineIndex - Target line
 * @param contextLines - Lines to preload before/after (default: 100)
 * @returns The visible range after jump
 */
export function jumpToLine(
	buffer: ScrollbackBuffer,
	lineIndex: number,
	contextLines: number = 100,
): LineRange {
	const start = Math.max(0, lineIndex - contextLines);
	const end = Math.min(buffer.totalLines, lineIndex + contextLines);
	return getLineRange(buffer, start, end);
}

/**
 * Scrolls by a number of lines.
 *
 * @param buffer - The buffer
 * @param currentLine - Current top line
 * @param delta - Lines to scroll (positive = down, negative = up)
 * @param viewportSize - Viewport size
 * @returns New visible range
 */
export function scrollBy(
	buffer: ScrollbackBuffer,
	currentLine: number,
	delta: number,
	viewportSize: number,
): LineRange {
	const newStart = Math.max(0, Math.min(buffer.totalLines - viewportSize, currentLine + delta));
	return getLineRange(buffer, newStart, newStart + viewportSize);
}

/**
 * Scrolls to the top.
 *
 * @param buffer - The buffer
 * @param viewportSize - Viewport size
 * @returns Visible range at top
 */
export function scrollToTop(buffer: ScrollbackBuffer, viewportSize: number): LineRange {
	return getLineRange(buffer, 0, viewportSize);
}

/**
 * Scrolls to the bottom.
 *
 * @param buffer - The buffer
 * @param viewportSize - Viewport size
 * @returns Visible range at bottom
 */
export function scrollToBottom(buffer: ScrollbackBuffer, viewportSize: number): LineRange {
	const start = Math.max(0, buffer.totalLines - viewportSize);
	return getLineRange(buffer, start, buffer.totalLines);
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Gets buffer statistics.
 *
 * @param buffer - The buffer
 * @returns Buffer statistics
 */
export function getScrollbackStats(buffer: ScrollbackBuffer): ScrollbackStats {
	let compressedCount = 0;
	let cachedCount = 0;

	for (const chunk of buffer.chunks.values()) {
		if (chunk.compressed) {
			compressedCount++;
		} else {
			cachedCount++;
		}
	}

	return {
		totalLines: buffer.totalLines,
		totalChunks: buffer.chunks.size,
		cachedChunks: cachedCount,
		compressedChunks: compressedCount,
		memoryBytes: buffer.memoryBytes,
		memoryMB: Math.round((buffer.memoryBytes / (1024 * 1024)) * 100) / 100,
	};
}

/**
 * Gets the current memory usage in bytes.
 *
 * @param buffer - The buffer
 * @returns Memory usage in bytes
 */
export function getMemoryUsage(buffer: ScrollbackBuffer): number {
	return buffer.memoryBytes;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Loads content from a text string.
 *
 * @param buffer - The buffer
 * @param text - Text to load (newline-separated)
 */
export function loadFromText(buffer: ScrollbackBuffer, text: string): void {
	const lines = text.split('\n');
	appendLines(buffer, lines);
}

/**
 * Exports buffer content as text.
 *
 * @param buffer - The buffer
 * @param startLine - Start line (default: 0)
 * @param endLine - End line (default: all)
 * @returns Exported text
 */
export function exportToText(
	buffer: ScrollbackBuffer,
	startLine: number = 0,
	endLine?: number,
): string {
	const end = endLine ?? buffer.totalLines;
	const range = getLineRange(buffer, startLine, end);
	return range.lines.map((l) => l.text).join('\n');
}

/**
 * Trims old content to stay within line limit.
 *
 * @param buffer - The buffer
 * @param maxLines - Maximum lines to keep
 */
export function trimToLineCount(buffer: ScrollbackBuffer, maxLines: number): void {
	if (buffer.totalLines <= maxLines) {
		return;
	}

	const linesToRemove = buffer.totalLines - maxLines;
	let removed = 0;

	// Remove chunks from the beginning
	const chunksToRemove: number[] = [];

	for (const [id, chunk] of buffer.chunks) {
		if (removed >= linesToRemove) break;

		chunksToRemove.push(id);
		removed += chunk.lineCount;
		buffer.memoryBytes -= chunk.memorySize;
	}

	for (const id of chunksToRemove) {
		buffer.chunks.delete(id);
		const lruIndex = buffer.lruOrder.indexOf(id);
		if (lruIndex !== -1) {
			buffer.lruOrder.splice(lruIndex, 1);
		}
	}

	buffer.totalLines -= removed;

	// Update startLine for remaining chunks
	for (const chunk of buffer.chunks.values()) {
		(chunk as { startLine: number }).startLine -= removed;
	}
}

// =============================================================================
// COMPRESSION CONTROL
// =============================================================================

/**
 * Forces compression of all chunks except the most recent N.
 *
 * @param buffer - The buffer
 * @param keepUncompressed - Number of recent chunks to keep uncompressed
 */
export function compressOldChunks(buffer: ScrollbackBuffer, keepUncompressed: number = 10): void {
	if (!buffer.config.enableCompression) {
		return;
	}

	const chunksToCompress = buffer.lruOrder.slice(0, -keepUncompressed);

	for (const chunkId of chunksToCompress) {
		const chunk = buffer.chunks.get(chunkId);
		if (chunk && !chunk.compressed) {
			compressChunkInPlace(buffer, chunk);
		}
	}
}

/**
 * Decompresses all chunks (for export or processing).
 *
 * @param buffer - The buffer
 */
export function decompressAll(buffer: ScrollbackBuffer): void {
	for (const chunk of buffer.chunks.values()) {
		if (chunk.compressed) {
			decompressChunkInPlace(buffer, chunk);
		}
	}
}
