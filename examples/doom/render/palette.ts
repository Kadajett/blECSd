/**
 * PLAYPAL and COLORMAP parsing for Doom's palette-indexed color system.
 *
 * PLAYPAL: 14 palettes x 256 RGB colors (768 bytes each).
 * COLORMAP: 34 remapping tables x 256 entries for light diminishing.
 *
 * @module render/palette
 */

import type { ColorMap, Palette, PaletteColor, PlayPal } from '../wad/types.js';

/**
 * Parse the PLAYPAL lump (14 palettes, 256 colors each, 3 bytes per color).
 *
 * @param data - Raw PLAYPAL lump bytes (10752 bytes expected)
 * @returns 14 palettes, each with 256 RGB colors
 * @throws If data is smaller than expected
 *
 * @example
 * ```typescript
 * const playpal = parsePlaypal(getLumpByName(wad, 'PLAYPAL'));
 * const normalPalette = playpal[0]; // base palette
 * const color = normalPalette[176]; // palette index 176
 * console.log(color.r, color.g, color.b);
 * ```
 */
export function parsePlaypal(data: Uint8Array): PlayPal {
	const PALETTE_SIZE = 768; // 256 * 3
	const NUM_PALETTES = 14;
	const EXPECTED_SIZE = PALETTE_SIZE * NUM_PALETTES;

	if (data.length < EXPECTED_SIZE) {
		throw new Error(`PLAYPAL too small: ${data.length} bytes (expected ${EXPECTED_SIZE})`);
	}

	const palettes: Palette[] = [];

	for (let p = 0; p < NUM_PALETTES; p++) {
		const colors: PaletteColor[] = [];
		const baseOffset = p * PALETTE_SIZE;

		for (let c = 0; c < 256; c++) {
			const offset = baseOffset + c * 3;
			colors.push({
				r: data[offset] ?? 0,
				g: data[offset + 1] ?? 0,
				b: data[offset + 2] ?? 0,
			});
		}

		palettes.push(colors);
	}

	return palettes;
}

/**
 * Parse the COLORMAP lump (34 remapping tables, 256 bytes each).
 *
 * Colormap 0 = full brightness (identity-ish).
 * Colormaps 1-31 = decreasing brightness.
 * Colormap 32 = invulnerability effect (grayscale).
 * Colormap 33 = all black.
 *
 * @param data - Raw COLORMAP lump bytes (8704 bytes expected)
 * @returns Array of 34 colormaps, each 256 bytes
 * @throws If data is smaller than expected
 *
 * @example
 * ```typescript
 * const colormap = parseColormap(getLumpByName(wad, 'COLORMAP'));
 * const fullBright = colormap[0];
 * const halfDark = colormap[16];
 * const shadedIndex = halfDark[originalPaletteIndex];
 * ```
 */
export function parseColormap(data: Uint8Array): ColorMap {
	const MAP_SIZE = 256;
	const NUM_MAPS = 34;
	const EXPECTED_SIZE = MAP_SIZE * NUM_MAPS;

	if (data.length < EXPECTED_SIZE) {
		throw new Error(`COLORMAP too small: ${data.length} bytes (expected ${EXPECTED_SIZE})`);
	}

	const maps: Uint8Array[] = [];
	for (let i = 0; i < NUM_MAPS; i++) {
		maps.push(data.slice(i * MAP_SIZE, (i + 1) * MAP_SIZE));
	}

	return maps;
}

/**
 * Look up the shaded palette index for a given pixel.
 *
 * @param colormap - Parsed colormaps
 * @param colormapIndex - Light level (0 = bright, 31 = dark)
 * @param paletteIndex - Original palette index (0-255)
 * @returns Shaded palette index
 */
export function shadeColor(
	colormap: ColorMap,
	colormapIndex: number,
	paletteIndex: number,
): number {
	const clampedMap = Math.max(0, Math.min(31, colormapIndex));
	const map = colormap[clampedMap];
	if (!map) return paletteIndex;
	return map[paletteIndex] ?? paletteIndex;
}

/**
 * Convert a palette-indexed pixel to RGBA using the palette and colormap.
 *
 * @param palette - 256-color palette
 * @param colormap - Colormaps for light diminishing
 * @param paletteIndex - Palette index of the pixel (0-255)
 * @param lightLevel - Colormap index (0 = bright, 31 = dark)
 * @returns RGBA color components
 */
export function paletteToRgba(
	palette: Palette,
	colormap: ColorMap,
	paletteIndex: number,
	lightLevel: number,
): { r: number; g: number; b: number; a: number } {
	const shadedIndex = shadeColor(colormap, lightLevel, paletteIndex);
	const color = palette[shadedIndex];
	if (!color) return { r: 0, g: 0, b: 0, a: 255 };
	return { r: color.r, g: color.g, b: color.b, a: 255 };
}
