/**
 * Incremental Syntax Highlighting
 *
 * Line-based tokenization with state tracking for efficient re-highlighting.
 * Only changed lines and affected multi-line constructs are re-processed.
 *
 * @module utils/syntaxHighlight
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Token types for syntax highlighting.
 */
export type TokenType =
	| 'keyword'
	| 'string'
	| 'number'
	| 'comment'
	| 'operator'
	| 'punctuation'
	| 'identifier'
	| 'function'
	| 'type'
	| 'constant'
	| 'variable'
	| 'property'
	| 'builtin'
	| 'regexp'
	| 'escape'
	| 'tag'
	| 'attribute'
	| 'text';

/**
 * A token represents a highlighted span of text.
 */
export interface Token {
	readonly type: TokenType;
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

/**
 * Line state for multi-line construct tracking.
 */
export interface LineState {
	/** In multi-line string (and quote character) */
	readonly inString: string | null;
	/** In multi-line comment */
	readonly inComment: boolean;
	/** Template literal nesting depth */
	readonly templateDepth: number;
	/** Block comment depth (for nested comments like Rust) */
	readonly commentDepth: number;
}

/**
 * A cached line entry with tokens and state.
 */
export interface LineEntry {
	readonly text: string;
	readonly tokens: readonly Token[];
	readonly startState: LineState;
	readonly endState: LineState;
}

/**
 * Language grammar definition.
 */
export interface Grammar {
	readonly name: string;
	readonly extensions: readonly string[];
	readonly keywords: ReadonlySet<string>;
	readonly builtins: ReadonlySet<string>;
	readonly types: ReadonlySet<string>;
	readonly constants: ReadonlySet<string>;
	readonly operators: RegExp;
	readonly lineComment: string | null;
	readonly blockCommentStart: string | null;
	readonly blockCommentEnd: string | null;
	readonly stringDelimiters: readonly string[];
	readonly templateLiteralStart: string | null;
	readonly templateLiteralEnd: string | null;
	readonly numberPattern: RegExp;
	readonly identifierPattern: RegExp;
	readonly nestedComments: boolean;
}

/**
 * Highlight cache for a document.
 */
export interface HighlightCache {
	/** Current grammar */
	grammar: Grammar;
	/** Cached line entries (line index -> entry) */
	readonly entries: Map<number, LineEntry>;
	/** Dirty lines that need re-highlighting */
	readonly dirty: Set<number>;
	/** Total line count (for bounds checking) */
	lineCount: number;
	/** Full invalidate flag */
	fullInvalidate: boolean;
}

/**
 * Result of visible-first highlighting.
 */
export interface HighlightResult {
	/** Highlighted lines with tokens */
	readonly lines: readonly LineEntry[];
	/** Whether more lines need processing */
	readonly hasMore: boolean;
	/** Next line to process */
	readonly nextLine: number;
	/** Time taken in milliseconds */
	readonly timeMs: number;
}

/**
 * Statistics for the highlight cache.
 */
export interface HighlightStats {
	readonly cachedLines: number;
	readonly dirtyLines: number;
	readonly grammar: string;
	readonly lineCount: number;
	readonly fullInvalidate: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default batch size for background highlighting */
export const DEFAULT_HIGHLIGHT_BATCH = 100;

/** Initial empty line state */
export const EMPTY_STATE: LineState = {
	inString: null,
	inComment: false,
	templateDepth: 0,
	commentDepth: 0,
};

// =============================================================================
// GRAMMARS
// =============================================================================

/**
 * JavaScript/TypeScript grammar.
 */
export const GRAMMAR_JAVASCRIPT: Grammar = {
	name: 'javascript',
	extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
	keywords: new Set([
		'async',
		'await',
		'break',
		'case',
		'catch',
		'class',
		'const',
		'continue',
		'debugger',
		'default',
		'delete',
		'do',
		'else',
		'enum',
		'export',
		'extends',
		'finally',
		'for',
		'from',
		'function',
		'if',
		'implements',
		'import',
		'in',
		'instanceof',
		'interface',
		'let',
		'new',
		'of',
		'package',
		'private',
		'protected',
		'public',
		'return',
		'static',
		'super',
		'switch',
		'this',
		'throw',
		'try',
		'type',
		'typeof',
		'var',
		'void',
		'while',
		'with',
		'yield',
		'as',
		'is',
		'keyof',
		'readonly',
		'declare',
		'namespace',
		'abstract',
		'satisfies',
	]),
	builtins: new Set([
		'Array',
		'Boolean',
		'Date',
		'Error',
		'Function',
		'JSON',
		'Math',
		'Number',
		'Object',
		'Promise',
		'RegExp',
		'String',
		'Symbol',
		'Map',
		'Set',
		'WeakMap',
		'WeakSet',
		'console',
		'window',
		'document',
		'globalThis',
		'process',
		'require',
		'module',
		'exports',
		'Buffer',
		'setTimeout',
		'setInterval',
		'clearTimeout',
		'clearInterval',
		'fetch',
		'Response',
		'Request',
		'Headers',
		'URL',
		'URLSearchParams',
		'FormData',
		'Blob',
		'File',
		'FileReader',
		'Intl',
		'Proxy',
		'Reflect',
		'BigInt',
	]),
	types: new Set([
		'any',
		'boolean',
		'number',
		'string',
		'void',
		'never',
		'unknown',
		'null',
		'undefined',
		'object',
		'symbol',
		'bigint',
	]),
	constants: new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']),
	operators: /[+\-*/%=<>!&|^~?:]+/,
	lineComment: '//',
	blockCommentStart: '/*',
	blockCommentEnd: '*/',
	stringDelimiters: ["'", '"'],
	templateLiteralStart: '`',
	templateLiteralEnd: '`',
	numberPattern:
		/\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d[\d_]*)?n?)\b/,
	identifierPattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
	nestedComments: false,
};

