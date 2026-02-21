/**
 * GIF parsing utilities for blECSd.
 *
 * @module media/gif
 */

export type {
	LZWError,
	LZWOutput,
	LZWResult,
} from './lzw';
export {
	createBitReader,
	decompressLZW,
	readCode,
} from './lzw';
export type {
	GIFColor,
	GIFFrame,
	GIFHeader,
	GIFParseError,
	GIFParseOutput,
	GIFVersion,
} from './parser';
export {
	DisposalMethod,
	deinterlace,
	frameToRGBA,
	GIF87A_MAGIC,
	GIF89A_MAGIC,
	parseColorTable,
	parseGIF,
	parseGIFHeader,
	readSubBlocks,
	validateGIFSignature,
} from './parser';
export type { GIFParseResult } from './types';
export { GIFHeaderSchema } from './types';
