/**
 * Process Spawn/Exec Utilities
 *
 * Provides utilities for spawning child processes from terminal applications
 * with proper terminal state management.
 *
 * @module terminal/process
 * @internal
 */

import type { ChildProcess, SpawnOptionsWithoutStdio } from 'node:child_process';
import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { cursor, mouse, screen, style } from './ansi';

/**
 * Options for spawning a process
 */
export interface SpawnOptions extends SpawnOptionsWithoutStdio {
	/** Output stream for terminal restoration (default: process.stdout) */
	output?: Writable;
	/** Input stream for terminal state (default: process.stdin) */
	input?: NodeJS.ReadStream;
	/** Whether the terminal is in alternate buffer mode (default: false) */
	isAlternateBuffer?: boolean;
	/** Whether mouse tracking is enabled (default: false) */
	isMouseEnabled?: boolean;
	/** Callback when process exits */
	onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}

/**
 * Options for executing a process and waiting
 */
export interface ExecOptions extends SpawnOptions {
	/** Timeout in milliseconds (default: no timeout) */
	timeout?: number;
	/** Maximum buffer size for output (default: 10MB) */
	maxBuffer?: number;
	/** Encoding for output (default: 'utf8') */
	encoding?: BufferEncoding;
}

/**
 * Result of an exec operation
 */
export interface ExecResult {
	/** Standard output */
	stdout: string;
	/** Standard error */
	stderr: string;
	/** Exit code (null if killed by signal) */
	exitCode: number | null;
	/** Signal that killed the process (null if exited normally) */
	signal: NodeJS.Signals | null;
}

/**
 * Options for opening an external editor
 */
export interface EditorOptions {
	/** Initial content to edit */
	content?: string;
	/** File extension for temp file (default: '.txt') */
	extension?: string;
	/** Editor command (default: EDITOR or VISUAL env var, then 'vi') */
	editor?: string;
	/** Output stream for terminal restoration (default: process.stdout) */
	output?: Writable;
	/** Input stream for terminal state (default: process.stdin) */
	input?: NodeJS.ReadStream;
	/** Whether the terminal is in alternate buffer mode (default: false) */
	isAlternateBuffer?: boolean;
	/** Whether mouse tracking is enabled (default: false) */
	isMouseEnabled?: boolean;
}

/**
 * State saved before spawning a process
 */
interface SavedTerminalState {
	wasAlternateBuffer: boolean;
	wasMouseEnabled: boolean;
	wasRawMode: boolean;
}

/** Default maximum buffer size for exec (10MB) */
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Prepare terminal for spawning an external process.
 *
 * This exits alternate buffer, shows cursor, disables mouse,
 * and exits raw mode to prepare for external process.
 *
 * @param options - Spawn options with terminal state
 * @returns The saved terminal state
 */
function prepareTerminalForSpawn(options: {
	output?: Writable;
	input?: NodeJS.ReadStream;
	isAlternateBuffer?: boolean;
	isMouseEnabled?: boolean;
}): SavedTerminalState {
	const output = options.output ?? process.stdout;
	const input = (options.input ?? process.stdin) as NodeJS.ReadStream;
	const isAlternateBuffer = options.isAlternateBuffer ?? false;
	const isMouseEnabled = options.isMouseEnabled ?? false;

	// Save current state
	const state: SavedTerminalState = {
		wasAlternateBuffer: isAlternateBuffer,
		wasMouseEnabled: isMouseEnabled,
		wasRawMode: input.isRaw ?? false,
	};

	// Prepare terminal for external process
	let seq = '';

	// Exit alternate buffer
	if (isAlternateBuffer) {
		seq += screen.alternateOff();
	}

	// Show cursor
	seq += cursor.show();

	// Disable mouse
	if (isMouseEnabled) {
		seq += mouse.disableAll();
	}

	// Reset styles
	seq += style.reset();

	// Write all sequences at once
	if (seq) {
		output.write(seq);
	}

	// Exit raw mode
	if (input.setRawMode && state.wasRawMode) {
		input.setRawMode(false);
	}

	return state;
}

