/**
 * Tag parsing system for styled terminal text.
 *
 * Parses blessed-style tags like {bold}, {red-fg}, {/bold} into
 * structured segments with style attributes.
 *
 * @module utils/tags
 */

import { z } from 'zod';
import { AttrFlags, type StyleInput } from './sattr';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Text alignment within a container.
 */
export type Alignment = 'left' | 'center' | 'right';

/**
 * A segment of parsed text with associated style.
 */
export interface TextSegment {
	/** The text content of this segment */
	readonly text: string;
	/** Foreground color (packed RGBA) */
	readonly fg: number;
	/** Background color (packed RGBA) */
	readonly bg: number;
	/** Attribute flags (bold, underline, etc.) */
	readonly attrs: number;
}

/**
 * Result of parsing tagged text.
 */
export interface ParsedContent {
	/** Array of text segments with styles */
	readonly segments: readonly TextSegment[];
	/** Overall alignment (from last alignment tag, or 'left') */
	readonly alignment: Alignment;
	/** Plain text with all tags removed */
	readonly plainText: string;
}

/**
 * Internal mutable style state during parsing.
 */
interface MutableStyle {
	fg: number;
	bg: number;
	attrs: number;
}

/**
 * Stack entry for tracking nested styles.
 */
interface StyleStackEntry {
	/** What type of style this entry represents */
	readonly type: 'fg' | 'bg' | 'attr';
	/** The previous value before this style was applied */
	readonly prevValue: number;
	/** The tag name that opened this style (for matching close tags) */
	readonly tagName: string;
}

/**
 * Style stack for tracking nested style states.
 */
