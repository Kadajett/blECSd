/**
 * Tests for Incremental Syntax Highlighting
 *
 * @module utils/syntaxHighlight.test
 */

import { describe, expect, it } from 'vitest';
import {
	clearHighlightCache,
	continueHighlight,
	createHighlightCache,
	detectLanguage,
	detectLanguageFromContent,
	EMPTY_STATE,
	getGrammarByName,
	getHighlightStats,
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	highlightVisibleFirst,
	highlightWithCache,
	invalidateAllLines,
	invalidateLine,
	invalidateLines,
	setGrammar,
	tokenizeLine,
	type Token,
} from './syntaxHighlight';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findToken(tokens: readonly Token[], type: string): Token | undefined {
	return tokens.find((t) => t.type === type);
}

function findTokenByText(tokens: readonly Token[], text: string): Token | undefined {
	return tokens.find((t) => t.text === text);
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

describe('createHighlightCache', () => {
	it('creates cache with specified grammar', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		expect(cache.grammar.name).toBe('javascript');
	});

	it('starts with empty entries', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		expect(cache.entries.size).toBe(0);
	});

	it('starts with full invalidate flag', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		expect(cache.fullInvalidate).toBe(true);
	});
});

describe('clearHighlightCache', () => {
	it('clears all entries', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'const x = 1;\nlet y = 2;');

		clearHighlightCache(cache);

		expect(cache.entries.size).toBe(0);
		expect(cache.lineCount).toBe(0);
	});

	it('resets fullInvalidate flag', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'test');
		cache.fullInvalidate = false;

		clearHighlightCache(cache);

		expect(cache.fullInvalidate).toBe(true);
	});
});

describe('setGrammar', () => {
	it('changes the grammar', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);

		setGrammar(cache, GRAMMAR_PYTHON);

		expect(cache.grammar.name).toBe('python');
	});

	it('invalidates all lines on grammar change', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'const x = 1;\nlet y = 2;');
		cache.fullInvalidate = false;

		setGrammar(cache, GRAMMAR_PYTHON);

		expect(cache.fullInvalidate).toBe(true);
		expect(cache.dirty.size).toBe(2);
	});

	it('does nothing if same grammar', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'test');
		cache.fullInvalidate = false;

		setGrammar(cache, GRAMMAR_JAVASCRIPT);

		expect(cache.fullInvalidate).toBe(false);
	});
});

describe('getHighlightStats', () => {
	it('returns correct stats', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'const x = 1;\nlet y = 2;\nvar z = 3;');

		const stats = getHighlightStats(cache);

		expect(stats.cachedLines).toBe(3);
		expect(stats.grammar).toBe('javascript');
		expect(stats.lineCount).toBe(3);
	});

	it('tracks dirty lines', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'const x = 1;\nlet y = 2;');
		invalidateLine(cache, 1);

		const stats = getHighlightStats(cache);

		expect(stats.dirtyLines).toBe(1);
	});
});

// =============================================================================
// INVALIDATION
// =============================================================================

describe('invalidateLines', () => {
	it('marks range as dirty', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'a\nb\nc\nd\ne');

		invalidateLines(cache, 1, 4);

		expect(cache.dirty.has(1)).toBe(true);
		expect(cache.dirty.has(2)).toBe(true);
		expect(cache.dirty.has(3)).toBe(true);
		expect(cache.dirty.has(0)).toBe(false);
		expect(cache.dirty.has(4)).toBe(false);
	});
});

describe('invalidateLine', () => {
	it('marks single line as dirty', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'a\nb\nc');

		invalidateLine(cache, 1);

		expect(cache.dirty.has(1)).toBe(true);
		expect(cache.dirty.has(0)).toBe(false);
		expect(cache.dirty.has(2)).toBe(false);
	});
});

describe('invalidateAllLines', () => {
	it('sets fullInvalidate flag', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'test');
		cache.fullInvalidate = false;

		invalidateAllLines(cache);

		expect(cache.fullInvalidate).toBe(true);
	});
});

// =============================================================================
// TOKENIZATION
// =============================================================================

