/**
 * Syntax highlighting for terminal code display
 *
 * Provides basic syntax highlighting using ANSI color codes for common languages.
 * Supports JavaScript/TypeScript, JSON, and Bash.
 *
 * @module text/syntaxHighlight
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Supported programming languages for syntax highlighting.
 */
export type SupportedLanguage = 'javascript' | 'typescript' | 'json' | 'bash' | 'shell' | 'sh';

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
	| 'constant'
	| 'property'
	| 'variable';

/**
 * Color configuration for syntax highlighting.
 */
export interface HighlightColors {
	/** Color for keywords (if, const, function, etc.) */
	readonly keyword: string;
	/** Color for string literals */
	readonly string: string;
	/** Color for numeric literals */
	readonly number: string;
	/** Color for comments */
	readonly comment: string;
	/** Color for operators (+, -, *, etc.) */
	readonly operator: string;
	/** Color for punctuation ({}, [], (), etc.) */
	readonly punctuation: string;
	/** Color for identifiers */
	readonly identifier: string;
	/** Color for function names */
	readonly function: string;
	/** Color for constants (true, false, null, etc.) */
	readonly constant: string;
	/** Color for object properties */
	readonly property: string;
	/** Color for variables */
	readonly variable: string;
}

/**
 * Syntax highlighting configuration.
 */
export interface HighlightConfig {
	/** Color scheme for token types */
	readonly colors?: Partial<HighlightColors>;
	/** Whether to enable syntax highlighting (default: true) */
	readonly enabled?: boolean;
}

/**
 * Zod schema for highlight configuration.
 */
export const HighlightConfigSchema = z.object({
	colors: z
		.object({
			keyword: z.string().optional(),
			string: z.string().optional(),
			number: z.string().optional(),
			comment: z.string().optional(),
			operator: z.string().optional(),
			punctuation: z.string().optional(),
			identifier: z.string().optional(),
			function: z.string().optional(),
			constant: z.string().optional(),
			property: z.string().optional(),
			variable: z.string().optional(),
		})
		.optional(),
	enabled: z.boolean().optional(),
});

// =============================================================================
// DEFAULT COLORS
// =============================================================================

/**
 * Default color scheme (inspired by popular themes).
 * Uses ANSI 256-color codes for better terminal compatibility.
 */
export const DEFAULT_COLORS: HighlightColors = {
	keyword: '\x1b[38;5;175m', // Purple
	string: '\x1b[38;5;150m', // Green
	number: '\x1b[38;5;180m', // Orange
	comment: '\x1b[38;5;245m', // Gray
	operator: '\x1b[38;5;180m', // Orange
	punctuation: '\x1b[38;5;248m', // Light gray
	identifier: '\x1b[38;5;255m', // White
	function: '\x1b[38;5;117m', // Light blue
	constant: '\x1b[38;5;209m', // Light red
	property: '\x1b[38;5;117m', // Light blue
	variable: '\x1b[38;5;255m', // White
};

const RESET = '\x1b[0m';

// =============================================================================
// TOKEN PATTERNS
// =============================================================================

/**
 * JavaScript/TypeScript keywords.
 */
const JS_KEYWORDS = new Set([
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
	'export',
	'extends',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'let',
	'new',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	// TypeScript
	'interface',
	'type',
	'enum',
	'namespace',
	'module',
	'declare',
	'abstract',
	'implements',
	'private',
	'protected',
	'public',
	'readonly',
	'as',
	'from',
	'of',
]);

/**
 * JavaScript/TypeScript constants.
 */
const JS_CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

/**
 * Bash keywords.
 */
const BASH_KEYWORDS = new Set([
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
	'time',
	'return',
	'exit',
	'break',
	'continue',
	'local',
	'readonly',
	'export',
	'declare',
	'typeset',
	'eval',
	'exec',
	'source',
	'alias',
	'unalias',
]);

// =============================================================================
// HIGHLIGHTING FUNCTIONS
// =============================================================================

/**
 * Highlights a single-line comment in JavaScript/TypeScript.
 */
function highlightJSLineComment(
	code: string,
	start: number,
	colors: HighlightColors,
): [string, number] {
	const end = code.indexOf('\n', start);
	const comment = end === -1 ? code.slice(start) : code.slice(start, end);
	return [colors.comment + comment + RESET, start + comment.length];
}

/**
 * Highlights a multi-line comment in JavaScript/TypeScript.
 */
