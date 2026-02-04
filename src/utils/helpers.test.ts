/**
 * Tests for helper utility functions.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	findAllFiles,
	findFile,
	groupBy,
	merge,
	partition,
	shallowMerge,
	sortBy,
	sortByIndex,
	sortByName,
	sortByPriority,
	unique,
	uniqueBy,
} from './helpers';

describe('helpers', () => {
	describe('merge', () => {
		it('should merge two flat objects', () => {
			const a = { x: 1 };
			const b = { y: 2 };
			const result = merge(a, b);
			expect(result).toEqual({ x: 1, y: 2 });
		});

		it('should override properties from source', () => {
			const a = { x: 1, y: 1 };
			const b = { y: 2 };
			const result = merge(a, b);
			expect(result).toEqual({ x: 1, y: 2 });
		});

		it('should deep merge nested objects', () => {
			const a = { nested: { a: 1 } };
			const b = { nested: { b: 2 } };
			const result = merge(a, b);
			expect(result).toEqual({ nested: { a: 1, b: 2 } });
		});

		it('should handle arrays (replace, not merge)', () => {
			const a = { arr: [1, 2] };
			const b = { arr: [3, 4] };
			const result = merge(a, b);
			expect(result).toEqual({ arr: [3, 4] });
		});

		it('should handle null values', () => {
			const a = { x: 1, y: null };
			const b = { y: 2, z: null };
			const result = merge(a, b);
			expect(result).toEqual({ x: 1, y: 2, z: null });
		});

		it('should not mutate original objects', () => {
			const a = { x: 1 };
			const b = { y: 2 };
			merge(a, b);
			expect(a).toEqual({ x: 1 });
			expect(b).toEqual({ y: 2 });
		});

		it('should handle empty objects', () => {
			const a = { x: 1 };
			const b = {};
			expect(merge(a, b)).toEqual({ x: 1 });
			expect(merge(b, a)).toEqual({ x: 1 });
		});

		it('should deep merge multiple levels', () => {
			const a = { l1: { l2: { a: 1 } } };
			const b = { l1: { l2: { b: 2 }, c: 3 } };
			const result = merge(a, b);
			expect(result).toEqual({ l1: { l2: { a: 1, b: 2 }, c: 3 } });
		});
	});

	describe('shallowMerge', () => {
		it('should shallow merge two objects', () => {
			const a = { x: 1 };
			const b = { y: 2 };
			const result = shallowMerge(a, b);
			expect(result).toEqual({ x: 1, y: 2 });
		});

		it('should not deep merge nested objects', () => {
			const a = { nested: { a: 1 } };
			const b = { nested: { b: 2 } };
			const result = shallowMerge(a, b);
			// Shallow merge replaces the nested object entirely
			expect(result).toEqual({ nested: { b: 2 } });
		});
	});

	describe('sortByName', () => {
		it('should sort by name alphabetically', () => {
			const items = [{ name: 'cherry' }, { name: 'apple' }, { name: 'banana' }];
			const sorted = sortByName(items);
			expect(sorted.map((i) => i.name)).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should handle case-insensitive sorting', () => {
			const items = [{ name: 'Banana' }, { name: 'apple' }, { name: 'CHERRY' }];
			const sorted = sortByName(items);
			expect(sorted.map((i) => i.name)).toEqual(['apple', 'Banana', 'CHERRY']);
		});

		it('should put dot-prefixed names at the end', () => {
			const items = [{ name: '.hidden' }, { name: 'visible' }, { name: '.another' }];
			const sorted = sortByName(items);
			expect(sorted.map((i) => i.name)).toEqual(['visible', '.another', '.hidden']);
		});

		it('should sort dot-prefixed names among themselves', () => {
			const items = [{ name: '.z' }, { name: '.a' }, { name: '.m' }];
			const sorted = sortByName(items);
			expect(sorted.map((i) => i.name)).toEqual(['.a', '.m', '.z']);
		});

		it('should not mutate the original array', () => {
			const items = [{ name: 'b' }, { name: 'a' }];
			sortByName(items);
			expect(items.map((i) => i.name)).toEqual(['b', 'a']);
		});

		it('should handle empty array', () => {
			expect(sortByName([])).toEqual([]);
		});

		it('should handle single item', () => {
			const items = [{ name: 'only' }];
			expect(sortByName(items)).toEqual([{ name: 'only' }]);
		});
	});

	describe('sortByIndex', () => {
		it('should sort by index ascending', () => {
			const items = [
				{ index: 3, value: 'c' },
				{ index: 1, value: 'a' },
				{ index: 2, value: 'b' },
			];
			const sorted = sortByIndex(items);
			expect(sorted.map((i) => i.index)).toEqual([1, 2, 3]);
		});

		it('should handle negative indices', () => {
			const items = [
				{ index: 0, value: 'zero' },
				{ index: -1, value: 'neg' },
				{ index: 1, value: 'pos' },
			];
			const sorted = sortByIndex(items);
			expect(sorted.map((i) => i.index)).toEqual([-1, 0, 1]);
		});

		it('should not mutate the original array', () => {
			const items = [{ index: 2 }, { index: 1 }];
			sortByIndex(items);
			expect(items.map((i) => i.index)).toEqual([2, 1]);
		});

		it('should handle empty array', () => {
			expect(sortByIndex([])).toEqual([]);
		});

		it('should handle duplicate indices', () => {
			const items = [
				{ index: 1, value: 'first' },
				{ index: 1, value: 'second' },
			];
			const sorted = sortByIndex(items);
			expect(sorted).toHaveLength(2);
		});
	});

	describe('sortByPriority', () => {
		it('should sort by priority descending', () => {
			const items = [
				{ priority: 1, name: 'low' },
				{ priority: 3, name: 'high' },
				{ priority: 2, name: 'medium' },
			];
			const sorted = sortByPriority(items);
			expect(sorted.map((i) => i.priority)).toEqual([3, 2, 1]);
		});

		it('should handle negative priorities', () => {
			const items = [
				{ priority: -1, name: 'lowest' },
				{ priority: 1, name: 'high' },
				{ priority: 0, name: 'normal' },
			];
			const sorted = sortByPriority(items);
			expect(sorted.map((i) => i.priority)).toEqual([1, 0, -1]);
		});
	});

	describe('sortBy', () => {
		it('should sort using custom key function', () => {
			const items = [{ x: 3 }, { x: 1 }, { x: 2 }];
			const sorted = sortBy(items, (item) => item.x);
			expect(sorted.map((i) => i.x)).toEqual([1, 2, 3]);
		});

		it('should sort strings', () => {
			const items = [{ name: 'charlie' }, { name: 'alice' }, { name: 'bob' }];
			const sorted = sortBy(items, (item) => item.name);
			expect(sorted.map((i) => i.name)).toEqual(['alice', 'bob', 'charlie']);
		});

		it('should sort descending when specified', () => {
			const items = [{ x: 1 }, { x: 3 }, { x: 2 }];
			const sorted = sortBy(items, (item) => item.x, true);
			expect(sorted.map((i) => i.x)).toEqual([3, 2, 1]);
		});
	});

	describe('unique', () => {
		it('should remove duplicate primitives', () => {
			expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
		});

		it('should remove duplicate strings', () => {
			expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
		});

		it('should preserve order (first occurrence)', () => {
			expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
		});

		it('should handle empty array', () => {
			expect(unique([])).toEqual([]);
		});
	});

	describe('uniqueBy', () => {
		it('should remove duplicates by key function', () => {
			const items = [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' },
				{ id: 1, name: 'c' },
			];
			const result = uniqueBy(items, (item) => item.id);
			expect(result).toEqual([
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' },
			]);
		});

		it('should keep first occurrence', () => {
			const items = [
				{ key: 'x', order: 1 },
				{ key: 'x', order: 2 },
			];
			const result = uniqueBy(items, (item) => item.key);
			expect(result[0]?.order).toBe(1);
		});

		it('should handle empty array', () => {
			expect(uniqueBy([], (x) => x)).toEqual([]);
		});
	});

	describe('groupBy', () => {
		it('should group items by key', () => {
			const items = [
				{ type: 'a', value: 1 },
				{ type: 'b', value: 2 },
				{ type: 'a', value: 3 },
			];
			const groups = groupBy(items, (item) => item.type);
			expect(groups.get('a')).toEqual([
				{ type: 'a', value: 1 },
				{ type: 'a', value: 3 },
			]);
			expect(groups.get('b')).toEqual([{ type: 'b', value: 2 }]);
		});

		it('should handle empty array', () => {
			const groups = groupBy([], (x: { key: string }) => x.key);
			expect(groups.size).toBe(0);
		});

		it('should handle numeric keys', () => {
			const items = [
				{ score: 10, name: 'a' },
				{ score: 20, name: 'b' },
				{ score: 10, name: 'c' },
			];
			const groups = groupBy(items, (item) => item.score);
			expect(groups.get(10)).toHaveLength(2);
			expect(groups.get(20)).toHaveLength(1);
		});
	});

	describe('partition', () => {
		it('should split array by predicate', () => {
			const nums = [1, 2, 3, 4, 5];
			const [evens, odds] = partition(nums, (n) => n % 2 === 0);
			expect(evens).toEqual([2, 4]);
			expect(odds).toEqual([1, 3, 5]);
		});

		it('should handle all matching', () => {
			const nums = [2, 4, 6];
			const [evens, odds] = partition(nums, (n) => n % 2 === 0);
			expect(evens).toEqual([2, 4, 6]);
			expect(odds).toEqual([]);
		});

		it('should handle none matching', () => {
			const nums = [1, 3, 5];
			const [evens, odds] = partition(nums, (n) => n % 2 === 0);
			expect(evens).toEqual([]);
			expect(odds).toEqual([1, 3, 5]);
		});

		it('should handle empty array', () => {
			const [a, b] = partition([], () => true);
			expect(a).toEqual([]);
			expect(b).toEqual([]);
		});
	});

	describe('findFile', () => {
		let tempDir: string;

		beforeEach(() => {
			// Create a temporary directory structure for testing
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helpers-test-'));
			fs.writeFileSync(path.join(tempDir, 'root.txt'), 'root');
			fs.mkdirSync(path.join(tempDir, 'subdir'));
			fs.writeFileSync(path.join(tempDir, 'subdir', 'nested.txt'), 'nested');
			fs.mkdirSync(path.join(tempDir, 'deep', 'nested', 'path'), { recursive: true });
			fs.writeFileSync(path.join(tempDir, 'deep', 'nested', 'path', 'deep.txt'), 'deep');
		});

		afterEach(() => {
			// Clean up temp directory
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it('should find file in root directory', () => {
			const result = findFile(tempDir, 'root.txt');
			expect(result).toBe(path.join(tempDir, 'root.txt'));
		});

		it('should find file in subdirectory', () => {
			const result = findFile(tempDir, 'nested.txt');
			expect(result).toBe(path.join(tempDir, 'subdir', 'nested.txt'));
		});

		it('should find deeply nested file', () => {
			const result = findFile(tempDir, 'deep.txt');
			expect(result).toBe(path.join(tempDir, 'deep', 'nested', 'path', 'deep.txt'));
		});

		it('should return null for non-existent file', () => {
			const result = findFile(tempDir, 'nonexistent.txt');
			expect(result).toBeNull();
		});

		it('should respect maxDepth option', () => {
			const result = findFile(tempDir, 'deep.txt', { maxDepth: 2 });
			expect(result).toBeNull();
		});

		it('should handle non-existent start directory gracefully', () => {
			const result = findFile('/nonexistent/path', 'file.txt');
			expect(result).toBeNull();
		});
	});

	describe('findAllFiles', () => {
		let tempDir: string;

		beforeEach(() => {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helpers-test-'));
			fs.writeFileSync(path.join(tempDir, 'target.txt'), 'root');
			fs.mkdirSync(path.join(tempDir, 'subdir1'));
			fs.writeFileSync(path.join(tempDir, 'subdir1', 'target.txt'), 'sub1');
			fs.mkdirSync(path.join(tempDir, 'subdir2'));
			fs.writeFileSync(path.join(tempDir, 'subdir2', 'target.txt'), 'sub2');
			fs.writeFileSync(path.join(tempDir, 'subdir2', 'other.txt'), 'other');
		});

		afterEach(() => {
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it('should find all matching files', () => {
			const results = findAllFiles(tempDir, 'target.txt');
			expect(results).toHaveLength(3);
		});

		it('should limit results when maxResults specified', () => {
			const results = findAllFiles(tempDir, 'target.txt', { maxResults: 2 });
			expect(results).toHaveLength(2);
		});

		it('should return empty array for no matches', () => {
			const results = findAllFiles(tempDir, 'nonexistent.txt');
			expect(results).toEqual([]);
		});

		it('should respect maxDepth option', () => {
			const results = findAllFiles(tempDir, 'target.txt', { maxDepth: 0 });
			expect(results).toHaveLength(1);
			expect(results[0]).toBe(path.join(tempDir, 'target.txt'));
		});
	});
});
