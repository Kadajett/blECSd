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
 *
 * @example
 * ```typescript
 * import { PackedColorSchema } from 'blecsd';
 *
 * const color = PackedColorSchema.parse(0xff0000ff); // red, full opacity
 * ```
 */
export const PackedColorSchema = z.number().int().min(0).max(0xffffffff);

/**
 * Schema for color values — hex strings (#rgb, #rrggbb, #rrggbbaa) or packed numbers.
 *
 * @example
 * ```typescript
 * import { WidgetColorSchema } from 'blecsd';
 *
 * WidgetColorSchema.parse('#ff0000'); // hex string
 * WidgetColorSchema.parse(0xff0000ff); // packed RGBA
 * ```
 */
export const WidgetColorSchema = z.union([
	z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color format'),
	PackedColorSchema,
]);

// =============================================================================
// DIMENSION VALIDATION
// =============================================================================

/**
 * Schema for positive widget dimensions — number (cells), percentage, or 'auto'.
 *
 * @example
 * ```typescript
 * import { WidgetDimensionSchema } from 'blecsd';
 *
 * WidgetDimensionSchema.parse(80); // 80 cells
 * WidgetDimensionSchema.parse('50%'); // 50% of parent
 * WidgetDimensionSchema.parse('auto'); // auto-size
 * ```
 */
export const WidgetDimensionSchema = z.union([
	z.number().int().positive(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Schema for widget position values — number, percentage, or keyword.
 *
 * @example
 * ```typescript
 * import { WidgetPositionSchema } from 'blecsd';
 *
 * WidgetPositionSchema.parse(10); // absolute position
 * WidgetPositionSchema.parse('center'); // centered
 * ```
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
 * Schema for animation/spinner interval in milliseconds (10-60000).
 *
 * @example
 * ```typescript
 * import { IntervalSchema } from 'blecsd';
 *
 * const interval = IntervalSchema.parse(200); // 200ms
 * ```
 */
export const IntervalSchema = z.number().int().min(10).max(60000);

/**
 * Schema for speed multiplier (0.1x to 10x).
 *
 * @example
 * ```typescript
 * import { SpeedMultiplierSchema } from 'blecsd';
 *
 * const speed = SpeedMultiplierSchema.parse(2.0); // 2x speed
 * ```
 */
export const SpeedMultiplierSchema = z.number().min(0.1).max(10);

// =============================================================================
// PATH VALIDATION
// =============================================================================

/**
 * Schema for file/directory paths. Rejects empty strings and null byte injection.
 *
 * @example
 * ```typescript
 * import { FilePathSchema } from 'blecsd';
 *
 * const path = FilePathSchema.parse('/usr/local/bin/app');
 * ```
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
 * Schema for text alignment ('left' | 'center' | 'right').
 *
 * @example
 * ```typescript
 * import { TextAlignSchema } from 'blecsd';
 *
 * const align = TextAlignSchema.parse('center');
 * ```
 */
export const TextAlignSchema = z.enum(['left', 'center', 'right']);

/**
 * Schema for vertical alignment ('top' | 'middle' | 'bottom').
 *
 * @example
 * ```typescript
 * import { VAlignSchema } from 'blecsd';
 *
 * const valign = VAlignSchema.parse('middle');
 * ```
 */
export const VAlignSchema = z.enum(['top', 'middle', 'bottom']);

/**
 * Schema for border configuration — boolean toggle or detailed object.
 *
 * @example
 * ```typescript
 * import { WidgetBorderSchema } from 'blecsd';
 *
 * WidgetBorderSchema.parse(true); // simple toggle
 * WidgetBorderSchema.parse({ type: 'line', fg: '#ff0000' }); // detailed
 * ```
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
 * Schema for widget padding — uniform number or per-side object.
 *
 * @example
 * ```typescript
 * import { WidgetPaddingSchema } from 'blecsd';
 *
 * WidgetPaddingSchema.parse(2); // uniform padding
 * WidgetPaddingSchema.parse({ left: 1, right: 1 }); // per-side
 * ```
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
 * Schema for opacity value (0 = transparent, 1 = opaque).
 *
 * @example
 * ```typescript
 * import { OpacitySchema } from 'blecsd';
 *
 * const opacity = OpacitySchema.parse(0.5);
 * ```
 */
export const OpacitySchema = z.number().min(0).max(1);

/**
 * Schema for tree widget path format. Rejects empty strings and null bytes.
 *
 * @example
 * ```typescript
 * import { TreePathSchema } from 'blecsd';
 *
 * const path = TreePathSchema.parse('/root/child/leaf');
 * ```
 */
export const TreePathSchema = z
	.string()
	.min(1)
	.refine((val) => !val.includes('\x00'), {
		message: 'Tree path must not contain null bytes',
	});
