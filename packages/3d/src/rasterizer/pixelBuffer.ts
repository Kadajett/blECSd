/**
 * RGBA pixel framebuffer with optional depth buffer for 3D rasterization.
 *
 * All backends consume this intermediate format. The rasterizer writes to it,
 * and encoding backends read from it to produce terminal output.
 *
 * @module 3d/rasterizer/pixelBuffer
 */

import {
	type PixelBufferConfig,
	PixelBufferConfigSchema,
	type RGBAColor,
} from '../schemas/rasterizer';

/**
 * An RGBA pixel framebuffer with optional depth buffer.
 *
 * @example
 * ```typescript
 * const fb = createPixelFramebuffer({ width: 400, height: 200 });
 * setPixel(fb, 10, 20, { r: 255, g: 0, b: 0, a: 255 });
 * const pixel = getPixel(fb, 10, 20);
 * ```
 */
export interface PixelFramebuffer {
	readonly width: number;
	readonly height: number;
	readonly colorBuffer: Uint8ClampedArray;
	readonly depthBuffer: Float32Array | null;
}

/**
 * Create a new pixel framebuffer. Config is validated via Zod.
 *
 * @param config - Buffer dimensions and depth buffer toggle
 * @returns A new framebuffer with cleared color and depth buffers
 *
 * @example
 * ```typescript
 * const fb = createPixelFramebuffer({ width: 400, height: 200, enableDepthBuffer: true });
 * ```
 */
export function createPixelFramebuffer(config: PixelBufferConfig): PixelFramebuffer {
	const validated = PixelBufferConfigSchema.parse(config);
	const { width, height, enableDepthBuffer } = validated;
	const pixelCount = width * height;

	const colorBuffer = new Uint8ClampedArray(pixelCount * 4);
	const depthBuffer = enableDepthBuffer ? new Float32Array(pixelCount) : null;

	if (depthBuffer) {
		depthBuffer.fill(1.0);
	}

	return { width, height, colorBuffer, depthBuffer };
}

/**
 * Clear the framebuffer to a solid color and reset depth values.
 * Mutates the framebuffer in place for performance (hot path).
 *
 * @param fb - Framebuffer to clear
 * @param color - Clear color (defaults to transparent black)
 * @param depth - Clear depth value (defaults to 1.0, far plane)
 *
 * @example
 * ```typescript
 * clearFramebuffer(fb, { r: 0, g: 0, b: 0, a: 255 });
 * ```
 */
export function clearFramebuffer(fb: PixelFramebuffer, color?: RGBAColor, depth?: number): void {
	const buf = fb.colorBuffer;

	if (!color || (color.r === 0 && color.g === 0 && color.b === 0 && color.a === 0)) {
		buf.fill(0);
	} else {
		const r = color.r;
		const g = color.g;
		const b = color.b;
		const a = color.a;
		for (let i = 0; i < buf.length; i += 4) {
			buf[i] = r;
			buf[i + 1] = g;
			buf[i + 2] = b;
			buf[i + 3] = a;
		}
	}

	if (fb.depthBuffer) {
		fb.depthBuffer.fill(depth ?? 1.0);
	}
}

/**
 * Check if coordinates are within framebuffer bounds.
 *
 * @param fb - Framebuffer to check against
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if (x, y) is within bounds
 *
 * @example
 * ```typescript
 * if (isInBounds(fb, x, y)) {
 *   setPixel(fb, x, y, color);
 * }
 * ```
 */
export function isInBounds(fb: PixelFramebuffer, x: number, y: number): boolean {
	return x >= 0 && x < fb.width && y >= 0 && y < fb.height;
}

/**
 * Get the RGBA color at the specified pixel. Returns a copy.
 * Returns transparent black for out-of-bounds coordinates.
 *
 * @param fb - Framebuffer to read from
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns RGBA color at the pixel
 *
 * @example
 * ```typescript
 * const color = getPixel(fb, 10, 20);
 * console.log(color.r, color.g, color.b, color.a);
 * ```
 */
