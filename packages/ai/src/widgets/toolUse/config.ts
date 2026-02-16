/**
 * Configuration validation for Tool Use widget.
 * @module widgets/toolUse/config
 */

import { z } from 'zod';

/**
 * Zod schema for tool use widget configuration.
 */
export const ToolUseConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	showTimeline: z.boolean().default(true),
	showParameters: z.boolean().default(true),
	showDuration: z.boolean().default(true),
	maxVisibleCalls: z.number().int().positive().default(10),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	statusColors: z
		.object({
			pending: z.union([z.string(), z.number()]).optional(),
			running: z.union([z.string(), z.number()]).optional(),
			complete: z.union([z.string(), z.number()]).optional(),
			error: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
});

/** Default entity capacity for typed arrays */
export const DEFAULT_CAPACITY = 10000;