/**
 * Restore terminal state after external process exits.
 *
 * @param state - The saved terminal state
 * @param options - Options with output/input streams
 */
function restoreTerminalAfterSpawn(
	state: SavedTerminalState,
	options: {
		output?: Writable;
		input?: NodeJS.ReadStream;
	},
): void {
	const output = options.output ?? process.stdout;
	const input = (options.input ?? process.stdin) as NodeJS.ReadStream;

	// Re-enable raw mode
	if (input.setRawMode && state.wasRawMode) {
		input.setRawMode(true);
	}

	let seq = '';

	// Re-enter alternate buffer
	if (state.wasAlternateBuffer) {
		seq += screen.alternateOn();
	}

	// Re-enable mouse
	if (state.wasMouseEnabled) {
		seq += mouse.enableNormal();
	}

	// Write all sequences at once
	if (seq) {
		output.write(seq);
	}
}

/**
 * Spawn a child process with terminal state management.
 *
 * This function prepares the terminal for the child process by:
 * 1. Exiting alternate screen buffer (if active)
 * 2. Showing the cursor
 * 3. Disabling mouse tracking (if enabled)
 * 4. Exiting raw mode
 *
 * When the process exits, the terminal state is restored.
 *
 * @param file - Command to spawn
 * @param args - Arguments for the command
 * @param options - Spawn options including terminal state
 * @returns The spawned child process
 *
 * @example
 * ```typescript
 * import { spawn } from 'blecsd/terminal';
 *
 * // Spawn a shell command
 * const child = spawn('ls', ['-la'], {
 *   isAlternateBuffer: true,
 *   isMouseEnabled: true,
 *   onExit: (code) => {
 *     console.log('Process exited with code:', code);
 *   },
 * });
 * ```
 */
export function spawn(file: string, args: string[] = [], options: SpawnOptions = {}): ChildProcess {
	// Prepare terminal
	const state = prepareTerminalForSpawn(options);

	// Extract our custom options
	const { output, input, isAlternateBuffer, isMouseEnabled, onExit, ...nodeOptions } = options;

	// Spawn the child process
	const child = nodeSpawn(file, args, {
		stdio: 'inherit',
		...nodeOptions,
	});

	// Handle process exit
	child.on('exit', (code, signal) => {
		// Restore terminal
		restoreTerminalAfterSpawn(state, { output, input });

		// Call user callback
		onExit?.(code, signal);
	});

	return child;
}

/**
 * Execute a command and wait for it to complete.
 *
 * This is a Promise-based wrapper around spawn that returns
 * the stdout/stderr of the process.
 *
 * @param file - Command to execute
 * @param args - Arguments for the command
 * @param options - Exec options
 * @returns Promise resolving to the exec result
 *
 * @example
 * ```typescript
 * import { exec } from 'blecsd/terminal';
 *
 * const result = await exec('git', ['status'], {
 *   isAlternateBuffer: true,
 * });
 * console.log(result.stdout);
 * ```
 */