/**
 * Python grammar.
 */
export const GRAMMAR_PYTHON: Grammar = {
	name: 'python',
	extensions: ['.py', '.pyw', '.pyi'],
	keywords: new Set([
		'and',
		'as',
		'assert',
		'async',
		'await',
		'break',
		'class',
		'continue',
		'def',
		'del',
		'elif',
		'else',
		'except',
		'finally',
		'for',
		'from',
		'global',
		'if',
		'import',
		'in',
		'is',
		'lambda',
		'nonlocal',
		'not',
		'or',
		'pass',
		'raise',
		'return',
		'try',
		'while',
		'with',
		'yield',
		'match',
		'case',
	]),
	builtins: new Set([
		'abs',
		'all',
		'any',
		'ascii',
		'bin',
		'bool',
		'breakpoint',
		'bytearray',
		'bytes',
		'callable',
		'chr',
		'classmethod',
		'compile',
		'complex',
		'delattr',
		'dict',
		'dir',
		'divmod',
		'enumerate',
		'eval',
		'exec',
		'filter',
		'float',
		'format',
		'frozenset',
		'getattr',
		'globals',
		'hasattr',
		'hash',
		'help',
		'hex',
		'id',
		'input',
		'int',
		'isinstance',
		'issubclass',
		'iter',
		'len',
		'list',
		'locals',
		'map',
		'max',
		'memoryview',
		'min',
		'next',
		'object',
		'oct',
		'open',
		'ord',
		'pow',
		'print',
		'property',
		'range',
		'repr',
		'reversed',
		'round',
		'set',
		'setattr',
		'slice',
		'sorted',
		'staticmethod',
		'str',
		'sum',
		'super',
		'tuple',
		'type',
		'vars',
		'zip',
		'__import__',
	]),
	types: new Set(['int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes', 'None']),
	constants: new Set(['True', 'False', 'None', 'Ellipsis', 'NotImplemented', '__debug__']),
	operators: /[+\-*/%=<>!@&|^~:]+/,
	lineComment: '#',
	blockCommentStart: null,
	blockCommentEnd: null,
	stringDelimiters: ["'", '"', "'''", '"""'],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern:
		/\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d[\d_]*)?[jJ]?)\b/,
	identifierPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
	nestedComments: false,
};

