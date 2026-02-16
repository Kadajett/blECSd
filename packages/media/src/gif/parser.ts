/**
 * GIF file parser.
 *
 * Parses GIF87a and GIF89a files into structured data: header info, global
 * and local color tables, frame data with timing and disposal, and extension
 * blocks (graphics control, Netscape looping).
 *
 * @module media/gif/parser
 */

import {
	deinterlace,
	isNetscapeExtension,
	parseColorTable,
	parseGraphicsControl,
	readSubBlocks,
	readUint16LE,
	tryParseLoopCount,
	validateGIFSignature,
} from './helpers';
import type { LZWOutput } from './lzw';
import { decompressLZW } from './lzw';
import type {
	GIFColor,
	GIFFrame,
	GIFHeader,
	GIFParseError,
	GIFParseOutput,
	GIFVersion,
	GraphicsControl,
} from './types';
import {
	APPLICATION_EXTENSION_LABEL,
	COMMENT_EXTENSION_LABEL,
	DisposalMethod,
	EXTENSION_INTRODUCER,
	GIF_TRAILER,
	GRAPHICS_CONTROL_LABEL,
	IMAGE_SEPARATOR,
	PLAIN_TEXT_LABEL,
} from './types';

// Re-export magic bytes for external use
export { GIF87A_MAGIC, GIF89A_MAGIC } from './types';

// Re-export all types
export type { GIFVersion, GIFHeader, GIFFrame, GIFColor, GIFParseError, GIFParseOutput };
export { frameToRGBA } from './frameRendering';

// Re-export utilities
export { deinterlace, parseColorTable, readSubBlocks, validateGIFSignature } from './helpers';
export { DisposalMethod } from './types';

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

	if (pos >= data.length) {
		return { ok: false, error: 'Missing LZW minimum code size' };
	}
	const minCodeSize = data[pos] ?? 0;
	pos++;

	const { blockData, nextOffset } = readSubBlocks(data, pos);

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
// EXTENSION PARSING
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
 * Parses an application extension (e.g., Netscape looping).
 */
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

	if (label === COMMENT_EXTENSION_LABEL || label === PLAIN_TEXT_LABEL) {
		const { nextOffset } = readSubBlocks(data, pos);
		return { nextOffset };
	}

	const { nextOffset } = readSubBlocks(data, pos);
	return { nextOffset };
}

// =============================================================================
// MAIN PARSER
// =============================================================================

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
