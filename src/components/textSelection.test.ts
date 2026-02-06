import { beforeEach, describe, expect, it } from 'vitest';
import { createLineStore } from '../utils/virtualizedLineStore';
import {
	clearTextSelection,
	createBackgroundCopy,
	createSelectionState,
	getLineSelectionInfo,
	getNormalizedRange,
	getSelectedLinesInViewport,
	getSelectedText,
	getSelectionDirtyRanges,
	getSelectionLineCount,
	getSelectionState,
	hasActiveSelection,
	hasSelectionState,
	isLineSelected,
	registerSelectionState,
	removeSelectionState,
	resetSelectionStore,
	selectAll,
	selectLine,
	selectLineRange,
	setSelectionMode,
	snapshotSelection,
	startSelection,
	updateSelection,
} from './textSelection';

describe('textSelection', () => {
	beforeEach(() => {
		resetSelectionStore();
	});

	describe('createSelectionState', () => {
		it('creates inactive state', () => {
			const state = createSelectionState();
			expect(state.active).toBe(false);
			expect(state.mode).toBe('stream');
		});
	});

	describe('entity store', () => {
		it('registers and retrieves selection state', () => {
			const state = registerSelectionState(1);
			expect(hasSelectionState(1)).toBe(true);
			expect(state.active).toBe(false);
		});

		it('removes selection state', () => {
			registerSelectionState(1);
			removeSelectionState(1);
			expect(hasSelectionState(1)).toBe(false);
		});

		it('resets all state', () => {
			registerSelectionState(1);
			registerSelectionState(2);
			resetSelectionStore();
			expect(hasSelectionState(1)).toBe(false);
			expect(hasSelectionState(2)).toBe(false);
		});
	});

	describe('startSelection', () => {
		it('sets anchor and focus to the same point', () => {
			const state = createSelectionState();
			startSelection(state, 10, 5);
			expect(state.active).toBe(true);
			expect(state.anchorLine).toBe(10);
			expect(state.anchorCol).toBe(5);
			expect(state.focusLine).toBe(10);
			expect(state.focusCol).toBe(5);
		});

		it('defaults to stream mode', () => {
			const state = createSelectionState();
			startSelection(state, 0, 0);
			expect(state.mode).toBe('stream');
		});

		it('accepts rectangular mode', () => {
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			expect(state.mode).toBe('rectangular');
		});
	});

	describe('updateSelection', () => {
		it('updates focus point', () => {
			const state = createSelectionState();
			startSelection(state, 10, 5);
			updateSelection(state, 20, 15);
			expect(state.focusLine).toBe(20);
			expect(state.focusCol).toBe(15);
			expect(state.anchorLine).toBe(10);
			expect(state.anchorCol).toBe(5);
		});

		it('does nothing if not active', () => {
			const state = createSelectionState();
			updateSelection(state, 20, 15);
			expect(state.focusLine).toBe(0);
		});
	});

	describe('clearTextSelection', () => {
		it('deactivates selection', () => {
			const state = createSelectionState();
			startSelection(state, 10, 5);
			clearTextSelection(state);
			expect(state.active).toBe(false);
		});
	});

	describe('hasActiveSelection', () => {
		it('returns false when inactive', () => {
			const state = createSelectionState();
			expect(hasActiveSelection(state)).toBe(false);
		});

		it('returns false when anchor equals focus', () => {
			const state = createSelectionState();
			startSelection(state, 10, 5);
			expect(hasActiveSelection(state)).toBe(false);
		});

		it('returns true when anchor differs from focus', () => {
			const state = createSelectionState();
			startSelection(state, 10, 5);
			updateSelection(state, 20, 10);
			expect(hasActiveSelection(state)).toBe(true);
		});
	});

	describe('selectLine', () => {
		it('selects an entire line', () => {
			const state = createSelectionState();
			selectLine(state, 5, 20);
			expect(state.active).toBe(true);
			expect(state.anchorLine).toBe(5);
			expect(state.anchorCol).toBe(0);
			expect(state.focusLine).toBe(5);
			expect(state.focusCol).toBe(20);
		});
	});

	describe('selectLineRange', () => {
		it('selects a range of lines', () => {
			const state = createSelectionState();
			selectLineRange(state, 5, 10, 15);
			expect(state.active).toBe(true);
			expect(state.anchorLine).toBe(5);
			expect(state.anchorCol).toBe(0);
			expect(state.focusLine).toBe(10);
			expect(state.focusCol).toBe(15);
		});
	});

	describe('selectAll', () => {
		it('selects all content', () => {
			const state = createSelectionState();
			selectAll(state, 100, 30);
			expect(state.active).toBe(true);
			expect(state.anchorLine).toBe(0);
			expect(state.anchorCol).toBe(0);
			expect(state.focusLine).toBe(99);
			expect(state.focusCol).toBe(30);
		});

		it('does nothing for empty content', () => {
			const state = createSelectionState();
			selectAll(state, 0, 0);
			expect(state.active).toBe(false);
		});
	});

	describe('setSelectionMode', () => {
		it('changes mode to rectangular', () => {
			const state = createSelectionState();
			startSelection(state, 0, 0);
			setSelectionMode(state, 'rectangular');
			expect(state.mode).toBe('rectangular');
		});
	});

	describe('getNormalizedRange', () => {
		it('returns null when inactive', () => {
			const state = createSelectionState();
			expect(getNormalizedRange(state)).toBeNull();
		});

		it('normalizes forward selection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 10, 8);
			const range = getNormalizedRange(state);
			expect(range).not.toBeNull();
			expect(range!.start).toEqual({ line: 5, col: 3 });
			expect(range!.end).toEqual({ line: 10, col: 8 });
		});

		it('normalizes backward selection', () => {
			const state = createSelectionState();
			startSelection(state, 10, 8);
			updateSelection(state, 5, 3);
			const range = getNormalizedRange(state);
			expect(range!.start).toEqual({ line: 5, col: 3 });
			expect(range!.end).toEqual({ line: 10, col: 8 });
		});

		it('normalizes same-line backward selection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 20);
			updateSelection(state, 5, 3);
			const range = getNormalizedRange(state);
			expect(range!.start).toEqual({ line: 5, col: 3 });
			expect(range!.end).toEqual({ line: 5, col: 20 });
		});
	});

	describe('getSelectionLineCount', () => {
		it('returns 0 for no selection', () => {
			const state = createSelectionState();
			expect(getSelectionLineCount(state)).toBe(0);
		});

		it('returns 1 for single-line selection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 5, 10);
			expect(getSelectionLineCount(state)).toBe(1);
		});

		it('returns correct count for multi-line', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			expect(getSelectionLineCount(state)).toBe(6);
		});
	});

	describe('isLineSelected', () => {
		it('returns false for no selection', () => {
			const state = createSelectionState();
			expect(isLineSelected(state, 5)).toBe(false);
		});

		it('returns true for line within range', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			expect(isLineSelected(state, 7)).toBe(true);
		});

		it('returns true for start and end lines', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			expect(isLineSelected(state, 5)).toBe(true);
			expect(isLineSelected(state, 10)).toBe(true);
		});

		it('returns false for line outside range', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			expect(isLineSelected(state, 3)).toBe(false);
			expect(isLineSelected(state, 12)).toBe(false);
		});
	});

	describe('getLineSelectionInfo', () => {
		it('returns not-selected for unselected line', () => {
			const state = createSelectionState();
			const info = getLineSelectionInfo(state, 5, 20);
			expect(info.startCol).toBe(-1);
			expect(info.endCol).toBe(-1);
		});

		it('returns correct info for single-line selection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 5, 10);
			const info = getLineSelectionInfo(state, 5, 20);
			expect(info.startCol).toBe(3);
			expect(info.endCol).toBe(10);
			expect(info.fullLine).toBe(false);
		});

		it('returns full line for middle line of multi-line', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 10, 8);
			const info = getLineSelectionInfo(state, 7, 20);
			expect(info.startCol).toBe(0);
			expect(info.endCol).toBe(20);
			expect(info.fullLine).toBe(true);
		});

		it('returns correct info for first line of multi-line', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 10, 8);
			const info = getLineSelectionInfo(state, 5, 20);
			expect(info.startCol).toBe(3);
			expect(info.endCol).toBe(20);
		});

		it('returns correct info for last line of multi-line', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 10, 8);
			const info = getLineSelectionInfo(state, 10, 20);
			expect(info.startCol).toBe(0);
			expect(info.endCol).toBe(8);
		});

		it('handles rectangular mode', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3, 'rectangular');
			updateSelection(state, 10, 15);
			const info = getLineSelectionInfo(state, 7, 20);
			expect(info.startCol).toBe(3);
			expect(info.endCol).toBe(15);
		});

		it('clamps columns to line length', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 5, 100);
			const info = getLineSelectionInfo(state, 5, 20);
			expect(info.endCol).toBe(20);
		});
	});

	describe('getSelectedLinesInViewport', () => {
		it('returns empty for no selection', () => {
			const state = createSelectionState();
			expect(getSelectedLinesInViewport(state, 0, 25)).toEqual([]);
		});

		it('returns lines within viewport', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 15, 10);
			const lines = getSelectedLinesInViewport(state, 10, 20);
			expect(lines).toEqual([10, 11, 12, 13, 14, 15]);
		});

		it('clips to viewport bounds', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 15, 10);
			const lines = getSelectedLinesInViewport(state, 0, 8);
			expect(lines).toEqual([5, 6, 7]);
		});

		it('returns empty when selection is outside viewport', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			expect(getSelectedLinesInViewport(state, 20, 30)).toEqual([]);
		});
	});

	describe('getSelectedText', () => {
		const store = createLineStore('Hello World\nFoo Bar\nBaz Qux\nLine Four');

		it('returns empty for no selection', () => {
			const state = createSelectionState();
			expect(getSelectedText(state, store)).toBe('');
		});

		it('returns single-line selection', () => {
			const state = createSelectionState();
			startSelection(state, 0, 6);
			updateSelection(state, 0, 11);
			expect(getSelectedText(state, store)).toBe('World');
		});

		it('returns multi-line stream selection', () => {
			const state = createSelectionState();
			startSelection(state, 0, 6);
			updateSelection(state, 1, 3);
			expect(getSelectedText(state, store)).toBe('World\nFoo');
		});

		it('returns full multi-line selection', () => {
			const state = createSelectionState();
			startSelection(state, 1, 0);
			updateSelection(state, 2, 7);
			expect(getSelectedText(state, store)).toBe('Foo Bar\nBaz Qux');
		});

		it('handles backward selection', () => {
			const state = createSelectionState();
			startSelection(state, 1, 3);
			updateSelection(state, 0, 6);
			expect(getSelectedText(state, store)).toBe('World\nFoo');
		});

		it('returns rectangular selection', () => {
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			updateSelection(state, 2, 3);
			expect(getSelectedText(state, store)).toBe('Hel\nFoo\nBaz');
		});

		it('handles rectangular selection with short lines', () => {
			const shortStore = createLineStore('ABCDE\nXY\nLMNOP');
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			updateSelection(state, 2, 4);
			expect(getSelectedText(state, shortStore)).toBe('ABCD\nXY\nLMNO');
		});
	});

	describe('createBackgroundCopy', () => {
		it('handles empty selection', () => {
			const state = createSelectionState();
			const store = createLineStore('Hello');
			const results = [...createBackgroundCopy(state, store)];
			expect(results.length).toBe(1);
			expect(results[0]!.done).toBe(true);
			expect(results[0]!.text).toBe('');
		});

		it('copies single-line selection', () => {
			const store = createLineStore('Hello World');
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 0, 5);
			const results = [...createBackgroundCopy(state, store)];
			expect(results[results.length - 1]!.done).toBe(true);
			expect(results[results.length - 1]!.text).toBe('Hello');
		});

		it('yields progress for large selections', () => {
			// Create a store with enough lines to require chunking
			const lines: string[] = [];
			for (let i = 0; i < 100; i++) {
				lines.push(`Line ${i}`);
			}
			const store = createLineStore(lines.join('\n'));
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 99, 7);

			const results = [...createBackgroundCopy(state, store, 20)];
			// Should have progress updates + final
			expect(results.length).toBeGreaterThan(1);
			const last = results[results.length - 1]!;
			expect(last.done).toBe(true);
			expect(last.totalLines).toBe(100);
			expect(last.text.length).toBeGreaterThan(0);
		});

		it('handles rectangular selection in background copy', () => {
			const store = createLineStore('ABC\nDEF\nGHI');
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			updateSelection(state, 2, 2);
			const results = [...createBackgroundCopy(state, store)];
			expect(results[results.length - 1]!.text).toBe('AB\nDE\nGH');
		});
	});

	describe('getSelectionDirtyRanges', () => {
		it('returns empty for no change', () => {
			expect(getSelectionDirtyRanges(null, createSelectionState())).toEqual([]);
		});

		it('returns new range when selection appears', () => {
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 10);
			const ranges = getSelectionDirtyRanges(null, state);
			expect(ranges).toEqual([[5, 10]]);
		});

		it('returns old range when selection disappears', () => {
			const old = createSelectionState();
			startSelection(old, 5, 0);
			updateSelection(old, 10, 10);
			const current = createSelectionState();
			const ranges = getSelectionDirtyRanges(old, current);
			expect(ranges).toEqual([[5, 10]]);
		});

		it('returns dirty ranges for extending selection', () => {
			const old = createSelectionState();
			startSelection(old, 5, 0);
			updateSelection(old, 10, 10);

			const current = createSelectionState();
			startSelection(current, 5, 0);
			updateSelection(current, 15, 10);

			const ranges = getSelectionDirtyRanges(old, current);
			// The new part (11-15) should be dirty
			expect(ranges.some(([s, e]) => s === 11 && e === 15)).toBe(true);
		});

		it('returns full range on mode change', () => {
			const old = createSelectionState();
			startSelection(old, 5, 3);
			updateSelection(old, 10, 8);

			const current = createSelectionState();
			startSelection(current, 5, 3, 'rectangular');
			updateSelection(current, 10, 8);

			const ranges = getSelectionDirtyRanges(old, current);
			expect(ranges).toEqual([[5, 10]]);
		});
	});

	describe('snapshotSelection', () => {
		it('creates an independent copy', () => {
			const state = createSelectionState();
			startSelection(state, 5, 3);
			updateSelection(state, 10, 8);

			const snap = snapshotSelection(state);
			updateSelection(state, 20, 0);

			expect(snap.focusLine).toBe(10);
			expect(state.focusLine).toBe(20);
		});
	});

	describe('performance: large selections', () => {
		it('handles 100K line selection without error', () => {
			const lines: string[] = [];
			for (let i = 0; i < 100_000; i++) {
				lines.push(`Line ${i}: some content here`);
			}
			createLineStore(lines.join('\n'));
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 99_999, 10);

			// Verify selection range is correct
			expect(getSelectionLineCount(state)).toBe(100_000);

			// Verify viewport query is fast
			const viewportLines = getSelectedLinesInViewport(state, 50_000, 50_025);
			expect(viewportLines.length).toBe(25);
		});

		it('background copy processes 100K lines', () => {
			const lines: string[] = [];
			for (let i = 0; i < 100_000; i++) {
				lines.push(`L${i}`);
			}
			const store = createLineStore(lines.join('\n'));
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 99_999, 6);

			let lastProgress = { done: false, linesProcessed: 0, totalLines: 0, text: '' };
			for (const p of createBackgroundCopy(state, store)) {
				lastProgress = p;
			}

			expect(lastProgress.done).toBe(true);
			expect(lastProgress.linesProcessed).toBe(100_000);
			expect(lastProgress.text.length).toBeGreaterThan(0);
		});
	});

	describe('input validation', () => {
		it('clamps negative line/col to zero in startSelection', () => {
			const state = createSelectionState();
			startSelection(state, -5, -10);
			expect(state.anchorLine).toBe(0);
			expect(state.anchorCol).toBe(0);
		});

		it('clamps NaN line/col to zero in startSelection', () => {
			const state = createSelectionState();
			startSelection(state, Number.NaN, Number.NaN);
			expect(state.anchorLine).toBe(0);
			expect(state.anchorCol).toBe(0);
		});

		it('clamps negative values in updateSelection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 5);
			updateSelection(state, -3, -7);
			expect(state.focusLine).toBe(0);
			expect(state.focusCol).toBe(0);
		});

		it('truncates fractional values to integers', () => {
			const state = createSelectionState();
			startSelection(state, 3.7, 8.2);
			expect(state.anchorLine).toBe(3);
			expect(state.anchorCol).toBe(8);
		});

		it('clamps Infinity to zero in startSelection', () => {
			const state = createSelectionState();
			startSelection(state, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
			expect(state.anchorLine).toBe(0);
			expect(state.anchorCol).toBe(0);
		});

		it('clamps Infinity in updateSelection', () => {
			const state = createSelectionState();
			startSelection(state, 5, 5);
			updateSelection(state, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
			expect(state.focusLine).toBe(0);
			expect(state.focusCol).toBe(0);
		});

		it('clamps Infinity in selectLine', () => {
			const state = createSelectionState();
			selectLine(state, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
			expect(state.anchorLine).toBe(0);
			expect(state.focusCol).toBe(0);
		});

		it('clamps Infinity in selectLineRange', () => {
			const state = createSelectionState();
			selectLineRange(
				state,
				Number.POSITIVE_INFINITY,
				Number.POSITIVE_INFINITY,
				Number.POSITIVE_INFINITY,
			);
			expect(state.anchorLine).toBe(0);
			expect(state.focusLine).toBe(0);
			expect(state.focusCol).toBe(0);
		});

		it('clamps Infinity in selectAll', () => {
			const state = createSelectionState();
			selectAll(state, Number.POSITIVE_INFINITY, 10);
			// Infinity is not finite, so safeTotal becomes 0, and selectAll returns early
			expect(state.active).toBe(false);
		});
	});

	describe('clearTextSelection resets mode', () => {
		it('resets mode to stream after clearing rectangular selection', () => {
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			updateSelection(state, 5, 10);
			expect(state.mode).toBe('rectangular');
			clearTextSelection(state);
			expect(state.mode).toBe('stream');
		});
	});

	describe('getSelectionState', () => {
		it('retrieves registered entity state', () => {
			const state = registerSelectionState(99);
			const retrieved = getSelectionState(99);
			expect(retrieved).toBe(state);
		});

		it('returns undefined for unregistered entity', () => {
			expect(getSelectionState(999)).toBeUndefined();
		});
	});

	describe('store bounds clamping', () => {
		it('getSelectedText returns empty when selection exceeds store bounds', () => {
			const store = createLineStore('Line0\nLine1\nLine2');
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 100, 5);
			const text = getSelectedText(state, store);
			// Should clamp to store bounds (3 lines: 0-2)
			expect(text).toContain('Line0');
			expect(text).toContain('Line2');
		});

		it('getSelectedText returns empty for empty store', () => {
			const store = createLineStore('');
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 5);
			// Store has 1 line (empty string), so it should clamp and return something
			const text = getSelectedText(state, store);
			expect(text).toBe('');
		});

		it('createBackgroundCopy clamps to store bounds', () => {
			const store = createLineStore('A\nB\nC');
			const state = createSelectionState();
			startSelection(state, 0, 0);
			updateSelection(state, 100, 5);
			const results = [...createBackgroundCopy(state, store)];
			const last = results[results.length - 1]!;
			expect(last.done).toBe(true);
			// Should only process 3 lines, not 101
			expect(last.totalLines).toBe(3);
		});

		it('createBackgroundCopy handles empty store', () => {
			const store = createLineStore('');
			const state = createSelectionState();
			startSelection(state, 5, 0);
			updateSelection(state, 10, 5);
			const results = [...createBackgroundCopy(state, store)];
			const last = results[results.length - 1]!;
			expect(last.done).toBe(true);
			// Empty store has lineCount 0, so clamped range is empty
			expect(last.totalLines).toBe(0);
			expect(last.text).toBe('');
		});
	});

	describe('chunked rectangular background copy', () => {
		it('yields progress for large rectangular selections', () => {
			const lines: string[] = [];
			for (let i = 0; i < 100; i++) {
				lines.push(`Line_${String(i).padStart(3, '0')}_content`);
			}
			const store = createLineStore(lines.join('\n'));
			const state = createSelectionState();
			startSelection(state, 0, 0, 'rectangular');
			updateSelection(state, 99, 4);

			const results = [...createBackgroundCopy(state, store, 20)];
			// Should have progress updates + final
			expect(results.length).toBeGreaterThan(1);
			const last = results[results.length - 1]!;
			expect(last.done).toBe(true);
			expect(last.totalLines).toBe(100);
			// Each line should contribute columns 0-4 ("Line")
			expect(last.text.split('\n').length).toBe(100);
			expect(last.text.split('\n')[0]).toBe('Line');
		});
	});

	describe('rectangular dirty ranges', () => {
		it('marks all overlap lines dirty when columns change in rectangular mode', () => {
			const old = createSelectionState();
			startSelection(old, 5, 3, 'rectangular');
			updateSelection(old, 10, 8);

			const current = createSelectionState();
			startSelection(current, 5, 5, 'rectangular');
			updateSelection(current, 10, 8);

			const ranges = getSelectionDirtyRanges(old, current);
			// All lines 5-10 should be dirty because start col changed
			expect(ranges.some(([s, e]) => s <= 5 && e >= 10)).toBe(true);
		});

		it('does not mark overlap dirty when columns are the same in rectangular mode', () => {
			const old = createSelectionState();
			startSelection(old, 5, 3, 'rectangular');
			updateSelection(old, 10, 8);

			const current = createSelectionState();
			startSelection(current, 5, 3, 'rectangular');
			updateSelection(current, 12, 8);

			const ranges = getSelectionDirtyRanges(old, current);
			// Lines 11-12 should be dirty (new extension), but overlap 5-10 should NOT be dirty
			// since columns are the same
			const hasOverlapDirty = ranges.some(([s, e]) => s <= 5 && e >= 10);
			expect(hasOverlapDirty).toBe(false);
			// But the new lines should be dirty
			expect(ranges.some(([s, e]) => s === 11 && e === 12)).toBe(true);
		});
	});

	describe('dirty range deduplication', () => {
		it('merges duplicate ranges when start and end line are the same', () => {
			const oldState = createSelectionState();
			startSelection(oldState, 5, 0);
			updateSelection(oldState, 5, 10);
			const oldSnap = snapshotSelection(oldState);

			const newState = createSelectionState();
			startSelection(newState, 5, 3);
			updateSelection(newState, 5, 15);

			const ranges = getSelectionDirtyRanges(oldSnap, newState);
			// Should be merged to a single range, not duplicated
			const lineSet = new Set(ranges.map(([s]) => s));
			expect(lineSet.size).toBe(ranges.length);
		});
	});
});
