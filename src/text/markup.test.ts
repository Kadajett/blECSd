/**
 * Tests for text markup parser
 * @module text/markup
 */

import { describe, expect, it } from 'vitest';
import { markupLength, parseMarkup, renderMarkup, stripMarkup } from './markup';

describe('stripMarkup', () => {
	it('removes all tags and returns plain text', () => {
		expect(stripMarkup('{bold}hello{/bold}')).toBe('hello');
		expect(stripMarkup('{red-fg}text{/red-fg}')).toBe('text');
		expect(stripMarkup('{bold}{underline}nested{/underline}{/bold}')).toBe('nested');
	});

	it('handles empty tags', () => {
		expect(stripMarkup('{bold}{/bold}')).toBe('');
	});

	it('handles text without tags', () => {
		expect(stripMarkup('plain text')).toBe('plain text');
	});

	it('handles escaped braces', () => {
		expect(stripMarkup('{open}left brace')).toBe('{left brace');
		expect(stripMarkup('right{close} brace')).toBe('right} brace');
		expect(stripMarkup('{open}{close}')).toBe('{}');
	});

	it('handles malformed tags gracefully', () => {
		expect(stripMarkup('unclosed {bold}tag')).toBe('unclosed tag');
		expect(stripMarkup('{/bold} closing without opening')).toBe(' closing without opening');
	});

	it('handles multiple tag types', () => {
		expect(stripMarkup('{bold}bold {red-fg}red{/red-fg}{/bold} normal')).toBe('bold red normal');
	});
});

describe('markupLength', () => {
	it('calculates visible text length excluding tags', () => {
		expect(markupLength('hello')).toBe(5);
		expect(markupLength('{bold}hello{/bold}')).toBe(5);
		expect(markupLength('{red-fg}hello{/red-fg} world')).toBe(11);
	});

	it('handles empty strings', () => {
		expect(markupLength('')).toBe(0);
		expect(markupLength('{bold}{/bold}')).toBe(0);
	});

	it('handles escaped braces', () => {
		expect(markupLength('{open}{close}')).toBe(2); // '{}'
	});
});

describe('parseMarkup', () => {
	it('parses simple bold tag', () => {
		const segments = parseMarkup('{bold}hello{/bold}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('hello');
		expect(segments[0]?.style.bold).toBe(true);
	});

	it('parses underline tag', () => {
		const segments = parseMarkup('{underline}text{/underline}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.underline).toBe(true);
	});

	it('parses italic tag', () => {
		const segments = parseMarkup('{italic}text{/italic}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.italic).toBe(true);
	});

	it('parses dim tag', () => {
		const segments = parseMarkup('{dim}text{/dim}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.dim).toBe(true);
	});

	it('parses blink tag', () => {
		const segments = parseMarkup('{blink}text{/blink}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.blink).toBe(true);
	});

	it('parses inverse tag', () => {
		const segments = parseMarkup('{inverse}text{/inverse}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.inverse).toBe(true);
	});

	it('parses named foreground color', () => {
		const segments = parseMarkup('{red-fg}text{/red-fg}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.fg).toBeDefined();
	});

	it('parses named background color', () => {
		const segments = parseMarkup('{blue-bg}text{/blue-bg}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.bg).toBeDefined();
	});

	it('parses hex foreground color', () => {
		const segments = parseMarkup('{#ff0000-fg}text{/#ff0000-fg}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.fg).toBeDefined();
	});

	it('parses hex background color', () => {
		const segments = parseMarkup('{#00ff00-bg}text{/#00ff00-bg}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.bg).toBeDefined();
	});

	it('parses center alignment tag', () => {
		const segments = parseMarkup('{center}text{/center}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.align).toBe('center');
	});

	it('parses right alignment tag', () => {
		const segments = parseMarkup('{right}text{/right}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
		expect(segments[0]?.style.align).toBe('right');
	});

	it('handles nested tags', () => {
		const segments = parseMarkup('{bold}{red-fg}bold red{/red-fg}{/bold}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('bold red');
		expect(segments[0]?.style.bold).toBe(true);
		expect(segments[0]?.style.fg).toBeDefined();
	});

	it('handles multiple segments', () => {
		const segments = parseMarkup('normal {bold}bold{/bold} normal');
		expect(segments).toHaveLength(3);
		expect(segments[0]?.text).toBe('normal ');
		expect(segments[0]?.style.bold).toBeUndefined();
		expect(segments[1]?.text).toBe('bold');
		expect(segments[1]?.style.bold).toBe(true);
		expect(segments[2]?.text).toBe(' normal');
		expect(segments[2]?.style.bold).toBeUndefined();
	});

	it('handles reset tag {/}', () => {
		const segments = parseMarkup('{bold}bold{/} normal');
		expect(segments).toHaveLength(2);
		expect(segments[0]?.text).toBe('bold');
		expect(segments[0]?.style.bold).toBe(true);
		expect(segments[1]?.text).toBe(' normal');
		expect(segments[1]?.style.bold).toBeUndefined();
	});

	it('handles escaped braces', () => {
		const segments = parseMarkup('{open}{close}');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('{}');
	});

	it('handles empty input', () => {
		const segments = parseMarkup('');
		expect(segments).toHaveLength(0);
	});

	it('handles plain text without tags', () => {
		const segments = parseMarkup('plain text');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('plain text');
		expect(Object.keys(segments[0]?.style ?? {})).toHaveLength(0);
	});

	it('handles unclosed tags gracefully', () => {
		const segments = parseMarkup('{bold}unclosed');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('unclosed');
		expect(segments[0]?.style.bold).toBe(true);
	});

	it('handles closing tags without opening', () => {
		const segments = parseMarkup('{/bold}text');
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe('text');
	});

	it('handles complex nested case', () => {
		const segments = parseMarkup(
			'{bold}outer {red-fg}nested {underline}deep{/underline}{/red-fg}{/bold}',
		);
		expect(segments).toHaveLength(3);

		// "outer "
		expect(segments[0]?.text).toBe('outer ');
		expect(segments[0]?.style.bold).toBe(true);

		// "nested "
		expect(segments[1]?.text).toBe('nested ');
		expect(segments[1]?.style.bold).toBe(true);
		expect(segments[1]?.style.fg).toBeDefined();

		// "deep"
		expect(segments[2]?.text).toBe('deep');
		expect(segments[2]?.style.bold).toBe(true);
		expect(segments[2]?.style.fg).toBeDefined();
		expect(segments[2]?.style.underline).toBe(true);
	});
});

describe('renderMarkup', () => {
	it('converts styled segments to ANSI escape sequences', () => {
		const segments = parseMarkup('{bold}hello{/bold}');
		const rendered = renderMarkup(segments);
		// Should contain bold codes and reset
		expect(rendered).toContain('\x1b[');
		expect(rendered).toContain('hello');
	});

	it('handles empty segments', () => {
		const rendered = renderMarkup([]);
		expect(rendered).toBe('');
	});

	it('handles plain text segments', () => {
		const segments = parseMarkup('plain text');
		const rendered = renderMarkup(segments);
		expect(rendered).toContain('plain text');
	});

	it('handles multiple style attributes', () => {
		const segments = parseMarkup('{bold}{underline}text{/underline}{/bold}');
		const rendered = renderMarkup(segments);
		expect(rendered).toContain('text');
		// Should contain both bold and underline codes
		expect(rendered).toContain('\x1b[');
	});
});
