/**
 * GIF parser helper functions.
 *
 * @module media/gif/helpers
 */

import type { DisposalMethod, GIFColor, GIFVersion, GraphicsControl } from './types';
import { GIF87A_MAGIC, GIF89A_MAGIC } from './types';

// =============================================================================
// SIGNATURE VALIDATION
// =============================================================================

/**
 * Validates GIF magic bytes and returns the version.
 *
 * @param data - Raw file data
 * @returns The GIF version or null if invalid
 *
 * @example
 * ```typescript
 * import { validateGIFSignature } from 'blecsd';
 *
 * const version = validateGIFSignature(data);
 * if (version) {
 *   console.log(`GIF ${version}`);
 * }
 * ```
 */
export function validateGIFSignature(data: Uint8Array): GIFVersion | null {
	if (data.length < 6) return null;
	if (matchesSignature(data, GIF87A_MAGIC)) return '87a';
	if (matchesSignature(data, GIF89A_MAGIC)) return '89a';
	return null;
}

/**
 * Checks if data starts with the given signature bytes.
 */
function matchesSignature(data: Uint8Array, signature: Uint8Array): boolean {
	for (let i = 0; i < signature.length; i++) {
		if (data[i] !== signature[i]) return false;
	}
	return true;
}

// =============================================================================
// COLOR TABLE PARSING
// =============================================================================

/**
 * Parses a GIF color table from the data.
 *
 * @param data - Raw data containing the color table
 * @param offset - Byte offset where the color table starts
 * @param numEntries - Number of color entries to read
 * @returns Array of color entries
 *
 * @example
 * ```typescript
 * import { parseColorTable } from 'blecsd';
 *
 * const colors = parseColorTable(data, 13, 256);
 * ```
 */
export function parseColorTable(
	data: Uint8Array,
	offset: number,
	numEntries: number,
): readonly GIFColor[] {
	const table: GIFColor[] = [];
	for (let i = 0; i < numEntries; i++) {
		const idx = offset + i * 3;
		table.push({
			r: data[idx] ?? 0,
			g: data[idx + 1] ?? 0,
			b: data[idx + 2] ?? 0,
		});
	}
	return table;
}

// =============================================================================
// SUB-BLOCK READING
// =============================================================================

/**
 * Reads concatenated sub-block data from the GIF stream.
 *
 * GIF uses a sub-block structure where each block starts with a size byte
 * (1-255), followed by that many data bytes. A zero-size block terminates.
 *
 * @param data - Raw GIF data
 * @param offset - Offset of the first sub-block size byte
 * @returns The concatenated data and the offset after the block terminator
 *
 * @example
 * ```typescript
 * import { readSubBlocks } from 'blecsd';
 *
 * const { blockData, nextOffset } = readSubBlocks(data, offset);
 * ```
 */
export function readSubBlocks(
	data: Uint8Array,
	offset: number,
): { blockData: Uint8Array; nextOffset: number } {
	const chunks: Uint8Array[] = [];
	let pos = offset;
	let totalSize = 0;

	while (pos < data.length) {
		const blockSize = data[pos] ?? 0;
		pos++;
		if (blockSize === 0) break;
		if (pos + blockSize > data.length) break;
		chunks.push(data.slice(pos, pos + blockSize));
		totalSize += blockSize;
		pos += blockSize;
	}

	const blockData = new Uint8Array(totalSize);
	let writePos = 0;
	for (const chunk of chunks) {
		blockData.set(chunk, writePos);
		writePos += chunk.length;
	}

	return { blockData, nextOffset: pos };
}

// =============================================================================
// INTERLACING
// =============================================================================

/**
 * De-interlaces GIF frame pixel data.
 *
 * GIF interlacing stores rows in four passes:
 * - Pass 1: rows 0, 8, 16, ... (every 8th row starting at 0)
 * - Pass 2: rows 4, 12, 20, ... (every 8th row starting at 4)
 * - Pass 3: rows 2, 6, 10, ... (every 4th row starting at 2)
 * - Pass 4: rows 1, 3, 5, ... (every 2nd row starting at 1)
 *
 * @param pixels - Interlaced pixel data
 * @param width - Frame width
 * @param height - Frame height
 * @returns De-interlaced pixel data
 *
 * @example
 * ```typescript
 * import { deinterlace } from 'blecsd';
 *
 * const sequential = deinterlace(interlacedPixels, width, height);
 * ```
 */
export function deinterlace(pixels: Uint8Array, width: number, height: number): Uint8Array {
	const output = new Uint8Array(width * height);
	let sourceRow = 0;

	for (let y = 0; y < height; y += 8) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	for (let y = 4; y < height; y += 8) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	for (let y = 2; y < height; y += 4) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	for (let y = 1; y < height; y += 2) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}

	return output;
}

/**
 * Copies a single row from source to destination position.
 */
function copyRow(
	source: Uint8Array,
	dest: Uint8Array,
	sourceRow: number,
	destRow: number,
	width: number,
): void {
	const srcOffset = sourceRow * width;
	const dstOffset = destRow * width;
	for (let x = 0; x < width; x++) {
		dest[dstOffset + x] = source[srcOffset + x] ?? 0;
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Reads a 16-bit little-endian unsigned integer from the data.
 */
export function readUint16LE(data: Uint8Array, offset: number): number {
	return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

/**
 * Parses a graphics control extension.
 */
export function parseGraphicsControl(
	data: Uint8Array,
	offset: number,
): {
	control: GraphicsControl;
	nextOffset: number;
} {
	const blockSize = data[offset] ?? 0;
	const packed = data[offset + 1] ?? 0;
	const delay = readUint16LE(data, offset + 2);
	const transparentIdx = data[offset + 4] ?? 0;
	const hasTransparent = (packed & 0x01) !== 0;

	const disposal = ((packed >> 2) & 0x07) as DisposalMethod;
	const validDisposal = disposal <= 3 ? disposal : 0;

	return {
		control: {
			disposal: validDisposal,
			delay: delay * 10,
			transparentIndex: hasTransparent ? transparentIdx : undefined,
		},
		nextOffset: offset + 1 + blockSize + 1,
	};
}

/**
 * Checks if the application extension is a Netscape/ANIMEXTS looping extension.
 */
export function isNetscapeExtension(appId: string): boolean {
	return appId === 'NETSCAPE2.0' || appId === 'ANIMEXTS1.0';
}

/**
 * Tries to extract a loop count from a Netscape-style looping sub-block.
 */
export function tryParseLoopCount(
	data: Uint8Array,
	pos: number,
): { loopCount: number; nextPos: number } | null {
	const subBlockSize = data[pos] ?? 0;
	if (subBlockSize < 3) return null;
	const subId = data[pos + 1] ?? 0;
	if (subId !== 1) return null;
	const loopCount = readUint16LE(data, pos + 2);
	return { loopCount: loopCount === 0 ? 0 : loopCount, nextPos: pos + subBlockSize + 1 };
}
