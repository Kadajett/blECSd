/**
 * Zod validation schemas for component setter functions.
 * @module schemas/components
 */

import { z } from 'zod';

/**
 * Schema for setPosition parameters.
 */
export const SetPositionSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	z: z.number().int().min(0).max(65535).optional(),
});

/**
 * Schema for setZIndex parameter.
 */
export const ZIndexSchema = z.number().int().min(0).max(65535);

/**
 * Schema for dimension values (number, percentage string, or 'auto').
 */
export const DimensionValueSchema = z.union([
	z.number().finite(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Schema for setDimensions parameters.
 */
export const SetDimensionsSchema = z.object({
	width: DimensionValueSchema,
	height: DimensionValueSchema,
});

/**
 * Schema for dimension constraints.
 */
export const DimensionConstraintsSchema = z
	.object({
		minWidth: z.number().finite().nonnegative().optional(),
		minHeight: z.number().finite().nonnegative().optional(),
		maxWidth: z.number().finite().positive().optional(),
		maxHeight: z.number().finite().positive().optional(),
	})
	.refine(
		(data) => {
			if (data.minWidth !== undefined && data.maxWidth !== undefined) {
				return data.minWidth <= data.maxWidth;
			}
			return true;
		},
		{ message: 'minWidth must be <= maxWidth' },
	)
	.refine(
		(data) => {
			if (data.minHeight !== undefined && data.maxHeight !== undefined) {
				return data.minHeight <= data.maxHeight;
			}
			return true;
		},
		{ message: 'minHeight must be <= maxHeight' },
	);

/**
 * Schema for padding values (stored as Uint8, so 0-255).
 */
export const PaddingValueSchema = z.number().int().min(0).max(255);

/**
 * Schema for setPadding options.
 */
export const PaddingOptionsSchema = z.object({
	left: PaddingValueSchema.optional(),
	top: PaddingValueSchema.optional(),
	right: PaddingValueSchema.optional(),
	bottom: PaddingValueSchema.optional(),
});

/**
 * Schema for style color values (hex string or packed number).
 */
export const StyleColorSchema = z.union([
	z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color format'),
	z.number().int().nonnegative(),
]);

/**
 * Schema for setStyle options.
 */
export const StyleOptionsSchema = z.object({
	fg: StyleColorSchema.optional(),
	bg: StyleColorSchema.optional(),
	bold: z.boolean().optional(),
	underline: z.boolean().optional(),
	blink: z.boolean().optional(),
	inverse: z.boolean().optional(),
	transparent: z.boolean().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

/**
 * Schema for scrollable options.
 */
export const ScrollableOptionsSchema = z.object({
	scrollX: z.number().finite().optional(),
	scrollY: z.number().finite().optional(),
	scrollWidth: z.number().finite().nonnegative().optional(),
	scrollHeight: z.number().finite().nonnegative().optional(),
	viewportWidth: z.number().finite().nonnegative().optional(),
	viewportHeight: z.number().finite().nonnegative().optional(),
	scrollbarVisible: z.number().int().min(0).max(2).optional(),
	trackVisible: z.boolean().optional(),
	alwaysScroll: z.boolean().optional(),
	clampEnabled: z.boolean().optional(),
});

/**
 * Schema for animation frame.
 */
export const AnimationFrameSchema = z.object({
	frameIndex: z.number().int().nonnegative(),
	duration: z.number().positive(),
});

/**
 * Schema for registerAnimation options.
 */
export const AnimationOptionsSchema = z.object({
	name: z.string().min(1),
	frames: z.array(AnimationFrameSchema).min(1),
});

/**
 * Schema for setSliderRange parameters.
 */
export const SliderRangeSchema = z
	.object({
		min: z.number().finite(),
		max: z.number().finite(),
	})
	.refine((data) => data.min < data.max, {
		message: 'min must be less than max',
	});

/**
 * Schema for slider step value.
 */
export const SliderStepSchema = z.number().finite().positive();

/**
 * Schema for slider percentage value (0-1).
 */
export const SliderPercentageSchema = z.number().min(0).max(1);

/**
 * Schema for attachListBehavior options.
 */
export const ListBehaviorOptionsSchema = z.object({
	interactive: z.boolean().optional(),
	mouse: z.boolean().optional(),
	keys: z.boolean().optional(),
	search: z.boolean().optional(),
	selectedIndex: z.number().int().min(-1).optional(),
	visibleCount: z.number().int().positive().optional(),
});

/**
 * Schema for list item.
 */
export const ListItemSchema = z.object({
	text: z.string(),
	value: z.string().optional(),
	disabled: z.boolean().optional(),
});
