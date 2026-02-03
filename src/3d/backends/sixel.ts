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
 *
 * @param fb - Source framebuffer
 * @param maxColors - Maximum palette size
 * @returns Array of palette colors as [r, g, b] tuples and a pixel-to-palette index map
 */
function quantizePalette(
	fb: PixelFramebuffer,
	maxColors: number,
): { palette: ReadonlyArray<readonly [number, number, number]>; indexMap: Uint8Array } {
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

	// Sort by popularity, take top N
	const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
	const palette: Array<readonly [number, number, number]> = [];
	for (let i = 0; i < Math.min(sorted.length, maxColors); i++) {
		const key = sorted[i]![0];
		palette.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff] as const);
	}

	// If no colors, add black as default
	if (palette.length === 0) {
		palette.push([0, 0, 0] as const);
	}

	// Map each pixel to nearest palette index
	const indexMap = new Uint8Array(pixelCount);
	for (let i = 0; i < pixelCount; i++) {
		const idx = i * 4;
		const a = buf[idx + 3] as number;
		if (a === 0) {
			indexMap[i] = 0; // transparent maps to first palette entry
			continue;
		}
		const r = buf[idx] as number;
		const g = buf[idx + 1] as number;
		const b = buf[idx + 2] as number;

		let bestDist = Number.POSITIVE_INFINITY;
		let bestIdx = 0;
		for (let p = 0; p < palette.length; p++) {
			const [pr, pg, pb] = palette[p]!;
			const dr = r - pr;
			const dg = g - pg;
			const db = b - pb;
			const dist = dr * dr + dg * dg + db * db;
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = p;
			}
		}
		indexMap[i] = bestIdx;
	}

	return { palette, indexMap };
}

/**
 * Run-length encode a sixel data string.
 * Repeated characters are compressed as `!<count><char>`.
 */
function rleEncode(data: string): string {
	if (data.length === 0) return '';

	let result = '';
	let i = 0;
	while (i < data.length) {
		const ch = data[i]!;
		let count = 1;
		while (i + count < data.length && data[i + count] === ch) {
			count++;
		}
		if (count >= 3) {
			result += `!${count}${ch}`;
		} else {
			for (let j = 0; j < count; j++) {
				result += ch;
			}
		}
		i += count;
	}
	return result;
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

	return {
		type: 'sixel',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const { palette, indexMap } = quantizePalette(framebuffer, maxColors);
			const w = framebuffer.width;
			const h = framebuffer.height;

			// Build palette header
			let escape = DCS_START;
			for (let i = 0; i < palette.length; i++) {
				const [r, g, b] = palette[i]!;
				// Sixel palette uses percentages 0-100
				const rp = Math.round((r / 255) * 100);
				const gp = Math.round((g / 255) * 100);
				const bp = Math.round((b / 255) * 100);
				escape += `#${i};2;${rp};${gp};${bp}`;
			}

			// Encode bands (6 rows each)
			const bandCount = Math.ceil(h / 6);
			for (let band = 0; band < bandCount; band++) {
				const bandY = band * 6;

				// For each color in the palette that has pixels in this band
				for (let colorIdx = 0; colorIdx < palette.length; colorIdx++) {
					let bandData = '';
					let hasPixels = false;

					for (let x = 0; x < w; x++) {
						let sixelBits = 0;
						for (let row = 0; row < 6; row++) {
							const y = bandY + row;
							if (y >= h) continue;
							const pixelIdx = y * w + x;
							if (indexMap[pixelIdx] === colorIdx) {
								sixelBits |= (1 << row);
							}
						}
						bandData += String.fromCharCode(63 + sixelBits);
						if (sixelBits > 0) hasPixels = true;
					}

					if (hasPixels) {
						const encoded = rleEnabled ? rleEncode(bandData) : bandData;
						escape += `#${colorIdx}${encoded}$`;
					}
				}

				// Band separator (newline) except for last band
				if (band < bandCount - 1) {
					escape += '-';
				}
			}

			escape += ST;

			return { escape, cursorX: screenX, cursorY: screenY };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			// Sixel is pixel-level, but typical terminal cells are ~8x16 pixels
			// Use common defaults; actual values depend on terminal font
			return { width: cellWidth * 8, height: cellHeight * 16 };
		},
	};
}
