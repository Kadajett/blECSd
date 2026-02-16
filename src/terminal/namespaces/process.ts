/**
 * Process utilities namespace.
 *
 * Functions for spawning processes, executing shell commands,
 * and interacting with external editors.
 *
 * @example
 * ```typescript
 * import { process } from 'blecsd/terminal';
 *
 * // Execute command synchronously
 * const result = process.execSync('ls -la');
 * console.log(result.stdout);
 *
 * // Execute command asynchronously
 * const asyncResult = await process.exec('git status');
 * console.log(asyncResult.stdout);
 *
 * // Spawn long-running process
 * const child = process.spawn('tail', ['-f', 'log.txt'], {
 *   onStdout: (data) => console.log(data),
 *   onStderr: (data) => console.error(data),
 * });
 *
 * // Open editor
 * const editor = process.getDefaultEditor();
 * const text = await process.readEditor('Initial content', {
 *   editor,
 *   extension: '.md',
 * });
 * ```
 */

import { exec, execSync, getDefaultEditor, readEditor, spawn } from '../process';

/**
 * Process utilities namespace.
 */
export const process = Object.freeze({
	exec,
	execSync,
	getDefaultEditor,
	readEditor,
	spawn,
});

export type ProcessModule = typeof process;
