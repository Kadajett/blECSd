/**
 * Tests for terminal backend shared helper functions.
 */

import { describe, expect, it } from 'vitest';
import { Attr } from '../../screen/cell';
import {
	attrsSequence,
	bgColor,
	CSI,
	createRenderState,
	cursorForward,
	fgColor,
	generateCursorMove,
	generateStyleChanges,
	moveColumn,
	moveCursor,
	SGR,
	sgr,
	unpackColor,
} from '../helpers';

describe('Constants', () => {
	it('exports CSI escape sequence', () => {
		expect(CSI).toBe('\x1b[');
	});

	it('exports SGR codes', () => {
		expect(SGR.RESET).toBe(0);
		expect(SGR.BOLD).toBe(1);
		expect(SGR.DIM).toBe(2);
		expect(SGR.ITALIC).toBe(3);
		expect(SGR.UNDERLINE).toBe(4);
		expect(SGR.BLINK).toBe(5);
		expect(SGR.INVERSE).toBe(7);
		expect(SGR.HIDDEN).toBe(8);
		expect(SGR.STRIKETHROUGH).toBe(9);
		expect(SGR.FG_256).toBe(38);
		expect(SGR.BG_256).toBe(48);
	});
});

describe('createRenderState', () => {
	it('creates initial render state with -1 values', () => {
		const state = createRenderState();
		expect(state.lastX).toBe(-1);
		expect(state.lastY).toBe(-1);
		expect(state.lastFg).toBe(-1);
		expect(state.lastBg).toBe(-1);
		expect(state.lastAttrs).toBe(-1);
	});
});

describe('sgr', () => {
	it('generates SGR sequence with single code', () => {
		expect(sgr(0)).toBe('\x1b[0m');
		expect(sgr(1)).toBe('\x1b[1m');
	});

	it('generates SGR sequence with multiple codes', () => {
		expect(sgr(1, 3)).toBe('\x1b[1;3m');
		expect(sgr(38, 2, 255, 0, 0)).toBe('\x1b[38;2;255;0;0m');
	});

	it('handles empty codes array', () => {
		expect(sgr()).toBe('\x1b[m');
	});
});

describe('moveCursor', () => {
	it('generates cursor position sequence with 1-indexed coordinates', () => {
		expect(moveCursor(0, 0)).toBe('\x1b[1;1H');
		expect(moveCursor(5, 3)).toBe('\x1b[4;6H');
		expect(moveCursor(10, 20)).toBe('\x1b[21;11H');
	});
});

describe('moveColumn', () => {
	it('generates column move sequence with 1-indexed coordinate', () => {
		expect(moveColumn(0)).toBe('\x1b[1G');
		expect(moveColumn(5)).toBe('\x1b[6G');
		expect(moveColumn(10)).toBe('\x1b[11G');
	});
});

describe('cursorForward', () => {
	it('generates simple sequence for n=1', () => {
		expect(cursorForward(1)).toBe('\x1b[C');
	});

	it('generates sequence with count for n>1', () => {
		expect(cursorForward(2)).toBe('\x1b[2C');
		expect(cursorForward(5)).toBe('\x1b[5C');
		expect(cursorForward(10)).toBe('\x1b[10C');
	});
});

describe('unpackColor', () => {
	it('unpacks RGBA components from packed color', () => {
		const white = unpackColor(0xffffffff);
		expect(white).toEqual({ r: 255, g: 255, b: 255, a: 255 });

		const red = unpackColor(0xffff0000);
		expect(red).toEqual({ r: 255, g: 0, b: 0, a: 255 });

		const green = unpackColor(0xff00ff00);
		expect(green).toEqual({ r: 0, g: 255, b: 0, a: 255 });

		const blue = unpackColor(0xff0000ff);
		expect(blue).toEqual({ r: 0, g: 0, b: 255, a: 255 });
	});

	it('unpacks alpha channel correctly', () => {
		const transparent = unpackColor(0x00000000);
		expect(transparent).toEqual({ r: 0, g: 0, b: 0, a: 0 });

		const semiTransparent = unpackColor(0x80ff0000);
		expect(semiTransparent).toEqual({ r: 255, g: 0, b: 0, a: 128 });

		const opaque = unpackColor(0xffff0000);
		expect(opaque).toEqual({ r: 255, g: 0, b: 0, a: 255 });
	});

	it('handles arbitrary RGB values', () => {
		const color = unpackColor(0xff7f3f9f);
		expect(color).toEqual({ r: 127, g: 63, b: 159, a: 255 });
	});
});

