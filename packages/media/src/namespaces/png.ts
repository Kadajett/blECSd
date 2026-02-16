/**
 * PNG parsing namespace for reading PNG images.
 *
 * @example
 * ```typescript
 * import { png } from '@blecsd/media';
 *
 * const result = png.parse.parsePNG(buffer);
 * if (result.success) {
 *   const pixels = png.pixels.extractPixels(result.data);
 * }
 * ```
 */

import {
	bytesPerPixel,
	ColorType,
	decompressIDAT,
	extractPixels,
	FilterType,
	PNG_MAGIC,
	PNGChunkSchema,
	PNGHeaderSchema,
	paethPredictor,
	parseChunks,
	parseIHDR,
	parsePLTE,
	parsePNG,
	parseTRNS,
	reconstructFilters,
	scanlineBytes,
	validateCRC,
	validateMagicBytes,
} from '../png';

const parse = Object.freeze({
	parsePNG,
	parseChunks,
	parseIHDR,
	decompressIDAT,
	validateMagicBytes,
	validateCRC,
	PNG_MAGIC,
	PNGHeaderSchema,
	PNGChunkSchema,
	ColorType,
});

const filters = Object.freeze({
	reconstructFilters,
	paethPredictor,
	bytesPerPixel,
	scanlineBytes,
	FilterType,
});

const pixels = Object.freeze({
	extractPixels,
	parsePLTE,
	parseTRNS,
});

export const png = Object.freeze({
	parse,
	filters,
	pixels,
});

export type PngModule = typeof png;
