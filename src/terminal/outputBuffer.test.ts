/**
 * Tests for OutputBuffer
 */

import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cursor, style } from './ansi';
import { OutputBuffer } from './outputBuffer';

describe('OutputBuffer', () => {
	let buffer: OutputBuffer;
	let output: PassThrough;
	let written: string;

	beforeEach(() => {
		buffer = new OutputBuffer();
		written = '';
		output = new PassThrough();
		output.on('data', (chunk) => {
			written += chunk.toString();
		});
	});

	describe('write', () => {
		it('accumulates written data', () => {
			buffer.write('Hello');
			buffer.write(' ');
			buffer.write('World');
			expect(buffer.getContents()).toBe('Hello World');
		});

		it('ignores empty writes', () => {
			buffer.write('');
			expect(buffer.isEmpty).toBe(true);
		});

		it('tracks length correctly', () => {
			buffer.write('Hello');
			expect(buffer.length).toBe(5);
			buffer.write(' World');
			expect(buffer.length).toBe(11);
		});
	});

	describe('writeln', () => {
		it('appends newline after data', () => {
			buffer.writeln('Line 1');
			buffer.writeln('Line 2');
			expect(buffer.getContents()).toBe('Line 1\nLine 2\n');
		});
	});

	describe('writeAt', () => {
		it('moves cursor and writes data', () => {
			buffer.writeAt(10, 5, 'Hello');
			expect(buffer.getContents()).toBe('\x1b[5;10HHello');
		});
	});

	describe('flush', () => {
		it('writes all data to stream', () => {
			buffer.write('Hello');
			buffer.write(' World');
			buffer.flush(output);
			expect(written).toBe('Hello World');
		});

		it('clears buffer after flush', () => {
			buffer.write('Hello');
			buffer.flush(output);
			expect(buffer.isEmpty).toBe(true);
		});

		it('does nothing if buffer is empty', () => {
			const spy = vi.spyOn(output, 'write');
			buffer.flush(output);
			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe('clear', () => {
		it('discards buffer contents', () => {
			buffer.write('Hello');
			buffer.clear();
			expect(buffer.isEmpty).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('returns true for empty buffer', () => {
			expect(buffer.isEmpty).toBe(true);
		});

		it('returns false after write', () => {
			buffer.write('x');
			expect(buffer.isEmpty).toBe(false);
		});
	});

	describe('chunkCount', () => {
		it('tracks number of chunks', () => {
			expect(buffer.chunkCount).toBe(0);
			buffer.write('a');
			expect(buffer.chunkCount).toBe(1);
			buffer.write('b');
			expect(buffer.chunkCount).toBe(2);
		});
	});
});

describe('OutputBuffer cursor tracking', () => {
	let buffer: OutputBuffer;

	beforeEach(() => {
		buffer = new OutputBuffer({ trackCursor: true });
	});

	describe('initial position', () => {
		it('starts at (1, 1)', () => {
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(1);
		});
	});

	describe('regular characters', () => {
		it('increments X for printable characters', () => {
			buffer.write('Hello');
			expect(buffer.cursorX).toBe(6);
			expect(buffer.cursorY).toBe(1);
		});

		it('handles newline', () => {
			buffer.write('Hello\n');
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(2);
		});

		it('handles carriage return', () => {
			buffer.write('Hello\r');
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(1);
		});

		it('handles tab', () => {
			buffer.write('\t');
			expect(buffer.cursorX).toBe(9);
			buffer.write('ab\t');
			expect(buffer.cursorX).toBe(17);
		});

		it('handles backspace', () => {
			buffer.write('Hello\b');
			expect(buffer.cursorX).toBe(5);
		});

		it('backspace does not go below 1', () => {
			buffer.write('\b\b\b');
			expect(buffer.cursorX).toBe(1);
		});
	});

	describe('cursor movement sequences', () => {
		it('handles cursor move (CUP)', () => {
			buffer.write(cursor.move(10, 5));
			expect(buffer.cursorX).toBe(10);
			expect(buffer.cursorY).toBe(5);
		});

		it('handles cursor up (CUU)', () => {
			buffer.write(cursor.move(5, 10));
			buffer.write(cursor.up(3));
			expect(buffer.cursorY).toBe(7);
		});

		it('handles cursor down (CUD)', () => {
			buffer.write(cursor.down(5));
			expect(buffer.cursorY).toBe(6);
		});

		it('handles cursor forward (CUF)', () => {
			buffer.write(cursor.forward(10));
			expect(buffer.cursorX).toBe(11);
		});

		it('handles cursor back (CUB)', () => {
			buffer.write(cursor.move(10, 1));
			buffer.write(cursor.back(3));
			expect(buffer.cursorX).toBe(7);
		});

		it('handles cursor next line (CNL)', () => {
			buffer.write(cursor.move(10, 5));
			buffer.write(cursor.nextLine(2));
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(7);
		});

		it('handles cursor prev line (CPL)', () => {
			buffer.write(cursor.move(10, 5));
			buffer.write(cursor.prevLine(2));
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(3);
		});

		it('handles cursor column (CHA)', () => {
			buffer.write(cursor.column(25));
			expect(buffer.cursorX).toBe(25);
		});

		it('handles cursor home', () => {
			buffer.write(cursor.move(10, 5));
			buffer.write(cursor.home());
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(1);
		});
	});

	describe('SGR sequences', () => {
		it('does not affect cursor position', () => {
			buffer.write(style.bold());
			buffer.write(style.fg('red'));
			buffer.write(style.bg('blue'));
			buffer.write(style.reset());
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(1);
		});
	});

	describe('combined sequences', () => {
		it('tracks cursor through mixed content', () => {
			buffer.write(cursor.move(5, 3));
			buffer.write('Hello');
			buffer.write(cursor.down(2));
			buffer.write(cursor.column(1));
			buffer.write('World');
			expect(buffer.cursorX).toBe(6);
			expect(buffer.cursorY).toBe(5);
		});
	});

	describe('cursorPosition', () => {
		it('returns position object', () => {
			buffer.write(cursor.move(10, 5));
			expect(buffer.cursorPosition).toEqual({ x: 10, y: 5 });
		});
	});

	describe('resetCursor', () => {
		it('resets to default position', () => {
			buffer.write(cursor.move(10, 5));
			buffer.resetCursor();
			expect(buffer.cursorX).toBe(1);
			expect(buffer.cursorY).toBe(1);
		});

		it('resets to specified position', () => {
			buffer.resetCursor(15, 8);
			expect(buffer.cursorX).toBe(15);
			expect(buffer.cursorY).toBe(8);
		});
	});

	describe('cursor tracking disabled', () => {
		it('does not track cursor when disabled', () => {
			const noTrack = new OutputBuffer({ trackCursor: false });
			noTrack.write(cursor.move(10, 5));
			noTrack.write('Hello');
			// Position remains at initial values
			expect(noTrack.cursorX).toBe(1);
			expect(noTrack.cursorY).toBe(1);
		});
	});
});

describe('OutputBuffer auto-flush', () => {
	it('flushes on setImmediate when enabled', async () => {
		const output = new PassThrough();
		let written = '';
		output.on('data', (chunk) => {
			written += chunk.toString();
		});

		const buffer = new OutputBuffer({ autoFlush: true });
		buffer.setAutoFlushTarget(output);
		buffer.write('Hello');

		// Wait for setImmediate
		await new Promise((resolve) => setImmediate(resolve));

		expect(written).toBe('Hello');
		expect(buffer.isEmpty).toBe(true);
	});

	it('batches multiple writes', async () => {
		const output = new PassThrough();
		const writes: string[] = [];
		output.on('data', (chunk) => {
			writes.push(chunk.toString());
		});

		const buffer = new OutputBuffer({ autoFlush: true });
		buffer.setAutoFlushTarget(output);
		buffer.write('a');
		buffer.write('b');
		buffer.write('c');

		await new Promise((resolve) => setImmediate(resolve));

		// All writes should be combined into single flush
		expect(writes).toHaveLength(1);
		expect(writes[0]).toBe('abc');
	});

	it('does not auto-flush without target', async () => {
		const buffer = new OutputBuffer({ autoFlush: true });
		buffer.write('Hello');

		await new Promise((resolve) => setImmediate(resolve));

		expect(buffer.isEmpty).toBe(false);
	});

	it('cancels pending flush on clear', async () => {
		const output = new PassThrough();
		let written = '';
		output.on('data', (chunk) => {
			written += chunk.toString();
		});

		const buffer = new OutputBuffer({ autoFlush: true });
		buffer.setAutoFlushTarget(output);
		buffer.write('Hello');
		buffer.clear();

		await new Promise((resolve) => setImmediate(resolve));

		expect(written).toBe('');
	});
});