/**
 * Rust grammar.
 */
export const GRAMMAR_RUST: Grammar = {
	name: 'rust',
	extensions: ['.rs'],
	keywords: new Set([
		'as',
		'async',
		'await',
		'break',
		'const',
		'continue',
		'crate',
		'dyn',
		'else',
		'enum',
		'extern',
		'false',
		'fn',
		'for',
		'if',
		'impl',
		'in',
		'let',
		'loop',
		'match',
		'mod',
		'move',
		'mut',
		'pub',
		'ref',
		'return',
		'self',
		'Self',
		'static',
		'struct',
		'super',
		'trait',
		'true',
		'type',
		'union',
		'unsafe',
		'use',
		'where',
		'while',
		'macro_rules',
	]),
	builtins: new Set([
		'Option',
		'Some',
		'None',
		'Result',
		'Ok',
		'Err',
		'Box',
		'Vec',
		'String',
		'HashMap',
		'HashSet',
		'Rc',
		'Arc',
		'RefCell',
		'Cell',
		'Mutex',
		'RwLock',
		'println',
		'eprintln',
		'print',
		'eprint',
		'format',
		'panic',
		'assert',
		'assert_eq',
		'assert_ne',
		'debug_assert',
		'todo',
		'unimplemented',
		'unreachable',
		'cfg',
		'derive',
	]),
	types: new Set([
		'bool',
		'char',
		'str',
		'u8',
		'u16',
		'u32',
		'u64',
		'u128',
		'usize',
		'i8',
		'i16',
		'i32',
		'i64',
		'i128',
		'isize',
		'f32',
		'f64',
		'()',
	]),
	constants: new Set(['true', 'false']),
	operators: /[+\-*/%=<>!&|^~?:@]+/,
	lineComment: '//',
	blockCommentStart: '/*',
	blockCommentEnd: '*/',
	stringDelimiters: ['"'],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern:
		/\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d[\d_]*)?(?:_?(?:u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64))?)\b/,
	identifierPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
	nestedComments: true,
};

/**
 * Go grammar.
 */
export const GRAMMAR_GO: Grammar = {
	name: 'go',
	extensions: ['.go'],
	keywords: new Set([
		'break',
		'case',
		'chan',
		'const',
		'continue',
		'default',
		'defer',
		'else',
		'fallthrough',
		'for',
		'func',
		'go',
		'goto',
		'if',
		'import',
		'interface',
		'map',
		'package',
		'range',
		'return',
		'select',
		'struct',
		'switch',
		'type',
		'var',
	]),
	builtins: new Set([
		'append',
		'cap',
		'close',
		'complex',
		'copy',
		'delete',
		'imag',
		'len',
		'make',
		'new',
		'panic',
		'print',
		'println',
		'real',
		'recover',
	]),
	types: new Set([
		'bool',
		'byte',
		'complex64',
		'complex128',
		'error',
		'float32',
		'float64',
		'int',
		'int8',
		'int16',
		'int32',
		'int64',
		'rune',
		'string',
		'uint',
		'uint8',
		'uint16',
		'uint32',
		'uint64',
		'uintptr',
	]),
	constants: new Set(['true', 'false', 'nil', 'iota']),
	operators: /[+\-*/%=<>!&|^~:]+/,
	lineComment: '//',
	blockCommentStart: '/*',
	blockCommentEnd: '*/',
	stringDelimiters: ['"', "'", '`'],
	templateLiteralStart: null,
	templateLiteralEnd: null,
	numberPattern:
		/\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d[\d_]*)?i?)\b/,
	identifierPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
	nestedComments: false,
};

