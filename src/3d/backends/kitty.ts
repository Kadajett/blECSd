/**
 * Kitty Graphics Protocol rendering backend.
 *
 * Encodes pixel data as Kitty graphics protocol escape sequences,
 * supporting true-color RGBA with alpha transparency.
 *
 * Protocol format:
 * ```
 * ESC _G <key>=<value>,...; <base64 payload> ESC \
 * ```
 *
 * Key parameters:
 * - `a=T` - transmit image data
 * - `a=p` - display (put) image
 * - `a=d` - delete image
 * - `f=32` - RGBA pixel format
 * - `s=<width>` - image width in pixels
 * - `v=<height>` - image height in pixels
 * - `i=<id>` - image ID for reuse
 * - `m=0|1` - 0 = last chunk, 1 = more chunks follow
 *
 * @module 3d/backends/kitty
 */

import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type KittyConfig, KittyConfigSchema } from '../schemas/backends';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { RendererBackend } from './types';

/** APC (Application Program Command) introducer for kitty graphics. */
const APC_START = '\x1b_G';

/** String terminator. */
const ST = '\x1b\\';

/**
 * Base64 encode a Uint8ClampedArray.
 */
function toBase64(data: Uint8ClampedArray): string {
	// Use Buffer in Node.js
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
	}
	// Fallback for non-Node environments
	let binary = '';
	for (let i = 0; i < data.length; i++) {
		binary += String.fromCharCode(data[i] as number);
	}
	return btoa(binary);
}

/**
 * Split base64 data into chunks of specified size.
 *
 * @param base64 - The full base64 encoded string
 * @param chunkSize - Maximum bytes per chunk
 * @returns Array of chunk strings
 */
function chunkBase64(base64: string, chunkSize: number): ReadonlyArray<string> {
	if (base64.length <= chunkSize) {
		return [base64];
	}
	const chunks: Array<string> = [];
	for (let i = 0; i < base64.length; i += chunkSize) {
		chunks.push(base64.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Create a Kitty Graphics Protocol rendering backend.
 *
 * @param config - Optional kitty configuration
 * @returns A RendererBackend that encodes pixels as kitty graphics escape sequences
 *
 * @example
 * ```typescript
 * const backend = createKittyBackend({ imageId: 1 });
 * const output = backend.encode(framebuffer, 0, 0);
 * process.stdout.write(output.escape);
 * ```
 */
export function createKittyBackend(config?: KittyConfig): RendererBackend {
	const validated = KittyConfigSchema.parse(config ?? {});
	const imageId = validated.imageId;
	const chunkSize = validated.chunkSize;

	const capabilities: BackendCapabilities = {
		maxColors: 16777216,
		supportsAlpha: true,
		pixelsPerCellX: 1,
		pixelsPerCellY: 1,
		supportsAnimation: true,
		requiresEscapeSequences: true,
	};

	return {
		type: 'kitty',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const w = framebuffer.width;
			const h = framebuffer.height;
			const base64Data = toBase64(framebuffer.colorBuffer);
			const chunks = chunkBase64(base64Data, chunkSize);

			let escape = '';

			// Delete previous image with this ID
			escape += `${APC_START}a=d,d=i,i=${imageId};${ST}`;

			// Transmit image data in chunks
			for (let c = 0; c < chunks.length; c++) {
				const isLast = c === chunks.length - 1;
				const isFirst = c === 0;

				if (isFirst) {
					// First chunk includes image metadata
					escape += `${APC_START}a=T,f=32,s=${w},v=${h},i=${imageId},m=${isLast ? 0 : 1};${chunks[c]}${ST}`;
				} else {
					// Subsequent chunks only have continuation flag
					escape += `${APC_START}m=${isLast ? 0 : 1};${chunks[c]}${ST}`;
				}
			}

			// Place image at screen position
			escape += `${APC_START}a=p,i=${imageId},p=1,C=1;${ST}`;

			return { escape, cursorX: screenX, cursorY: screenY };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			// Kitty protocol is pixel-level; typical terminal cells are ~8x16
			return { width: cellWidth * 8, height: cellHeight * 16 };
		},
	};
}
