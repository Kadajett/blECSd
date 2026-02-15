/**
 * Sixel (DEC bitmap) rendering backend.
 *
 * Encodes pixel data as DCS (Device Control String) sixel sequences.
 * Sixel images are encoded in 6-pixel-tall horizontal bands, with color
 * palette selection and run-length encoding for compression.
 *
 * Protocol format:
 * ```
 * ESC P q <palette> <data> ESC \
 * ```
 *
 * Palette entry: `#<n>;2;<r%>;<g%>;<b%>`
 * Data per band: `#<color><sixel chars>$` ($ = carriage return within band)
 * Band separator: `-` (newline, advances 6 pixels down)
 *
 * @module 3d/backends/sixel
 */

import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type SixelConfig, SixelConfigSchema } from '../schemas/backends';
import type { RendererBackend } from './types';

/** DCS introducer for sixel. */
const DCS_START = '\x1bPq';

/** String terminator. */
const ST = '\x1b\\';

/**
 * Count color occurrences in a framebuffer, ignoring transparent pixels.
 */
function countColors(buf: Uint8ClampedArray, pixelCount: number): Map<number, number> {
	const colorCounts = new Map<number, number>();
	for (let i = 0; i < pixelCount; i++) {
		const idx = i * 4;
		const a = buf[idx + 3] as number;
		if (a === 0) continue;
		const key =
			((buf[idx] as number) << 16) | ((buf[idx + 1] as number) << 8) | (buf[idx + 2] as number);
		colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
	}
	return colorCounts;
}

/**
 * Build palette from color counts, sorted by popularity.
 */
function buildPalette(
	colorCounts: Map<number, number>,
	maxColors: number,
): { paletteFlat: Uint8Array; paletteCount: number } {
	const entries: Array<[number, number]> = [];
	for (const entry of colorCounts) {
		entries.push(entry);
	}
	entries.sort((a, b) => b[1] - a[1]);

	const paletteCount = Math.min(entries.length, maxColors) || 1;
	const paletteFlat = new Uint8Array(paletteCount * 3);

	for (let i = 0; i < paletteCount; i++) {
		const entry = entries[i];
		if (entry) {
			const key = entry[0];
			paletteFlat[i * 3] = (key >> 16) & 0xff;
			paletteFlat[i * 3 + 1] = (key >> 8) & 0xff;
			paletteFlat[i * 3 + 2] = key & 0xff;
		}
	}

	return { paletteFlat, paletteCount };
}

/**
 * Find the nearest palette index for an RGB color.
 */
function findNearestPaletteIndex(
	r: number,
	g: number,
	b: number,
	paletteFlat: Uint8Array,
	paletteCount: number,
): number {
	let bestDist = 0x7fffffff;
	let bestIdx = 0;
	for (let p = 0; p < paletteCount; p++) {
		const p3 = p * 3;
		const dr = r - (paletteFlat[p3] as number);
		const dg = g - (paletteFlat[p3 + 1] as number);
		const db = b - (paletteFlat[p3 + 2] as number);
		const dist = dr * dr + dg * dg + db * db;
		if (dist < bestDist) {
			bestDist = dist;
			bestIdx = p;
			if (dist === 0) break;
		}
	}
	return bestIdx;
}

/**
 * Map each pixel to nearest palette index.
 */
function mapPixelsToPalette(
	buf: Uint8ClampedArray,
	pixelCount: number,
	paletteFlat: Uint8Array,
	paletteCount: number,
	reusableIndexMap: Uint8Array | null,
): Uint8Array {
	const indexMap =
		reusableIndexMap && reusableIndexMap.length === pixelCount
			? reusableIndexMap
			: new Uint8Array(pixelCount);

	for (let i = 0; i < pixelCount; i++) {
		const idx = i * 4;
		const a = buf[idx + 3] as number;
		if (a === 0) {
			indexMap[i] = 0;
			continue;
		}
		indexMap[i] = findNearestPaletteIndex(
			buf[idx] as number,
			buf[idx + 1] as number,
			buf[idx + 2] as number,
			paletteFlat,
			paletteCount,
		);
	}

	return indexMap;
}

/**
 * Quantize framebuffer colors to a limited palette using popularity-based selection.
 */
function quantizePalette(
	fb: PixelFramebuffer,
	maxColors: number,
	reusableIndexMap: Uint8Array | null,
): { paletteFlat: Uint8Array; paletteCount: number; indexMap: Uint8Array } {
	const buf = fb.colorBuffer;
	const pixelCount = fb.width * fb.height;

	const colorCounts = countColors(buf, pixelCount);
	const { paletteFlat, paletteCount } = buildPalette(colorCounts, maxColors);
	const indexMap = mapPixelsToPalette(buf, pixelCount, paletteFlat, paletteCount, reusableIndexMap);

	return { paletteFlat, paletteCount, indexMap };
}

/**
 * Run-length encode sixel band data from a Uint8Array of sixel values.
 * Writes encoded result to output parts array. Uses `!<count><char>` for runs >= 3.
 */
function rleEncodeBand(sixelValues: Uint8Array, width: number, parts: string[]): boolean {
	let hasPixels = false;
	let i = 0;
	while (i < width) {
		const val = sixelValues[i] as number;
		let count = 1;
		while (i + count < width && sixelValues[i + count] === val) {
			count++;
		}
		const ch = String.fromCharCode(63 + val);
		if (val > 0) hasPixels = true;
		if (count >= 3) {
			parts.push('!', String(count), ch);
		} else {
			for (let j = 0; j < count; j++) {
				parts.push(ch);
			}
		}
		i += count;
	}
	return hasPixels;
}

/**
 * Build sixel palette header from palette data.
 */
