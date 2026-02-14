/**
 * Tokenization logic for syntax highlighting.
 *
 * @module utils/syntaxHighlight/tokenizer
 */

import type { Grammar, LineEntry, LineState, Token, TokenType } from './types';


// =============================================================================
// TOKENIZATION
// =============================================================================

/**
 * Compares two line states for equality.
 */
export function statesEqual(a: LineState, b: LineState): boolean {
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
	const context = createTokenizeContext(grammar, line, startState, tokens);
	const stringDelimiters = getSortedDelimiters(grammar);
	const handlers = buildTokenHandlers(stringDelimiters);

	while (context.pos < line.length) {
		if (runTokenHandlers(context, handlers)) {
			continue;
		}

		context.pos++;
	}

	return {
		text: line,
		tokens: context.tokens,
		startState,
		endState: context.state,
	};
}

type TokenHandler = (context: TokenizeContext) => boolean;

function buildTokenHandlers(delimiters: readonly string[]): TokenHandler[] {
	return [
		handleInString,
		handleInComment,
		handleTemplateContinuation,
		handleWhitespace,
		handleLineComment,
		handleBlockCommentStart,
		handleTemplateStart,
		(context) => handleStringDelimiter(context, delimiters),
		handleNumber,
		handleIdentifier,
		handleOperator,
		handlePunctuation,
	];
}

function runTokenHandlers(context: TokenizeContext, handlers: readonly TokenHandler[]): boolean {
	for (const handler of handlers) {
		if (handler(context)) {
			return true;
		}
	}
	return false;
}

interface TokenizeContext {
	grammar: Grammar;
	line: string;
	tokens: Token[];
	pos: number;
	state: LineState;
	addToken: (type: TokenType, start: number, end: number) => void;
	startsWithAt: (str: string, position: number) => boolean;
}

function createTokenizeContext(
	grammar: Grammar,
	line: string,
	startState: LineState,
	tokens: Token[],
): TokenizeContext {
	return {
		grammar,
		line,
		tokens,
		pos: 0,
		state: { ...startState },
		addToken: (type, start, end) => {
			if (end > start) {
				tokens.push({ type, start, end, text: line.slice(start, end) });
			}
		},
		startsWithAt: (str, position) => line.slice(position, position + str.length) === str,
	};
}

function getSortedDelimiters(grammar: Grammar): string[] {
	return [...grammar.stringDelimiters].sort((a, b) => b.length - a.length);
}

function handleInString(context: TokenizeContext): boolean {
	if (context.state.inString === null) {
		return false;
	}
	const quote = context.state.inString;
	const stringStart = context.pos;

	while (context.pos < context.line.length) {
		const char = context.line[context.pos];
		if (char === '\\' && context.pos + 1 < context.line.length) {
			context.pos += 2;
		} else if (
			(quote.length === 3 && context.startsWithAt(quote, context.pos)) ||
			(quote.length === 1 && char === quote)
		) {
			context.pos += quote.length;
			context.state = { ...context.state, inString: null };
			break;
		} else {
			context.pos++;
		}
	}

	context.addToken('string', stringStart, context.pos);
	return true;
}

function handleInComment(context: TokenizeContext): boolean {
	if (!context.state.inComment || !context.grammar.blockCommentEnd) {
		return false;
	}
	const commentStart = context.pos;

	while (context.pos < context.line.length) {
		if (
			context.grammar.nestedComments &&
			context.grammar.blockCommentStart &&
			context.startsWithAt(context.grammar.blockCommentStart, context.pos)
		) {
			context.state = { ...context.state, commentDepth: context.state.commentDepth + 1 };
			context.pos += context.grammar.blockCommentStart.length;
		} else if (context.startsWithAt(context.grammar.blockCommentEnd, context.pos)) {
			if (context.grammar.nestedComments && context.state.commentDepth > 0) {
				context.state = { ...context.state, commentDepth: context.state.commentDepth - 1 };
				context.pos += context.grammar.blockCommentEnd.length;
			} else {
				context.pos += context.grammar.blockCommentEnd.length;
				context.state = { ...context.state, inComment: false, commentDepth: 0 };
				break;
			}
		} else {
			context.pos++;
		}
	}

	context.addToken('comment', commentStart, context.pos);
	return true;
}

