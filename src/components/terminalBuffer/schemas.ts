/**
 * TerminalBuffer validation schemas.
 *
 * @module components/terminalBuffer/schemas
 */

import { z } from 'zod';
import {
	DEFAULT_SCROLLBACK_LINES,
	DEFAULT_TERMINAL_HEIGHT,
	DEFAULT_TERMINAL_WIDTH,
} from './component';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Terminal buffer configuration schema.
 */
export const TerminalBufferConfigSchema = z.object({
	/** Terminal width in columns */
	width: z.number().int().positive().default(DEFAULT_TERMINAL_WIDTH),
	/** Terminal height in rows */
	height: z.number().int().positive().default(DEFAULT_TERMINAL_HEIGHT),
	/** Maximum scrollback lines */
	scrollbackLines: z.number().int().nonnegative().default(DEFAULT_SCROLLBACK_LINES),
	/** Initial cursor visibility */
	cursorVisible: z.boolean().default(true),
	/** Cursor shape */
	cursorShape: z.enum(['block', 'underline', 'bar']).default('block'),
	/** Cursor blink enabled */
	cursorBlink: z.boolean().default(true),
});

/**
 * Terminal buffer configuration type.
 */
export type TerminalBufferConfig = z.input<typeof TerminalBufferConfigSchema>;
