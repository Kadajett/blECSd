/**
 * PTY (Pseudo-Terminal) utilities for Terminal Widget.
 *
 * @module widgets/terminal/pty
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PtyOptionsSchema } from './config';
import type { PtyOptions } from './types';

/**
 * node-pty interface (subset we use).
 * Defined here to avoid requiring the actual types.
 */
export interface NodePtyModule {
	spawn(
		shell: string,
		args: string[],
		options: {
			name: string;
			cols: number;
			rows: number;
			cwd?: string;
			env?: Record<string, string>;
		},
	): {
		onData: (callback: (data: string) => void) => void;
		onExit: (callback: (e: { exitCode: number; signal?: number }) => void) => void;
		write: (data: string) => void;
		resize: (cols: number, rows: number) => void;
		kill: (signal?: string) => void;
	};
}

/**
 * Parsed spawn options for PTY creation.
 */
export interface ParsedSpawnOptions {
	readonly shell: string;
	readonly args: string[];
	readonly env: Record<string, string>;
	readonly cwd: string | undefined;
	readonly term: string;
	readonly cols: number | undefined;
	readonly rows: number | undefined;
	readonly autoResize: boolean;
}

/**
 * Parses spawn options into a normalized format.
 */
export function parseSpawnOptions(options?: PtyOptions | string): ParsedSpawnOptions {
	const defaultShell = process.env.SHELL ?? '/bin/sh';
	const defaultEnv = { ...process.env } as Record<string, string>;

	if (typeof options === 'string') {
		return {
			shell: options,
			args: [],
			env: defaultEnv,
			cwd: undefined,
			term: 'xterm-256color',
			cols: undefined,
			rows: undefined,
			autoResize: true,
		};
	}

	if (!options) {
		return {
			shell: defaultShell,
			args: [],
			env: defaultEnv,
			cwd: undefined,
			term: 'xterm-256color',
			cols: undefined,
			rows: undefined,
			autoResize: true,
		};
	}

	// Validate and parse options with Zod
	const validated = PtyOptionsSchema.parse(options);

	return {
		shell: validated.shell ?? defaultShell,
		args: validated.args ?? [],
		env: validated.env
			? ({ ...process.env, ...validated.env } as Record<string, string>)
			: defaultEnv,
		cwd: validated.cwd,
		term: validated.term,
		cols: validated.cols,
		rows: validated.rows,
		autoResize: validated.autoResize,
	};
}

/**
 * Tries to load node-pty dynamically from multiple locations.
 * Returns null if not available.
 */
export function tryLoadNodePty(): NodePtyModule | null {
	// Try multiple resolution strategies for finding node-pty
	const strategies = [
		// 1. Try from the current working directory (where the app is run from)
		() => createRequire(pathToFileURL(`${process.cwd()}/`).href)('node-pty'),
		// 2. Try from this module's location (library location)
		() => createRequire(import.meta.url)('node-pty'),
		// 3. Try from main module if available
		() => {
			const mainPath = process.argv[1];
			if (mainPath) {
				return createRequire(pathToFileURL(mainPath).href)('node-pty');
			}
			throw new Error('No main module');
		},
	];

	for (const strategy of strategies) {
		try {
			return strategy() as NodePtyModule;
		} catch {
			// Try next strategy
		}
	}

	return null;
}
