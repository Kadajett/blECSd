/**
 * General utility functions for object manipulation and sorting.
 * @module utils/helpers
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// =============================================================================
// OBJECT UTILITIES
// =============================================================================

/**
 * Deeply merges two objects.
 * Properties from source override properties in target.
 * Nested objects are merged recursively.
 *
 * @param target - Base object
 * @param source - Object to merge into target
 * @returns Merged object
 *
 * @example
 * ```typescript
 * import { merge } from 'blecsd';
 *
 * const a = { x: 1, nested: { a: 1 } };
 * const b = { y: 2, nested: { b: 2 } };
 * const result = merge(a, b);
 * // result = { x: 1, y: 2, nested: { a: 1, b: 2 } }
 * ```
 */
export function merge<T extends object, U extends object>(target: T, source: U): T & U {
	const result = { ...target } as T & U;

	for (const key in source) {
		if (Object.hasOwn(source, key)) {
			const sourceValue = source[key];
			const targetValue = (result as Record<string, unknown>)[key];

			// Deep merge for nested objects (not arrays)
			if (
				sourceValue !== null &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue !== null &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				(result as Record<string, unknown>)[key] = merge(
					targetValue as object,
					sourceValue as object,
				);
			} else {
				(result as Record<string, unknown>)[key] = sourceValue;
			}
		}
	}

	return result;
}

/**
 * Shallow merges two objects.
 * Properties from source override properties in target.
 * Does not recursively merge nested objects.
 *
 * @param target - Base object
 * @param source - Object to merge into target
 * @returns Merged object
 *
 * @example
 * ```typescript
 * import { shallowMerge } from 'blecsd';
 *
 * const a = { x: 1 };
 * const b = { y: 2 };
 * const result = shallowMerge(a, b);
 * // result = { x: 1, y: 2 }
 * ```
 */
export function shallowMerge<T extends object, U extends object>(target: T, source: U): T & U {
	return { ...target, ...source } as T & U;
}

// =============================================================================
// SORTING UTILITIES
// =============================================================================

/**
 * Sorts an array of objects by their `name` property.
 * Dot-prefixed names (like `.hidden`) are sorted after non-prefixed names.
 * Sort is stable and case-insensitive.
 *
 * @param arr - Array of objects with name property
 * @returns New sorted array
 *
 * @example
 * ```typescript
 * import { sortByName } from 'blecsd';
 *
 * const items = [
 *   { name: 'zebra' },
 *   { name: '.hidden' },
 *   { name: 'apple' },
 * ];
 * const sorted = sortByName(items);
 * // sorted = [{ name: 'apple' }, { name: 'zebra' }, { name: '.hidden' }]
 * ```
 */
export function sortByName<T extends { name: string }>(arr: readonly T[]): T[] {
	return [...arr].sort((a, b) => {
		const aIsDot = a.name.startsWith('.');
		const bIsDot = b.name.startsWith('.');

		// Dot-prefixed names come after regular names
		if (aIsDot && !bIsDot) return 1;
		if (!aIsDot && bIsDot) return -1;

		// Case-insensitive alphabetical sort
		return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
	});
}

/**
 * Sorts an array of objects by their `index` property.
 * Lower indices come first.
 *
 * @param arr - Array of objects with index property
 * @returns New sorted array
 *
 * @example
 * ```typescript
 * import { sortByIndex } from 'blecsd';
 *
 * const items = [
 *   { index: 3, value: 'c' },
 *   { index: 1, value: 'a' },
 *   { index: 2, value: 'b' },
 * ];
 * const sorted = sortByIndex(items);
 * // sorted = [{ index: 1, value: 'a' }, { index: 2, value: 'b' }, { index: 3, value: 'c' }]
 * ```
 */
export function sortByIndex<T extends { index: number }>(arr: readonly T[]): T[] {
	return [...arr].sort((a, b) => a.index - b.index);
}

