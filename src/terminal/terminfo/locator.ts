/**
 * Terminfo database file locator.
 *
 * Locates compiled terminfo files on the filesystem using standard search paths.
 * Supports both first-character directory structure (x/xterm) and hexadecimal
 * directory structure (78/xterm) used by some systems.
 *
 * @module terminal/terminfo/locator
 *
 * @example
 * ```typescript
 * import { findTerminfo, listTerminals, getTerminfoSearchPaths } from 'blecsd';
 *
 * // Find terminfo file for a terminal
 * const path = findTerminfo('xterm-256color');
 * if (path) {
 *   console.log(`Found at: ${path}`);
 * }
 *
 * // List available terminals
 * const terminals = listTerminals();
 * console.log(`Found ${terminals.length} terminals`);
 *
 * // Get search paths
 * const paths = getTerminfoSearchPaths();
 * console.log('Search paths:', paths);
 * ```
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for terminfo file location.
 */
export interface LocatorConfig {
	/** Additional search paths to check first */
	readonly additionalPaths?: readonly string[];
	/** Whether to skip system paths (useful for testing) */
	readonly skipSystemPaths?: boolean;
	/** Custom home directory (useful for testing) */
	readonly homeDir?: string;
}

/**
 * Result of a terminfo file search.
 */
export interface LocatorResult {
	/** Path to the found terminfo file, or null if not found */
	readonly path: string | null;
	/** All paths that were searched */
	readonly searchedPaths: readonly string[];
	/** Terminal name that was searched for */
	readonly terminal: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default system search paths for terminfo databases.
 * Order matters - earlier paths take precedence.
 */
const DEFAULT_SYSTEM_PATHS: readonly string[] = [
	'/etc/terminfo',
	'/lib/terminfo',
	'/usr/share/terminfo',
	'/usr/lib/terminfo',
	'/usr/share/lib/terminfo',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the first character subdirectory name for a terminal.
 * E.g., "xterm" -> "x", "vt100" -> "v"
 */
function getFirstCharDir(terminal: string): string {
	return terminal.charAt(0);
}

/**
 * Gets the hexadecimal subdirectory name for a terminal.
 * E.g., "xterm" -> "78", "vt100" -> "76"
 */
function getHexDir(terminal: string): string {
	const charCode = terminal.charCodeAt(0);
	return charCode.toString(16).toLowerCase();
}

/**
 * Checks if a directory exists and is accessible.
 */
function directoryExists(path: string): boolean {
	try {
		return existsSync(path) && statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Checks if a file exists and is readable.
 */
function fileExists(path: string): boolean {
	try {
		return existsSync(path) && statSync(path).isFile();
	} catch {
		return false;
	}
}

/**
 * Gets the user's home directory.
 */
function getHomeDir(config?: LocatorConfig): string {
	if (config?.homeDir) {
		return config.homeDir;
	}
	return process.env.HOME ?? process.env.USERPROFILE ?? '';
}

// =============================================================================
// SEARCH PATH FUNCTIONS
// =============================================================================

/**
 * Gets the ordered list of terminfo search paths.
 *
 * Search order:
 * 1. TERMINFO environment variable (if set)
 * 2. ~/.terminfo (user's personal database)
 * 3. TERMINFO_DIRS paths (colon-separated, if set)
 * 4. Additional paths from config
 * 5. System paths (/etc/terminfo, /lib/terminfo, etc.)
 *
 * @param config - Optional locator configuration
 * @returns Array of search paths in priority order
 *
 * @example
 * ```typescript
 * import { getTerminfoSearchPaths } from 'blecsd';
 *
 * const paths = getTerminfoSearchPaths();
 * console.log('Terminfo search paths:');
 * for (const path of paths) {
 *   console.log(`  ${path}`);
 * }
 * ```
 */
export function getTerminfoSearchPaths(config?: LocatorConfig): readonly string[] {
	const paths: string[] = [];

	// 1. TERMINFO environment variable (highest priority)
	const terminfo = process.env.TERMINFO;
	if (terminfo && terminfo.length > 0) {
		paths.push(terminfo);
	}

	// 2. User's personal terminfo directory
	const homeDir = getHomeDir(config);
	if (homeDir) {
		paths.push(join(homeDir, '.terminfo'));
	}

	// 3. TERMINFO_DIRS (colon-separated list)
	const terminfoDirs = process.env.TERMINFO_DIRS;
	if (terminfoDirs) {
		const dirs = terminfoDirs.split(':').filter((d) => d.length > 0);
		paths.push(...dirs);
	}

	// 4. Additional paths from config
	if (config?.additionalPaths) {
		paths.push(...config.additionalPaths);
	}

	// 5. System paths
	if (!config?.skipSystemPaths) {
		paths.push(...DEFAULT_SYSTEM_PATHS);
	}

	// Filter to unique paths
	return [...new Set(paths)];
}

/**
 * Gets all existing terminfo search paths.
 * Filters out paths that don't exist on the filesystem.
 *
 * @param config - Optional locator configuration
 * @returns Array of existing search paths
 *
 * @example
 * ```typescript
 * import { getExistingSearchPaths } from 'blecsd';
 *
 * const paths = getExistingSearchPaths();
 * console.log(`Found ${paths.length} terminfo directories`);
 * ```
 */
export function getExistingSearchPaths(config?: LocatorConfig): readonly string[] {
	return getTerminfoSearchPaths(config).filter(directoryExists);
}

// =============================================================================
// FILE LOCATION FUNCTIONS
// =============================================================================

/**
 * Finds the terminfo file for a terminal.
 *
 * Searches in the following order:
 * 1. First-character directory (e.g., x/xterm)
 * 2. Hexadecimal directory (e.g., 78/xterm)
 *
 * @param terminal - Terminal name (e.g., "xterm-256color")
 * @param config - Optional locator configuration
 * @returns Path to terminfo file, or null if not found
 *
 * @example
 * ```typescript
 * import { findTerminfo } from 'blecsd';
 *
 * const path = findTerminfo('xterm-256color');
 * if (path) {
 *   console.log(`Found terminfo at: ${path}`);
 * } else {
 *   console.log('Terminal not found in terminfo database');
 * }
 * ```
 */
export function findTerminfo(terminal: string, config?: LocatorConfig): string | null {
	if (!terminal || terminal.length === 0) {
		return null;
	}

	const searchPaths = getTerminfoSearchPaths(config);
	const firstChar = getFirstCharDir(terminal);
	const hexChar = getHexDir(terminal);

	for (const basePath of searchPaths) {
		// Try first-character directory (most common)
		const firstCharPath = join(basePath, firstChar, terminal);
		if (fileExists(firstCharPath)) {
			return firstCharPath;
		}

		// Try hexadecimal directory (some systems use this)
		const hexPath = join(basePath, hexChar, terminal);
		if (fileExists(hexPath)) {
			return hexPath;
		}
	}

	return null;
}

/**
 * Finds a terminfo file with detailed search information.
 *
 * @param terminal - Terminal name
 * @param config - Optional locator configuration
 * @returns Detailed result including path and searched locations
 *
 * @example
 * ```typescript
 * import { findTerminfoDetailed } from 'blecsd';
 *
 * const result = findTerminfoDetailed('xterm-256color');
 *
 * if (result.path) {
 *   console.log(`Found at: ${result.path}`);
 * } else {
 *   console.log('Not found. Searched:');
 *   for (const path of result.searchedPaths) {
 *     console.log(`  ${path}`);
 *   }
 * }
 * ```
 */
export function findTerminfoDetailed(terminal: string, config?: LocatorConfig): LocatorResult {
	const searchedPaths: string[] = [];

	if (!terminal || terminal.length === 0) {
		return { path: null, searchedPaths, terminal };
	}

	const searchPaths = getTerminfoSearchPaths(config);
	const firstChar = getFirstCharDir(terminal);
	const hexChar = getHexDir(terminal);

	for (const basePath of searchPaths) {
		const firstCharPath = join(basePath, firstChar, terminal);
		searchedPaths.push(firstCharPath);

		if (fileExists(firstCharPath)) {
			return { path: firstCharPath, searchedPaths, terminal };
		}

		const hexPath = join(basePath, hexChar, terminal);
		searchedPaths.push(hexPath);

		if (fileExists(hexPath)) {
			return { path: hexPath, searchedPaths, terminal };
		}
	}

	return { path: null, searchedPaths, terminal };
}

/**
 * Gets the terminfo path for a terminal, throwing if not found.
 *
 * @param terminal - Terminal name
 * @param config - Optional locator configuration
 * @returns Path to terminfo file
 * @throws Error if terminal not found
 *
 * @example
 * ```typescript
 * import { getTerminfoPath } from 'blecsd';
 *
 * try {
 *   const path = getTerminfoPath('xterm-256color');
 *   console.log(`Path: ${path}`);
 * } catch (err) {
 *   console.error('Terminal not found');
 * }
 * ```
 */
export function getTerminfoPath(terminal: string, config?: LocatorConfig): string {
	const path = findTerminfo(terminal, config);
	if (!path) {
		throw new Error(`Terminfo file not found for terminal: ${terminal}`);
	}
	return path;
}

// =============================================================================
// TERMINAL LISTING FUNCTIONS
// =============================================================================

/**
 * Lists all available terminals in a single terminfo directory.
 *
 * @param basePath - Path to terminfo directory
 * @returns Array of terminal names
 */
function listTerminalsInDir(basePath: string): string[] {
	const terminals: string[] = [];

	if (!directoryExists(basePath)) {
		return terminals;
	}

	try {
		const subdirs = readdirSync(basePath);

		for (const subdir of subdirs) {
			// Skip non-single-character directories (like README files)
			if (subdir.length !== 1 && subdir.length !== 2) {
				continue;
			}

			const subdirPath = join(basePath, subdir);

			if (!directoryExists(subdirPath)) {
				continue;
			}

			try {
				const files = readdirSync(subdirPath);
				terminals.push(...files);
			} catch {
				// Ignore errors reading subdirectory
			}
		}
	} catch {
		// Ignore errors reading base directory
	}

	return terminals;
}

/**
 * Lists all available terminal definitions in the terminfo database.
 *
 * @param config - Optional locator configuration
 * @returns Array of unique terminal names
 *
 * @example
 * ```typescript
 * import { listTerminals } from 'blecsd';
 *
 * const terminals = listTerminals();
 * console.log(`Found ${terminals.length} terminals:`);
 *
 * // Filter to xterm variants
 * const xterms = terminals.filter(t => t.startsWith('xterm'));
 * console.log('xterm variants:', xterms);
 * ```
 */
export function listTerminals(config?: LocatorConfig): readonly string[] {
	const allTerminals: Set<string> = new Set();

	const searchPaths = getTerminfoSearchPaths(config);

	for (const basePath of searchPaths) {
		const terminals = listTerminalsInDir(basePath);
		for (const terminal of terminals) {
			allTerminals.add(terminal);
		}
	}

	return [...allTerminals].sort();
}

/**
 * Lists terminals matching a pattern.
 *
 * @param pattern - Pattern to match (supports * and ? wildcards)
 * @param config - Optional locator configuration
 * @returns Array of matching terminal names
 *
 * @example
 * ```typescript
 * import { listTerminalsMatching } from 'blecsd';
 *
 * // Find all xterm variants
 * const xterms = listTerminalsMatching('xterm*');
 *
 * // Find all 256-color terminals
 * const color256 = listTerminalsMatching('*-256color');
 * ```
 */
export function listTerminalsMatching(pattern: string, config?: LocatorConfig): readonly string[] {
	// Convert glob pattern to regex
	const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

	const regex = new RegExp(`^${regexPattern}$`, 'i');

	const allTerminals = listTerminals(config);
	return allTerminals.filter((t) => regex.test(t));
}

/**
 * Checks if a terminal exists in the terminfo database.
 *
 * @param terminal - Terminal name to check
 * @param config - Optional locator configuration
 * @returns true if terminal exists
 *
 * @example
 * ```typescript
 * import { terminalExists } from 'blecsd';
 *
 * if (terminalExists('xterm-256color')) {
 *   console.log('Terminal is available');
 * }
 * ```
 */
export function terminalExists(terminal: string, config?: LocatorConfig): boolean {
	return findTerminfo(terminal, config) !== null;
}

/**
 * Gets the current terminal name from environment.
 *
 * @returns Current TERM value or 'dumb' as fallback
 *
 * @example
 * ```typescript
 * import { getCurrentTerminal } from 'blecsd';
 *
 * const term = getCurrentTerminal();
 * console.log(`Current terminal: ${term}`);
 * ```
 */
export function getCurrentTerminal(): string {
	return process.env.TERM ?? 'dumb';
}

/**
 * Finds the terminfo file for the current terminal.
 *
 * @param config - Optional locator configuration
 * @returns Path to terminfo file for current TERM, or null
 *
 * @example
 * ```typescript
 * import { findCurrentTerminfo } from 'blecsd';
 *
 * const path = findCurrentTerminfo();
 * if (path) {
 *   console.log(`Current terminal terminfo: ${path}`);
 * }
 * ```
 */
export function findCurrentTerminfo(config?: LocatorConfig): string | null {
	return findTerminfo(getCurrentTerminal(), config);
}
