/**
 * Type definitions for syntax highlighting.
 *
 * @module utils/syntaxHighlight/types
 */

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
