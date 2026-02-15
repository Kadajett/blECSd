/**
 * GIF file parser.
 *
 * Parses GIF87a and GIF89a files into structured data: header info, global
 * and local color tables, frame data with timing and disposal, and extension
 * blocks (graphics control, Netscape looping).
 *
 * @module media/gif/parser
 */

import { z } from 'zod';
import type { LZWOutput } from './lzw';
import { decompressLZW } from './lzw';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * GIF87a signature bytes.
 *
 * @example
 * ```typescript
 * import { GIF87A_MAGIC } from 'blecsd';
 *
 * const isGif87a = arrayStartsWith(data, GIF87A_MAGIC);
 * ```
 */
export const GIF87A_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);

/**
 * GIF89a signature bytes.
 *
 * @example
 * ```typescript
 * import { GIF89A_MAGIC } from 'blecsd';
 *
 * const isGif89a = arrayStartsWith(data, GIF89A_MAGIC);
 * ```
 */
export const GIF89A_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

/** GIF trailer byte marking end of file */
const GIF_TRAILER = 0x3b;
/** GIF extension introducer */
const EXTENSION_INTRODUCER = 0x21;
/** GIF image separator */
const IMAGE_SEPARATOR = 0x2c;
/** Graphics control extension label */
const GRAPHICS_CONTROL_LABEL = 0xf9;
/** Application extension label */
const APPLICATION_EXTENSION_LABEL = 0xff;
/** Comment extension label */
const COMMENT_EXTENSION_LABEL = 0xfe;
/** Plain text extension label */
const PLAIN_TEXT_LABEL = 0x01;

// =============================================================================
// TYPES
// =============================================================================

/**
 * GIF version identifier.
 */
export type GIFVersion = '87a' | '89a';

/**
 * Frame disposal method.
 *
 * Controls how the frame area is treated before rendering the next frame.
 *
 * @example
 * ```typescript
 * import { DisposalMethod } from 'blecsd';
 *
 * if (frame.disposal === DisposalMethod.RestoreBackground) {
 *   // Clear frame area before next frame
 * }
 * ```
 */
export enum DisposalMethod {
	/** No disposal specified (leave as-is) */
	Unspecified = 0,
	/** Do not dispose (leave frame in place) */
	None = 1,
	/** Restore to background color */
	RestoreBackground = 2,
	/** Restore to previous frame */
	RestorePrevious = 3,
}

/**
 * A single color entry in a GIF color table.
 */