/**
 * Sorts an array of objects by their `priority` property.
 * Higher priority values come first.
 *
 * @param arr - Array of objects with priority property
 * @returns New sorted array
 *
 * @example
 * ```typescript
 * import { sortByPriority } from 'blecsd';
 *
 * const items = [
 *   { priority: 1, name: 'low' },
 *   { priority: 3, name: 'high' },
 *   { priority: 2, name: 'medium' },
 * ];
 * const sorted = sortByPriority(items);
 * // sorted = [{ priority: 3, name: 'high' }, { priority: 2, name: 'medium' }, { priority: 1, name: 'low' }]
 * ```
 */
export function sortByPriority<T extends { priority: number }>(arr: readonly T[]): T[] {
	return [...arr].sort((a, b) => b.priority - a.priority);
}

/**
 * Sorts an array using a custom key function.
 *
 * @param arr - Array to sort
 * @param keyFn - Function that extracts the sort key from each element
 * @param descending - Sort in descending order (default: false)
 * @returns New sorted array
 *
 * @example
 * ```typescript
 * import { sortBy } from 'blecsd';
 *
 * const items = [{ x: 3 }, { x: 1 }, { x: 2 }];
 * const sorted = sortBy(items, item => item.x);
 * // sorted = [{ x: 1 }, { x: 2 }, { x: 3 }]
 * ```
 */
export function sortBy<T>(
	arr: readonly T[],
	keyFn: (item: T) => string | number,
	descending = false,
): T[] {
	return [...arr].sort((a, b) => {
		const aKey = keyFn(a);
		const bKey = keyFn(b);

		let comparison: number;
		if (typeof aKey === 'string' && typeof bKey === 'string') {
			comparison = aKey.localeCompare(bKey);
		} else {
			comparison = (aKey as number) - (bKey as number);
		}

		return descending ? -comparison : comparison;
	});
}

// =============================================================================
// FILE UTILITIES
// =============================================================================

/**
 * Directories to exclude when searching for files.
 */
const EXCLUDED_DIRS = new Set([
	'node_modules',
	'.git',
	'.svn',
	'.hg',
	'dist',
	'build',
	'coverage',
	'.cache',
	'.next',
	'__pycache__',
]);

/**
 * Recursively searches for a file starting from a directory.
 *
 * @param startDir - Directory to start searching from
 * @param target - File name or pattern to find
 * @param options - Search options
 * @returns Full path to the file, or null if not found
 *
 * @example
 * ```typescript
 * import { findFile } from 'blecsd';
 *
 * // Find package.json starting from current directory
 * const packagePath = findFile('.', 'package.json');
 * if (packagePath) {
 *   console.log(`Found: ${packagePath}`);
 * }
 *
 * // Search with max depth
 * const config = findFile('.', 'config.json', { maxDepth: 3 });
 * ```
 */
export function findFile(
	startDir: string,
	target: string,
	options?: {
		/** Maximum directory depth to search (default: 10) */
		maxDepth?: number;
		/** Additional directories to exclude */
		excludeDirs?: string[];
	},
): string | null {
	const maxDepth = options?.maxDepth ?? 10;
	const excludeDirs = new Set([...EXCLUDED_DIRS, ...(options?.excludeDirs ?? [])]);

	function search(dir: string, depth: number): string | null {
		if (depth > maxDepth) {
			return null;
		}

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			// Permission denied or directory doesn't exist
			return null;
		}

		// Check for exact match first
		for (const entry of entries) {
			if (entry.name === target && entry.isFile()) {
				return path.join(dir, entry.name);
			}
		}

		// Search subdirectories
		for (const entry of entries) {
			if (entry.isDirectory() && !excludeDirs.has(entry.name)) {
				const result = search(path.join(dir, entry.name), depth + 1);
				if (result) {
					return result;
				}
			}
		}

		return null;
	}

	return search(path.resolve(startDir), 0);
}

/**
 * Finds all files matching a name pattern in a directory tree.
 *
 * @param startDir - Directory to start searching from
 * @param target - File name to find
 * @param options - Search options
 * @returns Array of full paths to matching files
 *
 * @example
 * ```typescript
 * import { findAllFiles } from 'blecsd';
 *
 * // Find all package.json files
 * const packageFiles = findAllFiles('.', 'package.json');
 * console.log(`Found ${packageFiles.length} package.json files`);
 * ```
 */
