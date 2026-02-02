import { describe, expect, it } from 'vitest';
import {
	AMBIGUOUS_RANGES,
	EMOJI_WIDE_RANGES,
	FULLWIDTH_RANGES,
	getCharWidth,
	isAmbiguousChar,
	isWideChar,
	isZeroWidthChar,
	WIDE_RANGES,
	ZERO_WIDTH_RANGES,
} from './widthTables';

describe('widthTables', () => {
	describe('range arrays', () => {
		it('WIDE_RANGES has entries', () => {
			expect(WIDE_RANGES.length).toBeGreaterThan(0);
		});

		it('FULLWIDTH_RANGES has entries', () => {
			expect(FULLWIDTH_RANGES.length).toBeGreaterThan(0);
		});

		it('ZERO_WIDTH_RANGES has entries', () => {
			expect(ZERO_WIDTH_RANGES.length).toBeGreaterThan(0);
		});

		it('AMBIGUOUS_RANGES has entries', () => {
			expect(AMBIGUOUS_RANGES.length).toBeGreaterThan(0);
		});

		it('EMOJI_WIDE_RANGES has entries', () => {
			expect(EMOJI_WIDE_RANGES.length).toBeGreaterThan(0);
		});

		it('ranges have valid format [start, end]', () => {
			for (const [start, end] of WIDE_RANGES) {
				expect(start).toBeLessThanOrEqual(end);
				expect(start).toBeGreaterThanOrEqual(0);
			}
		});

		it('WIDE_RANGES are sorted by start', () => {
			for (let i = 1; i < WIDE_RANGES.length; i++) {
				const prev = WIDE_RANGES[i - 1];
				const curr = WIDE_RANGES[i];
				if (prev && curr) {
					expect(prev[0]).toBeLessThan(curr[0]);
				}
			}
		});
	});

	describe('isWideChar', () => {
		describe('CJK characters', () => {
			it('returns true for CJK Unified Ideographs', () => {
				expect(isWideChar(0x4e00)).toBe(true); // 一
				expect(isWideChar(0x4e2d)).toBe(true); // 中
				expect(isWideChar(0x9fff)).toBe(true); // Last in range
			});

			it('returns true for Hiragana', () => {
				expect(isWideChar(0x3042)).toBe(true); // あ
				expect(isWideChar(0x3044)).toBe(true); // い
			});

			it('returns true for Katakana', () => {
				expect(isWideChar(0x30a2)).toBe(true); // ア
				expect(isWideChar(0x30a4)).toBe(true); // イ
			});

			it('returns true for Hangul', () => {
				expect(isWideChar(0xac00)).toBe(true); // 가
				expect(isWideChar(0xd7a3)).toBe(true); // 힣
			});
		});

		describe('fullwidth characters', () => {
			it('returns true for fullwidth ASCII', () => {
				expect(isWideChar(0xff01)).toBe(true); // ！
				expect(isWideChar(0xff21)).toBe(true); // Ａ
				expect(isWideChar(0xff41)).toBe(true); // ａ
			});
		});

		describe('emoji', () => {
			it('returns true for common emoji', () => {
				expect(isWideChar(0x1f600)).toBe(true); // 😀
				expect(isWideChar(0x1f4a9)).toBe(true); // 💩
				expect(isWideChar(0x1f680)).toBe(true); // 🚀
			});
		});

		describe('narrow characters', () => {
			it('returns false for ASCII', () => {
				expect(isWideChar(0x0041)).toBe(false); // A
				expect(isWideChar(0x0061)).toBe(false); // a
				expect(isWideChar(0x0030)).toBe(false); // 0
			});

			it('returns false for Latin Extended', () => {
				expect(isWideChar(0x00e9)).toBe(false); // é
				expect(isWideChar(0x00f1)).toBe(false); // ñ
			});
		});
	});

	describe('isZeroWidthChar', () => {
		describe('combining marks', () => {
			it('returns true for combining diacritical marks', () => {
				expect(isZeroWidthChar(0x0300)).toBe(true); // Combining grave
				expect(isZeroWidthChar(0x0301)).toBe(true); // Combining acute
				expect(isZeroWidthChar(0x0308)).toBe(true); // Combining diaeresis
			});
		});

		describe('control characters', () => {
			it('returns true for C0 controls', () => {
				expect(isZeroWidthChar(0x0000)).toBe(true); // NUL
				expect(isZeroWidthChar(0x001f)).toBe(true); // Unit separator
			});

			it('returns true for C1 controls', () => {
				expect(isZeroWidthChar(0x0080)).toBe(true);
				expect(isZeroWidthChar(0x009f)).toBe(true);
			});
		});

		describe('special characters', () => {
			it('returns true for zero-width space', () => {
				expect(isZeroWidthChar(0x200b)).toBe(true);
			});

			it('returns true for zero-width non-joiner', () => {
				expect(isZeroWidthChar(0x200c)).toBe(true);
			});

			it('returns true for zero-width joiner', () => {
				expect(isZeroWidthChar(0x200d)).toBe(true);
			});

			it('returns true for BOM', () => {
				expect(isZeroWidthChar(0xfeff)).toBe(true);
			});

			it('returns true for variation selectors', () => {
				expect(isZeroWidthChar(0xfe00)).toBe(true);
				expect(isZeroWidthChar(0xfe0f)).toBe(true);
			});
		});

		describe('regular characters', () => {
			it('returns false for ASCII printable', () => {
				expect(isZeroWidthChar(0x0020)).toBe(false); // Space
				expect(isZeroWidthChar(0x0041)).toBe(false); // A
				expect(isZeroWidthChar(0x007e)).toBe(false); // ~
			});
		});
	});

	describe('isAmbiguousChar', () => {
		it('returns true for Greek letters', () => {
			expect(isAmbiguousChar(0x0391)).toBe(true); // Α
			expect(isAmbiguousChar(0x03b1)).toBe(true); // α
		});

		it('returns true for Cyrillic', () => {
			expect(isAmbiguousChar(0x0410)).toBe(true); // А
			expect(isAmbiguousChar(0x0430)).toBe(true); // а
		});

		it('returns true for box drawing', () => {
			expect(isAmbiguousChar(0x2500)).toBe(true); // ─
			expect(isAmbiguousChar(0x2502)).toBe(true); // │
		});

		it('returns false for ASCII', () => {
			expect(isAmbiguousChar(0x0041)).toBe(false); // A
		});

		it('returns false for CJK', () => {
			expect(isAmbiguousChar(0x4e00)).toBe(false); // 一
		});
	});

	describe('getCharWidth', () => {
		it('returns 0 for zero-width chars', () => {
			expect(getCharWidth(0x0300)).toBe(0); // Combining mark
			expect(getCharWidth(0x200b)).toBe(0); // ZWSP
		});

		it('returns 1 for narrow chars', () => {
			expect(getCharWidth(0x0041)).toBe(1); // A
			expect(getCharWidth(0x0020)).toBe(1); // Space
		});

		it('returns 2 for wide chars', () => {
			expect(getCharWidth(0x4e00)).toBe(2); // CJK
			expect(getCharWidth(0x1f600)).toBe(2); // Emoji
		});

		it('returns 1 for ambiguous chars by default', () => {
			expect(getCharWidth(0x03b1)).toBe(1); // Greek alpha
		});

		it('returns 2 for ambiguous chars when ambiguousIsWide is true', () => {
			expect(getCharWidth(0x03b1, true)).toBe(2); // Greek alpha
		});

		describe('common characters', () => {
			it('handles Latin letters', () => {
				expect(getCharWidth('A'.codePointAt(0) ?? 0)).toBe(1);
				expect(getCharWidth('z'.codePointAt(0) ?? 0)).toBe(1);
			});

			it('handles digits', () => {
				expect(getCharWidth('0'.codePointAt(0) ?? 0)).toBe(1);
				expect(getCharWidth('9'.codePointAt(0) ?? 0)).toBe(1);
			});

			it('handles punctuation', () => {
				expect(getCharWidth('.'.codePointAt(0) ?? 0)).toBe(1);
				expect(getCharWidth(','.codePointAt(0) ?? 0)).toBe(1);
			});
		});
	});

	describe('boundary tests', () => {
		it('handles code point 0', () => {
			expect(isZeroWidthChar(0)).toBe(true);
			expect(getCharWidth(0)).toBe(0);
		});

		it('handles high code points', () => {
			// CJK Extension B
			expect(isWideChar(0x20000)).toBe(true);
			expect(getCharWidth(0x20000)).toBe(2);
		});

		it('handles variation selectors supplement', () => {
			expect(isZeroWidthChar(0xe0100)).toBe(true);
			expect(getCharWidth(0xe0100)).toBe(0);
		});
	});

	describe('performance', () => {
		it('handles many lookups efficiently', () => {
			const start = performance.now();
			for (let i = 0; i < 10000; i++) {
				getCharWidth(0x4e00 + (i % 1000));
			}
			const elapsed = performance.now() - start;
			// Should complete in well under 100ms
			expect(elapsed).toBeLessThan(100);
		});
	});
});
