/**
 * Highlighting and language detection logic.
 *
 * @module utils/syntaxHighlight/highlighter
 */

import { DEFAULT_HIGHLIGHT_BATCH, EMPTY_STATE } from './constants';
import {
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_JSON,
	GRAMMAR_PLAINTEXT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	GRAMMAR_SHELL,
	GRAMMARS,
} from './grammars';
import { statesEqual, tokenizeLine } from './tokenizer';
import type { Grammar, HighlightCache, HighlightResult, LineEntry } from './types';

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