/**
 * Shell/Bash grammar.
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

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Creates a new highlight cache.
 *
 * @param grammar - The grammar to use for highlighting
 * @returns A new highlight cache
 */
export function createHighlightCache(grammar: Grammar): HighlightCache {
	return {
		grammar,
		entries: new Map(),
		dirty: new Set(),
		lineCount: 0,
		fullInvalidate: true,
	};
}

/**
 * Clears all entries from the cache.
 *
 * @param cache - The cache to clear
 */
export function clearHighlightCache(cache: HighlightCache): void {
	cache.entries.clear();
	cache.dirty.clear();
	cache.lineCount = 0;
	cache.fullInvalidate = true;
}

/**
 * Changes the grammar used for highlighting.
 *
 * @param cache - The cache to update
 * @param grammar - The new grammar
 */
export function setGrammar(cache: HighlightCache, grammar: Grammar): void {
	if (cache.grammar.name !== grammar.name) {
		cache.grammar = grammar;
		cache.fullInvalidate = true;
		for (let i = 0; i < cache.lineCount; i++) {
			cache.dirty.add(i);
		}
	}
}

/**
 * Gets statistics about the highlight cache.
 *
 * @param cache - The cache to analyze
 * @returns Cache statistics
 */
export function getHighlightStats(cache: HighlightCache): HighlightStats {
	return {
		cachedLines: cache.entries.size,
		dirtyLines: cache.dirty.size,
		grammar: cache.grammar.name,
		lineCount: cache.lineCount,
		fullInvalidate: cache.fullInvalidate,
	};
}

// =============================================================================
// INVALIDATION
// =============================================================================

/**
 * Invalidates a range of lines.
 *
 * @param cache - The cache to update
 * @param start - Start line (inclusive)
 * @param end - End line (exclusive)
 */
export function invalidateLines(cache: HighlightCache, start: number, end: number): void {
	for (let i = start; i < end; i++) {
		cache.dirty.add(i);
	}
}

/**
 * Invalidates a single line.
 *
 * @param cache - The cache to update
 * @param line - The line to invalidate
 */
export function invalidateLine(cache: HighlightCache, line: number): void {
	cache.dirty.add(line);
}

/**
 * Invalidates all lines in the cache.
 *
 * @param cache - The cache to update
 */
export function invalidateAllLines(cache: HighlightCache): void {
	cache.fullInvalidate = true;
	for (let i = 0; i < cache.lineCount; i++) {
		cache.dirty.add(i);
	}
}

// =============================================================================
// TOKENIZATION
// =============================================================================

/**
 * Compares two line states for equality.
 */
function statesEqual(a: LineState, b: LineState): boolean {
	return (
		a.inString === b.inString &&
		a.inComment === b.inComment &&
		a.templateDepth === b.templateDepth &&
		a.commentDepth === b.commentDepth
	);
}

/**
 * Tokenizes a single line.
 *
 * @param grammar - The grammar to use
 * @param line - The line text
 * @param startState - The state at the start of the line
 * @returns The line entry with tokens and end state
 */