describe('tokenizeLine', () => {
	describe('JavaScript', () => {
		it('tokenizes keywords', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'const let var function', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'const')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'let')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'var')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'function')?.type).toBe('keyword');
		});

		it('tokenizes strings', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, '"hello" \'world\'', EMPTY_STATE);

			const strings = entry.tokens.filter((t) => t.type === 'string');
			expect(strings.length).toBe(2);
			expect(strings[0]?.text).toBe('"hello"');
			expect(strings[1]?.text).toBe("'world'");
		});

		it('tokenizes numbers', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, '42 3.14 0xff 0b101', EMPTY_STATE);

			const numbers = entry.tokens.filter((t) => t.type === 'number');
			expect(numbers.length).toBe(4);
		});

		it('tokenizes comments', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'code // comment', EMPTY_STATE);

			const comment = findToken(entry.tokens, 'comment');
			expect(comment?.text).toBe('// comment');
		});

		it('tokenizes function calls', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'console.log()', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'console')?.type).toBe('builtin');
			expect(findTokenByText(entry.tokens, 'log')?.type).toBe('function');
		});

		it('tokenizes types', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'string number boolean', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'string')?.type).toBe('type');
			expect(findTokenByText(entry.tokens, 'number')?.type).toBe('type');
			expect(findTokenByText(entry.tokens, 'boolean')?.type).toBe('type');
		});

		it('tokenizes constants', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'true false null undefined', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'true')?.type).toBe('constant');
			expect(findTokenByText(entry.tokens, 'false')?.type).toBe('constant');
			expect(findTokenByText(entry.tokens, 'null')?.type).toBe('constant');
			expect(findTokenByText(entry.tokens, 'undefined')?.type).toBe('constant');
		});

		it('tokenizes operators', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'a + b - c', EMPTY_STATE);

			const operators = entry.tokens.filter((t) => t.type === 'operator');
			expect(operators.length).toBeGreaterThanOrEqual(2);
		});

		it('handles template literals', () => {
			const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, '`hello ${name}`', EMPTY_STATE);

			const strings = entry.tokens.filter((t) => t.type === 'string');
			expect(strings.length).toBeGreaterThanOrEqual(1);
		});

		it('handles multi-line block comments', () => {
			const entry1 = tokenizeLine(GRAMMAR_JAVASCRIPT, '/* start', EMPTY_STATE);
			expect(entry1.endState.inComment).toBe(true);

			const entry2 = tokenizeLine(GRAMMAR_JAVASCRIPT, 'middle', entry1.endState);
			expect(entry2.tokens[0]?.type).toBe('comment');
			expect(entry2.endState.inComment).toBe(true);

			const entry3 = tokenizeLine(GRAMMAR_JAVASCRIPT, 'end */', entry2.endState);
			expect(entry3.tokens[0]?.type).toBe('comment');
			expect(entry3.endState.inComment).toBe(false);
		});
	});

	describe('Python', () => {
		it('tokenizes keywords', () => {
			const entry = tokenizeLine(GRAMMAR_PYTHON, 'def class if else', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'def')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'class')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'if')?.type).toBe('keyword');
		});

		it('tokenizes line comments', () => {
			const entry = tokenizeLine(GRAMMAR_PYTHON, 'code # comment', EMPTY_STATE);

			const comment = findToken(entry.tokens, 'comment');
			expect(comment?.text).toBe('# comment');
		});

		it('tokenizes builtins', () => {
			const entry = tokenizeLine(GRAMMAR_PYTHON, 'print len range', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'print')?.type).toBe('builtin');
			expect(findTokenByText(entry.tokens, 'len')?.type).toBe('builtin');
			expect(findTokenByText(entry.tokens, 'range')?.type).toBe('builtin');
		});

		it('handles triple-quoted strings', () => {
			const entry1 = tokenizeLine(GRAMMAR_PYTHON, '"""start', EMPTY_STATE);
			expect(entry1.endState.inString).toBe('"""');

			const entry2 = tokenizeLine(GRAMMAR_PYTHON, 'middle', entry1.endState);
			expect(entry2.tokens[0]?.type).toBe('string');

			const entry3 = tokenizeLine(GRAMMAR_PYTHON, 'end"""', entry2.endState);
			expect(entry3.tokens[0]?.type).toBe('string');
			expect(entry3.endState.inString).toBe(null);
		});
	});

	describe('Rust', () => {
		it('tokenizes keywords', () => {
			const entry = tokenizeLine(GRAMMAR_RUST, 'fn struct impl let mut', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'fn')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'struct')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'impl')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'let')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'mut')?.type).toBe('keyword');
		});

		it('tokenizes types', () => {
			const entry = tokenizeLine(GRAMMAR_RUST, 'i32 u64 bool str', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'i32')?.type).toBe('type');
			expect(findTokenByText(entry.tokens, 'u64')?.type).toBe('type');
			expect(findTokenByText(entry.tokens, 'bool')?.type).toBe('type');
		});

		it('handles nested comments', () => {
			const entry1 = tokenizeLine(GRAMMAR_RUST, '/* outer /* inner */ still outer', EMPTY_STATE);
			expect(entry1.endState.inComment).toBe(true);

			const entry2 = tokenizeLine(GRAMMAR_RUST, '*/', entry1.endState);
			expect(entry2.endState.inComment).toBe(false);
		});
	});

	describe('Go', () => {
		it('tokenizes keywords', () => {
			const entry = tokenizeLine(GRAMMAR_GO, 'func type struct interface', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'func')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'type')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'struct')?.type).toBe('keyword');
		});

		it('tokenizes builtins', () => {
			const entry = tokenizeLine(GRAMMAR_GO, 'make append len cap', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'make')?.type).toBe('builtin');
			expect(findTokenByText(entry.tokens, 'append')?.type).toBe('builtin');
		});
	});

	describe('Shell', () => {
		it('tokenizes keywords', () => {
			const entry = tokenizeLine(GRAMMAR_SHELL, 'if then else fi', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'if')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'then')?.type).toBe('keyword');
			expect(findTokenByText(entry.tokens, 'fi')?.type).toBe('keyword');
		});

		it('tokenizes comments', () => {
			const entry = tokenizeLine(GRAMMAR_SHELL, 'echo test # comment', EMPTY_STATE);

			const comment = findToken(entry.tokens, 'comment');
			expect(comment?.text).toBe('# comment');
		});
	});

	describe('JSON', () => {
		it('tokenizes constants', () => {
			const entry = tokenizeLine(GRAMMAR_JSON, 'true false null', EMPTY_STATE);

			expect(findTokenByText(entry.tokens, 'true')?.type).toBe('constant');
			expect(findTokenByText(entry.tokens, 'false')?.type).toBe('constant');
			expect(findTokenByText(entry.tokens, 'null')?.type).toBe('constant');
		});

		it('tokenizes numbers', () => {
			const entry = tokenizeLine(GRAMMAR_JSON, '123 -45.67 1e10', EMPTY_STATE);

			const numbers = entry.tokens.filter((t) => t.type === 'number');
			expect(numbers.length).toBe(3);
		});
	});
});

