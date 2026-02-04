/**
 * Termcap text format parser.
 *
 * Parses the older termcap database format used before terminfo.
 * Supports capability inheritance via the tc= capability.
 *
 * @module terminal/terminfo/termcap
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CAPABILITY_REVERSE_ALIASES } from './capabilities';
import type { TerminfoData } from './tput';

/**
 * Parsed termcap entry before translation to terminfo format.
 */
export interface TermcapEntry {
	/** Primary terminal name */
	name: string;
	/** All terminal name aliases */
	names: readonly string[];
	/** Terminal description (last name) */
	description: string;
	/** Source file path */
	file: string;
	/** Boolean capabilities (short names) */
	bools: Record<string, boolean>;
	/** Numeric capabilities (short names) */
	numbers: Record<string, number>;
	/** String capabilities (short names) */
	strings: Record<string, string>;
	/** Inherited terminal names (from tc= capabilities) */
	inherits?: string[];
}

/**
 * Map of terminal names to their termcap entries.
 */
export type TermcapDatabase = Map<string, TermcapEntry>;

/**
 * Result of parsing a termcap file or string.
 */
export interface TermcapParseResult {
	/** Whether parsing succeeded */
	success: boolean;
	/** Parsed entries indexed by name */
	entries: TermcapDatabase;
	/** Parse errors if any */
	errors: string[];
}

/**
 * Options for termcap file location.
 */
export interface TermcapLocatorOptions {
	/** Additional paths to search */
	extraPaths?: string[];
	/** Custom TERMCAP environment value */
	termcapEnv?: string;
	/** Custom TERMPATH environment value */
	termpath?: string;
	/** Custom HOME directory */
	home?: string;
}

/**
 * Default termcap search paths.
 *
 * Searched in order:
 * 1. $TERMCAP (if set to a file path)
 * 2. $TERMPATH directories
 * 3. ~/.termcap
 * 4. /usr/share/misc/termcap
 * 5. /etc/termcap
 */
export function getTermcapSearchPaths(options: TermcapLocatorOptions = {}): readonly string[] {
	const paths: string[] = [];

	// TERMCAP environment variable (if it's a path)
	const termcap = options.termcapEnv ?? process.env.TERMCAP ?? '';
	if (termcap.startsWith('/')) {
		paths.push(termcap);
	}

	// TERMPATH directories
	const termpath = options.termpath ?? process.env.TERMPATH ?? '';
	if (termpath) {
		paths.push(...termpath.split(/[: ]/));
	}

	// Extra paths from options
	if (options.extraPaths) {
		paths.push(...options.extraPaths);
	}

	// Standard paths
	const home = options.home ?? process.env.HOME ?? '';
	if (home) {
		paths.push(path.join(home, '.termcap'));
	}

	paths.push('/usr/share/misc/termcap', '/etc/termcap');

	// Filter out empty strings
	return paths.filter(Boolean);
}

/**
 * Removes comments and joins continuation lines from termcap data.
 *
 * @param data - Raw termcap file contents
 * @returns Preprocessed data
 *
 * @internal
 */
