/**
 * Text markup parser for inline styling tags
 *
 * Supports tags like {bold}text{/bold}, {red-fg}text{/red-fg}, etc.
 * for inline text styling in terminal applications.
 *
 * @module text/markup
 *
 * @example
 * ```typescript
 * import { parseMarkup, renderMarkup, stripMarkup } from 'blecsd';
 *
 * // Parse markup into styled segments
 * const segments = parseMarkup('{bold}{red-fg}Error{/red-fg}{/bold}');
 *
 * // Strip all tags
 * const plain = stripMarkup('{bold}text{/bold}'); // 'text'
 *
 * // Get visible length
 * const len = markupLength('{bold}hello{/bold}'); // 5
 *
 * // Render to ANSI escape sequences
 * const ansi = renderMarkup(segments);
 * ```
 */

import { z } from 'zod';
import {
	color256ToTruecolor,
	cssNameToColor,
	hexToTruecolor,
	nameToColor,
} from '../terminal/colors';

// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

/**
 * Text style attributes that can be applied to text segments.
 */
export interface MarkupStyle {
	readonly bold?: boolean;
	readonly underline?: boolean;
	readonly italic?: boolean;
	readonly dim?: boolean;
	readonly blink?: boolean;
	readonly inverse?: boolean;
	readonly fg?: number; // Packed truecolor value
	readonly bg?: number; // Packed truecolor value
	readonly align?: 'left' | 'center' | 'right';
}

/**
 * Zod schema for validating MarkupStyle objects.
 */
export const MarkupStyleSchema = z.object({
	bold: z.boolean().optional(),
	underline: z.boolean().optional(),
	italic: z.boolean().optional(),
	dim: z.boolean().optional(),
	blink: z.boolean().optional(),
	inverse: z.boolean().optional(),
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
});

/**
 * A segment of text with associated style information.
 */
export interface StyledSegment {
	readonly text: string;
	readonly style: MarkupStyle;
}

// =============================================================================
// TAG PARSING
// =============================================================================

/**
 * Supported style tag types.
 */
type StyleTag = 'bold' | 'underline' | 'italic' | 'dim' | 'blink' | 'inverse' | 'center' | 'right';

/**
 * Checks if a tag name is a style tag.
 */
function isStyleTag(tag: string): tag is StyleTag {
	return ['bold', 'underline', 'italic', 'dim', 'blink', 'inverse', 'center', 'right'].includes(
		tag,
	);
}

/**
 * Parses a color tag like 'red-fg' or '#ff0000-bg'.
 * Returns the packed truecolor value or null if invalid.
 */
function parseColorTag(tag: string): { type: 'fg' | 'bg'; color: number } | null {
	const fgMatch = /^(.+)-fg$/.exec(tag);
	const bgMatch = /^(.+)-bg$/.exec(tag);

	if (!fgMatch && !bgMatch) {
		return null;
	}

	const isFg = !!fgMatch;
	const colorName = (isFg ? fgMatch[1] : bgMatch?.[1]) ?? '';

	// Try hex color first
	if (colorName.startsWith('#')) {
		try {
			const color = hexToTruecolor(colorName);
			return { type: isFg ? 'fg' : 'bg', color };
		} catch {
			return null;
		}
	}

	// Try named color
	const namedColor = nameToColor(colorName);
	if (namedColor !== null) {
		const color = color256ToTruecolor(namedColor);
		return { type: isFg ? 'fg' : 'bg', color };
	}

	// Try CSS color names
	const cssColor = cssNameToColor(colorName);
	if (cssColor !== null) {
		const color = color256ToTruecolor(cssColor);
		return { type: isFg ? 'fg' : 'bg', color };
	}

	return null;
}

/**
 * Applies a tag to the current style state.
 */
function applyTag(style: MarkupStyle, tag: string): MarkupStyle {
	// Handle reset tag
	if (tag === '/') {
		return {};
	}

	// Handle style tags
	if (isStyleTag(tag)) {
		if (tag === 'center' || tag === 'right') {
			return { ...style, align: tag };
		}
		return { ...style, [tag]: true };
	}

	// Handle color tags
	const colorTag = parseColorTag(tag);
	if (colorTag) {
		return { ...style, [colorTag.type]: colorTag.color };
	}

	// Unknown tag - ignore
	return style;
}

/**
 * Removes a tag from the current style state.
 */
function removeTag(style: MarkupStyle, tag: string): MarkupStyle {
	// Handle style tags
	if (isStyleTag(tag)) {
		const newStyle = { ...style };
		if (tag === 'center' || tag === 'right') {
			const { align: _, ...rest } = newStyle;
			return rest;
		}
		const { [tag]: _, ...rest } = newStyle;
		return rest;
	}

	// Handle color tags
	const colorTag = parseColorTag(tag);
	if (colorTag) {
		const { [colorTag.type]: _, ...rest } = style;
		return rest;
	}

	return style;
}