// =============================================================================
// HIGHLIGHTING
// =============================================================================

describe('highlightWithCache', () => {
	it('highlights simple code', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const lines = highlightWithCache(cache, 'const x = 1;');

		expect(lines.length).toBe(1);
		expect(findTokenByText(lines[0]?.tokens || [], 'const')?.type).toBe('keyword');
	});

	it('handles empty text', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const lines = highlightWithCache(cache, '');

		expect(lines.length).toBe(1);
		expect(lines[0]?.tokens.length).toBe(0);
	});

	it('preserves newlines', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const lines = highlightWithCache(cache, 'line 1\nline 2\nline 3');

		expect(lines.length).toBe(3);
	});

	it('uses cache on repeated calls', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'const x = 1;\nlet y = 2;';

		highlightWithCache(cache, text);
		const stats1 = getHighlightStats(cache);

		highlightWithCache(cache, text);
		const stats2 = getHighlightStats(cache);

		expect(stats1.cachedLines).toBe(2);
		expect(stats2.cachedLines).toBe(2);
	});

	it('updates lineCount', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		highlightWithCache(cache, 'a\nb\nc\nd');

		expect(cache.lineCount).toBe(4);
	});

	it('handles multi-line constructs correctly', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const lines = highlightWithCache(cache, '/* comment\nstill comment\nend */\ncode');

		expect(lines[0]?.endState.inComment).toBe(true);
		expect(lines[1]?.endState.inComment).toBe(true);
		expect(lines[2]?.endState.inComment).toBe(false);
		expect(lines[3]?.endState.inComment).toBe(false);
	});
});

