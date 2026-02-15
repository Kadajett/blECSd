/**
 * Configuration validation for Conversation widget.
 * @module widgets/conversation/config
 */

import { z } from 'zod';

/**
 * Zod schema for conversation widget configuration.
 */
export const ConversationConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	showTimestamps: z.boolean().default(true),
	showRoleIndicator: z.boolean().default(true),
	maxMessages: z.number().int().positive().default(1000),
	wrapWidth: z.number().int().positive().optional(),
	roleColors: z
		.object({
			user: z.union([z.string(), z.number()]).optional(),
			assistant: z.union([z.string(), z.number()]).optional(),
			system: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});