function highlightJSMultiLineComment(
	code: string,
	start: number,
	colors: HighlightColors,
): [string, number] {
	const end = code.indexOf('*/', start + 2);
	const comment = end === -1 ? code.slice(start) : code.slice(start, end + 2);
	return [colors.comment + comment + RESET, start + comment.length];
}

/**
 * Highlights a string literal in JavaScript/TypeScript.
 */
function highlightJSString(
	code: string,
	start: number,
	quote: string,
	colors: HighlightColors,
): [string, number] {
	let j = start + 1;
	let escaped = false;

	while (j < code.length) {
		if (escaped) {
			escaped = false;
			j++;
			continue;
		}
		if (code[j] === '\\') {
			escaped = true;
			j++;
			continue;
		}
		if (code[j] === quote) {
			j++;
			break;
		}
		j++;
	}

	return [colors.string + code.slice(start, j) + RESET, j];
}

/**
 * Highlights a number in JavaScript/TypeScript.
 */
function highlightJSNumber(code: string, start: number, colors: HighlightColors): [string, number] {
	let j = start;
	// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
	while (j < code.length && /[\d.xXeEabcdefABCDEF_]/.test(code[j]!)) {
		j++;
	}
	return [colors.number + code.slice(start, j) + RESET, j];
}

/**
 * Highlights an identifier, keyword, or constant in JavaScript/TypeScript.
 */
function highlightJSWord(code: string, start: number, colors: HighlightColors): [string, number] {
	let j = start;
	// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
	while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j]!)) {
		j++;
	}
	const word = code.slice(start, j);

	let colored: string;
	if (JS_KEYWORDS.has(word)) {
		colored = colors.keyword + word + RESET;
	} else if (JS_CONSTANTS.has(word)) {
		colored = colors.constant + word + RESET;
	} else if (j < code.length && code[j] === '(') {
		colored = colors.function + word + RESET;
	} else {
		colored = colors.identifier + word + RESET;
	}

	return [colored, j];
}

/**
 * Highlights an operator in JavaScript/TypeScript.
 */
function highlightJSOperator(
	code: string,
	start: number,
	colors: HighlightColors,
): [string, number] {
	let j = start + 1;
	// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
	while (j < code.length && /[+\-*/%&|^~<>=!]/.test(code[j]!)) {
		j++;
	}
	return [colors.operator + code.slice(start, j) + RESET, j];
}

/**
 * Highlights JavaScript/TypeScript code.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Token parsing requires sequential checks
function highlightJavaScript(code: string, colors: HighlightColors): string {
	let result = '';
	let i = 0;

	while (i < code.length) {
		// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
		const char = code[i]!;

		// Comments
		if (char === '/' && i + 1 < code.length) {
			if (code[i + 1] === '/') {
				const [colored, newPos] = highlightJSLineComment(code, i, colors);
				result += colored;
				i = newPos;
				continue;
			}
			if (code[i + 1] === '*') {
				const [colored, newPos] = highlightJSMultiLineComment(code, i, colors);
				result += colored;
				i = newPos;
				continue;
			}
		}

		// Strings
		if (char === '"' || char === "'" || char === '`') {
			const [colored, newPos] = highlightJSString(code, i, char, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Numbers
		if (/\d/.test(char)) {
			const [colored, newPos] = highlightJSNumber(code, i, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Keywords, identifiers, and constants
		if (/[a-zA-Z_$]/.test(char)) {
			const [colored, newPos] = highlightJSWord(code, i, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Operators
		if (/[+\-*/%&|^~<>=!]/.test(char)) {
			const [colored, newPos] = highlightJSOperator(code, i, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Punctuation
		if (/[{}[\]();:,.]/.test(char)) {
			result += colors.punctuation + char + RESET;
			i++;
			continue;
		}

		// Whitespace and other characters
		result += char;
		i++;
	}

	return result;
}

/**
 * Highlights a string in JSON (property key or value).
 */
function highlightJSONString(
	code: string,
	start: number,
	colors: HighlightColors,
): [string, number] {
	let j = start + 1;
	let escaped = false;

	while (j < code.length) {
		if (escaped) {
			escaped = false;
			j++;
			continue;
		}
		if (code[j] === '\\') {
			escaped = true;
			j++;
			continue;
		}
		if (code[j] === '"') {
			j++;
			break;
		}
		j++;
	}

	const string = code.slice(start, j);
	// Check if this is a property key (followed by :)
	let k = j;
	// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
	while (k < code.length && /\s/.test(code[k]!)) k++;
	const isProperty = k < code.length && code[k] === ':';
	const colored = isProperty ? colors.property + string + RESET : colors.string + string + RESET;

	return [colored, j];
}

