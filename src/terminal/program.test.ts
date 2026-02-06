/**
 * Tests for Program class
 */

import { PassThrough, Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgram, type Program, ProgramConfigSchema } from './program';

// Mock TTY streams for testing
function createMockTTYOutput(): PassThrough & { isTTY: true; columns: number; rows: number } {
	const stream = new PassThrough() as PassThrough & {
		isTTY: true;
		columns: number;
		rows: number;
	};
	stream.isTTY = true;
	stream.columns = 120;
	stream.rows = 40;
	return stream;
}

function createMockTTYInput(): Readable & { isTTY: true; setRawMode: (mode: boolean) => void } {
	const stream = new Readable({
		read() {},
	}) as Readable & { isTTY: true; setRawMode: (mode: boolean) => void };
	stream.isTTY = true;
	stream.setRawMode = vi.fn();
	return stream;
}

describe('ProgramConfigSchema', () => {
	it('accepts empty config', () => {
		const result = ProgramConfigSchema.parse({});
		expect(result.useAlternateScreen).toBe(true);
		expect(result.hideCursor).toBe(true);
	});

	it('accepts custom config', () => {
		const result = ProgramConfigSchema.parse({
			useAlternateScreen: false,
			hideCursor: false,
			title: 'Test',
		});
		expect(result.useAlternateScreen).toBe(false);
		expect(result.hideCursor).toBe(false);
		expect(result.title).toBe('Test');
	});

	it('accepts forced dimensions', () => {
		const result = ProgramConfigSchema.parse({
			forceWidth: 100,
			forceHeight: 50,
		});
		expect(result.forceWidth).toBe(100);
		expect(result.forceHeight).toBe(50);
	});
});

