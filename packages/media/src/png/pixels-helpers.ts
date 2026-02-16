/**
 * PNG pixel extraction helpers.
 *
 * @module media/png/pixels-helpers
 */

import type { PNGChunk } from './parser';
import type { PaletteEntry } from './pixels';

/**
 * Parses a PLTE chunk into an array of palette entries.
 *
 * @example
 * ```typescript
 * import { parsePLTE } from 'blecsd';
 *
 * const palette = parsePLTE(plteChunk);
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
 * @example
 * ```typescript
 * import { parseTRNS } from 'blecsd';
 *
 * const alphas = parseTRNS(trnsChunk, palette.length);
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

/**
 * Scales a value from a given bit depth to 8-bit (0-255).
 */
export function scaleTo8Bit(value: number, bitDepth: number): number {
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
 */
export function extractSubByteSample(byte: number, bitDepth: number, index: number): number {
	const samplesPerByte = 8 / bitDepth;
	const shift = (samplesPerByte - 1 - index) * bitDepth;
	const mask = (1 << bitDepth) - 1;
	return (byte >> shift) & mask;
}

/**
 * Reads a single channel value at the given byte offset.
 */
export function readChannel8or16(rawData: Uint8Array, offset: number, bitDepth: number): number {
	if (bitDepth === 16) {
		return scaleTo8Bit(((rawData[offset] ?? 0) << 8) | (rawData[offset + 1] ?? 0), 16);
	}
	return rawData[offset] ?? 0;
}

/**
 * Reads a sample from sub-byte packed data.
 */
export function readSubByteSample(
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
 * Reads a single grayscale sample at (x, rowOffset).
 */
export function readGraySample(
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
 * Reads a palette index at (x, rowOffset).
 */
export function readPaletteIndex(
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
