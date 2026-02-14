/**
 * Tests for Virtualized Scrollback Buffer
 *
 * @module utils/virtualScrollback.test
 */

import { describe, expect, it } from 'vitest';
import {
	appendLine,
	appendLines,
	clearScrollback,
	compressOldChunks,
	createScrollbackBuffer,
	decompressAll,
	exportToText,
	getLine,
	getLineRange,
	getMemoryUsage,
	getScrollbackStats,
	getVisibleLines,
	jumpToLine,
	loadFromText,
	scrollbackScrollBy,
	scrollbackScrollToBottom,
	scrollbackScrollToTop,
	trimToLineCount,
} from './virtualScrollback';

// =============================================================================
// BUFFER CREATION
// =============================================================================

describe('createScrollbackBuffer', () => {
	it('creates buffer with default config', () => {
		const buffer = createScrollbackBuffer();

		expect(buffer.config.chunkSize).toBe(1000);
		expect(buffer.config.maxCachedChunks).toBe(100);
		expect(buffer.config.enableCompression).toBe(true);
		expect(buffer.totalLines).toBe(0);
	});

	it('creates buffer with custom config', () => {
		const buffer = createScrollbackBuffer({
			chunkSize: 500,
			maxCachedChunks: 50,
			enableCompression: false,
		});

		expect(buffer.config.chunkSize).toBe(500);
		expect(buffer.config.maxCachedChunks).toBe(50);
		expect(buffer.config.enableCompression).toBe(false);
	});
});

describe('clearScrollback', () => {
	it('clears all content', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['line 1', 'line 2', 'line 3']);

		clearScrollback(buffer);

		expect(buffer.totalLines).toBe(0);
		expect(buffer.chunks.size).toBe(0);
		expect(buffer.memoryBytes).toBe(0);
	});
});

// =============================================================================
// LINE OPERATIONS
// =============================================================================

describe('appendLine', () => {
	it('appends a single line', () => {
		const buffer = createScrollbackBuffer();

		appendLine(buffer, 'Hello, world!');

		expect(buffer.totalLines).toBe(1);
		expect(getLine(buffer, 0)?.text).toBe('Hello, world!');
	});

	it('appends line with ANSI', () => {
		const buffer = createScrollbackBuffer();

		appendLine(buffer, 'colored', '\x1b[31mcolored\x1b[0m');

		expect(getLine(buffer, 0)?.ansi).toBe('\x1b[31mcolored\x1b[0m');
	});

	it('appends line with metadata', () => {
		const buffer = createScrollbackBuffer();

		appendLine(buffer, 'data', undefined, { type: 'info' });

		expect(getLine(buffer, 0)?.meta?.type).toBe('info');
	});

	it('adds timestamp', () => {
		const buffer = createScrollbackBuffer();
		const before = Date.now();

		appendLine(buffer, 'timestamped');

		const after = Date.now();
		const ts = getLine(buffer, 0)?.timestamp;

		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(after);
	});
});

describe('appendLines', () => {
	it('appends multiple lines', () => {
		const buffer = createScrollbackBuffer();

		appendLines(buffer, ['line 1', 'line 2', 'line 3']);

		expect(buffer.totalLines).toBe(3);
		expect(getLine(buffer, 0)?.text).toBe('line 1');
		expect(getLine(buffer, 2)?.text).toBe('line 3');
	});
});

describe('getLine', () => {
	it('gets line by index', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		expect(getLine(buffer, 0)?.text).toBe('a');
		expect(getLine(buffer, 1)?.text).toBe('b');
		expect(getLine(buffer, 2)?.text).toBe('c');
	});

	it('returns undefined for out of bounds', () => {
		const buffer = createScrollbackBuffer();
		appendLine(buffer, 'only one');

		expect(getLine(buffer, -1)).toBeUndefined();
		expect(getLine(buffer, 1)).toBeUndefined();
		expect(getLine(buffer, 100)).toBeUndefined();
	});
});

describe('getLineRange', () => {
	it('gets a range of lines', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c', 'd', 'e']);

		const range = getLineRange(buffer, 1, 4);

		expect(range.lines.length).toBe(3);
		expect(range.lines[0]?.text).toBe('b');
		expect(range.lines[2]?.text).toBe('d');
		expect(range.startLine).toBe(1);
		expect(range.endLine).toBe(4);
		expect(range.complete).toBe(true);
	});

	it('clamps to valid range', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		const range = getLineRange(buffer, -10, 100);

		expect(range.startLine).toBe(0);
		expect(range.endLine).toBe(3);
		expect(range.lines.length).toBe(3);
	});

	it('handles empty range', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		const range = getLineRange(buffer, 5, 5);

		expect(range.lines.length).toBe(0);
		expect(range.complete).toBe(true);
	});

	it('tracks load time', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		const range = getLineRange(buffer, 0, 3);

		expect(range.loadTimeMs).toBeGreaterThanOrEqual(0);
	});
});

