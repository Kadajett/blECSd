/**
 * ANSI attribute parser namespace.
 *
 * Functions for creating, manipulating, and parsing ANSI text attributes
 * including SGR codes, colors, and text styling.
 *
 * @example
 * ```typescript
 * import { attrParser } from 'blecsd/terminal';
 *
 * // Create and manipulate attributes
 * const attr = attrParser.createAttribute();
 * const boldAttr = attrParser.applySgrCodes(attr, [1]); // Bold
 * const clone = attrParser.cloneAttribute(boldAttr);
 *
 * // Parse and strip ANSI codes
 * const text = '\x1b[31mRed text\x1b[0m';
 * const plain = attrParser.stripAnsi(text);
 * const length = attrParser.visibleLength(text);
 *
 * // Work with SGR codes
 * const codes = attrParser.parseSgrString('\x1b[1;31m');
 * ```
 */

import {
	applySgrCodes,
	attrCode,
	attributesEqual,
	attrToSgrCodes,
	cloneAttribute,
	codeAttr,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	sgrReset,
	stripAnsi,
	unpackRgb,
	visibleLength,
} from '../ansi/parser';

/**
 * ANSI attribute parser namespace.
 */
export const attrParser = Object.freeze({
	applySgrCodes,
	attrCode,
	attributesEqual,
	attrToSgrCodes,
	cloneAttribute,
	codeAttr,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	sgrReset,
	stripAnsi,
	unpackRgb,
	visibleLength,
});

export type AttrParserModule = typeof attrParser;
