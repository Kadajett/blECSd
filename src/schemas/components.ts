/**
 * Zod validation schemas for component setter functions.
 * @module schemas/components
 */

import { z } from 'zod';

/**
 * Schema for setPosition parameters.
 *
 * @example
 * ```typescript
 * import { SetPositionSchema } from 'blecsd';
 *
 * const pos = SetPositionSchema.parse({ x: 10, y: 20, z: 5 });
 * ```
 */
export const SetPositionSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	z: z.number().int().min(0).max(65535).optional(),
});

/**
 * Schema for z-index values (0-65535).
 *
 * @example
 * ```typescript
 * import { ZIndexSchema } from 'blecsd';
 *
 * const z = ZIndexSchema.parse(100);
 * ```
 */
export const ZIndexSchema = z.number().int().min(0).max(65535);

/**
 * Schema for dimension values (number, percentage string, or 'auto').
 *
 * @example
 * ```typescript
 * import { DimensionValueSchema } from 'blecsd';
 *
 * DimensionValueSchema.parse(80); // absolute cells
 * DimensionValueSchema.parse('50%'); // percentage
 * DimensionValueSchema.parse('auto'); // auto-size
 * ```
 */
export const DimensionValueSchema = z.union([
	z.number().finite(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Schema for setDimensions parameters.
 *
 * @example
 * ```typescript
 * import { SetDimensionsSchema } from 'blecsd';
 *
 * const dims = SetDimensionsSchema.parse({ width: 80, height: '50%' });
 * ```
 */
export const SetDimensionsSchema = z.object({
	width: DimensionValueSchema,
	height: DimensionValueSchema,
});

/**
 * Schema for dimension constraints (min/max width and height).
 *
 * @example
 * ```typescript
 * import { DimensionConstraintsSchema } from 'blecsd';
 *
 * const constraints = DimensionConstraintsSchema.parse({
 *   minWidth: 20, maxWidth: 100,
 *   minHeight: 5, maxHeight: 50,
 * });
 * ```
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
 *
 * @example
 * ```typescript
 * import { PaddingValueSchema } from 'blecsd';
 *
 * const pad = PaddingValueSchema.parse(4);
 * ```
 */
export const PaddingValueSchema = z.number().int().min(0).max(255);

/**
 * Schema for setPadding options with per-side values.
 *
 * @example
 * ```typescript
 * import { PaddingOptionsSchema } from 'blecsd';
 *
 * const padding = PaddingOptionsSchema.parse({ left: 2, right: 2 });
 * ```
 */
export const PaddingOptionsSchema = z.object({
	left: PaddingValueSchema.optional(),
	top: PaddingValueSchema.optional(),
	right: PaddingValueSchema.optional(),
	bottom: PaddingValueSchema.optional(),
});

/**
 * Schema for style color values (hex string or packed RGBA number).
 *
 * @example
 * ```typescript
 * import { StyleColorSchema } from 'blecsd';
 *
 * StyleColorSchema.parse('#ff0000'); // hex string
 * StyleColorSchema.parse(0xff0000ff); // packed RGBA
 * ```
 */
export const StyleColorSchema = z.union([
	z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color format'),
	z.number().int().nonnegative(),
]);

/**
 * Schema for setStyle options (foreground, background, text attributes).
 *
 * @example
 * ```typescript
 * import { StyleOptionsSchema } from 'blecsd';
 *
 * const style = StyleOptionsSchema.parse({
 *   fg: '#ff0000', bg: '#000000', bold: true,
 * });
 * ```
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
 * Schema for scrollable component options.
 *
 * @example
 * ```typescript
 * import { ScrollableOptionsSchema } from 'blecsd';
 *
 * const opts = ScrollableOptionsSchema.parse({
 *   scrollX: 0, scrollY: 10, scrollHeight: 200,
 * });
 * ```
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
 * Schema for a single animation frame (index + duration).
 *
 * @example
 * ```typescript
 * import { AnimationFrameSchema } from 'blecsd';
 *
 * const frame = AnimationFrameSchema.parse({ frameIndex: 0, duration: 100 });
 * ```
 */
export const AnimationFrameSchema = z.object({
	frameIndex: z.number().int().nonnegative(),
	duration: z.number().positive(),
});

/**
 * Schema for registerAnimation options (name + frame sequence).
 *
 * @example
 * ```typescript
 * import { AnimationOptionsSchema } from 'blecsd';
 *
 * const anim = AnimationOptionsSchema.parse({
 *   name: 'walk',
 *   frames: [
 *     { frameIndex: 0, duration: 100 },
 *     { frameIndex: 1, duration: 100 },
 *   ],
 * });
 * ```
 */
export const AnimationOptionsSchema = z.object({
	name: z.string().min(1),
	frames: z.array(AnimationFrameSchema).min(1),
});

/**
 * Schema for slider range (min must be less than max).
 *
 * @example
 * ```typescript
 * import { SliderRangeSchema } from 'blecsd';
 *
 * const range = SliderRangeSchema.parse({ min: 0, max: 100 });
 * ```
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
 * Schema for slider step value (must be positive).
 *
 * @example
 * ```typescript
 * import { SliderStepSchema } from 'blecsd';
 *
 * const step = SliderStepSchema.parse(0.5);
 * ```
 */
export const SliderStepSchema = z.number().finite().positive();

/**
 * Schema for slider percentage value (0-1).
 *
 * @example
 * ```typescript
 * import { SliderPercentageSchema } from 'blecsd';
 *
 * const pct = SliderPercentageSchema.parse(0.75);
 * ```
 */
export const SliderPercentageSchema = z.number().min(0).max(1);

/**
 * Schema for list behavior options (interactivity, navigation).
 *
 * @example
 * ```typescript
 * import { ListBehaviorOptionsSchema } from 'blecsd';
 *
 * const opts = ListBehaviorOptionsSchema.parse({
 *   interactive: true, mouse: true, keys: true,
 * });
 * ```
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
 * Schema for a list item (text, optional value, disabled state).
 *
 * @example
 * ```typescript
 * import { ListItemSchema } from 'blecsd';
 *
 * const item = ListItemSchema.parse({ text: 'Option A', value: 'a' });
 * ```
 */
export const ListItemSchema = z.object({
	text: z.string(),
	value: z.string().optional(),
	disabled: z.boolean().optional(),
});