export function tokenizeLine(grammar: Grammar, line: string, startState: LineState): LineEntry {
	const tokens: Token[] = [];
	let pos = 0;
	let state: LineState = { ...startState };

	// Helper to add a token
	const addToken = (type: TokenType, start: number, end: number): void => {
		if (end > start) {
			tokens.push({ type, start, end, text: line.slice(start, end) });
		}
	};

	// Helper to check if a string starts at the position
	const startsWithAt = (str: string, position: number): boolean => {
		return line.slice(position, position + str.length) === str;
	};

	while (pos < line.length) {
		// Handle multi-line string continuation
		if (state.inString !== null) {
			const quote = state.inString;
			const stringStart = pos;

			// Look for the closing quote
			while (pos < line.length) {
				if (line[pos] === '\\' && pos + 1 < line.length) {
					pos += 2; // Skip escape sequence
				} else if (
					(quote.length === 3 && startsWithAt(quote, pos)) ||
					(quote.length === 1 && line[pos] === quote)
				) {
					pos += quote.length;
					state = { ...state, inString: null };
					break;
				} else {
					pos++;
				}
			}

			addToken('string', stringStart, pos);
			continue;
		}

		// Handle multi-line comment continuation
		if (state.inComment && grammar.blockCommentEnd) {
			const commentStart = pos;

			while (pos < line.length) {
				// Check for nested comment start (if supported)
				if (
					grammar.nestedComments &&
					grammar.blockCommentStart &&
					startsWithAt(grammar.blockCommentStart, pos)
				) {
					state = { ...state, commentDepth: state.commentDepth + 1 };
					pos += grammar.blockCommentStart.length;
				} else if (startsWithAt(grammar.blockCommentEnd, pos)) {
					if (grammar.nestedComments && state.commentDepth > 0) {
						state = { ...state, commentDepth: state.commentDepth - 1 };
					} else {
						pos += grammar.blockCommentEnd.length;
						state = { ...state, inComment: false, commentDepth: 0 };
						break;
					}
					pos += grammar.blockCommentEnd.length;
				} else {
					pos++;
				}
			}

			addToken('comment', commentStart, pos);
			continue;
		}

		// Handle template literal continuation
		if (state.templateDepth > 0 && grammar.templateLiteralEnd) {
			const templateStart = pos;

			while (pos < line.length) {
				if (line[pos] === '\\' && pos + 1 < line.length) {
					pos += 2;
				} else if (startsWithAt('${', pos)) {
					// End of string part, entering expression
					addToken('string', templateStart, pos);
					pos += 2;
					addToken('punctuation', pos - 2, pos);
					// Template expression handling simplified: just continue
					break;
				} else if (startsWithAt(grammar.templateLiteralEnd, pos)) {
					pos += grammar.templateLiteralEnd.length;
					state = { ...state, templateDepth: state.templateDepth - 1 };
					break;
				} else {
					pos++;
				}
			}

			if (pos > templateStart) {
				addToken('string', templateStart, pos);
			}
			continue;
		}

		// Handle whitespace - create a token for it to preserve indentation
		if (/\s/.test(line[pos] || '')) {
			const wsStart = pos;
			while (pos < line.length && /\s/.test(line[pos] || '')) {
				pos++;
			}
			addToken('text', wsStart, pos);
			continue;
		}

		// Check for line comment
		if (grammar.lineComment && startsWithAt(grammar.lineComment, pos)) {
			addToken('comment', pos, line.length);
			pos = line.length;
			continue;
		}

		// Check for block comment start
		if (grammar.blockCommentStart && startsWithAt(grammar.blockCommentStart, pos)) {
			const commentStart = pos;
			pos += grammar.blockCommentStart.length;

			// Look for end on same line
			let foundEnd = false;
			while (pos < line.length && grammar.blockCommentEnd) {
				if (grammar.nestedComments && startsWithAt(grammar.blockCommentStart, pos)) {
					state = { ...state, commentDepth: state.commentDepth + 1 };
					pos += grammar.blockCommentStart.length;
				} else if (startsWithAt(grammar.blockCommentEnd, pos)) {
					if (grammar.nestedComments && state.commentDepth > 0) {
						state = { ...state, commentDepth: state.commentDepth - 1 };
						pos += grammar.blockCommentEnd.length;
					} else {
						pos += grammar.blockCommentEnd.length;
						foundEnd = true;
						break;
					}
				} else {
					pos++;
				}
			}

			if (!foundEnd) {
				state = { ...state, inComment: true };
			}

			addToken('comment', commentStart, pos);
			continue;
		}

		// Check for template literal start
		if (grammar.templateLiteralStart && startsWithAt(grammar.templateLiteralStart, pos)) {
			const templateStart = pos;
			pos += grammar.templateLiteralStart.length;

			while (pos < line.length && grammar.templateLiteralEnd) {
				if (line[pos] === '\\' && pos + 1 < line.length) {
					pos += 2;
				} else if (startsWithAt('${', pos)) {
					addToken('string', templateStart, pos);
					pos += 2;
					addToken('punctuation', pos - 2, pos);
					state = { ...state, templateDepth: state.templateDepth + 1 };
					break;
				} else if (startsWithAt(grammar.templateLiteralEnd, pos)) {
					pos += grammar.templateLiteralEnd.length;
					addToken('string', templateStart, pos);
					break;
				} else {
					pos++;
				}
			}

			if (pos >= line.length && pos > templateStart + 1) {
				state = { ...state, templateDepth: state.templateDepth + 1 };
				addToken('string', templateStart, pos);
			}
			continue;
		}

		// Check for strings (check longer delimiters first for triple-quoted strings)
		let foundString = false;
		const sortedDelimiters = [...grammar.stringDelimiters].sort((a, b) => b.length - a.length);
		for (const delimiter of sortedDelimiters) {
			if (startsWithAt(delimiter, pos)) {
				const stringStart = pos;
				pos += delimiter.length;

				// Look for closing delimiter
				while (pos < line.length) {
					if (line[pos] === '\\' && pos + 1 < line.length) {
						pos += 2;
					} else if (
						(delimiter.length === 3 && startsWithAt(delimiter, pos)) ||
						(delimiter.length === 1 && line[pos] === delimiter)
					) {
						pos += delimiter.length;
						break;
					} else {
						pos++;
					}
				}

				// Check if string is unclosed (multi-line)
				if (pos >= line.length && delimiter.length === 3) {
					// Multi-line strings (Python triple quotes)
					state = { ...state, inString: delimiter };
				}

				addToken('string', stringStart, pos);
				foundString = true;
				break;
			}
		}
		if (foundString) continue;

		// Check for numbers
		const numMatch = grammar.numberPattern.exec(line.slice(pos));
		if (numMatch && numMatch.index === 0) {
			addToken('number', pos, pos + numMatch[0].length);
			pos += numMatch[0].length;
			continue;
		}

		// Check for identifiers and keywords
		const idMatch = grammar.identifierPattern.exec(line.slice(pos));
		if (idMatch && idMatch.index === 0) {
			const word = idMatch[0];
			let type: TokenType = 'identifier';

			if (grammar.keywords.has(word)) {
				type = 'keyword';
			} else if (grammar.constants.has(word)) {
				type = 'constant';
			} else if (grammar.builtins.has(word)) {
				type = 'builtin';
			} else if (grammar.types.has(word)) {
				type = 'type';
			} else if (/^[A-Z]/.test(word)) {
				// Pascal case is typically a type
				type = 'type';
			}

			// Check if followed by ( for function calls
			const afterWord = line.slice(pos + word.length).trimStart();
			if (afterWord.startsWith('(') && type === 'identifier') {
				type = 'function';
			}

			addToken(type, pos, pos + word.length);
			pos += word.length;
			continue;
		}

		// Check for operators
		const opMatch = grammar.operators.exec(line.slice(pos));
		if (opMatch && opMatch.index === 0) {
			addToken('operator', pos, pos + opMatch[0].length);
			pos += opMatch[0].length;
			continue;
		}

		// Punctuation
		const char = line[pos] || '';
		if (/[()[\]{},;.]/.test(char)) {
			addToken('punctuation', pos, pos + 1);
			pos++;
			continue;
		}

		// Unknown character, skip
		pos++;
	}

	return {
		text: line,
		tokens,
		startState,
		endState: state,
	};
}

