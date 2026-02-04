import { describe, expect, it } from 'vitest';
import {
	alignLine,
	getVisibleWidth,
	padHeight,
	stripAnsi,
	truncate,
	wordWrap,
	wrapText,
} from './textWrap';

describe('stripAnsi', () => {
	it('removes CSI color sequences', () => {
		expect(stripAnsi('\x1b[31mRed\x1b[0m')).toBe('Red');
	});

	it('removes multiple color codes', () => {
		expect(stripAnsi('\x1b[1m\x1b[31mBold Red\x1b[0m')).toBe('Bold Red');
	});

	it('removes cursor movement codes', () => {
		expect(stripAnsi('\x1b[2AUp\x1b[2BDown')).toBe('UpDown');
	});

	it('preserves text without ANSI codes', () => {
		expect(stripAnsi('Hello World')).toBe('Hello World');
	});

	it('handles empty string', () => {
		expect(stripAnsi('')).toBe('');
	});

	it('removes SGR sequences with multiple parameters', () => {
		expect(stripAnsi('\x1b[38;5;196mColored\x1b[0m')).toBe('Colored');
	});
});

describe('getVisibleWidth', () => {
	it('returns length for plain ASCII', () => {
		expect(getVisibleWidth('Hello')).toBe(5);
	});

	it('excludes ANSI codes from width', () => {
		expect(getVisibleWidth('\x1b[31mHello\x1b[0m')).toBe(5);
	});

	it('handles empty string', () => {
		expect(getVisibleWidth('')).toBe(0);
	});

	it('handles multiple ANSI codes', () => {
		expect(getVisibleWidth('\x1b[1m\x1b[31mBold Red\x1b[0m')).toBe(8);
	});

	it('counts spaces', () => {
		expect(getVisibleWidth('a b c')).toBe(5);
	});
});

describe('truncate', () => {
	it('returns original if fits', () => {
		expect(truncate('Hello', 10)).toBe('Hello');
	});

	it('truncates with ellipsis', () => {
		expect(truncate('Hello World', 8)).toBe('Hello W…');
	});

	it('handles width of 0', () => {
		expect(truncate('Hello', 0)).toBe('');
	});

	it('handles width equal to text length', () => {
		expect(truncate('Hello', 5)).toBe('Hello');
	});

	it('handles very short width', () => {
		expect(truncate('Hello', 2)).toBe('H…');
	});

	it('handles width of 1', () => {
		expect(truncate('Hello', 1)).toBe('…');
	});

	it('uses custom ellipsis', () => {
		expect(truncate('Hello World', 8, '...')).toBe('Hello...');
	});

	it('preserves ANSI codes before truncation point', () => {
		const result = truncate('\x1b[31mHello World\x1b[0m', 8);
		expect(result).toContain('\x1b[31m');
		expect(stripAnsi(result)).toBe('Hello W…');
	});
});

describe('alignLine', () => {
	it('aligns left', () => {
		expect(alignLine('Hello', 10, 'left')).toBe('Hello     ');
	});

	it('aligns right', () => {
		expect(alignLine('Hello', 10, 'right')).toBe('     Hello');
	});

	it('aligns center', () => {
		expect(alignLine('Hello', 10, 'center')).toBe('  Hello   ');
	});

	it('handles odd padding for center', () => {
		expect(alignLine('Hi', 5, 'center')).toBe(' Hi  ');
	});

	it('returns original if already at width', () => {
		expect(alignLine('Hello', 5, 'left')).toBe('Hello');
	});

	it('returns original if exceeds width', () => {
		expect(alignLine('Hello World', 5, 'center')).toBe('Hello World');
	});

	it('handles empty string', () => {
		expect(alignLine('', 5, 'center')).toBe('     ');
	});

	it('handles text with ANSI codes', () => {
		const result = alignLine('\x1b[31mHi\x1b[0m', 5, 'center');
		expect(result).toBe(' \x1b[31mHi\x1b[0m  ');
	});
});

describe('wordWrap', () => {
	it('wraps at word boundaries', () => {
		const result = wordWrap('The quick brown fox', 10);
		expect(result).toEqual(['The quick', 'brown fox']);
	});

	it('handles single long word', () => {
		const result = wordWrap('supercalifragilistic', 10);
		expect(result).toEqual(['supercalif', 'ragilistic']);
	});

	it('preserves existing newlines', () => {
		const result = wordWrap('Hello\nWorld', 20);
		expect(result).toEqual(['Hello', 'World']);
	});

	it('handles empty string', () => {
		expect(wordWrap('', 10)).toEqual(['']);
	});

	it('handles width of 0', () => {
		expect(wordWrap('Hello', 0)).toEqual(['']);
	});

	it('handles multiple spaces', () => {
		const result = wordWrap('Hello   World', 20);
		expect(result).toEqual(['Hello   World']);
	});

	it('handles text exactly at width', () => {
		const result = wordWrap('Hello', 5);
		expect(result).toEqual(['Hello']);
	});

	it('wraps multiple paragraphs', () => {
		const result = wordWrap('Hello World\n\nGoodbye World', 20);
		expect(result).toEqual(['Hello World', '', 'Goodbye World']);
	});

	it('handles trailing spaces', () => {
		const result = wordWrap('Hello   ', 10);
		expect(result).toEqual(['Hello']);
	});
});

