/**
 * Color matching algorithms for finding nearest palette colors
 * @module terminal/colors/match
 */

import { type Color256, PALETTE_RGB, type RGB } from './palette';

// =============================================================================
// COLOR DISTANCE ALGORITHMS
// =============================================================================

/**
 * Calculates Euclidean distance between two colors in RGB space.
 * Simple and fast, but not perceptually accurate.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @returns Squared Euclidean distance (no sqrt for performance)
 *
 * @example
 * ```typescript
 * import { euclideanDistance } from 'blecsd';
 *
 * const dist = euclideanDistance(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 200, g: 50, b: 50 }
 * );
 * ```
 */
export function euclideanDistance(c1: RGB, c2: RGB): number {
	const dr = c1.r - c2.r;
	const dg = c1.g - c2.g;
	const db = c1.b - c2.b;
	return dr * dr + dg * dg + db * db;
}

/**
 * Calculates weighted Euclidean distance using human perception weights.
 * More perceptually accurate than simple Euclidean distance.
 * Based on the fact that human eyes are more sensitive to green and less to blue.
 *
 * Weights: R=0.299, G=0.587, B=0.114 (ITU-R BT.601)
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @returns Weighted squared distance
 *
 * @example
 * ```typescript
 * import { weightedDistance } from 'blecsd';
 *
 * const dist = weightedDistance(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 200, g: 50, b: 50 }
 * );
 * ```
 */