function buildPaletteHeader(paletteFlat: Uint8Array, paletteCount: number): string[] {
	const parts: string[] = [];
	for (let i = 0; i < paletteCount; i++) {
		const i3 = i * 3;
		const rp = Math.round(((paletteFlat[i3] as number) / 255) * 100);
		const gp = Math.round(((paletteFlat[i3 + 1] as number) / 255) * 100);
		const bp = Math.round(((paletteFlat[i3 + 2] as number) / 255) * 100);
		parts.push('#', String(i), ';2;', String(rp), ';', String(gp), ';', String(bp));
	}
	return parts;
}

/**
 * Build sixel bits for one column across all rows in a band.
 */
function buildSixelColumn(
	indexMap: Uint8Array,
	colorIdx: number,
	bandY: number,
	maxRow: number,
	w: number,
	x: number,
): number {
	let sixelBits = 0;
	for (let row = 0; row < maxRow; row++) {
		const pixelIdx = (bandY + row) * w + x;
		if (indexMap[pixelIdx] === colorIdx) {
			sixelBits |= 1 << row;
		}
	}
	return sixelBits;
}

/**
 * Encode a band row without RLE (raw sixel characters).
 */
function encodeRawBand(sixelRow: Uint8Array, w: number): { chars: string[]; hasPixels: boolean } {
	const chars: string[] = [];
	let hasPixels = false;
	for (let x = 0; x < w; x++) {
		const val = sixelRow[x] as number;
		if (val > 0) hasPixels = true;
		chars.push(String.fromCharCode(63 + val));
	}
	return { chars, hasPixels };
}

/**
 * Append color band data to output parts array.
 */
function appendColorBand(
	parts: string[],
	colorIdx: number,
	bandData: string[],
	hasPixels: boolean,
): void {
	if (hasPixels) {
		parts.push('#', String(colorIdx));
		for (const part of bandData) {
			parts.push(part);
		}
		parts.push('$');
	}
}

/**
 * Encode one color's data for a single band.
 */
function encodeColorInBand(
	indexMap: Uint8Array,
	colorIdx: number,
	bandY: number,
	maxRow: number,
	w: number,
	sixelRow: Uint8Array,
	rleEnabled: boolean,
	parts: string[],
): void {
	// Build sixel values for this color in this band
	for (let x = 0; x < w; x++) {
		sixelRow[x] = buildSixelColumn(indexMap, colorIdx, bandY, maxRow, w, x);
	}

	// RLE encode or raw output
	if (rleEnabled) {
		const bandParts: string[] = [];
		const hasPixels = rleEncodeBand(sixelRow, w, bandParts);
		appendColorBand(parts, colorIdx, bandParts, hasPixels);
	} else {
		const { chars, hasPixels } = encodeRawBand(sixelRow, w);
		appendColorBand(parts, colorIdx, chars, hasPixels);
	}
}

/**
 * Encode all bands for a sixel image.
 */
function encodeSixelBands(
	indexMap: Uint8Array,
	paletteCount: number,
	w: number,
	h: number,
	sixelRow: Uint8Array,
	rleEnabled: boolean,
	parts: string[],
): void {
	const bandCount = Math.ceil(h / 6);
	for (let band = 0; band < bandCount; band++) {
		const bandY = band * 6;
		const maxRow = Math.min(6, h - bandY);

		for (let colorIdx = 0; colorIdx < paletteCount; colorIdx++) {
			encodeColorInBand(indexMap, colorIdx, bandY, maxRow, w, sixelRow, rleEnabled, parts);
		}

		if (band < bandCount - 1) {
			parts.push('-');
		}
	}
}

/**
 * Create a sixel rendering backend.
 *
 * @param config - Optional sixel configuration
 * @returns A RendererBackend that encodes pixels as sixel escape sequences
 *
 * @example
 * ```typescript
 * const backend = createSixelBackend({ maxColors: 64 });
 * const output = backend.encode(framebuffer, 0, 0);
 * process.stdout.write(output.escape);
 * ```
 */
export function createSixelBackend(config?: SixelConfig): RendererBackend {
	const validated = SixelConfigSchema.parse(config ?? {});
	const maxColors = validated.maxColors;
	const rleEnabled = validated.rleEnabled;

	const capabilities: BackendCapabilities = {
		maxColors,
		supportsAlpha: false,
		pixelsPerCellX: 1,
		pixelsPerCellY: 1,
		supportsAnimation: false,
		requiresEscapeSequences: true,
	};

	// Pre-allocate reusable buffers
	let cachedIndexMap: Uint8Array | null = null;
	let cachedSixelRow: Uint8Array | null = null;

	return {
		type: 'sixel',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const { paletteFlat, paletteCount, indexMap } = quantizePalette(
				framebuffer,
				maxColors,
				cachedIndexMap,
			);
			cachedIndexMap = indexMap;
			const w = framebuffer.width;
			const h = framebuffer.height;

			// Collect all output in an array, join once at the end
			const parts: string[] = [DCS_START];
			parts.push(...buildPaletteHeader(paletteFlat, paletteCount));

			// Pre-allocate sixel row buffer
			if (!cachedSixelRow || cachedSixelRow.length < w) {
				cachedSixelRow = new Uint8Array(w);
			}

			encodeSixelBands(indexMap, paletteCount, w, h, cachedSixelRow, rleEnabled, parts);
			parts.push(ST);

			return { escape: parts.join(''), cursorX: screenX, cursorY: screenY };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			// Sixel is pixel-level, but typical terminal cells are ~8x16 pixels
			// Use common defaults; actual values depend on terminal font
			return { width: cellWidth * 8, height: cellHeight * 16 };
		},
	};
}
