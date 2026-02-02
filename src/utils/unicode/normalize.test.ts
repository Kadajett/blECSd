import { describe, expect, it } from 'vitest';
import {
	dropUnicode,
	normalizeNFC,
	normalizeNFD,
	normalizeNFKC,
	normalizeNFKD,
	stripCombining,
	stripControl,
	stripZeroWidth,
	toAscii,
} from './normalize';

describe('normalize', () => {
	describe('dropUnicode', () => {
		describe('wide characters', () => {
			it('replaces CJK with ?', () => {
				expect(dropUnicode('Hello 世界')).toBe('Hello ??');
			});

			it('replaces fullwidth with ?', () => {
				expect(dropUnicode('ＡＢＣ')).toBe('???');
			});

			it('keeps wide chars when dropWide is false', () => {
				expect(dropUnicode('Hello 中国', { dropWide: false })).toBe('Hello 中国');
			});
		});

		describe('combining characters', () => {
			it('removes combining marks', () => {
				// e + combining acute
				expect(dropUnicode('e\u0301')).toBe('e');
			});

			it('keeps combining marks when dropCombining is false', () => {
				expect(dropUnicode('e\u0301', { dropCombining: false })).toBe('e\u0301');
			});
		});

		describe('astral plane (emoji)', () => {
			it('replaces emoji with ?', () => {
				expect(dropUnicode('Hello😀')).toBe('Hello?');
			});

			it('keeps emoji when dropAstral and dropWide are false', () => {
				// Emoji are both astral AND wide, need to disable both to keep them
				expect(dropUnicode('Hello😀', { dropAstral: false, dropWide: false })).toBe('Hello😀');
			});
		});

		describe('zero-width characters', () => {
			it('removes zero-width space', () => {
				expect(dropUnicode('a\u200Bb')).toBe('ab');
			});

			it('removes zero-width joiner', () => {
				expect(dropUnicode('a\u200Db')).toBe('ab');
			});

			it('keeps zero-width when dropZeroWidth is false', () => {
				expect(dropUnicode('a\u200Bb', { dropZeroWidth: false })).toBe('a\u200Bb');
			});
		});

		describe('control characters', () => {
			it('keeps control by default', () => {
				expect(dropUnicode('Hello\x00World')).toBe('Hello\x00World');
			});

			it('removes control when dropControl is true', () => {
				expect(dropUnicode('Hello\x00World', { dropControl: true })).toBe('HelloWorld');
			});

			it('preserves TAB, LF, CR', () => {
				expect(dropUnicode('A\tB\nC\rD', { dropControl: true })).toBe('A\tB\nC\rD');
			});
		});

		describe('custom replacement', () => {
			it('uses custom replacement character', () => {
				expect(dropUnicode('Hello 中国', { replacement: '_' })).toBe('Hello __');
			});
		});

		describe('ASCII passthrough', () => {
			it('keeps ASCII unchanged', () => {
				expect(dropUnicode('Hello World!')).toBe('Hello World!');
			});
		});
	});

	describe('toAscii', () => {
		it('converts non-ASCII to ?', () => {
			// '世界' is 2 characters
			expect(toAscii('Hello 世界')).toBe('Hello ??');
		});

		it('preserves ASCII printable', () => {
			expect(toAscii('Hello World!')).toBe('Hello World!');
		});

		it('preserves TAB, LF, CR', () => {
			expect(toAscii('A\tB\nC\rD')).toBe('A\tB\nC\rD');
		});

		it('replaces extended Latin', () => {
			expect(toAscii('café')).toBe('caf?');
			expect(toAscii('naïve')).toBe('na?ve');
		});

		it('uses custom replacement', () => {
			expect(toAscii('café', '_')).toBe('caf_');
		});
	});

	describe('stripZeroWidth', () => {
		it('removes zero-width space', () => {
			expect(stripZeroWidth('a\u200Bb')).toBe('ab');
		});

		it('removes zero-width joiner', () => {
			expect(stripZeroWidth('a\u200Db')).toBe('ab');
		});

		it('removes zero-width non-joiner', () => {
			expect(stripZeroWidth('a\u200Cb')).toBe('ab');
		});

		it('keeps regular characters', () => {
			expect(stripZeroWidth('Hello')).toBe('Hello');
		});
	});

	describe('stripCombining', () => {
		it('removes combining acute accent', () => {
			expect(stripCombining('e\u0301')).toBe('e');
		});

		it('removes combining diaeresis', () => {
			expect(stripCombining('u\u0308')).toBe('u');
		});

		it('handles decomposed NFD text', () => {
			// café in NFD
			const nfd = 'cafe\u0301';
			expect(stripCombining(nfd)).toBe('cafe');
		});

		it('keeps regular characters', () => {
			expect(stripCombining('Hello')).toBe('Hello');
		});
	});

	describe('stripControl', () => {
		it('removes NUL', () => {
			expect(stripControl('Hello\x00World')).toBe('HelloWorld');
		});

		it('removes C0 controls', () => {
			expect(stripControl('A\x01B\x02C')).toBe('ABC');
		});

		it('removes C1 controls', () => {
			expect(stripControl('A\x80B\x9fC')).toBe('ABC');
		});

		it('preserves TAB', () => {
			expect(stripControl('A\tB')).toBe('A\tB');
		});

		it('preserves LF', () => {
			expect(stripControl('A\nB')).toBe('A\nB');
		});

		it('preserves CR', () => {
			expect(stripControl('A\rB')).toBe('A\rB');
		});
	});

	describe('normalizeNFC', () => {
		it('composes decomposed characters', () => {
			// e + combining acute -> é
			expect(normalizeNFC('e\u0301')).toBe('é');
		});

		it('leaves precomposed unchanged', () => {
			expect(normalizeNFC('é')).toBe('é');
		});
	});

	describe('normalizeNFD', () => {
		it('decomposes precomposed characters', () => {
			// é -> e + combining acute
			expect(normalizeNFD('é')).toBe('e\u0301');
		});

		it('leaves decomposed unchanged', () => {
			expect(normalizeNFD('e\u0301')).toBe('e\u0301');
		});
	});

	describe('normalizeNFKC', () => {
		it('converts fullwidth to ASCII', () => {
			expect(normalizeNFKC('Ａ')).toBe('A');
			expect(normalizeNFKC('ａ')).toBe('a');
		});

		it('expands ligatures', () => {
			expect(normalizeNFKC('ﬁ')).toBe('fi');
		});

		it('composes decomposed characters', () => {
			expect(normalizeNFKC('e\u0301')).toBe('é');
		});
	});

	describe('normalizeNFKD', () => {
		it('converts fullwidth to ASCII and decomposes', () => {
			expect(normalizeNFKD('Ａ')).toBe('A');
		});

		it('expands ligatures', () => {
			expect(normalizeNFKD('ﬁ')).toBe('fi');
		});

		it('decomposes precomposed', () => {
			expect(normalizeNFKD('é')).toBe('e\u0301');
		});
	});

	describe('edge cases', () => {
		it('handles empty string', () => {
			expect(dropUnicode('')).toBe('');
			expect(toAscii('')).toBe('');
			expect(stripZeroWidth('')).toBe('');
			expect(stripCombining('')).toBe('');
			expect(stripControl('')).toBe('');
		});

		it('handles all-ASCII string', () => {
			const ascii = 'Hello World 123 !@#';
			expect(dropUnicode(ascii)).toBe(ascii);
			expect(toAscii(ascii)).toBe(ascii);
		});

		it('handles complex emoji', () => {
			// Family emoji with ZWJ
			expect(dropUnicode('👨‍👩‍👧‍👦')).toBe('????'); // Each person is replaced
		});

		it('handles mixed content', () => {
			const mixed = 'Hello 世界! 你好\u200BWorld 😀';
			const result = dropUnicode(mixed);
			expect(result).toBe('Hello ??! ??World ?');
		});
	});
});
