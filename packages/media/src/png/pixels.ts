/**
 * PNG pixel extraction.
 *
 * Converts raw reconstructed scanline data into normalized RGBA pixel arrays.
 * Handles all PNG color types and bit depths, including palette-indexed images
 * and sub-byte bit depths (1, 2, 4 bits per channel).
 *
 * @module media/png/pixels
 */

import type { PNGChunk, PNGHeader } from './parser';
import { ColorType } from './parser';
import {
	parsePLTE,
	parseTRNS,
	readChannel8or16,
	readGraySample,
	readPaletteIndex,
} from './pixels-helpers';

// Re-export helpers
export { parsePLTE, parseTRNS } from './pixels-helpers';

// =============================================================================
// TYPES
// =============================================================================

/**
 * RGBA pixel data extracted from a PNG image.
 *
 * @example
 * ```typescript
 * import type { PixelData } from 'blecsd';
 *
 * const pixels: PixelData = {
 *   width: 100,
 *   height: 100,
 *   data: new Uint8Array(100 * 100 * 4),
 * };
 * ```
 */
export interface PixelData {
	readonly width: number;
	readonly height: number;
	readonly data: Uint8Array;
}

export interface PixelResult {
	readonly ok: true;
	readonly pixels: PixelData;
}

export interface PixelError {
	readonly ok: false;
	readonly error: string;
}

export type PixelOutput = PixelResult | PixelError;

/**
 * A parsed PLTE (palette) entry.
 */
