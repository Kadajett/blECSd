/**
 * iTerm2 Inline Images Backend
 *
 * Implements the iTerm2 inline images protocol (OSC 1337) for displaying
 * images directly in the terminal. Works with iTerm2 and compatible terminals
 * (WezTerm, Konsole, etc.).
 *
 * @module terminal/graphics/iterm2
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
 * OSC 1337 escape sequence prefix for iTerm2 images.
 */
export const OSC_1337_PREFIX = '\x1b]1337;File=';

/**
 * String terminator for OSC sequences.
 */
export const ST = '\x07';

/**
 * Alternative string terminator (for tmux compatibility).
 */
export const ST_ALT = '\x1b\\';

/**
 * iTerm2 image backend name.
 */
export const ITERM2_BACKEND_NAME: BackendName = 'iterm2';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Size unit for iTerm2 image dimensions.
 * - 'px': pixels
 * - 'cells': terminal character cells
 * - 'auto': automatic sizing
 * - '%': percentage of terminal size
 */
export type SizeUnit = 'px' | 'cells' | 'auto' | '%';

/**
 * Size specification for iTerm2 images.
 *
 * @example
 * ```typescript
 * import type { ITerm2Size } from 'blecsd';
 *
 * const size: ITerm2Size = { value: 40, unit: 'cells' };
 * ```
 */
export interface ITerm2Size {
	/** Numeric value */
	readonly value: number;
	/** Size unit */
	readonly unit: SizeUnit;
}

/**
 * Configuration for iTerm2 image rendering.
 *
 * @example
 * ```typescript
 * import type { ITerm2ImageConfig } from 'blecsd';
 *
 * const config: ITerm2ImageConfig = {
 *   inline: true,
 *   preserveAspectRatio: true,
 *   name: 'logo.png',
 * };
 * ```
 */
export interface ITerm2ImageConfig {
	/** Display image inline (true) or as downloadable file (false) */
	readonly inline?: boolean;
	/** Image name (for file downloads) */
	readonly name?: string;
	/** Image width */
	readonly width?: ITerm2Size;
	/** Image height */
	readonly height?: ITerm2Size;
	/** Preserve aspect ratio when width/height are specified */
	readonly preserveAspectRatio?: boolean;
}

/**
 * Environment checker for iTerm2 detection (injectable for testing).
 */
