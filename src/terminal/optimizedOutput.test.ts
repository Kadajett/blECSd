/**
 * Tests for Optimized Output Buffer
 *
 * @module terminal/optimizedOutput.test
 */

import { describe, expect, it } from 'vitest';
import {
	ATTR_BOLD,
	ATTR_ITALIC,
	clearBuffer,
	clearLine,
	clearScreen,
	createOutputBuffer,
	DEFAULT_COLOR,
	beginFrame,
	endFrame,
	flushToStream,
	getBufferLength,
	getContents,
	getOutputStats,
	hideCursor,
	moveCursor,
	resetBuffer,
	resetColorState,
	resetStats,
	setAttributes,
	setBackground,
	setForeground,
	setScreenSize,
	showCursor,
	writeCellAt,
	writeChar,
	writeRaw,
	writeStringAt,
} from './optimizedOutput';

// Mock writable stream for testing
function createMockStream(): { stream: { write: (data: string) => void }; output: string[] } {
	const output: string[] = [];
	return {
		stream: {
			write: (data: string) => {
				output.push(data);
			},
		},
		output,
	};
}

describe('optimizedOutput', () => {
	describe('createOutputBuffer', () => {
		it('creates a buffer with default options', () => {
			const buffer = createOutputBuffer();

			expect(buffer.chunks).toEqual([]);
			expect(buffer.cursorX).toBe(0);
			expect(buffer.cursorY).toBe(0);
			expect(buffer.cursorKnown).toBe(false);
			expect(buffer.syncMode).toBe(true);
			expect(buffer.colorState.fg).toBe(DEFAULT_COLOR);
			expect(buffer.colorState.bg).toBe(DEFAULT_COLOR);
		});

		it('respects custom options', () => {
			const buffer = createOutputBuffer({
				syncMode: false,
				trackStats: true,
			});

			expect(buffer.syncMode).toBe(false);
			expect(buffer.trackStats).toBe(true);
		});
	});

	describe('cursor movement', () => {
		it('moves cursor to position', () => {
			const buffer = createOutputBuffer();

			moveCursor(buffer, 10, 5);
			const contents = getContents(buffer);

			// ANSI cursor position is 1-indexed
			expect(contents).toBe('\x1b[6;11H');
			expect(buffer.knownCursorX).toBe(10);
			expect(buffer.knownCursorY).toBe(5);
			expect(buffer.cursorKnown).toBe(true);
		});

		it('skips move if already at position', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			moveCursor(buffer, 10, 5);
			clearBuffer(buffer);

			moveCursor(buffer, 10, 5);
			const contents = getContents(buffer);

			expect(contents).toBe('');
			expect(buffer.stats.cursorMovesSkipped).toBe(1);
		});

		it('uses optimized horizontal movement', () => {
			const buffer = createOutputBuffer();

			moveCursor(buffer, 10, 5);
			clearBuffer(buffer);

			// Move right by 1
			moveCursor(buffer, 11, 5);
			expect(getContents(buffer)).toBe('\x1b[C');
		});

		it('uses optimized vertical movement', () => {
			const buffer = createOutputBuffer();

			moveCursor(buffer, 10, 5);
			clearBuffer(buffer);

			// Move down by 1
			moveCursor(buffer, 10, 6);
			expect(getContents(buffer)).toBe('\x1b[B');
		});

		it('uses newline for start of next line', () => {
			const buffer = createOutputBuffer();

			moveCursor(buffer, 10, 5);
			clearBuffer(buffer);

			// Move to start of next line
			moveCursor(buffer, 0, 6);
			expect(getContents(buffer)).toBe('\r\n');
		});
	});

	describe('color management', () => {
		it('sets foreground color', () => {
			const buffer = createOutputBuffer();

			setForeground(buffer, 0xff0000); // Red
			const contents = getContents(buffer);

			expect(contents).toBe('\x1b[38;2;255;0;0m');
			expect(buffer.colorState.fg).toBe(0xff0000);
		});

		it('sets background color', () => {
			const buffer = createOutputBuffer();

			setBackground(buffer, 0x00ff00); // Green
			const contents = getContents(buffer);

			expect(contents).toBe('\x1b[48;2;0;255;0m');
			expect(buffer.colorState.bg).toBe(0x00ff00);
		});

		it('skips color change if already set', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			setForeground(buffer, 0xff0000);
			clearBuffer(buffer);

			setForeground(buffer, 0xff0000);
			const contents = getContents(buffer);

			expect(contents).toBe('');
			expect(buffer.stats.colorChangesSkipped).toBe(1);
		});

		it('resets color to default', () => {
			const buffer = createOutputBuffer();

			setForeground(buffer, 0xff0000);
			clearBuffer(buffer);

			setForeground(buffer, DEFAULT_COLOR);
			expect(getContents(buffer)).toBe('\x1b[39m');
		});

		it('resets color state', () => {
			const buffer = createOutputBuffer();

			setForeground(buffer, 0xff0000);
			setBackground(buffer, 0x00ff00);
			clearBuffer(buffer);

			resetColorState(buffer);
			expect(getContents(buffer)).toContain('\x1b[0m');
			expect(buffer.colorState.fg).toBe(DEFAULT_COLOR);
			expect(buffer.colorState.bg).toBe(DEFAULT_COLOR);
		});
	});

	describe('text attributes', () => {
		it('sets bold attribute', () => {
			const buffer = createOutputBuffer();

			setAttributes(buffer, ATTR_BOLD);
			expect(getContents(buffer)).toBe('\x1b[1m');
			expect(buffer.colorState.attrs).toBe(ATTR_BOLD);
		});

		it('sets multiple attributes', () => {
			const buffer = createOutputBuffer();

			setAttributes(buffer, ATTR_BOLD | ATTR_ITALIC);
			const contents = getContents(buffer);

			expect(contents).toContain('\x1b[1m');
			expect(contents).toContain('\x1b[3m');
		});

		it('skips if attributes unchanged', () => {
			const buffer = createOutputBuffer();

			setAttributes(buffer, ATTR_BOLD);
			clearBuffer(buffer);

			setAttributes(buffer, ATTR_BOLD);
			expect(getContents(buffer)).toBe('');
		});

		it('resets when removing attributes', () => {
			const buffer = createOutputBuffer();

			setAttributes(buffer, ATTR_BOLD | ATTR_ITALIC);
			clearBuffer(buffer);

			setAttributes(buffer, ATTR_BOLD);
			const contents = getContents(buffer);

			// Should reset and re-apply
			expect(contents).toContain('\x1b[0m');
			expect(contents).toContain('\x1b[1m');
		});
	});

	describe('character output', () => {
		it('writes character and updates cursor', () => {
			const buffer = createOutputBuffer();

			moveCursor(buffer, 0, 0);
			writeChar(buffer, 'A');

			expect(getContents(buffer)).toContain('A');
			expect(buffer.knownCursorX).toBe(1);
		});

		it('handles line wrap', () => {
			const buffer = createOutputBuffer();
			setScreenSize(buffer, 80, 24);

			moveCursor(buffer, 79, 0);
			writeChar(buffer, 'A');

			expect(buffer.knownCursorX).toBe(0);
			expect(buffer.knownCursorY).toBe(1);
		});
	});

	describe('cell and string output', () => {
		it('writes cell at position with colors', () => {
			const buffer = createOutputBuffer();

			writeCellAt(buffer, 10, 5, 'X', 0xff0000, 0x000000);
			const contents = getContents(buffer);

			expect(contents).toContain('\x1b[6;11H'); // Cursor position
			expect(contents).toContain('\x1b[38;2;255;0;0m'); // Foreground
			expect(contents).toContain('\x1b[48;2;0;0;0m'); // Background
			expect(contents).toContain('X');
		});

		it('writes string at position', () => {
			const buffer = createOutputBuffer();

			writeStringAt(buffer, 5, 3, 'Hello', 0xffffff);
			const contents = getContents(buffer);

			expect(contents).toContain('Hello');
			expect(buffer.knownCursorX).toBe(10); // 5 + 5 chars
		});
	});

	describe('synchronized output', () => {
		it('begins and ends sync frame', () => {
			const buffer = createOutputBuffer({ syncMode: true });

			beginFrame(buffer);
			expect(buffer.inSyncFrame).toBe(true);
			expect(getContents(buffer)).toContain('\x1b[?2026h');

			endFrame(buffer);
			expect(buffer.inSyncFrame).toBe(false);
			expect(getContents(buffer)).toContain('\x1b[?2026l');
		});

		it('skips sync when disabled', () => {
			const buffer = createOutputBuffer({ syncMode: false });

			beginFrame(buffer);
			expect(buffer.inSyncFrame).toBe(false);
			expect(getContents(buffer)).toBe('');
		});
	});

	describe('buffer management', () => {
		it('clears buffer without affecting state', () => {
			const buffer = createOutputBuffer();

			writeChar(buffer, 'A');
			buffer.knownCursorX = 10;
			clearBuffer(buffer);

			expect(getContents(buffer)).toBe('');
			expect(buffer.knownCursorX).toBe(10);
		});

		it('resets buffer completely', () => {
			const buffer = createOutputBuffer();

			writeChar(buffer, 'A');
			buffer.knownCursorX = 10;
			buffer.colorState.fg = 0xff0000;
			resetBuffer(buffer);

			expect(getContents(buffer)).toBe('');
			expect(buffer.knownCursorX).toBe(0);
			expect(buffer.colorState.fg).toBe(DEFAULT_COLOR);
		});

		it('flushes to stream', () => {
			const buffer = createOutputBuffer();
			const { stream, output } = createMockStream();

			writeChar(buffer, 'A');
			writeChar(buffer, 'B');
			flushToStream(buffer, stream as unknown as import('node:stream').Writable);

			expect(output.length).toBe(1);
			expect(output[0]).toBe('AB');
			expect(buffer.chunks.length).toBe(0);
		});

		it('gets buffer length', () => {
			const buffer = createOutputBuffer();

			writeChar(buffer, 'A');
			writeChar(buffer, 'BC');

			expect(getBufferLength(buffer)).toBe(3);
		});
	});

	describe('screen operations', () => {
		it('hides and shows cursor', () => {
			const buffer = createOutputBuffer();

			hideCursor(buffer);
			expect(getContents(buffer)).toContain('\x1b[?25l');

			clearBuffer(buffer);
			showCursor(buffer);
			expect(getContents(buffer)).toContain('\x1b[?25h');
		});

		it('clears screen', () => {
			const buffer = createOutputBuffer();

			clearScreen(buffer);
			expect(getContents(buffer)).toBe('\x1b[2J');
			expect(buffer.cursorKnown).toBe(false);
		});

		it('clears line', () => {
			const buffer = createOutputBuffer();

			clearLine(buffer);
			expect(getContents(buffer)).toBe('\x1b[2K');
		});
	});

	describe('raw output', () => {
		it('writes raw content without optimization', () => {
			const buffer = createOutputBuffer();

			buffer.cursorKnown = true;
			writeRaw(buffer, '\x1b[?1049h');

			expect(getContents(buffer)).toBe('\x1b[?1049h');
			expect(buffer.cursorKnown).toBe(false);
		});
	});

	describe('statistics', () => {
		it('tracks statistics when enabled', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			moveCursor(buffer, 10, 5);
			moveCursor(buffer, 10, 5); // Skip
			setForeground(buffer, 0xff0000);
			setForeground(buffer, 0xff0000); // Skip
			writeChar(buffer, 'A');

			const stats = getOutputStats(buffer);
			expect(stats.cursorMoves).toBe(1);
			expect(stats.cursorMovesSkipped).toBe(1);
			expect(stats.colorChanges).toBe(1);
			expect(stats.colorChangesSkipped).toBe(1);
			expect(stats.cellsWritten).toBe(1);
		});

		it('resets statistics', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			writeChar(buffer, 'A');
			expect(buffer.stats.cellsWritten).toBe(1);

			resetStats(buffer);
			expect(buffer.stats.cellsWritten).toBe(0);
		});
	});

	describe('optimization effectiveness', () => {
		it('avoids redundant color changes in sequence', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			// Write multiple cells with same color
			for (let i = 0; i < 10; i++) {
				writeCellAt(buffer, i, 0, 'X', 0xff0000, 0x000000);
			}

			// Should only have 1 color change
			expect(buffer.stats.colorChanges).toBe(2); // fg + bg once
			expect(buffer.stats.colorChangesSkipped).toBe(18); // 9 skipped for each color
		});

		it('uses sequential cursor positioning', () => {
			const buffer = createOutputBuffer({ trackStats: true });

			// Write sequential cells
			moveCursor(buffer, 0, 0);
			writeChar(buffer, 'A'); // Cursor now at 1, 0
			writeChar(buffer, 'B'); // Cursor now at 2, 0
			writeChar(buffer, 'C'); // Cursor now at 3, 0

			// Should have 1 initial move, and cursor follows naturally
			expect(buffer.stats.cursorMoves).toBe(1);
		});
	});
});
