/**
 * Tests for process spawn/exec utilities
 */

import { unlinkSync } from 'node:fs';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type EditorOptions,
	type ExecOptions,
	type ExecResult,
	exec,
	execSync,
	getDefaultEditor,
	processUtils,
	readEditor,
	type SpawnOptions,
	spawn,
} from './process';

// Create a mock output stream that captures writes
function createMockOutput(): { output: Writable; getOutput: () => string; clear: () => void } {
	let buffer = '';
	const output = new Writable({
		write(chunk, _encoding, callback) {
			buffer += chunk.toString();
			callback();
		},
	});
	return {
		output,
		getOutput: () => buffer,
		clear: () => {
			buffer = '';
		},
	};
}

// Create a mock input stream with raw mode support
function createMockInput(): NodeJS.ReadStream & {
	_rawMode: boolean;
} {
	const mock = {
		_rawMode: false,
		isRaw: false,
		setRawMode(mode: boolean) {
			this._rawMode = mode;
			this.isRaw = mode;
			return this;
		},
		on: vi.fn().mockReturnThis(),
		once: vi.fn().mockReturnThis(),
		removeListener: vi.fn().mockReturnThis(),
	} as unknown as NodeJS.ReadStream & { _rawMode: boolean };
	return mock;
}

describe('spawn', () => {
	let mockOutput: ReturnType<typeof createMockOutput>;
	let mockInput: ReturnType<typeof createMockInput>;

	beforeEach(() => {
		mockOutput = createMockOutput();
		mockInput = createMockInput();
	});

	it('spawns a simple command', async () => {
		const exitPromise = new Promise<number | null>((resolve) => {
			const child = spawn('echo', ['hello'], {
				output: mockOutput.output,
				input: mockInput,
				onExit: (code) => resolve(code),
			});
			expect(child).toBeDefined();
			expect(child.pid).toBeDefined();
		});

		const code = await exitPromise;
		expect(code).toBe(0);
	});

	it('prepares terminal when in alternate buffer', async () => {
		mockInput._rawMode = true;
		mockInput.isRaw = true;

		const exitPromise = new Promise<void>((resolve) => {
			spawn('true', [], {
				output: mockOutput.output,
				input: mockInput,
				isAlternateBuffer: true,
				isMouseEnabled: true,
				onExit: () => resolve(),
			});
		});

		// Check that terminal was prepared (alternate off, cursor show, mouse disable)
		const output = mockOutput.getOutput();
		expect(output).toContain('\x1b[?1049l'); // alternate buffer off
		expect(output).toContain('\x1b[?25h'); // cursor show
		expect(output).toContain('\x1b[?1000l'); // mouse disable

		await exitPromise;

		// Check terminal was restored
		const finalOutput = mockOutput.getOutput();
		expect(finalOutput).toContain('\x1b[?1049h'); // alternate buffer on
		expect(finalOutput).toContain('\x1b[?1000h'); // mouse enable
	});

	it('handles non-existent command', async () => {
		const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
			(resolve, reject) => {
				const child = spawn('nonexistent-command-12345', [], {
					output: mockOutput.output,
					input: mockInput,
					onExit: (code, signal) => resolve({ code, signal }),
				});
				child.on('error', reject);
			},
		);

		// Should either exit with error or emit error event
		await expect(exitPromise).rejects.toThrow();
	});
});

