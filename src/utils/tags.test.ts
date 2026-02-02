/**
 * Tag parsing system tests.
 */

import { describe, expect, it } from 'vitest';
import { AttrFlags } from './sattr';
import {
	createTaggedText,
	escapeTags,
	hasTags,
	mergeSegments,
	parseTags,
	stripTags,
	type TextSegment,
	taggedLength,
} from './tags';

describe('tags', () => {
	describe('parseTags', () => {
		it('should parse plain text without tags', () => {
			const result = parseTags('Hello World');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].text).toBe('Hello World');
			expect(result.plainText).toBe('Hello World');
			expect(result.alignment).toBe('left');
		});

		it('should parse bold tag', () => {
			const result = parseTags('{bold}Hello{/bold}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].text).toBe('Hello');
			expect(result.segments[0].attrs).toBe(AttrFlags.BOLD);
		});

		it('should parse underline tag', () => {
			const result = parseTags('{underline}Hello{/underline}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.UNDERLINE);
		});

		it('should parse ul shorthand for underline', () => {
			const result = parseTags('{ul}Hello{/ul}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.UNDERLINE);
		});

		it('should parse italic tag', () => {
			const result = parseTags('{italic}Hello{/italic}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.ITALIC);
		});

		it('should parse blink tag', () => {
			const result = parseTags('{blink}Hello{/blink}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.BLINK);
		});

		it('should parse inverse tag', () => {
			const result = parseTags('{inverse}Hello{/inverse}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.INVERSE);
		});

		it('should parse dim tag', () => {
			const result = parseTags('{dim}Hello{/dim}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.DIM);
		});

		it('should parse strikethrough tag', () => {
			const result = parseTags('{strikethrough}Hello{/strikethrough}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.STRIKETHROUGH);
		});

		it('should parse strike shorthand for strikethrough', () => {
			const result = parseTags('{strike}Hello{/strike}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.STRIKETHROUGH);
		});

		it('should parse invisible tag', () => {
			const result = parseTags('{invisible}Hello{/invisible}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.INVISIBLE);
		});

		it('should parse hidden shorthand for invisible', () => {
			const result = parseTags('{hidden}Hello{/hidden}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.INVISIBLE);
		});

		it('should combine multiple attributes', () => {
			const result = parseTags('{bold}{underline}Hello{/underline}{/bold}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(AttrFlags.BOLD | AttrFlags.UNDERLINE);
		});

		it('should parse named foreground color', () => {
			const result = parseTags('{red-fg}Hello{/red-fg}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].fg).toBe(0xff0000ff);
		});

		it('should parse named background color', () => {
			const result = parseTags('{blue-bg}Hello{/blue-bg}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].bg).toBe(0x0000ffff);
		});

		it('should parse hex foreground color', () => {
			const result = parseTags('{#ff8800-fg}Hello{/}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].fg).toBe(0xff8800ff);
		});

		it('should parse short hex foreground color', () => {
			const result = parseTags('{#f80-fg}Hello{/}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].fg).toBe(0xff8800ff);
		});

		it('should parse hex background color', () => {
			const result = parseTags('{#333333-bg}Hello{/}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].bg).toBe(0x333333ff);
		});

		it('should parse simple color name as foreground', () => {
			const result = parseTags('{green}Hello{/}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].fg).toBe(0x00ff00ff);
		});

		it('should parse alignment tags', () => {
			const left = parseTags('{left}Hello');
			const center = parseTags('{center}Hello');
			const right = parseTags('{right}Hello');

			expect(left.alignment).toBe('left');
			expect(center.alignment).toBe('center');
			expect(right.alignment).toBe('right');
		});

		it('should use last alignment tag', () => {
			const result = parseTags('{left}Hello {center}World');

			expect(result.alignment).toBe('center');
		});

		it('should reset all with {/}', () => {
			const result = parseTags('{bold}{red-fg}Hello{/} World');

			expect(result.segments).toHaveLength(2);
			expect(result.segments[0].attrs).toBe(AttrFlags.BOLD);
			expect(result.segments[0].fg).toBe(0xff0000ff);
			expect(result.segments[1].attrs).toBe(0);
			expect(result.segments[1].fg).toBe(0xffffffff);
		});

		it('should handle multiple segments', () => {
			const result = parseTags('Normal {bold}Bold{/bold} Normal');

			expect(result.segments).toHaveLength(3);
			expect(result.segments[0].text).toBe('Normal ');
			expect(result.segments[0].attrs).toBe(0);
			expect(result.segments[1].text).toBe('Bold');
			expect(result.segments[1].attrs).toBe(AttrFlags.BOLD);
			expect(result.segments[2].text).toBe(' Normal');
			expect(result.segments[2].attrs).toBe(0);
		});

		it('should handle escaped braces', () => {
			const result = parseTags('Use {{bold}} for bold');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].text).toBe('Use {bold} for bold');
			expect(result.segments[0].attrs).toBe(0);
		});

		it('should handle empty input', () => {
			const result = parseTags('');

			expect(result.segments).toHaveLength(0);
			expect(result.plainText).toBe('');
		});

		it('should ignore unknown tags', () => {
			const result = parseTags('{unknown}Hello{/unknown}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].text).toBe('Hello');
			expect(result.segments[0].attrs).toBe(0);
		});

		it('should handle nested tags correctly', () => {
			const result = parseTags('{bold}{italic}Both{/italic} Bold{/bold}');

			expect(result.segments).toHaveLength(2);
			expect(result.segments[0].text).toBe('Both');
			expect(result.segments[0].attrs).toBe(AttrFlags.BOLD | AttrFlags.ITALIC);
			expect(result.segments[1].text).toBe(' Bold');
			expect(result.segments[1].attrs).toBe(AttrFlags.BOLD);
		});

		it('should handle 256-color indices', () => {
			const result = parseTags('{196-fg}Red{/}');

			expect(result.segments).toHaveLength(1);
			// 196 = bright red in 256 color palette
			expect(result.segments[0].fg).not.toBe(0xffffffff);
		});

		it('should extract plainText correctly', () => {
			const result = parseTags('{bold}Hello{/bold} {red-fg}World{/red-fg}');

			expect(result.plainText).toBe('Hello World');
		});

		it('should handle tags at beginning and end', () => {
			const result = parseTags('{bold}Hello World{/bold}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].text).toBe('Hello World');
		});

		it('should handle consecutive tags', () => {
			const result = parseTags('{bold}{underline}{italic}Styled{/}');

			expect(result.segments).toHaveLength(1);
			expect(result.segments[0].attrs).toBe(
				AttrFlags.BOLD | AttrFlags.UNDERLINE | AttrFlags.ITALIC,
			);
		});
	});

	describe('stripTags', () => {
		it('should remove all tags', () => {
			const result = stripTags('{bold}Hello{/bold} {red-fg}World{/red-fg}');

			expect(result).toBe('Hello World');
		});

		it('should handle text without tags', () => {
			const result = stripTags('Hello World');

			expect(result).toBe('Hello World');
		});

		it('should unescape braces', () => {
			const result = stripTags('Use {{bold}} for bold');

			expect(result).toBe('Use {bold} for bold');
		});

		it('should handle empty string', () => {
			const result = stripTags('');

			expect(result).toBe('');
		});

		it('should remove multiple tags', () => {
			const result = stripTags('{bold}{italic}{red-fg}Text{/red-fg}{/italic}{/bold}');

			expect(result).toBe('Text');
		});
	});

	describe('escapeTags', () => {
		it('should escape braces', () => {
			const result = escapeTags('Use {bold} for bold');

			expect(result).toBe('Use {{bold}} for bold');
		});

		it('should handle text without braces', () => {
			const result = escapeTags('Hello World');

			expect(result).toBe('Hello World');
		});

		it('should handle empty string', () => {
			const result = escapeTags('');

			expect(result).toBe('');
		});

		it('should escape multiple braces', () => {
			const result = escapeTags('{a} {b} {c}');

			expect(result).toBe('{{a}} {{b}} {{c}}');
		});
	});

	describe('createTaggedText', () => {
		it('should create bold tag', () => {
			const result = createTaggedText('Hello', { bold: true });

			expect(result).toBe('{bold}Hello{/}');
		});

		it('should create underline tag', () => {
			const result = createTaggedText('Hello', { underline: true });

			expect(result).toBe('{underline}Hello{/}');
		});

		it('should create multiple attribute tags', () => {
			const result = createTaggedText('Hello', { bold: true, italic: true });

			expect(result).toBe('{bold}{italic}Hello{/}');
		});

		it('should create foreground color tag', () => {
			const result = createTaggedText('Hello', { fg: 0xff0000ff });

			expect(result).toBe('{#ff0000-fg}Hello{/}');
		});

		it('should create background color tag', () => {
			const result = createTaggedText('Hello', { bg: 0x00ff00ff });

			expect(result).toBe('{#00ff00-bg}Hello{/}');
		});

		it('should combine attributes and colors', () => {
			const result = createTaggedText('Hello', { bold: true, fg: 0xff0000ff });

			expect(result).toBe('{bold}{#ff0000-fg}Hello{/}');
		});

		it('should escape text content', () => {
			const result = createTaggedText('{Hello}', { bold: true });

			expect(result).toBe('{bold}{{Hello}}{/}');
		});

		it('should return plain text for no style', () => {
			const result = createTaggedText('Hello', {});

			expect(result).toBe('Hello');
		});
	});

	describe('mergeSegments', () => {
		it('should merge adjacent segments with same style', () => {
			const segments: TextSegment[] = [
				{ text: 'Hello', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
				{ text: ' World', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
			];

			const result = mergeSegments(segments);

			expect(result).toHaveLength(1);
			expect(result[0].text).toBe('Hello World');
		});

		it('should not merge segments with different styles', () => {
			const segments: TextSegment[] = [
				{ text: 'Hello', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
				{ text: ' World', fg: 0xff0000ff, bg: 0x00000000, attrs: 0 },
			];

			const result = mergeSegments(segments);

			expect(result).toHaveLength(2);
		});

		it('should handle empty array', () => {
			const result = mergeSegments([]);

			expect(result).toHaveLength(0);
		});

		it('should handle single segment', () => {
			const segments: TextSegment[] = [{ text: 'Hello', fg: 0xffffffff, bg: 0x00000000, attrs: 0 }];

			const result = mergeSegments(segments);

			expect(result).toHaveLength(1);
		});

		it('should merge multiple consecutive same-style segments', () => {
			const segments: TextSegment[] = [
				{ text: 'A', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
				{ text: 'B', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
				{ text: 'C', fg: 0xffffffff, bg: 0x00000000, attrs: 0 },
			];

			const result = mergeSegments(segments);

			expect(result).toHaveLength(1);
			expect(result[0].text).toBe('ABC');
		});
	});

	describe('taggedLength', () => {
		it('should return length without tags', () => {
			const result = taggedLength('{bold}Hello{/bold}');

			expect(result).toBe(5);
		});

		it('should handle plain text', () => {
			const result = taggedLength('Hello');

			expect(result).toBe(5);
		});

		it('should handle empty string', () => {
			const result = taggedLength('');

			expect(result).toBe(0);
		});

		it('should count escaped braces', () => {
			const result = taggedLength('{{bold}}');

			expect(result).toBe(6); // {bold}
		});
	});

	describe('hasTags', () => {
		it('should return true for tagged text', () => {
			expect(hasTags('{bold}Hello{/bold}')).toBe(true);
		});

		it('should return false for plain text', () => {
			expect(hasTags('Hello World')).toBe(false);
		});

		it('should return false for escaped braces', () => {
			expect(hasTags('{{bold}}')).toBe(false);
		});

		it('should return true for any valid tag', () => {
			expect(hasTags('Hello {red-fg}')).toBe(true);
		});

		it('should return false for empty string', () => {
			expect(hasTags('')).toBe(false);
		});
	});

	describe('color parsing', () => {
		it('should parse standard colors', () => {
			// Note: 'white' has the same value as default fg, so we check specific colors
			const colorValues: Record<string, number> = {
				black: 0x000000ff,
				red: 0xff0000ff,
				green: 0x00ff00ff,
				yellow: 0xffff00ff,
				blue: 0x0000ffff,
				magenta: 0xff00ffff,
				cyan: 0x00ffffff,
				white: 0xffffffff,
			};

			for (const [color, expected] of Object.entries(colorValues)) {
				const result = parseTags(`{${color}-fg}X{/}`);
				expect(result.segments[0].fg).toBe(expected);
			}
		});

		it('should parse bright colors', () => {
			const result = parseTags('{bright-red-fg}X{/}');
			expect(result.segments[0].fg).toBe(0xff8080ff);
		});

		it('should parse gray/grey aliases', () => {
			const gray = parseTags('{gray-fg}X{/}');
			const grey = parseTags('{grey-fg}X{/}');

			expect(gray.segments[0].fg).toBe(grey.segments[0].fg);
		});

		it('should parse additional colors', () => {
			const colors = ['orange', 'pink', 'purple', 'brown', 'lime', 'navy', 'teal'];

			for (const color of colors) {
				const result = parseTags(`{${color}-fg}X{/}`);
				expect(result.segments[0].fg).not.toBe(0xffffffff);
			}
		});

		it('should handle case-insensitive color names', () => {
			const lower = parseTags('{red-fg}X{/}');
			const upper = parseTags('{RED-fg}X{/}');
			const mixed = parseTags('{Red-fg}X{/}');

			expect(lower.segments[0].fg).toBe(upper.segments[0].fg);
			expect(lower.segments[0].fg).toBe(mixed.segments[0].fg);
		});
	});
});