/**
 * Highlights JSON code.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Token parsing requires sequential checks
function highlightJSON(code: string, colors: HighlightColors): string {
	let result = '';
	let i = 0;

	while (i < code.length) {
		// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
		const char = code[i]!;

		// Strings (keys and values)
		if (char === '"') {
			const [colored, newPos] = highlightJSONString(code, i, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Numbers
		if (/[\d-]/.test(char)) {
			let j = i;
			if (char === '-') j++;
			// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
			while (j < code.length && /[\d.eE+-]/.test(code[j]!)) {
				j++;
			}
			// Verify it's actually a number
			if (j > i && (j === i + 1 ? char !== '-' : true)) {
				const number = code.slice(i, j);
				result += colors.number + number + RESET;
				i = j;
				continue;
			}
		}

		// Constants (true, false, null)
		if (/[a-z]/.test(char)) {
			let j = i;
			// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
			while (j < code.length && /[a-z]/.test(code[j]!)) {
				j++;
			}
			const word = code.slice(i, j);
			if (word === 'true' || word === 'false' || word === 'null') {
				result += colors.constant + word + RESET;
				i = j;
				continue;
			}
		}

		// Punctuation
		if (/[{}[\]:,]/.test(char)) {
			result += colors.punctuation + char + RESET;
			i++;
			continue;
		}

		// Whitespace and other characters
		result += char;
		i++;
	}

	return result;
}

/**
 * Highlights a string in Bash.
 */
function highlightBashString(
	code: string,
	start: number,
	quote: string,
	colors: HighlightColors,
): [string, number] {
	let j = start + 1;
	let escaped = false;

	while (j < code.length) {
		if (escaped) {
			escaped = false;
			j++;
			continue;
		}
		if (code[j] === '\\') {
			escaped = true;
			j++;
			continue;
		}
		if (code[j] === quote) {
			j++;
			break;
		}
		j++;
	}

	return [colors.string + code.slice(start, j) + RESET, j];
}

/**
 * Highlights a variable in Bash.
 */
function highlightBashVariable(
	code: string,
	start: number,
	colors: HighlightColors,
): [string, number] | null {
	let j = start + 1;
	if (j < code.length && code[j] === '{') {
		// ${VAR} form
		const end = code.indexOf('}', j);
		if (end !== -1) {
			return [colors.variable + code.slice(start, end + 1) + RESET, end + 1];
		}
	} else {
		// $VAR form
		// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
		while (j < code.length && /[a-zA-Z0-9_]/.test(code[j]!)) {
			j++;
		}
		if (j > start + 1) {
			return [colors.variable + code.slice(start, j) + RESET, j];
		}
	}
	return null;
}

