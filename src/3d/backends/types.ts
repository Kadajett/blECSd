/**
 * Renderer backend interface and supporting types.
 *
 * All backends implement RendererBackend, converting a PixelFramebuffer
 * into terminal output (either cells for cell-based backends or escape
 * sequences for pixel-protocol backends).
 *
 * @module 3d/backends/types
 */

import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { BackendCapabilities, BackendType, EncodedOutput } from '../schemas/backends';

/**
 * Interface that all renderer backends must implement.
 *
 * Cell-based backends (braille, halfblock, sextant) return `cells` in their
 * EncodedOutput. Escape-based backends (sixel, kitty) return `escape` strings.
 *
 * @example
 * ```typescript
 * const backend: RendererBackend = createBrailleBackend();
 * const dims = backend.getPixelDimensions(60, 20);
 * const fb = createPixelFramebuffer({ width: dims.width, height: dims.height });
 * // ... rasterize to fb ...
 * const output = backend.encode(fb, 0, 0);
 * ```
 */
export interface RendererBackend {
	/** The backend type identifier. */
	readonly type: BackendType;
	/** Capabilities descriptor for this backend. */
	readonly capabilities: BackendCapabilities;
	/**
	 * Encode a pixel framebuffer into terminal output.
	 *
	 * @param framebuffer - The pixel buffer to encode
	 * @param screenX - Terminal column offset for output placement
	 * @param screenY - Terminal row offset for output placement
	 * @returns Encoded output (cells or escape sequences)
	 */
	encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput;
	/**
	 * Calculate pixel dimensions for a given terminal cell region.
	 *
	 * @param cellWidth - Number of terminal columns
	 * @param cellHeight - Number of terminal rows
	 * @returns Pixel dimensions the framebuffer should be created with
	 */
	getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number };
}
