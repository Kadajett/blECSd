/**
 * Kitty Graphics Protocol Backend
 *
 * Implements the Kitty terminal graphics protocol for high-fidelity raster
 * image display with animation support. Uses APC escape sequences
 * (ESC _G ... ESC \) for image transmission, placement, and deletion.
 *
 * @see https://sw.kovidgoyal.net/kitty/graphics-protocol/
 * @module terminal/graphics/kitty
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
 * APC (Application Programming Command) escape sequence prefix for Kitty graphics.
 *
 * @example
 * ```typescript
 * import { APC_PREFIX } from 'blecsd';
 *
 * // '\x1b_G' starts a Kitty graphics command
 * ```
 */
export const APC_PREFIX = '\x1b_G';

/**
 * String Terminator for APC sequences.
 *
 * @example
 * ```typescript
 * import { KITTY_ST } from 'blecsd';
 *
 * // '\x1b\\' terminates the APC sequence
 * ```
 */
export const KITTY_ST = '\x1b\\';

/**
 * Maximum base64 payload size per chunk (4096 bytes).
 *
 * @example
 * ```typescript
 * import { MAX_CHUNK_SIZE } from 'blecsd';
 *
 * // Payloads larger than 4096 bytes must be chunked
 * ```
 */
export const MAX_CHUNK_SIZE = 4096;

/**
 * Kitty backend name constant.
 *
 * @example
 * ```typescript
 * import { KITTY_BACKEND_NAME } from 'blecsd';
 *
 * console.log(KITTY_BACKEND_NAME); // 'kitty'
 * ```
 */
export const KITTY_BACKEND_NAME: BackendName = 'kitty';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Kitty graphics action type.
 *
 * - 'T': Transmit and display (default)
 * - 't': Transmit only (store without display)
 * - 'p': Place a previously transmitted image
 * - 'd': Delete image placements/data
 * - 'q': Query protocol support
 * - 'f': Transmit animation frame
 * - 'a': Control animation playback
 */
export type KittyAction = 'T' | 't' | 'p' | 'd' | 'q' | 'f' | 'a';

/**
 * Kitty graphics pixel format.
 *
 * - 24: RGB (3 bytes per pixel)
 * - 32: RGBA (4 bytes per pixel, default)
 * - 100: PNG encoded data
 */
export type KittyFormat = 24 | 32 | 100;

/**
 * Kitty graphics transmission method.
 *
 * - 'd': Direct inline base64 (default)
 * - 'f': File path reference
 * - 't': Temporary file (auto-deleted after read)
 * - 's': Shared memory object
 */
export type KittyTransmission = 'd' | 'f' | 't' | 's';

/**
 * Kitty graphics deletion mode.
 *
 * Lowercase: delete placements only (data stays in memory).
 * Uppercase: delete placements AND image data.
 */
export type KittyDeleteMode = 'a' | 'A' | 'i' | 'I' | 'c' | 'C' | 'x' | 'X' | 'y' | 'Y' | 'z' | 'Z';

/**
 * Quiet mode for suppressing terminal responses.
 *
 * - 0: All responses (default)
 * - 1: Suppress OK responses
 * - 2: Suppress all responses
 */
export type KittyQuiet = 0 | 1 | 2;

/**
 * Control key-value pairs for a Kitty graphics command.
 *
 * @example
 * ```typescript
 * import type { KittyControlData } from 'blecsd';
 *
 * const ctrl: KittyControlData = {
 *   a: 'T',
 *   f: 100,
 *   i: 1,
 *   q: 2,
 * };
 * ```
 */
