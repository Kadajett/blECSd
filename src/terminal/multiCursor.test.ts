/**
 * Tests for multi-cursor overlay system.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CursorCell, CursorLabel, OverlayEvent, OverlaySelection } from './multiCursor';
import {
	addSessionOverlay,
	buildFocusMap,
	clearCursorOverlay,
	clearSelectionOverlay,
	createOverlayManager,
	cursorCellToAnsi,
	cursorLabelToAnsi,
	getActiveCursors,
	getSessionOverlay,
	getSessionOverlayCount,
	getSessionsFocusingEntity,
	onOverlayEvent,
	pruneInactiveCursors,
	removeSessionOverlay,
	renderCursorLabels,
	renderCursorOverlays,
	renderOverlaysToAnsi,
	resetOverlayState,
	setCursorOverlay,
	setFocusOverlay,
	setLabelVisibility,
	setSelectionOverlay,
} from './multiCursor';

// =============================================================================
// HELPERS
// =============================================================================

function collectEvents(): { events: OverlayEvent[]; unsub: () => void } {
	const events: OverlayEvent[] = [];
	const unsub = onOverlayEvent((event) => {
		events.push(event);
	});
	return { events, unsub };
}

// =============================================================================
// TESTS
// =============================================================================

describe('multiCursor', () => {
	afterEach(() => {
		resetOverlayState();
		vi.useRealTimers();
	});

	describe('createOverlayManager', () => {
		it('creates manager with default config', () => {
			const manager = createOverlayManager();
			expect(manager.sessions.size).toBe(0);
			expect(manager.config.showLabels).toBe(true);
			expect(manager.config.cursorHideTimeout).toBe(0);
		});

		it('accepts custom config', () => {
			const manager = createOverlayManager({
				showLabels: false,
				cursorHideTimeout: 5000,
				maxLabelLength: 8,
			});
			expect(manager.config.showLabels).toBe(false);
			expect(manager.config.cursorHideTimeout).toBe(5000);
			expect(manager.config.maxLabelLength).toBe(8);
		});

		it('validates config', () => {
			expect(() => createOverlayManager({ cursorHideTimeout: -1 })).toThrow();
		});
	});

	describe('addSessionOverlay', () => {
		it('adds a session overlay', () => {
			createOverlayManager();
			const overlay = addSessionOverlay('s1', 'Alice', 1);

			expect(overlay.sessionId).toBe('s1');
			expect(overlay.name).toBe('Alice');
			expect(overlay.color).toBe(1);
			expect(overlay.cursor).toBeNull();
			expect(overlay.focusedEntity).toBeNull();
			expect(overlay.selection).toBeNull();
		});

		it('emits session_added event', () => {
			createOverlayManager();
			const { events } = collectEvents();

			addSessionOverlay('s1', 'Alice', 1);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('session_added');
		});

		it('tracks session count', () => {
			createOverlayManager();
			expect(getSessionOverlayCount()).toBe(0);

			addSessionOverlay('s1', 'Alice', 1);
			expect(getSessionOverlayCount()).toBe(1);

			addSessionOverlay('s2', 'Bob', 2);
			expect(getSessionOverlayCount()).toBe(2);
		});
	});

	describe('removeSessionOverlay', () => {
		it('removes a session', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			removeSessionOverlay('s1');
			expect(getSessionOverlayCount()).toBe(0);
		});

		it('emits session_removed event', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			const { events } = collectEvents();

			removeSessionOverlay('s1');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('session_removed');
		});

		it('handles non-existent session', () => {
			createOverlayManager();
			removeSessionOverlay('nonexistent'); // should not throw
		});
	});

	describe('setCursorOverlay', () => {
		it('sets cursor position', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			setCursorOverlay('s1', 10, 5);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.cursor).toEqual({ x: 10, y: 5 });
		});

		it('emits cursor_set event', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			const { events } = collectEvents();

			setCursorOverlay('s1', 10, 5);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('cursor_set');
		});

		it('updates lastUpdate timestamp', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			const before = Date.now();

			setCursorOverlay('s1', 1, 1);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.lastUpdate).toBeGreaterThanOrEqual(before);
		});

		it('ignores non-existent session', () => {
			createOverlayManager();
			setCursorOverlay('nonexistent', 1, 1); // should not throw
		});
	});

	describe('clearCursorOverlay', () => {
		it('clears cursor', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			clearCursorOverlay('s1');

			const overlay = getSessionOverlay('s1');
			expect(overlay!.cursor).toBeNull();
		});

		it('emits cursor_cleared event', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);
			const { events } = collectEvents();

			clearCursorOverlay('s1');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('cursor_cleared');
		});
	});

	describe('setFocusOverlay', () => {
		it('sets focused entity', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			setFocusOverlay('s1', 42);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.focusedEntity).toBe(42);
		});

		it('clears focus with null', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setFocusOverlay('s1', 42);

			setFocusOverlay('s1', null);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.focusedEntity).toBeNull();
		});

		it('emits focus_set event', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			const { events } = collectEvents();

			setFocusOverlay('s1', 42);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('focus_set');
		});

		it('emits focus_cleared when set to null', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setFocusOverlay('s1', 42);
			const { events } = collectEvents();

			setFocusOverlay('s1', null);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('focus_cleared');
		});
	});

	describe('setSelectionOverlay', () => {
		it('sets selection range', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			const selection: OverlaySelection = {
				startLine: 0,
				startCol: 5,
				endLine: 2,
				endCol: 10,
				mode: 'stream',
			};
			setSelectionOverlay('s1', selection);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.selection).toEqual(selection);
		});

		it('clears selection', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setSelectionOverlay('s1', {
				startLine: 0,
				startCol: 0,
				endLine: 1,
				endCol: 5,
				mode: 'stream',
			});

			clearSelectionOverlay('s1');

			const overlay = getSessionOverlay('s1');
			expect(overlay!.selection).toBeNull();
		});

		it('emits selection events', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			const { events } = collectEvents();

			setSelectionOverlay('s1', {
				startLine: 0,
				startCol: 0,
				endLine: 1,
				endCol: 5,
				mode: 'stream',
			});

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('selection_set');
		});
	});

	describe('getActiveCursors', () => {
		it('returns only sessions with cursors', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			addSessionOverlay('s2', 'Bob', 2);
			setCursorOverlay('s1', 10, 5);

			const active = getActiveCursors();
			expect(active).toHaveLength(1);
			expect(active[0]!.name).toBe('Alice');
		});

		it('returns empty when no cursors set', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			const active = getActiveCursors();
			expect(active).toHaveLength(0);
		});
	});

	describe('getSessionsFocusingEntity', () => {
		it('returns sessions focusing a specific entity', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			addSessionOverlay('s2', 'Bob', 2);
			setFocusOverlay('s1', 42);
			setFocusOverlay('s2', 42);

			const focused = getSessionsFocusingEntity(42);
			expect(focused).toHaveLength(2);
			expect(focused).toContain('s1');
			expect(focused).toContain('s2');
		});

		it('returns empty for unfocused entity', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			const focused = getSessionsFocusingEntity(99);
			expect(focused).toHaveLength(0);
		});
	});

	describe('pruneInactiveCursors', () => {
		it('removes stale cursors', () => {
			createOverlayManager({ cursorHideTimeout: 1000 });
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);

			const pruned = pruneInactiveCursors();
			expect(pruned).toBe(1);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.cursor).toBeNull();
		});

		it('does nothing when timeout is 0', () => {
			createOverlayManager({ cursorHideTimeout: 0 });
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			vi.useFakeTimers();
			vi.advanceTimersByTime(999999);

			const pruned = pruneInactiveCursors();
			expect(pruned).toBe(0);
		});

		it('keeps recently active cursors', () => {
			createOverlayManager({ cursorHideTimeout: 5000 });
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			vi.useFakeTimers();
			vi.advanceTimersByTime(1000);

			const pruned = pruneInactiveCursors();
			expect(pruned).toBe(0);

			const overlay = getSessionOverlay('s1');
			expect(overlay!.cursor).not.toBeNull();
		});
	});

	describe('renderCursorOverlays', () => {
		it('renders cursor cells', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			const cells = renderCursorOverlays(80, 24);
			expect(cells).toHaveLength(1);
			expect(cells[0]!.x).toBe(10);
			expect(cells[0]!.y).toBe(5);
			expect(cells[0]!.isCursor).toBe(true);
			expect(cells[0]!.color).toBe(1);
		});

		it('excludes specified session', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			addSessionOverlay('s2', 'Bob', 2);
			setCursorOverlay('s1', 10, 5);
			setCursorOverlay('s2', 20, 10);

			const cells = renderCursorOverlays(80, 24, 's1');
			expect(cells).toHaveLength(1);
			expect(cells[0]!.sessionId).toBe('s2');
		});

		it('clips cursors outside viewport', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 100, 50);

			const cells = renderCursorOverlays(80, 24);
			expect(cells).toHaveLength(0);
		});

		it('renders rectangular selection', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setSelectionOverlay('s1', {
				startLine: 1,
				startCol: 5,
				endLine: 3,
				endCol: 10,
				mode: 'rectangular',
			});

			const cells = renderCursorOverlays(80, 24);
			// Should have cells for rows 1-3, cols 5-10 = 3 rows * 6 cols = 18 cells
			expect(cells.length).toBe(18);
			expect(cells.every((c) => !c.isCursor)).toBe(true);
		});

		it('renders stream selection', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setSelectionOverlay('s1', {
				startLine: 1,
				startCol: 5,
				endLine: 1,
				endCol: 10,
				mode: 'stream',
			});

			const cells = renderCursorOverlays(80, 24);
			// Single line: cols 5-10 = 6 cells
			expect(cells.length).toBe(6);
		});
	});

	describe('renderCursorLabels', () => {
		it('renders labels above cursors', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			const labels = renderCursorLabels(80, 24);
			expect(labels).toHaveLength(1);
			expect(labels[0]!.text).toBe('Alice');
			expect(labels[0]!.y).toBe(4); // Above cursor
		});

		it('renders labels below when at top', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 0);

			const labels = renderCursorLabels(80, 24);
			expect(labels).toHaveLength(1);
			expect(labels[0]!.y).toBe(1); // Below cursor
		});

		it('truncates long names', () => {
			createOverlayManager({ maxLabelLength: 5 });
			addSessionOverlay('s1', 'VeryLongName', 1);
			setCursorOverlay('s1', 10, 5);

			const labels = renderCursorLabels(80, 24);
			expect(labels).toHaveLength(1);
			expect(labels[0]!.text.length).toBeLessThanOrEqual(5);
		});

		it('respects label visibility', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);
			setLabelVisibility('s1', false);

			const labels = renderCursorLabels(80, 24);
			expect(labels).toHaveLength(0);
		});

		it('excludes specified session', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			const labels = renderCursorLabels(80, 24, 's1');
			expect(labels).toHaveLength(0);
		});
	});

	describe('cursorCellToAnsi', () => {
		it('generates cursor ANSI with foreground color', () => {
			const cell: CursorCell = {
				x: 10,
				y: 5,
				color: 1,
				char: '\u2588',
				sessionId: 's1',
				isCursor: true,
			};
			const ansi = cursorCellToAnsi(cell);
			expect(ansi).toContain('\x1b[6;11H'); // 1-indexed
			expect(ansi).toContain('\x1b[38;5;1m'); // foreground color
			expect(ansi).toContain('\u2588');
		});

		it('generates selection ANSI with background color', () => {
			const cell: CursorCell = {
				x: 5,
				y: 2,
				color: 3,
				char: ' ',
				sessionId: 's1',
				isCursor: false,
			};
			const ansi = cursorCellToAnsi(cell);
			expect(ansi).toContain('\x1b[48;5;3m'); // background color
		});
	});

	describe('cursorLabelToAnsi', () => {
		it('generates label ANSI', () => {
			const label: CursorLabel = {
				x: 10,
				y: 4,
				text: 'Alice',
				color: 1,
				sessionId: 's1',
			};
			const ansi = cursorLabelToAnsi(label);
			expect(ansi).toContain('\x1b[5;11H'); // 1-indexed
			expect(ansi).toContain('Alice');
			expect(ansi).toContain('\x1b[30;48;5;1m'); // black on color bg
		});
	});

	describe('renderOverlaysToAnsi', () => {
		it('returns empty string when no overlays', () => {
			createOverlayManager();
			const ansi = renderOverlaysToAnsi(80, 24);
			expect(ansi).toBe('');
		});

		it('combines cells and labels', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			setCursorOverlay('s1', 10, 5);

			const ansi = renderOverlaysToAnsi(80, 24);
			expect(ansi.length).toBeGreaterThan(0);
			expect(ansi).toContain('Alice');
			expect(ansi).toContain('\u2588');
		});
	});

	describe('buildFocusMap', () => {
		it('maps entities to focusing sessions', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			addSessionOverlay('s2', 'Bob', 2);
			setFocusOverlay('s1', 42);
			setFocusOverlay('s2', 42);

			const focusMap = buildFocusMap();
			expect(focusMap.has(42)).toBe(true);
			expect(focusMap.get(42)).toHaveLength(2);
		});

		it('returns empty map when no focus', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);

			const focusMap = buildFocusMap();
			expect(focusMap.size).toBe(0);
		});

		it('groups by entity', () => {
			createOverlayManager();
			addSessionOverlay('s1', 'Alice', 1);
			addSessionOverlay('s2', 'Bob', 2);
			setFocusOverlay('s1', 42);
			setFocusOverlay('s2', 99);

			const focusMap = buildFocusMap();
			expect(focusMap.size).toBe(2);
			expect(focusMap.get(42)).toHaveLength(1);
			expect(focusMap.get(99)).toHaveLength(1);
		});
	});

	describe('event handler lifecycle', () => {
		it('can unsubscribe', () => {
			createOverlayManager();
			const events: OverlayEvent[] = [];
			const unsub = onOverlayEvent((e) => events.push(e));

			addSessionOverlay('s1', 'Alice', 1);
			expect(events).toHaveLength(1);

			unsub();
			addSessionOverlay('s2', 'Bob', 2);
			expect(events).toHaveLength(1); // no new event
		});

		it('supports multiple handlers', () => {
			createOverlayManager();
			let count1 = 0;
			let count2 = 0;

			onOverlayEvent(() => {
				count1 += 1;
			});
			onOverlayEvent(() => {
				count2 += 1;
			});

			addSessionOverlay('s1', 'Alice', 1);

			expect(count1).toBe(1);
			expect(count2).toBe(1);
		});
	});
});
