/**
 * Tests for expandTabs utility function.
 */

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { expandTabs } from './textWrap';

describe('expandTabs', () => {
	it('should expand single tab with default tab size (8)', () => {
		expect(expandTabs('hello\tworld')).toBe('hello   world');
	});

	it('should expand tab to align to tab stops (column 8, 16, 24...)', () => {
		expect(expandTabs('\ttext')).toBe('        text'); // Tab at column 0 -> 8 spaces
		expect(expandTabs('a\ttext')).toBe('a       text'); // Tab at column 1 -> 7 spaces
		expect(expandTabs('ab\ttext')).toBe('ab      text'); // Tab at column 2 -> 6 spaces
		expect(expandTabs('abc\ttext')).toBe('abc     text'); // Tab at column 3 -> 5 spaces
	});

	it('should expand multiple tabs', () => {
		expect(expandTabs('a\tb\tc')).toBe('a       b       c');
		expect(expandTabs('\t\t\t')).toBe('                        '); // 24 spaces
	});

	it('should handle custom tab size', () => {
		expect(expandTabs('a\tb', 4)).toBe('a   b');
		expect(expandTabs('a\tb', 2)).toBe('a b');
		expect(expandTabs('\ttext', 4)).toBe('    text');
	});

	it('should align tabs to column boundaries with custom tab size', () => {
		expect(expandTabs('a\ttext', 4)).toBe('a   text'); // Column 1 -> 3 spaces to reach 4
		expect(expandTabs('ab\ttext', 4)).toBe('ab  text'); // Column 2 -> 2 spaces to reach 4
		expect(expandTabs('abc\ttext', 4)).toBe('abc text'); // Column 3 -> 1 space to reach 4
		expect(expandTabs('abcd\ttext', 4)).toBe('abcd    text'); // Column 4 -> 4 spaces to reach 8
	});

	it('should handle text without tabs', () => {
		expect(expandTabs('hello world')).toBe('hello world');
		expect(expandTabs('no tabs here', 4)).toBe('no tabs here');
	});

	it('should handle empty string', () => {
		expect(expandTabs('')).toBe('');
	});

	it('should handle newlines correctly (reset column)', () => {
		expect(expandTabs('a\tb\nc\td')).toBe('a       b\nc       d');
		expect(expandTabs('\n\ttext')).toBe('\n        text');
	});

	it('should handle carriage returns correctly (reset column)', () => {
		expect(expandTabs('a\tb\rc\td')).toBe('a       b\rc       d');
		expect(expandTabs('\r\ttext')).toBe('\r        text');
	});

	it('should preserve ANSI escape sequences', () => {
		expect(expandTabs('\x1b[31m\ttext\x1b[0m', 8)).toBe('\x1b[31m        text\x1b[0m');
		expect(expandTabs('a\x1b[31m\tb\x1b[0m', 8)).toBe('a\x1b[31m       b\x1b[0m');
	});

	it('should not count ANSI codes in column position', () => {
		// ANSI codes should not affect column calculation
		const result = expandTabs('\x1b[31mred\x1b[0m\ttext', 8);
		// 'red' is 3 chars, so tab should add 5 spaces to reach column 8
		expect(result).toBe('\x1b[31mred\x1b[0m     text');
	});

	it('should validate tab size minimum (1)', () => {
		expect(() => expandTabs('text', 0)).toThrow(ZodError);
		expect(() => expandTabs('text', -1)).toThrow(ZodError);
	});

	it('should validate tab size maximum (16)', () => {
		expect(() => expandTabs('text', 17)).toThrow(ZodError);
		expect(() => expandTabs('text', 100)).toThrow(ZodError);
	});

	it('should accept valid tab sizes (1-16)', () => {
		expect(expandTabs('a\tb', 1)).toBe('a b'); // Tab size 1
		expect(expandTabs('\ttext', 16)).toBe('                text'); // Tab size 16
	});

	it('should require integer tab size', () => {
		expect(() => expandTabs('text', 4.5)).toThrow(ZodError);
		expect(() => expandTabs('text', 3.14)).toThrow(ZodError);
	});

	it('should handle mixed content', () => {
		const input = 'function\tfoo() {\n\treturn\t42;\n}';
		// 'function' is 8 chars, so tab at column 8 adds 8 spaces to reach column 16
		// 'return' is 6 chars, so tab at column 6 adds 2 spaces to reach column 8
		const expected = 'function        foo() {\n        return  42;\n}';
		expect(expandTabs(input, 8)).toBe(expected);
	});

	it('should handle consecutive tabs', () => {
		// 'a' is at column 1, first tab goes to column 4 (3 spaces), second tab goes to column 8 (4 spaces) = 7 spaces total
		expect(expandTabs('a\t\tb', 4)).toBe('a       b');
		// From column 0, first tab goes to column 4, second tab also expands but is evaluated at column 4, so goes to column 8
		// But wait - each tab is processed individually, so both tabs at column 0 each add 4 spaces = 8 spaces total
		expect(expandTabs('\t\ttext', 4)).toBe('        text'); // First tab column 0->4, second tab column 4->8
	});

	it('should handle tabs at exact column boundaries', () => {
		expect(expandTabs('12345678\ttext', 8)).toBe('12345678        text'); // At column 8, tab adds 8 spaces
		expect(expandTabs('1234\ttext', 4)).toBe('1234    text'); // At column 4, tab adds 4 spaces
	});
});