export function exec(
	file: string,
	args: string[] = [],
	options: ExecOptions = {},
): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
		const encoding = options.encoding ?? 'utf8';

		// Prepare terminal
		const state = prepareTerminalForSpawn(options);

		// Extract our custom options
		const {
			output,
			input,
			isAlternateBuffer,
			isMouseEnabled,
			onExit,
			timeout,
			maxBuffer: _maxBuffer,
			encoding: _encoding,
			...nodeOptions
		} = options;

		// Collect output
		let stdout = '';
		let stderr = '';
		let stdoutSize = 0;
		let stderrSize = 0;
		let timedOut = false;

		// Spawn with pipe for output
		const child = nodeSpawn(file, args, {
			...nodeOptions,
			stdio: ['inherit', 'pipe', 'pipe'],
		});

		// Set up timeout
		let timeoutId: NodeJS.Timeout | undefined;
		if (timeout) {
			timeoutId = setTimeout(() => {
				timedOut = true;
				child.kill('SIGTERM');
			}, timeout);
		}

		// Collect stdout
		child.stdout?.on('data', (data: Buffer) => {
			const chunk = data.toString(encoding);
			stdoutSize += data.length;
			if (stdoutSize <= maxBuffer) {
				stdout += chunk;
			}
		});

		// Collect stderr
		child.stderr?.on('data', (data: Buffer) => {
			const chunk = data.toString(encoding);
			stderrSize += data.length;
			if (stderrSize <= maxBuffer) {
				stderr += chunk;
			}
		});

		// Handle exit
		child.on('exit', (exitCode, signal) => {
			// Clear timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			// Restore terminal
			restoreTerminalAfterSpawn(state, { output, input });

			// Call user callback
			onExit?.(exitCode, signal);

			// Check for timeout
			if (timedOut) {
				reject(new Error(`Process timed out after ${timeout}ms`));
				return;
			}

			// Check for buffer overflow
			if (stdoutSize > maxBuffer || stderrSize > maxBuffer) {
				reject(new Error(`Output exceeded maxBuffer of ${maxBuffer} bytes`));
				return;
			}

			resolve({
				stdout,
				stderr,
				exitCode,
				signal,
			});
		});

		// Handle errors
		child.on('error', (error) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			restoreTerminalAfterSpawn(state, { output, input });
			reject(error);
		});
	});
}

/**
 * Execute a command synchronously.
 *
 * This blocks until the command completes. Use sparingly as it
 * blocks the event loop.
 *
 * @param file - Command to execute
 * @param args - Arguments for the command
 * @param options - Spawn options (subset)
 * @returns The exec result
 *
 * @example
 * ```typescript
 * import { execSync } from 'blecsd/terminal';
 *
 * const result = execSync('date');
 * console.log(result.stdout);
 * ```
 */
export function execSync(
	file: string,
	args: string[] = [],
	options: Omit<SpawnOptions, 'onExit'> = {},
): ExecResult {
	// Prepare terminal
	const state = prepareTerminalForSpawn(options);

	try {
		// Execute synchronously
		const result = spawnSync(file, args, {
			encoding: 'utf8',
			stdio: ['inherit', 'pipe', 'pipe'],
		});

		return {
			stdout: result.stdout ?? '',
			stderr: result.stderr ?? '',
			exitCode: result.status,
			signal: result.signal,
		};
	} finally {
		// Always restore terminal
		const { output, input } = options;
		restoreTerminalAfterSpawn(state, { output, input });
	}
}

/**
 * Get the default editor command.
 *
 * Checks EDITOR, then VISUAL environment variables, then falls back to 'vi'.
 *
 * @returns The editor command
 */
export function getDefaultEditor(): string {
	return process.env.EDITOR || process.env.VISUAL || 'vi';
}

/**
 * Generate a unique temporary filename.
 *
 * @param extension - File extension (default: '.txt')
 * @returns Full path to temporary file
 */
function generateTempFilename(extension = '.txt'): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	const filename = `blecsd-edit-${timestamp}-${random}${extension}`;
	return join(tmpdir(), filename);
}

/**
 * Safely delete a temporary file.
 */
function cleanupTempFile(path: string): void {
	try {
		unlinkSync(path);
	} catch {
		// Ignore cleanup errors
	}
}

/**
 * Read content from a file, returning fallback if file doesn't exist or can't be read.
 */
function readTempFileContent(path: string, fallback: string): { content: string; error?: Error } {
	try {
		if (existsSync(path)) {
			return { content: readFileSync(path, 'utf8') };
		}
		return { content: fallback };
	} catch (err) {
		return { content: fallback, error: err as Error };
	}
}

/**
 * Open an external editor and return the edited content.
 *
 * This function:
 * 1. Creates a temporary file with the initial content
 * 2. Opens the editor (uses EDITOR/VISUAL env var or specified editor)
 * 3. Waits for the editor to close
 * 4. Returns the edited content
 * 5. Cleans up the temporary file
 *
 * @param options - Editor options
 * @returns Promise resolving to the edited content
 *
 * @example
 * ```typescript
 * import { readEditor } from 'blecsd/terminal';
 *
 * // Open editor with initial content
 * const edited = await readEditor({
 *   content: 'Initial content to edit',
 *   extension: '.md',
 * });
 * console.log('Edited content:', edited);
 *
 * // Use a specific editor
 * const edited2 = await readEditor({
 *   editor: 'nano',
 *   content: 'Edit me!',
 * });
 * ```
 */
