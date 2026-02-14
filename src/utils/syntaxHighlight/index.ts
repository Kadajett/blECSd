/**
 * Incremental Syntax Highlighting
 *
 * Line-based tokenization with state tracking for efficient re-highlighting.
 * Only changed lines and affected multi-line constructs are re-processed.
 *
 * @module utils/syntaxHighlight
 */

// Re-export types
export type { Token, TokenType, LineState, LineEntry, Grammar, HighlightCache, HighlightResult, HighlightStats } from './types';

// Re-export constants
export { DEFAULT_HIGHLIGHT_BATCH, EMPTY_STATE } from './constants';

// Re-export grammars
export {
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_GO,
	GRAMMAR_SHELL,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMARS,
} from './grammars';

// Re-export cache management functions
export {
	createHighlightCache,
	clearHighlightCache,
	setGrammar,
	getHighlightStats,
	invalidateLines,
	invalidateLine,
	invalidateAllLines,
} from './cache';

// Re-export tokenization functions
export { tokenizeLine, statesEqual } from './tokenizer';

// Re-export highlighting functions
export {
	highlightWithCache,
	highlightVisibleFirst,
	continueHighlight,
	detectLanguage,
	detectLanguageFromContent,
	getGrammarByName,
} from './highlighter';
