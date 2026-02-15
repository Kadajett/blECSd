/**
 * Panel Widget Configuration
 *
 * Zod schemas for runtime validation of panel configuration.
 *
 * @module widgets/panel/config
 */

import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z.object({
	type: z.enum(['line', 'bg', 'none']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	ch: z
		.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.object({}).passthrough()])
		.optional(),
});

/**
 * Zod schema for title style.
 */
const TitleStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
});

/**
 * Zod schema for content style.
 */
const ContentStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for panel style configuration.
 */
const PanelStyleSchema = z.object({
	title: TitleStyleSchema.optional(),
	content: ContentStyleSchema.optional(),
	border: BorderConfigSchema.optional(),
});

/**
 * Zod schema for PanelStyleConfig validation.
 *
 * @example
 * ```typescript
 * import { PanelStyleConfigSchema } from 'blecsd';
 *
 * const style = PanelStyleConfigSchema.parse({
 *   title: { fg: 0xFFFFFFFF, bg: 0x0000FFFF, align: 'center' },
 *   content: { fg: 0xCCCCCCFF, bg: 0x000000FF },
 *   border: { type: 'line', fg: 0xFFFFFFFF, ch: 'single' },
 * });
 * ```
 */
export const PanelStyleConfigSchema = z.object({
	title: z
		.object({
			fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
			bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
			align: z.enum(['left', 'center', 'right']).optional(),
		})
		.optional(),
	content: z
		.object({
			fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
			bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
		})
		.optional(),
	border: z
		.object({
			type: z.enum(['line', 'bg', 'none']).optional(),
			fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
			bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
			ch: z
				.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.unknown()])
				.optional(),
		})
		.optional(),
});

/**
 * Zod schema for padding configuration.
 */
const PaddingSchema = z.union([
	z.number().nonnegative(),
	z.object({
		left: z.number().nonnegative().optional(),
		top: z.number().nonnegative().optional(),
		right: z.number().nonnegative().optional(),
		bottom: z.number().nonnegative().optional(),
	}),
]);

/**
 * Zod schema for panel widget configuration.
 */
export const PanelConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Title
	title: z.string().optional(),
	titleAlign: z.enum(['left', 'center', 'right']).optional(),

	// Features
	closable: z.boolean().optional(),
	collapsible: z.boolean().optional(),
	collapsed: z.boolean().optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	style: PanelStyleSchema.optional(),
	padding: PaddingSchema.optional(),

	// Content
	content: z.string().optional(),
});
