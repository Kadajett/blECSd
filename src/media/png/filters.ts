/**
 * PNG scanline filter reconstruction.
 *
 * Implements all five PNG filter types (None, Sub, Up, Average, Paeth)
 * as defined in the PNG specification (RFC 2083, Section 6).
 * Reconstructs filtered scanlines into raw pixel data.
 *
 * @module media/png/filters
 */

import type { ColorType, PNGHeader } from './parser';

// =============================================================================
// TYPES
// =============================================================================

/**
 * PNG filter type values.
 *
 * Each scanline in a PNG image is preceded by a filter type byte
 * that indicates how the scanline data has been filtered.
 *
 * @example
 * ```typescript
 * import { FilterType } from 'blecsd';
 *
 * if (filterByte === FilterType.Paeth) {
 *   // Reconstruct using Paeth predictor
 * }
 * ```
 */
export enum FilterType {
	/** No filtering applied */
	None = 0,
	/** Each byte is predicted by the byte to its left */
	Sub = 1,
	/** Each byte is predicted by the byte above it */
	Up = 2,
	/** Each byte is predicted by the average of left and above */
	Average = 3,
	/** Each byte is predicted by the Paeth predictor function */
	Paeth = 4,
}

/**
 * Result of successful filter reconstruction.
 */
export interface FilterResult {
	readonly ok: true;
	/** Reconstructed raw pixel data (without filter bytes) */
	readonly data: Uint8Array;
}

/**
 * Error result from filter reconstruction.
 */
export interface FilterError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Result type for filter reconstruction.
 */
export type FilterOutput = FilterResult | FilterError;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Computes the number of bytes per pixel for a given color type and bit depth.
 *
 * For sub-byte bit depths (1, 2, 4), returns 1 since the filter operates
 * on byte boundaries.
 *
 * @param colorType - PNG color type
 * @param bitDepth - Bits per channel
 * @returns Bytes per pixel (minimum 1)
 *
 * @example
 * ```typescript
 * import { bytesPerPixel } from 'blecsd';
 * import { ColorType } from 'blecsd';
 *
 * bytesPerPixel(ColorType.RGBA, 8);  // 4
 * bytesPerPixel(ColorType.RGB, 16);  // 6
 * bytesPerPixel(ColorType.Grayscale, 1); // 1
 * ```
 */
export function bytesPerPixel(colorType: ColorType, bitDepth: number): number {
	let channels: number;

	switch (colorType) {
		case 0: // Grayscale
			channels = 1;
			break;
		case 2: // RGB
			channels = 3;
			break;
		case 3: // Indexed
			channels = 1;
			break;
		case 4: // GrayscaleAlpha
			channels = 2;
			break;
		case 6: // RGBA
			channels = 4;
			break;
		default:
			channels = 1;
	}

	// For sub-byte bit depths, filter operates on byte boundaries
	const bpp = Math.max(1, (channels * bitDepth) / 8);
	return Math.ceil(bpp);
}

/**
 * Computes the number of raw bytes per scanline (excluding the filter byte).
 *
 * @param header - PNG header with width, color type, and bit depth
 * @returns Number of bytes per scanline
 *
 * @example
 * ```typescript
 * import { scanlineBytes } from 'blecsd';
 *
 * const rowBytes = scanlineBytes(header);
 * ```
 */
export function scanlineBytes(header: PNGHeader): number {
	let channels: number;

	switch (header.colorType) {
		case 0: // Grayscale
			channels = 1;
			break;
		case 2: // RGB
			channels = 3;
			break;
		case 3: // Indexed
			channels = 1;
			break;
		case 4: // GrayscaleAlpha
			channels = 2;
			break;
		case 6: // RGBA
			channels = 4;
			break;
		default:
			channels = 1;
	}

	// Total bits per row, then ceil to bytes
	const bitsPerRow = header.width * channels * header.bitDepth;
	return Math.ceil(bitsPerRow / 8);
}

// =============================================================================
// PAETH PREDICTOR
// =============================================================================

/**
 * Implements the Paeth predictor function from the PNG specification.
 *
 * Selects the value among a (left), b (above), c (upper-left) that is
 * closest to the linear prediction p = a + b - c.
 *
 * @param a - Byte to the left
 * @param b - Byte above
 * @param c - Byte to the upper-left
 * @returns The predictor value
 *
 * @example
 * ```typescript
 * import { paethPredictor } from 'blecsd';
 *
 * const predicted = paethPredictor(100, 120, 110);
 * ```
 */
export function paethPredictor(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);

	if (pa <= pb && pa <= pc) return a;
	if (pb <= pc) return b;
	return c;
}

// =============================================================================
// FILTER RECONSTRUCTION - Individual filter implementations
// =============================================================================

/**
 * Applies the Sub filter: each byte adds the byte bpp positions to the left.
 */