describe('wrapText', () => {
	it('wraps and aligns left', () => {
		const result = wrapText('Hello World', { width: 10, align: 'left' });
		expect(result).toEqual(['Hello     ', 'World     ']);
	});

	it('wraps and aligns center', () => {
		const result = wrapText('Hello World', { width: 10, align: 'center' });
		expect(result).toEqual(['  Hello   ', '  World   ']);
	});

	it('wraps and aligns right', () => {
		const result = wrapText('Hello World', { width: 10, align: 'right' });
		expect(result).toEqual(['     Hello', '     World']);
	});

	it('respects wrap: false', () => {
		const result = wrapText('Hello World', { width: 8, wrap: false });
		expect(result).toEqual(['Hello W…']);
	});

	it('uses breakWord option', () => {
		const result = wrapText('ABCDEFGHIJ', { width: 5, breakWord: true });
		expect(result).toEqual(['ABCDE', 'FGHIJ']);
	});

	it('handles empty string', () => {
		expect(wrapText('', { width: 10 })).toEqual(['          ']);
	});

	it('handles width of 0', () => {
		expect(wrapText('Hello', { width: 0 })).toEqual(['']);
	});

	it('handles multiline input', () => {
		const result = wrapText('Line 1\nLine 2', { width: 10, align: 'left' });
		expect(result).toEqual(['Line 1    ', 'Line 2    ']);
	});

	it('preserves ANSI codes during wrap', () => {
		const result = wrapText('\x1b[31mRed Text\x1b[0m', { width: 10, align: 'left' });
		expect(result.length).toBe(1);
		expect(result[0]).toContain('\x1b[31m');
	});

	it('handles incomplete ANSI sequences with breakWord', () => {
		const result = wrapText('\x1b[', { width: 1, breakWord: true, align: 'left' });
		expect(result).toEqual(['\x1b', '[']);
	});

	it('preserves content when breaking incomplete ANSI sequences', () => {
		const input = '\x1b[ABC';
		const result = wrapText(input, { width: 1, breakWord: true, align: 'left' });
		const rebuilt = result.map((line) => line.trimEnd()).join('');
		expect(rebuilt).toBe(input);
	});

	it('handles ANSI-only content with breakWord', () => {
		const input = '\x1b[31m\x1b[0m';
		const result = wrapText(input, { width: 4, breakWord: true, align: 'left' });
		expect(result).toHaveLength(1);
		expect(result[0]).toContain('\x1b[31m');
		expect(getVisibleWidth(result[0] ?? '')).toBe(4);
	});
});

describe('padHeight', () => {
	it('pads to height at top', () => {
		const result = padHeight(['Hello'], 3, 5, 'top');
		expect(result).toEqual(['Hello', '     ', '     ']);
	});

	it('pads to height at bottom', () => {
		const result = padHeight(['Hello'], 3, 5, 'bottom');
		expect(result).toEqual(['     ', '     ', 'Hello']);
	});

	it('pads to height at middle', () => {
		const result = padHeight(['Hello'], 3, 5, 'middle');
		expect(result).toEqual(['     ', 'Hello', '     ']);
	});

	it('handles odd padding for middle', () => {
		const result = padHeight(['Hello'], 4, 5, 'middle');
		expect(result).toEqual(['     ', 'Hello', '     ', '     ']);
	});

	it('truncates if lines exceed height', () => {
		const result = padHeight(['A', 'B', 'C'], 2, 5, 'top');
		expect(result).toEqual(['A', 'B']);
	});

	it('returns original if at height', () => {
		const result = padHeight(['A', 'B'], 2, 5, 'top');
		expect(result).toEqual(['A', 'B']);
	});

	it('handles empty lines array', () => {
		const result = padHeight([], 2, 5, 'top');
		expect(result).toEqual(['     ', '     ']);
	});

	it('handles multiple lines', () => {
		const result = padHeight(['Line 1', 'Line 2'], 4, 10, 'middle');
		expect(result).toEqual(['          ', 'Line 1', 'Line 2', '          ']);
	});
});

describe('integration', () => {
	it('wraps and pads a paragraph', () => {
		const wrapped = wrapText('Hello World', { width: 10, align: 'center' });
		const padded = padHeight(wrapped, 4, 10, 'middle');

		expect(padded).toEqual(['          ', '  Hello   ', '  World   ', '          ']);
	});

	it('handles complex ANSI text', () => {
		const text = '\x1b[1m\x1b[31mBold Red\x1b[0m Normal';
		const wrapped = wrapText(text, { width: 15, align: 'left' });

		expect(wrapped.length).toBe(1);
		const firstLine = wrapped[0];
		expect(firstLine).toBeDefined();
		expect(getVisibleWidth(firstLine ?? '')).toBe(15);
	});

	it('wraps long text correctly', () => {
		const text = 'The quick brown fox jumps over the lazy dog';
		const lines = wordWrap(text, 20);

		expect(lines.length).toBe(3);
		for (const line of lines) {
			expect(getVisibleWidth(line)).toBeLessThanOrEqual(20);
		}
	});
});