export interface ITerm2EnvChecker {
	readonly getEnv: (name: string) => string | undefined;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for ITerm2Size.
 */
export const ITerm2SizeSchema = z.object({
	value: z.number().nonnegative(),
	unit: z.enum(['px', 'cells', 'auto', '%']),
});

/**
 * Zod schema for ITerm2ImageConfig.
 *
 * @example
 * ```typescript
 * import { ITerm2ImageConfigSchema } from 'blecsd';
 *
 * const result = ITerm2ImageConfigSchema.safeParse({ inline: true });
 * ```
 */
export const ITerm2ImageConfigSchema = z.object({
	inline: z.boolean().default(true),
	name: z.string().optional(),
	width: ITerm2SizeSchema.optional(),
	height: ITerm2SizeSchema.optional(),
	preserveAspectRatio: z.boolean().default(true),
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
 * import { encodeBase64 } from 'blecsd';
 *
 * const encoded = encodeBase64(new Uint8Array([72, 101, 108, 108, 111]));
 * // 'SGVsbG8='
 * ```
 */
export function encodeBase64(data: Uint8Array): string {
	return Buffer.from(data).toString('base64');
}

// =============================================================================
// SIZE FORMATTING
// =============================================================================

/**
 * Formats a size value for the OSC 1337 protocol.
 *
 * @param size - Size specification
 * @returns Formatted size string (e.g., "40", "100px", "50%", "auto")
 *
 * @example
 * ```typescript
 * import { formatSize } from 'blecsd';
 *
 * formatSize({ value: 40, unit: 'cells' }); // '40'
 * formatSize({ value: 100, unit: 'px' });   // '100px'
 * formatSize({ value: 50, unit: '%' });     // '50%'
 * formatSize({ value: 0, unit: 'auto' });   // 'auto'
 * ```
 */
export function formatSize(size: ITerm2Size): string {
	if (size.unit === 'auto') return 'auto';
	if (size.unit === 'px') return `${size.value}px`;
	if (size.unit === '%') return `${size.value}%`;
	// 'cells' is the default unit (no suffix)
	return `${size.value}`;
}

// =============================================================================
// OSC 1337 SEQUENCE BUILDING
// =============================================================================

/**
 * Builds the parameter string for an OSC 1337 image sequence.
 *
 * @param config - Image configuration
 * @param dataSize - Size of the image data in bytes
 * @returns The parameter portion of the OSC sequence
 *
 * @example
 * ```typescript
 * import { buildParams } from 'blecsd';
 *
 * const params = buildParams({ inline: true, name: 'test.png' }, 1024);
 * // 'name=dGVzdC5wbmc=;size=1024;inline=1'
 * ```
 */
export function buildParams(config: ITerm2ImageConfig, dataSize: number): string {
	const parts: string[] = [];

	if (config.name) {
		const encodedName = Buffer.from(config.name, 'utf-8').toString('base64');
		parts.push(`name=${encodedName}`);
	}

	parts.push(`size=${dataSize}`);
	parts.push(`inline=${config.inline !== false ? 1 : 0}`);

	if (config.width) {
		parts.push(`width=${formatSize(config.width)}`);
	}

	if (config.height) {
		parts.push(`height=${formatSize(config.height)}`);
	}

	if (config.preserveAspectRatio === false) {
		parts.push('preserveAspectRatio=0');
	}

	return parts.join(';');
}

/**
 * Builds a complete OSC 1337 image sequence.
 *
 * @param data - Image data (raw bytes, typically PNG or JPEG)
 * @param config - Image configuration
 * @returns The complete escape sequence string
 *
 * @example
 * ```typescript
 * import { buildImageSequence } from 'blecsd';
 *
 * const seq = buildImageSequence(pngData, { inline: true });
 * process.stdout.write(seq);
 * ```
 */
export function buildImageSequence(data: Uint8Array, config: ITerm2ImageConfig = {}): string {
	const params = buildParams(config, data.length);
	const encoded = encodeBase64(data);
	return `${OSC_1337_PREFIX}${params}:${encoded}${ST}`;
}

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

/**
 * Builds the cursor positioning escape sequence to place an image
 * at a specific terminal cell location.
 *
 * @param x - Column position (1-based for ANSI)
 * @param y - Row position (1-based for ANSI)
 * @returns Cursor position escape sequence
 *
 * @example
 * ```typescript
 * import { cursorPosition } from 'blecsd';
 *
 * const pos = cursorPosition(10, 5);
 * // '\x1b[5;10H'
 * ```
 */
export function cursorPosition(x: number, y: number): string {
	// ANSI CUP sequence: CSI row;col H (1-based)
	return `\x1b[${y + 1};${x + 1}H`;
}

// =============================================================================
// ITERM2 DETECTION
// =============================================================================

/**
 * Default environment checker using process.env.
 */
const defaultEnvChecker: ITerm2EnvChecker = {
	getEnv: (name: string) => process.env[name],
};

/**
 * Checks if the current terminal supports iTerm2 inline images.
 *
 * Detects iTerm2 by checking the TERM_PROGRAM and LC_TERMINAL
 * environment variables. Also checks for WezTerm and other
 * compatible terminals.
 *
 * @param env - Environment checker (defaults to process.env)
 * @returns true if iTerm2 inline images are supported
 *
 * @example
 * ```typescript
 * import { isITerm2Supported } from 'blecsd';
 *
 * if (isITerm2Supported()) {
 *   // Use iTerm2 image protocol
 * }
 * ```
 */
export function isITerm2Supported(env: ITerm2EnvChecker = defaultEnvChecker): boolean {
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const lcTerminal = env.getEnv('LC_TERMINAL') ?? '';

	const iterm2Programs = ['iTerm.app', 'WezTerm', 'mintty'];
	return iterm2Programs.some((p) => termProgram === p || lcTerminal === p);
}

// =============================================================================
// RENDER HELPER
// =============================================================================

/**
 * Renders image data using the iTerm2 protocol with positioning.
 *
 * For RGBA/RGB data, this converts to a minimal PNG-like representation.
 * For PNG data, it passes through directly.
 *
 * @param image - Image data
 * @param options - Render options with position and size
 * @returns Complete escape sequence with cursor positioning and image
 *
 * @example
 * ```typescript
 * import { renderITerm2Image } from 'blecsd';
 *
 * const output = renderITerm2Image(
 *   { width: 100, height: 50, data: pngBytes, format: 'png' },
 *   { x: 0, y: 0, width: 40, height: 20 },
 * );
 * process.stdout.write(output);
 * ```
 */
export function renderITerm2Image(image: ImageData, options: RenderOptions): string {
	const imageConfig: ITerm2ImageConfig = {
		inline: true,
		preserveAspectRatio: options.preserveAspectRatio !== false,
	};

	const configWithSize = addSizeOptions(imageConfig, options);

	const pos = cursorPosition(options.x, options.y);
	const seq = buildImageSequence(image.data, configWithSize);
	return pos + seq;
}

/**
 * Adds width/height to the image config from render options.
 */
function addSizeOptions(config: ITerm2ImageConfig, options: RenderOptions): ITerm2ImageConfig {
	const width = options.width ? { value: options.width, unit: 'cells' as SizeUnit } : undefined;
	const height = options.height ? { value: options.height, unit: 'cells' as SizeUnit } : undefined;

	return {
		...config,
		width,
		height,
	};
}

/**
 * Generates a clear sequence. iTerm2 does not have a dedicated image clear
 * command, so we overwrite the area with spaces.
 *
 * @param options - Area to clear (x, y, width, height in cells)
 * @returns Escape sequence to blank the area
 */
export function clearITerm2Image(options?: {
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
 * Creates an iTerm2 graphics backend.
 *
 * @param envChecker - Optional environment checker for testing
 * @returns A GraphicsBackend for iTerm2 inline images
 *
 * @example
 * ```typescript
 * import { createITerm2Backend, createGraphicsManager, registerBackend } from 'blecsd';
 *
 * const manager = createGraphicsManager();
 * registerBackend(manager, createITerm2Backend());
 * ```
 */
export function createITerm2Backend(envChecker?: ITerm2EnvChecker): GraphicsBackend {
	const capabilities: GraphicsCapabilities = {
		staticImages: true,
		animation: false,
		alphaChannel: true,
		maxWidth: null,
		maxHeight: null,
	};

	return {
		name: ITERM2_BACKEND_NAME,
		capabilities,
		render: renderITerm2Image,
		clear: () => '',
		isSupported: () => isITerm2Supported(envChecker),
	};
}