export interface KittyControlData {
	/** Action: T=transmit+display, t=transmit, p=place, d=delete, q=query, f=frame, a=animate */
	readonly a?: KittyAction;
	/** Pixel format: 24=RGB, 32=RGBA, 100=PNG */
	readonly f?: KittyFormat;
	/** Transmission method: d=direct, f=file, t=temp, s=shared memory */
	readonly t?: KittyTransmission;
	/** Compression: 'z' for zlib deflate */
	readonly o?: 'z';
	/** More data flag: 0=final chunk, 1=more chunks follow */
	readonly m?: 0 | 1;
	/** Source image width in pixels */
	readonly s?: number;
	/** Source image height in pixels */
	readonly v?: number;
	/** Image ID (1 to 4294967295) */
	readonly i?: number;
	/** Placement ID (1 to 4294967295) */
	readonly p?: number;
	/** Quiet mode: 0=all, 1=suppress OK, 2=suppress all */
	readonly q?: KittyQuiet;
	/** Source rectangle X offset in pixels */
	readonly x?: number;
	/** Source rectangle Y offset in pixels */
	readonly y?: number;
	/** Source rectangle width in pixels */
	readonly w?: number;
	/** Source rectangle height in pixels */
	readonly h?: number;
	/** Cell X offset in pixels */
	readonly X?: number;
	/** Cell Y offset in pixels */
	readonly Y?: number;
	/** Display columns */
	readonly c?: number;
	/** Display rows */
	readonly r?: number;
	/** Z-index for stacking order */
	readonly z?: number;
	/** Cursor movement policy: 0=cursor moves, 1=cursor stays */
	readonly C?: 0 | 1;
	/** Deletion mode */
	readonly d?: KittyDeleteMode;
}

/**
 * Configuration for Kitty image rendering.
 *
 * @example
 * ```typescript
 * import type { KittyImageConfig } from 'blecsd';
 *
 * const config: KittyImageConfig = {
 *   imageId: 1,
 *   quiet: 2,
 *   zIndex: -1,
 * };
 * ```
 */
export interface KittyImageConfig {
	/** Image ID for referencing this image later */
	readonly imageId?: number | undefined;
	/** Placement ID for this specific placement */
	readonly placementId?: number | undefined;
	/** Quiet mode for suppressing responses */
	readonly quiet?: KittyQuiet | undefined;
	/** Z-index for stacking order (negative = below text) */
	readonly zIndex?: number | undefined;
	/** Whether cursor should stay in place after placement */
	readonly holdCursor?: boolean | undefined;
}

/**
 * Configuration for a Kitty animation frame.
 *
 * @example
 * ```typescript
 * import type { KittyFrameConfig } from 'blecsd';
 *
 * const frame: KittyFrameConfig = {
 *   imageId: 1,
 *   frameNumber: 2,
 *   duration: 100,
 * };
 * ```
 */
export interface KittyFrameConfig {
	/** Image ID */
	readonly imageId: number;
	/** Frame number to edit (1-based) */
	readonly frameNumber?: number | undefined;
	/** Background frame number (1-based) */
	readonly backgroundFrame?: number | undefined;
	/** Frame duration in milliseconds */
	readonly duration?: number | undefined;
	/** X offset within the frame canvas */
	readonly x?: number | undefined;
	/** Y offset within the frame canvas */
	readonly y?: number | undefined;
	/** Width of frame data */
	readonly width?: number | undefined;
	/** Height of frame data */
	readonly height?: number | undefined;
}

/**
 * Environment checker for Kitty detection (injectable for testing).
 */
