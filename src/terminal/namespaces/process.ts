/**
 * Process utilities namespace.
 *
 * Functions for spawning processes, executing shell commands,
 * and interacting with external editors.
 *
 * Note: Importing this namespace will shadow the Node.js global `process`.
 * If you need both, use an alias: `import { process as proc } from 'blecsd/terminal'`.
 *
 * @example
 * ```typescript
 * import { process as proc } from 'blecsd/terminal';
 *
 * // Execute command synchronously
 * const result = proc.execSync('ls -la');
 * console.log(result.stdout);
 *
 * // Execute command asynchronously
 * const asyncResult = await proc.exec('git status');
 * console.log(asyncResult.stdout);
 *
 * // Spawn long-running process
 * const child = proc.spawn('tail', ['-f', 'log.txt'], {
 *   onStdout: (data) => console.log(data),
 *   onStderr: (data) => console.error(data),
 * });
 *
 * // Open editor
 * const editor = proc.getDefaultEditor();
 * const text = await proc.readEditor('Initial content', {
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