function handleTemplateContinuation(context: TokenizeContext): boolean {
	if (context.state.templateDepth <= 0 || !context.grammar.templateLiteralEnd) {
		return false;
	}
	const templateStart = context.pos;

	while (context.pos < context.line.length) {
		if (context.line[context.pos] === '\\' && context.pos + 1 < context.line.length) {
			context.pos += 2;
		} else if (context.startsWithAt('${', context.pos)) {
			context.addToken('string', templateStart, context.pos);
			context.pos += 2;
			context.addToken('punctuation', context.pos - 2, context.pos);
			break;
		} else if (context.startsWithAt(context.grammar.templateLiteralEnd, context.pos)) {
			context.pos += context.grammar.templateLiteralEnd.length;
			context.state = { ...context.state, templateDepth: context.state.templateDepth - 1 };
			break;
		} else {
			context.pos++;
		}
	}

	if (context.pos > templateStart) {
		context.addToken('string', templateStart, context.pos);
	}
	return true;
}

function handleWhitespace(context: TokenizeContext): boolean {
	if (!/\s/.test(context.line[context.pos] || '')) {
		return false;
	}
	const wsStart = context.pos;
	while (context.pos < context.line.length && /\s/.test(context.line[context.pos] || '')) {
		context.pos++;
	}
	context.addToken('text', wsStart, context.pos);
	return true;
}

function handleLineComment(context: TokenizeContext): boolean {
	if (
		!context.grammar.lineComment ||
		!context.startsWithAt(context.grammar.lineComment, context.pos)
	) {
		return false;
	}
	context.addToken('comment', context.pos, context.line.length);
	context.pos = context.line.length;
	return true;
}

function handleBlockCommentStart(context: TokenizeContext): boolean {
	if (
		!context.grammar.blockCommentStart ||
		!context.startsWithAt(context.grammar.blockCommentStart, context.pos)
	) {
		return false;
	}
	const commentStart = context.pos;
	const foundEnd = scanBlockComment(context);

	if (!foundEnd) {
		context.state = { ...context.state, inComment: true };
	}

	context.addToken('comment', commentStart, context.pos);
	return true;
}

function handleTemplateStart(context: TokenizeContext): boolean {
	if (
		!context.grammar.templateLiteralStart ||
		!context.startsWithAt(context.grammar.templateLiteralStart, context.pos)
	) {
		return false;
	}
	const templateStart = context.pos;
	context.pos += context.grammar.templateLiteralStart.length;

	while (context.pos < context.line.length && context.grammar.templateLiteralEnd) {
		if (context.line[context.pos] === '\\' && context.pos + 1 < context.line.length) {
			context.pos += 2;
		} else if (context.startsWithAt('${', context.pos)) {
			context.addToken('string', templateStart, context.pos);
			context.pos += 2;
			context.addToken('punctuation', context.pos - 2, context.pos);
			context.state = { ...context.state, templateDepth: context.state.templateDepth + 1 };
			break;
		} else if (context.startsWithAt(context.grammar.templateLiteralEnd, context.pos)) {
			context.pos += context.grammar.templateLiteralEnd.length;
			context.addToken('string', templateStart, context.pos);
			break;
		} else {
			context.pos++;
		}
	}

	if (context.pos >= context.line.length && context.pos > templateStart + 1) {
		context.state = { ...context.state, templateDepth: context.state.templateDepth + 1 };
		context.addToken('string', templateStart, context.pos);
	}
	return true;
}

function handleStringDelimiter(context: TokenizeContext, delimiters: readonly string[]): boolean {
	const delimiter = findStringDelimiter(context, delimiters);
	if (!delimiter) {
		return false;
	}
	const stringStart = context.pos;
	context.pos += delimiter.length;
	scanStringLiteral(context, delimiter);

	if (context.pos >= context.line.length && delimiter.length === 3) {
		context.state = { ...context.state, inString: delimiter };
	}

	context.addToken('string', stringStart, context.pos);
	return true;
}

