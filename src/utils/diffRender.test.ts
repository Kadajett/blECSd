/**
 * Tests for Efficient Diff Rendering
 *
 * @module utils/diffRender.test
 */

import { describe, expect, it } from 'vitest';
import {
	clearDiffCache,
	collapseChunk,
	collapseUnchanged,
	computeDiff,
	computeDiffCached,
	createDiffCache,
	expandAll,
	expandChunk,
	getDiffStats,
	getSideBySideView,
	getTotalLineCount,
	getVisibleDiffLines,
	parseUnifiedDiff,
	toggleChunk,
	toUnifiedDiff,
} from './diffRender';

// =============================================================================
// DIFF COMPUTATION
// =============================================================================

describe('computeDiff', () => {
	it('detects additions', () => {
		const result = computeDiff('a\nb', 'a\nb\nc');

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(0);
	});

	it('detects deletions', () => {
		const result = computeDiff('a\nb\nc', 'a\nb');

		expect(result.additions).toBe(0);
		expect(result.deletions).toBe(1);
	});

	it('detects modifications', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
	});

	it('handles empty old text', () => {
		const result = computeDiff('', 'a\nb');

		expect(result.additions).toBe(2);
		expect(result.deletions).toBe(0);
	});

	it('handles empty new text', () => {
		const result = computeDiff('a\nb', '');

		expect(result.additions).toBe(0);
		expect(result.deletions).toBe(2);
	});

	it('handles identical texts', () => {
		const result = computeDiff('a\nb\nc', 'a\nb\nc');

		expect(result.additions).toBe(0);
		expect(result.deletions).toBe(0);
		expect(result.contextLines).toBe(3);
	});

	it('creates chunks', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		expect(result.chunks.length).toBeGreaterThan(0);
	});

	it('includes line numbers', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		const addLine = result.chunks.flatMap((c) => c.lines).find((l) => l.type === 'add');

		expect(addLine?.newLineNo).toBeDefined();
	});

	it('tracks computation time', () => {
		const result = computeDiff('a', 'b');

		expect(result.computeTimeMs).toBeGreaterThanOrEqual(0);
	});
});

describe('computeDiffCached', () => {
	it('caches results', () => {
		const cache = createDiffCache();
		const oldText = 'a\nb\nc';
		const newText = 'a\nB\nc';

		const result1 = computeDiffCached(cache, oldText, newText);
		const result2 = computeDiffCached(cache, oldText, newText);

		expect(result1).toBe(result2);
	});

	it('invalidates on text change', () => {
		const cache = createDiffCache();

		computeDiffCached(cache, 'a', 'b');
		const result2 = computeDiffCached(cache, 'x', 'y');

		expect(cache.result).toBe(result2);
	});
});

describe('clearDiffCache', () => {
	it('clears cache', () => {
		const cache = createDiffCache();
		computeDiffCached(cache, 'a', 'b');

		clearDiffCache(cache);

		expect(cache.result).toBeNull();
		expect(cache.oldHash).toBe(0);
	});
});

// =============================================================================
// CHUNK OPERATIONS
// =============================================================================

