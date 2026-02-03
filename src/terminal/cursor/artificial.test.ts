/**
 * Tests for Artificial Cursor System
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Cell } from '../screen/cell';
import { createCell, DEFAULT_BG, DEFAULT_FG } from '../screen/cell';
import {
	addCursor,
	BAR_CURSOR_CHAR,
	BLOCK_CURSOR_CHAR,
	createArtificialCursor,
	createCursorCell,
	createCursorManager,
	getCursorAt,
	getPrimaryCursor,
	getVisibleCursors,
	hideTerminalCursor,
	isCursorVisible,
	moveCursor,
	moveCursorBy,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	resetCursorIdCounter,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
} from './artificial';

describe('ArtificialCursor', () => {
	beforeEach(() => {
		resetCursorIdCounter();
	});

	describe('createArtificialCursor', () => {
		it('creates cursor with default options', () => {
			const cursor = createArtificialCursor();

			expect(cursor.x).toBe(0);
			expect(cursor.y).toBe(0);
			expect(cursor.visible).toBe(true);
			expect(cursor.shape).toBe('block');
			expect(cursor.blink).toBe(true);
			expect(cursor.blinkRate).toBe(530);
			expect(cursor.blinkOn).toBe(true);
			expect(cursor.fgColor).toBeUndefined();
			expect(cursor.bgColor).toBeUndefined();
			expect(cursor.id).toBe('cursor_1');
		});

		it('creates cursor with custom options', () => {
			const cursor = createArtificialCursor({
				x: 10,
				y: 5,
				visible: false,
				shape: 'underline',
				blink: false,
				blinkRate: 400,
				fgColor: 0xff0000ff,
				bgColor: 0x00ff00ff,
				id: 'custom_id',
			});

			expect(cursor.x).toBe(10);
			expect(cursor.y).toBe(5);
			expect(cursor.visible).toBe(false);
			expect(cursor.shape).toBe('underline');
			expect(cursor.blink).toBe(false);
			expect(cursor.blinkRate).toBe(400);
			expect(cursor.fgColor).toBe(0xff0000ff);
			expect(cursor.bgColor).toBe(0x00ff00ff);
			expect(cursor.id).toBe('custom_id');
		});

		it('generates unique IDs for multiple cursors', () => {
			const cursor1 = createArtificialCursor();
			const cursor2 = createArtificialCursor();
			const cursor3 = createArtificialCursor();

			expect(cursor1.id).toBe('cursor_1');
			expect(cursor2.id).toBe('cursor_2');
			expect(cursor3.id).toBe('cursor_3');
		});
	});

	describe('moveCursor', () => {
		it('moves cursor to absolute position', () => {
			const cursor = createArtificialCursor({ x: 0, y: 0 });
			const moved = moveCursor(cursor, 15, 10);

			expect(moved.x).toBe(15);
			expect(moved.y).toBe(10);
			// Other properties preserved
			expect(moved.shape).toBe(cursor.shape);
			expect(moved.visible).toBe(cursor.visible);
		});
	});

	describe('moveCursorBy', () => {
		it('moves cursor by delta', () => {
			const cursor = createArtificialCursor({ x: 10, y: 5 });

			const movedRight = moveCursorBy(cursor, 5, 0);
			expect(movedRight.x).toBe(15);
			expect(movedRight.y).toBe(5);

			const movedUp = moveCursorBy(cursor, 0, -2);
			expect(movedUp.x).toBe(10);
			expect(movedUp.y).toBe(3);
		});

		it('handles negative positions', () => {
			const cursor = createArtificialCursor({ x: 2, y: 2 });
			const moved = moveCursorBy(cursor, -5, -5);

			expect(moved.x).toBe(-3);
			expect(moved.y).toBe(-3);
		});
	});

	describe('setCursorVisible', () => {
		it('hides cursor', () => {
			const cursor = createArtificialCursor({ visible: true });
			const hidden = setCursorVisible(cursor, false);

			expect(hidden.visible).toBe(false);
		});

		it('shows cursor', () => {
			const cursor = createArtificialCursor({ visible: false });
			const shown = setCursorVisible(cursor, true);

			expect(shown.visible).toBe(true);
		});
	});

	describe('setCursorShape', () => {
		it('changes cursor shape', () => {
			const cursor = createArtificialCursor({ shape: 'block' });

			const underline = setCursorShape(cursor, 'underline');
			expect(underline.shape).toBe('underline');

			const bar = setCursorShape(cursor, 'bar');
			expect(bar.shape).toBe('bar');
		});
	});

	describe('setCursorBlink', () => {
		it('enables blinking', () => {
			const cursor = createArtificialCursor({ blink: false });
			const blinking = setCursorBlink(cursor, true);

			expect(blinking.blink).toBe(true);
		});

		it('disables blinking and resets blinkOn to true', () => {
			let cursor = createArtificialCursor({ blink: true });
			cursor = { ...cursor, blinkOn: false }; // Simulate blink off state

			const notBlinking = setCursorBlink(cursor, false);

			expect(notBlinking.blink).toBe(false);
			expect(notBlinking.blinkOn).toBe(true);
		});

		it('updates blink rate', () => {
			const cursor = createArtificialCursor({ blinkRate: 530 });
			const updated = setCursorBlink(cursor, true, 400);

			expect(updated.blinkRate).toBe(400);
		});
	});

	describe('setCursorColors', () => {
		it('sets custom colors', () => {
			const cursor = createArtificialCursor();
			const colored = setCursorColors(cursor, 0xff0000ff, 0x0000ffff);

			expect(colored.fgColor).toBe(0xff0000ff);
			expect(colored.bgColor).toBe(0x0000ffff);
		});

		it('clears colors (reset to inverse)', () => {
			const cursor = createArtificialCursor({
				fgColor: 0xff0000ff,
				bgColor: 0x0000ffff,
			});
			const reset = setCursorColors(cursor, undefined, undefined);

			expect(reset.fgColor).toBeUndefined();
			expect(reset.bgColor).toBeUndefined();
		});
	});
});

describe('Cursor Blink', () => {
	beforeEach(() => {
		resetCursorIdCounter();
	});

	describe('updateCursorBlink', () => {
		it('toggles blink state after half period', () => {
			const cursor = createArtificialCursor({ blink: true, blinkRate: 100 });

			// After 50ms (half period), should toggle
			const toggled = updateCursorBlink(cursor, 50);
			expect(toggled.blinkOn).toBe(false);
			expect(toggled.lastBlinkTime).toBe(50);

			// After another 50ms, should toggle again
			const toggled2 = updateCursorBlink(toggled, 100);
			expect(toggled2.blinkOn).toBe(true);
		});

		it('does not toggle before half period', () => {
			const cursor = createArtificialCursor({ blink: true, blinkRate: 100 });

			const notToggled = updateCursorBlink(cursor, 25);
			expect(notToggled.blinkOn).toBe(true);
			expect(notToggled.lastBlinkTime).toBe(0);
		});

		it('returns unchanged cursor when blink disabled', () => {
			const cursor = createArtificialCursor({ blink: false });
			const result = updateCursorBlink(cursor, 1000);

			expect(result).toBe(cursor);
		});
	});

	describe('resetCursorBlink', () => {
		it('resets blink state to on', () => {
			let cursor = createArtificialCursor({ blink: true });
			cursor = { ...cursor, blinkOn: false, lastBlinkTime: 100 };

			const reset = resetCursorBlink(cursor, 200);

			expect(reset.blinkOn).toBe(true);
			expect(reset.lastBlinkTime).toBe(200);
		});
	});

	describe('isCursorVisible', () => {
		it('returns false when cursor is hidden', () => {
			const cursor = createArtificialCursor({ visible: false });
			expect(isCursorVisible(cursor)).toBe(false);
		});

		it('returns true when visible and not blinking', () => {
			const cursor = createArtificialCursor({ visible: true, blink: false });
			expect(isCursorVisible(cursor)).toBe(true);
		});

		it('returns blink state when blinking', () => {
			const cursorOn = createArtificialCursor({ visible: true, blink: true });
			expect(isCursorVisible(cursorOn)).toBe(true);

			const cursorOff = { ...cursorOn, blinkOn: false };
			expect(isCursorVisible(cursorOff)).toBe(false);
		});
	});
});

describe('Cursor Rendering', () => {
	beforeEach(() => {
		resetCursorIdCounter();
	});

	describe('renderCursor', () => {
		it('renders block cursor with inverted colors', () => {
			const cursor = createArtificialCursor({ shape: 'block' });
			const originalCell: Cell = {
				char: 'A',
				fg: 0xffffffff,
				bg: 0x000000ff,
				attrs: 0,
			};

			const result = renderCursor(cursor, originalCell);

			expect(result.fullCell).toBe(true);
			expect(result.cell.char).toBe('A');
			// Colors should be inverted (fg becomes bg, bg becomes fg)
			expect(result.cell.fg).toBe(0x000000ff);
			expect(result.cell.bg).toBe(0xffffffff);
		});

		it('renders underline cursor', () => {
			const cursor = createArtificialCursor({ shape: 'underline' });
			const originalCell = createCell('A');

			const result = renderCursor(cursor, originalCell);

			expect(result.fullCell).toBe(false);
			expect(result.cell.char).toBe(UNDERLINE_CURSOR_CHAR);
		});

		it('renders bar cursor', () => {
			const cursor = createArtificialCursor({ shape: 'bar' });
			const originalCell = createCell('A');

			const result = renderCursor(cursor, originalCell);

			expect(result.fullCell).toBe(false);
			expect(result.cell.char).toBe(BAR_CURSOR_CHAR);
		});

		it('uses custom colors when specified', () => {
			const cursor = createArtificialCursor({
				shape: 'block',
				fgColor: 0xff0000ff,
				bgColor: 0x00ff00ff,
			});
			const originalCell = createCell('A');

			const result = renderCursor(cursor, originalCell);

			expect(result.cell.fg).toBe(0xff0000ff);
			expect(result.cell.bg).toBe(0x00ff00ff);
		});

		it('handles missing original cell', () => {
			const cursor = createArtificialCursor({ shape: 'block' });
			const result = renderCursor(cursor);

			expect(result.cell.char).toBe(' ');
			// Should use inverted default colors
			expect(result.cell.fg).toBe(DEFAULT_BG);
			expect(result.cell.bg).toBe(DEFAULT_FG);
		});
	});

	describe('createCursorCell', () => {
		it('creates block cursor cell', () => {
			const cursor = createArtificialCursor({ shape: 'block' });
			const cell = createCursorCell(cursor);

			expect(cell.char).toBe(BLOCK_CURSOR_CHAR);
		});

		it('creates underline cursor cell', () => {
			const cursor = createArtificialCursor({ shape: 'underline' });
			const cell = createCursorCell(cursor);

			expect(cell.char).toBe(UNDERLINE_CURSOR_CHAR);
		});

		it('creates bar cursor cell', () => {
			const cursor = createArtificialCursor({ shape: 'bar' });
			const cell = createCursorCell(cursor);

			expect(cell.char).toBe(BAR_CURSOR_CHAR);
		});

		it('uses cursor colors', () => {
			const cursor = createArtificialCursor({
				shape: 'block',
				fgColor: 0xff0000ff,
				bgColor: 0x00ff00ff,
			});
			const cell = createCursorCell(cursor);

			expect(cell.fg).toBe(0xff0000ff);
			expect(cell.bg).toBe(0x00ff00ff);
		});
	});
});

describe('CursorManager', () => {
	beforeEach(() => {
		resetCursorIdCounter();
	});

	describe('createCursorManager', () => {
		it('creates manager with auto-generated primary cursor', () => {
			const manager = createCursorManager();

			expect(manager.cursors.size).toBe(1);
			expect(manager.primaryId).toBe('cursor_1');
		});

		it('creates manager with provided primary cursor', () => {
			const primary = createArtificialCursor({ id: 'main', x: 10, y: 5 });
			const manager = createCursorManager(primary);

			expect(manager.cursors.size).toBe(1);
			expect(manager.primaryId).toBe('main');
			expect(manager.cursors.get('main')?.x).toBe(10);
		});
	});

	describe('getPrimaryCursor', () => {
		it('returns the primary cursor', () => {
			const manager = createCursorManager();
			const primary = getPrimaryCursor(manager);

			expect(primary.id).toBe(manager.primaryId);
		});
	});

	describe('addCursor', () => {
		it('adds a cursor to the manager', () => {
			let manager = createCursorManager();
			const secondary = createArtificialCursor({ id: 'secondary' });

			manager = addCursor(manager, secondary);

			expect(manager.cursors.size).toBe(2);
			expect(manager.cursors.has('secondary')).toBe(true);
		});
	});

	describe('removeCursor', () => {
		it('removes a non-primary cursor', () => {
			let manager = createCursorManager();
			const secondary = createArtificialCursor({ id: 'secondary' });
			manager = addCursor(manager, secondary);

			manager = removeCursor(manager, 'secondary');

			expect(manager.cursors.size).toBe(1);
			expect(manager.cursors.has('secondary')).toBe(false);
		});

		it('throws when trying to remove primary cursor', () => {
			const manager = createCursorManager();

			expect(() => removeCursor(manager, manager.primaryId)).toThrow(
				'Cannot remove primary cursor',
			);
		});
	});

	describe('updateCursorInManager', () => {
		it('updates a cursor in the manager', () => {
			const manager = createCursorManager();
			const primary = getPrimaryCursor(manager);
			const moved = moveCursor(primary, 20, 15);

			const updated = updateCursorInManager(manager, moved);

			expect(getPrimaryCursor(updated).x).toBe(20);
			expect(getPrimaryCursor(updated).y).toBe(15);
		});
	});

	describe('getVisibleCursors', () => {
		it('returns only visible cursors', () => {
			let manager = createCursorManager(createArtificialCursor({ id: 'visible1', visible: true }));
			manager = addCursor(manager, createArtificialCursor({ id: 'hidden', visible: false }));
			manager = addCursor(manager, createArtificialCursor({ id: 'visible2', visible: true }));

			const visible = getVisibleCursors(manager);

			expect(visible).toHaveLength(2);
			expect(visible.map((c) => c.id).sort()).toEqual(['visible1', 'visible2']);
		});
	});

	describe('updateAllCursorBlinks', () => {
		it('updates blink state for all cursors', () => {
			let manager = createCursorManager(createArtificialCursor({ blink: true, blinkRate: 100 }));
			manager = addCursor(manager, createArtificialCursor({ blink: true, blinkRate: 100 }));

			// After 50ms, both should toggle
			const updated = updateAllCursorBlinks(manager, 50);

			for (const cursor of updated.cursors.values()) {
				expect(cursor.blinkOn).toBe(false);
			}
		});
	});

	describe('getCursorAt', () => {
		it('returns cursor at position', () => {
			let manager = createCursorManager(createArtificialCursor({ id: 'a', x: 10, y: 5 }));
			manager = addCursor(manager, createArtificialCursor({ id: 'b', x: 20, y: 10 }));

			const cursorA = getCursorAt(manager, 10, 5);
			expect(cursorA?.id).toBe('a');

			const cursorB = getCursorAt(manager, 20, 10);
			expect(cursorB?.id).toBe('b');
		});

		it('returns undefined when no cursor at position', () => {
			const manager = createCursorManager(createArtificialCursor({ x: 10, y: 5 }));

			const cursor = getCursorAt(manager, 99, 99);
			expect(cursor).toBeUndefined();
		});

		it('ignores hidden cursors', () => {
			const manager = createCursorManager(createArtificialCursor({ x: 10, y: 5, visible: false }));

			const cursor = getCursorAt(manager, 10, 5);
			expect(cursor).toBeUndefined();
		});
	});
});

describe('Terminal Cursor Integration', () => {
	describe('hideTerminalCursor', () => {
		it('returns hide cursor escape sequence', () => {
			expect(hideTerminalCursor()).toBe('\x1b[?25l');
		});
	});

	describe('showTerminalCursor', () => {
		it('returns show cursor escape sequence', () => {
			expect(showTerminalCursor()).toBe('\x1b[?25h');
		});
	});
});