function scanBlockComment(context: TokenizeContext): boolean {
	if (!context.grammar.blockCommentStart || !context.grammar.blockCommentEnd) {
		return false;
	}
	context.pos += context.grammar.blockCommentStart.length;
	while (context.pos < context.line.length) {
		if (
			context.grammar.nestedComments &&
			context.startsWithAt(context.grammar.blockCommentStart, context.pos)
		) {
			context.state = { ...context.state, commentDepth: context.state.commentDepth + 1 };
			context.pos += context.grammar.blockCommentStart.length;
			continue;
		}
		if (context.startsWithAt(context.grammar.blockCommentEnd, context.pos)) {
			if (context.grammar.nestedComments && context.state.commentDepth > 0) {
				context.state = { ...context.state, commentDepth: context.state.commentDepth - 1 };
				context.pos += context.grammar.blockCommentEnd.length;
				continue;
			}
			context.pos += context.grammar.blockCommentEnd.length;
			return true;
		}
		context.pos++;
	}
	return false;
}

function findStringDelimiter(
	context: TokenizeContext,
	delimiters: readonly string[],
): string | null {
	for (const delimiter of delimiters) {
		if (context.startsWithAt(delimiter, context.pos)) {
			return delimiter;
		}
	}
	return null;
}

function scanStringLiteral(context: TokenizeContext, delimiter: string): void {
	while (context.pos < context.line.length) {
		if (context.line[context.pos] === '\\' && context.pos + 1 < context.line.length) {
			context.pos += 2;
			continue;
		}
		if (
			(delimiter.length === 3 && context.startsWithAt(delimiter, context.pos)) ||
			(delimiter.length === 1 && context.line[context.pos] === delimiter)
		) {
			context.pos += delimiter.length;
			break;
		}
		context.pos++;
	}
}

function handleNumber(context: TokenizeContext): boolean {
	const numMatch = context.grammar.numberPattern.exec(context.line.slice(context.pos));
	if (!numMatch || numMatch.index !== 0) {
		return false;
	}
	context.addToken('number', context.pos, context.pos + numMatch[0].length);
	context.pos += numMatch[0].length;
	return true;
}

function handleIdentifier(context: TokenizeContext): boolean {
	const idMatch = context.grammar.identifierPattern.exec(context.line.slice(context.pos));
	if (!idMatch || idMatch.index !== 0) {
		return false;
	}
	const word = idMatch[0];
	let type: TokenType = 'identifier';

	if (context.grammar.keywords.has(word)) {
		type = 'keyword';
	} else if (context.grammar.constants.has(word)) {
		type = 'constant';
	} else if (context.grammar.builtins.has(word)) {
		type = 'builtin';
	} else if (context.grammar.types.has(word)) {
		type = 'type';
	} else if (/^[A-Z]/.test(word)) {
		type = 'type';
	}

	const afterWord = context.line.slice(context.pos + word.length).trimStart();
	if (afterWord.startsWith('(') && type === 'identifier') {
		type = 'function';
	}

	context.addToken(type, context.pos, context.pos + word.length);
	context.pos += word.length;
	return true;
}

function handleOperator(context: TokenizeContext): boolean {
	const opMatch = context.grammar.operators.exec(context.line.slice(context.pos));
	if (!opMatch || opMatch.index !== 0) {
		return false;
	}
	context.addToken('operator', context.pos, context.pos + opMatch[0].length);
	context.pos += opMatch[0].length;
	return true;
}

function handlePunctuation(context: TokenizeContext): boolean {
	const char = context.line[context.pos] || '';
	if (!/[()[\]{},;.]/.test(char)) {
		return false;
	}
	context.addToken('punctuation', context.pos, context.pos + 1);
	context.pos++;
	return true;
}