function preprocessTermcap(data: string): string {
	// Remove escaped newlines (continuation lines)
	let result = data.replace(/\\\n[ \t]*/g, '');

	// Remove comments (lines starting with #)
	result = result.replace(/^#[^\n]*/gm, '');

	return result.trim();
}

/**
 * Simple escape map for single-character escapes.
 */
const SIMPLE_ESCAPES: Record<string, string> = {
	E: '\x1b',
	e: '\x1b',
	n: '\n',
	r: '\r',
	t: '\t',
	b: '\b',
	f: '\f',
	s: ' ',
	'\\': '\\',
	'^': '^',
	':': ':',
};

/**
 * Checks if a character is an octal digit.
 *
 * @internal
 */
function isOctalDigit(c: string | undefined): c is string {
	return c !== undefined && c >= '0' && c <= '7';
}

/**
 * Parses an octal escape sequence from a string.
 *
 * @param value - Full string
 * @param start - Start index (after the backslash)
 * @returns Tuple of [parsed char, new index]
 *
 * @internal
 */
function parseOctalEscape(value: string, start: number): [string, number] {
	let octal = '';
	let j = start;
	// Allow up to 4 octal digits for \0XXX format, otherwise 3
	const maxDigits = value[start] === '0' ? 4 : 3;

	while (j < value.length && octal.length < maxDigits && isOctalDigit(value[j])) {
		octal += value[j];
		j++;
	}

	const code = Number.parseInt(octal, 8);
	return [String.fromCharCode(code), j];
}

/**
 * Parses a control character escape.
 *
 * @param next - Character after ^
 * @returns The control character
 *
 * @internal
 */
function parseControlChar(next: string): string {
	if (next === '?') {
		return '\x7f'; // DEL
	}
	const code = next.toUpperCase().charCodeAt(0) - 64;
	if (code >= 0 && code < 32) {
		return String.fromCharCode(code);
	}
	return '^';
}

/**
 * Handles a backslash escape sequence.
 *
 * @returns Tuple of [parsed char(s), index increment]
 *
 * @internal
 */
function handleBackslashEscape(value: string, i: number): [string, number] {
	const next = value[i + 1];
	const simple = next !== undefined ? SIMPLE_ESCAPES[next] : undefined;

	if (simple !== undefined) {
		return [simple, i + 2];
	}

	if (isOctalDigit(next)) {
		return parseOctalEscape(value, i + 1);
	}

	return [value[i] ?? '', i + 1];
}

/**
 * Handles a caret (control char) escape.
 *
 * @returns Tuple of [parsed char, new index]
 *
 * @internal
 */
function handleCaretEscape(value: string, i: number): [string, number] {
	const next = value[i + 1];
	if (next !== undefined) {
		return [parseControlChar(next), i + 2];
	}
	return [value[i] ?? '', i + 1];
}

/**
 * Parses escape sequences in a termcap string value.
 *
 * Handles:
 * - \E or \e -> ESC (0x1B)
 * - ^X -> control character
 * - \n, \r, \t, etc.
 * - \0XX -> octal
 *
 * @param value - String value with escapes
 * @returns Parsed string
 *
 * @internal
 */
function parseTermcapEscapes(value: string): string {
	let result = '';
	let i = 0;

	while (i < value.length) {
		const char = value[i];

		if (char === '\\') {
			const [parsed, newIndex] = handleBackslashEscape(value, i);
			result += parsed;
			i = newIndex;
		} else if (char === '^') {
			const [parsed, newIndex] = handleCaretEscape(value, i);
			result += parsed;
			i = newIndex;
		} else {
			result += char;
			i++;
		}
	}

	return result;
}

/**
 * Processes a single character in the field split loop.
 *
 * @returns Tuple of [chars to add, index increment]
 *
 * @internal
 */
function processFieldChar(line: string, i: number): [string, number] {
	const char = line[i];

	if (char === '\\' && line[i + 1] === '\\') {
		return ['\\\\', 2];
	}
	if (char === '\\' && line[i + 1] === ':') {
		return ['\\:', 2];
	}
	return [char ?? '', 1];
}

/**
 * Splits a termcap entry by colons, respecting escaped colons.
 *
 * @param line - Entry line
 * @returns Array of fields
 *
 * @internal
 */
function splitTermcapFields(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let i = 0;

	while (i < line.length) {
		if (line[i] === ':') {
			if (current) {
				fields.push(current);
			}
			current = '';
			i++;
			while (line[i] === ':') {
				i++;
			}
		} else {
			const [chars, inc] = processFieldChar(line, i);
			current += chars;
			i += inc;
		}
	}

	if (current) {
		fields.push(current);
	}

	return fields;
}

/**
 * Parses a capability field and adds it to the entry.
 *
 * @internal
 */
function parseCapabilityField(field: string, entry: TermcapEntry): void {
	const eqIndex = field.indexOf('=');
	const hashIndex = field.indexOf('#');

	if (eqIndex !== -1) {
		const name = field.slice(0, eqIndex);
		const value = field.slice(eqIndex + 1);
		entry.strings[name] = parseTermcapEscapes(value);
		return;
	}

	if (hashIndex !== -1) {
		const name = field.slice(0, hashIndex);
		const value = field.slice(hashIndex + 1);
		const num = Number.parseInt(value, 10);
		if (!Number.isNaN(num)) {
			entry.numbers[name] = num;
		}
		return;
	}

	entry.bools[field] = true;
}

/**
 * Parses a single termcap entry line.
 *
 * @param line - Entry line (after preprocessing)
 * @param file - Source file path
 * @returns Parsed entry or null if invalid
 *
 * @internal
 */
function parseTermcapEntry(line: string, file: string): TermcapEntry | null {
	const fields = splitTermcapFields(line);
	const namesField = fields[0]?.trim();

	if (!namesField) {
		return null;
	}

	const names = namesField.split('|').map((n) => n.trim());
	const primaryName = names[0];

	if (!primaryName) {
		return null;
	}

	const description = names.length > 1 ? (names[names.length - 1] ?? '') : '';

	const entry: TermcapEntry = {
		name: primaryName,
		names,
		description,
		file,
		bools: {},
		numbers: {},
		strings: {},
	};

	for (let i = 1; i < fields.length; i++) {
		const field = fields[i]?.trim();
		if (field) {
			parseCapabilityField(field, entry);
		}
	}

	return entry;
}

/**
 * Parses termcap format data into a database of entries.
 *
 * Termcap format consists of:
 * - Lines starting with # are comments
 * - Continuation with backslash at end of line
 * - Entries are colon-separated fields
 * - First field is names separated by |
 * - Boolean: just the name (e.g., "am")
 * - Numeric: name#value (e.g., "co#80")
 * - String: name=value (e.g., "cl=\E[H\E[2J")
 *
 * @param data - Termcap file contents
 * @param file - Source file path (for error reporting)
 * @returns Parse result with entries
 *
 * @example
 * ```typescript
 * import { parseTermcap } from 'blecsd';
 *
 * const data = `
 * # VT100 terminal
 * vt100|dec vt100:\\
 *   :am:co#80:li#24:\\
 *   :cl=\\E[H\\E[2J:cm=\\E[%i%d;%dH:
 * `;
 *
 * const result = parseTermcap(data, '/etc/termcap');
 * if (result.success) {
 *   const vt100 = result.entries.get('vt100');
 *   console.log(vt100?.numbers.co);  // 80
 * }
 * ```
 */
export function parseTermcap(data: string, file = '<string>'): TermcapParseResult {
	const entries: TermcapDatabase = new Map();
	const errors: string[] = [];

	const processed = preprocessTermcap(data);
	const lines = processed.split(/\n+/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}

		const entry = parseTermcapEntry(trimmed, file);
		if (entry) {
			// Index by all names
			for (const name of entry.names) {
				entries.set(name, entry);
			}
		}
	}

	return {
		success: errors.length === 0,
		entries,
		errors,
	};
}

