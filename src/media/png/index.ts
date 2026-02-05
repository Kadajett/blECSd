/**
 * PNG parsing utilities for blECSd.
 *
 * @module media/png
 */

export type {
	FilterError,
	FilterOutput,
	FilterResult,
} from './filters';
export {
	bytesPerPixel,
	FilterType,
	paethPredictor,
	reconstructFilters,
	scanlineBytes,
} from './filters';
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
export type {
	PaletteEntry,
	PixelData,
	PixelError,
	PixelOutput,
	PixelResult,
} from './pixels';
export {
	extractPixels,
	parsePLTE,
	parseTRNS,
} from './pixels';
