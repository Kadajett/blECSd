/**
 * Tests for content line manipulation functions.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getContent, resetContentStore, setContent } from '../components/content';
import { Renderable } from '../components/renderable';
import { getScroll, setScrollable } from '../systems/scrollableSystem';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	clearLines,
	contentGetLine,
	contentGetLineCount,
	deleteBottom,
	deleteLine,
	deleteTop,
	getBaseLine,
	getLines,
	insertBottom,
	insertLine,
	insertTop,
	popLine,
	pushLine,
	replaceLines,
	setBaseLine,
	setLine,
	setLines,
	shiftLine,
	spliceLines,
	unshiftLine,
} from './contentManipulation';

describe('contentManipulation', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		entity = addEntity(world) as Entity;
		resetContentStore();
		// Reset dirty flag
		Renderable.dirty[entity] = 0;
	});

	describe('getLines', () => {
		it('returns empty array for empty content', () => {
			setContent(world, entity, '');
			expect(getLines(world, entity)).toEqual([]);
		});

		it('returns single line', () => {
			setContent(world, entity, 'Hello');
			expect(getLines(world, entity)).toEqual(['Hello']);
		});

		it('splits multiple lines', () => {
			setContent(world, entity, 'Line 1\nLine 2\nLine 3');
			expect(getLines(world, entity)).toEqual(['Line 1', 'Line 2', 'Line 3']);
		});

		it('handles empty lines', () => {
			setContent(world, entity, 'A\n\nB');
			expect(getLines(world, entity)).toEqual(['A', '', 'B']);
		});
	});

	describe('getLineCount', () => {
		it('returns 0 for empty content', () => {
			setContent(world, entity, '');
			expect(contentGetLineCount(world, entity)).toBe(0);
		});

		it('returns 1 for single line', () => {
			setContent(world, entity, 'Hello');
			expect(contentGetLineCount(world, entity)).toBe(1);
		});

		it('counts multiple lines', () => {
			setContent(world, entity, 'A\nB\nC');
			expect(contentGetLineCount(world, entity)).toBe(3);
		});

		it('counts empty lines', () => {
			setContent(world, entity, 'A\n\nB');
			expect(contentGetLineCount(world, entity)).toBe(3);
		});
	});

	describe('getLine', () => {
		beforeEach(() => {
			setContent(world, entity, 'Line 0\nLine 1\nLine 2');
		});

		it('returns line at valid index', () => {
			expect(contentGetLine(world, entity, 0)).toBe('Line 0');
			expect(contentGetLine(world, entity, 1)).toBe('Line 1');
			expect(contentGetLine(world, entity, 2)).toBe('Line 2');
		});

		it('returns empty string for negative index', () => {
			expect(contentGetLine(world, entity, -1)).toBe('');
		});

		it('returns empty string for index out of bounds', () => {
			expect(contentGetLine(world, entity, 3)).toBe('');
			expect(contentGetLine(world, entity, 100)).toBe('');
		});
	});

	describe('setLine', () => {
		beforeEach(() => {
			setContent(world, entity, 'Line 0\nLine 1\nLine 2');
		});

		it('sets line at valid index', () => {
			setLine(world, entity, 1, 'Modified');
			expect(getContent(world, entity)).toBe('Line 0\nModified\nLine 2');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			setLine(world, entity, 1, 'Modified');
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('does nothing for negative index', () => {
			setLine(world, entity, -1, 'Invalid');
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2');
		});

		it('does nothing for index out of bounds', () => {
			setLine(world, entity, 10, 'Invalid');
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2');
		});
	});

	describe('getBaseLine / setBaseLine', () => {
		it('getBaseLine is equivalent to getLine', () => {
			setContent(world, entity, 'A\nB\nC');
			expect(getBaseLine(world, entity, 0)).toBe('A');
			expect(getBaseLine(world, entity, 1)).toBe('B');
		});

		it('setBaseLine is equivalent to setLine', () => {
			setContent(world, entity, 'A\nB\nC');
			setBaseLine(world, entity, 1, 'X');
			expect(getContent(world, entity)).toBe('A\nX\nC');
		});
	});

	describe('insertLine', () => {
		beforeEach(() => {
			setContent(world, entity, 'Line 0\nLine 2');
		});

		it('inserts line at specified index', () => {
			insertLine(world, entity, 1, 'Line 1');
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2');
		});

		it('inserts at beginning with index 0', () => {
			insertLine(world, entity, 0, 'First');
			expect(getContent(world, entity)).toBe('First\nLine 0\nLine 2');
		});

		it('inserts at end with index equal to length', () => {
			insertLine(world, entity, 2, 'Last');
			expect(getContent(world, entity)).toBe('Line 0\nLine 2\nLast');
		});

		it('clamps negative index to 0', () => {
			insertLine(world, entity, -10, 'Clamped');
			expect(getContent(world, entity)).toBe('Clamped\nLine 0\nLine 2');
		});

		it('clamps large index to end', () => {
			insertLine(world, entity, 100, 'Clamped');
			expect(getContent(world, entity)).toBe('Line 0\nLine 2\nClamped');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			insertLine(world, entity, 1, 'New');
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('adjusts scroll when inserting above scroll position', () => {
			setScrollable(world, entity, { scrollY: 1 });
			insertLine(world, entity, 0, 'New at top');
			expect(getScroll(world, entity).y).toBe(2);
		});

		it('does not adjust scroll when inserting below scroll position', () => {
			setScrollable(world, entity, { scrollY: 0 });
			insertLine(world, entity, 2, 'New at bottom');
			expect(getScroll(world, entity).y).toBe(0);
		});
	});

	describe('insertTop', () => {
		it('inserts line at top', () => {
			setContent(world, entity, 'Line 1\nLine 2');
			insertTop(world, entity, 'Line 0');
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2');
		});

		it('works on empty content', () => {
			setContent(world, entity, '');
			insertTop(world, entity, 'First');
			expect(getContent(world, entity)).toBe('First');
		});
	});

	describe('insertBottom', () => {
		it('inserts line at bottom', () => {
			setContent(world, entity, 'Line 0\nLine 1');
			insertBottom(world, entity, 'Line 2');
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2');
		});

		it('works on empty content', () => {
			setContent(world, entity, '');
			insertBottom(world, entity, 'First');
			expect(getContent(world, entity)).toBe('First');
		});
	});

	describe('deleteLine', () => {
		beforeEach(() => {
			setContent(world, entity, 'Line 0\nLine 1\nLine 2\nLine 3');
		});

		it('deletes single line at index', () => {
			deleteLine(world, entity, 1);
			expect(getContent(world, entity)).toBe('Line 0\nLine 2\nLine 3');
		});

		it('deletes multiple lines', () => {
			deleteLine(world, entity, 1, 2);
			expect(getContent(world, entity)).toBe('Line 0\nLine 3');
		});

		it('clamps count to available lines', () => {
			deleteLine(world, entity, 2, 10);
			expect(getContent(world, entity)).toBe('Line 0\nLine 1');
		});

		it('does nothing for negative index', () => {
			deleteLine(world, entity, -1);
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2\nLine 3');
		});

		it('does nothing for index out of bounds', () => {
			deleteLine(world, entity, 10);
			expect(getContent(world, entity)).toBe('Line 0\nLine 1\nLine 2\nLine 3');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			deleteLine(world, entity, 1);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('adjusts scroll when deleting above scroll position', () => {
			setScrollable(world, entity, { scrollY: 2 });
			deleteLine(world, entity, 0, 1);
			expect(getScroll(world, entity).y).toBe(1);
		});

		it('clamps scroll when content becomes shorter', () => {
			setScrollable(world, entity, { scrollY: 3 });
			deleteLine(world, entity, 1, 3);
			// Only 1 line left (index 0), max scroll is 0
			expect(getScroll(world, entity).y).toBe(0);
		});
	});

	describe('deleteTop', () => {
		it('deletes lines from top', () => {
			setContent(world, entity, 'A\nB\nC\nD');
			deleteTop(world, entity, 2);
			expect(getContent(world, entity)).toBe('C\nD');
		});

		it('deletes single line by default', () => {
			setContent(world, entity, 'A\nB\nC');
			deleteTop(world, entity);
			expect(getContent(world, entity)).toBe('B\nC');
		});
	});

	describe('deleteBottom', () => {
		it('deletes lines from bottom', () => {
			setContent(world, entity, 'A\nB\nC\nD');
			deleteBottom(world, entity, 2);
			expect(getContent(world, entity)).toBe('A\nB');
		});

		it('deletes single line by default', () => {
			setContent(world, entity, 'A\nB\nC');
			deleteBottom(world, entity);
			expect(getContent(world, entity)).toBe('A\nB');
		});

		it('handles empty content', () => {
			setContent(world, entity, '');
			deleteBottom(world, entity);
			expect(getContent(world, entity)).toBe('');
		});
	});

	describe('clearLines', () => {
		it('clears all content', () => {
			setContent(world, entity, 'A\nB\nC');
			clearLines(world, entity);
			expect(getContent(world, entity)).toBe('');
		});

		it('marks entity dirty', () => {
			setContent(world, entity, 'A\nB\nC');
			Renderable.dirty[entity] = 0;
			clearLines(world, entity);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('resets scroll position', () => {
			setContent(world, entity, 'A\nB\nC');
			setScrollable(world, entity, { scrollY: 10 });
			clearLines(world, entity);
			expect(getScroll(world, entity).y).toBe(0);
		});
	});

	describe('setLines', () => {
		it('sets all lines at once', () => {
			setLines(world, entity, ['A', 'B', 'C']);
			expect(getContent(world, entity)).toBe('A\nB\nC');
		});

		it('replaces existing content', () => {
			setContent(world, entity, 'Old\nContent');
			setLines(world, entity, ['New', 'Lines']);
			expect(getContent(world, entity)).toBe('New\nLines');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			setLines(world, entity, ['A', 'B']);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('clamps scroll when content is shorter', () => {
			setContent(world, entity, 'A\nB\nC\nD\nE');
			setScrollable(world, entity, { scrollY: 4 });
			setLines(world, entity, ['X', 'Y']);
			expect(getScroll(world, entity).y).toBe(1);
		});
	});

	describe('pushLine', () => {
		it('pushes line to bottom', () => {
			setContent(world, entity, 'A\nB');
			pushLine(world, entity, 'C');
			expect(getContent(world, entity)).toBe('A\nB\nC');
		});

		it('works on empty content', () => {
			setContent(world, entity, '');
			pushLine(world, entity, 'First');
			expect(getContent(world, entity)).toBe('First');
		});
	});

	describe('popLine', () => {
		it('removes and returns last line', () => {
			setContent(world, entity, 'A\nB\nC');
			const removed = popLine(world, entity);
			expect(removed).toBe('C');
			expect(getContent(world, entity)).toBe('A\nB');
		});

		it('returns empty string for empty content', () => {
			setContent(world, entity, '');
			const removed = popLine(world, entity);
			expect(removed).toBe('');
		});

		it('marks entity dirty', () => {
			setContent(world, entity, 'A\nB');
			Renderable.dirty[entity] = 0;
			popLine(world, entity);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('adjusts scroll when content becomes shorter', () => {
			setContent(world, entity, 'A\nB\nC');
			setScrollable(world, entity, { scrollY: 2 });
			popLine(world, entity);
			expect(getScroll(world, entity).y).toBe(1);
		});
	});

	describe('shiftLine', () => {
		it('removes and returns first line', () => {
			setContent(world, entity, 'A\nB\nC');
			const removed = shiftLine(world, entity);
			expect(removed).toBe('A');
			expect(getContent(world, entity)).toBe('B\nC');
		});

		it('returns empty string for empty content', () => {
			setContent(world, entity, '');
			const removed = shiftLine(world, entity);
			expect(removed).toBe('');
		});

		it('marks entity dirty', () => {
			setContent(world, entity, 'A\nB');
			Renderable.dirty[entity] = 0;
			shiftLine(world, entity);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('adjusts scroll down when line removed from top', () => {
			setContent(world, entity, 'A\nB\nC');
			setScrollable(world, entity, { scrollY: 2 });
			shiftLine(world, entity);
			expect(getScroll(world, entity).y).toBe(1);
		});

		it('does not adjust scroll below 0', () => {
			setContent(world, entity, 'A\nB\nC');
			setScrollable(world, entity, { scrollY: 0 });
			shiftLine(world, entity);
			expect(getScroll(world, entity).y).toBe(0);
		});
	});

	describe('unshiftLine', () => {
		it('adds line to top', () => {
			setContent(world, entity, 'B\nC');
			unshiftLine(world, entity, 'A');
			expect(getContent(world, entity)).toBe('A\nB\nC');
		});
	});

	describe('replaceLines', () => {
		beforeEach(() => {
			setContent(world, entity, 'A\nB\nC\nD\nE');
		});

		it('replaces lines starting at index', () => {
			replaceLines(world, entity, 1, ['X', 'Y']);
			expect(getContent(world, entity)).toBe('A\nX\nY\nD\nE');
		});

		it('does not extend content', () => {
			replaceLines(world, entity, 3, ['X', 'Y', 'Z']);
			expect(getContent(world, entity)).toBe('A\nB\nC\nX\nY');
		});

		it('does nothing for invalid start index', () => {
			replaceLines(world, entity, -1, ['X']);
			expect(getContent(world, entity)).toBe('A\nB\nC\nD\nE');

			replaceLines(world, entity, 10, ['X']);
			expect(getContent(world, entity)).toBe('A\nB\nC\nD\nE');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			replaceLines(world, entity, 1, ['X']);
			expect(Renderable.dirty[entity]).toBe(1);
		});
	});

	describe('spliceLines', () => {
		beforeEach(() => {
			setContent(world, entity, 'A\nB\nC\nD');
		});

		it('deletes lines without inserting', () => {
			const deleted = spliceLines(world, entity, 1, 2);
			expect(deleted).toEqual(['B', 'C']);
			expect(getContent(world, entity)).toBe('A\nD');
		});

		it('inserts lines without deleting', () => {
			const deleted = spliceLines(world, entity, 2, 0, ['X', 'Y']);
			expect(deleted).toEqual([]);
			expect(getContent(world, entity)).toBe('A\nB\nX\nY\nC\nD');
		});

		it('replaces lines (delete and insert)', () => {
			const deleted = spliceLines(world, entity, 1, 2, ['X', 'Y', 'Z']);
			expect(deleted).toEqual(['B', 'C']);
			expect(getContent(world, entity)).toBe('A\nX\nY\nZ\nD');
		});

		it('marks entity dirty', () => {
			Renderable.dirty[entity] = 0;
			spliceLines(world, entity, 1, 1);
			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('adjusts scroll when content changes above scroll position', () => {
			setScrollable(world, entity, { scrollY: 2 });
			// Delete 1 line at index 0, insert 3 lines
			spliceLines(world, entity, 0, 1, ['X', 'Y', 'Z']);
			// Net change: +2 lines, scroll should increase by 2
			expect(getScroll(world, entity).y).toBe(4);
		});

		it('clamps scroll when content becomes shorter', () => {
			setScrollable(world, entity, { scrollY: 3 });
			spliceLines(world, entity, 1, 3);
			// Only 1 line left (A), max scroll is 0
			expect(getScroll(world, entity).y).toBe(0);
		});
	});

	describe('integration scenarios', () => {
		it('implements a log buffer with max lines', () => {
			const maxLines = 5;

			function addLogLine(w: World, e: Entity, line: string): void {
				pushLine(w, e, line);
				while (contentGetLineCount(w, e) > maxLines) {
					shiftLine(w, e);
				}
			}

			setContent(world, entity, '');
			for (let i = 1; i <= 7; i++) {
				addLogLine(world, entity, `Log ${i}`);
			}

			expect(contentGetLineCount(world, entity)).toBe(5);
			expect(getLines(world, entity)).toEqual(['Log 3', 'Log 4', 'Log 5', 'Log 6', 'Log 7']);
		});

		it('implements undo/redo for line edits', () => {
			setContent(world, entity, 'A\nB\nC');

			// Save state
			const originalLine = contentGetLine(world, entity, 1);

			// Make edit
			setLine(world, entity, 1, 'Modified');
			expect(getContent(world, entity)).toBe('A\nModified\nC');

			// Undo
			setLine(world, entity, 1, originalLine);
			expect(getContent(world, entity)).toBe('A\nB\nC');
		});
	});
});
