/**
 * Tabs Widget Configuration
 *
 * Zod schemas and constants for validating tabs widget configuration.
 *
 * @module widgets/tabs/config
 */

import { z } from 'zod';
import type { TabPosition } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default tab position */
export const DEFAULT_TAB_POSITION: TabPosition = 'top';

/** Tab separator character */
export const TAB_SEPARATOR = ' │ ';

/** Close button character */
export const TAB_CLOSE_CHAR = '✕';

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
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for tab configuration.
 */
const TabConfigSchema = z.object({
	label: z.string(),
	content: z.union([z.number(), z.function()]).optional(),
	closable: z.boolean().optional(),
});

/**
 * Zod schema for tab style.
 */
const TabStyleSchema = z.object({
	activeFg: z.union([z.string(), z.number()]).optional(),
	activeBg: z.union([z.string(), z.number()]).optional(),
	inactiveFg: z.union([z.string(), z.number()]).optional(),
	inactiveBg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for content style.
 */
const ContentStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

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
 * Zod schema for tabs style configuration.
 */
const TabsStyleSchema = z.object({
	tab: TabStyleSchema.optional(),
	content: ContentStyleSchema.optional(),
	border: BorderConfigSchema.optional(),
});

/**
 * Zod schema for tabs widget configuration.
 */
export const TabsConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Tabs
	tabs: z.array(TabConfigSchema).optional(),
	activeTab: z.number().nonnegative().optional(),
	position: z.enum(['top', 'bottom']).optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	style: TabsStyleSchema.optional(),
});

/**
 * Validated config type.
 * @internal
 */
export interface ValidatedTabsConfig {
	left?: string | number;
	top?: string | number;
	width?: string | number;
	height?: string | number;
	tabs?: Array<{
		label: string;
		content?: number | (() => number);
		closable?: boolean;
	}>;
	activeTab?: number;
	position?: 'top' | 'bottom';
	fg?: string | number;
	bg?: string | number;
	style?: {
		tab?: {
			activeFg?: string | number;
			activeBg?: string | number;
			inactiveFg?: string | number;
			inactiveBg?: string | number;
		};
		content?: {
			fg?: string | number;
			bg?: string | number;
		};
		border?: {
			type?: 'line' | 'bg' | 'none';
			fg?: string | number;
			bg?: string | number;
			ch?: string | object;
		};
	};
}