// =============================================================================
// HIGHLIGHTING
// =============================================================================

/**
 * Highlights text and caches the results.
 *
 * @param cache - The highlight cache
 * @param text - The full text to highlight
 * @returns Array of line entries
 */
export function highlightWithCache(cache: HighlightCache, text: string): readonly LineEntry[] {
	const lines = text.split('\n');
	cache.lineCount = lines.length;

	// If full invalidate, clear and rebuild
	if (cache.fullInvalidate) {
		cache.entries.clear();
		cache.dirty.clear();
		cache.fullInvalidate = false;
	}

	const result: LineEntry[] = [];
	let currentState = EMPTY_STATE;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		const cached = cache.entries.get(i);

		// Check if cached entry is still valid
		if (
			cached &&
			cached.text === line &&
			statesEqual(cached.startState, currentState) &&
			!cache.dirty.has(i)
		) {
			result.push(cached);
			currentState = cached.endState;
		} else {
			// Tokenize and cache
			const entry = tokenizeLine(cache.grammar, line, currentState);
			cache.entries.set(i, entry);
			cache.dirty.delete(i);
			result.push(entry);
			currentState = entry.endState;

			// If end state changed, invalidate next line
			const nextCached = cache.entries.get(i + 1);
			if (nextCached && !statesEqual(currentState, nextCached.startState)) {
				cache.dirty.add(i + 1);
			}
		}
	}

	return result;
}

