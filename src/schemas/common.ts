/**
 * Common Zod schemas used across the library
 * @module schemas/common
 */

import { z } from 'zod';

/**
 * Positive integer (1, 2, 3, ...)
 */
export const PositiveIntSchema = z.number().int().positive();
export type PositiveInt = z.infer<typeof PositiveIntSchema>;

/**
 * Non-negative integer (0, 1, 2, 3, ...)
 */
export const NonNegativeIntSchema = z.number().int().nonnegative();
export type NonNegativeInt = z.infer<typeof NonNegativeIntSchema>;

/**
 * Percentage value (0-100)
 */
export const PercentageSchema = z.number().min(0).max(100);
export type Percentage = z.infer<typeof PercentageSchema>;

/**
 * Color string - hex (#fff, #ffffff, #ffffffff), rgb(), hsl(), or named
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
 * Dimension - number (absolute) or percentage string ("50%")
 */
export const DimensionSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
]);
export type Dimension = z.infer<typeof DimensionSchema>;

/**
 * Position value - number, percentage string, or keyword
 */
export const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);
export type PositionValue = z.infer<typeof PositionValueSchema>;
