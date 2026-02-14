/**
 * Tests for Output System
 */

import { Writable } from 'node:stream';
import { beforeEach, describe, expect, it } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { CellChange } from '../terminal/screen/cell';
import { Attr, createCell, setCell } from '../terminal/screen/cell';
import {
	createDoubleBuffer,
	getBackBuffer,
	markDirtyRegion,
} from '../terminal/screen/doubleBuffer';
import {
	cleanup,
	clearOutputBuffer,
	clearOutputStream,
	clearScreen,
	clearStyleCache,
	createOutputState,
	createOutputSystem,
	cursorHome,
	enterAlternateScreen,
	generateOutput,
	getOutputBuffer,
	getOutputState,
	getOutputStream,
	hideCursor,
	leaveAlternateScreen,
	outputSystem,
	resetAttributes,
	resetOutputState,
	setOutputBuffer,
	setOutputStream,
	showCursor,
	writeRaw,
} from './outputSystem';

/**
 * Creates a mock writable stream for testing.
 */
function createMockStream(): { stream: Writable; output: string[] } {
	const output: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			output.push(chunk.toString());
			callback();
		},
	});
	return { stream, output };
}

describe('outputSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		clearOutputStream();
		clearOutputBuffer();
		resetOutputState();
	});

	describe('createOutputState', () => {
		it('creates initial state with default values', () => {
			const state = createOutputState();

			expect(state.lastX).toBe(-1);
			expect(state.lastY).toBe(-1);
			expect(state.lastFg).toBe(-1);
			expect(state.lastBg).toBe(-1);
			expect(state.lastAttrs).toBe(-1);
			expect(state.alternateScreen).toBe(false);
		});
	});

	describe('setOutputStream / getOutputStream', () => {
		it('sets and gets the output stream', () => {
			const { stream } = createMockStream();
			setOutputStream(stream);

			expect(getOutputStream()).toBe(stream);
		});

		it('clears the output stream', () => {
			const { stream } = createMockStream();
			setOutputStream(stream);
			clearOutputStream();

			expect(getOutputStream()).toBeNull();
		});
	});

	describe('setOutputBuffer / getOutputBuffer', () => {
		it('sets and gets the output buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setOutputBuffer(db);

			expect(getOutputBuffer()).toBe(db);
		});

		it('clears the output buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setOutputBuffer(db);
			clearOutputBuffer();

			expect(getOutputBuffer()).toBeNull();
		});
	});

	describe('getOutputState', () => {
		it('returns or creates output state', () => {
			const state1 = getOutputState();
			const state2 = getOutputState();

			expect(state1).toBe(state2);
		});
	});

	describe('resetOutputState', () => {
		it('resets output state to initial values', () => {
			const state = getOutputState();
			state.lastX = 10;
			state.lastY = 5;

			resetOutputState();

			const newState = getOutputState();
			expect(newState.lastX).toBe(-1);
			expect(newState.lastY).toBe(-1);
		});
	});

	describe('generateOutput', () => {
		it('generates output for cell changes', () => {
			const state = createOutputState();
			const changes: CellChange[] = [
				{ x: 10, y: 5, cell: createCell('A', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes);

			// Should contain cursor move and character
			expect(output).toContain('\x1b['); // CSI
			expect(output).toContain('A');
		});

		it('generates empty output for no changes', () => {
			const state = createOutputState();
			const changes: CellChange[] = [];

			const output = generateOutput(world, state, changes);

			expect(output).toBe('');
		});

		it('sorts changes by row then column', () => {
			const state = createOutputState();
			// Use characters that don't appear in ANSI escape sequences
			const changes: CellChange[] = [
				{ x: 20, y: 10, cell: createCell('Z', 0xffffffff, 0xff000000) },
				{ x: 10, y: 5, cell: createCell('X', 0xffffffff, 0xff000000) },
				{ x: 15, y: 5, cell: createCell('Y', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes);

			// Characters should appear in sorted order (X at row 5, Y at row 5, Z at row 10)
			const xIndex = output.indexOf('X');
			const yIndex = output.indexOf('Y');
			const zIndex = output.indexOf('Z');

			expect(xIndex).toBeLessThan(yIndex);
			expect(yIndex).toBeLessThan(zIndex);
		});

		it('optimizes cursor movement for adjacent cells', () => {
			const state = createOutputState();
			const changes: CellChange[] = [
				{ x: 10, y: 5, cell: createCell('A', 0xffffffff, 0xff000000) },
				{ x: 11, y: 5, cell: createCell('B', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes);

			// Should only have one cursor move sequence
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const moveCount = (output.match(/\x1b\[\d+;\d+H/g) || []).length;
			expect(moveCount).toBe(1);
		});

		it('generates color sequences', () => {
			const state = createOutputState();
			// Red text on blue background
			const changes: CellChange[] = [{ x: 0, y: 0, cell: createCell('X', 0xffff0000, 0xff0000ff) }];

			const output = generateOutput(world, state, changes);

			// Should contain color escape sequences
			expect(output).toContain('\x1b[38;2;'); // Foreground RGB
			expect(output).toContain('\x1b[48;2;'); // Background RGB
		});

		it('generates attribute sequences', () => {
			const state = createOutputState();
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('X', 0xffffffff, 0xff000000, Attr.BOLD) },
			];

			const output = generateOutput(world, state, changes);

			// Should contain bold sequence
			expect(output).toContain('\x1b[1m');
		});

		it('reuses colors when unchanged', () => {
			const state = createOutputState();
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffffffff, 0xff000000) },
				{ x: 1, y: 0, cell: createCell('B', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes);

			// Should only have one foreground and one background sequence
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const fgCount = (output.match(/\x1b\[38;2;/g) || []).length;
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const bgCount = (output.match(/\x1b\[48;2;/g) || []).length;
			expect(fgCount).toBe(1);
			expect(bgCount).toBe(1);
		});
	});

	describe('outputSystem', () => {
		it('does nothing without output stream', () => {
			const db = createDoubleBuffer(80, 24);
			setOutputBuffer(db);
			// No stream set

			expect(() => outputSystem(world)).not.toThrow();
		});

		it('does nothing without output buffer', () => {
			const { stream } = createMockStream();
			setOutputStream(stream);
			// No buffer set

			expect(() => outputSystem(world)).not.toThrow();
		});

		it('writes changes to output stream', () => {
			const { stream, output } = createMockStream();
			const db = createDoubleBuffer(80, 24);

			setOutputStream(stream);
			setOutputBuffer(db);

			// Add a cell to the back buffer
			const back = getBackBuffer(db);
			setCell(back, 10, 5, createCell('X', 0xffffffff, 0xff000000));
			markDirtyRegion(db, 10, 5, 1, 1);

			outputSystem(world);

			expect(output.length).toBeGreaterThan(0);
			expect(output[0]).toContain('X');
		});

		it('swaps buffers after output', () => {
			const { stream } = createMockStream();
			const db = createDoubleBuffer(80, 24);

			setOutputStream(stream);
			setOutputBuffer(db);

			const backBefore = getBackBuffer(db);
			setCell(backBefore, 10, 5, createCell('X', 0xffffffff, 0xff000000));
			markDirtyRegion(db, 10, 5, 1, 1);

			outputSystem(world);

			// After swap, the original back buffer is now front
			const backAfter = getBackBuffer(db);
			expect(backAfter).not.toBe(backBefore);
		});
	});

	describe('createOutputSystem', () => {
		it('creates a working output system', () => {
			const { stream, output } = createMockStream();
			const db = createDoubleBuffer(80, 24);

			setOutputStream(stream);
			setOutputBuffer(db);

			const system = createOutputSystem();

			const back = getBackBuffer(db);
			setCell(back, 10, 5, createCell('Y', 0xffffffff, 0xff000000));
			markDirtyRegion(db, 10, 5, 1, 1);

			system(world);

			expect(output.length).toBeGreaterThan(0);
			expect(output[0]).toContain('Y');
		});
	});

	describe('writeRaw', () => {
		it('writes raw data to stream', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			writeRaw('test data');

			expect(output).toContain('test data');
		});

		it('does nothing without stream', () => {
			clearOutputStream();
			expect(() => writeRaw('test')).not.toThrow();
		});
	});

	describe('cursor control', () => {
		it('hideCursor writes escape sequence', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			hideCursor();

			expect(output.join('')).toContain('\x1b[?25l');
		});

		it('showCursor writes escape sequence', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			showCursor();

			expect(output.join('')).toContain('\x1b[?25h');
		});

		it('cursorHome moves cursor and updates state', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);
			const state = getOutputState();
			state.lastX = 10;
			state.lastY = 5;

			cursorHome();

			expect(output.join('')).toContain('\x1b[H');
			expect(state.lastX).toBe(0);
			expect(state.lastY).toBe(0);
		});
	});

	describe('screen control', () => {
		it('enterAlternateScreen writes sequence and updates state', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			enterAlternateScreen();

			expect(output.join('')).toContain('\x1b[?1049h');
			expect(getOutputState().alternateScreen).toBe(true);
		});

		it('leaveAlternateScreen writes sequence and updates state', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);
			getOutputState().alternateScreen = true;

			leaveAlternateScreen();

			expect(output.join('')).toContain('\x1b[?1049l');
			expect(getOutputState().alternateScreen).toBe(false);
		});

		it('clearScreen writes escape sequence', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			clearScreen();

			expect(output.join('')).toContain('\x1b[2J');
		});
	});

	describe('resetAttributes', () => {
		it('writes reset sequence and updates state', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);
			const state = getOutputState();
			state.lastFg = 0xffffffff;
			state.lastBg = 0xff000000;
			state.lastAttrs = Attr.BOLD;

			resetAttributes();

			expect(output.join('')).toContain('\x1b[0m');
			expect(state.lastFg).toBe(-1);
			expect(state.lastBg).toBe(-1);
			expect(state.lastAttrs).toBe(-1);
		});
	});

	describe('cleanup', () => {
		it('leaves alternate screen if active', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);
			getOutputState().alternateScreen = true;

			cleanup();

			expect(output.join('')).toContain('\x1b[?1049l');
		});

		it('resets attributes and shows cursor', () => {
			const { stream, output } = createMockStream();
			setOutputStream(stream);

			cleanup();

			const combined = output.join('');
			expect(combined).toContain('\x1b[0m'); // Reset
			expect(combined).toContain('\x1b[?25h'); // Show cursor
			expect(combined).toContain('\x1b[H'); // Home
		});
	});

	describe('edge cases', () => {
		it('handles transparent colors', () => {
			const state = createOutputState();
			// Transparent alpha = 0
			const changes: CellChange[] = [{ x: 0, y: 0, cell: createCell('X', 0x00ffffff, 0x00000000) }];

			const output = generateOutput(world, state, changes);

			// Should use default color codes
			expect(output).toContain('\x1b[39m'); // Default fg
			expect(output).toContain('\x1b[49m'); // Default bg
		});

		it('handles multiple attribute combinations', () => {
			const state = createOutputState();
			const changes: CellChange[] = [
				{
					x: 0,
					y: 0,
					cell: createCell('X', 0xffffffff, 0xff000000, Attr.BOLD | Attr.UNDERLINE),
				},
			];

			const output = generateOutput(world, state, changes);

			expect(output).toContain('1'); // Bold
			expect(output).toContain('4'); // Underline
		});
	});

	describe('performance optimizations', () => {
		it('skips sorting when skipSort is true', () => {
			const state = createOutputState();
			// Provide changes in reverse order
			const changes: CellChange[] = [
				{ x: 20, y: 10, cell: createCell('Z', 0xffffffff, 0xff000000) },
				{ x: 10, y: 5, cell: createCell('X', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes, true);

			// Characters should appear in original order (Z before X) when skipSort is true
			const zIndex = output.indexOf('Z');
			const xIndex = output.indexOf('X');

			expect(zIndex).toBeLessThan(xIndex);
		});

		it('sorts when skipSort is false', () => {
			const state = createOutputState();
			// Provide changes in reverse order
			const changes: CellChange[] = [
				{ x: 20, y: 10, cell: createCell('Z', 0xffffffff, 0xff000000) },
				{ x: 10, y: 5, cell: createCell('X', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes, false);

			// Characters should appear in sorted order (X before Z) when skipSort is false
			const xIndex = output.indexOf('X');
			const zIndex = output.indexOf('Z');

			expect(xIndex).toBeLessThan(zIndex);
		});

		it('uses skipSort for full redraws in outputSystem', () => {
			const { stream, output } = createMockStream();
			const db = createDoubleBuffer(3, 2);

			setOutputStream(stream);
			setOutputBuffer(db);

			// Fill entire back buffer (this triggers fullRedraw flag)
			const back = getBackBuffer(db);
			setCell(back, 0, 0, createCell('A', 0xffffffff, 0xff000000));
			setCell(back, 1, 0, createCell('B', 0xffffffff, 0xff000000));
			setCell(back, 2, 0, createCell('C', 0xffffffff, 0xff000000));
			setCell(back, 0, 1, createCell('D', 0xffffffff, 0xff000000));
			setCell(back, 1, 1, createCell('E', 0xffffffff, 0xff000000));
			setCell(back, 2, 1, createCell('F', 0xffffffff, 0xff000000));

			// The buffer starts with fullRedraw=true
			expect(db.fullRedraw).toBe(true);

			outputSystem(world);

			// All characters should be present
			const combined = output.join('');
			expect(combined).toContain('A');
			expect(combined).toContain('B');
			expect(combined).toContain('C');
			expect(combined).toContain('D');
			expect(combined).toContain('E');
			expect(combined).toContain('F');
		});
	});

	describe('style sequence caching', () => {
		it('generates identical sequences for identical styles', () => {
			const state = createOutputState();
			clearStyleCache(world);

			// Two cells with identical styles
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 0, y: 1, cell: createCell('B', 0xffff0000, 0xff0000ff, Attr.BOLD) },
			];

			const output = generateOutput(world, state, changes);

			// Both cells should use cached style sequences
			// Count the occurrences of the style attributes
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const boldCount = (output.match(/\x1b\[1m/g) || []).length;
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const fgCount = (output.match(/\x1b\[38;2;255;0;0m/g) || []).length;

			// Should have styles for both cells
			expect(boldCount).toBeGreaterThan(0);
			expect(fgCount).toBeGreaterThan(0);
		});

		it('clears the style cache', () => {
			const state = createOutputState();
			clearStyleCache(world);

			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
			];

			// First render
			generateOutput(world, state, changes);

			// Clear cache (cache should be rebuilt on next use)
			clearStyleCache(world);

			// Second render (should rebuild cached sequences)
			const state2 = createOutputState();
			const output2 = generateOutput(world, state2, changes);

			expect(output2).toContain('\x1b[1m'); // Should still have bold
		});
	});

	describe('style run batching', () => {
		it('batches consecutive cells with identical styles', () => {
			const state = createOutputState();

			// Three consecutive cells on same row with identical styles
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 1, y: 0, cell: createCell('B', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 2, y: 0, cell: createCell('C', 0xffff0000, 0xff0000ff, Attr.BOLD) },
			];

			const output = generateOutput(world, state, changes);

			// Should contain all characters
			expect(output).toContain('A');
			expect(output).toContain('B');
			expect(output).toContain('C');

			// Should only have one cursor move (to start of run)
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const moveCount = (output.match(/\x1b\[\d+;\d+H/g) || []).length;
			expect(moveCount).toBe(1);

			// Should only have one set of style sequences (for the entire run)
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const boldCount = (output.match(/\x1b\[1m/g) || []).length;
			expect(boldCount).toBe(1);
		});

		it('breaks runs when styles change', () => {
			const state = createOutputState();

			// Two consecutive cells with different styles
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 1, y: 0, cell: createCell('B', 0xff00ff00, 0xff0000ff, Attr.BOLD) }, // Different fg
			];

			const output = generateOutput(world, state, changes);

			// Should have two different foreground color sequences
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const fgCount = (output.match(/\x1b\[38;2;/g) || []).length;
			expect(fgCount).toBe(2);
		});

		it('breaks runs when cells are not adjacent', () => {
			const state = createOutputState();

			// Two cells with same style but not adjacent
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 2, y: 0, cell: createCell('B', 0xffff0000, 0xff0000ff, Attr.BOLD) }, // Gap at x=1
			];

			const output = generateOutput(world, state, changes);

			// Should not batch due to gap (run length of 1 for each)
			// After 'A' at x=0, cursor is at x=1. Moving to x=2 (diff=1) uses implicit advance.
			// This is optimal - only 1 absolute move needed, second uses implicit advance
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const absoluteMoveCount = (output.match(/\x1b\[\d+;\d+H/g) || []).length;
			expect(absoluteMoveCount).toBe(1); // Only first cell needs absolute move

			// Both characters should be present
			expect(output).toContain('A');
			expect(output).toContain('B');
		});

		it('breaks runs when row changes', () => {
			const state = createOutputState();

			// Two cells with same style but different rows
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffff0000, 0xff0000ff, Attr.BOLD) },
				{ x: 0, y: 1, cell: createCell('B', 0xffff0000, 0xff0000ff, Attr.BOLD) },
			];

			const output = generateOutput(world, state, changes);

			// Should have two cursor moves (different rows)
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const moveCount = (output.match(/\x1b\[\d+;\d+H/g) || []).length;
			expect(moveCount).toBe(2);
		});

		it('handles long style runs efficiently', () => {
			const state = createOutputState();

			// Create 20 consecutive cells with identical styles
			const changes: CellChange[] = [];
			for (let i = 0; i < 20; i++) {
				changes.push({
					x: i,
					y: 0,
					cell: createCell(String.fromCharCode(65 + i), 0xffff0000, 0xff0000ff, Attr.BOLD),
				});
			}

			const output = generateOutput(world, state, changes);

			// Should only have one cursor move and one style sequence
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const moveCount = (output.match(/\x1b\[\d+;\d+H/g) || []).length;
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences are intentional
			const boldCount = (output.match(/\x1b\[1m/g) || []).length;

			expect(moveCount).toBe(1);
			expect(boldCount).toBe(1);

			// All characters should be present
			for (let i = 0; i < 20; i++) {
				expect(output).toContain(String.fromCharCode(65 + i));
			}
		});
	});

	describe('array-based string building', () => {
		it('builds output string efficiently', () => {
			const state = createOutputState();

			// Multiple cells to ensure array accumulation is tested
			const changes: CellChange[] = [
				{ x: 0, y: 0, cell: createCell('A', 0xffffffff, 0xff000000) },
				{ x: 5, y: 0, cell: createCell('B', 0xffffffff, 0xff000000) },
				{ x: 10, y: 1, cell: createCell('C', 0xffffffff, 0xff000000) },
			];

			const output = generateOutput(world, state, changes);

			// Should be a valid string with all characters
			expect(typeof output).toBe('string');
			expect(output).toContain('A');
			expect(output).toContain('B');
			expect(output).toContain('C');
		});
	});
});