export interface GIFColor {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/**
 * GIF logical screen descriptor.
 */
export interface GIFHeader {
	/** GIF version */
	readonly version: GIFVersion;
	/** Logical screen width */
	readonly width: number;
	/** Logical screen height */
	readonly height: number;
	/** Whether a global color table is present */
	readonly hasGlobalColorTable: boolean;
	/** Bits per primary color minus 1 (color resolution) */
	readonly colorResolution: number;
	/** Whether the global color table is sorted */
	readonly sortFlag: boolean;
	/** Size of the global color table (number of entries) */
	readonly globalColorTableSize: number;
	/** Background color index in the global color table */
	readonly backgroundColorIndex: number;
	/** Pixel aspect ratio byte */
	readonly pixelAspectRatio: number;
}

/**
 * Zod schema for GIF header validation.
 */
export const GIFHeaderSchema = z.object({
	version: z.enum(['87a', '89a']),
	width: z.number().int().min(1).max(65535),
	height: z.number().int().min(1).max(65535),
	hasGlobalColorTable: z.boolean(),
	colorResolution: z.number().int().min(0).max(7),
	sortFlag: z.boolean(),
	globalColorTableSize: z.number().int().min(0),
	backgroundColorIndex: z.number().int().min(0).max(255),
	pixelAspectRatio: z.number().int().min(0).max(255),
});

/**
 * A single frame from a GIF image.
 *
 * @example
 * ```typescript
 * import { parseGIF } from 'blecsd';
 *
 * const result = parseGIF(gifData);
 * if (result.ok) {
 *   for (const frame of result.frames) {
 *     console.log(`Frame: ${frame.width}x${frame.height}, delay: ${frame.delay}ms`);
 *   }
 * }
 * ```
 */
export interface GIFFrame {
	/** X offset of this frame within the logical screen */
	readonly x: number;
	/** Y offset of this frame within the logical screen */
	readonly y: number;
	/** Frame width in pixels */
	readonly width: number;
	/** Frame height in pixels */
	readonly height: number;
	/** Pixel data as palette indices */
	readonly pixels: Uint8Array;
	/** Frame delay in milliseconds */
	readonly delay: number;
	/** Disposal method for this frame */
	readonly disposal: DisposalMethod;
	/** Transparent color index, or undefined if none */
	readonly transparentIndex: number | undefined;
	/** Local color table, or undefined to use global */
	readonly localColorTable: readonly GIFColor[] | undefined;
	/** Whether the frame is interlaced */
	readonly interlaced: boolean;
}

/**
 * Result of successful GIF parsing.
 */
export interface GIFParseResult {
	readonly ok: true;
	/** GIF header info */
	readonly header: GIFHeader;
	/** Global color table (empty array if none) */
	readonly globalColorTable: readonly GIFColor[];
	/** Parsed frames */
	readonly frames: readonly GIFFrame[];
	/** Number of loop iterations (0 = infinite) */
	readonly loopCount: number;
}

/**
 * Error result from GIF parsing.
 */
export interface GIFParseError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Result type for GIF parsing.
 */
export type GIFParseOutput = GIFParseResult | GIFParseError;

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
// HEADER PARSING
// =============================================================================

/**
 * Parses the GIF logical screen descriptor.
 *
 * @param data - Raw GIF file data (starting from byte 0)
 * @returns Parsed header or an error
 *
 * @example
 * ```typescript
 * import { parseGIFHeader } from 'blecsd';
 *
 * const result = parseGIFHeader(gifData);
 * if (result.ok) {
 *   console.log(`${result.header.width}x${result.header.height}`);
 * }
 * ```
 */
export function parseGIFHeader(data: Uint8Array): { ok: true; header: GIFHeader } | GIFParseError {
	if (data.length < 13) {
		return { ok: false, error: 'Data too short for GIF header' };
	}

	const version = validateGIFSignature(data);
	if (!version) {
		return { ok: false, error: 'Invalid GIF signature' };
	}

	const width = readUint16LE(data, 6);
	const height = readUint16LE(data, 8);
	const packed = data[10] ?? 0;
	const backgroundColorIndex = data[11] ?? 0;
	const pixelAspectRatio = data[12] ?? 0;

	const hasGlobalColorTable = (packed & 0x80) !== 0;
	const colorResolution = (packed >> 4) & 0x07;
	const sortFlag = (packed & 0x08) !== 0;
	const gctSizeField = packed & 0x07;
	const globalColorTableSize = hasGlobalColorTable ? 1 << (gctSizeField + 1) : 0;

	const header: GIFHeader = {
		version,
		width,
		height,
		hasGlobalColorTable,
		colorResolution,
		sortFlag,
		globalColorTableSize,
		backgroundColorIndex,
		pixelAspectRatio,
	};

	return { ok: true, header };
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
// EXTENSION PARSING
// =============================================================================

/**
 * Graphics control extension data.
 */
interface GraphicsControl {
	readonly disposal: DisposalMethod;
	readonly delay: number;
	readonly transparentIndex: number | undefined;
}

/**
 * Parses a graphics control extension.
 */
function parseGraphicsControl(
	data: Uint8Array,
	offset: number,
): {
	control: GraphicsControl;
	nextOffset: number;
} {
	// Block size should be 4
	const blockSize = data[offset] ?? 0;
	const packed = data[offset + 1] ?? 0;
	const delay = readUint16LE(data, offset + 2);
	const transparentIdx = data[offset + 4] ?? 0;
	const hasTransparent = (packed & 0x01) !== 0;

	const disposal = ((packed >> 2) & 0x07) as DisposalMethod;
	const validDisposal = disposal <= 3 ? disposal : DisposalMethod.Unspecified;

	return {
		control: {
			disposal: validDisposal,
			delay: delay * 10, // Convert centiseconds to milliseconds
			transparentIndex: hasTransparent ? transparentIdx : undefined,
		},
		nextOffset: offset + 1 + blockSize + 1, // +1 for size byte, +1 for block terminator
	};
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

	// Pass 1: every 8th row starting from row 0
	for (let y = 0; y < height; y += 8) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	// Pass 2: every 8th row starting from row 4
	for (let y = 4; y < height; y += 8) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	// Pass 3: every 4th row starting from row 2
	for (let y = 2; y < height; y += 4) {
		copyRow(pixels, output, sourceRow, y, width);
		sourceRow++;
	}
	// Pass 4: every 2nd row starting from row 1
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
// IMAGE DATA PARSING
// =============================================================================

/**
 * Parses a single image descriptor and its pixel data.
 */
function parseImageData(
	data: Uint8Array,
	offset: number,
	control: GraphicsControl | null,
): { ok: true; frame: GIFFrame; nextOffset: number } | GIFParseError {
	if (offset + 9 > data.length) {
		return { ok: false, error: 'Data too short for image descriptor' };
	}

	const x = readUint16LE(data, offset);
	const y = readUint16LE(data, offset + 2);
	const width = readUint16LE(data, offset + 4);
	const height = readUint16LE(data, offset + 6);
	const packed = data[offset + 8] ?? 0;

	const hasLocalColorTable = (packed & 0x80) !== 0;
	const interlaced = (packed & 0x40) !== 0;
	const localColorTableSize = hasLocalColorTable ? 1 << ((packed & 0x07) + 1) : 0;

	let pos = offset + 9;
	let localColorTable: readonly GIFColor[] | undefined;

	if (hasLocalColorTable) {
		const tableBytes = localColorTableSize * 3;
		if (pos + tableBytes > data.length) {
			return { ok: false, error: 'Data too short for local color table' };
		}
		localColorTable = parseColorTable(data, pos, localColorTableSize);
		pos += tableBytes;
	}

	// LZW minimum code size
	if (pos >= data.length) {
		return { ok: false, error: 'Missing LZW minimum code size' };
	}
	const minCodeSize = data[pos] ?? 0;
	pos++;

	// Read sub-blocks of compressed data
	const { blockData, nextOffset } = readSubBlocks(data, pos);

	// Decompress LZW data
	const expectedPixels = width * height;
	const lzwResult: LZWOutput = decompressLZW(blockData, minCodeSize, expectedPixels);

	if (!lzwResult.ok) {
		return { ok: false, error: `LZW decompression failed: ${lzwResult.error}` };
	}

	let pixels = lzwResult.data;
	if (interlaced && width > 0 && height > 0) {
		pixels = deinterlace(pixels, width, height);
	}

	const frame: GIFFrame = {
		x,
		y,
		width,
		height,
		pixels,
		delay: control?.delay ?? 0,
		disposal: control?.disposal ?? DisposalMethod.Unspecified,
		transparentIndex: control?.transparentIndex,
		localColorTable,
		interlaced,
	};

	return { ok: true, frame, nextOffset };
}

// =============================================================================
// FRAME RENDERING TO RGBA
// =============================================================================

/**
 * Converts a GIF frame to RGBA pixel data.
 *
 * Resolves palette indices to full RGBA colors using the appropriate color
 * table (local or global). Transparent pixels are rendered with alpha 0.
 *
 * @param frame - GIF frame to convert
 * @param globalColorTable - Global color table to use if no local table
 * @returns RGBA pixel data (4 bytes per pixel: R, G, B, A)
 *
 * @example
 * ```typescript
 * import { parseGIF, frameToRGBA } from 'blecsd';
 *
 * const gif = parseGIF(data);
 * if (gif.ok) {
 *   const rgba = frameToRGBA(gif.frames[0], gif.globalColorTable);
 *   // rgba is Uint8Array with width * height * 4 bytes
 * }
 * ```
 */
export function frameToRGBA(frame: GIFFrame, globalColorTable: readonly GIFColor[]): Uint8Array {
	const colorTable = frame.localColorTable ?? globalColorTable;
	const rgba = new Uint8Array(frame.width * frame.height * 4);

	for (let i = 0; i < frame.pixels.length; i++) {
		const index = frame.pixels[i] ?? 0;
		const outPos = i * 4;

		if (frame.transparentIndex !== undefined && index === frame.transparentIndex) {
			rgba[outPos] = 0;
			rgba[outPos + 1] = 0;
			rgba[outPos + 2] = 0;
			rgba[outPos + 3] = 0;
			continue;
		}

		const color = colorTable[index];
		if (color) {
			rgba[outPos] = color.r;
			rgba[outPos + 1] = color.g;
			rgba[outPos + 2] = color.b;
			rgba[outPos + 3] = 255;
		}
	}

	return rgba;
}

// =============================================================================
// MAIN PARSER
// =============================================================================

/**
 * Parses a GIF file into structured data.
 *
 * Supports both GIF87a and GIF89a formats, including animated GIFs
 * with multiple frames, transparency, and Netscape looping extensions.
 *
 * @param data - Raw GIF file bytes
 * @returns Parsed GIF data or an error
 *
 * @example
 * ```typescript
 * import { parseGIF } from 'blecsd';
 *
 * const result = parseGIF(gifData);
 * if (result.ok) {
 *   console.log(`GIF ${result.header.version}: ${result.header.width}x${result.header.height}`);
 *   console.log(`Frames: ${result.frames.length}, loops: ${result.loopCount}`);
 *   for (const frame of result.frames) {
 *     console.log(`  ${frame.width}x${frame.height} @ (${frame.x},${frame.y}), delay: ${frame.delay}ms`);
 *   }
 * }
 * ```
 */
/**
 * Parses the global color table from the data.
 */
function parseGlobalColorTable(
	data: Uint8Array,
	header: GIFHeader,
	offset: number,
): { table: readonly GIFColor[]; nextOffset: number } | GIFParseError {
	if (!header.hasGlobalColorTable) {
		return { table: [], nextOffset: offset };
	}
	const tableBytes = header.globalColorTableSize * 3;
	if (offset + tableBytes > data.length) {
		return { ok: false, error: 'Data too short for global color table' };
	}
	return {
		table: parseColorTable(data, offset, header.globalColorTableSize),
		nextOffset: offset + tableBytes,
	};
}

/**
 * Processes a single block in the GIF data stream.
 */
function processBlock(
	data: Uint8Array,
	pos: number,
	state: { frames: GIFFrame[]; loopCount: number; currentControl: GraphicsControl | null },
): { nextPos: number; done: boolean } | GIFParseError {
	const blockType = data[pos] ?? 0;
	const afterType = pos + 1;

	if (blockType === GIF_TRAILER) {
		return { nextPos: afterType, done: true };
	}

	if (blockType === EXTENSION_INTRODUCER) {
		const result = parseExtension(data, afterType, state.currentControl);
		if (!result) return { nextPos: afterType, done: true };
		if (result.control !== undefined) state.currentControl = result.control;
		if (result.loopCount !== undefined) state.loopCount = result.loopCount;
		return { nextPos: result.nextOffset, done: false };
	}

	if (blockType === IMAGE_SEPARATOR) {
		const result = parseImageData(data, afterType, state.currentControl);
		if (!result.ok) return result;
		state.frames.push(result.frame);
		state.currentControl = null;
		return { nextPos: result.nextOffset, done: false };
	}

	return { nextPos: afterType, done: true };
}

export function parseGIF(data: Uint8Array): GIFParseOutput {
	const headerResult = parseGIFHeader(data);
	if (!headerResult.ok) return headerResult;

	const { header } = headerResult;

	const gctResult = parseGlobalColorTable(data, header, 13);
	if ('ok' in gctResult && !gctResult.ok) return gctResult as GIFParseError;
	const { table: globalColorTable, nextOffset: startPos } = gctResult as {
		table: readonly GIFColor[];
		nextOffset: number;
	};

	const state = {
		frames: [] as GIFFrame[],
		loopCount: 1,
		currentControl: null as GraphicsControl | null,
	};
	let pos = startPos;

	while (pos < data.length) {
		const result = processBlock(data, pos, state);
		if ('ok' in result && !result.ok) return result;
		const blockResult = result as { nextPos: number; done: boolean };
		pos = blockResult.nextPos;
		if (blockResult.done) break;
	}

	return { ok: true, header, globalColorTable, frames: state.frames, loopCount: state.loopCount };
}

// =============================================================================
// EXTENSION PARSING DISPATCHER
// =============================================================================

/**
 * Result of parsing an extension block.
 */
interface ExtensionResult {
	nextOffset: number;
	control?: GraphicsControl | null;
	loopCount?: number;
}

/**
 * Parses a GIF extension block.
 */
function parseExtension(
	data: Uint8Array,
	offset: number,
	_currentControl: GraphicsControl | null,
): ExtensionResult | null {
	if (offset >= data.length) return null;
	const label = data[offset] ?? 0;
	const pos = offset + 1;

	if (label === GRAPHICS_CONTROL_LABEL) {
		const { control, nextOffset } = parseGraphicsControl(data, pos);
		return { nextOffset, control };
	}

	if (label === APPLICATION_EXTENSION_LABEL) {
		return parseApplicationExtension(data, pos);
	}

	// Comment or plain text extension: skip sub-blocks
	if (label === COMMENT_EXTENSION_LABEL || label === PLAIN_TEXT_LABEL) {
		const { nextOffset } = readSubBlocks(data, pos);
		return { nextOffset };
	}

	// Unknown extension: skip sub-blocks
	const { nextOffset } = readSubBlocks(data, pos);
	return { nextOffset };
}

/**
 * Parses an application extension (e.g., Netscape looping).
 */
/**
 * Checks if the application extension is a Netscape/ANIMEXTS looping extension.
 */
function isNetscapeExtension(appId: string): boolean {
	return appId === 'NETSCAPE2.0' || appId === 'ANIMEXTS1.0';
}

/**
 * Tries to extract a loop count from a Netscape-style looping sub-block.
 */
function tryParseLoopCount(
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

function parseApplicationExtension(data: Uint8Array, offset: number): ExtensionResult {
	const blockSize = data[offset] ?? 0;
	const pos = offset + 1 + blockSize;

	if (blockSize === 11) {
		const appId = String.fromCharCode(
			...(Array.from(data.slice(offset + 1, offset + 1 + 11)) as number[]),
		);

		if (isNetscapeExtension(appId)) {
			const loopResult = tryParseLoopCount(data, pos);
			if (loopResult) {
				const { nextOffset } = readSubBlocks(data, loopResult.nextPos);
				return { nextOffset, loopCount: loopResult.loopCount };
			}
		}
	}

	const { nextOffset } = readSubBlocks(data, pos);
	return { nextOffset };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Reads a 16-bit little-endian unsigned integer from the data.
 */
function readUint16LE(data: Uint8Array, offset: number): number {
	return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}
