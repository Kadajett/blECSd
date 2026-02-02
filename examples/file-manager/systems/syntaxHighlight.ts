/**
 * Syntax highlighting for file preview.
 * @module systems/syntaxHighlight
 */

import type { TextSegment } from 'blecsd';
import { packColor } from 'blecsd';

/**
 * Syntax highlighting colors.
 */
export const SYNTAX_COLORS = {
	// Code elements
	keyword: packColor(197, 134, 192),      // Purple/magenta
	string: packColor(206, 145, 120),       // Orange/brown
	number: packColor(181, 206, 168),       // Light green
	comment: packColor(106, 153, 85),       // Green
	function: packColor(220, 220, 170),     // Yellow
	type: packColor(78, 201, 176),          // Teal/cyan
	operator: packColor(212, 212, 212),     // Light gray
	punctuation: packColor(212, 212, 212),  // Light gray
	variable: packColor(156, 220, 254),     // Light blue
	constant: packColor(100, 150, 255),     // Blue
	property: packColor(156, 220, 254),     // Light blue

	// JSON/YAML specific
	jsonKey: packColor(156, 220, 254),      // Light blue
	jsonValue: packColor(206, 145, 120),    // Orange

	// Markdown
	mdHeading: packColor(86, 156, 214),     // Blue
	mdBold: packColor(255, 255, 255),       // White (bold)
	mdItalic: packColor(200, 200, 200),     // Gray
	mdCode: packColor(206, 145, 120),       // Orange
	mdLink: packColor(78, 201, 176),        // Teal

	// Default
	default: packColor(212, 212, 212),      // Light gray
};

/**
 * Language keywords by extension.
 */
const KEYWORDS: Record<string, string[]> = {
	// JavaScript/TypeScript
	js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'yield', 'static', 'get', 'set', 'null', 'undefined', 'true', 'false', 'void'],
	ts: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'yield', 'static', 'get', 'set', 'null', 'undefined', 'true', 'false', 'void', 'type', 'interface', 'enum', 'namespace', 'module', 'declare', 'readonly', 'private', 'protected', 'public', 'abstract', 'implements', 'as', 'is', 'keyof', 'infer', 'never', 'unknown', 'any'],
	tsx: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'yield', 'static', 'get', 'set', 'null', 'undefined', 'true', 'false', 'void', 'type', 'interface', 'enum', 'namespace', 'module', 'declare', 'readonly', 'private', 'protected', 'public', 'abstract', 'implements', 'as', 'is', 'keyof', 'infer', 'never', 'unknown', 'any'],
	jsx: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'yield', 'static', 'get', 'set', 'null', 'undefined', 'true', 'false', 'void'],

	// Python
	py: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'pass', 'break', 'continue', 'lambda', 'yield', 'assert', 'global', 'nonlocal', 'del', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None', 'self', 'async', 'await'],

	// Rust
	rs: ['fn', 'let', 'mut', 'const', 'static', 'if', 'else', 'match', 'loop', 'while', 'for', 'in', 'return', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'type', 'pub', 'mod', 'use', 'crate', 'self', 'super', 'where', 'async', 'await', 'move', 'ref', 'dyn', 'unsafe', 'extern', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],

	// Go
	go: ['func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'return', 'go', 'defer', 'select', 'package', 'import', 'true', 'false', 'nil', 'iota'],

	// C/C++
	c: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'extern', 'register', 'volatile', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'goto', 'sizeof', 'typedef', 'struct', 'union', 'enum', 'NULL', 'true', 'false'],
	cpp: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'extern', 'register', 'volatile', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'goto', 'sizeof', 'typedef', 'struct', 'union', 'enum', 'class', 'public', 'private', 'protected', 'virtual', 'override', 'final', 'new', 'delete', 'this', 'template', 'typename', 'namespace', 'using', 'try', 'catch', 'throw', 'nullptr', 'true', 'false', 'auto', 'constexpr', 'noexcept'],
	h: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'extern', 'register', 'volatile', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'goto', 'sizeof', 'typedef', 'struct', 'union', 'enum', 'NULL', 'true', 'false'],
	hpp: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'extern', 'register', 'volatile', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'goto', 'sizeof', 'typedef', 'struct', 'union', 'enum', 'class', 'public', 'private', 'protected', 'virtual', 'override', 'final', 'new', 'delete', 'this', 'template', 'typename', 'namespace', 'using', 'try', 'catch', 'throw', 'nullptr', 'true', 'false', 'auto', 'constexpr', 'noexcept'],

	// Java
	java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'strictfp', 'void', 'int', 'long', 'short', 'byte', 'float', 'double', 'char', 'boolean', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'this', 'super', 'import', 'package', 'true', 'false', 'null', 'instanceof', 'enum', 'assert', 'var', 'record', 'sealed', 'permits', 'yield'],

	// Shell
	sh: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'in', 'function', 'return', 'exit', 'local', 'export', 'readonly', 'unset', 'shift', 'true', 'false', 'echo', 'read', 'cd', 'pwd', 'source'],
	bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'in', 'function', 'return', 'exit', 'local', 'export', 'readonly', 'unset', 'shift', 'true', 'false', 'echo', 'read', 'cd', 'pwd', 'source', 'declare', 'typeset', 'select', 'until', 'coproc', 'mapfile', 'readarray'],
};