/**
 * Highlights visible lines first, then continues in background.
 *
 * @param cache - The highlight cache
 * @param text - The full text to highlight
 * @param startLine - First visible line
 * @param endLine - Last visible line (exclusive)
 * @returns Result with visible lines and continuation info
 */
export function highlightVisibleFirst(
	cache: HighlightCache,
	text: string,
	startLine: number,
	endLine: number,
): HighlightResult {
	const startTime = performance.now();
	const lines = text.split('\n');
	cache.lineCount = lines.length;

	// Clamp range
	const start = Math.max(0, startLine);
	const end = Math.min(lines.length, endLine);

	if (cache.fullInvalidate) {
		cache.entries.clear();
		cache.dirty.clear();
		cache.fullInvalidate = false;
	}

	// First, we need to know the state at startLine
	// This requires processing all lines before startLine (but we can use cache)
	let currentState = EMPTY_STATE;

	// Process lines before visible range (using cache where possible)
	for (let i = 0; i < start; i++) {
		const line = lines[i] ?? '';
		const cached = cache.entries.get(i);

		if (
			cached &&
			cached.text === line &&
			statesEqual(cached.startState, currentState) &&
			!cache.dirty.has(i)
		) {
			currentState = cached.endState;
		} else {
			const entry = tokenizeLine(cache.grammar, line, currentState);
			cache.entries.set(i, entry);
			cache.dirty.delete(i);
			currentState = entry.endState;
		}
	}

	// Now highlight the visible range
	const result: LineEntry[] = [];

	for (let i = start; i < end; i++) {
		const line = lines[i] ?? '';
		const cached = cache.entries.get(i);

		if (
			cached &&
			cached.text === line &&
			statesEqual(cached.startState, currentState) &&
			!cache.dirty.has(i)
		) {
			result.push(cached);
			currentState = cached.endState;
		} else {
			const entry = tokenizeLine(cache.grammar, line, currentState);
			cache.entries.set(i, entry);
			cache.dirty.delete(i);
			result.push(entry);
			currentState = entry.endState;
		}
	}

	const hasMore = end < lines.length;
	const timeMs = performance.now() - startTime;

	return {
		lines: result,
		hasMore,
		nextLine: end,
		timeMs,
	};
}

/**
 * Continues highlighting from a specific line.
 *
 * @param cache - The highlight cache
 * @param text - The full text to highlight
 * @param startLine - Line to start from
 * @param batchSize - Number of lines to process
 * @returns Result with continuation info
 */