/**
 * Reads and parses a termcap file.
 *
 * @param filePath - Path to termcap file
 * @returns Parse result or null if file not found
 *
 * @example
 * ```typescript
 * import { readTermcapFile } from 'blecsd';
 *
 * const result = readTermcapFile('/etc/termcap');
 * if (result?.success) {
 *   for (const [name, entry] of result.entries) {
 *     console.log(name);
 *   }
 * }
 * ```
 */
export function readTermcapFile(filePath: string): TermcapParseResult | null {
	try {
		const data = fs.readFileSync(filePath, 'utf-8');
		return parseTermcap(data, filePath);
	} catch {
		return null;
	}
}

/**
 * Resolves termcap inheritance (tc= capability).
 *
 * @param entry - Entry to resolve
 * @param database - Full termcap database
 * @returns Resolved entry with inherited capabilities
 *
 * @internal
 */
function resolveInheritance(entry: TermcapEntry, database: TermcapDatabase): TermcapEntry {
	const tcValue = entry.strings.tc;
	if (!tcValue) {
		return entry;
	}

	const parent = database.get(tcValue);
	if (!parent) {
		return entry;
	}

	// Recursively resolve parent
	const resolvedParent = resolveInheritance(parent, database);

	// Merge: child overrides parent
	const merged: TermcapEntry = {
		...entry,
		inherits: [...(entry.inherits ?? []), tcValue],
		bools: { ...resolvedParent.bools, ...entry.bools },
		numbers: { ...resolvedParent.numbers, ...entry.numbers },
		strings: { ...resolvedParent.strings, ...entry.strings },
	};

	// Remove tc= from merged strings (use undefined instead of delete for performance)
	merged.strings.tc = undefined as unknown as string;

	return merged;
}

/**
 * Translates termcap capability names to terminfo names.
 *
 * @param entry - Termcap entry with short names
 * @returns Entry with terminfo-style names
 *
 * @internal
 */
function translateToTerminfo(entry: TermcapEntry): TermcapEntry {
	const translated: TermcapEntry = {
		...entry,
		bools: {},
		numbers: {},
		strings: {},
	};

	// Translate each capability
	for (const [cap, value] of Object.entries(entry.bools)) {
		const terminfo = CAPABILITY_REVERSE_ALIASES[cap] ?? cap;
		translated.bools[terminfo] = value;
	}

	for (const [cap, value] of Object.entries(entry.numbers)) {
		const terminfo = CAPABILITY_REVERSE_ALIASES[cap] ?? cap;
		translated.numbers[terminfo] = value;
	}

	for (const [cap, value] of Object.entries(entry.strings)) {
		const terminfo = CAPABILITY_REVERSE_ALIASES[cap] ?? cap;
		translated.strings[terminfo] = value;
	}

	return translated;
}

