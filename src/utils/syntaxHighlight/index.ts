/**
 * Incremental Syntax Highlighting
 *
 * Line-based tokenization with state tracking for efficient re-highlighting.
 * Only changed lines and affected multi-line constructs are re-processed.
 *
 * @module utils/syntaxHighlight
 */

// Re-export cache management functions
export {
	clearHighlightCache,
	createHighlightCache,
	getHighlightStats,
	invalidateAllLines,
	invalidateLine,
	invalidateLines,
	setGrammar,
} from './cache';

// Re-export constants
export { DEFAULT_HIGHLIGHT_BATCH, EMPTY_STATE } from './constants';

// Re-export grammars
export {
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	GRAMMARS,
} from './grammars';
// Re-export highlighting functions
export {
	continueHighlight,
	detectLanguage,
	detectLanguageFromContent,
	getGrammarByName,
	highlightVisibleFirst,
	highlightWithCache,
} from './highlighter';

// Re-export tokenization functions
export { statesEqual, tokenizeLine } from './tokenizer';
// Re-export types
export type {
	Grammar,
	HighlightCache,
	HighlightResult,
	HighlightStats,
	LineEntry,
	LineState,
	Token,
	TokenType,
} from './types';
