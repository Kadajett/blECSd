/**
 * Language grammar definitions for syntax highlighting.
 *
 * @module utils/syntaxHighlight/grammars
 */

import { GRAMMAR_GO, GRAMMAR_RUST } from './grammars-systems';
import { GRAMMAR_JAVASCRIPT, GRAMMAR_PYTHON } from './grammars-web';
import type { Grammar } from './types';

// =============================================================================
// GRAMMARS
// =============================================================================

/**
 * JavaScript/TypeScript grammar.
 */
export const GRAMMAR_SHELL: Grammar = {
	name: 'shell',
	extensions: ['.sh', '.bash', '.zsh', '.fish'],
	keywords: new Set([
		'if',
		'then',
		'else',
		'elif',
		'fi',
		'case',
		'esac',
		'for',
		'while',
		'until',
		'do',
		'done',
		'in',
		'function',
		'select',
		'time',
		'coproc',
		'return',
		'exit',
		'break',
		'continue',
		'local',
		'declare',
		'typeset',
		'readonly',
		'export',
		'unset',
		'shift',
		'source',
		'alias',
		'unalias',
	]),
	builtins: new Set([
		'echo',
		'printf',
		'read',
		'cd',
		'pwd',
		'pushd',
		'popd',
		'dirs',
		'set',
		'shopt',
		'test',
		'eval',
		'exec',
		'trap',
		'wait',
		'kill',
		'jobs',
		'fg',
		'bg',
		'suspend',
		'disown',
		'builtin',
		'command',
		'type',
		'hash',
		'help',
		'let',
		'true',
		'false',
		'getopts',
		'bind',
		'complete',
		'compgen',
		'compopt',
		'caller',
		'enable',
		'mapfile',
		'readarray',
		'ulimit',
		'umask',
	]),
	types: new Set([]),
	constants: new Set(['true', 'false']),
	operators: /[+\-*/%=<>!&|^~?:;]+/,
	lineComment: '#',
	blockCommentStart: null,
	blockCommentEnd: null,
	stringDelimiters: ['"', "'"],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern: /\b\d+\b/,
	identifierPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
	nestedComments: false,
};

/**
 * JSON grammar.
 */
export const GRAMMAR_JSON: Grammar = {
	name: 'json',
	extensions: ['.json', '.jsonc', '.json5'],
	keywords: new Set([]),
	builtins: new Set([]),
	types: new Set([]),
	constants: new Set(['true', 'false', 'null']),
	operators: /[:]/,
	lineComment: null,
	blockCommentStart: null,
	blockCommentEnd: null,
	stringDelimiters: ['"'],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern: /\b-?(?:\d+)?\.?\d+(?:[eE][+-]?\d+)?\b/,
	identifierPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
	nestedComments: false,
};

/**
 * Plain text (no highlighting).
 */
export const GRAMMAR_PLAINTEXT: Grammar = {
	name: 'plaintext',
	extensions: ['.txt', '.text'],
	keywords: new Set([]),
	builtins: new Set([]),
	types: new Set([]),
	constants: new Set([]),
	operators: /(?!)/,
	lineComment: null,
	blockCommentStart: null,
	blockCommentEnd: null,
	stringDelimiters: [],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern: /(?!)/,
	identifierPattern: /(?!)/,
	nestedComments: false,
};

/** All available grammars */
export const GRAMMARS: readonly Grammar[] = [
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_GO,
	GRAMMAR_SHELL,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
];
