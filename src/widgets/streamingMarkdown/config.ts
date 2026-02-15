/**
 * Configuration schema for Streaming Markdown Widget.
 */

import { z } from 'zod';

// SCHEMA

/**
 * Zod schema for StreamingMarkdownConfig validation.
 */
export const StreamingMarkdownConfigSchema = z.object({
	wrapWidth: z.number().int().positive().default(80),
	maxLines: z.number().int().nonnegative().default(10000),
	autoScroll: z.boolean().default(true),
	syntaxHighlight: z.boolean().default(true),
	thinkingText: z.string().default('Thinking...'),
	showThinking: z.boolean().default(true),
	theme: z
		.object({
			heading: z.string().default('\x1b[1;36m'),
			bold: z.string().default('\x1b[1m'),
			italic: z.string().default('\x1b[3m'),
			code: z.string().default('\x1b[33m'),
			codeBlock: z.string().default('\x1b[90m'),
			quote: z.string().default('\x1b[3;90m'),
			bullet: z.string().default('\x1b[36m'),
			link: z.string().default('\x1b[4;34m'),
			hr: z.string().default('\x1b[90m'),
			thinking: z.string().default('\x1b[2;3m'),
			reset: z.string().default('\x1b[0m'),
		})
		.optional(),
});