describe('fgColor', () => {
	it('generates truecolor foreground sequence for opaque colors', () => {
		expect(fgColor(0xffff0000)).toBe('\x1b[38;2;255;0;0m'); // Red
		expect(fgColor(0xff00ff00)).toBe('\x1b[38;2;0;255;0m'); // Green
		expect(fgColor(0xff0000ff)).toBe('\x1b[38;2;0;0;255m'); // Blue
	});

	it('generates default foreground sequence for transparent colors', () => {
		expect(fgColor(0x00000000)).toBe('\x1b[39m');
		expect(fgColor(0x00ff0000)).toBe('\x1b[39m');
	});

	it('handles semi-transparent colors as opaque', () => {
		// Alpha > 0 is treated as opaque
		expect(fgColor(0x01ff0000)).toBe('\x1b[38;2;255;0;0m');
		expect(fgColor(0x80ff0000)).toBe('\x1b[38;2;255;0;0m');
	});
});

describe('bgColor', () => {
	it('generates truecolor background sequence for opaque colors', () => {
		expect(bgColor(0xffff0000)).toBe('\x1b[48;2;255;0;0m'); // Red
		expect(bgColor(0xff00ff00)).toBe('\x1b[48;2;0;255;0m'); // Green
		expect(bgColor(0xff0000ff)).toBe('\x1b[48;2;0;0;255m'); // Blue
	});

	it('generates default background sequence for transparent colors', () => {
		expect(bgColor(0x00000000)).toBe('\x1b[49m');
		expect(bgColor(0x00ff0000)).toBe('\x1b[49m');
	});

	it('handles semi-transparent colors as opaque', () => {
		expect(bgColor(0x01ff0000)).toBe('\x1b[48;2;255;0;0m');
		expect(bgColor(0x80ff0000)).toBe('\x1b[48;2;255;0;0m');
	});
});

describe('attrsSequence', () => {
	it('returns empty string for Attr.NONE', () => {
		expect(attrsSequence(Attr.NONE)).toBe('');
	});

	it('generates sequence for single attribute', () => {
		expect(attrsSequence(Attr.BOLD)).toBe('\x1b[1m');
		expect(attrsSequence(Attr.DIM)).toBe('\x1b[2m');
		expect(attrsSequence(Attr.ITALIC)).toBe('\x1b[3m');
		expect(attrsSequence(Attr.UNDERLINE)).toBe('\x1b[4m');
		expect(attrsSequence(Attr.BLINK)).toBe('\x1b[5m');
		expect(attrsSequence(Attr.INVERSE)).toBe('\x1b[7m');
		expect(attrsSequence(Attr.HIDDEN)).toBe('\x1b[8m');
		expect(attrsSequence(Attr.STRIKETHROUGH)).toBe('\x1b[9m');
	});

	it('generates sequence for multiple attributes', () => {
		const boldItalic = Attr.BOLD | Attr.ITALIC;
		expect(attrsSequence(boldItalic)).toBe('\x1b[1;3m');

		const boldUnderline = Attr.BOLD | Attr.UNDERLINE;
		expect(attrsSequence(boldUnderline)).toBe('\x1b[1;4m');

		const dimInverse = Attr.DIM | Attr.INVERSE;
		expect(attrsSequence(dimInverse)).toBe('\x1b[2;7m');
	});

	it('generates sequence for all attributes combined', () => {
		const allAttrs =
			Attr.BOLD |
			Attr.DIM |
			Attr.ITALIC |
			Attr.UNDERLINE |
			Attr.BLINK |
			Attr.INVERSE |
			Attr.HIDDEN |
			Attr.STRIKETHROUGH;
		expect(attrsSequence(allAttrs)).toBe('\x1b[1;2;3;4;5;7;8;9m');
	});
});

