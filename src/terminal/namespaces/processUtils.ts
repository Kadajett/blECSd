/**
 * Process utilities namespace.
 *
 * Functions for spawning processes, executing shell commands,
 * and interacting with external editors.
 *
 * @example
 * ```typescript
 * import { processNs } from 'blecsd/terminal';
 *
 * // Execute command synchronously
 * const result = processNs.execSync('ls -la');
 * console.log(result.stdout);
 *
 * // Execute command asynchronously
 * const asyncResult = await processNs.exec('git status');
 * console.log(asyncResult.stdout);
 *
 * // Spawn long-running process
 * const child = processNs.spawn('tail', ['-f', 'log.txt'], {
 *   onStdout: (data) => console.log(data),
 *   onStderr: (data) => console.error(data),
 * });
 *
 * // Open editor
 * const editor = processNs.getDefaultEditor();
 * const text = await processNs.readEditor('Initial content', {
 *   editor,
 *   extension: '.md',
 * });
 * ```
 */

import { exec, execSync, getDefaultEditor, readEditor, spawn } from '../process';

/**
 * Process utilities namespace.
 */
export const processNs = Object.freeze({
	exec,
	execSync,
	getDefaultEditor,
	readEditor,
	spawn,
});

export type ProcessNsModule = typeof processNs;
