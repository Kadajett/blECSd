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

// =============================================================================
// TYPES
// =============================================================================

/**
 * RGBA pixel data extracted from a PNG image.
 *
 * All pixels are normalized to 8-bit RGBA regardless of the source
 * color type or bit depth.
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
 * // Access pixel at (x, y):
 * // const idx = (y * pixels.width + x) * 4;
 * // R = pixels.data[idx], G = pixels.data[idx+1], B = pixels.data[idx+2], A = pixels.data[idx+3]
 * ```
 */
export interface PixelData {
	/** Image width in pixels */
	readonly width: number;
	/** Image height in pixels */
	readonly height: number;
	/** RGBA pixel data, 4 bytes per pixel (R, G, B, A), each 0-255 */
	readonly data: Uint8Array;
}

/**
 * Successful pixel extraction result.
 */
export interface PixelResult {
	readonly ok: true;
	readonly pixels: PixelData;
}

/**
 * Error result from pixel extraction.
 */
export interface PixelError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Result type for pixel extraction.
 */
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
// PALETTE PARSING
// =============================================================================

/**
 * Parses a PLTE chunk into an array of palette entries.
 *
 * The PLTE chunk contains 1-256 palette entries, each 3 bytes (R, G, B).
 *
 * @param chunk - The PLTE chunk
 * @returns Array of palette entries
 *
 * @example
 * ```typescript
 * import { parsePLTE } from 'blecsd';
 *
 * const palette = parsePLTE(plteChunk);
 * console.log(palette[0]); // { r: 255, g: 0, b: 0 }
 * ```
 */
export function parsePLTE(chunk: PNGChunk): readonly PaletteEntry[] {
	if (chunk.type !== 'PLTE') {
		throw new Error(`Expected PLTE chunk, got '${chunk.type}'`);
	}
	if (chunk.data.length % 3 !== 0) {
		throw new Error(`Invalid PLTE data length: ${chunk.data.length} (must be divisible by 3)`);
	}
	if (chunk.data.length === 0 || chunk.data.length > 768) {
		throw new Error(`Invalid PLTE entry count: ${chunk.data.length / 3} (must be 1-256)`);
	}

	const entries: PaletteEntry[] = [];
	for (let i = 0; i < chunk.data.length; i += 3) {
		entries.push({
			r: chunk.data[i] ?? 0,
			g: chunk.data[i + 1] ?? 0,
			b: chunk.data[i + 2] ?? 0,
		});
	}
	return entries;
}

/**
 * Parses a tRNS (transparency) chunk for palette-indexed images.
 *
 * Returns an array of alpha values corresponding to palette indices.
 * Palette entries without a tRNS entry are fully opaque (255).
 *
 * @param chunk - The tRNS chunk
 * @param paletteSize - Number of palette entries
 * @returns Array of alpha values for each palette index
 *
 * @example
 * ```typescript
 * import { parseTRNS } from 'blecsd';
 *
 * const alphas = parseTRNS(trnsChunk, palette.length);
 * // alphas[i] is the alpha value for palette index i
 * ```
 */
export function parseTRNS(chunk: PNGChunk, paletteSize: number): readonly number[] {
	if (chunk.type !== 'tRNS') {
		throw new Error(`Expected tRNS chunk, got '${chunk.type}'`);
	}

	const alphas: number[] = [];
	for (let i = 0; i < paletteSize; i++) {
		alphas.push(i < chunk.data.length ? (chunk.data[i] ?? 255) : 255);
	}
	return alphas;
}

// =============================================================================
// BIT DEPTH SCALING
// =============================================================================

/**
 * Scales a value from a given bit depth to 8-bit (0-255).
 *
 * @param value - The input value at the source bit depth
 * @param bitDepth - Source bit depth (1, 2, 4, 8, or 16)
 * @returns Value scaled to 0-255 range
 */
function scaleTo8Bit(value: number, bitDepth: number): number {
	switch (bitDepth) {
		case 1:
			return value ? 255 : 0;
		case 2:
			return (value * 255) / 3;
		case 4:
			return (value * 255) / 15;
		case 8:
			return value;
		case 16:
			return value >> 8;
		default:
			return value;
	}
}

/**
 * Extracts a sub-byte sample from a byte at a given bit offset.
 *
 * @param byte - The source byte
 * @param bitDepth - Bits per sample (1, 2, or 4)
 * @param index - Sample index within the byte (0 = leftmost/most significant)
 * @returns The extracted sample value
 */
function extractSubByteSample(byte: number, bitDepth: number, index: number): number {
	const samplesPerByte = 8 / bitDepth;
	const shift = (samplesPerByte - 1 - index) * bitDepth;
	const mask = (1 << bitDepth) - 1;
	return (byte >> shift) & mask;
}

// =============================================================================
// CHANNEL READING HELPERS
// =============================================================================

/**
 * Reads a single channel value at the given byte offset, handling 8-bit and 16-bit depths.
 */
function readChannel8or16(rawData: Uint8Array, offset: number, bitDepth: number): number {
	if (bitDepth === 16) {
		return scaleTo8Bit(((rawData[offset] ?? 0) << 8) | (rawData[offset + 1] ?? 0), 16);
	}
	return rawData[offset] ?? 0;
}

/**
 * Reads a sample from sub-byte packed data (1, 2, or 4 bits per sample).
 */
function readSubByteSample(
	rawData: Uint8Array,
	rowOffset: number,
	x: number,
	bitDepth: number,
): number {
	const byteIdx = rowOffset + Math.floor((x * bitDepth) / 8);
	const sampleIdx = x % (8 / bitDepth);
	const rawVal = extractSubByteSample(rawData[byteIdx] ?? 0, bitDepth, sampleIdx);
	return scaleTo8Bit(rawVal, bitDepth);
}

/**
 * Reads a single grayscale sample at (x, rowOffset) for any bit depth.
 */
function readGraySample(
	rawData: Uint8Array,
	rowOffset: number,
	x: number,
	bitDepth: number,
): number {
	if (bitDepth < 8) {
		return readSubByteSample(rawData, rowOffset, x, bitDepth);
	}
	const bytesPerSample = bitDepth === 16 ? 2 : 1;
	return readChannel8or16(rawData, rowOffset + x * bytesPerSample, bitDepth);
}

/**
 * Reads a palette index at (x, rowOffset) for any bit depth.
 */
function readPaletteIndex(
	rawData: Uint8Array,
	rowOffset: number,
	x: number,
	bitDepth: number,
): number {
	if (bitDepth < 8) {
		const byteIdx = rowOffset + Math.floor((x * bitDepth) / 8);
		const sampleIdx = x % (8 / bitDepth);
		return extractSubByteSample(rawData[byteIdx] ?? 0, bitDepth, sampleIdx);
	}
	return rawData[rowOffset + x] ?? 0;
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
