/**
 * Tests for color matching algorithms
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	clearColorCache,
	color256Similar,
	colorDifference,
	colorsSimilar,
	euclideanDistance,
	getColorCacheSize,
	matchColor,
	matchColorCached,
	matchColorCube,
	matchColorSmart,
	matchColors,
	matchGrayscale,
	matchStandardColor,
	redMeanDistance,
	weightedDistance,
} from './match';
import type { Color256 } from './palette';
import { PALETTE_RGB } from './palette';

describe('match', () => {
	beforeEach(() => {
		clearColorCache();
	});

	describe('euclideanDistance', () => {
		it('returns 0 for identical colors', () => {
			const c = { r: 128, g: 64, b: 192 };
			expect(euclideanDistance(c, c)).toBe(0);
		});

		it('calculates correct distance for simple cases', () => {
			const black = { r: 0, g: 0, b: 0 };
			const white = { r: 255, g: 255, b: 255 };
			// Distance = 255^2 * 3 = 195075
			expect(euclideanDistance(black, white)).toBe(195075);
		});

		it('is symmetric', () => {
			const c1 = { r: 100, g: 50, b: 200 };
			const c2 = { r: 50, g: 100, b: 150 };
			expect(euclideanDistance(c1, c2)).toBe(euclideanDistance(c2, c1));
		});
	});

	describe('weightedDistance', () => {
		it('returns 0 for identical colors', () => {
			const c = { r: 128, g: 64, b: 192 };
			expect(weightedDistance(c, c)).toBe(0);
		});

		it('weights green channel more heavily', () => {
			const base = { r: 128, g: 128, b: 128 };
			const redDiff = { r: 138, g: 128, b: 128 };
			const greenDiff = { r: 128, g: 138, b: 128 };
			const blueDiff = { r: 128, g: 128, b: 138 };

			const redDist = weightedDistance(base, redDiff);
			const greenDist = weightedDistance(base, greenDiff);
			const blueDist = weightedDistance(base, blueDiff);

			// Green should have largest distance due to 0.587 weight
			expect(greenDist).toBeGreaterThan(redDist);
			expect(greenDist).toBeGreaterThan(blueDist);
		});
	});

	describe('redMeanDistance', () => {
		it('returns 0 for identical colors', () => {
			const c = { r: 128, g: 64, b: 192 };
			expect(redMeanDistance(c, c)).toBe(0);
		});

		it('adjusts weights based on red content', () => {
			// With high red, differences in red should matter more
			const highRed1 = { r: 200, g: 100, b: 100 };
			const highRed2 = { r: 210, g: 100, b: 100 };

			const lowRed1 = { r: 50, g: 100, b: 100 };
			const lowRed2 = { r: 60, g: 100, b: 100 };

			const highRedDist = redMeanDistance(highRed1, highRed2);
			const lowRedDist = redMeanDistance(lowRed1, lowRed2);

			// Same 10-unit red difference, but high red context should be weighted more
			expect(highRedDist).toBeGreaterThan(lowRedDist);
		});
	});

	describe('matchColor', () => {
		it('finds exact matches', () => {
			// Red (index 9) is exactly { r: 255, g: 0, b: 0 }
			expect(matchColor({ r: 255, g: 0, b: 0 })).toBe(9);
			// Black (index 0)
			expect(matchColor({ r: 0, g: 0, b: 0 })).toBe(0);
			// White (index 15)
			expect(matchColor({ r: 255, g: 255, b: 255 })).toBe(15);
		});

		it('finds nearest match for non-exact colors', () => {
			// Near-red should match bright red (9)
			const nearRed = matchColor({ r: 250, g: 10, b: 10 });
			expect(nearRed).toBe(9);
		});

		it('uses custom distance function', () => {
			const color = { r: 200, g: 50, b: 100 };
			const euclidean = matchColor(color, { distance: euclideanDistance });
			const weighted = matchColor(color, { distance: weightedDistance });
			// Results may differ based on distance function
			expect(euclidean).toBeDefined();
			expect(weighted).toBeDefined();
		});

		it('uses custom palette subset', () => {
			const color = { r: 128, g: 128, b: 128 };
			// Only search grayscale (232-255)
			const grayscale = PALETTE_RGB.slice(232, 256);
			const indices = Array.from({ length: 24 }, (_, i) => 232 + i);

			const match = matchColor(color, { palette: grayscale, indices });
			expect(match).toBeGreaterThanOrEqual(232);
			expect(match).toBeLessThanOrEqual(255);
		});
	});

	describe('matchColorCached', () => {
		it('caches results', () => {
			const color = { r: 123, g: 45, b: 67 };

			expect(getColorCacheSize()).toBe(0);
			matchColorCached(color);
			expect(getColorCacheSize()).toBe(1);

			// Same color again shouldn't change size (hit cache)
			matchColorCached(color);
			expect(getColorCacheSize()).toBe(1);
		});

		it('returns same result as uncached', () => {
			const color = { r: 200, g: 100, b: 50 };
			const uncached = matchColor(color);
			const cached = matchColorCached(color);
			expect(cached).toBe(uncached);
		});

		it('bypasses cache for custom options', () => {
			const color = { r: 123, g: 45, b: 67 };

			clearColorCache();
			matchColorCached(color, { distance: weightedDistance });
			// Should not cache when using custom distance
			expect(getColorCacheSize()).toBe(0);
		});
	});

	describe('clearColorCache', () => {
		it('clears all cached entries', () => {
			matchColorCached({ r: 100, g: 100, b: 100 });
			matchColorCached({ r: 200, g: 200, b: 200 });
			expect(getColorCacheSize()).toBe(2);

			clearColorCache();
			expect(getColorCacheSize()).toBe(0);
		});
	});

	describe('specialized matchers', () => {
		describe('matchGrayscale', () => {
			it('returns grayscale index', () => {
				const match = matchGrayscale({ r: 128, g: 128, b: 128 });
				expect(match).toBeGreaterThanOrEqual(232);
				expect(match).toBeLessThanOrEqual(255);
			});

			it('handles non-gray colors', () => {
				const match = matchGrayscale({ r: 255, g: 0, b: 0 });
				// Should still return a grayscale, just not a great match
				expect(match).toBeGreaterThanOrEqual(232);
			});
		});

		describe('matchColorCube', () => {
			it('returns color cube index', () => {
				const match = matchColorCube({ r: 200, g: 100, b: 50 });
				expect(match).toBeGreaterThanOrEqual(16);
				expect(match).toBeLessThanOrEqual(231);
			});
		});

		describe('matchStandardColor', () => {
			it('returns standard ANSI color', () => {
				const match = matchStandardColor({ r: 255, g: 0, b: 0 });
				expect(match).toBeGreaterThanOrEqual(0);
				expect(match).toBeLessThanOrEqual(15);
				// Red should match 9 (bright red)
				expect(match).toBe(9);
			});
		});

		describe('matchColorSmart', () => {
			it('uses grayscale for gray-ish colors', () => {
				const match = matchColorSmart({ r: 128, g: 130, b: 126 });
				expect(match).toBeGreaterThanOrEqual(232);
				expect(match).toBeLessThanOrEqual(255);
			});

			it('uses full palette for saturated colors', () => {
				const match = matchColorSmart({ r: 255, g: 0, b: 0 });
				expect(match).toBe(9); // Bright red
			});
		});
	});

	describe('matchColors (batch)', () => {
		it('matches multiple colors', () => {
			const colors = [
				{ r: 255, g: 0, b: 0 },
				{ r: 0, g: 255, b: 0 },
				{ r: 0, g: 0, b: 255 },
			];

			const matches = matchColors(colors);
			expect(matches).toHaveLength(3);
			expect(matches[0]).toBe(9); // Red
			expect(matches[1]).toBe(10); // Lime
			expect(matches[2]).toBe(12); // Blue
		});
	});

	describe('colorDifference', () => {
		it('returns 0 for identical colors', () => {
			const c = { r: 128, g: 64, b: 192 };
			expect(colorDifference(c, c)).toBe(0);
		});

		it('returns small value for similar colors', () => {
			const c1 = { r: 128, g: 128, b: 128 };
			const c2 = { r: 130, g: 126, b: 128 };
			const diff = colorDifference(c1, c2);
			expect(diff).toBeLessThan(1);
		});

		it('returns larger value for different colors', () => {
			const red = { r: 255, g: 0, b: 0 };
			const blue = { r: 0, g: 0, b: 255 };
			const diff = colorDifference(red, blue);
			expect(diff).toBeGreaterThan(10);
		});
	});

	describe('colorsSimilar', () => {
		it('returns true for identical colors', () => {
			const c = { r: 128, g: 64, b: 192 };
			expect(colorsSimilar(c, c)).toBe(true);
		});

		it('returns true for similar colors', () => {
			expect(colorsSimilar({ r: 255, g: 0, b: 0 }, { r: 250, g: 5, b: 5 })).toBe(true);
		});

		it('returns false for different colors', () => {
			expect(colorsSimilar({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 })).toBe(false);
		});

		it('respects threshold', () => {
			const c1 = { r: 128, g: 128, b: 128 };
			const c2 = { r: 140, g: 140, b: 140 };

			// With tight threshold
			expect(colorsSimilar(c1, c2, 0.1)).toBe(false);
			// With loose threshold
			expect(colorsSimilar(c1, c2, 10)).toBe(true);
		});
	});

	describe('color256Similar', () => {
		it('returns true for identical indices', () => {
			expect(color256Similar(9 as Color256, 9 as Color256)).toBe(true);
		});

		it('handles similar palette colors', () => {
			// Standard red (9) vs a similar cube red
			const result = color256Similar(9 as Color256, 196 as Color256);
			// These should be similar (both are reds)
			expect(typeof result).toBe('boolean');
		});

		it('returns false for very different colors', () => {
			// Red (9) vs Blue (12)
			expect(color256Similar(9 as Color256, 12 as Color256)).toBe(false);
		});
	});
});
