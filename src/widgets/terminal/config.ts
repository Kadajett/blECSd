/**
 * Configuration schemas for Terminal Widget.
 *
 * @module widgets/terminal/config
 */

import { z } from 'zod';
import type { BorderCharset } from '../../components/border';

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
 * Zod schema for PTY options.
 */
export const PtyOptionsSchema = z.object({
	shell: z.string().min(1).optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional(),
	cwd: z.string().min(1).optional(),
	term: z.string().min(1).default('xterm-256color'),
	cols: z.number().int().positive().optional(),
	rows: z.number().int().positive().optional(),
	autoResize: z.boolean().default(true),
});

/**
 * Zod schema for terminal widget configuration.
 */
export const TerminalConfigSchema = z.object({
	width: z.number().int().positive().default(80),
	height: z.number().int().positive().default(24),
	scrollback: z.number().int().nonnegative().default(1000),
	cursorBlink: z.boolean().default(true),
	cursorShape: z.enum(['block', 'underline', 'bar']).default('block'),
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	border: BorderConfigSchema,
	style: z
		.object({
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
	mouse: z.boolean().default(true),
	keys: z.boolean().default(true),
});
