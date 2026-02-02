import { describe, expect, it } from 'vitest';
import {
	centerByWidth,
	charWidth,
	charWidthAt,
	codePointWidth,
	columnAtIndex,
	hasWideChars,
	hasZeroWidthChars,
	indexAtColumn,
	padEndByWidth,
	padStartByWidth,
	sliceByWidth,
	stringWidth,
	strWidth,
	truncateByWidth,
	truncateWithEllipsis,
} from './stringWidth';

describe('stringWidth', () => {
	describe('codePointWidth', () => {
		it('returns 1 for ASCII', () => {
			expect(codePointWidth(0x0041)).toBe(1); // A
			expect(codePointWidth(0x0061)).toBe(1); // a
			expect(codePointWidth(0x0030)).toBe(1); // 0
		});

		it('returns 2 for CJK', () => {
			expect(codePointWidth(0x4e00)).toBe(2); // 一
			expect(codePointWidth(0x4e2d)).toBe(2); // 中
		});

		it('returns 0 for combining marks', () => {
			expect(codePointWidth(0x0300)).toBe(0); // Combining grave
			expect(codePointWidth(0x0301)).toBe(0); // Combining acute
		});

		it('returns 2 for emoji', () => {
			expect(codePointWidth(0x1f600)).toBe(2); // 😀
		});
	});

	describe('charWidth', () => {
		it('returns width for single characters', () => {
			expect(charWidth('A')).toBe(1);
			expect(charWidth('中')).toBe(2);
		});

		it('handles surrogate pairs', () => {
			expect(charWidth('😀')).toBe(2);
			expect(charWidth('🚀')).toBe(2);
		});

		it('returns 0 for empty string', () => {
			expect(charWidth('')).toBe(0);
		});
	});

	describe('charWidthAt', () => {
		it('returns width at valid index', () => {
			const str = 'A中B';
			expect(charWidthAt(str, 0)).toBe(1); // A
			expect(charWidthAt(str, 1)).toBe(2); // 中
			expect(charWidthAt(str, 2)).toBe(1); // B
		});

		it('handles surrogate pairs', () => {
			const str = 'A😀B';
			expect(charWidthAt(str, 0)).toBe(1); // A
			expect(charWidthAt(str, 1)).toBe(2); // 😀
			expect(charWidthAt(str, 2)).toBe(1); // B
		});

		it('returns -1 for out of bounds', () => {
			expect(charWidthAt('ABC', 3)).toBe(-1);
			expect(charWidthAt('ABC', -1)).toBe(-1);
		});
	});

	describe('stringWidth', () => {
		describe('ASCII strings', () => {
			it('calculates width correctly', () => {
				expect(stringWidth('Hello')).toBe(5);
				expect(stringWidth('Hello World')).toBe(11);
			});

			it('handles empty string', () => {
				expect(stringWidth('')).toBe(0);
			});
		});

		describe('CJK strings', () => {
			it('calculates double width', () => {
				expect(stringWidth('中')).toBe(2);
				expect(stringWidth('中文')).toBe(4);
				expect(stringWidth('你好')).toBe(4);
			});
		});

		describe('mixed strings', () => {
			it('calculates combined width', () => {
				expect(stringWidth('Hello中')).toBe(7); // 5 + 2
				expect(stringWidth('Hello世界')).toBe(9); // 5 + 4
			});
		});

		describe('emoji', () => {
			it('calculates emoji as wide', () => {
				expect(stringWidth('😀')).toBe(2);
				expect(stringWidth('Hello😀')).toBe(7); // 5 + 2
				expect(stringWidth('😀😀😀')).toBe(6); // 2 + 2 + 2
			});
		});

		describe('combining characters', () => {
			it('treats combining marks as zero-width', () => {
				// 'é' as e + combining acute = 2 chars, width 1
				expect(stringWidth('e\u0301')).toBe(1);
				// 'café' with combining accent
				expect(stringWidth('cafe\u0301')).toBe(4);
			});
		});

		describe('tabs', () => {
			it('uses default tab width of 8', () => {
				expect(stringWidth('\t')).toBe(8);
				expect(stringWidth('A\t')).toBe(8); // A=1, tab advances to column 8
				expect(stringWidth('AB\t')).toBe(8); // AB=2, tab advances to column 8
			});

			it('respects custom tab width', () => {
				expect(stringWidth('\t', { tabWidth: 4 })).toBe(4);
				expect(stringWidth('A\t', { tabWidth: 4 })).toBe(4);
				expect(stringWidth('ABC\t', { tabWidth: 4 })).toBe(4);
				expect(stringWidth('ABCD\t', { tabWidth: 4 })).toBe(8);
			});

			it('calculates tab stops correctly', () => {
				// Tab advances to next tab stop
				expect(stringWidth('A\tB')).toBe(9); // A=1, tab to 8, B=1
				expect(stringWidth('ABCDEFGH\tI')).toBe(17); // 8 chars, tab to 16, I=1
			});
		});

		describe('ambiguous width', () => {
			it('treats ambiguous as narrow by default', () => {
				expect(stringWidth('α')).toBe(1); // Greek alpha
				expect(stringWidth('αβγ')).toBe(3);
			});

			it('treats ambiguous as wide when option set', () => {
				expect(stringWidth('α', { ambiguousAsWide: true })).toBe(2);
				expect(stringWidth('αβγ', { ambiguousAsWide: true })).toBe(6);
			});
		});
	});

	describe('strWidth', () => {
		it('is an alias for stringWidth', () => {
			expect(strWidth('Hello')).toBe(stringWidth('Hello'));
			expect(strWidth('你好')).toBe(stringWidth('你好'));
		});
	});

	describe('sliceByWidth', () => {
		it('slices ASCII strings correctly', () => {
			const result = sliceByWidth('Hello World', 8);
			expect(result.text).toBe('Hello Wo');
			expect(result.width).toBe(8);
			expect(result.truncated).toBe(true);
		});

		it('handles CJK at boundary', () => {
			const result = sliceByWidth('你好世界', 5);
			expect(result.text).toBe('你好');
			expect(result.width).toBe(4);
			expect(result.truncated).toBe(true);
		});

		it('does not truncate short strings', () => {
			const result = sliceByWidth('Hi', 10);
			expect(result.text).toBe('Hi');
			expect(result.width).toBe(2);
			expect(result.truncated).toBe(false);
		});

		it('handles emoji', () => {
			const result = sliceByWidth('A😀B', 3);
			expect(result.text).toBe('A😀');
			expect(result.width).toBe(3);
			expect(result.truncated).toBe(true);
		});

		it('handles exact fit', () => {
			const result = sliceByWidth('Hello', 5);
			expect(result.text).toBe('Hello');
			expect(result.width).toBe(5);
			expect(result.truncated).toBe(false);
		});
	});

	describe('truncateByWidth', () => {
		it('truncates correctly', () => {
			expect(truncateByWidth('Hello World', 8)).toBe('Hello Wo');
			expect(truncateByWidth('你好世界', 5)).toBe('你好');
		});

		it('returns full string if fits', () => {
			expect(truncateByWidth('Hi', 10)).toBe('Hi');
		});
	});

	describe('truncateWithEllipsis', () => {
		it('adds ellipsis when truncating', () => {
			expect(truncateWithEllipsis('Hello World', 8)).toBe('Hello W…');
		});

		it('uses custom ellipsis', () => {
			expect(truncateWithEllipsis('Hello World', 8, '...')).toBe('Hello...');
		});

		it('does not add ellipsis if fits', () => {
			expect(truncateWithEllipsis('Hi', 10)).toBe('Hi');
		});

		it('handles very narrow width', () => {
			expect(truncateWithEllipsis('Hello', 1)).toBe('…');
		});

		it('handles CJK', () => {
			expect(truncateWithEllipsis('你好世界', 5)).toBe('你好…');
		});
	});

	describe('padEndByWidth', () => {
		it('pads short strings', () => {
			expect(padEndByWidth('Hi', 5)).toBe('Hi   ');
		});

		it('handles CJK', () => {
			expect(padEndByWidth('你好', 6)).toBe('你好  ');
		});

		it('uses custom pad char', () => {
			expect(padEndByWidth('Hi', 5, '.')).toBe('Hi...');
		});

		it('does not pad if already at width', () => {
			expect(padEndByWidth('Hello', 5)).toBe('Hello');
		});

		it('does not pad if over width', () => {
			expect(padEndByWidth('Hello World', 5)).toBe('Hello World');
		});
	});

	describe('padStartByWidth', () => {
		it('pads short strings', () => {
			expect(padStartByWidth('Hi', 5)).toBe('   Hi');
		});

		it('handles CJK', () => {
			expect(padStartByWidth('你好', 6)).toBe('  你好');
		});

		it('uses custom pad char', () => {
			expect(padStartByWidth('Hi', 5, '0')).toBe('000Hi');
		});
	});

	describe('centerByWidth', () => {
		it('centers strings', () => {
			expect(centerByWidth('Hi', 6)).toBe('  Hi  ');
		});

		it('handles odd padding', () => {
			expect(centerByWidth('Hi', 5)).toBe(' Hi  ');
		});

		it('handles CJK', () => {
			expect(centerByWidth('你好', 8)).toBe('  你好  ');
		});
	});

	describe('indexAtColumn', () => {
		it('finds index for ASCII', () => {
			expect(indexAtColumn('Hello', 0)).toBe(0);
			expect(indexAtColumn('Hello', 2)).toBe(2);
			expect(indexAtColumn('Hello', 4)).toBe(4);
		});

		it('finds index for CJK', () => {
			const str = 'A中B';
			expect(indexAtColumn(str, 0)).toBe(0); // A
			expect(indexAtColumn(str, 1)).toBe(1); // 中 starts
			expect(indexAtColumn(str, 2)).toBe(1); // 中 spans
			expect(indexAtColumn(str, 3)).toBe(2); // B
		});

		it('returns -1 for past end', () => {
			expect(indexAtColumn('Hi', 2)).toBe(-1);
		});

		it('returns -1 for negative column', () => {
			expect(indexAtColumn('Hi', -1)).toBe(-1);
		});
	});

	describe('columnAtIndex', () => {
		it('finds column for ASCII', () => {
			expect(columnAtIndex('Hello', 0)).toBe(0);
			expect(columnAtIndex('Hello', 2)).toBe(2);
			expect(columnAtIndex('Hello', 4)).toBe(4);
		});

		it('finds column for CJK', () => {
			const str = 'A中B';
			expect(columnAtIndex(str, 0)).toBe(0); // A at 0
			expect(columnAtIndex(str, 1)).toBe(1); // 中 at 1
			expect(columnAtIndex(str, 2)).toBe(3); // B at 3
		});

		it('returns -1 for out of bounds', () => {
			expect(columnAtIndex('Hi', 2)).toBe(-1);
			expect(columnAtIndex('Hi', -1)).toBe(-1);
		});
	});

	describe('hasWideChars', () => {
		it('returns false for ASCII', () => {
			expect(hasWideChars('Hello')).toBe(false);
		});

		it('returns true for CJK', () => {
			expect(hasWideChars('Hello中')).toBe(true);
		});

		it('returns true for emoji', () => {
			expect(hasWideChars('Hello😀')).toBe(true);
		});
	});

	describe('hasZeroWidthChars', () => {
		it('returns false for ASCII', () => {
			expect(hasZeroWidthChars('Hello')).toBe(false);
		});

		it('returns true for combining marks', () => {
			expect(hasZeroWidthChars('café')).toBe(false); // precomposed
			expect(hasZeroWidthChars('cafe\u0301')).toBe(true); // decomposed
		});

		it('returns true for zero-width space', () => {
			expect(hasZeroWidthChars('a\u200Bb')).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('handles empty string in all functions', () => {
			expect(stringWidth('')).toBe(0);
			expect(sliceByWidth('', 5).text).toBe('');
			expect(truncateByWidth('', 5)).toBe('');
			expect(padEndByWidth('', 5)).toBe('     ');
			expect(hasWideChars('')).toBe(false);
		});

		it('handles zero max width', () => {
			expect(sliceByWidth('Hello', 0).text).toBe('');
			expect(truncateByWidth('Hello', 0)).toBe('');
		});
	});
});