/**
 * Types/built-ins by extension.
 */
const TYPES: Record<string, string[]> = {
	ts: ['string', 'number', 'boolean', 'object', 'symbol', 'bigint', 'Array', 'Map', 'Set', 'Promise', 'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType'],
	tsx: ['string', 'number', 'boolean', 'object', 'symbol', 'bigint', 'Array', 'Map', 'Set', 'Promise', 'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType', 'React', 'ReactNode', 'FC', 'Component'],
	rs: ['i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'Option', 'Result'],
	go: ['string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr', 'float32', 'float64', 'complex64', 'complex128', 'bool', 'byte', 'rune', 'error'],
};

/**
 * Result of highlighting a line.
 */
export interface HighlightedLine {
	segments: TextSegment[];
}

/**
 * Highlight state for multi-line context.
 */
interface HighlightState {
	inBlockComment: boolean;
	inString: boolean;
	stringChar: string;
}

/**
 * Creates initial highlight state.
 */
function createHighlightState(): HighlightState {
	return {
		inBlockComment: false,
		inString: false,
		stringChar: '',
	};
}

/**
 * Highlights a single line of code.
 */
export function highlightLine(
	line: string,
	extension: string,
	state: HighlightState,
	defaultFg: number,
): HighlightedLine {
	const segments: TextSegment[] = [];

	// Handle JSON specially
	if (extension === 'json') {
		return highlightJSON(line, defaultFg);
	}

	// Handle Markdown specially
	if (extension === 'md') {
		return highlightMarkdown(line, defaultFg);
	}

	// Handle YAML specially
	if (extension === 'yaml' || extension === 'yml') {
		return highlightYAML(line, defaultFg);
	}

	const keywords = KEYWORDS[extension] ?? KEYWORDS['js'] ?? [];
	const types = TYPES[extension] ?? [];
	const keywordSet = new Set(keywords);
	const typeSet = new Set(types);

	let i = 0;
	let currentText = '';
	let currentColor = defaultFg;

	const flushSegment = () => {
		if (currentText) {
			segments.push({ text: currentText, fg: currentColor, bg: 0, attrs: 0 });
			currentText = '';
		}
	};

	const addSegment = (text: string, color: number) => {
		if (currentColor !== color) {
			flushSegment();
			currentColor = color;
		}
		currentText += text;
	};

	while (i < line.length) {
		// Handle block comment continuation
		if (state.inBlockComment) {
			const endIdx = line.indexOf('*/', i);
			if (endIdx === -1) {
				addSegment(line.slice(i), SYNTAX_COLORS.comment);
				break;
			} else {
				addSegment(line.slice(i, endIdx + 2), SYNTAX_COLORS.comment);
				state.inBlockComment = false;
				i = endIdx + 2;
				continue;
			}
		}

		// Handle string continuation
		if (state.inString) {
			const endIdx = line.indexOf(state.stringChar, i);
			if (endIdx === -1) {
				addSegment(line.slice(i), SYNTAX_COLORS.string);
				break;
			} else {
				addSegment(line.slice(i, endIdx + 1), SYNTAX_COLORS.string);
				state.inString = false;
				i = endIdx + 1;
				continue;
			}
		}

		const char = line[i];

		// Single-line comment
		if (char === '/' && line[i + 1] === '/') {
			addSegment(line.slice(i), SYNTAX_COLORS.comment);
			break;
		}

		// Python/shell comment
		if (char === '#' && (extension === 'py' || extension === 'sh' || extension === 'bash')) {
			addSegment(line.slice(i), SYNTAX_COLORS.comment);
			break;
		}

		// Block comment start
		if (char === '/' && line[i + 1] === '*') {
			const endIdx = line.indexOf('*/', i + 2);
			if (endIdx === -1) {
				addSegment(line.slice(i), SYNTAX_COLORS.comment);
				state.inBlockComment = true;
				break;
			} else {
				addSegment(line.slice(i, endIdx + 2), SYNTAX_COLORS.comment);
				i = endIdx + 2;
				continue;
			}
		}

		// String
		if (char === '"' || char === "'" || char === '`') {
			const stringChar = char;
			let j = i + 1;
			while (j < line.length) {
				if (line[j] === stringChar && line[j - 1] !== '\\') {
					break;
				}
				j++;
			}
			if (j < line.length) {
				addSegment(line.slice(i, j + 1), SYNTAX_COLORS.string);
				i = j + 1;
			} else {
				addSegment(line.slice(i), SYNTAX_COLORS.string);
				state.inString = true;
				state.stringChar = stringChar;
				break;
			}
			continue;
		}

		// Number
		if (/\d/.test(char ?? '')) {
			let j = i;
			while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j] ?? '')) {
				j++;
			}
			addSegment(line.slice(i, j), SYNTAX_COLORS.number);
			i = j;
			continue;
		}

		// Identifier (keyword/type/variable)
		if (/[a-zA-Z_$]/.test(char ?? '')) {
			let j = i;
			while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j] ?? '')) {
				j++;
			}
			const word = line.slice(i, j);

			if (keywordSet.has(word)) {
				addSegment(word, SYNTAX_COLORS.keyword);
			} else if (typeSet.has(word)) {
				addSegment(word, SYNTAX_COLORS.type);
			} else if (line[j] === '(') {
				addSegment(word, SYNTAX_COLORS.function);
			} else {
				addSegment(word, defaultFg);
			}
			i = j;
			continue;
		}

		// Operators
		if (/[+\-*/%=<>!&|^~?:]/.test(char ?? '')) {
			addSegment(char ?? '', SYNTAX_COLORS.operator);
			i++;
			continue;
		}

		// Punctuation
		if (/[{}[\](),;.]/.test(char ?? '')) {
			addSegment(char ?? '', SYNTAX_COLORS.punctuation);
			i++;
			continue;
		}

		// Default
		addSegment(char ?? '', defaultFg);
		i++;
	}

	flushSegment();
	return { segments };
}