export function readEditor(options: EditorOptions = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		const editor = options.editor ?? getDefaultEditor();
		const extension = options.extension ?? '.txt';
		const content = options.content ?? '';
		const tempFile = generateTempFilename(extension);

		try {
			// Write initial content to temp file
			writeFileSync(tempFile, content, 'utf8');
		} catch (error) {
			reject(new Error(`Failed to create temp file: ${error}`));
			return;
		}

		// Parse editor command (may include arguments like "code --wait")
		const editorParts = editor.split(/\s+/);
		const editorCommand = editorParts[0];
		const editorArgs = [...editorParts.slice(1), tempFile];

		// Prepare terminal
		const state = prepareTerminalForSpawn(options);

		// Spawn editor
		const child = nodeSpawn(editorCommand, editorArgs, {
			stdio: 'inherit',
		});

		child.on('exit', (_code, signal) => {
			// Restore terminal
			restoreTerminalAfterSpawn(state, {
				output: options.output,
				input: options.input,
			});

			// Check if editor exited abnormally
			if (signal) {
				cleanupTempFile(tempFile);
				reject(new Error(`Editor was killed by signal: ${signal}`));
				return;
			}

			// Editor may return non-zero for various reasons (e.g., vim :cq)
			// We still try to read the content
			const { content: editedContent, error } = readTempFileContent(tempFile, content);
			cleanupTempFile(tempFile);

			if (error) {
				reject(new Error(`Failed to read edited content: ${error}`));
				return;
			}

			resolve(editedContent);
		});

		child.on('error', (error) => {
			// Restore terminal
			restoreTerminalAfterSpawn(state, {
				output: options.output,
				input: options.input,
			});

			cleanupTempFile(tempFile);
			reject(new Error(`Failed to start editor '${editorCommand}': ${error}`));
		});
	});
}

/**
 * Utilities for process management.
 *
 * This namespace provides helper functions for common process operations.
 */
export const processUtils = {
	/**
	 * Check if a command exists in PATH.
	 *
	 * @param command - Command to check
	 * @returns True if command exists
	 *
	 * @example
	 * ```typescript
	 * if (processUtils.commandExists('git')) {
	 *   console.log('Git is installed');
	 * }
	 * ```
	 */
	commandExists(command: string): boolean {
		try {
			const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			});
			return result.status === 0;
		} catch {
			return false;
		}
	},

	/**
	 * Get the shell command for the current platform.
	 *
	 * @returns Shell command and args
	 *
	 * @example
	 * ```typescript
	 * const { shell, args } = processUtils.getShell();
	 * spawn(shell, [...args, 'echo hello']);
	 * ```
	 */
	getShell(): { shell: string; args: string[] } {
		if (process.platform === 'win32') {
			// Use cmd.exe on Windows
			const comspec = process.env.COMSPEC || 'cmd.exe';
			return { shell: comspec, args: ['/c'] };
		}

		// Use SHELL env var or default to sh
		const shell = process.env.SHELL || '/bin/sh';
		return { shell, args: ['-c'] };
	},

	/**
	 * Escape a string for use in shell commands.
	 *
	 * @param str - String to escape
	 * @returns Escaped string
	 *
	 * @example
	 * ```typescript
	 * const filename = 'file with spaces.txt';
	 * const escaped = processUtils.shellEscape(filename);
	 * // On Unix: 'file with spaces.txt'
	 * // On Windows: "file with spaces.txt"
	 * ```
	 */
	shellEscape(str: string): string {
		if (process.platform === 'win32') {
			// Windows uses double quotes
			return `"${str.replace(/"/g, '""')}"`;
		}

		// Unix uses single quotes
		return `'${str.replace(/'/g, "'\\''")}'`;
	},
} as const;