describe('Program', () => {
	let program: Program;
	let output: ReturnType<typeof createMockTTYOutput>;
	let input: ReturnType<typeof createMockTTYInput>;
	let written: string;

	beforeEach(() => {
		written = '';
		output = createMockTTYOutput();
		input = createMockTTYInput();
		output.on('data', (chunk) => {
			written += chunk.toString();
		});
	});

	afterEach(() => {
		if (program?.initialized) {
			program.destroy();
		}
	});

	describe('constructor', () => {
		it('creates with default config', () => {
			program = createProgram({ input, output });
			expect(program.initialized).toBe(false);
		});

		it('uses provided streams', () => {
			program = createProgram({ input, output });
			expect(program.input).toBe(input);
			expect(program.output).toBe(output);
		});
	});

	describe('init', () => {
		it('initializes the terminal', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			expect(program.initialized).toBe(true);
		});

		it('detects terminal dimensions from TTY', async () => {
			program = createProgram({ input, output });
			await program.init();
			expect(program.cols).toBe(120);
			expect(program.rows).toBe(40);
		});

		it('uses forced dimensions', async () => {
			program = createProgram({
				input,
				output,
				forceWidth: 80,
				forceHeight: 24,
			});
			await program.init();
			expect(program.cols).toBe(80);
			expect(program.rows).toBe(24);
		});

		it('enters alternate screen when configured', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: true,
				hideCursor: false,
			});
			await program.init();
			expect(written).toContain('\x1b[?1049h');
		});

		it('hides cursor when configured', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: true,
			});
			await program.init();
			expect(written).toContain('\x1b[?25l');
		});

		it('sets title when provided', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
				title: 'Test App',
			});
			await program.init();
			expect(written).toContain('\x1b]2;Test App\x07');
		});

		it('enables raw mode on input', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			expect(input.setRawMode).toHaveBeenCalledWith(true);
		});

		it('is idempotent', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			const firstWrite = written;
			await program.init();
			expect(written).toBe(firstWrite);
		});
	});

	describe('destroy', () => {
		it('restores terminal state', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: true,
				hideCursor: true,
			});
			await program.init();
			written = '';
			program.destroy();

			// Should show cursor
			expect(written).toContain('\x1b[?25h');
			// Should reset styles
			expect(written).toContain('\x1b[0m');
		});

		it('disables raw mode', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			program.destroy();
			expect(input.setRawMode).toHaveBeenCalledWith(false);
		});

		it('marks as not initialized', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			program.destroy();
			expect(program.initialized).toBe(false);
		});

		it('is idempotent', async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			program.destroy();
			const callCount = (input.setRawMode as ReturnType<typeof vi.fn>).mock.calls.length;
			program.destroy();
			// Should not call setRawMode again
			expect((input.setRawMode as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
		});
	});

	describe('write and flush', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('buffers writes', () => {
			program.write('Hello');
			expect(written).toBe('');
		});

		it('flushes buffer to output', () => {
			program.write('Hello');
			program.flush();
			expect(written).toBe('Hello');
		});

		it('combines multiple writes', () => {
			program.write('Hello');
			program.write(' ');
			program.write('World');
			program.flush();
			expect(written).toBe('Hello World');
		});
	});

	describe('rawWrite', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('writes directly to output', () => {
			program.rawWrite('Direct');
			expect(written).toBe('Direct');
		});
	});

	describe('clear', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('clears screen and moves cursor home', () => {
			program.clear();
			program.flush();
			expect(written).toContain('\x1b[2J');
			expect(written).toContain('\x1b[H');
		});
	});

	describe('move and cursorTo', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('moves cursor to position', () => {
			program.move(10, 5);
			program.flush();
			expect(written).toBe('\x1b[5;10H');
		});

		it('cursorTo is alias for move', () => {
			program.cursorTo(15, 8);
			program.flush();
			expect(written).toBe('\x1b[8;15H');
		});
	});

	describe('cursor visibility', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('shows cursor', () => {
			program.showCursor();
			program.flush();
			expect(written).toBe('\x1b[?25h');
		});

		it('hides cursor', () => {
			program.hideCursor();
			program.flush();
			expect(written).toBe('\x1b[?25l');
		});
	});

	describe('cursor position tracking', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
		});

		it('tracks cursor position', () => {
			program.move(10, 5);
			expect(program.x).toBe(10);
			expect(program.y).toBe(5);
		});

		it('tracks position through text', () => {
			program.move(1, 1);
			program.write('Hello');
			expect(program.x).toBe(6);
		});
	});

	describe('resize event', () => {
		it('emits resize event when dimensions change', async () => {
			program = createProgram({ input, output });
			await program.init();

			const resizeHandler = vi.fn();
			program.on('resize', resizeHandler);

			// Simulate resize
			output.columns = 200;
			output.rows = 50;
			output.emit('resize');

			expect(resizeHandler).toHaveBeenCalledWith({ cols: 200, rows: 50 });
			expect(program.cols).toBe(200);
			expect(program.rows).toBe(50);
		});

		it('does not emit if dimensions unchanged', async () => {
			program = createProgram({ input, output });
			await program.init();

			const resizeHandler = vi.fn();
			program.on('resize', resizeHandler);

			// Emit resize without changing dimensions
			output.emit('resize');

			expect(resizeHandler).not.toHaveBeenCalled();
		});
	});

	describe('setTitle', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('sets terminal title', () => {
			program.setTitle('New Title');
			expect(written).toBe('\x1b]2;New Title\x07');
		});
	});

	describe('resetStyle', () => {
		beforeEach(async () => {
			program = createProgram({
				input,
				output,
				useAlternateScreen: false,
				hideCursor: false,
			});
			await program.init();
			written = '';
		});

		it('resets text attributes', () => {
			program.resetStyle();
			program.flush();
			expect(written).toBe('\x1b[0m');
		});
	});
});

describe('Program with non-TTY streams', () => {
	it('works with plain streams', async () => {
		const input = new Readable({ read() {} });
		const output = new PassThrough();
		let written = '';
		output.on('data', (chunk) => {
			written += chunk.toString();
		});

		const program = createProgram({
			input,
			output,
			useAlternateScreen: false,
			hideCursor: false,
			forceWidth: 80,
			forceHeight: 24,
		});

		await program.init();
		expect(program.cols).toBe(80);
		expect(program.rows).toBe(24);

		program.write('Hello');
		program.flush();
		expect(written).toContain('Hello');

		program.destroy();
	});
});