export interface PaletteEntry {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

// =============================================================================
// PIXEL EXTRACTION
// =============================================================================

/**
 * Extracts pixels from grayscale image data (color type 0).
 */
function extractGrayscale(rawData: Uint8Array, header: PNGHeader, output: Uint8Array): void {
	const rowBytes = Math.ceil((header.width * header.bitDepth) / 8);

	for (let y = 0; y < header.height; y++) {
		const rowOffset = y * rowBytes;
		for (let x = 0; x < header.width; x++) {
			const outIdx = (y * header.width + x) * 4;
			const gray = readGraySample(rawData, rowOffset, x, header.bitDepth);
			output[outIdx] = gray;
			output[outIdx + 1] = gray;
			output[outIdx + 2] = gray;
			output[outIdx + 3] = 255;
		}
	}
}

/**
 * Writes N channels from rawData to output at 8-bit or 16-bit depth.
 */
function writeChannels(
	rawData: Uint8Array,
	srcIdx: number,
	output: Uint8Array,
	outIdx: number,
	channelCount: number,
	bitDepth: number,
): void {
	const step = bitDepth === 16 ? 2 : 1;
	for (let c = 0; c < channelCount; c++) {
		output[outIdx + c] = readChannel8or16(rawData, srcIdx + c * step, bitDepth);
	}
}

/**
 * Extracts pixels from RGB image data (color type 2).
 */
function extractRGB(rawData: Uint8Array, header: PNGHeader, output: Uint8Array): void {
	const bytesPerChannel = header.bitDepth === 16 ? 2 : 1;
	const rowBytes = header.width * 3 * bytesPerChannel;

	for (let y = 0; y < header.height; y++) {
		const rowOffset = y * rowBytes;
		for (let x = 0; x < header.width; x++) {
			const srcIdx = rowOffset + x * 3 * bytesPerChannel;
			const outIdx = (y * header.width + x) * 4;
			writeChannels(rawData, srcIdx, output, outIdx, 3, header.bitDepth);
			output[outIdx + 3] = 255;
		}
	}
}

/**
 * Writes a single palette-indexed pixel to the output buffer.
 */
function writePalettePixel(
	output: Uint8Array,
	outIdx: number,
	entry: PaletteEntry | undefined,
	alpha: number,
): void {
	output[outIdx] = entry ? entry.r : 0;
	output[outIdx + 1] = entry ? entry.g : 0;
	output[outIdx + 2] = entry ? entry.b : 0;
	output[outIdx + 3] = alpha;
}

/**
 * Resolves the alpha value for a palette index.
 */
function resolvePaletteAlpha(
	index: number,
	entry: PaletteEntry | undefined,
	transparency: readonly number[] | null,
): number {
	if (!entry) return 255;
	if (!transparency) return 255;
	return transparency[index] ?? 255;
}

/**
 * Extracts pixels from palette-indexed image data (color type 3).
 */
function extractIndexed(
	rawData: Uint8Array,
	header: PNGHeader,
	output: Uint8Array,
	palette: readonly PaletteEntry[],
	transparency: readonly number[] | null,
): void {
	const rowBytes = Math.ceil((header.width * header.bitDepth) / 8);

	for (let y = 0; y < header.height; y++) {
		const rowOffset = y * rowBytes;
		for (let x = 0; x < header.width; x++) {
			const outIdx = (y * header.width + x) * 4;
			const index = readPaletteIndex(rawData, rowOffset, x, header.bitDepth);
			const entry = palette[index];
			const alpha = resolvePaletteAlpha(index, entry, transparency);
			writePalettePixel(output, outIdx, entry, alpha);
		}
	}
}

/**
 * Extracts pixels from grayscale+alpha image data (color type 4).
 */
function extractGrayscaleAlpha(rawData: Uint8Array, header: PNGHeader, output: Uint8Array): void {
	const bytesPerChannel = header.bitDepth === 16 ? 2 : 1;
	const rowBytes = header.width * 2 * bytesPerChannel;

	for (let y = 0; y < header.height; y++) {
		const rowOffset = y * rowBytes;
		for (let x = 0; x < header.width; x++) {
			const srcIdx = rowOffset + x * 2 * bytesPerChannel;
			const outIdx = (y * header.width + x) * 4;
			const gray = readChannel8or16(rawData, srcIdx, header.bitDepth);
			const alpha = readChannel8or16(rawData, srcIdx + bytesPerChannel, header.bitDepth);
			output[outIdx] = gray;
			output[outIdx + 1] = gray;
			output[outIdx + 2] = gray;
			output[outIdx + 3] = alpha;
		}
	}
}

/**
 * Extracts pixels from RGBA image data (color type 6).
 */
function extractRGBA(rawData: Uint8Array, header: PNGHeader, output: Uint8Array): void {
	const bytesPerChannel = header.bitDepth === 16 ? 2 : 1;
	const rowBytes = header.width * 4 * bytesPerChannel;

	for (let y = 0; y < header.height; y++) {
		const rowOffset = y * rowBytes;
		for (let x = 0; x < header.width; x++) {
			const srcIdx = rowOffset + x * 4 * bytesPerChannel;
			const outIdx = (y * header.width + x) * 4;
			writeChannels(rawData, srcIdx, output, outIdx, 4, header.bitDepth);
		}
	}
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extracts normalized RGBA pixel data from reconstructed scanline data.
 *
 * Handles all PNG color types (grayscale, RGB, indexed, grayscale+alpha, RGBA)
 * and all standard bit depths (1, 2, 4, 8, 16). Output is always 8-bit RGBA.
 *
 * For indexed images (color type 3), a palette must be provided via the `chunks`
 * parameter. Transparency is read from the tRNS chunk if present.
 *
 * @param rawData - Reconstructed pixel data (output of reconstructFilters)
 * @param header - PNG header with image dimensions and color type
 * @param chunks - Array of PNG chunks (needed for PLTE and tRNS in indexed images)
 * @returns Normalized RGBA pixel data or an error
 *
 * @example
 * ```typescript
 * import { extractPixels, reconstructFilters } from 'blecsd';
 * import { parsePNG } from 'blecsd';
 *
 * const result = parsePNG(pngData);
 * if (result.ok) {
 *   const filterResult = reconstructFilters(result.result.imageData, result.result.header);
 *   if (filterResult.ok) {
 *     const pixelResult = extractPixels(filterResult.data, result.result.header, result.result.chunks);
 *     if (pixelResult.ok) {
 *       console.log(pixelResult.pixels.width, pixelResult.pixels.height);
 *     }
 *   }
 * }
 * ```
 */
/**
 * Resolves palette and transparency data from chunks for indexed images.
 */
function resolveIndexedData(
	chunks: readonly PNGChunk[],
): PixelError | { palette: readonly PaletteEntry[]; transparency: readonly number[] | null } {
	const plteChunk = chunks.find((c) => c.type === 'PLTE');
	if (!plteChunk) {
		return { ok: false, error: 'Indexed color type requires a PLTE chunk' };
	}

	let palette: readonly PaletteEntry[];
	try {
		palette = parsePLTE(plteChunk);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error parsing PLTE';
		return { ok: false, error: msg };
	}

	const trnsChunk = chunks.find((c) => c.type === 'tRNS');
	let transparency: readonly number[] | null = null;
	if (trnsChunk) {
		try {
			transparency = parseTRNS(trnsChunk, palette.length);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error parsing tRNS';
			return { ok: false, error: msg };
		}
	}

	return { palette, transparency };
}

export function extractPixels(
	rawData: Uint8Array,
	header: PNGHeader,
	chunks: readonly PNGChunk[] = [],
): PixelOutput {
	const totalPixels = header.width * header.height;
	const output = new Uint8Array(totalPixels * 4);

	switch (header.colorType) {
		case ColorType.Grayscale:
			extractGrayscale(rawData, header, output);
			break;

		case ColorType.RGB:
			extractRGB(rawData, header, output);
			break;

		case ColorType.Indexed: {
			const indexedData = resolveIndexedData(chunks);
			if ('ok' in indexedData) return indexedData;
			extractIndexed(rawData, header, output, indexedData.palette, indexedData.transparency);
			break;
		}

		case ColorType.GrayscaleAlpha:
			extractGrayscaleAlpha(rawData, header, output);
			break;

		case ColorType.RGBA:
			extractRGBA(rawData, header, output);
			break;

		default:
			return { ok: false, error: `Unsupported color type: ${header.colorType}` };
	}

	return {
		ok: true,
		pixels: { width: header.width, height: header.height, data: output },
	};
}
