/**
 * PNG parsing utilities for blECSd.
 *
 * @module media/png
 */

export type {
	PNGChunk,
	PNGHeader,
	PNGParseError,
	PNGParseOutput,
	PNGParseResult,
	PNGParseSuccess,
} from './parser';
export {
	ColorType,
	decompressIDAT,
	PNG_MAGIC,
	PNGChunkSchema,
	PNGHeaderSchema,
	parseChunks,
	parseIHDR,
	parsePNG,
	validateCRC,
	validateMagicBytes,
} from './parser';