describe('chunk operations', () => {
	it('expands chunk', () => {
		const cache = createDiffCache();
		const result = computeDiff('a\nb\nc\nd\ne\nf\ng\nh\ni\nj', 'a\nB\nc\nd\ne\nf\ng\nh\ni\nj');

		// Collapse first, then expand
		result.chunks[0]!.collapsed = true;
		expandChunk(cache, result, result.chunks[0]?.id);

		expect(result.chunks[0]?.collapsed).toBe(false);
		expect(cache.expandedChunks.has(result.chunks[0]?.id)).toBe(true);
	});

	it('collapses chunk', () => {
		const cache = createDiffCache();
		const result = computeDiff('a\nb', 'a\nB');

		collapseChunk(cache, result, result.chunks[0]?.id);

		expect(result.chunks[0]?.collapsed).toBe(true);
	});

	it('toggles chunk', () => {
		const cache = createDiffCache();
		const result = computeDiff('a\nb', 'a\nB');

		const isCollapsed1 = toggleChunk(cache, result, result.chunks[0]?.id);
		const isCollapsed2 = toggleChunk(cache, result, result.chunks[0]?.id);

		expect(isCollapsed1).toBe(true);
		expect(isCollapsed2).toBe(false);
	});

	it('expands all', () => {
		const cache = createDiffCache();
		const result = computeDiff('a\nb', 'a\nB');
		result.chunks[0]!.collapsed = true;

		expandAll(cache, result);

		expect(result.chunks.every((c) => !c.collapsed)).toBe(true);
	});

	it('collapses unchanged', () => {
		const cache = createDiffCache();
		// Create a diff with mostly unchanged lines
		const old = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
		const newText = old.replace('line 10', 'CHANGED');

		const result = computeDiff(old, newText);
		collapseUnchanged(cache, result);

		const unchangedChunks = result.chunks.filter(
			(c) => !c.lines.some((l) => l.type === 'add' || l.type === 'remove'),
		);

		// All purely unchanged chunks should be collapsed
		for (const chunk of unchangedChunks) {
			expect(chunk.collapsed).toBe(true);
		}
	});
});

// =============================================================================
// VISIBLE LINES
// =============================================================================

describe('getVisibleDiffLines', () => {
	it('returns visible range', () => {
		const result = computeDiff('a\nb\nc\nd\ne', 'a\nB\nc\nD\ne');

		const visible = getVisibleDiffLines(result, 0, 3);

		expect(visible.lines.length).toBe(3);
		expect(visible.startIndex).toBe(0);
	});

	it('handles collapsed chunks', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');
		result.chunks[0]!.collapsed = true;

		const visible = getVisibleDiffLines(result, 0, 10);

		// Should have a collapsed placeholder
		expect(visible.lines.some((l) => l.type === 'header')).toBe(true);
	});

	it('includes chunk info', () => {
		const result = computeDiff('a\nb', 'a\nB');

		const visible = getVisibleDiffLines(result, 0, 10);

		expect(visible.chunkInfo.length).toBe(visible.lines.length);
	});
});

describe('getTotalLineCount', () => {
	it('counts all lines', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		const count = getTotalLineCount(result);

		expect(count).toBeGreaterThan(0);
	});

	it('counts collapsed as single line', () => {
		const result = computeDiff('a\nb\nc\nd\ne', 'a\nB\nc\nD\ne');

		const countExpanded = getTotalLineCount(result);

		result.chunks[0]!.collapsed = true;
		const countCollapsed = getTotalLineCount(result);

		expect(countCollapsed).toBeLessThan(countExpanded);
	});
});

// =============================================================================
// SIDE BY SIDE VIEW
// =============================================================================

describe('getSideBySideView', () => {
	it('pairs context lines', () => {
		const result = computeDiff('a\nb\nc', 'a\nb\nc');

		const pairs = getSideBySideView(result, 0, 10);

		for (const pair of pairs) {
			if (pair.left && pair.right) {
				expect(pair.left.type).toBe('context');
				expect(pair.right.type).toBe('context');
				expect(pair.left.content).toBe(pair.right.content);
			}
		}
	});

	it('pairs changes', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		const pairs = getSideBySideView(result, 0, 10);

		// Find the changed pair
		const changedPair = pairs.find((p) => p.left?.type === 'remove' || p.right?.type === 'add');

		expect(changedPair).toBeDefined();
	});

	it('handles pure additions', () => {
		const result = computeDiff('a', 'a\nb');

		const pairs = getSideBySideView(result, 0, 10);

		const addPair = pairs.find((p) => p.right?.type === 'add' && !p.left);
		expect(addPair).toBeDefined();
	});

	it('handles pure deletions', () => {
		const result = computeDiff('a\nb', 'a');

		const pairs = getSideBySideView(result, 0, 10);

		const removePair = pairs.find((p) => p.left?.type === 'remove' && !p.right);
		expect(removePair).toBeDefined();
	});
});

// =============================================================================
// UNIFIED FORMAT
// =============================================================================