/**
 * Highlights Bash/shell script code.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Token parsing requires sequential checks
function highlightBash(code: string, colors: HighlightColors): string {
	let result = '';
	let i = 0;

	while (i < code.length) {
		// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
		const char = code[i]!;

		// Comments
		if (char === '#') {
			const end = code.indexOf('\n', i);
			const comment = end === -1 ? code.slice(i) : code.slice(i, end);
			result += colors.comment + comment + RESET;
			i += comment.length;
			continue;
		}

		// Strings (single and double quoted)
		if (char === '"' || char === "'") {
			const [colored, newPos] = highlightBashString(code, i, char, colors);
			result += colored;
			i = newPos;
			continue;
		}

		// Variables ($VAR, ${VAR})
		if (char === '$') {
			const varResult = highlightBashVariable(code, i, colors);
			if (varResult) {
				const [colored, newPos] = varResult;
				result += colored;
				i = newPos;
				continue;
			}
		}

		// Numbers
		if (/\d/.test(char)) {
			let j = i;
			// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
			while (j < code.length && /\d/.test(code[j]!)) {
				j++;
			}
			const number = code.slice(i, j);
			result += colors.number + number + RESET;
			i = j;
			continue;
		}

		// Keywords and commands
		if (/[a-zA-Z_]/.test(char)) {
			let j = i;
			// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
			while (j < code.length && /[a-zA-Z0-9_-]/.test(code[j]!)) {
				j++;
			}
			const word = code.slice(i, j);

			if (BASH_KEYWORDS.has(word)) {
				result += colors.keyword + word + RESET;
			} else {
				result += colors.identifier + word + RESET;
			}
			i = j;
			continue;
		}

		// Operators and redirects
		if (/[|&;<>]/.test(char)) {
			let j = i + 1;
			// biome-ignore lint/style/noNonNullAssertion: Guarded by length check
			while (j < code.length && /[|&;<>]/.test(code[j]!)) {
				j++;
			}
			const op = code.slice(i, j);
			result += colors.operator + op + RESET;
			i = j;
			continue;
		}

		// Punctuation
		if (/[{}[\]();]/.test(char)) {
			result += colors.punctuation + char + RESET;
			i++;
			continue;
		}

		// Whitespace and other characters
		result += char;
		i++;
	}

	return result;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Highlights code with syntax coloring for terminal display.
 *
 * @param code - The source code to highlight
 * @param language - The programming language (javascript, typescript, json, bash, shell, sh)
 * @param config - Optional configuration for colors and settings
 * @returns The highlighted code with ANSI color codes
 *
 * @example
 * ```typescript
 * import { highlightCode } from 'blecsd';
 *
 * // Highlight JavaScript code
 * const jsCode = `
 * function greet(name) {
 *   return \`Hello, \${name}!\`;
 * }
 * `;
 * const highlighted = highlightCode(jsCode, 'javascript');
 * console.log(highlighted);
 *
 * // Highlight with custom colors
 * const customHighlighted = highlightCode(jsCode, 'javascript', {
 *   colors: {
 *     keyword: '\x1b[31m', // Red keywords
 *     string: '\x1b[32m',  // Green strings
 *   }
 * });
 *
 * // Highlight JSON
 * const jsonCode = '{"name": "blECSd", "version": "0.2.0"}';
 * const jsonHighlighted = highlightCode(jsonCode, 'json');
 *
 * // Highlight Bash
 * const bashCode = 'echo "Hello, $USER!"';
 * const bashHighlighted = highlightCode(bashCode, 'bash');
 * ```
 */
export function highlightCode(
	code: string,
	language: SupportedLanguage,
	config: HighlightConfig = {},
): string {
	// Validate config
	const validatedConfig = HighlightConfigSchema.parse(config);

	// If disabled, return code as-is
	if (validatedConfig.enabled === false) {
		return code;
	}

	// Merge colors with defaults (filter out undefined values)
	const customColors = validatedConfig.colors ?? {};
	const colors: HighlightColors = {
		keyword: customColors.keyword ?? DEFAULT_COLORS.keyword,
		string: customColors.string ?? DEFAULT_COLORS.string,
		number: customColors.number ?? DEFAULT_COLORS.number,
		comment: customColors.comment ?? DEFAULT_COLORS.comment,
		operator: customColors.operator ?? DEFAULT_COLORS.operator,
		punctuation: customColors.punctuation ?? DEFAULT_COLORS.punctuation,
		identifier: customColors.identifier ?? DEFAULT_COLORS.identifier,
		function: customColors.function ?? DEFAULT_COLORS.function,
		constant: customColors.constant ?? DEFAULT_COLORS.constant,
		property: customColors.property ?? DEFAULT_COLORS.property,
		variable: customColors.variable ?? DEFAULT_COLORS.variable,
	};

	// Normalize language
	const lang = language.toLowerCase();

	// Apply highlighting based on language
	switch (lang) {
		case 'javascript':
		case 'typescript':
			return highlightJavaScript(code, colors);
		case 'json':
			return highlightJSON(code, colors);
		case 'bash':
		case 'shell':
		case 'sh':
			return highlightBash(code, colors);
		default:
			// Unsupported language, return as-is
			return code;
	}
}

/**
 * Strips ANSI color codes from highlighted code.
 *
 * @param code - The code with ANSI color codes
 * @returns The code without color codes
 *
 * @example
 * ```typescript
 * import { highlightCode, stripHighlight } from 'blecsd';
 *
 * const highlighted = highlightCode('const x = 1;', 'javascript');
 * const plain = stripHighlight(highlighted);
 * console.log(plain); // 'const x = 1;'
 * ```
 */
export function stripHighlight(code: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Need to match ANSI escape codes
	return code.replace(/\x1b\[[0-9;]*m/g, '');
}
