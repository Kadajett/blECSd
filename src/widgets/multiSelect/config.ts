/**
 * Multi-Select Widget Configuration
 *
 * Zod schemas and constants for runtime validation of MultiSelect configuration.
 *
 * @module widgets/multiSelect/config
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default widget dimensions */
export const DEFAULT_WIDTH = 30;
export const DEFAULT_HEIGHT = 10;

/** Checkbox display characters */
export const CHECKBOX_CHECKED = '[x]';
export const CHECKBOX_UNCHECKED = '[ ]';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for MultiSelectConfig validation.
 */
export const MultiSelectConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(DEFAULT_WIDTH),
	height: z.number().int().positive().default(DEFAULT_HEIGHT),
	items: z
		.array(
			z.union([
				z.string(),
				z.object({
					text: z.string(),
					value: z.string().optional(),
					disabled: z.boolean().optional(),
				}),
			]),
		)
		.default([]),
	selected: z.array(z.number().int().nonnegative()).default([]),
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	cursorFg: z.number().int().nonnegative().optional(),
	cursorBg: z.number().int().nonnegative().optional(),
	selectedFg: z.number().int().nonnegative().optional(),
	selectedBg: z.number().int().nonnegative().optional(),
	disabledFg: z.number().int().nonnegative().optional(),
	filterable: z.boolean().default(true),
});
