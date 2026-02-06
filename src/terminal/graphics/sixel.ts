/**
 * Sixel Graphics Backend
 *
 * Implements the DEC sixel protocol (DCS q ... ST) for displaying images
 * in terminals that support sixel graphics. Encodes raw pixel data as
 * sixel escape sequences with palette quantization and RLE compression.
 *
 * Sixel images are encoded in 6-pixel-tall horizontal bands using a
 * color-indexed palette (up to 256 colors). Each band column is a
 * single character whose 6 low bits indicate which of the 6 rows
 * contain a given color.
 *
 * @module terminal/graphics/sixel
 */

import { z } from 'zod';
import type {
	BackendName,
	GraphicsBackend,
	GraphicsCapabilities,
	ImageData,
	RenderOptions,
} from './backend';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * DCS introducer for sixel sequences.
 */
export const DCS_START = '\x1bPq';

/**
 * String terminator (ST) for DCS sequences.
 */
export const SIXEL_ST = '\x1b\\';

/**
 * Sixel backend name.
 */
export const SIXEL_BACKEND_NAME: BackendName = 'sixel';

/**
 * Default maximum palette size for sixel encoding.
 */
export const DEFAULT_MAX_COLORS = 256;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the sixel graphics backend.
 *
 * @example
 * ```typescript
 * import type { SixelBackendConfig } from 'blecsd';
 *
 * const config: SixelBackendConfig = { maxColors: 64, rleEnabled: true };
 * ```
 */
export interface SixelBackendConfig {
	/** Maximum number of palette colors (2-256). Default: 256 */
	readonly maxColors?: number;
	/** Enable run-length encoding for compression. Default: true */
	readonly rleEnabled?: boolean;
}

/**
 * Environment checker for sixel detection (injectable for testing).
 */