export function getPixel(fb: PixelFramebuffer, x: number, y: number): RGBAColor {
	if (!isInBounds(fb, x, y)) {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	const idx = (y * fb.width + x) * 4;
	return {
		r: fb.colorBuffer[idx] as number,
		g: fb.colorBuffer[idx + 1] as number,
		b: fb.colorBuffer[idx + 2] as number,
		a: fb.colorBuffer[idx + 3] as number,
	};
}

/**
 * Set the RGBA color at the specified pixel. Bounds-checked (no-op if out of bounds).
 *
 * @param fb - Framebuffer to write to
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param color - RGBA color to set
 *
 * @example
 * ```typescript
 * setPixel(fb, 10, 20, { r: 255, g: 0, b: 0, a: 255 });
 * ```
 */
export function setPixel(fb: PixelFramebuffer, x: number, y: number, color: RGBAColor): void {
	if (!isInBounds(fb, x, y)) {
		return;
	}

	const idx = (y * fb.width + x) * 4;
	fb.colorBuffer[idx] = color.r;
	fb.colorBuffer[idx + 1] = color.g;
	fb.colorBuffer[idx + 2] = color.b;
	fb.colorBuffer[idx + 3] = color.a;
}

/**
 * Set pixel color without bounds checking. Use only in inner loops where
 * bounds have already been verified.
 *
 * @param fb - Framebuffer to write to
 * @param x - X coordinate (must be in bounds)
 * @param y - Y coordinate (must be in bounds)
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255)
 *
 * @example
 * ```typescript
 * // Only use when bounds are guaranteed
 * if (isInBounds(fb, x, y)) {
 *   setPixelUnsafe(fb, x, y, 255, 0, 0, 255);
 * }
 * ```
 */
export function setPixelUnsafe(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	r: number,
	g: number,
	b: number,
	a: number,
): void {
	const idx = (y * fb.width + x) * 4;
	fb.colorBuffer[idx] = r;
	fb.colorBuffer[idx + 1] = g;
	fb.colorBuffer[idx + 2] = b;
	fb.colorBuffer[idx + 3] = a;
}

/**
 * Get the depth value at the specified pixel.
 * Returns 1.0 (far plane) for out-of-bounds or if no depth buffer exists.
 *
 * @param fb - Framebuffer to read from
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Depth value at the pixel (0.0 = near, 1.0 = far)
 *
 * @example
 * ```typescript
 * const depth = getDepth(fb, 10, 20);
 * ```
 */
export function getDepth(fb: PixelFramebuffer, x: number, y: number): number {
	if (!fb.depthBuffer || !isInBounds(fb, x, y)) {
		return 1.0;
	}

	const idx = y * fb.width + x;
	return fb.depthBuffer[idx] as number;
}

/**
 * Test if a pixel passes the depth test (closer than current depth) and
 * update the depth buffer if it passes.
 *
 * @param fb - Framebuffer with depth buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param depth - Depth value to test (0.0 = near, 1.0 = far)
 * @returns True if the depth test passed and the value was written
 *
 * @example
 * ```typescript
 * if (testAndSetDepth(fb, x, y, 0.5)) {
 *   setPixelUnsafe(fb, x, y, 255, 0, 0, 255);
 * }
 * ```
 */
export function testAndSetDepth(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	depth: number,
): boolean {
	if (!fb.depthBuffer || !isInBounds(fb, x, y)) {
		return false;
	}

	const idx = y * fb.width + x;
	if (depth < (fb.depthBuffer[idx] as number)) {
		fb.depthBuffer[idx] = depth;
		return true;
	}

	return false;
}

/**
 * Fill a rectangular region with a solid color. Clips to framebuffer bounds.
 *
 * @param fb - Framebuffer to write to
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param w - Width of the rectangle
 * @param h - Height of the rectangle
 * @param color - Fill color
 *
 * @example
 * ```typescript
 * fillRect(fb, 10, 10, 50, 30, { r: 0, g: 255, b: 0, a: 255 });
 * ```
 */
export function fillRect(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	w: number,
	h: number,
	color: RGBAColor,
): void {
	const x0 = Math.max(0, Math.floor(x));
	const y0 = Math.max(0, Math.floor(y));
	const x1 = Math.min(fb.width, Math.floor(x + w));
	const y1 = Math.min(fb.height, Math.floor(y + h));

	for (let py = y0; py < y1; py++) {
		for (let px = x0; px < x1; px++) {
			const idx = (py * fb.width + px) * 4;
			fb.colorBuffer[idx] = color.r;
			fb.colorBuffer[idx + 1] = color.g;
			fb.colorBuffer[idx + 2] = color.b;
			fb.colorBuffer[idx + 3] = color.a;
		}
	}
}
