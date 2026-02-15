/**
 * Flexbox Widget Configuration
 *
 * Zod schemas for validating flexbox widget configuration.
 *
 * @module widgets/flexbox/config
 */

import { z } from 'zod';

/**
 * Flex child options validation schema.
 */
export const FlexChildOptionsSchema = z.object({
	flex: z.number().nonnegative().optional().default(0),
	flexShrink: z.number().nonnegative().optional().default(1),
	flexBasis: z
		.union([z.number().nonnegative(), z.literal('auto')])
		.optional()
		.default('auto'),
	alignSelf: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});

/**
 * Flex container configuration validation schema.
 */
export const FlexContainerConfigSchema = z.object({
	direction: z.enum(['row', 'column']).optional().default('row'),
	justifyContent: z
		.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'])
		.optional()
		.default('start'),
	alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional().default('stretch'),
	gap: z.number().nonnegative().optional().default(0),
	wrap: z.enum(['nowrap', 'wrap']).optional().default('nowrap'),
	left: z.number().optional().default(0),
	top: z.number().optional().default(0),
	width: z.union([z.number(), z.string()]).optional().default('auto'),
	height: z.union([z.number(), z.string()]).optional().default('auto'),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Validated flex container config type.
 * @internal
 */
export type ValidatedFlexContainerConfig = z.infer<typeof FlexContainerConfigSchema>;

/**
 * Validated flex child options type.
 * @internal
 */
export type ValidatedFlexChildOptions = z.infer<typeof FlexChildOptionsSchema>;