describe('generateCursorMove', () => {
	it('returns empty string when cursor is already at target position', () => {
		const state = createRenderState();
		state.lastX = 5;
		state.lastY = 3;
		expect(generateCursorMove(state, 5, 3)).toBe('');
	});

	it('returns empty string for implicit advance (same row, +1 column)', () => {
		const state = createRenderState();
		state.lastX = 5;
		state.lastY = 3;
		expect(generateCursorMove(state, 6, 3)).toBe('');
	});

	it('uses cursorForward for small forward movements on same row', () => {
		const state = createRenderState();
		state.lastX = 5;
		state.lastY = 3;

		expect(generateCursorMove(state, 7, 3)).toBe('\x1b[2C');
		expect(generateCursorMove(state, 9, 3)).toBe('\x1b[4C');
	});

	it('uses moveColumn for larger forward movements on same row', () => {
		const state = createRenderState();
		state.lastX = 5;
		state.lastY = 3;

		expect(generateCursorMove(state, 10, 3)).toBe('\x1b[11G');
		expect(generateCursorMove(state, 20, 3)).toBe('\x1b[21G');
	});

	it('uses moveColumn for backward movements on same row', () => {
		const state = createRenderState();
		state.lastX = 10;
		state.lastY = 3;

		expect(generateCursorMove(state, 5, 3)).toBe('\x1b[6G');
	});

	it('uses moveCursor for different rows', () => {
		const state = createRenderState();
		state.lastX = 5;
		state.lastY = 3;

		expect(generateCursorMove(state, 10, 5)).toBe('\x1b[6;11H');
		expect(generateCursorMove(state, 0, 0)).toBe('\x1b[1;1H');
	});

	it('uses moveCursor when state is uninitialized', () => {
		const state = createRenderState();
		expect(generateCursorMove(state, 5, 3)).toBe('\x1b[4;6H');
	});
});

describe('generateStyleChanges', () => {
	it('returns empty string when no changes are needed', () => {
		const state = createRenderState();
		state.lastFg = 0xffffffff;
		state.lastBg = 0xff000000;
		state.lastAttrs = Attr.NONE;

		expect(generateStyleChanges(state, 0xffffffff, 0xff000000, Attr.NONE)).toBe('');
	});

	it('generates foreground color change', () => {
		const state = createRenderState();
		const output = generateStyleChanges(state, 0xffff0000, 0xff000000, Attr.NONE);
		expect(output).toContain('\x1b[38;2;255;0;0m'); // Red foreground
		expect(state.lastFg).toBe(0xffff0000);
	});

	it('generates background color change', () => {
		const state = createRenderState();
		const output = generateStyleChanges(state, 0xffffffff, 0xff0000ff, Attr.NONE);
		expect(output).toContain('\x1b[48;2;0;0;255m'); // Blue background
		expect(state.lastBg).toBe(0xff0000ff);
	});

	it('generates attribute change', () => {
		const state = createRenderState();
		const output = generateStyleChanges(state, 0xffffffff, 0xff000000, Attr.BOLD);
		expect(output).toContain('\x1b[1m');
		expect(state.lastAttrs).toBe(Attr.BOLD);
	});

	it('generates reset when switching from attrs to NONE', () => {
		const state = createRenderState();
		state.lastAttrs = Attr.BOLD;
		state.lastFg = 0xffff0000;
		state.lastBg = 0xff0000ff;

		const output = generateStyleChanges(state, 0xffffffff, 0xff000000, Attr.NONE);
		expect(output).toContain('\x1b[0m'); // Reset
		expect(state.lastFg).toBe(0xffffffff);
		expect(state.lastBg).toBe(0xff000000);
		expect(state.lastAttrs).toBe(Attr.NONE);
	});

	it('generates reset when changing attributes', () => {
		const state = createRenderState();
		state.lastAttrs = Attr.BOLD;
		state.lastFg = 0xffff0000;
		state.lastBg = 0xff0000ff;

		const output = generateStyleChanges(state, 0xffffffff, 0xff000000, Attr.ITALIC);
		expect(output).toContain('\x1b[0m'); // Reset
		expect(output).toContain('\x1b[3m'); // Italic
	});

	it('handles initial state correctly', () => {
		const state = createRenderState();
		const output = generateStyleChanges(state, 0xffff0000, 0xff0000ff, Attr.BOLD);

		expect(output).toContain('\x1b[1m'); // Bold
		expect(output).toContain('\x1b[38;2;255;0;0m'); // Red fg
		expect(output).toContain('\x1b[48;2;0;0;255m'); // Blue bg
	});

	it('updates state after generating changes', () => {
		const state = createRenderState();
		generateStyleChanges(state, 0xffff0000, 0xff0000ff, Attr.BOLD);

		expect(state.lastFg).toBe(0xffff0000);
		expect(state.lastBg).toBe(0xff0000ff);
		expect(state.lastAttrs).toBe(Attr.BOLD);
	});

	it('generates only changed styles when some remain the same', () => {
		const state = createRenderState();
		state.lastFg = 0xffff0000;
		state.lastBg = 0xff000000;
		state.lastAttrs = Attr.NONE;

		const output = generateStyleChanges(state, 0xffff0000, 0xff0000ff, Attr.NONE);
		expect(output).not.toContain('\x1b[38'); // No fg change
		expect(output).toContain('\x1b[48;2;0;0;255m'); // Blue bg change only
	});
});
