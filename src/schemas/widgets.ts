/**
 * Zod validation schemas for widget configurations.
 *
 * Enhances existing widget schemas with proper bounds validation
 * for colors, dimensions, intervals, and paths.
 *
 * @module schemas/widgets
 */

import { z } from 'zod';

// =============================================================================
// COLOR VALIDATION
// =============================================================================

/**
 * Schema for packed RGBA color values (0x00000000 - 0xFFFFFFFF).
 */
export const PackedColorSchema = z.number().int().min(0).max(0xffffffff);

/**
 * Schema for color values that accept hex strings or packed numbers.
 */
export const WidgetColorSchema = z.union([
	z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color format'),
	PackedColorSchema,
]);

// =============================================================================
// DIMENSION VALIDATION
// =============================================================================

/**
 * Schema for positive widget dimensions (width/height in cells).
 */
export const WidgetDimensionSchema = z.union([
	z.number().int().positive(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Schema for widget position values.
 */
export const WidgetPositionSchema = z.union([
	z.number().int(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

// =============================================================================
// INTERVAL VALIDATION
// =============================================================================

/**
 * Schema for animation/spinner interval in milliseconds.
 * Min 10ms (avoid excessive CPU), max 60000ms (1 minute).
 */
export const IntervalSchema = z.number().int().min(10).max(60000);

/**
 * Schema for speed multiplier (0.1x to 10x).
 */
export const SpeedMultiplierSchema = z.number().min(0.1).max(10);

// =============================================================================
// PATH VALIDATION
// =============================================================================

/**
 * Schema for file/directory paths.
 * Rejects empty strings and null byte injection.
 */
export const FilePathSchema = z
	.string()
	.min(1)
	.refine((val) => !val.includes('\x00'), {
		message: 'Path must not contain null bytes',
	});

// =============================================================================
// COMMON WIDGET CONFIG PATTERNS
// =============================================================================

/**
 * Schema for text alignment.
 */
export const TextAlignSchema = z.enum(['left', 'center', 'right']);

/**
 * Schema for vertical alignment.
 */
export const VAlignSchema = z.enum(['top', 'middle', 'bottom']);

/**
 * Schema for border configuration in widgets.
 */
export const WidgetBorderSchema = z
	.union([
		z.boolean(),
		z.object({
			type: z.enum(['line', 'bg', 'none']).optional(),
			fg: WidgetColorSchema.optional(),
			bg: WidgetColorSchema.optional(),
		}),
	])
	.optional();

/**
 * Schema for widget padding configuration.
 */
export const WidgetPaddingSchema = z
	.union([
		z.number().int().min(0).max(255),
		z.object({
			left: z.number().int().min(0).max(255).optional(),
			top: z.number().int().min(0).max(255).optional(),
			right: z.number().int().min(0).max(255).optional(),
			bottom: z.number().int().min(0).max(255).optional(),
		}),
	])
	.optional();

/**
 * Schema for opacity value (0-1).
 */
export const OpacitySchema = z.number().min(0).max(1);

/**
 * Schema for tree widget path format.
 */
export const TreePathSchema = z
	.string()
	.min(1)
	.refine((val) => !val.includes('\x00'), {
		message: 'Tree path must not contain null bytes',
	});
