import { describe, expect, it } from 'vitest';
import {
	graphemeAt,
	graphemeClusters,
	graphemeCount,
	graphemeWidth,
	hasGraphemeSegmenter,
	reverseGraphemes,
	sliceByWidthGrapheme,
	sliceGraphemes,
	stringWidthGrapheme,
	toGraphemes,
	truncateWithEllipsisGrapheme,
} from './grapheme';

describe('grapheme', () => {
	describe('hasGraphemeSegmenter', () => {
		it('returns a boolean', () => {
			expect(typeof hasGraphemeSegmenter()).toBe('boolean');
		});

		// Node.js 16+ should have Intl.Segmenter
		it('returns true in modern Node.js', () => {
			expect(hasGraphemeSegmenter()).toBe(true);
		});
	});

	describe('graphemeClusters', () => {
		describe('ASCII strings', () => {
			it('iterates over ASCII characters', () => {
				expect([...graphemeClusters('ABC')]).toEqual(['A', 'B', 'C']);
			});

			it('handles empty string', () => {
				expect([...graphemeClusters('')]).toEqual([]);
			});
		});

		describe('emoji', () => {
			it('treats basic emoji as single grapheme', () => {
				expect([...graphemeClusters('😀')]).toEqual(['😀']);
			});

			it('treats emoji with ZWJ as single grapheme', () => {
				// Family emoji: man + ZWJ + woman + ZWJ + girl
				const family = '👨‍👩‍👧';
				const graphemes = [...graphemeClusters(family)];
				expect(graphemes).toHaveLength(1);
				expect(graphemes[0]).toBe(family);
			});

			it('treats flag as single grapheme', () => {
				// US flag: regional indicator U + regional indicator S
				const flag = '🇺🇸';
				const graphemes = [...graphemeClusters(flag)];
				expect(graphemes).toHaveLength(1);
				expect(graphemes[0]).toBe(flag);
			});

			it('treats emoji with skin tone as single grapheme', () => {
				// Waving hand with medium skin tone
				const wave = '👋🏽';
				const graphemes = [...graphemeClusters(wave)];
				expect(graphemes).toHaveLength(1);
				expect(graphemes[0]).toBe(wave);
			});

			it('handles multiple flags', () => {
				const flags = '🇺🇸🇬🇧🇫🇷';
				const graphemes = [...graphemeClusters(flags)];
				expect(graphemes).toHaveLength(3);
				expect(graphemes).toEqual(['🇺🇸', '🇬🇧', '🇫🇷']);
			});
		});

		describe('combining characters', () => {
			it('treats composed é as single grapheme', () => {
				expect([...graphemeClusters('é')]).toEqual(['é']);
			});

			it('treats decomposed é as single grapheme', () => {
				// e + combining acute
				const decomposed = 'e\u0301';
				const graphemes = [...graphemeClusters(decomposed)];
				expect(graphemes).toHaveLength(1);
			});

			it('handles multiple combining marks', () => {
				// o with combining acute and combining tilde
				const combined = 'o\u0301\u0303';
				const graphemes = [...graphemeClusters(combined)];
				expect(graphemes).toHaveLength(1);
			});
		});

		describe('CJK', () => {
			it('treats CJK as individual graphemes', () => {
				expect([...graphemeClusters('中文')]).toEqual(['中', '文']);
			});
		});

		describe('mixed content', () => {
			it('handles mixed ASCII and emoji', () => {
				const mixed = 'A😀B';
				expect([...graphemeClusters(mixed)]).toEqual(['A', '😀', 'B']);
			});

			it('handles complex mixed content', () => {
				const mixed = 'Hello👨‍👩‍👧World';
				const graphemes = [...graphemeClusters(mixed)];
				expect(graphemes).toHaveLength(11); // H e l l o [family] W o r l d
			});
		});
	});

	describe('toGraphemes', () => {
		it('converts string to array', () => {
			expect(toGraphemes('ABC')).toEqual(['A', 'B', 'C']);
		});

		it('handles emoji', () => {
			expect(toGraphemes('👨‍👩‍👧')).toHaveLength(1);
		});
	});

	describe('graphemeCount', () => {
		it('counts ASCII correctly', () => {
			expect(graphemeCount('Hello')).toBe(5);
		});

		it('counts emoji correctly', () => {
			expect(graphemeCount('😀')).toBe(1);
			expect(graphemeCount('👨‍👩‍👧')).toBe(1);
			expect(graphemeCount('🇺🇸')).toBe(1);
		});

		it('counts mixed content correctly', () => {
			expect(graphemeCount('Hello👨‍👩‍👧World')).toBe(11);
		});

		it('handles empty string', () => {
			expect(graphemeCount('')).toBe(0);
		});

		it('differs from string.length for emoji', () => {
			const emoji = '👨‍👩‍👧';
			expect(emoji.length).toBeGreaterThan(1);
			expect(graphemeCount(emoji)).toBe(1);
		});
	});

	describe('graphemeAt', () => {
		it('returns correct grapheme for ASCII', () => {
			expect(graphemeAt('Hello', 0)).toBe('H');
			expect(graphemeAt('Hello', 4)).toBe('o');
		});

		it('returns correct grapheme for emoji', () => {
			expect(graphemeAt('👨‍👩‍👧ABC', 0)).toBe('👨‍👩‍👧');
			expect(graphemeAt('👨‍👩‍👧ABC', 1)).toBe('A');
		});

		it('returns undefined for out of bounds', () => {
			expect(graphemeAt('Hello', 5)).toBeUndefined();
			expect(graphemeAt('Hello', -1)).toBeUndefined();
		});
	});

	describe('sliceGraphemes', () => {
		it('slices ASCII correctly', () => {
			expect(sliceGraphemes('Hello', 1, 3)).toBe('el');
		});

		it('slices emoji correctly', () => {
			expect(sliceGraphemes('👨‍👩‍👧ABC', 0, 2)).toBe('👨‍👩‍👧A');
			expect(sliceGraphemes('ABC👨‍👩‍👧DEF', 3, 4)).toBe('👨‍👩‍👧');
		});

		it('handles open-ended slice', () => {
			expect(sliceGraphemes('Hello', 2)).toBe('llo');
		});

		it('handles flags', () => {
			expect(sliceGraphemes('🇺🇸🇬🇧🇫🇷', 1, 2)).toBe('🇬🇧');
		});
	});

	describe('graphemeWidth', () => {
		it('returns 1 for ASCII', () => {
			expect(graphemeWidth('A')).toBe(1);
			expect(graphemeWidth(' ')).toBe(1);
		});

		it('returns 2 for CJK', () => {
			expect(graphemeWidth('中')).toBe(2);
		});

		it('returns 2 for emoji', () => {
			expect(graphemeWidth('😀')).toBe(2);
			expect(graphemeWidth('👨‍👩‍👧')).toBe(2);
			expect(graphemeWidth('🇺🇸')).toBe(2);
			expect(graphemeWidth('👋🏽')).toBe(2);
		});

		it('returns 1 for combining sequences', () => {
			expect(graphemeWidth('é')).toBe(1);
			expect(graphemeWidth('e\u0301')).toBe(1);
		});

		it('returns 0 for empty string', () => {
			expect(graphemeWidth('')).toBe(0);
		});
	});

	describe('stringWidthGrapheme', () => {
		it('calculates ASCII width correctly', () => {
			expect(stringWidthGrapheme('Hello')).toBe(5);
		});

		it('calculates CJK width correctly', () => {
			expect(stringWidthGrapheme('中文')).toBe(4);
		});

		it('calculates emoji width correctly', () => {
			expect(stringWidthGrapheme('😀')).toBe(2);
			expect(stringWidthGrapheme('👨‍👩‍👧')).toBe(2);
		});

		it('calculates mixed width correctly', () => {
			expect(stringWidthGrapheme('Hello👨‍👩‍👧')).toBe(7); // 5 + 2
		});

		it('differs from code-point based width for ZWJ sequences', () => {
			const family = '👨‍👩‍👧';
			// Code-point based would count each emoji + ZWJ
			// Grapheme-based counts as single wide grapheme
			expect(stringWidthGrapheme(family)).toBe(2);
		});
	});

	describe('sliceByWidthGrapheme', () => {
		it('slices ASCII correctly', () => {
			const result = sliceByWidthGrapheme('Hello World', 8);
			expect(result.text).toBe('Hello Wo');
			expect(result.width).toBe(8);
			expect(result.truncated).toBe(true);
		});

		it('preserves emoji when possible', () => {
			const result = sliceByWidthGrapheme('Hello👨‍👩‍👧World', 7);
			expect(result.text).toBe('Hello👨‍👩‍👧');
			expect(result.width).toBe(7);
			expect(result.truncated).toBe(true);
		});

		it('handles no truncation', () => {
			const result = sliceByWidthGrapheme('Hi', 10);
			expect(result.text).toBe('Hi');
			expect(result.truncated).toBe(false);
		});

		it('handles CJK at boundary', () => {
			const result = sliceByWidthGrapheme('中文字', 5);
			expect(result.text).toBe('中文');
			expect(result.width).toBe(4);
			expect(result.truncated).toBe(true);
		});
	});

	describe('truncateWithEllipsisGrapheme', () => {
		it('truncates with ellipsis', () => {
			expect(truncateWithEllipsisGrapheme('Hello World', 8)).toBe('Hello W…');
		});

		it('preserves emoji before ellipsis', () => {
			const result = truncateWithEllipsisGrapheme('Hello👨‍👩‍👧World', 8);
			expect(result).toBe('Hello👨‍👩‍👧…');
		});

		it('does not truncate short strings', () => {
			expect(truncateWithEllipsisGrapheme('Hi', 10)).toBe('Hi');
		});

		it('uses custom ellipsis', () => {
			expect(truncateWithEllipsisGrapheme('Hello World', 8, '...')).toBe('Hello...');
		});
	});

	describe('reverseGraphemes', () => {
		it('reverses ASCII correctly', () => {
			expect(reverseGraphemes('Hello')).toBe('olleH');
		});

		it('reverses emoji correctly', () => {
			expect(reverseGraphemes('👨‍👩‍👧ABC')).toBe('CBA👨‍👩‍👧');
		});

		it('reverses flags correctly', () => {
			expect(reverseGraphemes('🇺🇸🇬🇧')).toBe('🇬🇧🇺🇸');
		});

		it('handles empty string', () => {
			expect(reverseGraphemes('')).toBe('');
		});
	});

	describe('performance', () => {
		it('handles long strings efficiently', () => {
			const longString = 'A'.repeat(10000);
			const start = performance.now();
			graphemeCount(longString);
			const elapsed = performance.now() - start;
			expect(elapsed).toBeLessThan(100);
		});

		it('ASCII fast path is efficient', () => {
			const asciiString = 'Hello World '.repeat(100);
			const start = performance.now();
			for (let i = 0; i < 100; i++) {
				graphemeCount(asciiString);
			}
			const elapsed = performance.now() - start;
			expect(elapsed).toBeLessThan(200);
		});
	});
});
