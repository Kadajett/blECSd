/**
 * Incremental Syntax Highlighting
 *
 * Line-based tokenization with state tracking for efficient re-highlighting.
 * Only changed lines and affected multi-line constructs are re-processed.
 *
 * @module utils/syntaxHighlight
 */

export {
	clearHighlightCache,
	createHighlightCache,
	getHighlightStats,
	invalidateAllLines,
	invalidateLine,
	invalidateLines,
	setGrammar,
} from './syntaxHighlight/cache';

export {
	DEFAULT_HIGHLIGHT_BATCH,
	EMPTY_STATE,
} from './syntaxHighlight/constants';

export {
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	GRAMMARS,
} from './syntaxHighlight/grammars';
export {
	continueHighlight,
	detectLanguage,
	detectLanguageFromContent,
	getGrammarByName,
	highlightVisibleFirst,
	highlightWithCache,
} from './syntaxHighlight/highlighter';

export { statesEqual, tokenizeLine } from './syntaxHighlight/tokenizer';
// Re-export everything from the new modular structure
export type {
	Grammar,
	HighlightCache,
	HighlightResult,
	HighlightStats,
	LineEntry,
	LineState,
	Token,
	TokenType,
} from './syntaxHighlight/types';