export function weightedDistance(c1: RGB, c2: RGB): number {
	const dr = c1.r - c2.r;
	const dg = c1.g - c2.g;
	const db = c1.b - c2.b;
	// Use squared weights to avoid sqrt
	// Weights based on ITU-R BT.601 luminance coefficients
	return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

/**
 * Advanced weighted distance that accounts for human perception of red.
 * The human eye perceives differences in red more when the overall
 * color is already red.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @returns Perceptually weighted distance
 *
 * @example
 * ```typescript
 * import { redMeanDistance } from 'blecsd';
 *
 * const dist = redMeanDistance(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 200, g: 50, b: 50 }
 * );
 * ```
 */
export function redMeanDistance(c1: RGB, c2: RGB): number {
	const rmean = (c1.r + c2.r) / 2;
	const dr = c1.r - c2.r;
	const dg = c1.g - c2.g;
	const db = c1.b - c2.b;

	// Weights change based on average red value
	const rWeight = 2 + rmean / 256;
	const gWeight = 4.0;
	const bWeight = 2 + (255 - rmean) / 256;

	return dr * dr * rWeight + dg * dg * gWeight + db * db * bWeight;
}

// =============================================================================
// COLOR MATCHING
// =============================================================================

/**
 * Distance function type for color matching.
 */
export type DistanceFunction = (c1: RGB, c2: RGB) => number;

/**
 * Options for color matching.
 */
export interface MatchOptions {
	/**
	 * Distance function to use. Defaults to euclidean.
	 */
	distance?: DistanceFunction;

	/**
	 * Subset of palette to search. Defaults to full 256-color palette.
	 */
	palette?: readonly RGB[];

	/**
	 * Palette indices corresponding to the palette colors.
	 * Required if using a custom palette subset.
	 */
	indices?: readonly number[];
}

/**
 * Finds the nearest color in a palette to a given RGB color.
 *
 * @param rgb - The RGB color to match
 * @param options - Matching options
 * @returns The nearest Color256 index
 *
 * @example
 * ```typescript
 * import { matchColor, weightedDistance } from 'blecsd';
 *
 * // Using default Euclidean distance
 * const nearest = matchColor({ r: 200, g: 50, b: 100 });
 *
 * // Using perceptually weighted distance
 * const better = matchColor(
 *   { r: 200, g: 50, b: 100 },
 *   { distance: weightedDistance }
 * );
 * ```
 */
export function matchColor(rgb: RGB, options: MatchOptions = {}): Color256 {
	const { distance = euclideanDistance, palette = PALETTE_RGB, indices } = options;

	let bestIndex = 0;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (let i = 0; i < palette.length; i++) {
		const paletteColor = palette[i];
		const dist = distance(rgb, paletteColor);

		if (dist < bestDistance) {
			bestDistance = dist;
			bestIndex = indices ? indices[i] : i;
		}

		// Early exit for exact match
		if (dist === 0) break;
	}

	return bestIndex as Color256;
}

// =============================================================================
// CACHED MATCHING
// =============================================================================

/**
 * Simple LRU cache for color matching results.
 */
class ColorCache {
	private cache: Map<number, Color256>;
	private maxSize: number;

	constructor(maxSize: number = 1024) {
		this.cache = new Map();
		this.maxSize = maxSize;
	}

	/**
	 * Creates a cache key from RGB values.
	 */
	private key(rgb: RGB): number {
		return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
	}

	/**
	 * Gets a cached result.
	 */
	get(rgb: RGB): Color256 | undefined {
		const k = this.key(rgb);
		const value = this.cache.get(k);

		if (value !== undefined) {
			// Move to end for LRU
			this.cache.delete(k);
			this.cache.set(k, value);
		}

		return value;
	}

	/**
	 * Sets a cached result.
	 */
	set(rgb: RGB, color: Color256): void {
		const k = this.key(rgb);

		// Delete if exists (to update position)
		if (this.cache.has(k)) {
			this.cache.delete(k);
		}

		// Evict oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(k, color);
	}

	/**
	 * Clears the cache.
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Returns the current cache size.
	 */
	get size(): number {
		return this.cache.size;
	}
}

// Global cache instance
const globalCache = new ColorCache(4096);

/**
 * Matches a color with LRU caching for performance.
 * Use this for repeated color matching operations.
 *
 * @param rgb - The RGB color to match
 * @param options - Matching options (note: changing options bypasses cache)
 * @returns The nearest Color256 index
 *
 * @example
 * ```typescript
 * import { matchColorCached } from 'blecsd';
 *
 * // First call computes and caches
 * const c1 = matchColorCached({ r: 200, g: 50, b: 100 });
 *
 * // Second call returns cached result
 * const c2 = matchColorCached({ r: 200, g: 50, b: 100 });
 * ```
 */
export function matchColorCached(rgb: RGB, options?: MatchOptions): Color256 {
	// Only use cache for default options (full palette, euclidean distance)
	if (!options || (options.distance === undefined && options.palette === undefined)) {
		const cached = globalCache.get(rgb);
		if (cached !== undefined) {
			return cached;
		}

		const result = matchColor(rgb, options);
		globalCache.set(rgb, result);
		return result;
	}

	// Custom options: no caching
	return matchColor(rgb, options);
}

/**
 * Clears the global color matching cache.
 * Useful for testing or when memory pressure is high.
 *
 * @example
 * ```typescript
 * import { clearColorCache } from 'blecsd';
 *
 * clearColorCache();
 * ```
 */
export function clearColorCache(): void {
	globalCache.clear();
}

/**
 * Returns the current size of the color matching cache.
 *
 * @example
 * ```typescript
 * import { getColorCacheSize } from 'blecsd';
 *
 * console.log(`Cache has ${getColorCacheSize()} entries`);
 * ```
 */
export function getColorCacheSize(): number {
	return globalCache.size;
}

/**
 * Creates a new ColorCache instance for custom caching needs.
 *
 * @param maxSize - Maximum cache size (default: 1024)
 * @returns A new ColorCache instance
 *
 * @example
 * ```typescript
 * import { createColorCache, matchColor } from 'blecsd';
 *
 * const cache = createColorCache(256);
 * // Use cache.get/set with matchColor for custom caching
 * ```
 */
export function createColorCache(maxSize: number = 1024): ColorCache {
	return new ColorCache(maxSize);
}

// =============================================================================
// SPECIALIZED MATCHERS
// =============================================================================

// Pre-built palette subsets for optimized matching
const GRAYSCALE_PALETTE: readonly RGB[] = PALETTE_RGB.slice(232, 256);
const GRAYSCALE_INDICES: readonly number[] = Array.from({ length: 24 }, (_, i) => 232 + i);

const COLOR_CUBE_PALETTE: readonly RGB[] = PALETTE_RGB.slice(16, 232);
const COLOR_CUBE_INDICES: readonly number[] = Array.from({ length: 216 }, (_, i) => 16 + i);

const STANDARD_PALETTE: readonly RGB[] = PALETTE_RGB.slice(0, 16);
const STANDARD_INDICES: readonly number[] = Array.from({ length: 16 }, (_, i) => i);

/**
 * Matches to the nearest grayscale color (232-255).
 *
 * @param rgb - The RGB color to match
 * @returns The nearest grayscale Color256 index
 *
 * @example
 * ```typescript
 * import { matchGrayscale } from 'blecsd';
 *
 * const gray = matchGrayscale({ r: 128, g: 130, b: 126 });
 * ```
 */
export function matchGrayscale(rgb: RGB): Color256 {
	return matchColor(rgb, {
		palette: GRAYSCALE_PALETTE,
		indices: GRAYSCALE_INDICES,
	});
}

/**
 * Matches to the nearest color cube color (16-231).
 *
 * @param rgb - The RGB color to match
 * @returns The nearest color cube Color256 index
 *
 * @example
 * ```typescript
 * import { matchColorCube } from 'blecsd';
 *
 * const cube = matchColorCube({ r: 200, g: 50, b: 100 });
 * ```
 */
export function matchColorCube(rgb: RGB): Color256 {
	return matchColor(rgb, {
		palette: COLOR_CUBE_PALETTE,
		indices: COLOR_CUBE_INDICES,
	});
}

/**
 * Matches to the nearest standard ANSI color (0-15).
 *
 * @param rgb - The RGB color to match
 * @returns The nearest standard Color256 index
 *
 * @example
 * ```typescript
 * import { matchStandardColor } from 'blecsd';
 *
 * const ansi = matchStandardColor({ r: 200, g: 50, b: 100 });
 * ```
 */
export function matchStandardColor(rgb: RGB): Color256 {
	return matchColor(rgb, {
		palette: STANDARD_PALETTE,
		indices: STANDARD_INDICES,
	});
}

/**
 * Finds the best match considering both color accuracy and terminal compatibility.
 * First checks if there's a good grayscale match for near-gray colors,
 * otherwise falls back to the full palette.
 *
 * @param rgb - The RGB color to match
 * @returns The nearest Color256 index
 *
 * @example
 * ```typescript
 * import { matchColorSmart } from 'blecsd';
 *
 * // Automatically picks grayscale for gray-ish colors
 * const color = matchColorSmart({ r: 128, g: 130, b: 126 });
 * ```
 */
export function matchColorSmart(rgb: RGB): Color256 {
	// Check if color is approximately grayscale
	const avg = (rgb.r + rgb.g + rgb.b) / 3;
	const maxDiff = Math.max(Math.abs(rgb.r - avg), Math.abs(rgb.g - avg), Math.abs(rgb.b - avg));

	// If nearly grayscale (within 10 units), prefer grayscale palette
	if (maxDiff < 10) {
		return matchGrayscale(rgb);
	}

	// Otherwise use full palette match
	return matchColorCached(rgb);
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Matches multiple colors at once for better performance.
 *
 * @param colors - Array of RGB colors to match
 * @param options - Matching options
 * @returns Array of Color256 indices
 *
 * @example
 * ```typescript
 * import { matchColors } from 'blecsd';
 *
 * const indices = matchColors([
 *   { r: 255, g: 0, b: 0 },
 *   { r: 0, g: 255, b: 0 },
 *   { r: 0, g: 0, b: 255 },
 * ]);
 * ```
 */
export function matchColors(colors: readonly RGB[], options?: MatchOptions): Color256[] {
	return colors.map((rgb) => matchColorCached(rgb, options));
}

// =============================================================================
// COLOR DIFFERENCE METRICS
// =============================================================================

/**
 * Calculates the perceptual difference between two colors.
 * Returns a value where:
 * - 0 = identical
 * - < 1 = not perceptible by human eye
 * - 1-2 = barely perceptible
 * - 2-10 = perceptible at a glance
 * - > 10 = colors are clearly different
 *
 * Uses simplified CIE76 formula approximation.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @returns Perceptual difference value
 *
 * @example
 * ```typescript
 * import { colorDifference } from 'blecsd';
 *
 * const diff = colorDifference(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 250, g: 10, b: 10 }
 * );
 *
 * if (diff < 2) {
 *   console.log('Colors are nearly identical');
 * }
 * ```
 */
export function colorDifference(c1: RGB, c2: RGB): number {
	// Simple approximation using weighted Euclidean distance
	const dist = weightedDistance(c1, c2);
	// Scale to approximate perceptual units
	return Math.sqrt(dist) / 10;
}

/**
 * Checks if two colors are perceptually similar.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @param threshold - Maximum perceptual difference (default: 2.5)
 * @returns True if colors are similar
 *
 * @example
 * ```typescript
 * import { colorsSimilar } from 'blecsd';
 *
 * if (colorsSimilar({ r: 255, g: 0, b: 0 }, { r: 250, g: 5, b: 5 })) {
 *   console.log('Colors look the same');
 * }
 * ```
 */
export function colorsSimilar(c1: RGB, c2: RGB, threshold: number = 2.5): boolean {
	return colorDifference(c1, c2) < threshold;
}

/**
 * Checks if two Color256 indices represent similar colors.
 *
 * @param a - First color index
 * @param b - Second color index
 * @param threshold - Maximum perceptual difference (default: 2.5)
 * @returns True if colors are similar
 *
 * @example
 * ```typescript
 * import { color256Similar } from 'blecsd';
 *
 * if (color256Similar(9, 196)) { // Bright red vs cube red
 *   console.log('These reds look similar');
 * }
 * ```
 */
export function color256Similar(a: Color256, b: Color256, threshold: number = 2.5): boolean {
	if (a === b) return true;
	return colorsSimilar(PALETTE_RGB[a], PALETTE_RGB[b], threshold);
}