/**
 * Converts a termcap entry to TerminfoData format.
 *
 * @param entry - Parsed termcap entry
 * @returns TerminfoData compatible structure
 *
 * @example
 * ```typescript
 * import { parseTermcap, termcapToTerminfo } from 'blecsd';
 *
 * const result = parseTermcap(data, 'termcap');
 * const entry = result.entries.get('vt100');
 * if (entry) {
 *   const terminfo = termcapToTerminfo(entry);
 *   // Use with createTput({ data: terminfo })
 * }
 * ```
 */
export function termcapToTerminfo(entry: TermcapEntry): TerminfoData {
	return {
		name: entry.name,
		names: [...entry.names],
		description: entry.description,
		booleans: { ...entry.bools } as TerminfoData['booleans'],
		numbers: { ...entry.numbers } as TerminfoData['numbers'],
		strings: { ...entry.strings } as TerminfoData['strings'],
	};
}

/**
 * Finds and parses a terminal's termcap entry.
 *
 * Searches termcap files in standard locations and returns
 * the entry for the specified terminal.
 *
 * @param terminal - Terminal name to find
 * @param options - Locator options
 * @returns Parsed and resolved termcap entry or null
 *
 * @example
 * ```typescript
 * import { findTermcapEntry } from 'blecsd';
 *
 * const entry = findTermcapEntry('vt100');
 * if (entry) {
 *   console.log(`Found: ${entry.name}`);
 *   console.log(`Columns: ${entry.numbers.co}`);
 * }
 * ```
 */
export function findTermcapEntry(
	terminal: string,
	options: TermcapLocatorOptions = {},
): TermcapEntry | null {
	const paths = getTermcapSearchPaths(options);

	for (const searchPath of paths) {
		const result = readTermcapFile(searchPath);
		if (!result?.success) {
			continue;
		}

		const entry = result.entries.get(terminal);
		if (entry) {
			// Resolve inheritance
			const resolved = resolveInheritance(entry, result.entries);
			// Translate to terminfo names
			return translateToTerminfo(resolved);
		}
	}

	return null;
}

/**
 * Finds and returns termcap data as TerminfoData.
 *
 * Convenience function that combines finding, resolving inheritance,
 * translating names, and converting to TerminfoData format.
 *
 * @param terminal - Terminal name to find
 * @param options - Locator options
 * @returns TerminfoData or null if not found
 *
 * @example
 * ```typescript
 * import { getTermcapData, createTput } from 'blecsd';
 *
 * const data = getTermcapData('vt100');
 * if (data) {
 *   const tput = createTput({ data });
 *   console.log(tput.getString('clear_screen'));
 * }
 * ```
 */
export function getTermcapData(
	terminal: string,
	options: TermcapLocatorOptions = {},
): TerminfoData | null {
	const entry = findTermcapEntry(terminal, options);
	if (!entry) {
		return null;
	}

	return termcapToTerminfo(entry);
}

/**
 * Lists all terminals in a termcap file.
 *
 * @param filePath - Path to termcap file
 * @returns Array of terminal names or empty array if file not found
 *
 * @example
 * ```typescript
 * import { listTermcapTerminals } from 'blecsd';
 *
 * const terminals = listTermcapTerminals('/etc/termcap');
 * console.log(`Found ${terminals.length} terminals`);
 * ```
 */
export function listTermcapTerminals(filePath: string): readonly string[] {
	const result = readTermcapFile(filePath);
	if (!result?.success) {
		return [];
	}

	// Get unique primary names (not aliases)
	const seen = new Set<string>();
	const names: string[] = [];

	for (const entry of result.entries.values()) {
		if (!seen.has(entry.name)) {
			seen.add(entry.name);
			names.push(entry.name);
		}
	}

	return names.sort();
}

/**
 * Checks if a termcap file exists and is readable.
 *
 * @param filePath - Path to check
 * @returns true if file exists and is readable
 */
export function termcapFileExists(filePath: string): boolean {
	try {
		fs.accessSync(filePath, fs.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Gets the first existing termcap file from search paths.
 *
 * @param options - Locator options
 * @returns Path to first existing file or null
 */
export function findTermcapFile(options: TermcapLocatorOptions = {}): string | null {
	const paths = getTermcapSearchPaths(options);

	for (const searchPath of paths) {
		if (termcapFileExists(searchPath)) {
			return searchPath;
		}
	}

	return null;
}