describe('getVisibleLines', () => {
	it('gets visible viewport', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const visible = getVisibleLines(buffer, 10, 20);

		expect(visible.lines.length).toBe(20);
		expect(visible.lines[0]?.text).toBe('line 10');
	});
});

// =============================================================================
// SCROLLING
// =============================================================================

describe('jumpToLine', () => {
	it('jumps to specific line', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 1000 }, (_, i) => `line ${i}`),
		);

		const range = jumpToLine(buffer, 500, 10);

		expect(range.startLine).toBe(490);
		expect(range.endLine).toBe(510);
	});

	it('clamps at boundaries', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const rangeStart = jumpToLine(buffer, 0, 10);
		const rangeEnd = jumpToLine(buffer, 99, 10);

		expect(rangeStart.startLine).toBe(0);
		expect(rangeEnd.endLine).toBe(100);
	});
});

describe('scrollBy', () => {
	it('scrolls down', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollBy(buffer, 0, 10, 20);

		expect(range.startLine).toBe(10);
		expect(range.lines.length).toBe(20);
	});

	it('scrolls up', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollBy(buffer, 50, -10, 20);

		expect(range.startLine).toBe(40);
	});

	it('clamps at top', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollBy(buffer, 5, -100, 20);

		expect(range.startLine).toBe(0);
	});

	it('clamps at bottom', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollBy(buffer, 50, 100, 20);

		expect(range.startLine).toBe(80); // 100 - 20
	});
});

describe('scrollToTop', () => {
	it('scrolls to top', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollToTop(buffer, 20);

		expect(range.startLine).toBe(0);
		expect(range.lines[0]?.text).toBe('line 0');
	});
});

describe('scrollToBottom', () => {
	it('scrolls to bottom', () => {
		const buffer = createScrollbackBuffer();
		appendLines(
			buffer,
			Array.from({ length: 100 }, (_, i) => `line ${i}`),
		);

		const range = scrollbackScrollToBottom(buffer, 20);

		expect(range.startLine).toBe(80);
		expect(range.lines[0]?.text).toBe('line 80');
	});
});

// =============================================================================
// CHUNKING
// =============================================================================

describe('chunking', () => {
	it('creates chunks when exceeding chunk size', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 250 }, (_, i) => `line ${i}`),
		);

		const stats = getScrollbackStats(buffer);

		expect(stats.totalChunks).toBe(3);
		expect(stats.totalLines).toBe(250);
	});

	it('retrieves lines across chunks', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 250 }, (_, i) => `line ${i}`),
		);

		expect(getLine(buffer, 0)?.text).toBe('line 0');
		expect(getLine(buffer, 99)?.text).toBe('line 99');
		expect(getLine(buffer, 100)?.text).toBe('line 100');
		expect(getLine(buffer, 249)?.text).toBe('line 249');
	});

	it('gets range spanning multiple chunks', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 250 }, (_, i) => `line ${i}`),
		);

		const range = getLineRange(buffer, 50, 150);

		expect(range.lines.length).toBe(100);
		expect(range.lines[0]?.text).toBe('line 50');
		expect(range.lines[99]?.text).toBe('line 149');
	});
});

// =============================================================================
// COMPRESSION
// =============================================================================

describe('compression', () => {
	it('compresses old chunks', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 500 }, (_, i) => `line ${i}`),
		);

		compressOldChunks(buffer, 1);

		const stats = getScrollbackStats(buffer);
		expect(stats.compressedChunks).toBeGreaterThan(0);
	});

	it('decompresses on access', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 300 }, (_, i) => `line ${i}`),
		);
		compressOldChunks(buffer, 1);

		// Access old line should decompress
		const line = getLine(buffer, 50);

		expect(line?.text).toBe('line 50');
	});

	it('decompresses all', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 300 }, (_, i) => `line ${i}`),
		);
		compressOldChunks(buffer, 1);

		decompressAll(buffer);

		const stats = getScrollbackStats(buffer);
		expect(stats.compressedChunks).toBe(0);
	});
});

// =============================================================================
// MEMORY MANAGEMENT
// =============================================================================

