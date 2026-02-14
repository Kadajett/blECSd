/**
 * Language grammar definitions for syntax highlighting.
 *
 * @module utils/syntaxHighlight/grammars
 */

// Re-export all grammars from sub-modules
export { GRAMMAR_JAVASCRIPT, GRAMMAR_PYTHON } from './grammars-web';
export { GRAMMAR_RUST, GRAMMAR_GO } from './grammars-systems';
export { GRAMMAR_SHELL, GRAMMAR_JSON, GRAMMAR_PLAINTEXT, GRAMMARS } from './grammars-other';
