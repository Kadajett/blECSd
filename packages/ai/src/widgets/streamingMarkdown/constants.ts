/**
 * Constants and defaults for Streaming Markdown Widget.
 */

import type { StreamingMarkdownConfig, StreamingMarkdownTheme } from './types';

// DEFAULTS

export const DEFAULT_THEME: StreamingMarkdownTheme = {
	heading: '\x1b[1;36m',
	bold: '\x1b[1m',
	italic: '\x1b[3m',
	code: '\x1b[33m',
	codeBlock: '\x1b[90m',
	quote: '\x1b[3;90m',
	bullet: '\x1b[36m',
	link: '\x1b[4;34m',
	hr: '\x1b[90m',
	thinking: '\x1b[2;3m',
	reset: '\x1b[0m',
};

export const DEFAULT_CONFIG: StreamingMarkdownConfig = {
	wrapWidth: 80,
	maxLines: 10000,
	autoScroll: true,
	syntaxHighlight: true,
	thinkingText: 'Thinking...',
	showThinking: true,
	theme: DEFAULT_THEME,
};

export const SUPPORTED_LANGUAGES = new Set([
	'javascript',
	'typescript',
	'json',
	'bash',
	'shell',
	'sh',
]);