describe('toUnifiedDiff', () => {
	it('generates unified format', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nc');

		const unified = toUnifiedDiff(result);

		expect(unified).toContain('---');
		expect(unified).toContain('+++');
		expect(unified).toContain('@@');
	});

	it('uses custom file names', () => {
		const result = computeDiff('a', 'b');

		const unified = toUnifiedDiff(result, 'old.txt', 'new.txt');

		expect(unified).toContain('--- old.txt');
		expect(unified).toContain('+++ new.txt');
	});

	it('includes +/- prefixes', () => {
		const result = computeDiff('old', 'new');

		const unified = toUnifiedDiff(result);

		expect(unified).toContain('-old');
		expect(unified).toContain('+new');
	});
});

describe('parseUnifiedDiff', () => {
	it('parses unified diff', () => {
		const diffText = `--- a
+++ b
@@ -1,2 +1,2 @@
 context
-removed
+added`;

		const result = parseUnifiedDiff(diffText);

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
		expect(result.contextLines).toBe(1);
	});

	it('handles multiple chunks', () => {
		const diffText = `--- a
+++ b
@@ -1,1 +1,1 @@
-a
+A
@@ -10,1 +10,1 @@
-b
+B`;

		const result = parseUnifiedDiff(diffText);

		expect(result.chunks.length).toBe(2);
	});

	it('roundtrips through toUnifiedDiff', () => {
		const original = computeDiff('a\nb\nc', 'a\nB\nc');
		const unified = toUnifiedDiff(original);
		const parsed = parseUnifiedDiff(unified);

		expect(parsed.additions).toBe(original.additions);
		expect(parsed.deletions).toBe(original.deletions);
	});
});

// =============================================================================
// STATISTICS
// =============================================================================

describe('getDiffStats', () => {
	it('returns correct stats', () => {
		const result = computeDiff('a\nb\nc', 'a\nB\nC');

		const stats = getDiffStats(result);

		expect(stats.additions).toBe(2);
		expect(stats.deletions).toBe(2);
		expect(stats.totalChanges).toBe(4);
	});

	it('counts chunks', () => {
		const result = computeDiff('a\nb', 'a\nB');

		const stats = getDiffStats(result);

		expect(stats.chunks).toBeGreaterThan(0);
	});

	it('counts collapsed chunks', () => {
		const result = computeDiff('a\nb', 'a\nB');
		result.chunks[0]!.collapsed = true;

		const stats = getDiffStats(result);

		expect(stats.collapsedChunks).toBe(1);
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles 1K line diff', () => {
		const old = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
		const newText = old.replace('line 500', 'CHANGED');

		const result = computeDiff(old, newText);

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
	});

	it('handles multiple changes', () => {
		const old = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
		let newText = old;
		for (let i = 10; i < 20; i++) {
			newText = newText.replace(`line ${i}`, `CHANGED ${i}`);
		}

		const result = computeDiff(old, newText);

		expect(result.additions).toBe(10);
		expect(result.deletions).toBe(10);
	});

	it('computes diff in reasonable time', () => {
		const old = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n');
		const newText = old.replace('line 2500', 'CHANGED');

		const start = performance.now();
		computeDiff(old, newText);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(5000); // Should be much faster
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles empty diff', () => {
		const result = computeDiff('', '');

		expect(result.additions).toBe(0);
		expect(result.deletions).toBe(0);
		expect(result.chunks.length).toBe(0);
	});

	it('handles single line', () => {
		const result = computeDiff('a', 'b');

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
	});

	it('handles very long lines', () => {
		const longLine = 'x'.repeat(10000);
		const result = computeDiff(longLine, longLine.replace('x', 'y'));

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
	});

	it('handles unicode', () => {
		const result = computeDiff('Hello 世界', 'Hello 🌍');

		expect(result.additions).toBe(1);
		expect(result.deletions).toBe(1);
	});

	it('handles trailing newlines', () => {
		const result = computeDiff('a\n', 'a\nb\n');

		expect(result.additions).toBe(1);
	});
});
