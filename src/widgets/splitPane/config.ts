/**
 * Validation schemas for Split Pane Widget configuration.
 *
 * @module widgets/splitPane/config
 */

import { z } from 'zod';

const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for SplitPane widget configuration.
 */
export const SplitPaneConfigSchema = z.object({
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),
	direction: z.enum(['horizontal', 'vertical']).optional(),
	ratios: z.array(z.number().min(0).max(1)).optional(),
	minPaneSize: z.number().int().nonnegative().optional(),
	dividerSize: z.number().int().nonnegative().optional(),
	resizable: z.boolean().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	dividerFg: z.union([z.string(), z.number()]).optional(),
	dividerBg: z.union([z.string(), z.number()]).optional(),
	dividerChar: z.string().optional(),
});