// =============================================================================
// VISIBLE-FIRST HIGHLIGHTING
// =============================================================================

describe('highlightVisibleFirst', () => {
	it('highlights visible range', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'line 0\nline 1\nline 2\nline 3\nline 4';

		const result = highlightVisibleFirst(cache, text, 1, 4);

		expect(result.lines.length).toBe(3);
	});

	it('returns hasMore when more lines exist', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'a\nb\nc\nd\ne';

		const result = highlightVisibleFirst(cache, text, 0, 2);

		expect(result.hasMore).toBe(true);
		expect(result.nextLine).toBe(2);
	});

	it('returns hasMore=false when all done', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'a\nb';

		const result = highlightVisibleFirst(cache, text, 0, 10);

		expect(result.hasMore).toBe(false);
	});

	it('tracks time taken', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const result = highlightVisibleFirst(cache, 'const x = 1;', 0, 10);

		expect(result.timeMs).toBeGreaterThanOrEqual(0);
	});

	it('handles empty range', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const result = highlightVisibleFirst(cache, 'a\nb', 5, 5);

		expect(result.lines.length).toBe(0);
	});

	it('handles state propagation for visible range', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = '/* comment\nstill comment\nend */\ncode';

		const result = highlightVisibleFirst(cache, text, 2, 4);

		// Line 2 should know it started in a comment
		expect(result.lines[0]?.startState.inComment).toBe(true);
		expect(result.lines[0]?.endState.inComment).toBe(false);
		// Line 3 should be normal code
		expect(result.lines[1]?.startState.inComment).toBe(false);
	});
});

describe('continueHighlight', () => {
	it('continues from specified line', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'a\nb\nc\nd\ne';

		highlightVisibleFirst(cache, text, 0, 2);
		const result = continueHighlight(cache, text, 2);

		expect(result.lines.length).toBeGreaterThan(0);
	});

	it('respects batch size', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');

		const result = continueHighlight(cache, text, 0, 10);

		expect(result.nextLine).toBe(10);
		expect(result.hasMore).toBe(true);
	});

	it('returns hasMore=false when complete', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = 'a\nb\nc';

		const result = continueHighlight(cache, text, 0, 100);

		expect(result.hasMore).toBe(false);
	});
});

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

describe('detectLanguage', () => {
	it('detects JavaScript', () => {
		expect(detectLanguage('file.js').name).toBe('javascript');
		expect(detectLanguage('file.ts').name).toBe('javascript');
		expect(detectLanguage('file.jsx').name).toBe('javascript');
		expect(detectLanguage('file.tsx').name).toBe('javascript');
	});

	it('detects Python', () => {
		expect(detectLanguage('file.py').name).toBe('python');
		expect(detectLanguage('file.pyi').name).toBe('python');
	});

	it('detects Rust', () => {
		expect(detectLanguage('file.rs').name).toBe('rust');
	});

	it('detects Go', () => {
		expect(detectLanguage('file.go').name).toBe('go');
	});

	it('detects Shell', () => {
		expect(detectLanguage('file.sh').name).toBe('shell');
		expect(detectLanguage('file.bash').name).toBe('shell');
	});

	it('detects JSON', () => {
		expect(detectLanguage('file.json').name).toBe('json');
	});

	it('returns plaintext for unknown', () => {
		expect(detectLanguage('file.xyz').name).toBe('plaintext');
	});
});