describe('memory management', () => {
	it('tracks memory usage', () => {
		const buffer = createScrollbackBuffer();
		const initialMemory = getMemoryUsage(buffer);

		appendLines(
			buffer,
			Array.from({ length: 100 }, () => 'x'.repeat(100)),
		);

		const finalMemory = getMemoryUsage(buffer);
		expect(finalMemory).toBeGreaterThan(initialMemory);
	});

	it('evicts chunks when over memory limit', () => {
		const buffer = createScrollbackBuffer({
			chunkSize: 100,
			maxMemory: 10000, // Very small limit
		});

		// Add many lines
		appendLines(
			buffer,
			Array.from({ length: 1000 }, (_, i) => `line ${i}`),
		);

		// Should have evicted some chunks
		expect(buffer.chunks.size).toBeLessThan(10);
	});
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================

describe('loadFromText', () => {
	it('loads text content', () => {
		const buffer = createScrollbackBuffer();

		loadFromText(buffer, 'line 1\nline 2\nline 3');

		expect(buffer.totalLines).toBe(3);
		expect(getLine(buffer, 1)?.text).toBe('line 2');
	});
});

describe('exportToText', () => {
	it('exports all content', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		const text = exportToText(buffer);

		expect(text).toBe('a\nb\nc');
	});

	it('exports range', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c', 'd', 'e']);

		const text = exportToText(buffer, 1, 4);

		expect(text).toBe('b\nc\nd');
	});
});

describe('trimToLineCount', () => {
	it('trims old lines', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 500 }, (_, i) => `line ${i}`),
		);

		trimToLineCount(buffer, 200);

		expect(buffer.totalLines).toBe(200);
		// First remaining line should be renumbered
		expect(getLine(buffer, 0)?.text).toBeDefined();
	});

	it('does nothing if under limit', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['a', 'b', 'c']);

		trimToLineCount(buffer, 100);

		expect(buffer.totalLines).toBe(3);
	});
});

// =============================================================================
// STATISTICS
// =============================================================================

describe('getScrollbackStats', () => {
	it('returns correct stats', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 100 });
		appendLines(
			buffer,
			Array.from({ length: 250 }, (_, i) => `line ${i}`),
		);

		const stats = getScrollbackStats(buffer);

		expect(stats.totalLines).toBe(250);
		expect(stats.totalChunks).toBe(3);
		expect(stats.memoryBytes).toBeGreaterThan(0);
		expect(stats.memoryMB).toBeGreaterThanOrEqual(0);
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles 10K lines', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 1000 });
		const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i}: This is test content.`);

		appendLines(buffer, lines);

		expect(buffer.totalLines).toBe(10000);
		expect(getLine(buffer, 5000)?.text).toBe('Line 5000: This is test content.');
	});

	it('random access is fast', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 1000 });
		appendLines(
			buffer,
			Array.from({ length: 10000 }, (_, i) => `line ${i}`),
		);

		const start = performance.now();

		// Random access pattern
		for (let i = 0; i < 100; i++) {
			const randomLine = Math.floor(Math.random() * 10000);
			getLine(buffer, randomLine);
		}

		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(100); // Should be fast
	});

	it('range retrieval is fast', () => {
		const buffer = createScrollbackBuffer({ chunkSize: 1000 });
		appendLines(
			buffer,
			Array.from({ length: 10000 }, (_, i) => `line ${i}`),
		);

		const start = performance.now();
		const range = getLineRange(buffer, 5000, 5100);
		const elapsed = performance.now() - start;

		expect(range.lines.length).toBe(100);
		expect(elapsed).toBeLessThan(50);
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles empty buffer', () => {
		const buffer = createScrollbackBuffer();

		expect(getLine(buffer, 0)).toBeUndefined();
		expect(getLineRange(buffer, 0, 10).lines.length).toBe(0);
		expect(scrollbackScrollToBottom(buffer, 10).lines.length).toBe(0);
	});

	it('handles single line', () => {
		const buffer = createScrollbackBuffer();
		appendLine(buffer, 'only');

		expect(buffer.totalLines).toBe(1);
		expect(getLine(buffer, 0)?.text).toBe('only');
		expect(scrollbackScrollToBottom(buffer, 10).lines.length).toBe(1);
	});

	it('handles empty lines', () => {
		const buffer = createScrollbackBuffer();
		appendLines(buffer, ['', '', '']);

		expect(buffer.totalLines).toBe(3);
		expect(getLine(buffer, 0)?.text).toBe('');
	});

	it('handles very long lines', () => {
		const buffer = createScrollbackBuffer();
		const longLine = 'x'.repeat(10000);

		appendLine(buffer, longLine);

		expect(getLine(buffer, 0)?.text.length).toBe(10000);
	});
});