export function continueHighlight(
	cache: HighlightCache,
	text: string,
	startLine: number,
	batchSize: number = DEFAULT_HIGHLIGHT_BATCH,
): HighlightResult {
	const startTime = performance.now();
	const lines = text.split('\n');
	cache.lineCount = lines.length;

	const start = Math.max(0, Math.min(startLine, lines.length));
	const end = Math.min(start + batchSize, lines.length);

	// Get state at startLine
	let currentState = EMPTY_STATE;
	const cachedBefore = cache.entries.get(start - 1);
	if (start > 0 && cachedBefore) {
		currentState = cachedBefore.endState;
	} else if (start > 0) {
		// Need to compute state up to startLine
		for (let i = 0; i < start; i++) {
			const line = lines[i] ?? '';
			const cached = cache.entries.get(i);
			if (cached && cached.text === line && statesEqual(cached.startState, currentState)) {
				currentState = cached.endState;
			} else {
				const entry = tokenizeLine(cache.grammar, line, currentState);
				cache.entries.set(i, entry);
				currentState = entry.endState;
			}
		}
	}

	// Process batch
	const result: LineEntry[] = [];

	for (let i = start; i < end; i++) {
		const line = lines[i] ?? '';
		const entry = tokenizeLine(cache.grammar, line, currentState);
		cache.entries.set(i, entry);
		cache.dirty.delete(i);
		result.push(entry);
		currentState = entry.endState;
	}

	const hasMore = end < lines.length;
	const timeMs = performance.now() - startTime;

	return {
		lines: result,
		hasMore,
		nextLine: end,
		timeMs,
	};
}

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

/**
 * Detects the language from a file extension.
 *
 * @param filename - The filename or path
 * @returns The detected grammar, or plaintext if unknown
 */
export function detectLanguage(filename: string): Grammar {
	const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

	for (const grammar of GRAMMARS) {
		if (grammar.extensions.includes(ext)) {
			return grammar;
		}
	}

	return GRAMMAR_PLAINTEXT;
}

/**
 * Detects the language from content heuristics.
 *
 * @param content - The first few lines of content
 * @returns The detected grammar, or plaintext if unknown
 */
export function detectLanguageFromContent(content: string): Grammar {
	const firstLine = content.split('\n')[0] || '';

	// Check for shebang
	if (firstLine.startsWith('#!')) {
		if (/python/.test(firstLine)) return GRAMMAR_PYTHON;
		if (/node|deno|bun/.test(firstLine)) return GRAMMAR_JAVASCRIPT;
		if (/bash|sh|zsh/.test(firstLine)) return GRAMMAR_SHELL;
	}

	// Check for common patterns
	if (/^package\s+\w+/.test(firstLine)) return GRAMMAR_GO;
	if (/^(use\s+|mod\s+|fn\s+|struct\s+|impl\s+|pub\s+)/.test(firstLine)) return GRAMMAR_RUST;
	if (/^(import|from|def|class)\s+/.test(firstLine)) return GRAMMAR_PYTHON;
	if (/^(import|export|const|let|var|function|class)\s+/.test(firstLine)) return GRAMMAR_JAVASCRIPT;
	if (/^\s*\{/.test(firstLine)) return GRAMMAR_JSON;

	return GRAMMAR_PLAINTEXT;
}

/**
 * Gets a grammar by name.
 *
 * @param name - The grammar name
 * @returns The grammar, or plaintext if not found
 */
export function getGrammarByName(name: string): Grammar {
	const lower = name.toLowerCase();
	for (const grammar of GRAMMARS) {
		if (grammar.name === lower) {
			return grammar;
		}
	}

	// Aliases
	if (lower === 'ts' || lower === 'typescript' || lower === 'tsx' || lower === 'jsx') {
		return GRAMMAR_JAVASCRIPT;
	}
	if (lower === 'py') return GRAMMAR_PYTHON;
	if (lower === 'rs') return GRAMMAR_RUST;
	if (lower === 'bash' || lower === 'sh' || lower === 'zsh') return GRAMMAR_SHELL;

	return GRAMMAR_PLAINTEXT;
}