describe('exec', () => {
	let mockOutput: ReturnType<typeof createMockOutput>;
	let mockInput: ReturnType<typeof createMockInput>;

	beforeEach(() => {
		mockOutput = createMockOutput();
		mockInput = createMockInput();
	});

	it('executes command and returns stdout', async () => {
		const result = await exec('echo', ['hello world'], {
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe('hello world');
		expect(result.stderr).toBe('');
		expect(result.signal).toBe(null);
	});

	it('captures stderr', async () => {
		// Use sh -c to explicitly write to stderr
		// This is more reliable than relying on external commands' error messages
		const result = await exec('sh', ['-c', 'echo "test error message" >&2; exit 1'], {
			output: mockOutput.output,
			input: mockInput,
		});

		// Should exit with code 1
		expect(result.exitCode).toBe(1);
		// stderr should contain our error message
		expect(result.stderr).toContain('test error message');
	});

	it('returns non-zero exit code', async () => {
		const result = await exec('sh', ['-c', 'exit 42'], {
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result.exitCode).toBe(42);
	});

	it('handles timeout', async () => {
		await expect(
			exec('sleep', ['10'], {
				output: mockOutput.output,
				input: mockInput,
				timeout: 100,
			}),
		).rejects.toThrow('timed out');
	});

	it('handles non-existent command', async () => {
		await expect(
			exec('nonexistent-command-12345', [], {
				output: mockOutput.output,
				input: mockInput,
			}),
		).rejects.toThrow();
	});

	it('prepares and restores terminal state', async () => {
		mockInput._rawMode = true;
		mockInput.isRaw = true;

		await exec('true', [], {
			output: mockOutput.output,
			input: mockInput,
			isAlternateBuffer: true,
			isMouseEnabled: true,
		});

		const output = mockOutput.getOutput();
		// Should have both preparation and restoration sequences
		expect(output).toContain('\x1b[?1049l'); // alternate off (prepare)
		expect(output).toContain('\x1b[?1049h'); // alternate on (restore)
	});

	it('calls onExit callback', async () => {
		const onExit = vi.fn();

		await exec('echo', ['test'], {
			output: mockOutput.output,
			input: mockInput,
			onExit,
		});

		expect(onExit).toHaveBeenCalledWith(0, null);
	});
});

describe('execSync', () => {
	let mockOutput: ReturnType<typeof createMockOutput>;
	let mockInput: ReturnType<typeof createMockInput>;

	beforeEach(() => {
		mockOutput = createMockOutput();
		mockInput = createMockInput();
	});

	it('executes command synchronously', () => {
		const result = execSync('echo', ['hello'], {
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe('hello');
	});

	it('returns exit code', () => {
		const result = execSync('sh', ['-c', 'exit 7'], {
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result.exitCode).toBe(7);
	});

	it('restores terminal even on error', () => {
		mockInput._rawMode = true;
		mockInput.isRaw = true;

		// This will fail but terminal should be restored
		try {
			execSync('nonexistent-command-12345', [], {
				output: mockOutput.output,
				input: mockInput,
				isAlternateBuffer: true,
			});
		} catch {
			// Ignore error
		}

		// Terminal should still be restored
		const output = mockOutput.getOutput();
		expect(output).toContain('\x1b[?1049h'); // alternate on (restore)
	});
});

describe('getDefaultEditor', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset env
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('returns EDITOR if set', () => {
		process.env.EDITOR = 'nano';
		process.env.VISUAL = 'code';
		expect(getDefaultEditor()).toBe('nano');
	});

	it('returns VISUAL if EDITOR not set', () => {
		process.env.EDITOR = '';
		process.env.VISUAL = 'code';
		expect(getDefaultEditor()).toBe('code');
	});

	it('returns vi as fallback', () => {
		process.env.EDITOR = '';
		process.env.VISUAL = '';
		expect(getDefaultEditor()).toBe('vi');
	});
});

describe('readEditor', () => {
	let mockOutput: ReturnType<typeof createMockOutput>;
	let mockInput: ReturnType<typeof createMockInput>;
	let tempFiles: string[];

	beforeEach(() => {
		mockOutput = createMockOutput();
		mockInput = createMockInput();
		tempFiles = [];
	});

	afterEach(() => {
		// Clean up any temp files
		for (const file of tempFiles) {
			try {
				unlinkSync(file);
			} catch {
				// Ignore
			}
		}
	});

	it('creates temp file with initial content', async () => {
		// Use cat as a "no-op" editor that just outputs the content
		const result = await readEditor({
			editor: 'true', // Just exit 0, don't modify file
			content: 'initial content',
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result).toBe('initial content');
	});

	it('uses custom extension', async () => {
		// We can't easily test the extension without inspecting the temp file
		// but we can verify it doesn't throw
		const result = await readEditor({
			editor: 'true',
			content: 'test',
			extension: '.md',
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result).toBe('test');
	});

	it('rejects when editor command fails to start', async () => {
		await expect(
			readEditor({
				editor: 'nonexistent-editor-12345',
				output: mockOutput.output,
				input: mockInput,
			}),
		).rejects.toThrow('Failed to start editor');
	});

	it('parses editor with arguments', async () => {
		// Test that editor string is split properly
		const result = await readEditor({
			editor: 'true --some-flag',
			content: 'test',
			output: mockOutput.output,
			input: mockInput,
		});

		expect(result).toBe('test');
	});

	it('prepares and restores terminal', async () => {
		mockInput._rawMode = true;
		mockInput.isRaw = true;

		await readEditor({
			editor: 'true',
			content: 'test',
			output: mockOutput.output,
			input: mockInput,
			isAlternateBuffer: true,
			isMouseEnabled: true,
		});

		const output = mockOutput.getOutput();
		expect(output).toContain('\x1b[?1049l'); // alternate off
		expect(output).toContain('\x1b[?1049h'); // alternate on (restore)
	});
});

describe('processUtils', () => {
	describe('commandExists', () => {
		it('returns true for existing command', () => {
			// 'echo' should exist on all platforms
			expect(processUtils.commandExists('echo')).toBe(true);
		});

		it('returns false for non-existent command', () => {
			expect(processUtils.commandExists('nonexistent-command-12345')).toBe(false);
		});

		it('returns true for sh on Unix', () => {
			if (process.platform !== 'win32') {
				expect(processUtils.commandExists('sh')).toBe(true);
			}
		});
	});

	describe('getShell', () => {
		it('returns shell info', () => {
			const { shell, args } = processUtils.getShell();
			expect(shell).toBeTruthy();
			expect(Array.isArray(args)).toBe(true);

			if (process.platform === 'win32') {
				expect(shell.toLowerCase()).toContain('cmd');
				expect(args).toContain('/c');
			} else {
				expect(args).toContain('-c');
			}
		});
	});

	describe('shellEscape', () => {
		it('escapes string with spaces', () => {
			const escaped = processUtils.shellEscape('hello world');

			if (process.platform === 'win32') {
				expect(escaped).toBe('"hello world"');
			} else {
				expect(escaped).toBe("'hello world'");
			}
		});

		it('escapes special characters', () => {
			const escaped = processUtils.shellEscape("it's a test");

			if (process.platform === 'win32') {
				expect(escaped).toBe('"it\'s a test"');
			} else {
				expect(escaped).toBe("'it'\\''s a test'");
			}
		});

		it('handles empty string', () => {
			const escaped = processUtils.shellEscape('');

			if (process.platform === 'win32') {
				expect(escaped).toBe('""');
			} else {
				expect(escaped).toBe("''");
			}
		});
	});
});

describe('SpawnOptions interface', () => {
	it('has expected properties', () => {
		const options: SpawnOptions = {
			output: process.stdout,
			input: process.stdin as NodeJS.ReadStream,
			isAlternateBuffer: true,
			isMouseEnabled: true,
			onExit: () => {},
			cwd: '/tmp',
			env: {},
		};

		expect(options.isAlternateBuffer).toBe(true);
		expect(options.isMouseEnabled).toBe(true);
	});
});

describe('ExecOptions interface', () => {
	it('has expected properties', () => {
		const options: ExecOptions = {
			timeout: 5000,
			maxBuffer: 1024,
			encoding: 'utf8',
			isAlternateBuffer: false,
		};

		expect(options.timeout).toBe(5000);
		expect(options.maxBuffer).toBe(1024);
	});
});

describe('ExecResult interface', () => {
	it('has expected properties', () => {
		const result: ExecResult = {
			stdout: 'output',
			stderr: 'error',
			exitCode: 0,
			signal: null,
		};

		expect(result.stdout).toBe('output');
		expect(result.exitCode).toBe(0);
	});
});

describe('EditorOptions interface', () => {
	it('has expected properties', () => {
		const options: EditorOptions = {
			content: 'initial',
			extension: '.txt',
			editor: 'vim',
			isAlternateBuffer: true,
		};

		expect(options.content).toBe('initial');
		expect(options.editor).toBe('vim');
	});
});
