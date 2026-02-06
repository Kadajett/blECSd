/**
 * Common Zod schemas used across the library
 * @module schemas/common
 */

import { z } from 'zod';

/**
 * Schema for positive integers (1, 2, 3, ...).
 *
 * @example
 * ```typescript
 * import { PositiveIntSchema } from 'blecsd';
 *
 * const count = PositiveIntSchema.parse(5); // OK
 * PositiveIntSchema.parse(0); // throws
 * ```
 */
export const PositiveIntSchema = z.number().int().positive();
export type PositiveInt = z.infer<typeof PositiveIntSchema>;

/**
 * Schema for non-negative integers (0, 1, 2, 3, ...).
 *
 * @example
 * ```typescript
 * import { NonNegativeIntSchema } from 'blecsd';
 *
 * const index = NonNegativeIntSchema.parse(0); // OK
 * NonNegativeIntSchema.parse(-1); // throws
 * ```
 */
export const NonNegativeIntSchema = z.number().int().nonnegative();
export type NonNegativeInt = z.infer<typeof NonNegativeIntSchema>;

/**
 * Schema for percentage values (0-100).
 *
 * @example
 * ```typescript
 * import { PercentageSchema } from 'blecsd';
 *
 * const pct = PercentageSchema.parse(75); // OK
 * PercentageSchema.parse(101); // throws
 * ```
 */
export const PercentageSchema = z.number().min(0).max(100);
export type Percentage = z.infer<typeof PercentageSchema>;

/**
 * Schema for color strings — hex (#fff, #ffffff, #ffffffff), rgb(), hsl(), or named colors.
 *
 * @example
 * ```typescript
 * import { ColorStringSchema } from 'blecsd';
 *
 * ColorStringSchema.parse('#ff0000'); // OK
 * ColorStringSchema.parse('rgb(255, 0, 0)'); // OK
 * ColorStringSchema.parse('red'); // OK
 * ```
 */
export const ColorStringSchema = z.string().refine(
	(val) => {
		// Hex colors
		if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return true;
		// RGB/RGBA
		if (/^rgba?\(/.test(val)) return true;
		// HSL/HSLA
		if (/^hsla?\(/.test(val)) return true;
		// Named colors (basic check - starts with letter)
		if (/^[a-zA-Z]+$/.test(val)) return true;
		return false;
	},
	{ message: 'Invalid color format' },
);
export type ColorString = z.infer<typeof ColorStringSchema>;

/**
 * Schema for dimensions — number (absolute cells) or percentage string ("50%").
 *
 * @example
 * ```typescript
 * import { DimensionSchema } from 'blecsd';
 *
 * DimensionSchema.parse(80); // OK
 * DimensionSchema.parse('50%'); // OK
 * ```
 */
export const DimensionSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
]);
export type Dimension = z.infer<typeof DimensionSchema>;

/**
 * Schema for position values — number, percentage string, or keyword.
 *
 * @example
 * ```typescript
 * import { PositionValueSchema } from 'blecsd';
 *
 * PositionValueSchema.parse(10); // OK
 * PositionValueSchema.parse('50%'); // OK
 * PositionValueSchema.parse('center'); // OK
 * ```
 */
export const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);
export type PositionValue = z.infer<typeof PositionValueSchema>;