export function findAllFiles(
	startDir: string,
	target: string,
	options?: {
		/** Maximum directory depth to search (default: 10) */
		maxDepth?: number;
		/** Additional directories to exclude */
		excludeDirs?: string[];
		/** Maximum number of results (default: unlimited) */
		maxResults?: number;
	},
): string[] {
	const maxDepth = options?.maxDepth ?? 10;
	const excludeDirs = new Set([...EXCLUDED_DIRS, ...(options?.excludeDirs ?? [])]);
	const maxResults = options?.maxResults ?? Number.POSITIVE_INFINITY;
	const results: string[] = [];

	function search(dir: string, depth: number): void {
		if (depth > maxDepth || results.length >= maxResults) {
			return;
		}

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (results.length >= maxResults) {
				return;
			}

			if (entry.name === target && entry.isFile()) {
				results.push(path.join(dir, entry.name));
			}

			if (entry.isDirectory() && !excludeDirs.has(entry.name)) {
				search(path.join(dir, entry.name), depth + 1);
			}
		}
	}

	search(path.resolve(startDir), 0);
	return results;
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

/**
 * Removes duplicate items from an array.
 *
 * @param arr - Array with potential duplicates
 * @returns New array with unique items
 *
 * @example
 * ```typescript
 * import { unique } from 'blecsd';
 *
 * const nums = [1, 2, 2, 3, 3, 3];
 * const uniq = unique(nums);
 * // uniq = [1, 2, 3]
 * ```
 */
export function unique<T>(arr: readonly T[]): T[] {
	return [...new Set(arr)];
}

/**
 * Removes duplicate items from an array using a key function.
 *
 * @param arr - Array with potential duplicates
 * @param keyFn - Function that extracts the unique key from each element
 * @returns New array with unique items (first occurrence kept)
 *
 * @example
 * ```typescript
 * import { uniqueBy } from 'blecsd';
 *
 * const items = [
 *   { id: 1, name: 'a' },
 *   { id: 2, name: 'b' },
 *   { id: 1, name: 'c' },
 * ];
 * const uniq = uniqueBy(items, item => item.id);
 * // uniq = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
 * ```
 */
export function uniqueBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): T[] {
	const seen = new Set<K>();
	const result: T[] = [];

	for (const item of arr) {
		const key = keyFn(item);
		if (!seen.has(key)) {
			seen.add(key);
			result.push(item);
		}
	}

	return result;
}

/**
 * Groups array items by a key function.
 *
 * @param arr - Array to group
 * @param keyFn - Function that extracts the group key from each element
 * @returns Map of groups
 *
 * @example
 * ```typescript
 * import { groupBy } from 'blecsd';
 *
 * const items = [
 *   { type: 'a', value: 1 },
 *   { type: 'b', value: 2 },
 *   { type: 'a', value: 3 },
 * ];
 * const groups = groupBy(items, item => item.type);
 * // groups.get('a') = [{ type: 'a', value: 1 }, { type: 'a', value: 3 }]
 * // groups.get('b') = [{ type: 'b', value: 2 }]
 * ```
 */
export function groupBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
	const groups = new Map<K, T[]>();

	for (const item of arr) {
		const key = keyFn(item);
		const group = groups.get(key);
		if (group) {
			group.push(item);
		} else {
			groups.set(key, [item]);
		}
	}

	return groups;
}

/**
 * Partitions an array into two groups based on a predicate.
 *
 * @param arr - Array to partition
 * @param predicate - Function that returns true for items in the first group
 * @returns Tuple of [matching, nonMatching] arrays
 *
 * @example
 * ```typescript
 * import { partition } from 'blecsd';
 *
 * const nums = [1, 2, 3, 4, 5];
 * const [evens, odds] = partition(nums, n => n % 2 === 0);
 * // evens = [2, 4]
 * // odds = [1, 3, 5]
 * ```
 */
export function partition<T>(
	arr: readonly T[],
	predicate: (item: T) => boolean,
): [matching: T[], nonMatching: T[]] {
	const matching: T[] = [];
	const nonMatching: T[] = [];

	for (const item of arr) {
		if (predicate(item)) {
			matching.push(item);
		} else {
			nonMatching.push(item);
		}
	}

	return [matching, nonMatching];
}
