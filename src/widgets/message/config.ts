/**
 * Message Widget Configuration
 *
 * Zod schemas and constants for validating message widget configuration.
 *
 * @module widgets/message/config
 */

import { z } from 'zod';
import type { BorderCharset } from '../../components/border';
import type { MessageStyleConfig, MessageType } from './types';

// =============================================================================
// SCHEMAS
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
 * Zod schema for message style configuration.
 */
const MessageStyleConfigSchema = z
	.object({
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		borderFg: z.union([z.string(), z.number()]).optional(),
	})
	.optional();

/**
 * Zod schema for message widget configuration.
 */
export const MessageConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),

	// Content
	content: z.string().optional(),

	// Behavior
	timeout: z.number().int().nonnegative().optional(),
	dismissOnClick: z.boolean().optional(),
	dismissOnKey: z.boolean().optional(),

	// Style
	type: z.enum(['info', 'warning', 'error', 'success']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: BorderConfigSchema,
	padding: z.number().int().nonnegative().optional(),

	// Style overrides
	infoStyle: MessageStyleConfigSchema,
	warningStyle: MessageStyleConfigSchema,
	errorStyle: MessageStyleConfigSchema,
	successStyle: MessageStyleConfigSchema,
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout in milliseconds */
export const DEFAULT_MESSAGE_TIMEOUT = 3000;

/** Default padding */
export const DEFAULT_MESSAGE_PADDING = 1;

/** Default styles for each message type */
export const DEFAULT_MESSAGE_STYLES: Record<MessageType, MessageStyleConfig> = {
	info: {
		fg: '#ffffff',
		bg: '#2196f3',
		borderFg: '#64b5f6',
	},
	warning: {
		fg: '#000000',
		bg: '#ff9800',
		borderFg: '#ffb74d',
	},
	error: {
		fg: '#ffffff',
		bg: '#f44336',
		borderFg: '#e57373',
	},
	success: {
		fg: '#ffffff',
		bg: '#4caf50',
		borderFg: '#81c784',
	},
};

/**
 * Validated config type from MessageConfigSchema.
 * @internal
 */
export interface ValidatedMessageConfig {
	left?: string | number;
	top?: string | number;
	width?: number;
	height?: number;
	content?: string;
	timeout?: number;
	dismissOnClick?: boolean;
	dismissOnKey?: boolean;
	type?: MessageType;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
	};
	padding?: number;
	infoStyle?: MessageStyleConfig;
	warningStyle?: MessageStyleConfig;
	errorStyle?: MessageStyleConfig;
	successStyle?: MessageStyleConfig;
}