interface StyleStack {
	/** Stack entries for fg color changes */
	fg: StyleStackEntry[];
	/** Stack entries for bg color changes */
	bg: StyleStackEntry[];
	/** Stack entries for each attribute flag */
	attrs: Map<number, StyleStackEntry[]>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default foreground color (white) */
const DEFAULT_FG = 0xffffffff;

/** Default background color (transparent) */
const DEFAULT_BG = 0x00000000;

/** Pattern to match tags: {tag-name} or {/tag-name} or {/} or {#hex-fg} */
const TAG_PATTERN = /\{(\/?[a-zA-Z0-9_#-]+|\/)\}/g;

/** Placeholder for escaped left brace during parsing */
const LBRACE_PLACEHOLDER = '\u0000LBRACE\u0000';
/** Placeholder for escaped right brace during parsing */
const RBRACE_PLACEHOLDER = '\u0000RBRACE\u0000';

/** Named color map */
const NAMED_COLORS: Record<string, number> = {
	// Standard colors
	black: 0x000000ff,
	red: 0xff0000ff,
	green: 0x00ff00ff,
	yellow: 0xffff00ff,
	blue: 0x0000ffff,
	magenta: 0xff00ffff,
	cyan: 0x00ffffff,
	white: 0xffffffff,

	// Bright variants
	'bright-black': 0x808080ff,
	gray: 0x808080ff,
	grey: 0x808080ff,
	'bright-red': 0xff8080ff,
	'bright-green': 0x80ff80ff,
	'bright-yellow': 0xffff80ff,
	'bright-blue': 0x8080ffff,
	'bright-magenta': 0xff80ffff,
	'bright-cyan': 0x80ffffff,
	'bright-white': 0xffffffff,

	// Additional colors
	orange: 0xffa500ff,
	pink: 0xffc0cbff,
	purple: 0x800080ff,
	brown: 0xa52a2aff,
	lime: 0x32cd32ff,
	navy: 0x000080ff,
	teal: 0x008080ff,
	olive: 0x808000ff,
	maroon: 0x800000ff,
	aqua: 0x00ffffff,
	silver: 0xc0c0c0ff,

	// Default/transparent
	default: 0x00000000,
	transparent: 0x00000000,
};

/** Attribute tag names mapping to flags */
const ATTR_TAGS: Record<string, number> = {
	bold: AttrFlags.BOLD,
	underline: AttrFlags.UNDERLINE,
	ul: AttrFlags.UNDERLINE,
	blink: AttrFlags.BLINK,
	inverse: AttrFlags.INVERSE,
	invisible: AttrFlags.INVISIBLE,
	hidden: AttrFlags.INVISIBLE,
	dim: AttrFlags.DIM,
	italic: AttrFlags.ITALIC,
	strikethrough: AttrFlags.STRIKETHROUGH,
	strike: AttrFlags.STRIKETHROUGH,
};

/** Alignment tags */
const ALIGNMENT_TAGS: Record<string, Alignment> = {
	left: 'left',
	center: 'center',
	right: 'right',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parses a hex color string to packed RGBA.
 *
 * @param hex - Hex color string (e.g., "ff0000", "#ff0000", "f00")
 * @returns Packed RGBA color, or null if invalid
 */
function parseHexColor(hex: string): number | null {
	// Remove # prefix if present
	const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;

	// Validate hex string
	if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) {
		return null;
	}

	let r: number;
	let g: number;
	let b: number;

	if (cleaned.length === 3) {
		// Short form: abc -> aabbcc
		r = Number.parseInt(cleaned[0] + cleaned[0], 16);
		g = Number.parseInt(cleaned[1] + cleaned[1], 16);
		b = Number.parseInt(cleaned[2] + cleaned[2], 16);
	} else {
		// Full form: aabbcc
		r = Number.parseInt(cleaned.slice(0, 2), 16);
		g = Number.parseInt(cleaned.slice(2, 4), 16);
		b = Number.parseInt(cleaned.slice(4, 6), 16);
	}

	// Pack as RGBA (alpha = 255)
	return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

/**
 * Parses a color value from a tag.
 *
 * @param value - Color value (name, hex, or number)
 * @returns Packed RGBA color, or null if invalid
 */
function parseColor(value: string): number | null {
	// Check named colors (case-insensitive)
	const lower = value.toLowerCase();
	if (lower in NAMED_COLORS) {
		return NAMED_COLORS[lower];
	}

	// Try hex color
	const hex = parseHexColor(value);
	if (hex !== null) {
		return hex;
	}

	// Try numeric (256-color index)
	const num = Number.parseInt(value, 10);
	if (!Number.isNaN(num) && num >= 0 && num <= 255) {
		// Convert 256-color index to RGB (simplified)
		return convert256ToRgb(num);
	}

	return null;
}

/**
 * Converts a 256-color index to packed RGBA.
 * Simplified conversion for common colors.
 *
 * @param index - Color index (0-255)
 * @returns Packed RGBA color
 */
function convert256ToRgb(index: number): number {
	// Standard colors (0-7)
	if (index < 8) {
		const std = [
			0x000000ff, // black
			0x800000ff, // red
			0x008000ff, // green
			0x808000ff, // yellow
			0x000080ff, // blue
			0x800080ff, // magenta
			0x008080ff, // cyan
			0xc0c0c0ff, // white
		];
		return std[index];
	}

	// Bright colors (8-15)
	if (index < 16) {
		const bright = [
			0x808080ff, // bright black (gray)
			0xff0000ff, // bright red
			0x00ff00ff, // bright green
			0xffff00ff, // bright yellow
			0x0000ffff, // bright blue
			0xff00ffff, // bright magenta
			0x00ffffff, // bright cyan
			0xffffffff, // bright white
		];
		return bright[index - 8];
	}

	// 216-color cube (16-231)
	if (index < 232) {
		const i = index - 16;
		const r = Math.floor(i / 36) * 51;
		const g = (Math.floor(i / 6) % 6) * 51;
		const b = (i % 6) * 51;
		return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
	}

	// Grayscale (232-255)
	const gray = (index - 232) * 10 + 8;
	return ((gray << 24) | (gray << 16) | (gray << 8) | 0xff) >>> 0;
}

/**
 * Creates a new style stack for tracking nested styles.
 */
function createStyleStack(): StyleStack {
	return {
		fg: [],
		bg: [],
		attrs: new Map(),
	};
}

/**
 * Resets style to defaults and clears the stack.
 */
function resetStyle(style: MutableStyle, stack: StyleStack): void {
	style.fg = DEFAULT_FG;
	style.bg = DEFAULT_BG;
	style.attrs = 0;
	stack.fg = [];
	stack.bg = [];
	stack.attrs.clear();
}

/**
 * Pops an attribute from the stack and restores previous state.
 */
function popAttrFromStack(flag: number, style: MutableStyle, stack: StyleStack): void {
	const attrStack = stack.attrs.get(flag);
	const entry = attrStack?.pop();
	if (entry?.prevValue) {
		style.attrs |= flag;
	} else {
		style.attrs &= ~flag;
	}
}

/**
 * Pushes current attribute state to stack before applying new attribute.
 */
function pushAttrToStack(
	flag: number,
	tagName: string,
	style: MutableStyle,
	stack: StyleStack,
): void {
	let attrStack = stack.attrs.get(flag);
	if (!attrStack) {
		attrStack = [];
		stack.attrs.set(flag, attrStack);
	}
	attrStack.push({
		type: 'attr',
		prevValue: style.attrs & flag,
		tagName,
	});
	style.attrs |= flag;
}

/**
 * Processes an attribute tag (bold, underline, etc.).
 */
function processAttrTag(
	tagName: string,
	isClose: boolean,
	style: MutableStyle,
	stack: StyleStack,
): boolean {
	if (!(tagName in ATTR_TAGS)) {
		return false;
	}
	const flag = ATTR_TAGS[tagName];

	if (isClose) {
		popAttrFromStack(flag, style, stack);
	} else {
		pushAttrToStack(flag, tagName, style, stack);
	}
	return true;
}

/**
 * Processes a foreground color tag ({color-fg}).
 */
function processFgColorTag(
	tagName: string,
	isClose: boolean,
	style: MutableStyle,
	stack: StyleStack,
): boolean {
	const fgMatch = tagName.match(/^(.+)-fg$/);
	if (!fgMatch) {
		return false;
	}

	if (isClose) {
		// Pop from stack to restore previous color
		if (stack.fg.length > 0) {
			const entry = stack.fg.pop();
			if (entry) {
				style.fg = entry.prevValue;
			}
		} else {
			style.fg = DEFAULT_FG;
		}
	} else {
		const color = parseColor(fgMatch[1]);
		if (color !== null) {
			// Push current fg to stack before changing
			stack.fg.push({
				type: 'fg',
				prevValue: style.fg,
				tagName,
			});
			style.fg = color;
		}
	}
	return true;
}

/**
 * Processes a background color tag ({color-bg}).
 */
function processBgColorTag(
	tagName: string,
	isClose: boolean,
	style: MutableStyle,
	stack: StyleStack,
): boolean {
	const bgMatch = tagName.match(/^(.+)-bg$/);
	if (!bgMatch) {
		return false;
	}

	if (isClose) {
		// Pop from stack to restore previous color
		if (stack.bg.length > 0) {
			const entry = stack.bg.pop();
			if (entry) {
				style.bg = entry.prevValue;
			}
		} else {
			style.bg = DEFAULT_BG;
		}
	} else {
		const color = parseColor(bgMatch[1]);
		if (color !== null) {
			// Push current bg to stack before changing
			stack.bg.push({
				type: 'bg',
				prevValue: style.bg,
				tagName,
			});
			style.bg = color;
		}
	}
	return true;
}

/**
 * Processes a simple color name as foreground.
 */
function processSimpleColorTag(
	tagName: string,
	isClose: boolean,
	style: MutableStyle,
	stack: StyleStack,
): boolean {
	if (isClose) {
		return false;
	}
	const color = parseColor(tagName);
	if (color === null) {
		return false;
	}
	// Push current fg to stack before changing
	stack.fg.push({
		type: 'fg',
		prevValue: style.fg,
		tagName,
	});
	style.fg = color;
	return true;
}

/**
 * Processes a tag and modifies the current style state.
 *
 * @param tag - Tag name (without braces)
 * @param style - Current mutable style state
 * @param stack - Style stack for nested tracking
 * @returns New alignment if changed, or null
 */
function processTag(tag: string, style: MutableStyle, stack: StyleStack): Alignment | null {
	// Reset all
	if (tag === '/') {
		resetStyle(style, stack);
		return null;
	}

	// Check for close tag
	const isClose = tag.startsWith('/');
	const tagName = isClose ? tag.slice(1) : tag;

	// Check alignment
	if (tagName in ALIGNMENT_TAGS) {
		return ALIGNMENT_TAGS[tagName];
	}

	// Process attribute tags
	if (processAttrTag(tagName, isClose, style, stack)) {
		return null;
	}

	// Process color tags
	if (processFgColorTag(tagName, isClose, style, stack)) {
		return null;
	}
	if (processBgColorTag(tagName, isClose, style, stack)) {
		return null;
	}
	if (processSimpleColorTag(tagName, isClose, style, stack)) {
		return null;
	}

	// Unknown tag - ignore
	return null;
}

// =============================================================================
// PUBLIC FUNCTIONS
// =============================================================================

/**
 * Parses tagged text into structured segments.
 *
 * @param text - Text with blessed-style tags
 * @returns Parsed content with segments and alignment
 *
 * @example
 * ```typescript
 * import { parseTags } from 'blecsd';
 *
 * const result = parseTags('{bold}Hello{/bold} {red-fg}World{/red-fg}');
 * // result.segments = [
 * //   { text: 'Hello', fg: 0xffffffff, bg: 0x00000000, attrs: AttrFlags.BOLD },
 * //   { text: ' ', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
 * //   { text: 'World', fg: 0xff0000ff, bg: 0x00000000, attrs: 0 },
 * // ]
 * ```
 */
export function parseTags(text: string): ParsedContent {
	const segments: TextSegment[] = [];
	let alignment: Alignment = 'left';
	let plainText = '';

	// Handle escaped braces first
	const unescaped = text.replace(/\{\{/g, LBRACE_PLACEHOLDER).replace(/\}\}/g, RBRACE_PLACEHOLDER);

	// Current style state
	const style: MutableStyle = {
		fg: DEFAULT_FG,
		bg: DEFAULT_BG,
		attrs: 0,
	};

	// Style stack for nested tag tracking
	const stack = createStyleStack();

	// Track position in the string
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	// Reset regex state
	TAG_PATTERN.lastIndex = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration pattern
	while ((match = TAG_PATTERN.exec(unescaped)) !== null) {
		// Add text before the tag
		if (match.index > lastIndex) {
			let segmentText = unescaped.slice(lastIndex, match.index);
			// Restore escaped braces
			segmentText = segmentText
				.replaceAll(LBRACE_PLACEHOLDER, '{')
				.replaceAll(RBRACE_PLACEHOLDER, '}');

			if (segmentText.length > 0) {
				segments.push({
					text: segmentText,
					fg: style.fg,
					bg: style.bg,
					attrs: style.attrs,
				});
				plainText += segmentText;
			}
		}

		// Process the tag
		const tagName = match[1];
		const newAlignment = processTag(tagName, style, stack);
		if (newAlignment !== null) {
			alignment = newAlignment;
		}

		lastIndex = TAG_PATTERN.lastIndex;
	}

	// Add remaining text after last tag
	if (lastIndex < unescaped.length) {
		let segmentText = unescaped.slice(lastIndex);
		segmentText = segmentText
			.replaceAll(LBRACE_PLACEHOLDER, '{')
			.replaceAll(RBRACE_PLACEHOLDER, '}');

		if (segmentText.length > 0) {
			segments.push({
				text: segmentText,
				fg: style.fg,
				bg: style.bg,
				attrs: style.attrs,
			});
			plainText += segmentText;
		}
	}

	// Handle empty input
	if (segments.length === 0 && text.length === 0) {
		return { segments: [], alignment, plainText: '' };
	}

	return { segments, alignment, plainText };
}

/**
 * Removes all tags from text, leaving only plain text.
 *
 * @param text - Text with blessed-style tags
 * @returns Plain text without tags
 *
 * @example
 * ```typescript
 * import { stripTags } from 'blecsd';
 *
 * const plain = stripTags('{bold}Hello{/bold} {red-fg}World{/red-fg}');
 * // plain = 'Hello World'
 * ```
 */
export function stripTags(text: string): string {
	// First, temporarily replace escaped braces
	const temp = text.replace(/\{\{/g, LBRACE_PLACEHOLDER).replace(/\}\}/g, RBRACE_PLACEHOLDER);
	// Remove tags
	const stripped = temp.replace(TAG_PATTERN, '');
	// Restore escaped braces as literal braces
	return stripped.replaceAll(LBRACE_PLACEHOLDER, '{').replaceAll(RBRACE_PLACEHOLDER, '}');
}

/**
 * Strips tags from text and trims whitespace.
 * Combines stripTags() with string trimming for clean output.
 *
 * @param text - Text with blessed-style tags
 * @returns Plain text without tags, trimmed of leading/trailing whitespace
 *
 * @example
 * ```typescript
 * import { cleanTags } from 'blecsd';
 *
 * const clean = cleanTags('  {bold}Hello{/bold}  ');
 * // clean = 'Hello'
 *
 * const messy = cleanTags('\n{red-fg}  World  {/red-fg}\n');
 * // messy = 'World'
 * ```
 */
export function cleanTags(text: string): string {
	return stripTags(text).trim();
}

/**
 * Escapes braces in text to prevent tag interpretation.
 *
 * @param text - Text with literal braces
 * @returns Text with escaped braces
 *
 * @example
 * ```typescript
 * import { escapeTags } from 'blecsd';
 *
 * const escaped = escapeTags('Use {bold} for bold text');
 * // escaped = 'Use {{bold}} for bold text'
 * ```
 */
export function escapeTags(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Creates a tagged string from text and style.
 *
 * @param text - Plain text to wrap
 * @param style - Style to apply
 * @returns Tagged string
 *
 * @example
 * ```typescript
 * import { createTaggedText } from 'blecsd';
 *
 * const tagged = createTaggedText('Hello', { bold: true, fg: 0xff0000ff });
 * // tagged = '{bold}{#ff0000-fg}Hello{/}'
 * ```
 */
export function createTaggedText(text: string, style: StyleInput): string {
	const tags: string[] = [];

	// Add attribute tags
	if (style.bold) tags.push('{bold}');
	if (style.underline) tags.push('{underline}');
	if (style.blink) tags.push('{blink}');
	if (style.inverse) tags.push('{inverse}');
	if (style.invisible) tags.push('{invisible}');
	if (style.dim) tags.push('{dim}');
	if (style.italic) tags.push('{italic}');
	if (style.strikethrough) tags.push('{strikethrough}');

	// Add color tags
	if (style.fg !== undefined && style.fg !== DEFAULT_FG) {
		const hex = colorToHex(style.fg);
		tags.push(`{#${hex}-fg}`);
	}
	if (style.bg !== undefined && style.bg !== DEFAULT_BG) {
		const hex = colorToHex(style.bg);
		tags.push(`{#${hex}-bg}`);
	}

	// Escape the text
	const escaped = escapeTags(text);

	// Wrap with tags and reset
	if (tags.length === 0) {
		return escaped;
	}

	return `${tags.join('')}${escaped}{/}`;
}

/**
 * Converts packed RGBA color to hex string.
 *
 * @param color - Packed RGBA color
 * @returns Hex string without #
 */
function colorToHex(color: number): string {
	const r = (color >>> 24) & 0xff;
	const g = (color >>> 16) & 0xff;
	const b = (color >>> 8) & 0xff;
	return (
		r.toString(16).padStart(2, '0') +
		g.toString(16).padStart(2, '0') +
		b.toString(16).padStart(2, '0')
	);
}

/**
 * Merges adjacent segments with identical styles.
 *
 * @param segments - Array of text segments
 * @returns Merged segments
 */
export function mergeSegments(segments: readonly TextSegment[]): TextSegment[] {
	if (segments.length === 0) return [];

	const merged: TextSegment[] = [];
	let current = { ...segments[0] };

	for (let i = 1; i < segments.length; i++) {
		const seg = segments[i];
		if (seg.fg === current.fg && seg.bg === current.bg && seg.attrs === current.attrs) {
			// Same style, merge text
			current = { ...current, text: current.text + seg.text };
		} else {
			// Different style, push current and start new
			merged.push(current);
			current = { ...seg };
		}
	}

	merged.push(current);
	return merged;
}

/**
 * Calculates the visual length of tagged text (excluding tags).
 *
 * @param text - Text with blessed-style tags
 * @returns Visual length of the text
 *
 * @example
 * ```typescript
 * import { taggedLength } from 'blecsd';
 *
 * const len = taggedLength('{bold}Hello{/bold}');
 * // len = 5
 * ```
 */
export function taggedLength(text: string): number {
	return stripTags(text).length;
}

/**
 * Checks if text contains any tags.
 *
 * @param text - Text to check
 * @returns true if text contains tags
 */
export function hasTags(text: string): boolean {
	// First remove escaped braces (they don't count as tags)
	const unescaped = text.replace(/\{\{/g, '').replace(/\}\}/g, '');
	// Reset regex state
	TAG_PATTERN.lastIndex = 0;
	return TAG_PATTERN.test(unescaped);
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for alignment values.
 */
export const AlignmentSchema = z.enum(['left', 'center', 'right']);

// =============================================================================
// TAG GENERATION UTILITIES
// =============================================================================

/**
 * Generates a foreground or background color tag.
 *
 * @param color - Packed RGBA color
 * @param type - 'fg' for foreground, 'bg' for background
 * @returns Color tag string (e.g., '{#ff0000-fg}')
 *
 * @example
 * ```typescript
 * import { colorToTag } from 'blecsd';
 *
 * const tag = colorToTag(0xff0000ff, 'fg');
 * // tag = '{#ff0000-fg}'
 * ```
 */
export function colorToTag(color: number, type: 'fg' | 'bg'): string {
	// Check if color matches a named color
	for (const [name, value] of Object.entries(NAMED_COLORS)) {
		if (value === color) {
			return `{${name}-${type}}`;
		}
	}
	// Use hex format
	const hex = colorToHex(color);
	return `{#${hex}-${type}}`;
}

/**
 * Generates an attribute tag from attribute flags.
 *
 * @param attr - Single attribute flag (e.g., AttrFlags.BOLD)
 * @returns Attribute tag string (e.g., '{bold}')
 *
 * @example
 * ```typescript
 * import { attrToTag, AttrFlags } from 'blecsd';
 *
 * const tag = attrToTag(AttrFlags.BOLD);
 * // tag = '{bold}'
 * ```
 */
export function attrToTag(attr: number): string {
	if (attr & AttrFlags.BOLD) return '{bold}';
	if (attr & AttrFlags.UNDERLINE) return '{underline}';
	if (attr & AttrFlags.BLINK) return '{blink}';
	if (attr & AttrFlags.INVERSE) return '{inverse}';
	if (attr & AttrFlags.INVISIBLE) return '{invisible}';
	if (attr & AttrFlags.DIM) return '{dim}';
	if (attr & AttrFlags.ITALIC) return '{italic}';
	if (attr & AttrFlags.STRIKETHROUGH) return '{strikethrough}';
	return '';
}

/**
 * Generates an array of opening tags from a style.
 * Does not include closing tags.
 *
 * @param style - Style input with colors and attributes
 * @returns Array of opening tag strings
 *
 * @example
 * ```typescript
 * import { generateTags } from 'blecsd';
 *
 * const tags = generateTags({ bold: true, fg: 0xff0000ff });
 * // tags = ['{bold}', '{#ff0000-fg}']
 * ```
 */
export function generateTags(style: StyleInput): string[] {
	const tags: string[] = [];

	// Add attribute tags
	if (style.bold) tags.push('{bold}');
	if (style.underline) tags.push('{underline}');
	if (style.blink) tags.push('{blink}');
	if (style.inverse) tags.push('{inverse}');
	if (style.invisible) tags.push('{invisible}');
	if (style.dim) tags.push('{dim}');
	if (style.italic) tags.push('{italic}');
	if (style.strikethrough) tags.push('{strikethrough}');

	// Add color tags
	if (style.fg !== undefined && style.fg !== DEFAULT_FG) {
		tags.push(colorToTag(style.fg, 'fg'));
	}
	if (style.bg !== undefined && style.bg !== DEFAULT_BG) {
		tags.push(colorToTag(style.bg, 'bg'));
	}

	return tags;
}

/**
 * Generates closing tags for a style.
 * Returns specific closing tags for each style attribute.
 *
 * @param style - Style input with colors and attributes
 * @returns Array of closing tag strings
 *
 * @example
 * ```typescript
 * import { generateCloseTags } from 'blecsd';
 *
 * const tags = generateCloseTags({ bold: true, fg: 0xff0000ff });
 * // tags = ['{/bold}', '{/fg}']
 * ```
 */
export function generateCloseTags(style: StyleInput): string[] {
	const tags: string[] = [];

	// Add closing tags in reverse order
	if (style.bg !== undefined && style.bg !== DEFAULT_BG) {
		tags.push('{/bg}');
	}
	if (style.fg !== undefined && style.fg !== DEFAULT_FG) {
		tags.push('{/fg}');
	}
	if (style.strikethrough) tags.push('{/strikethrough}');
	if (style.italic) tags.push('{/italic}');
	if (style.dim) tags.push('{/dim}');
	if (style.invisible) tags.push('{/invisible}');
	if (style.inverse) tags.push('{/inverse}');
	if (style.blink) tags.push('{/blink}');
	if (style.underline) tags.push('{/underline}');
	if (style.bold) tags.push('{/bold}');

	return tags;
}

/**
 * Wraps text with opening and closing tags.
 *
 * @param text - Text to wrap
 * @param openTags - Array of opening tags
 * @param closeTags - Array of closing tags (optional, uses '{/}' if not provided)
 * @returns Tagged text
 *
 * @example
 * ```typescript
 * import { wrapWithTags } from 'blecsd';
 *
 * const tagged = wrapWithTags('Hello', ['{bold}', '{red-fg}'], ['{/bold}', '{/red-fg}']);
 * // tagged = '{bold}{red-fg}Hello{/bold}{/red-fg}'
 *
 * // Or with universal close tag
 * const simple = wrapWithTags('Hello', ['{bold}']);
 * // simple = '{bold}Hello{/}'
 * ```
 */
export function wrapWithTags(text: string, openTags: string[], closeTags?: string[]): string {
	const escaped = escapeTags(text);
	const open = openTags.join('');
	const close = closeTags ? closeTags.join('') : '{/}';
	return `${open}${escaped}${close}`;
}

/**
 * Generates tags from attribute flags.
 * Converts numeric attribute flags to tag strings.
 *
 * @param attrs - Packed attribute flags
 * @returns Array of attribute tag strings
 *
 * @example
 * ```typescript
 * import { attrsToTags, AttrFlags } from 'blecsd';
 *
 * const tags = attrsToTags(AttrFlags.BOLD | AttrFlags.UNDERLINE);
 * // tags = ['{bold}', '{underline}']
 * ```
 */
export function attrsToTags(attrs: number): string[] {
	const tags: string[] = [];

	if (attrs & AttrFlags.BOLD) tags.push('{bold}');
	if (attrs & AttrFlags.UNDERLINE) tags.push('{underline}');
	if (attrs & AttrFlags.BLINK) tags.push('{blink}');
	if (attrs & AttrFlags.INVERSE) tags.push('{inverse}');
	if (attrs & AttrFlags.INVISIBLE) tags.push('{invisible}');
	if (attrs & AttrFlags.DIM) tags.push('{dim}');
	if (attrs & AttrFlags.ITALIC) tags.push('{italic}');
	if (attrs & AttrFlags.STRIKETHROUGH) tags.push('{strikethrough}');

	return tags;
}

/**
 * Creates tagged text from a text segment.
 * Useful for converting parsed segments back to tagged format.
 *
 * @param segment - Text segment with style info
 * @returns Tagged text string
 *
 * @example
 * ```typescript
 * import { segmentToTaggedText, parseTags } from 'blecsd';
 *
 * const parsed = parseTags('{bold}Hello{/bold}');
 * const tagged = segmentToTaggedText(parsed.segments[0]);
 * // tagged = '{bold}Hello{/}'
 * ```
 */
export function segmentToTaggedText(segment: TextSegment): string {
	const tags: string[] = [];

	// Add attribute tags
	const attrTags = attrsToTags(segment.attrs);
	tags.push(...attrTags);

	// Add color tags
	if (segment.fg !== DEFAULT_FG) {
		tags.push(colorToTag(segment.fg, 'fg'));
	}
	if (segment.bg !== DEFAULT_BG) {
		tags.push(colorToTag(segment.bg, 'bg'));
	}

	// Escape the text
	const escaped = escapeTags(segment.text);

	// Wrap with tags
	if (tags.length === 0) {
		return escaped;
	}

	return `${tags.join('')}${escaped}{/}`;
}

/**
 * Converts parsed content back to tagged text format.
 *
 * @param content - Parsed content with segments
 * @returns Reconstructed tagged text
 *
 * @example
 * ```typescript
 * import { parseTags, parsedToTaggedText } from 'blecsd';
 *
 * const content = parseTags('{bold}Hello{/bold} {red-fg}World{/red-fg}');
 * const text = parsedToTaggedText(content);
 * // Reconstructs the original tagged format
 * ```
 */
export function parsedToTaggedText(content: ParsedContent): string {
	const parts: string[] = [];

	// Add alignment tag if not default
	if (content.alignment !== 'left') {
		parts.push(`{${content.alignment}}`);
	}

	// Convert each segment
	for (const segment of content.segments) {
		parts.push(segmentToTaggedText(segment));
	}

	return parts.join('');
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for text segment.
 */
export const TextSegmentSchema = z.object({
	text: z.string(),
	fg: z.number(),
	bg: z.number(),
	attrs: z.number(),
});

/**
 * Zod schema for parsed content.
 */
export const ParsedContentSchema = z.object({
	segments: z.array(TextSegmentSchema),
	alignment: AlignmentSchema,
	plainText: z.string(),
});
