/**
 * Zod validation schemas for terminal module configuration.
 *
 * Provides runtime validation for process spawning, command execution,
 * and editor options used by the terminal process utilities.
 *
 * @module schemas/terminal
 */

import { z } from 'zod';

/**
 * Schema for valid Node.js buffer encodings.
 *
 * @example
 * ```typescript
 * import { BufferEncodingSchema } from 'blecsd';
 *
 * const encoding = BufferEncodingSchema.parse('utf8'); // OK
 * BufferEncodingSchema.parse('invalid'); // throws
 * ```
 */
export const BufferEncodingSchema = z.enum([
	'ascii',
	'utf8',
	'utf-8',
	'utf16le',
	'utf-16le',
	'ucs2',
	'ucs-2',
	'base64',
	'base64url',
	'latin1',
	'binary',
	'hex',
]);

/**
 * Schema for process spawn options.
 *
 * Validates the configuration for spawning child processes with
 * proper terminal state management. Stream and callback fields
 * are not validated at runtime (they rely on TypeScript types).
 *
 * @example
 * ```typescript
 * import { SpawnOptionsSchema } from 'blecsd';
 *
 * const options = SpawnOptionsSchema.parse({
 *   isAlternateBuffer: true,
 *   isMouseEnabled: false,
 * });
 * ```
 */
export const SpawnOptionsSchema = z.object({
	isAlternateBuffer: z.boolean().optional(),
	isMouseEnabled: z.boolean().optional(),
});

/**
 * Schema for process execution options.
 *
 * Extends spawn options with timeout, buffer size, and encoding
 * for capturing process output.
 *
 * @example
 * ```typescript
 * import { ExecOptionsSchema } from 'blecsd';
 *
 * const options = ExecOptionsSchema.parse({
 *   timeout: 5000,
 *   maxBuffer: 1024 * 1024,
 *   encoding: 'utf8',
 *   isAlternateBuffer: false,
 * });
 * ```
 */
export const ExecOptionsSchema = z.object({
	isAlternateBuffer: z.boolean().optional(),
	isMouseEnabled: z.boolean().optional(),
	timeout: z.number().int().nonnegative().max(300000).optional(),
	maxBuffer: z.number().int().positive().max(104857600).optional(),
	encoding: BufferEncodingSchema.optional(),
});

/**
 * Schema for external editor options.
 *
 * Validates configuration for opening an external text editor,
 * including initial content, file extension, and editor command.
 *
 * @example
 * ```typescript
 * import { EditorOptionsSchema } from 'blecsd';
 *
 * const options = EditorOptionsSchema.parse({
 *   content: '# Hello',
 *   extension: '.md',
 *   editor: 'vim',
 * });
 * ```
 */
export const EditorOptionsSchema = z.object({
	content: z.string().optional(),
	extension: z
		.string()
		.regex(/^\.\w+$/, 'Extension must start with a dot')
		.optional(),
	editor: z.string().min(1).optional(),
	isAlternateBuffer: z.boolean().optional(),
	isMouseEnabled: z.boolean().optional(),
});
