/**
 * Terminal Widget Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	getTerminalBuffer,
	getTerminalCells,
	getTerminalState,
	hasTerminalBuffer,
	resetTerminalBufferStore,
} from '../components/terminalBuffer';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	createTerminal,
	handleTerminalKey,
	isTerminal,
	isTerminalKeysEnabled,
	isTerminalMouseEnabled,
	resetTerminalStore,
} from './terminal';

describe('Terminal Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetTerminalStore();
		resetTerminalBufferStore();
	});

	afterEach(() => {
		resetTerminalStore();
		resetTerminalBufferStore();
	});

	describe('createTerminal', () => {
		it('should create a terminal widget with default config', () => {
			const terminal = createTerminal(world);

			expect(terminal.eid).toBeDefined();
			expect(isTerminal(world, terminal.eid)).toBe(true);
			expect(hasTerminalBuffer(terminal.eid)).toBe(true);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.width).toBe(80);
			expect(buffer?.height).toBe(24);
			expect(buffer?.cursorVisible).toBe(true);
		});

		it('should create a terminal with custom dimensions', () => {
			const terminal = createTerminal(world, {
				width: 120,
				height: 40,
			});

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.width).toBe(120);
			expect(buffer?.height).toBe(40);
		});

		it('should respect mouse and keys config', () => {
			const terminal = createTerminal(world, {
				mouse: false,
				keys: true,
			});

			expect(isTerminalMouseEnabled(world, terminal.eid)).toBe(false);
			expect(isTerminalKeysEnabled(world, terminal.eid)).toBe(true);
		});

		it('should set up terminal buffer with scrollback', () => {
			const terminal = createTerminal(world, {
				scrollback: 5000,
			});

			const state = getTerminalState(terminal.eid);
			expect(state?.scrollback).toBeDefined();
		});
	});

	describe('write methods', () => {
		it('should write plain text', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello');

			const cells = getTerminalCells(terminal.eid);
			expect(cells?.[0]?.char).toBe('H');
			expect(cells?.[1]?.char).toBe('e');
			expect(cells?.[2]?.char).toBe('l');
			expect(cells?.[3]?.char).toBe('l');
			expect(cells?.[4]?.char).toBe('o');
		});

		it('should write line with newline', () => {
			const terminal = createTerminal(world);
			terminal.writeln('Line 1');
			terminal.writeln('Line 2');

			const buffer = getTerminalBuffer(terminal.eid);
			// After "Line 1\n", cursor should be at row 1
			// After "Line 2\n", cursor should be at row 2
			expect(buffer?.cursorY).toBe(2);
		});

		it('should handle carriage return', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello\rWorld');

			const cells = getTerminalCells(terminal.eid);
			// \r moves cursor to beginning, "World" overwrites "Hello"
			expect(cells?.[0]?.char).toBe('W');
			expect(cells?.[1]?.char).toBe('o');
			expect(cells?.[2]?.char).toBe('r');
			expect(cells?.[3]?.char).toBe('l');
			expect(cells?.[4]?.char).toBe('d');
		});

		it('should handle backspace', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello\b');

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(4); // Moved back one position
		});

		it('should handle tab', () => {
			const terminal = createTerminal(world);
			terminal.write('Hi\tWorld');

			const buffer = getTerminalBuffer(terminal.eid);
			// 'Hi' puts cursor at 2, tab moves to 8, 'World' puts cursor at 13
			expect(buffer?.cursorX).toBe(13);
		});
	});

	describe('ANSI escape sequences', () => {
		it('should handle cursor up (CSI A)', () => {
			const terminal = createTerminal(world);
			terminal.write('\n\n\n'); // Move to row 3
			terminal.write('\x1b[2A'); // Move up 2 rows

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorY).toBe(1);
		});

		it('should handle cursor down (CSI B)', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[3B'); // Move down 3 rows

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorY).toBe(3);
		});

		it('should handle cursor forward (CSI C)', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[5C'); // Move right 5 columns

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(5);
		});

		it('should handle cursor back (CSI D)', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello\x1b[3D'); // Write "Hello", move back 3

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(2);
		});

		it('should handle cursor position (CSI H)', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[10;20H'); // Move to row 10, column 20

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorY).toBe(9); // 0-indexed
			expect(buffer?.cursorX).toBe(19); // 0-indexed
		});

		it('should handle cursor horizontal absolute (CSI G)', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello\x1b[10G'); // Move to column 10

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(9); // 0-indexed
		});

		it('should handle erase in display (CSI J)', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello');
			terminal.write('\x1b[2J'); // Clear entire display

			const cells = getTerminalCells(terminal.eid);
			expect(cells?.[0]?.char).toBe(' ');
			expect(cells?.[1]?.char).toBe(' ');
		});

		it('should handle erase in line (CSI K)', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello World');
			terminal.write('\x1b[5G'); // Move to column 5
			terminal.write('\x1b[K'); // Erase to end of line

			const cells = getTerminalCells(terminal.eid);
			expect(cells?.[0]?.char).toBe('H');
			expect(cells?.[4]?.char).toBe(' '); // Erased
		});

		it('should handle SGR reset (CSI 0m)', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[1;31mRed\x1b[0m');

			const state = getTerminalState(terminal.eid);
			// After reset, current attr should be default
			expect(state?.currentAttr.fg.type).toBe(0); // DEFAULT
			expect(state?.currentAttr.styles).toBe(0); // NONE
		});

		it('should handle basic foreground colors', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[31mR\x1b[32mG\x1b[34mB');

			const cells = getTerminalCells(terminal.eid);
			// Check that different colors were applied
			expect(cells?.[0]?.fg).not.toBe(cells?.[1]?.fg);
			expect(cells?.[1]?.fg).not.toBe(cells?.[2]?.fg);
		});

		it('should handle cursor show/hide', () => {
			const terminal = createTerminal(world);

			terminal.write('\x1b[?25l'); // Hide cursor
			let buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorVisible).toBe(false);

			terminal.write('\x1b[?25h'); // Show cursor
			buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorVisible).toBe(true);
		});

		it('should handle save/restore cursor', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[5;10H'); // Move to 5,10
			terminal.write('\x1b[s'); // Save
			terminal.write('\x1b[1;1H'); // Move to 1,1
			terminal.write('\x1b[u'); // Restore

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorY).toBe(4); // 0-indexed from row 5
			expect(buffer?.cursorX).toBe(9); // 0-indexed from column 10
		});
	});

	describe('clear and reset', () => {
		it('should clear the terminal', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello World');
			terminal.clear();

			const cells = getTerminalCells(terminal.eid);
			const buffer = getTerminalBuffer(terminal.eid);

			expect(cells?.[0]?.char).toBe(' ');
			expect(buffer?.cursorX).toBe(0);
			expect(buffer?.cursorY).toBe(0);
		});

		it('should reset the terminal', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[31mColored text');
			terminal.reset();

			const state = getTerminalState(terminal.eid);
			const buffer = getTerminalBuffer(terminal.eid);

			expect(state?.currentAttr.fg.type).toBe(0); // DEFAULT
			expect(buffer?.cursorX).toBe(0);
			expect(buffer?.cursorY).toBe(0);
			expect(buffer?.cursorVisible).toBe(true);
		});
	});

	describe('scrolling', () => {
		it('should scroll up', () => {
			const terminal = createTerminal(world);
			// Fill some lines
			for (let i = 0; i < 30; i++) {
				terminal.writeln(`Line ${i}`);
			}

			terminal.scrollUp(5);
			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.scrollOffset).toBe(5);
		});

		it('should scroll down', () => {
			const terminal = createTerminal(world);
			// Fill some lines
			for (let i = 0; i < 30; i++) {
				terminal.writeln(`Line ${i}`);
			}

			terminal.scrollUp(10);
			const afterUp = getTerminalBuffer(terminal.eid)?.scrollOffset ?? 0;
			terminal.scrollDown(3);

			const buffer = getTerminalBuffer(terminal.eid);
			// Should have decreased by 3
			expect(buffer?.scrollOffset).toBe(afterUp - 3);
		});

		it('should scroll to top', () => {
			const terminal = createTerminal(world);
			// Fill some lines
			for (let i = 0; i < 30; i++) {
				terminal.writeln(`Line ${i}`);
			}

			terminal.scrollToTop();
			const buffer = getTerminalBuffer(terminal.eid);
			// Scroll offset should be at max (scrollback lines)
			expect(buffer?.scrollOffset).toBeGreaterThan(0);
		});

		it('should scroll to bottom', () => {
			const terminal = createTerminal(world);
			// Fill some lines
			for (let i = 0; i < 30; i++) {
				terminal.writeln(`Line ${i}`);
			}

			terminal.scrollToTop();
			terminal.scrollToBottom();

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.scrollOffset).toBe(0);
		});
	});

	describe('cursor methods', () => {
		it('should set cursor position', () => {
			const terminal = createTerminal(world);
			terminal.setCursor(10, 5);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(10);
			expect(buffer?.cursorY).toBe(5);
		});

		it('should show cursor', () => {
			const terminal = createTerminal(world);
			terminal.hideCursor();
			terminal.showCursor();

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorVisible).toBe(true);
		});

		it('should hide cursor', () => {
			const terminal = createTerminal(world);
			terminal.hideCursor();

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorVisible).toBe(false);
		});
	});

	describe('resize', () => {
		it('should resize the terminal buffer', () => {
			const terminal = createTerminal(world, { width: 80, height: 24 });
			terminal.resize(120, 40);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.width).toBe(120);
			expect(buffer?.height).toBe(40);
		});

		it('should clamp cursor on resize', () => {
			const terminal = createTerminal(world, { width: 80, height: 24 });
			terminal.setCursor(70, 20);
			terminal.resize(40, 10);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(39);
			expect(buffer?.cursorY).toBe(9);
		});
	});

	describe('state access', () => {
		it('should get dimensions', () => {
			const terminal = createTerminal(world, { width: 100, height: 30 });
			const dims = terminal.getDimensions();

			expect(dims.width).toBe(100);
			expect(dims.height).toBe(30);
		});

		it('should get cursor position', () => {
			const terminal = createTerminal(world);
			terminal.write('Hello');
			terminal.write('\n');
			terminal.write('World');

			const cursor = terminal.getCursor();
			expect(cursor.x).toBe(5); // After "World"
			expect(cursor.y).toBe(1); // Second line
		});

		it('should get state', () => {
			const terminal = createTerminal(world);
			const state = terminal.getState();

			expect(state).toBeDefined();
			expect(state?.buffer).toBeDefined();
			expect(state?.scrollback).toBeDefined();
		});

		it('should get cells', () => {
			const terminal = createTerminal(world);
			terminal.write('Test');

			const cells = terminal.getCells();
			expect(cells).toBeDefined();
			expect(cells?.length).toBeGreaterThan(0);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			const terminal = createTerminal(world);
			const eid = terminal.eid;

			terminal.destroy();

			expect(isTerminal(world, eid)).toBe(false);
			expect(hasTerminalBuffer(eid)).toBe(false);
		});

		it('should refresh the widget', () => {
			const terminal = createTerminal(world);
			const result = terminal.refresh();

			expect(result).toBe(terminal); // Chainable
		});
	});

	describe('PTY (mocked)', () => {
		it('should report not running when no PTY', () => {
			const terminal = createTerminal(world);
			expect(terminal.isRunning()).toBe(false);
		});

		it('should handle input when no PTY gracefully', () => {
			const terminal = createTerminal(world);
			// Should not throw
			terminal.input('test');
		});

		it('should handle kill when no PTY gracefully', () => {
			const terminal = createTerminal(world);
			// Should not throw
			terminal.kill();
		});
	});

	describe('handleTerminalKey', () => {
		it('should handle scroll keys when PTY not running', () => {
			const terminal = createTerminal(world, { height: 24 });
			// Fill terminal so there's scrollback
			for (let i = 0; i < 50; i++) {
				terminal.writeln(`Line ${i}`);
			}

			// Page up
			const handled = handleTerminalKey(terminal, 'pageup');
			expect(handled).toBe(true);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.scrollOffset).toBeGreaterThan(0);
		});

		it('should handle ctrl+home to scroll to top', () => {
			const terminal = createTerminal(world);
			for (let i = 0; i < 50; i++) {
				terminal.writeln(`Line ${i}`);
			}

			handleTerminalKey(terminal, 'home', undefined, true);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.scrollOffset).toBeGreaterThan(0);
		});

		it('should handle ctrl+end to scroll to bottom', () => {
			const terminal = createTerminal(world);
			for (let i = 0; i < 50; i++) {
				terminal.writeln(`Line ${i}`);
			}

			terminal.scrollToTop();
			handleTerminalKey(terminal, 'end', undefined, true);

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.scrollOffset).toBe(0);
		});
	});

	describe('chainable API', () => {
		it('should support method chaining', () => {
			const terminal = createTerminal(world);

			const result = terminal
				.write('Hello ')
				.writeln('World')
				.clear()
				.setCursor(0, 0)
				.showCursor()
				.refresh();

			expect(result).toBe(terminal);
		});
	});
});

describe('TerminalBuffer Component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetTerminalBufferStore();
	});

	afterEach(() => {
		resetTerminalBufferStore();
	});

	describe('line wrapping', () => {
		it('should wrap lines at terminal width', () => {
			const terminal = createTerminal(world, { width: 10, height: 5 });

			// Write more than 10 characters
			terminal.write('ABCDEFGHIJ12345');

			const buffer = getTerminalBuffer(terminal.eid);
			expect(buffer?.cursorX).toBe(5); // After wrapping
			expect(buffer?.cursorY).toBe(1); // Second line
		});
	});

	describe('scrolling on overflow', () => {
		it('should scroll when cursor goes past bottom', () => {
			const terminal = createTerminal(world, { width: 80, height: 5 });

			// Write 6 lines (more than height)
			for (let i = 0; i < 6; i++) {
				terminal.writeln(`Line ${i}`);
			}

			const buffer = getTerminalBuffer(terminal.eid);
			// Cursor should be on last visible row
			expect(buffer?.cursorY).toBe(4);
		});
	});

	describe('256-color support', () => {
		it('should handle 256-color foreground', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[38;5;196mRed'); // Color 196 is bright red

			const state = getTerminalState(terminal.eid);
			expect(state?.currentAttr.fg.type).toBe(2); // COLOR_256
			expect(state?.currentAttr.fg.value).toBe(196);
		});

		it('should handle 256-color background', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[48;5;21mBlue'); // Color 21 is blue

			const state = getTerminalState(terminal.eid);
			expect(state?.currentAttr.bg.type).toBe(2); // COLOR_256
			expect(state?.currentAttr.bg.value).toBe(21);
		});
	});

	describe('RGB color support', () => {
		it('should handle RGB foreground', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[38;2;255;128;64mOrange');

			const state = getTerminalState(terminal.eid);
			expect(state?.currentAttr.fg.type).toBe(3); // RGB
			// Packed as (255 << 16) | (128 << 8) | 64
			expect(state?.currentAttr.fg.value).toBe((255 << 16) | (128 << 8) | 64);
		});

		it('should handle RGB background', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[48;2;64;128;255mBackground');

			const state = getTerminalState(terminal.eid);
			expect(state?.currentAttr.bg.type).toBe(3); // RGB
			expect(state?.currentAttr.bg.value).toBe((64 << 16) | (128 << 8) | 255);
		});
	});

	describe('text styles', () => {
		it('should handle bold', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[1mBold');

			const state = getTerminalState(terminal.eid);
			expect((state?.currentAttr.styles ?? 0) & 1).toBe(1); // Bold is bit 0
		});

		it('should handle italic', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[3mItalic');

			const state = getTerminalState(terminal.eid);
			expect((state?.currentAttr.styles ?? 0) & 4).toBe(4); // Italic is bit 2
		});

		it('should handle underline', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[4mUnderline');

			const state = getTerminalState(terminal.eid);
			expect((state?.currentAttr.styles ?? 0) & 8).toBe(8); // Underline is bit 3
		});

		it('should handle combined styles', () => {
			const terminal = createTerminal(world);
			terminal.write('\x1b[1;3;4mBoldItalicUnderline');

			const state = getTerminalState(terminal.eid);
			// Bold (1) | Italic (4) | Underline (8) = 13
			expect((state?.currentAttr.styles ?? 0) & 13).toBe(13);
		});
	});

	describe('PTY configuration', () => {
		it('should accept PTY options as string', () => {
			const terminal = createTerminal(world);
			// String option should work (if node-pty is installed)
			// This tests the type system, actual PTY spawn requires node-pty
			expect(() => terminal.spawn('/bin/sh')).not.toThrow();
		});

		it('should accept PTY options as object', () => {
			const terminal = createTerminal(world);
			// Object option should work (if node-pty is installed)
			expect(() =>
				terminal.spawn({
					shell: '/bin/bash',
					args: ['--login'],
					env: { TEST_VAR: 'value' },
					cwd: '/tmp',
					term: 'xterm-256color',
					cols: 80,
					rows: 24,
					autoResize: true,
				}),
			).not.toThrow();
		});

		it('should expose PTY handle', () => {
			const terminal = createTerminal(world);
			expect(terminal.getPtyHandle()).toBeNull();
		});

		it('should report PTY running state', () => {
			const terminal = createTerminal(world);
			expect(terminal.isRunning()).toBe(false);
		});
	});
});
