/**
 * GIF parsing namespace for reading GIF images.
 *
 * @example
 * ```typescript
 * import { gif } from '@blecsd/media';
 *
 * const result = gif.parse.parseGIF(buffer);
 * if (result.success) {
 *   const rgba = gif.frame.frameToRGBA(result.data.frames[0]);
 * }
 * ```
 */

import {
	createBitReader,
	DisposalMethod,
	decompressLZW,
	deinterlace,
	frameToRGBA,
	GIF87A_MAGIC,
	GIF89A_MAGIC,
	GIFHeaderSchema,
	parseColorTable,
	parseGIF,
	parseGIFHeader,
	readCode,
	readSubBlocks,
	validateGIFSignature,
} from '../gif';

const parse = Object.freeze({
	parseGIF,
	parseGIFHeader,
	validateGIFSignature,
	parseColorTable,
	readSubBlocks,
	GIF87A_MAGIC,
	GIF89A_MAGIC,
	GIFHeaderSchema,
});

const lzw = Object.freeze({
	decompressLZW,
	createBitReader,
	readCode,
});

const frame = Object.freeze({
	frameToRGBA,
	deinterlace,
	DisposalMethod,
});

export const gif = Object.freeze({
	parse,
	lzw,
	frame,
});

export type GifModule = typeof gif;
