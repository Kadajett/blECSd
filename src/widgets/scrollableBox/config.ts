/**
 * ScrollableBox Widget Configuration
 *
 * Zod schemas for runtime validation of scrollable box configuration.
 *
 * @module widgets/scrollableBox/config
 */

import { z } from 'zod';
import type { BorderCharset } from '../../components/border';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z
	.object({
		type: z.enum(['line', 'bg', 'none']).optional(),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		ch: z
			.union([
				z.enum(['single', 'double', 'rounded', 'bold', 'ascii']),
				z.custom<BorderCharset>((val) => {
					return (
						typeof val === 'object' &&
						val !== null &&
						'topLeft' in val &&
						'topRight' in val &&
						'bottomLeft' in val &&
						'bottomRight' in val &&
						'horizontal' in val &&
						'vertical' in val
					);
				}),
			])
			.optional(),
	})
	.optional();

/**
 * Zod schema for padding configuration.
 */
const PaddingConfigSchema = z
	.union([
		z.number().int().nonnegative(),
		z.object({
			left: z.number().int().nonnegative().optional(),
			top: z.number().int().nonnegative().optional(),
			right: z.number().int().nonnegative().optional(),
			bottom: z.number().int().nonnegative().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for scrollbar configuration.
 */
const ScrollbarConfigSchema = z
	.union([
		z.boolean(),
		z.object({
			mode: z.enum(['auto', 'visible', 'hidden']).optional(),
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
			trackChar: z.string().optional(),
			thumbChar: z.string().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for scrollable box widget configuration.
 */
export const ScrollableBoxConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	right: PositionValueSchema.optional(),
	bottom: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: BorderConfigSchema,
	padding: PaddingConfigSchema,

	// Content
	content: z.string().optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
	valign: z.enum(['top', 'middle', 'bottom']).optional(),

	// Scrolling
	scrollbar: ScrollbarConfigSchema,
	alwaysScroll: z.boolean().optional(),
	mouse: z.boolean().optional(),
	keys: z.boolean().optional(),
	scrollWidth: z.number().nonnegative().optional(),
	scrollHeight: z.number().nonnegative().optional(),
	scrollX: z.number().optional(),
	scrollY: z.number().optional(),
});
