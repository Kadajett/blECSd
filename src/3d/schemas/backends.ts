/**
 * Zod schemas for 3D renderer backend configuration.
 *
 * @module 3d/schemas/backends
 */

import { z } from 'zod';

/**
 * Supported backend rendering types.
 *
 * @example
 * ```typescript
 * const type = BackendTypeSchema.parse('braille'); // Valid
 * BackendTypeSchema.parse('invalid'); // Throws
 * ```
 */
export const BackendTypeSchema = z.enum(['braille', 'halfblock', 'sextant', 'sixel', 'kitty']);
export type BackendType = z.infer<typeof BackendTypeSchema>;

/**
 * Capabilities descriptor for a rendering backend.
 *
 * @example
 * ```typescript
 * const caps = BackendCapabilitiesSchema.parse({
 *   maxColors: 2,
 *   supportsAlpha: false,
 *   pixelsPerCellX: 2,
 *   pixelsPerCellY: 4,
 *   supportsAnimation: false,
 *   requiresEscapeSequences: false,
 * });
 * ```
 */
export const BackendCapabilitiesSchema = z.object({
	maxColors: z.number().int().positive().describe('Max simultaneous colors'),
	supportsAlpha: z.boolean().describe('Whether backend supports alpha transparency'),
	pixelsPerCellX: z.number().int().positive().describe('Horizontal pixel resolution per terminal cell'),
	pixelsPerCellY: z.number().int().positive().describe('Vertical pixel resolution per terminal cell'),
	supportsAnimation: z.boolean().describe('Whether backend supports efficient frame updates'),
	requiresEscapeSequences: z.boolean().describe('True if output is raw escape sequences vs cell-based'),
});
export type BackendCapabilities = z.infer<typeof BackendCapabilitiesSchema>;

/**
 * A single encoded terminal cell for cell-based backends.
 *
 * @example
 * ```typescript
 * const cell = EncodedCellSchema.parse({ x: 0, y: 0, char: '⠿', fg: 0xffffff, bg: 0x000000 });
 * ```
 */
export const EncodedCellSchema = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	char: z.string().min(1).max(4),
	fg: z.number().int().nonnegative(),
	bg: z.number().int().nonnegative(),
});
export type EncodedCell = z.infer<typeof EncodedCellSchema>;

/**
 * Output from a renderer backend encode pass.
 *
 * Cell-based backends (braille, halfblock, sextant) produce `cells`.
 * Escape-based backends (sixel, kitty) produce `escape` strings.
 * At least one of `cells` or `escape` must be present.
 *
 * @example
 * ```typescript
 * // Cell-based output
 * const cellOutput: EncodedOutput = { cells: [{ x: 0, y: 0, char: '⠿', fg: 0xffffff, bg: 0 }] };
 *
 * // Escape-based output
 * const escapeOutput: EncodedOutput = { escape: '\x1bPq...', cursorX: 0, cursorY: 0 };
 * ```
 */
export const EncodedOutputSchema = z.object({
	cells: z.array(EncodedCellSchema).optional(),
	escape: z.string().optional(),
	cursorX: z.number().int().nonnegative().optional(),
	cursorY: z.number().int().nonnegative().optional(),
}).refine(data => data.cells !== undefined || data.escape !== undefined, {
	message: 'EncodedOutput must have either cells or escape',
});
export type EncodedOutput = z.infer<typeof EncodedOutputSchema>;

/**
 * Backend selection: a specific type or 'auto' for capability-based detection.
 *
 * @example
 * ```typescript
 * const sel = BackendSelectionSchema.parse('auto'); // Valid
 * const sel2 = BackendSelectionSchema.parse('sixel'); // Valid
 * ```
 */
export const BackendSelectionSchema = z.union([
	BackendTypeSchema,
	z.literal('auto'),
]);
export type BackendSelection = z.infer<typeof BackendSelectionSchema>;

/**
 * Configuration for the braille rendering backend.
 *
 * @example
 * ```typescript
 * const config = BrailleConfigSchema.parse({ threshold: 64, colorMode: 'dominant' });
 * ```
 */
export const BrailleConfigSchema = z.object({
	threshold: z.number().int().min(0).max(255).default(128)
		.describe('Alpha threshold: pixels with alpha >= threshold are lit'),
	colorMode: z.enum(['average', 'dominant', 'brightness']).default('average')
		.describe('How to pick fg color from the lit pixels in a 2x4 block'),
	backgroundColor: z.number().int().nonnegative().default(0x000000)
		.describe('Background color as 24-bit RGB'),
});
export type BrailleConfig = z.input<typeof BrailleConfigSchema>;

/**
 * Configuration for the half-block rendering backend.
 *
 * @example
 * ```typescript
 * const config = HalfBlockConfigSchema.parse({});
 * ```
 */
export const HalfBlockConfigSchema = z.object({
	backgroundColor: z.number().int().nonnegative().default(0x000000)
		.describe('Background color as 24-bit RGB'),
});
export type HalfBlockConfig = z.input<typeof HalfBlockConfigSchema>;

/**
 * Configuration for the sextant rendering backend.
 *
 * @example
 * ```typescript
 * const config = SextantConfigSchema.parse({ threshold: 100 });
 * ```
 */
export const SextantConfigSchema = z.object({
	threshold: z.number().int().min(0).max(255).default(128)
		.describe('Alpha threshold: pixels with alpha >= threshold are lit'),
	backgroundColor: z.number().int().nonnegative().default(0x000000)
		.describe('Background color as 24-bit RGB'),
});
export type SextantConfig = z.input<typeof SextantConfigSchema>;

/**
 * Configuration for the sixel rendering backend.
 *
 * @example
 * ```typescript
 * const config = SixelConfigSchema.parse({ maxColors: 64 });
 * ```
 */
export const SixelConfigSchema = z.object({
	maxColors: z.number().int().min(2).max(256).default(256)
		.describe('Maximum palette colors'),
	rleEnabled: z.boolean().default(true)
		.describe('Enable run-length encoding for repeated columns'),
});
export type SixelConfig = z.input<typeof SixelConfigSchema>;

/**
 * Configuration for the Kitty Graphics Protocol rendering backend.
 *
 * @example
 * ```typescript
 * const config = KittyConfigSchema.parse({ imageId: 42 });
 * ```
 */
export const KittyConfigSchema = z.object({
	imageId: z.number().int().positive().default(1)
		.describe('Unique image ID for reuse'),
	chunkSize: z.number().int().positive().default(4096)
		.describe('Max base64 bytes per chunk'),
});
export type KittyConfig = z.input<typeof KittyConfigSchema>;

/**
 * Backend selection preferences for auto-detection.
 *
 * @example
 * ```typescript
 * const pref = BackendPreferenceSchema.parse({ preferred: 'auto', fallback: 'braille' });
 * ```
 */
export const BackendPreferenceSchema = z.object({
	preferred: BackendSelectionSchema.default('auto'),
	fallback: BackendTypeSchema.default('braille'),
	forceBackend: z.boolean().default(false)
		.describe('Skip detection, use preferred directly'),
});
export type BackendPreference = z.input<typeof BackendPreferenceSchema>;