/**
 * Parses markup string into styled segments.
 *
 * @param input - String containing markup tags
 * @returns Array of styled text segments
 *
 * @example
 * ```typescript
 * import { parseMarkup } from 'blecsd';
 *
 * const segments = parseMarkup('{bold}hello{/bold}');
 * // [{ text: 'hello', style: { bold: true } }]
 *
 * const nested = parseMarkup('{bold}{red-fg}text{/red-fg}{/bold}');
 * // [{ text: 'text', style: { bold: true, fg: 0xff0000 } }]
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Markup parsing requires complex state tracking
export function parseMarkup(input: string): StyledSegment[] {
	if (!input) {
		return [];
	}

	const segments: StyledSegment[] = [];
	let currentStyle: MarkupStyle = {};
	const tagStack: string[] = [];
	let currentText = '';
	let i = 0;

	const flushText = (): void => {
		if (currentText) {
			segments.push({ text: currentText, style: { ...currentStyle } });
			currentText = '';
		}
	};

	while (i < input.length) {
		const char = input[i];

		if (char === '{') {
			// Look for closing brace
			const closeIdx = input.indexOf('}', i + 1);
			if (closeIdx === -1) {
				// No closing brace - treat as literal
				currentText += char;
				i++;
				continue;
			}

			const tag = input.slice(i + 1, closeIdx);

			// Handle escaped braces
			if (tag === 'open') {
				currentText += '{';
				i = closeIdx + 1;
				continue;
			}
			if (tag === 'close') {
				currentText += '}';
				i = closeIdx + 1;
				continue;
			}

			// Handle closing tags
			if (tag.startsWith('/')) {
				flushText();
				const closingTag = tag.slice(1);

				if (closingTag === '') {
					// Reset all styles
					currentStyle = {};
					tagStack.length = 0;
				} else {
					// Remove specific style
					currentStyle = removeTag(currentStyle, closingTag);
					// Remove from tag stack
					const stackIdx = tagStack.lastIndexOf(closingTag);
					if (stackIdx !== -1) {
						tagStack.splice(stackIdx, 1);
					}
				}

				i = closeIdx + 1;
				continue;
			}

			// Handle opening tags
			flushText();
			currentStyle = applyTag(currentStyle, tag);
			tagStack.push(tag);
			i = closeIdx + 1;
			continue;
		}

		// Regular character
		currentText += char;
		i++;
	}

	// Flush any remaining text
	flushText();

	return segments;
}

/**
 * Strips all markup tags from a string, returning only visible text.
 *
 * @param input - String containing markup tags
 * @returns Plain text without tags
 *
 * @example
 * ```typescript
 * import { stripMarkup } from 'blecsd';
 *
 * stripMarkup('{bold}hello{/bold}'); // 'hello'
 * stripMarkup('{red-fg}test{/red-fg}'); // 'test'
 * ```
 */
export function stripMarkup(input: string): string {
	let result = '';
	let i = 0;

	while (i < input.length) {
		const char = input[i];

		if (char === '{') {
			const closeIdx = input.indexOf('}', i + 1);
			if (closeIdx === -1) {
				// No closing brace - treat as literal (but we remove it for cleanliness)
				i++;
				continue;
			}

			const tag = input.slice(i + 1, closeIdx);

			// Handle escaped braces
			if (tag === 'open') {
				result += '{';
				i = closeIdx + 1;
				continue;
			}
			if (tag === 'close') {
				result += '}';
				i = closeIdx + 1;
				continue;
			}

			// Skip the tag
			i = closeIdx + 1;
			continue;
		}

		result += char;
		i++;
	}

	return result;
}

/**
 * Calculates the visible text length, excluding markup tags.
 *
 * @param input - String containing markup tags
 * @returns Length of visible text
 *
 * @example
 * ```typescript
 * import { markupLength } from 'blecsd';
 *
 * markupLength('hello'); // 5
 * markupLength('{bold}hello{/bold}'); // 5
 * markupLength('{red-fg}hello{/red-fg} world'); // 11
 * ```
 */
export function markupLength(input: string): number {
	return stripMarkup(input).length;
}

/**
 * Converts styled segments back to ANSI escape sequences.
 *
 * @param segments - Array of styled text segments
 * @returns String with ANSI escape codes
 *
 * @example
 * ```typescript
 * import { parseMarkup, renderMarkup } from 'blecsd';
 *
 * const segments = parseMarkup('{bold}hello{/bold}');
 * const ansi = renderMarkup(segments);
 * // '\x1b[1mhello\x1b[0m'
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ANSI code generation requires checking multiple style flags
export function renderMarkup(segments: StyledSegment[]): string {
	if (!segments.length) {
		return '';
	}

	let result = '';

	for (const segment of segments) {
		const codes: string[] = [];

		// Collect SGR codes
		if (segment.style.bold) codes.push('1');
		if (segment.style.dim) codes.push('2');
		if (segment.style.italic) codes.push('3');
		if (segment.style.underline) codes.push('4');
		if (segment.style.blink) codes.push('5');
		if (segment.style.inverse) codes.push('7');

		// Foreground color
		if (segment.style.fg !== undefined) {
			const r = (segment.style.fg >> 16) & 0xff;
			const g = (segment.style.fg >> 8) & 0xff;
			const b = segment.style.fg & 0xff;
			codes.push(`38;2;${r};${g};${b}`);
		}

		// Background color
		if (segment.style.bg !== undefined) {
			const r = (segment.style.bg >> 16) & 0xff;
			const g = (segment.style.bg >> 8) & 0xff;
			const b = segment.style.bg & 0xff;
			codes.push(`48;2;${r};${g};${b}`);
		}

		// Apply codes if any
		if (codes.length > 0) {
			result += `\x1b[${codes.join(';')}m`;
		}

		// Add the text
		result += segment.text;

		// Reset after each segment if it had styles
		if (codes.length > 0) {
			result += '\x1b[0m';
		}
	}

	return result;
}