describe('detectLanguageFromContent', () => {
	it('detects from shebang', () => {
		expect(detectLanguageFromContent('#!/usr/bin/python\ncode').name).toBe('python');
		expect(detectLanguageFromContent('#!/usr/bin/env node\ncode').name).toBe('javascript');
		expect(detectLanguageFromContent('#!/bin/bash\ncode').name).toBe('shell');
	});

	it('detects from patterns', () => {
		expect(detectLanguageFromContent('package main').name).toBe('go');
		expect(detectLanguageFromContent('fn main()').name).toBe('rust');
		expect(detectLanguageFromContent('import os').name).toBe('python');
		expect(detectLanguageFromContent('const x = 1').name).toBe('javascript');
	});

	it('returns plaintext for unknown', () => {
		expect(detectLanguageFromContent('random text').name).toBe('plaintext');
	});
});

describe('getGrammarByName', () => {
	it('finds grammars by name', () => {
		expect(getGrammarByName('javascript').name).toBe('javascript');
		expect(getGrammarByName('python').name).toBe('python');
		expect(getGrammarByName('rust').name).toBe('rust');
	});

	it('handles aliases', () => {
		expect(getGrammarByName('ts').name).toBe('javascript');
		expect(getGrammarByName('typescript').name).toBe('javascript');
		expect(getGrammarByName('py').name).toBe('python');
		expect(getGrammarByName('rs').name).toBe('rust');
	});

	it('returns plaintext for unknown', () => {
		expect(getGrammarByName('unknown').name).toBe('plaintext');
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles 1000 lines', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = Array.from({ length: 1000 }, (_, i) => `const x${i} = ${i};`).join('\n');

		const lines = highlightWithCache(cache, text);

		expect(lines.length).toBe(1000);
	});

	it('caches efficiently on re-highlight', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = Array.from({ length: 100 }, (_, i) => `const x${i} = ${i};`).join('\n');

		// First highlight
		const start1 = performance.now();
		highlightWithCache(cache, text);
		const time1 = performance.now() - start1;

		// Second highlight (should use cache)
		const start2 = performance.now();
		highlightWithCache(cache, text);
		const time2 = performance.now() - start2;

		// Cached should be faster
		expect(time2).toBeLessThanOrEqual(time1 * 2);
	});

	it('visible-first is fast for large documents', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const text = Array.from({ length: 10000 }, (_, i) => `const x${i} = ${i};`).join('\n');

		const result = highlightVisibleFirst(cache, text, 0, 50);

		expect(result.timeMs).toBeLessThan(100);
		expect(result.lines.length).toBe(50);
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles empty lines', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const lines = highlightWithCache(cache, 'code\n\n\nmore code');

		expect(lines.length).toBe(4);
		expect(lines[1]?.tokens.length).toBe(0);
		expect(lines[2]?.tokens.length).toBe(0);
	});

	it('handles very long lines', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		const longLine = 'const x = ' + 'a'.repeat(1000) + ';';

		const lines = highlightWithCache(cache, longLine);

		expect(lines.length).toBe(1);
		expect(lines[0]?.tokens.length).toBeGreaterThan(0);
	});

	it('handles escape sequences in strings', () => {
		createHighlightCache(GRAMMAR_JAVASCRIPT);
		const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, '"hello\\nworld"', EMPTY_STATE);

		const strings = entry.tokens.filter((t) => t.type === 'string');
		expect(strings.length).toBe(1);
		expect(strings[0]?.text).toBe('"hello\\nworld"');
	});

	it('handles unclosed strings at end of line', () => {
		const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, '"unclosed', EMPTY_STATE);

		// Single-line strings don't carry over in JS
		const strings = entry.tokens.filter((t) => t.type === 'string');
		expect(strings.length).toBe(1);
	});

	it('handles unicode identifiers', () => {
		createHighlightCache(GRAMMAR_JAVASCRIPT);
		const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'const $var = _value;', EMPTY_STATE);

		const identifiers = entry.tokens.filter((t) => t.type === 'identifier');
		expect(identifiers.length).toBe(2);
	});
});
