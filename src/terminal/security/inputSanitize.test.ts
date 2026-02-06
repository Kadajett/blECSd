import { describe, expect, it } from 'vitest';
import {
	hasControlChars,
	hasNullBytes,
	replaceInvalidUtf16,
	sanitizeTextInput,
	stripNullBytes,
} from './inputSanitize';

describe('Input Sanitization', () => {
	describe('sanitizeTextInput', () => {
		it('should pass through normal ASCII text', () => {
			expect(sanitizeTextInput('Hello, world!')).toBe('Hello, world!');
		});

		it('should preserve tabs and newlines', () => {
			expect(sanitizeTextInput('line1\tvalue\nline2')).toBe('line1\tvalue\nline2');
		});

		it('should strip null bytes by default', () => {
			expect(sanitizeTextInput('hello\x00world')).toBe('helloworld');
		});

		it('should strip C0 control characters', () => {
			expect(sanitizeTextInput('he\x01ll\x02o')).toBe('hello');
			expect(sanitizeTextInput('test\x07bell')).toBe('testbell');
			expect(sanitizeTextInput('form\x0cfeed')).toBe('formfeed');
		});

		it('should strip C1 control characters', () => {
			expect(sanitizeTextInput('test\u0080data')).toBe('testdata');
			expect(sanitizeTextInput('test\u009fend')).toBe('testend');
		});

		it('should allow Unicode by default', () => {
			expect(sanitizeTextInput('Hello 世界')).toBe('Hello 世界');
			expect(sanitizeTextInput('Ñoño 🎮')).toBe('Ñoño 🎮');
		});

		it('should replace non-ASCII when allowUnicode is false', () => {
			expect(sanitizeTextInput('Hello 世界', { allowUnicode: false })).toBe('Hello \uFFFD\uFFFD');
			expect(sanitizeTextInput('café', { allowUnicode: false })).toBe('caf\uFFFD');
		});

		it('should truncate to maxLength', () => {
			expect(sanitizeTextInput('Hello, world!', { maxLength: 5 })).toBe('Hello');
		});

		it('should not truncate when within maxLength', () => {
			expect(sanitizeTextInput('Hi', { maxLength: 10 })).toBe('Hi');
		});

		it('should handle empty string', () => {
			expect(sanitizeTextInput('')).toBe('');
		});

		it('should handle string of only control chars', () => {
			expect(sanitizeTextInput('\x00\x01\x02\x03')).toBe('');
		});

		it('should keep null bytes when stripNull is false', () => {
			expect(sanitizeTextInput('a\x00b', { stripNull: false, stripControl: false })).toBe('a\x00b');
		});

		it('should keep control chars when stripControl is false', () => {
			expect(sanitizeTextInput('a\x07b', { stripControl: false })).toBe('a\x07b');
		});

		it('should handle combined options', () => {
			const result = sanitizeTextInput('Hello\x00 世界!\x01', {
				allowUnicode: false,
				maxLength: 8,
				stripControl: true,
				stripNull: true,
			});
			// Non-ASCII replaced with \uFFFD, control chars stripped, then truncated to 8
			expect(result).toBe('Hello \uFFFD\uFFFD');
		});
	});

	describe('replaceInvalidUtf16', () => {
		it('should pass through valid UTF-8', () => {
			expect(replaceInvalidUtf16('Hello')).toBe('Hello');
			expect(replaceInvalidUtf16('世界')).toBe('世界');
			expect(replaceInvalidUtf16('🎮')).toBe('🎮');
		});

		it('should replace lone high surrogates', () => {
			const input = `a${String.fromCharCode(0xd800)}b`;
			const result = replaceInvalidUtf16(input);
			expect(result).toBe('a\uFFFDb');
		});

		it('should replace lone low surrogates', () => {
			const input = `a${String.fromCharCode(0xdc00)}b`;
			const result = replaceInvalidUtf16(input);
			expect(result).toBe('a\uFFFDb');
		});

		it('should handle valid surrogate pairs', () => {
			// 🎮 is a surrogate pair
			expect(replaceInvalidUtf16('🎮')).toBe('🎮');
		});
	});

	describe('hasNullBytes', () => {
		it('should detect null bytes', () => {
			expect(hasNullBytes('hello\x00world')).toBe(true);
		});

		it('should return false for clean strings', () => {
			expect(hasNullBytes('hello world')).toBe(false);
		});
	});

	describe('hasControlChars', () => {
		it('should detect C0 control characters', () => {
			expect(hasControlChars('hello\x01world')).toBe(true);
		});

		it('should detect C1 control characters', () => {
			expect(hasControlChars('test\u0080data')).toBe(true);
		});

		it('should return false for clean strings', () => {
			expect(hasControlChars('hello world')).toBe(false);
		});

		it('should flag tab/newline as control chars', () => {
			// hasControlChars checks all C0 (0x00-0x1F) including tab and newline
			expect(hasControlChars('hello\tworld\n')).toBe(true);
		});
	});

	describe('stripNullBytes', () => {
		it('should remove null bytes', () => {
			expect(stripNullBytes('a\x00b\x00c')).toBe('abc');
		});

		it('should return unchanged strings without null bytes', () => {
			expect(stripNullBytes('abc')).toBe('abc');
		});
	});

	describe('performance', () => {
		it('should handle rapid input efficiently', () => {
			const input = 'a'.repeat(10000);
			const start = performance.now();
			for (let i = 0; i < 1000; i++) {
				sanitizeTextInput(input);
			}
			const elapsed = performance.now() - start;
			// Should process 1000 x 10KB strings in under 2 seconds (generous for CI)
			expect(elapsed).toBeLessThan(2000);
		});
	});
});
