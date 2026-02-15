/**
 * Configuration schemas and constants for FileManager widget
 *
 * @module widgets/fileManager/config
 */

import { z } from 'zod';
import { BORDER_SINGLE, type BorderCharset } from '../../components/border';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
export const DEFAULT_CAPACITY = 10000;

/** Default widget width */
export const DEFAULT_FILE_MANAGER_WIDTH = 40;

/** Default widget height */
export const DEFAULT_FILE_MANAGER_HEIGHT = 20;

/** Icon for directories */
export const DIR_ICON = '📁';

/** Icon for files */
export const FILE_ICON = '📄';

/** Icon for parent directory */
export const PARENT_DIR_ICON = '⬆️';

/** Parent directory entry name */
export const PARENT_DIR_ENTRY = '..';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for file manager border configuration.
 */
const FileManagerBorderConfigSchema = z.object({
	type: z.enum(['line', 'bg', 'none']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	ch: z
		.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.object({}).passthrough()])
		.optional(),
});

/**
 * Zod schema for file manager padding configuration.
 */
const FileManagerPaddingSchema = z.union([
	z.number().nonnegative(),
	z.object({
		left: z.number().nonnegative().optional(),
		top: z.number().nonnegative().optional(),
		right: z.number().nonnegative().optional(),
		bottom: z.number().nonnegative().optional(),
	}),
]);

/**
 * Zod schema for FileManager widget configuration.
 *
 * @example
 * ```typescript
 * import { FileManagerConfigSchema } from 'blecsd';
 *
 * const result = FileManagerConfigSchema.safeParse({
 *   cwd: '/home/user',
 *   showHidden: false,
 *   sortBy: 'name',
 *   width: 50,
 *   height: 25,
 * });
 * ```
 */
export const FileManagerConfigSchema = z.object({
	cwd: z.string().optional(),
	showHidden: z.boolean().optional().default(false),
	filePattern: z.string().optional(),
	sortBy: z.enum(['name', 'size', 'date']).optional().default('name'),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	left: z.number().int().optional(),
	top: z.number().int().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: FileManagerBorderConfigSchema.optional(),
	padding: FileManagerPaddingSchema.optional(),
	showIcons: z.boolean().optional().default(true),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Converts border charset name to actual charset.
 * @internal
 */
export function getBorderCharset(ch: string | object | undefined): BorderCharset {
	if (typeof ch === 'object') return ch as BorderCharset;
	if (ch === undefined || ch === 'single') return BORDER_SINGLE;
	return BORDER_SINGLE;
}