export interface SixelEnvChecker {
	readonly getEnv: (name: string) => string | undefined;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for SixelBackendConfig.
 *
 * @example
 * ```typescript
 * import { SixelBackendConfigSchema } from 'blecsd';
 *
 * const result = SixelBackendConfigSchema.safeParse({ maxColors: 64 });
 * ```
 */
export const SixelBackendConfigSchema = z.object({
	maxColors: z.number().int().min(2).max(256).default(DEFAULT_MAX_COLORS),
	rleEnabled: z.boolean().default(true),
});

// =============================================================================
// PIXEL DATA HELPERS
// =============================================================================

/**
 * Gets the bytes-per-pixel for a given format.
 *
 * @param format - Image format
 * @returns Bytes per pixel (4 for rgba, 3 for rgb)
 */
export function bytesPerPixel(format: 'rgba' | 'rgb' | 'png'): number {
	if (format === 'rgb') return 3;
	return 4; // rgba and png (assumed rgba)
}

/**
 * Extracts RGBA values from image data at a pixel index.
 *
 * @param data - Raw pixel data
 * @param index - Pixel index
 * @param bpp - Bytes per pixel
 * @returns RGBA tuple [r, g, b, a]
 */
export function getPixelRGBA(
	data: Uint8Array,
	index: number,
	bpp: number,
): [number, number, number, number] {
	const offset = index * bpp;
	const r = data[offset] ?? 0;
	const g = data[offset + 1] ?? 0;
	const b = data[offset + 2] ?? 0;
	const a = bpp === 4 ? (data[offset + 3] ?? 255) : 255;
	return [r, g, b, a];
}

// =============================================================================
// COLOR QUANTIZATION
// =============================================================================

/**
 * Packs RGB into a single 24-bit integer.
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Packed RGB value
 */
export function packRGB(r: number, g: number, b: number): number {
	return (r << 16) | (g << 8) | b;
}

/**
 * Counts color occurrences in image data, skipping transparent pixels.
 *
 * @param data - Raw pixel data
 * @param pixelCount - Number of pixels
 * @param bpp - Bytes per pixel
 * @returns Map of packed RGB to count
 */
export function countImageColors(
	data: Uint8Array,
	pixelCount: number,
	bpp: number,
): Map<number, number> {
	const counts = new Map<number, number>();
	for (let i = 0; i < pixelCount; i++) {
		const [r, g, b, a] = getPixelRGBA(data, i, bpp);
		if (a === 0) continue;
		const key = packRGB(r, g, b);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

/**
 * Builds a palette from color counts sorted by popularity.
 *
 * @param colorCounts - Map of packed RGB to occurrence count
 * @param maxColors - Maximum palette entries
 * @returns Palette as flat Uint8Array (r,g,b triples) and palette size
 */
export function buildPalette(
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
 * Finds the nearest palette index for an RGB color using squared distance.
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @param paletteFlat - Flat palette array (r,g,b triples)
 * @param paletteCount - Number of palette entries
 * @returns Nearest palette index
 */
export function findNearestColor(
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
 * Maps all pixels to their nearest palette index.
 *
 * @param data - Raw pixel data
 * @param pixelCount - Number of pixels
 * @param bpp - Bytes per pixel
 * @param paletteFlat - Flat palette array
 * @param paletteCount - Number of palette entries
 * @returns Array of palette indices per pixel
 */
export function mapPixelsToPalette(
	data: Uint8Array,
	pixelCount: number,
	bpp: number,
	paletteFlat: Uint8Array,
	paletteCount: number,
): Uint8Array {
	const indexMap = new Uint8Array(pixelCount);
	for (let i = 0; i < pixelCount; i++) {
		const [r, g, b, a] = getPixelRGBA(data, i, bpp);
		if (a === 0) {
			indexMap[i] = 0;
			continue;
		}
		indexMap[i] = findNearestColor(r, g, b, paletteFlat, paletteCount);
	}
	return indexMap;
}

// =============================================================================
// SIXEL ENCODING
// =============================================================================

/**
 * Builds the sixel palette header string.
 *
 * Format: `#<n>;2;<r%>;<g%>;<b%>` for each color.
 *
 * @param paletteFlat - Flat palette array (r,g,b triples)
 * @param paletteCount - Number of palette entries
 * @returns Palette header string
 */
export function buildPaletteHeader(paletteFlat: Uint8Array, paletteCount: number): string {
	const parts: string[] = [];
	for (let i = 0; i < paletteCount; i++) {
		const i3 = i * 3;
		const rp = Math.round(((paletteFlat[i3] as number) / 255) * 100);
		const gp = Math.round(((paletteFlat[i3 + 1] as number) / 255) * 100);
		const bp = Math.round(((paletteFlat[i3 + 2] as number) / 255) * 100);
		parts.push(`#${i};2;${rp};${gp};${bp}`);
	}
	return parts.join('');
}

/**
 * Builds a sixel bit pattern for one column across all rows in a band.
 *
 * @param indexMap - Per-pixel palette index map
 * @param colorIdx - Palette color index to match
 * @param bandY - Starting y position of the band
 * @param maxRow - Number of rows in this band (max 6)
 * @param width - Image width
 * @param x - Column position
 * @returns 6-bit pattern where bit n is set if row n matches the color
 */
export function buildSixelColumn(
	indexMap: Uint8Array,
	colorIdx: number,
	bandY: number,
	maxRow: number,
	width: number,
	x: number,
): number {
	let bits = 0;
	for (let row = 0; row < maxRow; row++) {
		const pixelIdx = (bandY + row) * width + x;
		if (indexMap[pixelIdx] === colorIdx) {
			bits |= 1 << row;
		}
	}
	return bits;
}

/**
 * Run-length encodes a band of sixel values.
 * Uses `!<count><char>` for runs of 3 or more identical values.
 *
 * @param sixelValues - Array of 6-bit values for each column
 * @param width - Number of columns
 * @returns Object with the encoded string and whether any pixels were set
 */
export function rleEncodeBand(
	sixelValues: Uint8Array,
	width: number,
): { encoded: string; hasPixels: boolean } {
	const parts: string[] = [];
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
			parts.push(`!${count}${ch}`);
		} else {
			for (let j = 0; j < count; j++) {
				parts.push(ch);
			}
		}
		i += count;
	}

	return { encoded: parts.join(''), hasPixels };
}

/**
 * Raw-encodes a band of sixel values (no RLE compression).
 *
 * @param sixelValues - Array of 6-bit values for each column
 * @param width - Number of columns
 * @returns Object with the encoded string and whether any pixels were set
 */
export function rawEncodeBand(
	sixelValues: Uint8Array,
	width: number,
): { encoded: string; hasPixels: boolean } {
	const parts: string[] = [];
	let hasPixels = false;
	for (let x = 0; x < width; x++) {
		const val = sixelValues[x] as number;
		if (val > 0) hasPixels = true;
		parts.push(String.fromCharCode(63 + val));
	}
	return { encoded: parts.join(''), hasPixels };
}

/**
 * Encodes a complete sixel image from pixel index map data.
 *
 * Processes the image in 6-pixel-tall bands. Within each band,
 * iterates over all palette colors, encoding column data for each
 * color with `$` (carriage return) between colors and `-` (newline)
 * between bands.
 *
 * @param indexMap - Per-pixel palette index map
 * @param paletteCount - Number of palette entries
 * @param width - Image width
 * @param height - Image height
 * @param rleEnabled - Whether to use RLE compression
 * @returns Encoded sixel data string
 */
export function encodeSixelData(
	indexMap: Uint8Array,
	paletteCount: number,
	width: number,
	height: number,
	rleEnabled: boolean,
): string {
	const parts: string[] = [];
	const sixelRow = new Uint8Array(width);
	const bandCount = Math.ceil(height / 6);

	for (let band = 0; band < bandCount; band++) {
		const bandY = band * 6;
		const maxRow = Math.min(6, height - bandY);

		for (let colorIdx = 0; colorIdx < paletteCount; colorIdx++) {
			for (let x = 0; x < width; x++) {
				sixelRow[x] = buildSixelColumn(indexMap, colorIdx, bandY, maxRow, width, x);
			}

			const { encoded, hasPixels } = rleEnabled
				? rleEncodeBand(sixelRow, width)
				: rawEncodeBand(sixelRow, width);

			if (hasPixels) {
				parts.push(`#${colorIdx}${encoded}$`);
			}
		}

		if (band < bandCount - 1) {
			parts.push('-');
		}
	}

	return parts.join('');
}

/**
 * Encodes image data as a complete sixel escape sequence.
 *
 * @param image - Image data (RGBA or RGB pixels)
 * @param maxColors - Maximum palette colors (2-256)
 * @param rleEnabled - Whether to use RLE compression
 * @returns Complete DCS sixel escape sequence
 *
 * @example
 * ```typescript
 * import { encodeSixelImage } from 'blecsd';
 *
 * const seq = encodeSixelImage(imageData, 256, true);
 * process.stdout.write(seq);
 * ```
 */
export function encodeSixelImage(image: ImageData, maxColors: number, rleEnabled: boolean): string {
	const bpp = bytesPerPixel(image.format);
	const pixelCount = image.width * image.height;

	if (pixelCount === 0) {
		return `${DCS_START}${SIXEL_ST}`;
	}

	const colorCounts = countImageColors(image.data, pixelCount, bpp);
	const { paletteFlat, paletteCount } = buildPalette(colorCounts, maxColors);
	const indexMap = mapPixelsToPalette(image.data, pixelCount, bpp, paletteFlat, paletteCount);

	const paletteHeader = buildPaletteHeader(paletteFlat, paletteCount);
	const sixelData = encodeSixelData(indexMap, paletteCount, image.width, image.height, rleEnabled);

	return `${DCS_START}${paletteHeader}${sixelData}${SIXEL_ST}`;
}

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

/**
 * Builds a cursor positioning escape sequence.
 *
 * @param x - Column position (0-based)
 * @param y - Row position (0-based)
 * @returns ANSI CUP escape sequence (1-based)
 */
export function cursorPosition(x: number, y: number): string {
	return `\x1b[${y + 1};${x + 1}H`;
}

// =============================================================================
// SIXEL DETECTION
// =============================================================================

/**
 * Default environment checker using process.env.
 */
const defaultEnvChecker: SixelEnvChecker = {
	getEnv: (name: string) => process.env[name],
};

/**
 * Checks if the current terminal likely supports sixel graphics.
 *
 * Detection heuristics:
 * - xterm with XTERM_VERSION set (xterm -ti vt340)
 * - mlterm
 * - foot terminal
 * - TERM containing "sixel"
 * - WezTerm (supports sixel)
 * - contour terminal
 *
 * @param env - Environment checker (defaults to process.env)
 * @returns true if sixel graphics are likely supported
 *
 * @example
 * ```typescript
 * import { isSixelSupported } from 'blecsd';
 *
 * if (isSixelSupported()) {
 *   // Use sixel image protocol
 * }
 * ```
 */
export function isSixelSupported(env: SixelEnvChecker = defaultEnvChecker): boolean {
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const term = env.getEnv('TERM') ?? '';
	const xtermVersion = env.getEnv('XTERM_VERSION') ?? '';

	// xterm with sixel support (usually started with -ti vt340)
	if (termProgram === 'xterm' && xtermVersion !== '') return true;

	// Terminals known to support sixel
	const sixelPrograms = ['mlterm', 'foot', 'contour', 'WezTerm'];
	if (sixelPrograms.some((p) => termProgram === p)) return true;

	// TERM hints
	if (term.includes('sixel') || term === 'mlterm') return true;

	return false;
}

// =============================================================================
// RENDER HELPER
// =============================================================================

/**
 * Renders image data as a positioned sixel escape sequence.
 *
 * Positions the cursor, then outputs the sixel-encoded image.
 * For PNG format data, the raw bytes are treated as RGBA (callers should
 * decode PNG to raw pixels before passing to this function).
 *
 * @param image - Image data (RGBA or RGB pixels)
 * @param options - Render options with position
 * @param maxColors - Maximum palette colors
 * @param rleEnabled - Whether to use RLE compression
 * @returns Complete escape sequence with cursor positioning and sixel image
 *
 * @example
 * ```typescript
 * import { renderSixelImage } from 'blecsd';
 *
 * const output = renderSixelImage(
 *   { width: 100, height: 50, data: rgbaBuffer, format: 'rgba' },
 *   { x: 0, y: 0 },
 *   256,
 *   true,
 * );
 * process.stdout.write(output);
 * ```
 */
export function renderSixelImage(
	image: ImageData,
	options: RenderOptions,
	maxColors: number,
	rleEnabled: boolean,
): string {
	const pos = cursorPosition(options.x, options.y);
	const seq = encodeSixelImage(image, maxColors, rleEnabled);
	return pos + seq;
}

/**
 * Generates a clear sequence for sixel images.
 *
 * Sixel protocol does not have a dedicated clear command.
 * Overwrites the area with spaces to clear the image.
 *
 * @param options - Area to clear (x, y, width, height in cells)
 * @returns Escape sequence to blank the area
 */
export function clearSixelImage(options?: {
	x: number;
	y: number;
	width: number;
	height: number;
}): string {
	if (!options) return '';
	const lines: string[] = [];
	for (let row = 0; row < options.height; row++) {
		lines.push(cursorPosition(options.x, options.y + row) + ' '.repeat(options.width));
	}
	return lines.join('');
}

// =============================================================================
// BACKEND FACTORY
// =============================================================================

/**
 * Creates a sixel graphics backend.
 *
 * @param config - Optional backend configuration
 * @param envChecker - Optional environment checker for testing
 * @returns A GraphicsBackend for sixel image rendering
 *
 * @example
 * ```typescript
 * import { createSixelGraphicsBackend, createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, createSixelGraphicsBackend());
 *
 * // With custom config:
 * registerBackend(manager, createSixelGraphicsBackend({ maxColors: 64 }));
 * ```
 */
export function createSixelGraphicsBackend(
	config?: SixelBackendConfig,
	envChecker?: SixelEnvChecker,
): GraphicsBackend {
	const validated = SixelBackendConfigSchema.parse(config ?? {});
	const maxColors = validated.maxColors;
	const rleEnabled = validated.rleEnabled;

	const capabilities: GraphicsCapabilities = {
		staticImages: true,
		animation: false,
		alphaChannel: false,
		maxWidth: null,
		maxHeight: null,
	};

	return {
		name: SIXEL_BACKEND_NAME,
		capabilities,
		render: (image: ImageData, options: RenderOptions) =>
			renderSixelImage(image, options, maxColors, rleEnabled),
		clear: () => '',
		isSupported: () => isSixelSupported(envChecker),
	};
}
