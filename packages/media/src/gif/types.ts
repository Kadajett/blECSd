/**
 * GIF parser types and constants.
 *
 * @module media/gif/types
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * GIF87a signature bytes.
 *
 * @example
 * ```typescript
 * import { GIF87A_MAGIC } from 'blecsd';
 *
 * const isGif87a = arrayStartsWith(data, GIF87A_MAGIC);
 * ```
 */
export const GIF87A_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);

/**
 * GIF89a signature bytes.
 *
 * @example
 * ```typescript
 * import { GIF89A_MAGIC } from 'blecsd';
 *
 * const isGif89a = arrayStartsWith(data, GIF89A_MAGIC);
 * ```
 */
export const GIF89A_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

/** GIF trailer byte marking end of file */
export const GIF_TRAILER = 0x3b;
/** GIF extension introducer */
export const EXTENSION_INTRODUCER = 0x21;
/** GIF image separator */
export const IMAGE_SEPARATOR = 0x2c;
/** Graphics control extension label */
export const GRAPHICS_CONTROL_LABEL = 0xf9;
/** Application extension label */
export const APPLICATION_EXTENSION_LABEL = 0xff;
/** Comment extension label */
export const COMMENT_EXTENSION_LABEL = 0xfe;
/** Plain text extension label */
export const PLAIN_TEXT_LABEL = 0x01;

// =============================================================================
// TYPES
// =============================================================================

/**
 * GIF version identifier.
 */
export type GIFVersion = '87a' | '89a';

/**
 * Frame disposal method.
 *
 * Controls how the frame area is treated before rendering the next frame.
 *
 * @example
 * ```typescript
 * import { DisposalMethod } from 'blecsd';
 *
 * if (frame.disposal === DisposalMethod.RestoreBackground) {
 *   // Clear frame area before next frame
 * }
 * ```
 */
export enum DisposalMethod {
	/** No disposal specified (leave as-is) */
	Unspecified = 0,
	/** Do not dispose (leave frame in place) */
	None = 1,
	/** Restore to background color */
	RestoreBackground = 2,
	/** Restore to previous frame */
	RestorePrevious = 3,
}

/**
 * A single color entry in a GIF color table.
 */
export interface GIFColor {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/**
 * GIF logical screen descriptor.
 */
export interface GIFHeader {
	/** GIF version */
	readonly version: GIFVersion;
	/** Logical screen width */
	readonly width: number;
	/** Logical screen height */
	readonly height: number;
	/** Whether a global color table is present */
	readonly hasGlobalColorTable: boolean;
	/** Bits per primary color minus 1 (color resolution) */
	readonly colorResolution: number;
	/** Whether the global color table is sorted */
	readonly sortFlag: boolean;
	/** Size of the global color table (number of entries) */
	readonly globalColorTableSize: number;
	/** Background color index in the global color table */
	readonly backgroundColorIndex: number;
	/** Pixel aspect ratio byte */
	readonly pixelAspectRatio: number;
}

/**
 * Zod schema for GIF header validation.
 */
export const GIFHeaderSchema = z.object({
	version: z.enum(['87a', '89a']),
	width: z.number().int().min(1).max(65535),
	height: z.number().int().min(1).max(65535),
	hasGlobalColorTable: z.boolean(),
	colorResolution: z.number().int().min(0).max(7),
	sortFlag: z.boolean(),
	globalColorTableSize: z.number().int().min(0),
	backgroundColorIndex: z.number().int().min(0).max(255),
	pixelAspectRatio: z.number().int().min(0).max(255),
});

/**
 * A single frame from a GIF image.
 *
 * @example
 * ```typescript
 * import { parseGIF } from 'blecsd';
 *
 * const result = parseGIF(gifData);
 * if (result.ok) {
 *   for (const frame of result.frames) {
 *     console.log(`Frame: ${frame.width}x${frame.height}, delay: ${frame.delay}ms`);
 *   }
 * }
 * ```
 */
export interface GIFFrame {
	/** X offset of this frame within the logical screen */
	readonly x: number;
	/** Y offset of this frame within the logical screen */
	readonly y: number;
	/** Frame width in pixels */
	readonly width: number;
	/** Frame height in pixels */
	readonly height: number;
	/** Pixel data as palette indices */
	readonly pixels: Uint8Array;
	/** Frame delay in milliseconds */
	readonly delay: number;
	/** Disposal method for this frame */
	readonly disposal: DisposalMethod;
	/** Transparent color index, or undefined if none */
	readonly transparentIndex: number | undefined;
	/** Local color table, or undefined to use global */
	readonly localColorTable: readonly GIFColor[] | undefined;
	/** Whether the frame is interlaced */
	readonly interlaced: boolean;
}

/**
 * Result of successful GIF parsing.
 */
export interface GIFParseResult {
	readonly ok: true;
	/** GIF header info */
	readonly header: GIFHeader;
	/** Global color table (empty array if none) */
	readonly globalColorTable: readonly GIFColor[];
	/** Parsed frames */
	readonly frames: readonly GIFFrame[];
	/** Number of loop iterations (0 = infinite) */
	readonly loopCount: number;
}

/**
 * Error result from GIF parsing.
 */
export interface GIFParseError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Result type for GIF parsing.
 */
export type GIFParseOutput = GIFParseResult | GIFParseError;

/**
 * Graphics control extension data.
 */
export interface GraphicsControl {
	readonly disposal: DisposalMethod;
	readonly delay: number;
	readonly transparentIndex: number | undefined;
}