/**
 * Highlights JSON content.
 */
function highlightJSON(line: string, defaultFg: number): HighlightedLine {
	const segments: TextSegment[] = [];
	let i = 0;

	const addSegment = (text: string, color: number) => {
		if (text) {
			segments.push({ text, fg: color, bg: 0, attrs: 0 });
		}
	};

	while (i < line.length) {
		const char = line[i];

		// Whitespace
		if (/\s/.test(char ?? '')) {
			let j = i;
			while (j < line.length && /\s/.test(line[j] ?? '')) j++;
			addSegment(line.slice(i, j), defaultFg);
			i = j;
			continue;
		}

		// String (key or value)
		if (char === '"') {
			let j = i + 1;
			while (j < line.length && (line[j] !== '"' || line[j - 1] === '\\')) j++;
			const str = line.slice(i, j + 1);

			// Check if this is a key (followed by :)
			let k = j + 1;
			while (k < line.length && /\s/.test(line[k] ?? '')) k++;
			const isKey = line[k] === ':';

			addSegment(str, isKey ? SYNTAX_COLORS.jsonKey : SYNTAX_COLORS.string);
			i = j + 1;
			continue;
		}

		// Number
		if (/[-\d]/.test(char ?? '')) {
			let j = i;
			while (j < line.length && /[-\d.eE+]/.test(line[j] ?? '')) j++;
			addSegment(line.slice(i, j), SYNTAX_COLORS.number);
			i = j;
			continue;
		}

		// Keywords (true, false, null)
		if (/[tfn]/.test(char ?? '')) {
			const remaining = line.slice(i);
			for (const kw of ['true', 'false', 'null']) {
				if (remaining.startsWith(kw) && !/\w/.test(remaining[kw.length] ?? '')) {
					addSegment(kw, SYNTAX_COLORS.keyword);
					i += kw.length;
					break;
				}
			}
			if (i === line.indexOf(char ?? '', i)) {
				addSegment(char ?? '', defaultFg);
				i++;
			}
			continue;
		}

		// Punctuation
		addSegment(char ?? '', SYNTAX_COLORS.punctuation);
		i++;
	}

	return { segments };
}

/**
 * Highlights Markdown content.
 */