export interface KittyEnvChecker {
	readonly getEnv: (name: string) => string | undefined;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for KittyImageConfig.
 *
 * @example
 * ```typescript
 * import { KittyImageConfigSchema } from 'blecsd';
 *
 * const result = KittyImageConfigSchema.safeParse({ imageId: 1 });
 * ```
 */
export const KittyImageConfigSchema = z.object({
	imageId: z.number().int().positive().max(4294967295).optional(),
	placementId: z.number().int().positive().max(4294967295).optional(),
	quiet: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
	zIndex: z.number().int().optional(),
	holdCursor: z.boolean().optional(),
});

/**
 * Zod schema for KittyFrameConfig.
 *
 * @example
 * ```typescript
 * import { KittyFrameConfigSchema } from 'blecsd';
 *
 * const result = KittyFrameConfigSchema.safeParse({ imageId: 1, duration: 100 });
 * ```
 */
export const KittyFrameConfigSchema = z.object({
	imageId: z.number().int().positive().max(4294967295),
	frameNumber: z.number().int().positive().optional(),
	backgroundFrame: z.number().int().positive().optional(),
	duration: z.number().int().nonnegative().optional(),
	x: z.number().int().nonnegative().optional(),
	y: z.number().int().nonnegative().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
});

// =============================================================================
// BASE64 ENCODING
// =============================================================================

/**
 * Encodes binary data to base64.
 *
 * @param data - Binary data to encode
 * @returns Base64-encoded string
 *
 * @example
 * ```typescript
 * import { kittyEncodeBase64 } from 'blecsd';
 *
 * const encoded = kittyEncodeBase64(new Uint8Array([72, 101, 108, 108, 111]));
 * // 'SGVsbG8='
 * ```
 */
export function kittyEncodeBase64(data: Uint8Array): string {
	return Buffer.from(data).toString('base64');
}

// =============================================================================
// CONTROL DATA SERIALIZATION
// =============================================================================

/**
 * Serializes control data key-value pairs into a comma-separated string.
 *
 * @param ctrl - Control data key-value pairs
 * @returns Serialized control data string
 *
 * @example
 * ```typescript
 * import { serializeControlData } from 'blecsd';
 *
 * const str = serializeControlData({ a: 'T', f: 100, i: 1 });
 * // 'a=T,f=100,i=1'
 * ```
 */
export function serializeControlData(ctrl: KittyControlData): string {
	const parts: string[] = [];

	for (const [key, value] of Object.entries(ctrl)) {
		if (value !== undefined) {
			parts.push(`${key}=${value}`);
		}
	}

	return parts.join(',');
}

// =============================================================================
// SEQUENCE BUILDING
// =============================================================================

/**
 * Builds a single Kitty graphics APC escape sequence.
 *
 * @param ctrl - Control data key-value pairs
 * @param payload - Optional base64-encoded payload
 * @returns Complete APC escape sequence
 *
 * @example
 * ```typescript
 * import { buildKittySequence } from 'blecsd';
 *
 * const seq = buildKittySequence({ a: 'd', d: 'A' });
 * // '\x1b_Ga=d,d=A\x1b\\'
 * ```
 */
export function buildKittySequence(ctrl: KittyControlData, payload?: string): string {
	const controlStr = serializeControlData(ctrl);
	if (payload) {
		return `${APC_PREFIX}${controlStr};${payload}${KITTY_ST}`;
	}
	return `${APC_PREFIX}${controlStr}${KITTY_ST}`;
}

/**
 * Splits base64-encoded data into chunks of at most MAX_CHUNK_SIZE bytes,
 * each chunk (except the last) being a multiple of 4 bytes in length.
 *
 * @param base64Data - Full base64-encoded payload
 * @returns Array of base64 chunks
 *
 * @example
 * ```typescript
 * import { chunkBase64 } from 'blecsd';
 *
 * const chunks = chunkBase64(largeBase64String);
 * // Each chunk is at most 4096 bytes
 * ```
 */
export function chunkBase64(base64Data: string): string[] {
	if (base64Data.length <= MAX_CHUNK_SIZE) {
		return [base64Data];
	}

	const chunks: string[] = [];
	let offset = 0;

	while (offset < base64Data.length) {
		const remaining = base64Data.length - offset;
		if (remaining <= MAX_CHUNK_SIZE) {
			chunks.push(base64Data.slice(offset));
			break;
		}
		// Chunk size must be a multiple of 4 and at most MAX_CHUNK_SIZE
		const chunkSize = MAX_CHUNK_SIZE - (MAX_CHUNK_SIZE % 4);
		chunks.push(base64Data.slice(offset, offset + chunkSize));
		offset += chunkSize;
	}

	return chunks;
}

/**
 * Builds chunked Kitty graphics sequences for transmitting image data.
 * The first chunk carries all control keys; subsequent chunks only carry `m`.
 *
 * @param ctrl - Control data for the first chunk
 * @param base64Data - Full base64-encoded payload
 * @returns Array of APC escape sequences (one per chunk)
 *
 * @example
 * ```typescript
 * import { buildChunkedSequences } from 'blecsd';
 *
 * const sequences = buildChunkedSequences(
 *   { a: 'T', f: 100, i: 1 },
 *   largeBase64String,
 * );
 * // First sequence has all control keys + m=1
 * // Middle sequences have only m=1
 * // Last sequence has m=0
 * ```
 */
export function buildChunkedSequences(ctrl: KittyControlData, base64Data: string): string[] {
	const chunks = chunkBase64(base64Data);

	if (chunks.length === 1) {
		return [buildKittySequence({ ...ctrl, m: 0 }, chunks[0])];
	}

	const sequences: string[] = [];
	for (let idx = 0; idx < chunks.length; idx++) {
		const isLast = idx === chunks.length - 1;
		if (idx === 0) {
			sequences.push(buildKittySequence({ ...ctrl, m: 1 }, chunks[0]));
		} else {
			sequences.push(buildKittySequence({ m: isLast ? 0 : 1 }, chunks[idx]));
		}
	}

	return sequences;
}

// =============================================================================
// FORMAT MAPPING
// =============================================================================

/**
 * Maps an ImageData format string to the corresponding Kitty format code.
 *
 * @param format - Image format ('rgba', 'rgb', or 'png')
 * @returns Kitty format code (32, 24, or 100)
 *
 * @example
 * ```typescript
 * import { imageFormatToKitty } from 'blecsd';
 *
 * imageFormatToKitty('rgba'); // 32
 * imageFormatToKitty('png');  // 100
 * ```
 */
export function imageFormatToKitty(format: 'rgba' | 'rgb' | 'png'): KittyFormat {
	if (format === 'rgb') return 24;
	if (format === 'png') return 100;
	return 32;
}

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

/**
 * Builds a CUP (Cursor Position) escape sequence.
 *
 * @param x - Column position (0-based)
 * @param y - Row position (0-based)
 * @returns ANSI CUP escape sequence (1-based)
 *
 * @example
 * ```typescript
 * import { kittyCursorPosition } from 'blecsd';
 *
 * kittyCursorPosition(10, 5); // '\x1b[6;11H'
 * ```
 */
export function kittyCursorPosition(x: number, y: number): string {
	return `\x1b[${y + 1};${x + 1}H`;
}

// =============================================================================
// TRANSMIT + DISPLAY
// =============================================================================

/**
 * Builds the escape sequences to transmit and display an image.
 *
 * For small images (base64 payload <= 4096 bytes), produces a single sequence.
 * For larger images, produces multiple chunked sequences.
 *
 * @param image - Image data
 * @param options - Render options with position and size
 * @param config - Optional Kitty-specific configuration
 * @returns Complete escape sequence string (cursor positioning + image data)
 *
 * @example
 * ```typescript
 * import { buildTransmitAndDisplay } from 'blecsd';
 *
 * const output = buildTransmitAndDisplay(
 *   { width: 100, height: 50, data: pngBytes, format: 'png' },
 *   { x: 0, y: 0, width: 40, height: 20 },
 * );
 * process.stdout.write(output);
 * ```
 */
export function buildTransmitAndDisplay(
	image: ImageData,
	options: RenderOptions,
	config: KittyImageConfig = {},
): string {
	const base64Data = kittyEncodeBase64(image.data);

	const ctrl: KittyControlData = {
		a: 'T',
		f: imageFormatToKitty(image.format),
		t: 'd',
		q: config.quiet ?? 2,
		...buildSourceDimensions(image),
		...buildDisplayDimensions(options),
		...buildImageIdentifiers(config),
		...buildPlacementOptions(config),
	};

	const pos = kittyCursorPosition(options.x, options.y);
	const sequences = buildChunkedSequences(ctrl, base64Data);
	return pos + sequences.join('');
}

/**
 * Builds source dimension keys (s, v) for raw pixel formats.
 * PNG format extracts dimensions from the header, so s/v are omitted.
 */
function buildSourceDimensions(image: ImageData): Pick<KittyControlData, 's' | 'v'> {
	if (image.format === 'png') return {};
	return { s: image.width, v: image.height };
}

/**
 * Builds display dimension keys (c, r) from render options.
 */
function buildDisplayDimensions(options: RenderOptions): Pick<KittyControlData, 'c' | 'r'> {
	const result: Pick<KittyControlData, 'c' | 'r'> = {};
	if (options.width !== undefined) {
		(result as Record<string, number>).c = options.width;
	}
	if (options.height !== undefined) {
		(result as Record<string, number>).r = options.height;
	}
	return result;
}

/**
 * Builds image/placement ID keys from config.
 */
function buildImageIdentifiers(config: KittyImageConfig): Pick<KittyControlData, 'i' | 'p'> {
	const result: Pick<KittyControlData, 'i' | 'p'> = {};
	if (config.imageId !== undefined) {
		(result as Record<string, number>).i = config.imageId;
	}
	if (config.placementId !== undefined) {
		(result as Record<string, number>).p = config.placementId;
	}
	return result;
}

/**
 * Builds placement option keys (z, C) from config.
 */
function buildPlacementOptions(config: KittyImageConfig): Pick<KittyControlData, 'z' | 'C'> {
	const result: Pick<KittyControlData, 'z' | 'C'> = {};
	if (config.zIndex !== undefined) {
		(result as Record<string, number>).z = config.zIndex;
	}
	if (config.holdCursor) {
		(result as Record<string, number>).C = 1;
	}
	return result;
}

// =============================================================================
// TRANSMIT ONLY
// =============================================================================

/**
 * Builds escape sequences to transmit image data without displaying it.
 * The image is stored in the terminal's memory and can be placed later.
 *
 * @param image - Image data
 * @param imageId - Image ID for later reference
 * @param quiet - Quiet mode (default: 2, suppress all responses)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildTransmitOnly } from 'blecsd';
 *
 * const seq = buildTransmitOnly(pngImage, 42);
 * process.stdout.write(seq);
 * // Later: place with buildPlacement(42, ...)
 * ```
 */
export function buildTransmitOnly(
	image: ImageData,
	imageId: number,
	quiet: KittyQuiet = 2,
): string {
	const base64Data = kittyEncodeBase64(image.data);

	const ctrl: KittyControlData = {
		a: 't',
		f: imageFormatToKitty(image.format),
		t: 'd',
		i: imageId,
		q: quiet,
		...buildSourceDimensions(image),
	};

	return buildChunkedSequences(ctrl, base64Data).join('');
}

// =============================================================================
// PLACEMENT
// =============================================================================

/**
 * Builds an escape sequence to place a previously transmitted image.
 *
 * @param imageId - Image ID of a previously transmitted image
 * @param options - Render options with position and size
 * @param config - Optional placement configuration
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildPlacement } from 'blecsd';
 *
 * const seq = buildPlacement(42, { x: 10, y: 5, width: 20, height: 10 });
 * process.stdout.write(seq);
 * ```
 */
export function buildPlacement(
	imageId: number,
	options: RenderOptions,
	config: KittyImageConfig = {},
): string {
	const ctrl: KittyControlData = {
		a: 'p',
		i: imageId,
		q: config.quiet ?? 2,
		...buildDisplayDimensions(options),
		...buildPlacementOptions(config),
	};

	if (config.placementId !== undefined) {
		(ctrl as Record<string, number>).p = config.placementId;
	}

	const pos = kittyCursorPosition(options.x, options.y);
	return pos + buildKittySequence(ctrl);
}

// =============================================================================
// DELETION
// =============================================================================

/**
 * Builds an escape sequence to delete all image placements and data.
 *
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildDeleteAll } from 'blecsd';
 *
 * process.stdout.write(buildDeleteAll());
 * ```
 */
export function buildDeleteAll(): string {
	return buildKittySequence({ a: 'd', d: 'A' });
}

/**
 * Builds an escape sequence to delete a specific image by ID.
 * When freeData is true, also frees the image data from terminal memory.
 *
 * @param imageId - Image ID to delete
 * @param freeData - Whether to also free image data (default: true)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildDeleteById } from 'blecsd';
 *
 * // Delete placements and free data
 * process.stdout.write(buildDeleteById(42));
 *
 * // Delete placements only, keep data
 * process.stdout.write(buildDeleteById(42, false));
 * ```
 */
export function buildDeleteById(imageId: number, freeData: boolean = true): string {
	return buildKittySequence({ a: 'd', d: freeData ? 'I' : 'i', i: imageId });
}

/**
 * Builds an escape sequence to delete all images at the cursor position.
 *
 * @param freeData - Whether to also free image data (default: true)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildDeleteAtCursor } from 'blecsd';
 *
 * process.stdout.write(buildDeleteAtCursor());
 * ```
 */
export function buildDeleteAtCursor(freeData: boolean = true): string {
	return buildKittySequence({ a: 'd', d: freeData ? 'C' : 'c' });
}

// =============================================================================
// ANIMATION FRAMES
// =============================================================================

/**
 * Builds escape sequences to transmit an animation frame.
 *
 * @param frameData - Pixel data for the frame
 * @param config - Frame configuration
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildAnimationFrame } from 'blecsd';
 *
 * const seq = buildAnimationFrame(
 *   framePixels,
 *   { imageId: 1, frameNumber: 2, duration: 100 },
 * );
 * process.stdout.write(seq);
 * ```
 */
export function buildAnimationFrame(frameData: Uint8Array, config: KittyFrameConfig): string {
	const base64Data = kittyEncodeBase64(frameData);

	const ctrl: KittyControlData = {
		a: 'f',
		i: config.imageId,
		q: 2,
	};

	const extras: Record<string, number> = {};
	if (config.frameNumber !== undefined) extras.r = config.frameNumber;
	if (config.backgroundFrame !== undefined) extras.c = config.backgroundFrame;
	if (config.duration !== undefined) extras.z = config.duration;
	if (config.x !== undefined) extras.x = config.x;
	if (config.y !== undefined) extras.y = config.y;
	if (config.width !== undefined) extras.s = config.width;
	if (config.height !== undefined) extras.v = config.height;

	const merged = { ...ctrl, ...extras } as KittyControlData;
	return buildChunkedSequences(merged, base64Data).join('');
}

/**
 * Builds an escape sequence to control animation playback.
 *
 * @param imageId - Image ID
 * @param action - 'start' to begin looping, 'stop' to halt
 * @param loops - Number of loops (0 = infinite, default: 0)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { buildAnimationControl } from 'blecsd';
 *
 * // Start infinite loop
 * process.stdout.write(buildAnimationControl(1, 'start'));
 *
 * // Stop animation
 * process.stdout.write(buildAnimationControl(1, 'stop'));
 * ```
 */
export function buildAnimationControl(
	imageId: number,
	action: 'start' | 'stop',
	loops: number = 0,
): string {
	if (action === 'stop') {
		return buildKittySequence({ a: 'a', i: imageId, s: 1 } as KittyControlData & { s: number });
	}
	// Start: s=3 (normal play), v=1 (infinite) or v=loops+1
	const v = loops === 0 ? 1 : loops + 1;
	return buildKittySequence({
		a: 'a',
		i: imageId,
		s: 3,
		v,
	} as KittyControlData & { s: number });
}

// =============================================================================
// QUERY
// =============================================================================

/**
 * Builds an escape sequence to query whether the terminal supports the
 * Kitty graphics protocol. A supporting terminal responds with OK.
 *
 * @returns Query escape sequence
 *
 * @example
 * ```typescript
 * import { buildQuery } from 'blecsd';
 *
 * process.stdout.write(buildQuery());
 * // Supporting terminal responds: '\x1b_Gi=31;OK\x1b\\'
 * ```
 */
export function buildQuery(): string {
	return buildKittySequence({ i: 31, s: 1, v: 1, a: 'q', t: 'd', f: 24 }, 'AAAA');
}

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Default environment checker using process.env.
 */
const defaultEnvChecker: KittyEnvChecker = {
	getEnv: (name: string) => process.env[name],
};

/**
 * Checks if the current terminal supports the Kitty graphics protocol.
 *
 * Detects Kitty by checking the TERM and TERM_PROGRAM environment variables.
 *
 * @param env - Environment checker (defaults to process.env)
 * @returns true if Kitty graphics are likely supported
 *
 * @example
 * ```typescript
 * import { isKittySupported } from 'blecsd';
 *
 * if (isKittySupported()) {
 *   // Use Kitty graphics protocol
 * }
 * ```
 */
export function isKittySupported(env: KittyEnvChecker = defaultEnvChecker): boolean {
	const term = env.getEnv('TERM') ?? '';
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';

	// Kitty sets TERM=xterm-kitty
	if (term === 'xterm-kitty') return true;
	// Also check TERM_PROGRAM
	if (termProgram === 'kitty') return true;

	return false;
}

// =============================================================================
// RENDER HELPER
// =============================================================================

/**
 * Renders image data using the Kitty graphics protocol with positioning.
 *
 * @param image - Image data
 * @param options - Render options with position and size
 * @returns Complete escape sequence string
 *
 * @example
 * ```typescript
 * import { renderKittyImage } from 'blecsd';
 *
 * const output = renderKittyImage(
 *   { width: 100, height: 50, data: pngBytes, format: 'png' },
 *   { x: 0, y: 0, width: 40, height: 20 },
 * );
 * process.stdout.write(output);
 * ```
 */
export function renderKittyImage(image: ImageData, options: RenderOptions): string {
	return buildTransmitAndDisplay(image, options, {
		imageId: options.id,
		quiet: 2,
	});
}

/**
 * Generates a clear sequence for Kitty images.
 *
 * @param id - Optional image ID to clear; clears all if omitted
 * @returns Escape sequence to delete the image(s)
 *
 * @example
 * ```typescript
 * import { clearKittyImage } from 'blecsd';
 *
 * // Clear specific image
 * process.stdout.write(clearKittyImage(42));
 *
 * // Clear all images
 * process.stdout.write(clearKittyImage());
 * ```
 */
export function clearKittyImage(id?: number): string {
	if (id !== undefined) {
		return buildDeleteById(id);
	}
	return buildDeleteAll();
}

// =============================================================================
// BACKEND FACTORY
// =============================================================================

/**
 * Creates a Kitty graphics backend.
 *
 * @param envChecker - Optional environment checker for testing
 * @returns A GraphicsBackend for Kitty graphics protocol
 *
 * @example
 * ```typescript
 * import { createKittyBackend, createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, createKittyBackend());
 * ```
 */
export function createKittyBackend(envChecker?: KittyEnvChecker): GraphicsBackend {
	const capabilities: GraphicsCapabilities = {
		staticImages: true,
		animation: true,
		alphaChannel: true,
		maxWidth: null,
		maxHeight: null,
	};

	return {
		name: KITTY_BACKEND_NAME,
		capabilities,
		render: renderKittyImage,
		clear: clearKittyImage,
		isSupported: () => isKittySupported(envChecker),
	};
}