function applySub(current: Uint8Array, output: Uint8Array, bpp: number): void {
	for (let i = 0; i < current.length; i++) {
		const raw = current[i] ?? 0;
		const left = i >= bpp ? (output[i - bpp] ?? 0) : 0;
		output[i] = (raw + left) & 0xff;
	}
}

/**
 * Applies the Up filter: each byte adds the corresponding byte from the previous row.
 */
function applyUp(current: Uint8Array, output: Uint8Array, previous: Uint8Array | null): void {
	for (let i = 0; i < current.length; i++) {
		const raw = current[i] ?? 0;
		const above = previous ? (previous[i] ?? 0) : 0;
		output[i] = (raw + above) & 0xff;
	}
}

/**
 * Applies the Average filter: each byte adds the average of left and above.
 */
function applyAverage(
	current: Uint8Array,
	output: Uint8Array,
	previous: Uint8Array | null,
	bpp: number,
): void {
	for (let i = 0; i < current.length; i++) {
		const raw = current[i] ?? 0;
		const left = i >= bpp ? (output[i - bpp] ?? 0) : 0;
		const above = previous ? (previous[i] ?? 0) : 0;
		output[i] = (raw + Math.floor((left + above) / 2)) & 0xff;
	}
}

/**
 * Applies the Paeth filter: each byte adds the Paeth prediction of left, above, upper-left.
 */
function applyPaeth(
	current: Uint8Array,
	output: Uint8Array,
	previous: Uint8Array | null,
	bpp: number,
): void {
	for (let i = 0; i < current.length; i++) {
		const raw = current[i] ?? 0;
		const left = i >= bpp ? (output[i - bpp] ?? 0) : 0;
		const above = previous ? (previous[i] ?? 0) : 0;
		const upperLeft = i >= bpp && previous ? (previous[i - bpp] ?? 0) : 0;
		output[i] = (raw + paethPredictor(left, above, upperLeft)) & 0xff;
	}
}

// =============================================================================
// FILTER RECONSTRUCTION - Scanline dispatcher
// =============================================================================

/**
 * Reconstructs a single scanline by reversing the PNG filter.
 */
function reconstructScanline(
	filterType: number,
	current: Uint8Array,
	previous: Uint8Array | null,
	bpp: number,
): Uint8Array {
	const output = new Uint8Array(current.length);

	switch (filterType) {
		case FilterType.None:
			output.set(current);
			break;
		case FilterType.Sub:
			applySub(current, output, bpp);
			break;
		case FilterType.Up:
			applyUp(current, output, previous);
			break;
		case FilterType.Average:
			applyAverage(current, output, previous, bpp);
			break;
		case FilterType.Paeth:
			applyPaeth(current, output, previous, bpp);
			break;
		default:
			output.set(current);
	}

	return output;
}

/**
 * Reconstructs all scanlines from decompressed PNG image data.
 *
 * The decompressed IDAT data consists of rows, each prefixed with a
 * filter type byte. This function reverses the filtering to produce
 * raw pixel data.
 *
 * @param imageData - Decompressed IDAT data (filter byte + row data per scanline)
 * @param header - PNG header with image dimensions and color type
 * @returns Reconstructed pixel data or an error
 *
 * @example
 * ```typescript
 * import { reconstructFilters } from 'blecsd';
 * import { parsePNG } from 'blecsd';
 *
 * const result = parsePNG(pngData);
 * if (result.ok) {
 *   const pixels = reconstructFilters(result.result.imageData, result.result.header);
 *   if (pixels.ok) {
 *     // pixels.data contains raw pixel data
 *   }
 * }
 * ```
 */
export function reconstructFilters(imageData: Uint8Array, header: PNGHeader): FilterOutput {
	const rowBytes = scanlineBytes(header);
	const bpp = bytesPerPixel(header.colorType, header.bitDepth);
	const expectedLength = header.height * (1 + rowBytes);

	if (imageData.length < expectedLength) {
		return {
			ok: false,
			error: `Image data too short: expected ${expectedLength} bytes, got ${imageData.length}`,
		};
	}

	const output = new Uint8Array(header.height * rowBytes);
	let previousRow: Uint8Array | null = null;

	for (let y = 0; y < header.height; y++) {
		const offset = y * (1 + rowBytes);
		const filterByte = imageData[offset] ?? 0;

		if (filterByte > 4) {
			return {
				ok: false,
				error: `Invalid filter type ${filterByte} at row ${y}`,
			};
		}

		const scanline = imageData.slice(offset + 1, offset + 1 + rowBytes);
		const reconstructed = reconstructScanline(filterByte, scanline, previousRow, bpp);

		output.set(reconstructed, y * rowBytes);
		previousRow = reconstructed;
	}

	return { ok: true, data: output };
}