function highlightMarkdown(line: string, defaultFg: number): HighlightedLine {
	const segments: TextSegment[] = [];

	const addSegment = (text: string, color: number, attrs = 0) => {
		if (text) {
			segments.push({ text, fg: color, bg: 0, attrs });
		}
	};

	// Heading
	if (/^#{1,6}\s/.test(line)) {
		const match = line.match(/^(#{1,6})\s(.*)$/);
		if (match && match[1] && match[2]) {
			addSegment(match[1] + ' ', SYNTAX_COLORS.mdHeading);
			addSegment(match[2], SYNTAX_COLORS.mdHeading);
			return { segments };
		}
	}

	// Code block fence
	if (/^```/.test(line)) {
		addSegment(line, SYNTAX_COLORS.mdCode);
		return { segments };
	}

	// List item
	if (/^(\s*)([-*+]|\d+\.)\s/.test(line)) {
		const match = line.match(/^(\s*)([-*+]|\d+\.)\s(.*)$/);
		if (match && match[1] !== undefined && match[2] && match[3] !== undefined) {
			addSegment(match[1], defaultFg);
			addSegment(match[2] + ' ', SYNTAX_COLORS.keyword);
			// Process rest of line for inline formatting
			processMarkdownInline(match[3], segments, defaultFg);
			return { segments };
		}
	}

	// Process inline formatting
	processMarkdownInline(line, segments, defaultFg);
	return { segments };
}

/**
 * Process inline markdown formatting.
 */
function processMarkdownInline(text: string, segments: TextSegment[], defaultFg: number): void {
	const addSegment = (t: string, color: number) => {
		if (t) {
			segments.push({ text: t, fg: color, bg: 0, attrs: 0 });
		}
	};

	let i = 0;
	while (i < text.length) {
		// Inline code
		if (text[i] === '`') {
			const end = text.indexOf('`', i + 1);
			if (end !== -1) {
				addSegment(text.slice(i, end + 1), SYNTAX_COLORS.mdCode);
				i = end + 1;
				continue;
			}
		}

		// Bold **text**
		if (text.slice(i, i + 2) === '**') {
			const end = text.indexOf('**', i + 2);
			if (end !== -1) {
				addSegment(text.slice(i, end + 2), SYNTAX_COLORS.mdBold);
				i = end + 2;
				continue;
			}
		}

		// Link [text](url)
		if (text[i] === '[') {
			const match = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
			if (match) {
				addSegment('[' + match[1] + ']', SYNTAX_COLORS.mdLink);
				addSegment('(' + match[2] + ')', SYNTAX_COLORS.comment);
				i += match[0].length;
				continue;
			}
		}

		addSegment(text[i] ?? '', defaultFg);
		i++;
	}
}

/**
 * Highlights YAML content.
 */
function highlightYAML(line: string, defaultFg: number): HighlightedLine {
	const segments: TextSegment[] = [];

	const addSegment = (text: string, color: number) => {
		if (text) {
			segments.push({ text, fg: color, bg: 0, attrs: 0 });
		}
	};

	// Comment
	if (/^\s*#/.test(line)) {
		const match = line.match(/^(\s*)(#.*)$/);
		if (match && match[1] !== undefined && match[2]) {
			addSegment(match[1], defaultFg);
			addSegment(match[2], SYNTAX_COLORS.comment);
			return { segments };
		}
	}

	// Key: value
	const kvMatch = line.match(/^(\s*)([^:]+)(:)(.*)$/);
	if (kvMatch && kvMatch[1] !== undefined && kvMatch[2] && kvMatch[3] && kvMatch[4] !== undefined) {
		addSegment(kvMatch[1], defaultFg);
		addSegment(kvMatch[2], SYNTAX_COLORS.jsonKey);
		addSegment(kvMatch[3], SYNTAX_COLORS.punctuation);

		const value = kvMatch[4].trim();
		if (/^['"]/.test(value)) {
			addSegment(kvMatch[4], SYNTAX_COLORS.string);
		} else if (/^-?\d/.test(value)) {
			addSegment(kvMatch[4], SYNTAX_COLORS.number);
		} else if (/^(true|false|null|~)$/i.test(value)) {
			addSegment(kvMatch[4], SYNTAX_COLORS.keyword);
		} else {
			addSegment(kvMatch[4], defaultFg);
		}
		return { segments };
	}

	// List item
	if (/^\s*-\s/.test(line)) {
		const match = line.match(/^(\s*)(-)(\s.*)$/);
		if (match && match[1] !== undefined && match[2] && match[3]) {
			addSegment(match[1], defaultFg);
			addSegment(match[2], SYNTAX_COLORS.keyword);
			addSegment(match[3], defaultFg);
			return { segments };
		}
	}

	addSegment(line, defaultFg);
	return { segments };
}

/**
 * Highlights multiple lines of content.
 */
export function highlightContent(
	lines: string[],
	extension: string,
	defaultFg: number,
): HighlightedLine[] {
	const state = createHighlightState();
	return lines.map(line => highlightLine(line, extension, state, defaultFg));
}

/**
 * Checks if an extension supports syntax highlighting.
 */
export function supportsHighlighting(extension: string): boolean {
	return extension in KEYWORDS ||
		extension === 'json' ||
		extension === 'yaml' ||
		extension === 'yml' ||
		extension === 'md';
}
