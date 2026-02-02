import { describe, expect, it } from 'vitest';
import {
	charAtCodePoint,
	characters,
	codePointAt,
	codePointLength,
	codePoints,
	codePointToSurrogatePair,
	fromCodePoint,
	HIGH_SURROGATE_END,
	HIGH_SURROGATE_START,
	isAstral,
	isBMP,
	isHighSurrogate,
	isLowSurrogate,
	isSurrogate,
	isSurrogateCode,
	isValidCodePoint,
	LOW_SURROGATE_END,
	LOW_SURROGATE_START,
	sliceCodePoints,
	surrogatePairToCodePoint,
	toCodePoints,
} from './codePoint';

describe('codePoint', () => {
	describe('constants', () => {
		it('has correct surrogate ranges', () => {
			expect(HIGH_SURROGATE_START).toBe(0xd800);
			expect(HIGH_SURROGATE_END).toBe(0xdbff);
			expect(LOW_SURROGATE_START).toBe(0xdc00);
			expect(LOW_SURROGATE_END).toBe(0xdfff);
		});
	});

	describe('isHighSurrogate', () => {
		it('returns true for high surrogates', () => {
			expect(isHighSurrogate(0xd800)).toBe(true);
			expect(isHighSurrogate(0xd83d)).toBe(true); // Part of emoji
			expect(isHighSurrogate(0xdbff)).toBe(true);
		});

		it('returns false for non-high surrogates', () => {
			expect(isHighSurrogate(0x0041)).toBe(false);
			expect(isHighSurrogate(0xdc00)).toBe(false); // Low surrogate
			expect(isHighSurrogate(0xdfff)).toBe(false);
		});
	});

	describe('isLowSurrogate', () => {
		it('returns true for low surrogates', () => {
			expect(isLowSurrogate(0xdc00)).toBe(true);
			expect(isLowSurrogate(0xde00)).toBe(true); // Part of emoji
			expect(isLowSurrogate(0xdfff)).toBe(true);
		});

		it('returns false for non-low surrogates', () => {
			expect(isLowSurrogate(0x0041)).toBe(false);
			expect(isLowSurrogate(0xd800)).toBe(false); // High surrogate
			expect(isLowSurrogate(0xdbff)).toBe(false);
		});
	});

	describe('isSurrogateCode', () => {
		it('returns true for any surrogate', () => {
			expect(isSurrogateCode(0xd800)).toBe(true);
			expect(isSurrogateCode(0xdbff)).toBe(true);
			expect(isSurrogateCode(0xdc00)).toBe(true);
			expect(isSurrogateCode(0xdfff)).toBe(true);
		});

		it('returns false for non-surrogates', () => {
			expect(isSurrogateCode(0x0041)).toBe(false);
			expect(isSurrogateCode(0x4e00)).toBe(false);
		});
	});

	describe('isSurrogate', () => {
		it('returns true for surrogate positions', () => {
			const emoji = '😀';
			expect(isSurrogate(emoji, 0)).toBe(true);
			expect(isSurrogate(emoji, 1)).toBe(true);
		});

		it('returns false for non-surrogate positions', () => {
			expect(isSurrogate('A', 0)).toBe(false);
			expect(isSurrogate('中', 0)).toBe(false);
		});

		it('returns false for out of bounds', () => {
			expect(isSurrogate('A', 1)).toBe(false);
			expect(isSurrogate('A', -1)).toBe(false);
		});
	});

	describe('surrogatePairToCodePoint', () => {
		it('converts surrogate pairs correctly', () => {
			// 😀 is U+1F600
			expect(surrogatePairToCodePoint(0xd83d, 0xde00)).toBe(0x1f600);
			// 🚀 is U+1F680
			expect(surrogatePairToCodePoint(0xd83d, 0xde80)).toBe(0x1f680);
		});

		it('throws for invalid high surrogate', () => {
			expect(() => surrogatePairToCodePoint(0x0041, 0xde00)).toThrow();
		});

		it('throws for invalid low surrogate', () => {
			expect(() => surrogatePairToCodePoint(0xd83d, 0x0041)).toThrow();
		});
	});

	describe('codePointToSurrogatePair', () => {
		it('converts code points to surrogate pairs', () => {
			expect(codePointToSurrogatePair(0x1f600)).toEqual([0xd83d, 0xde00]);
			expect(codePointToSurrogatePair(0x1f680)).toEqual([0xd83d, 0xde80]);
		});

		it('throws for BMP code points', () => {
			expect(() => codePointToSurrogatePair(0x0041)).toThrow();
			expect(() => codePointToSurrogatePair(0xffff)).toThrow();
		});

		it('throws for invalid code points', () => {
			expect(() => codePointToSurrogatePair(0x110000)).toThrow();
		});
	});

	describe('codePointAt', () => {
		it('returns code point at index', () => {
			expect(codePointAt('A', 0)).toBe(65);
			expect(codePointAt('中', 0)).toBe(0x4e2d);
		});

		it('handles surrogate pairs', () => {
			expect(codePointAt('😀', 0)).toBe(0x1f600);
		});

		it('returns -1 for out of bounds', () => {
			expect(codePointAt('A', 1)).toBe(-1);
			expect(codePointAt('A', -1)).toBe(-1);
		});
	});

	describe('fromCodePoint', () => {
		it('creates strings from code points', () => {
			expect(fromCodePoint(65, 66, 67)).toBe('ABC');
			expect(fromCodePoint(0x1f600)).toBe('😀');
			expect(fromCodePoint(0x4e2d, 0x6587)).toBe('中文');
		});
	});

	describe('codePoints', () => {
		it('iterates over code points', () => {
			const result = [...codePoints('A😀B')];
			expect(result).toEqual([65, 0x1f600, 66]);
		});

		it('handles empty string', () => {
			expect([...codePoints('')]).toEqual([]);
		});

		it('handles CJK', () => {
			const result = [...codePoints('中文')];
			expect(result).toEqual([0x4e2d, 0x6587]);
		});
	});

	describe('toCodePoints', () => {
		it('converts string to code point array', () => {
			expect(toCodePoints('ABC')).toEqual([65, 66, 67]);
			expect(toCodePoints('A😀B')).toEqual([65, 0x1f600, 66]);
		});
	});

	describe('characters', () => {
		it('iterates over characters', () => {
			const result = [...characters('A😀B')];
			expect(result).toEqual(['A', '😀', 'B']);
		});

		it('handles empty string', () => {
			expect([...characters('')]).toEqual([]);
		});
	});

	describe('codePointLength', () => {
		it('returns correct length for ASCII', () => {
			expect(codePointLength('ABC')).toBe(3);
		});

		it('returns correct length for emoji', () => {
			expect(codePointLength('😀')).toBe(1);
			expect('😀'.length).toBe(2); // Compare with string.length
		});

		it('returns correct length for mixed strings', () => {
			expect(codePointLength('A😀B')).toBe(3);
			expect('A😀B'.length).toBe(4); // Compare with string.length
		});
	});

	describe('isValidCodePoint', () => {
		it('returns true for valid code points', () => {
			expect(isValidCodePoint(0x0041)).toBe(true);
			expect(isValidCodePoint(0x1f600)).toBe(true);
			expect(isValidCodePoint(0x10ffff)).toBe(true);
			expect(isValidCodePoint(0)).toBe(true);
		});

		it('returns false for surrogates', () => {
			expect(isValidCodePoint(0xd800)).toBe(false);
			expect(isValidCodePoint(0xdbff)).toBe(false);
			expect(isValidCodePoint(0xdc00)).toBe(false);
			expect(isValidCodePoint(0xdfff)).toBe(false);
		});

		it('returns false for out of range', () => {
			expect(isValidCodePoint(-1)).toBe(false);
			expect(isValidCodePoint(0x110000)).toBe(false);
		});
	});

	describe('isBMP', () => {
		it('returns true for BMP characters', () => {
			expect(isBMP(0x0041)).toBe(true);
			expect(isBMP(0x4e2d)).toBe(true);
			expect(isBMP(0xffff)).toBe(true);
		});

		it('returns false for astral plane', () => {
			expect(isBMP(0x1f600)).toBe(false);
			expect(isBMP(0x20000)).toBe(false);
		});
	});

	describe('isAstral', () => {
		it('returns true for astral plane', () => {
			expect(isAstral(0x1f600)).toBe(true);
			expect(isAstral(0x20000)).toBe(true);
			expect(isAstral(0x10ffff)).toBe(true);
		});

		it('returns false for BMP', () => {
			expect(isAstral(0x0041)).toBe(false);
			expect(isAstral(0xffff)).toBe(false);
		});
	});

	describe('charAtCodePoint', () => {
		it('returns character at code point index', () => {
			const str = 'A😀B';
			expect(charAtCodePoint(str, 0)).toBe('A');
			expect(charAtCodePoint(str, 1)).toBe('😀');
			expect(charAtCodePoint(str, 2)).toBe('B');
		});

		it('returns empty string for out of bounds', () => {
			expect(charAtCodePoint('ABC', 3)).toBe('');
			expect(charAtCodePoint('ABC', -1)).toBe('');
		});
	});

	describe('sliceCodePoints', () => {
		it('slices by code point indices', () => {
			const str = 'A😀B😀C';
			expect(sliceCodePoints(str, 1, 3)).toBe('😀B');
			expect(sliceCodePoints(str, 0, 2)).toBe('A😀');
		});

		it('handles open-ended slice', () => {
			const str = 'A😀B😀C';
			expect(sliceCodePoints(str, 2)).toBe('B😀C');
		});

		it('handles edge cases', () => {
			expect(sliceCodePoints('ABC', 0, 3)).toBe('ABC');
			expect(sliceCodePoints('ABC', 1, 2)).toBe('B');
			expect(sliceCodePoints('', 0, 1)).toBe('');
		});

		it('handles negative start', () => {
			expect(sliceCodePoints('ABC', -1, 2)).toBe('AB');
		});
	});

	describe('round-trip conversions', () => {
		it('converts to code points and back', () => {
			const original = 'Hello😀世界';
			const cps = toCodePoints(original);
			const result = fromCodePoint(...cps);
			expect(result).toBe(original);
		});

		it('converts surrogate pairs round-trip', () => {
			const emoji = 0x1f600;
			const [high, low] = codePointToSurrogatePair(emoji);
			const result = surrogatePairToCodePoint(high, low);
			expect(result).toBe(emoji);
		});
	});
});
