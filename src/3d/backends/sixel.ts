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

import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type SixelConfig, SixelConfigSchema } from '../schemas/backends';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { RendererBackend } from './types';

/** DCS introducer for sixel. */
const DCS_START = '\x1bPq';

/** String terminator. */
const ST = '\x1b\\';

/**
 * Quantize framebuffer colors to a limited palette using popularity-based selection.
 * Uses pre-allocated buffers to minimize GC pressure.
 *
 * @param fb - Source framebuffer
 * @param maxColors - Maximum palette size
 * @param reusableIndexMap - Optional pre-allocated index map to reuse
 * @returns Array of palette colors as flat [r,g,b,...] Uint8Array and a pixel-to-palette index map
 */
function quantizePalette(
	fb: PixelFramebuffer,
	maxColors: number,
	reusableIndexMap: Uint8Array | null,
): { paletteFlat: Uint8Array; paletteCount: number; indexMap: Uint8Array } {
	const buf = fb.colorBuffer;
	const pixelCount = fb.width * fb.height;
	const colorCounts = new Map<number, number>();

	// Count color occurrences (ignoring alpha)
	for (let i = 0; i < pixelCount; i++) {
		const idx = i * 4;
		const a = buf[idx + 3] as number;
		if (a === 0) continue;
		const key = ((buf[idx] as number) << 16) | ((buf[idx + 1] as number) << 8) | (buf[idx + 2] as number);
		colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
	}

	// Sort by popularity, take top N. Use typed array for palette storage.
	const entries: Array<[number, number]> = [];
	for (const entry of colorCounts) {
		entries.push(entry);
	}
	entries.sort((a, b) => b[1] - a[1]);
	const paletteCount = Math.min(entries.length, maxColors) || 1;
	const paletteFlat = new Uint8Array(paletteCount * 3);

	for (let i = 0; i < paletteCount; i++) {
		if (i < entries.length) {
			const key = entries[i]![0];
			paletteFlat[i * 3] = (key >> 16) & 0xff;
			paletteFlat[i * 3 + 1] = (key >> 8) & 0xff;
			paletteFlat[i * 3 + 2] = key & 0xff;
		}
	}

	// Reuse index map buffer when size matches
	const indexMap = (reusableIndexMap && reusableIndexMap.length === pixelCount)
		? reusableIndexMap
		: new Uint8Array(pixelCount);

	// Map each pixel to nearest palette index
	for (let i = 0; i < pixelCount; i++) {
		const idx = i * 4;
		const a = buf[idx + 3] as number;
		if (a === 0) {
			indexMap[i] = 0;
			continue;
		}
		const r = buf[idx] as number;
		const g = buf[idx + 1] as number;
		const b = buf[idx + 2] as number;

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
				if (dist === 0) break; // Exact match, no need to check further
			}
		}
		indexMap[i] = bestIdx;
	}

	return { paletteFlat, paletteCount, indexMap };
}

/**
 * Run-length encode sixel band data from a Uint8Array of sixel values.
 * Writes encoded result to output parts array. Uses `!<count><char>` for runs >= 3.
 */
function rleEncodeBand(
	sixelValues: Uint8Array,
	width: number,
	parts: string[],
): boolean {
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
			const { paletteFlat, paletteCount, indexMap } = quantizePalette(framebuffer, maxColors, cachedIndexMap);
			cachedIndexMap = indexMap;
			const w = framebuffer.width;
			const h = framebuffer.height;

			// Collect all output in an array, join once at the end
			const parts: string[] = [DCS_START];

			// Build palette header
			for (let i = 0; i < paletteCount; i++) {
				const i3 = i * 3;
				const rp = Math.round(((paletteFlat[i3] as number) / 255) * 100);
				const gp = Math.round(((paletteFlat[i3 + 1] as number) / 255) * 100);
				const bp = Math.round(((paletteFlat[i3 + 2] as number) / 255) * 100);
				parts.push('#', String(i), ';2;', String(rp), ';', String(gp), ';', String(bp));
			}

			// Pre-allocate sixel row buffer
			if (!cachedSixelRow || cachedSixelRow.length < w) {
				cachedSixelRow = new Uint8Array(w);
			}
			const sixelRow = cachedSixelRow;

			// Encode bands (6 rows each)
			const bandCount = Math.ceil(h / 6);
			for (let band = 0; band < bandCount; band++) {
				const bandY = band * 6;
				const maxRow = Math.min(6, h - bandY);

				// For each color in the palette
				for (let colorIdx = 0; colorIdx < paletteCount; colorIdx++) {
					// Build sixel values for this color in this band
					for (let x = 0; x < w; x++) {
						let sixelBits = 0;
						for (let row = 0; row < maxRow; row++) {
							const pixelIdx = (bandY + row) * w + x;
							if (indexMap[pixelIdx] === colorIdx) {
								sixelBits |= (1 << row);
							}
						}
						sixelRow[x] = sixelBits;
					}

					// RLE encode or raw output
					if (rleEnabled) {
						const bandParts: string[] = [];
						const hasPixels = rleEncodeBand(sixelRow, w, bandParts);
						if (hasPixels) {
							parts.push('#', String(colorIdx));
							for (let p = 0; p < bandParts.length; p++) {
								parts.push(bandParts[p]!);
							}
							parts.push('$');
						}
					} else {
						let hasPixels = false;
						const bandChars: string[] = [];
						for (let x = 0; x < w; x++) {
							const val = sixelRow[x] as number;
							if (val > 0) hasPixels = true;
							bandChars.push(String.fromCharCode(63 + val));
						}
						if (hasPixels) {
							parts.push('#', String(colorIdx));
							for (let c = 0; c < bandChars.length; c++) {
								parts.push(bandChars[c]!);
							}
							parts.push('$');
						}
					}
				}

				if (band < bandCount - 1) {
					parts.push('-');
				}
			}

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
