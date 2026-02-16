/**
 * Syntax highlighting utilities namespace with incremental parsing support.
 *
 * @example
 * ```typescript
 * import { syntaxHL } from 'blecsd/utils';
 *
 * const cache = syntaxHL.createHighlightCache();
 * syntaxHL.setGrammar(cache, syntaxHL.GRAMMAR_JAVASCRIPT);
 * const result = syntaxHL.highlightWithCache(cache, lines);
 * const tokens = syntaxHL.tokenizeLine(line, syntaxHL.GRAMMAR_JAVASCRIPT);
 * ```
 */

import {
	clearHighlightCache,
	continueHighlight,
	createHighlightCache,
	DEFAULT_HIGHLIGHT_BATCH,
	detectLanguage,
	detectLanguageFromContent,
	EMPTY_STATE,
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	GRAMMARS,
	getGrammarByName,
	getHighlightStats,
	highlightVisibleFirst,
	highlightWithCache,
	invalidateAllLines,
	invalidateLine,
	invalidateLines,
	setGrammar,
	tokenizeLine,
} from '../syntaxHighlight';

export const syntaxHL = Object.freeze({
	highlightWithCache,
	createHighlightCache,
	tokenizeLine,
	detectLanguage,
	setGrammar,
	clearHighlightCache,
	highlightVisibleFirst,
	continueHighlight,
	invalidateLine,
	invalidateLines,
	invalidateAllLines,
	getHighlightStats,
	detectLanguageFromContent,
	getGrammarByName,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_GO,
	GRAMMAR_JSON,
	GRAMMAR_SHELL,
	GRAMMAR_PLAINTEXT,
	GRAMMARS,
	EMPTY_STATE,
	DEFAULT_HIGHLIGHT_BATCH,
});

export type SyntaxHLModule = typeof syntaxHL;
