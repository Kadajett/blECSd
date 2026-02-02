import { describe, expect, it } from 'vitest';
import {
	COMBINING_RANGES,
	COMBINING_SET,
	getCombiningCharCount,
	isCombiningChar,
	isCombiningCharBinarySearch,
} from './combining';

describe('combining', () => {
	describe('COMBINING_RANGES', () => {
		it('has entries', () => {
			expect(COMBINING_RANGES.length).toBeGreaterThan(0);
		});

		it('ranges have valid format [start, end]', () => {
			for (const [start, end] of COMBINING_RANGES) {
				expect(start).toBeLessThanOrEqual(end);
				expect(start).toBeGreaterThanOrEqual(0);
			}
		});

		it('includes Combining Diacritical Marks range', () => {
			const hasCDM = COMBINING_RANGES.some(([start, end]) => start === 0x0300 && end === 0x036f);
			expect(hasCDM).toBe(true);
		});

		it('includes Variation Selectors range', () => {
			const hasVS = COMBINING_RANGES.some(([start, end]) => start === 0xfe00 && end === 0xfe0f);
			expect(hasVS).toBe(true);
		});
	});

	describe('COMBINING_SET', () => {
		it('is a Set', () => {
			expect(COMBINING_SET).toBeInstanceOf(Set);
		});

		it('has entries', () => {
			expect(COMBINING_SET.size).toBeGreaterThan(0);
		});

		it('contains combining diacritical marks', () => {
			expect(COMBINING_SET.has(0x0300)).toBe(true); // Combining grave
			expect(COMBINING_SET.has(0x0301)).toBe(true); // Combining acute
			expect(COMBINING_SET.has(0x036f)).toBe(true); // Last in range
		});

		it('does not contain ASCII', () => {
			expect(COMBINING_SET.has(0x0041)).toBe(false); // A
			expect(COMBINING_SET.has(0x0061)).toBe(false); // a
		});
	});

	describe('isCombiningChar', () => {
		describe('combining diacritical marks', () => {
			it('returns true for combining grave accent', () => {
				expect(isCombiningChar(0x0300)).toBe(true);
			});

			it('returns true for combining acute accent', () => {
				expect(isCombiningChar(0x0301)).toBe(true);
			});

			it('returns true for combining diaeresis', () => {
				expect(isCombiningChar(0x0308)).toBe(true);
			});

			it('returns true for combining tilde', () => {
				expect(isCombiningChar(0x0303)).toBe(true);
			});
		});

		describe('Arabic combining marks', () => {
			it('returns true for Arabic fathatan', () => {
				expect(isCombiningChar(0x064b)).toBe(true);
			});

			it('returns true for Arabic kasra', () => {
				expect(isCombiningChar(0x0650)).toBe(true);
			});
		});

		describe('Hebrew combining marks', () => {
			it('returns true for Hebrew point sheva', () => {
				expect(isCombiningChar(0x05b0)).toBe(true);
			});
		});

		describe('Thai combining marks', () => {
			it('returns true for Thai mai ek', () => {
				expect(isCombiningChar(0x0e48)).toBe(true);
			});
		});

		describe('variation selectors', () => {
			it('returns true for variation selector 1', () => {
				expect(isCombiningChar(0xfe00)).toBe(true);
			});

			it('returns true for variation selector 16', () => {
				expect(isCombiningChar(0xfe0f)).toBe(true);
			});

			it('returns true for variation selectors supplement', () => {
				expect(isCombiningChar(0xe0100)).toBe(true);
				expect(isCombiningChar(0xe01ef)).toBe(true);
			});
		});

		describe('non-combining characters', () => {
			it('returns false for ASCII', () => {
				expect(isCombiningChar(0x0041)).toBe(false); // A
				expect(isCombiningChar(0x0061)).toBe(false); // a
				expect(isCombiningChar(0x0030)).toBe(false); // 0
			});

			it('returns false for zero-width space', () => {
				expect(isCombiningChar(0x200b)).toBe(false);
			});

			it('returns false for zero-width joiner', () => {
				expect(isCombiningChar(0x200d)).toBe(false);
			});

			it('returns false for zero-width non-joiner', () => {
				expect(isCombiningChar(0x200c)).toBe(false);
			});

			it('returns false for BOM', () => {
				expect(isCombiningChar(0xfeff)).toBe(false);
			});

			it('returns false for CJK', () => {
				expect(isCombiningChar(0x4e00)).toBe(false); // 一
			});

			it('returns false for emoji', () => {
				expect(isCombiningChar(0x1f600)).toBe(false); // 😀
			});
		});
	});

	describe('isCombiningCharBinarySearch', () => {
		it('returns same results as isCombiningChar', () => {
			const testCases = [
				0x0300, // Combining grave
				0x0301, // Combining acute
				0x0041, // A
				0x200b, // ZWSP
				0x200d, // ZWJ
				0x4e00, // CJK
				0xfe00, // VS1
				0xfe0f, // VS16
			];

			for (const cp of testCases) {
				expect(isCombiningCharBinarySearch(cp)).toBe(isCombiningChar(cp));
			}
		});

		it('returns true for combining characters', () => {
			expect(isCombiningCharBinarySearch(0x0300)).toBe(true);
			expect(isCombiningCharBinarySearch(0x0308)).toBe(true);
		});

		it('returns false for non-combining characters', () => {
			expect(isCombiningCharBinarySearch(0x0041)).toBe(false);
			expect(isCombiningCharBinarySearch(0x200b)).toBe(false);
		});
	});

	describe('getCombiningCharCount', () => {
		it('returns a positive number', () => {
			const count = getCombiningCharCount();
			expect(count).toBeGreaterThan(0);
		});

		it('matches COMBINING_SET size', () => {
			expect(getCombiningCharCount()).toBe(COMBINING_SET.size);
		});

		it('covers at least the basic combining diacritical marks', () => {
			// U+0300-U+036F is 112 code points
			expect(getCombiningCharCount()).toBeGreaterThanOrEqual(112);
		});
	});

	describe('edge cases', () => {
		it('handles code point 0', () => {
			expect(isCombiningChar(0)).toBe(false);
		});

		it('handles code points just before combining range', () => {
			expect(isCombiningChar(0x02ff)).toBe(false);
		});

		it('handles code points just after combining range', () => {
			expect(isCombiningChar(0x0370)).toBe(false);
		});

		it('handles high code points in variation selectors supplement', () => {
			expect(isCombiningChar(0xe0100)).toBe(true);
			expect(isCombiningChar(0xe01ef)).toBe(true);
			expect(isCombiningChar(0xe01f0)).toBe(false);
		});
	});

	describe('consistency', () => {
		it('COMBINING_SET matches COMBINING_RANGES', () => {
			let rangeCount = 0;
			for (const [start, end] of COMBINING_RANGES) {
				rangeCount += end - start + 1;
			}
			expect(COMBINING_SET.size).toBe(rangeCount);
		});

		it('all Set entries are within COMBINING_RANGES', () => {
			for (const cp of COMBINING_SET) {
				let found = false;
				for (const [start, end] of COMBINING_RANGES) {
					if (cp >= start && cp <= end) {
						found = true;
						break;
					}
				}
				expect(found).toBe(true);
			}
		});
	});

	describe('performance', () => {
		it('handles many lookups efficiently', () => {
			const start = performance.now();
			for (let i = 0; i < 10000; i++) {
				isCombiningChar(0x0300 + (i % 100));
			}
			const elapsed = performance.now() - start;
			// Should complete in well under 50ms
			expect(elapsed).toBeLessThan(50);
		});

		it('binary search handles many lookups efficiently', () => {
			const start = performance.now();
			for (let i = 0; i < 10000; i++) {
				isCombiningCharBinarySearch(0x0300 + (i % 100));
			}
			const elapsed = performance.now() - start;
			// Should complete in well under 100ms
			expect(elapsed).toBeLessThan(100);
		});
	});
});
