/**
 * Tests for ANSI SGR Attribute Code Parser
 */

import { describe, expect, it } from 'vitest';
import {
	type Attribute,
	applySgrCodes,
	attrCode,
	attrToSgrCodes,
	attributesEqual,
	codeAttr,
	ColorType,
	cloneAttribute,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	sgrReset,
	stripAnsi,
	TextStyle,
	unpackRgb,
	visibleLength,
} from './parser';

describe('createAttribute', () => {
	it('creates attribute with default values', () => {
		const attr = createAttribute();
		expect(attr.fg.type).toBe(ColorType.DEFAULT);
		expect(attr.fg.value).toBe(0);
		expect(attr.bg.type).toBe(ColorType.DEFAULT);
		expect(attr.bg.value).toBe(0);
		expect(attr.styles).toBe(TextStyle.NONE);
	});
});

describe('cloneAttribute', () => {
	it('creates an independent copy', () => {
		const attr = createAttribute();
		attr.fg = { type: ColorType.BASIC, value: 1 };
		attr.styles = TextStyle.BOLD;

		const clone = cloneAttribute(attr);

		expect(clone.fg.type).toBe(ColorType.BASIC);
		expect(clone.fg.value).toBe(1);
		expect(clone.styles).toBe(TextStyle.BOLD);

		// Modify original, clone should be unchanged
		attr.fg.value = 2;
		expect(clone.fg.value).toBe(1);
	});
});

describe('extractSgrCodes', () => {
	it('extracts single SGR code', () => {
		const codes = extractSgrCodes('\x1b[1m');
		expect(codes).toEqual([[1]]);
	});

	it('extracts multiple codes in one sequence', () => {
		const codes = extractSgrCodes('\x1b[1;31;4m');
		expect(codes).toEqual([[1, 31, 4]]);
	});

	it('extracts multiple separate sequences', () => {
		const codes = extractSgrCodes('\x1b[1m\x1b[31m');
		expect(codes).toEqual([[1], [31]]);
	});

	it('handles empty parameter as reset', () => {
		const codes = extractSgrCodes('\x1b[m');
		expect(codes).toEqual([[0]]);
	});

	it('extracts 256-color codes', () => {
		const codes = extractSgrCodes('\x1b[38;5;196m');
		expect(codes).toEqual([[38, 5, 196]]);
	});

	it('extracts RGB codes', () => {
		const codes = extractSgrCodes('\x1b[38;2;255;128;0m');
		expect(codes).toEqual([[38, 2, 255, 128, 0]]);
	});

	it('returns empty array for no SGR sequences', () => {
		const codes = extractSgrCodes('Hello World');
		expect(codes).toEqual([]);
	});

	it('handles mixed content', () => {
		const codes = extractSgrCodes('Hello \x1b[1mWorld\x1b[0m!');
		expect(codes).toEqual([[1], [0]]);
	});
});

describe('applySgrCodes', () => {
	describe('reset', () => {
		it('resets all attributes on code 0', () => {
			const attr = createAttribute();
			attr.fg = { type: ColorType.BASIC, value: 1 };
			attr.styles = TextStyle.BOLD | TextStyle.ITALIC;

			applySgrCodes([0], attr);

			expect(attr.fg.type).toBe(ColorType.DEFAULT);
			expect(attr.styles).toBe(TextStyle.NONE);
		});
	});

	describe('style codes', () => {
		it('applies bold (code 1)', () => {
			const attr = createAttribute();
			applySgrCodes([1], attr);
			expect(attr.styles & TextStyle.BOLD).toBeTruthy();
		});

		it('applies dim (code 2)', () => {
			const attr = createAttribute();
			applySgrCodes([2], attr);
			expect(attr.styles & TextStyle.DIM).toBeTruthy();
		});

		it('applies italic (code 3)', () => {
			const attr = createAttribute();
			applySgrCodes([3], attr);
			expect(attr.styles & TextStyle.ITALIC).toBeTruthy();
		});

		it('applies underline (code 4)', () => {
			const attr = createAttribute();
			applySgrCodes([4], attr);
			expect(attr.styles & TextStyle.UNDERLINE).toBeTruthy();
		});

		it('applies blink (code 5)', () => {
			const attr = createAttribute();
			applySgrCodes([5], attr);
			expect(attr.styles & TextStyle.BLINK).toBeTruthy();
		});

		it('applies rapid blink (code 6)', () => {
			const attr = createAttribute();
			applySgrCodes([6], attr);
			expect(attr.styles & TextStyle.RAPID_BLINK).toBeTruthy();
		});

		it('applies inverse (code 7)', () => {
			const attr = createAttribute();
			applySgrCodes([7], attr);
			expect(attr.styles & TextStyle.INVERSE).toBeTruthy();
		});

		it('applies hidden (code 8)', () => {
			const attr = createAttribute();
			applySgrCodes([8], attr);
			expect(attr.styles & TextStyle.HIDDEN).toBeTruthy();
		});

		it('applies strikethrough (code 9)', () => {
			const attr = createAttribute();
			applySgrCodes([9], attr);
			expect(attr.styles & TextStyle.STRIKETHROUGH).toBeTruthy();
		});

		it('applies double underline (code 21)', () => {
			const attr = createAttribute();
			applySgrCodes([21], attr);
			expect(attr.styles & TextStyle.DOUBLE_UNDERLINE).toBeTruthy();
		});

		it('applies overline (code 53)', () => {
			const attr = createAttribute();
			applySgrCodes([53], attr);
			expect(attr.styles & TextStyle.OVERLINE).toBeTruthy();
		});
	});

	describe('style reset codes', () => {
		it('resets bold/dim (code 22)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.BOLD | TextStyle.DIM;

			applySgrCodes([22], attr);

			expect(attr.styles & TextStyle.BOLD).toBeFalsy();
			expect(attr.styles & TextStyle.DIM).toBeFalsy();
		});

		it('resets italic (code 23)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.ITALIC;

			applySgrCodes([23], attr);

			expect(attr.styles & TextStyle.ITALIC).toBeFalsy();
		});

		it('resets underline (code 24)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.UNDERLINE | TextStyle.DOUBLE_UNDERLINE;

			applySgrCodes([24], attr);

			expect(attr.styles & TextStyle.UNDERLINE).toBeFalsy();
			expect(attr.styles & TextStyle.DOUBLE_UNDERLINE).toBeFalsy();
		});

		it('resets blink (code 25)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.BLINK | TextStyle.RAPID_BLINK;

			applySgrCodes([25], attr);

			expect(attr.styles & TextStyle.BLINK).toBeFalsy();
			expect(attr.styles & TextStyle.RAPID_BLINK).toBeFalsy();
		});

		it('resets inverse (code 27)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.INVERSE;

			applySgrCodes([27], attr);

			expect(attr.styles & TextStyle.INVERSE).toBeFalsy();
		});

		it('resets hidden (code 28)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.HIDDEN;

			applySgrCodes([28], attr);

			expect(attr.styles & TextStyle.HIDDEN).toBeFalsy();
		});

		it('resets strikethrough (code 29)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.STRIKETHROUGH;

			applySgrCodes([29], attr);

			expect(attr.styles & TextStyle.STRIKETHROUGH).toBeFalsy();
		});

		it('resets overline (code 55)', () => {
			const attr = createAttribute();
			attr.styles = TextStyle.OVERLINE;

			applySgrCodes([55], attr);

			expect(attr.styles & TextStyle.OVERLINE).toBeFalsy();
		});
	});

	describe('foreground colors', () => {
		it('applies basic foreground colors (30-37)', () => {
			const attr = createAttribute();
			applySgrCodes([31], attr);
			expect(attr.fg.type).toBe(ColorType.BASIC);
			expect(attr.fg.value).toBe(1); // red
		});

		it('applies bright foreground colors (90-97)', () => {
			const attr = createAttribute();
			applySgrCodes([91], attr);
			expect(attr.fg.type).toBe(ColorType.BASIC);
			expect(attr.fg.value).toBe(9); // bright red
		});

		it('resets foreground to default (code 39)', () => {
			const attr = createAttribute();
			attr.fg = { type: ColorType.BASIC, value: 1 };

			applySgrCodes([39], attr);

			expect(attr.fg.type).toBe(ColorType.DEFAULT);
		});

		it('applies 256-color foreground (38;5;N)', () => {
			const attr = createAttribute();
			applySgrCodes([38, 5, 196], attr);
			expect(attr.fg.type).toBe(ColorType.COLOR_256);
			expect(attr.fg.value).toBe(196);
		});

		it('applies RGB foreground (38;2;R;G;B)', () => {
			const attr = createAttribute();
			applySgrCodes([38, 2, 255, 128, 0], attr);
			expect(attr.fg.type).toBe(ColorType.RGB);
			const { r, g, b } = unpackRgb(attr.fg.value);
			expect(r).toBe(255);
			expect(g).toBe(128);
			expect(b).toBe(0);
		});
	});

	describe('background colors', () => {
		it('applies basic background colors (40-47)', () => {
			const attr = createAttribute();
			applySgrCodes([41], attr);
			expect(attr.bg.type).toBe(ColorType.BASIC);
			expect(attr.bg.value).toBe(1); // red
		});

		it('applies bright background colors (100-107)', () => {
			const attr = createAttribute();
			applySgrCodes([101], attr);
			expect(attr.bg.type).toBe(ColorType.BASIC);
			expect(attr.bg.value).toBe(9); // bright red
		});

		it('resets background to default (code 49)', () => {
			const attr = createAttribute();
			attr.bg = { type: ColorType.BASIC, value: 1 };

			applySgrCodes([49], attr);

			expect(attr.bg.type).toBe(ColorType.DEFAULT);
		});

		it('applies 256-color background (48;5;N)', () => {
			const attr = createAttribute();
			applySgrCodes([48, 5, 220], attr);
			expect(attr.bg.type).toBe(ColorType.COLOR_256);
			expect(attr.bg.value).toBe(220);
		});

		it('applies RGB background (48;2;R;G;B)', () => {
			const attr = createAttribute();
			applySgrCodes([48, 2, 100, 150, 200], attr);
			expect(attr.bg.type).toBe(ColorType.RGB);
			const { r, g, b } = unpackRgb(attr.bg.value);
			expect(r).toBe(100);
			expect(g).toBe(150);
			expect(b).toBe(200);
		});
	});

	describe('multiple codes', () => {
		it('applies multiple styles', () => {
			const attr = createAttribute();
			applySgrCodes([1, 3, 4], attr);
			expect(attr.styles & TextStyle.BOLD).toBeTruthy();
			expect(attr.styles & TextStyle.ITALIC).toBeTruthy();
			expect(attr.styles & TextStyle.UNDERLINE).toBeTruthy();
		});

		it('applies style and color together', () => {
			const attr = createAttribute();
			applySgrCodes([1, 31], attr);
			expect(attr.styles & TextStyle.BOLD).toBeTruthy();
			expect(attr.fg.type).toBe(ColorType.BASIC);
			expect(attr.fg.value).toBe(1);
		});

		it('stacks multiple attributes', () => {
			const attr = createAttribute();
			applySgrCodes([1, 2, 3, 4, 9, 53], attr);
			expect(attr.styles & TextStyle.BOLD).toBeTruthy();
			expect(attr.styles & TextStyle.DIM).toBeTruthy();
			expect(attr.styles & TextStyle.ITALIC).toBeTruthy();
			expect(attr.styles & TextStyle.UNDERLINE).toBeTruthy();
			expect(attr.styles & TextStyle.STRIKETHROUGH).toBeTruthy();
			expect(attr.styles & TextStyle.OVERLINE).toBeTruthy();
		});
	});
});

describe('parseSgrString', () => {
	it('parses single sequence', () => {
		const attr = createAttribute();
		parseSgrString('\x1b[1;31m', attr);
		expect(attr.styles & TextStyle.BOLD).toBeTruthy();
		expect(attr.fg.value).toBe(1);
	});

	it('parses multiple sequences', () => {
		const attr = createAttribute();
		parseSgrString('\x1b[1m\x1b[31m\x1b[4m', attr);
		expect(attr.styles & TextStyle.BOLD).toBeTruthy();
		expect(attr.styles & TextStyle.UNDERLINE).toBeTruthy();
		expect(attr.fg.value).toBe(1);
	});

	it('handles mixed text and sequences', () => {
		const attr = createAttribute();
		parseSgrString('Hello \x1b[1mWorld\x1b[0m!', attr);
		// After reset, should be back to default
		expect(attr.styles).toBe(TextStyle.NONE);
	});
});

describe('attrCode', () => {
	it('applies single code', () => {
		const attr = createAttribute();
		const result = attrCode(1, attr);
		expect(result.styles & TextStyle.BOLD).toBeTruthy();
		// Original unchanged
		expect(attr.styles).toBe(TextStyle.NONE);
	});

	it('applies array of codes', () => {
		const attr = createAttribute();
		const result = attrCode([1, 31], attr);
		expect(result.styles & TextStyle.BOLD).toBeTruthy();
		expect(result.fg.value).toBe(1);
	});

	it('uses custom default for reset', () => {
		const customDefault: Attribute = {
			fg: { type: ColorType.BASIC, value: 7 }, // white
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.BOLD,
		};

		const attr = createAttribute();
		const result = attrCode(0, attr, customDefault);

		expect(result.fg.value).toBe(7);
		expect(result.styles & TextStyle.BOLD).toBeTruthy();
	});

	it('chains attribute changes', () => {
		let attr = createAttribute();
		attr = attrCode(1, attr); // bold
		attr = attrCode(31, attr); // red
		attr = attrCode(4, attr); // underline

		expect(attr.styles & TextStyle.BOLD).toBeTruthy();
		expect(attr.styles & TextStyle.UNDERLINE).toBeTruthy();
		expect(attr.fg.value).toBe(1);
	});
});

describe('hasStyle', () => {
	it('returns true when style is set', () => {
		const attr = createAttribute();
		attr.styles = TextStyle.BOLD | TextStyle.ITALIC;

		expect(hasStyle(attr, TextStyle.BOLD)).toBe(true);
		expect(hasStyle(attr, TextStyle.ITALIC)).toBe(true);
	});

	it('returns false when style is not set', () => {
		const attr = createAttribute();
		attr.styles = TextStyle.BOLD;

		expect(hasStyle(attr, TextStyle.ITALIC)).toBe(false);
		expect(hasStyle(attr, TextStyle.UNDERLINE)).toBe(false);
	});
});

describe('attributesEqual', () => {
	it('returns true for equal attributes', () => {
		const a = createAttribute();
		const b = createAttribute();

		expect(attributesEqual(a, b)).toBe(true);
	});

	it('returns true for identical non-default attributes', () => {
		const a: Attribute = {
			fg: { type: ColorType.BASIC, value: 1 },
			bg: { type: ColorType.COLOR_256, value: 220 },
			styles: TextStyle.BOLD | TextStyle.ITALIC,
		};
		const b: Attribute = {
			fg: { type: ColorType.BASIC, value: 1 },
			bg: { type: ColorType.COLOR_256, value: 220 },
			styles: TextStyle.BOLD | TextStyle.ITALIC,
		};

		expect(attributesEqual(a, b)).toBe(true);
	});

	it('returns false for different fg colors', () => {
		const a = createAttribute();
		const b = createAttribute();
		b.fg = { type: ColorType.BASIC, value: 1 };

		expect(attributesEqual(a, b)).toBe(false);
	});

	it('returns false for different bg colors', () => {
		const a = createAttribute();
		const b = createAttribute();
		b.bg = { type: ColorType.BASIC, value: 1 };

		expect(attributesEqual(a, b)).toBe(false);
	});

	it('returns false for different styles', () => {
		const a = createAttribute();
		const b = createAttribute();
		b.styles = TextStyle.BOLD;

		expect(attributesEqual(a, b)).toBe(false);
	});
});

describe('packRgb / unpackRgb', () => {
	it('packs and unpacks correctly', () => {
		const packed = packRgb(255, 128, 64);
		const { r, g, b } = unpackRgb(packed);

		expect(r).toBe(255);
		expect(g).toBe(128);
		expect(b).toBe(64);
	});

	it('handles edge values', () => {
		expect(unpackRgb(packRgb(0, 0, 0))).toEqual({ r: 0, g: 0, b: 0 });
		expect(unpackRgb(packRgb(255, 255, 255))).toEqual({ r: 255, g: 255, b: 255 });
	});

	it('handles individual channels', () => {
		expect(unpackRgb(packRgb(255, 0, 0))).toEqual({ r: 255, g: 0, b: 0 });
		expect(unpackRgb(packRgb(0, 255, 0))).toEqual({ r: 0, g: 255, b: 0 });
		expect(unpackRgb(packRgb(0, 0, 255))).toEqual({ r: 0, g: 0, b: 255 });
	});
});

describe('stripAnsi', () => {
	it('removes SGR sequences', () => {
		expect(stripAnsi('\x1b[1;31mHello\x1b[0m')).toBe('Hello');
	});

	it('removes multiple sequences', () => {
		expect(stripAnsi('\x1b[1mBold\x1b[0m \x1b[4mUnderline\x1b[0m')).toBe('Bold Underline');
	});

	it('handles cursor sequences', () => {
		expect(stripAnsi('\x1b[2J\x1b[HHello')).toBe('Hello');
	});

	it('returns original string if no sequences', () => {
		expect(stripAnsi('Hello World')).toBe('Hello World');
	});

	it('handles empty string', () => {
		expect(stripAnsi('')).toBe('');
	});
});

describe('visibleLength', () => {
	it('returns length without ANSI codes', () => {
		expect(visibleLength('\x1b[1;31mHello\x1b[0m')).toBe(5);
	});

	it('counts all visible characters', () => {
		expect(visibleLength('\x1b[1mBold\x1b[0m \x1b[4mUnderline\x1b[0m')).toBe(14);
	});

	it('returns correct length for plain text', () => {
		expect(visibleLength('Hello World')).toBe(11);
	});

	it('returns 0 for empty string', () => {
		expect(visibleLength('')).toBe(0);
	});
});

describe('DEFAULT_ATTRIBUTE', () => {
	it('is frozen/readonly', () => {
		expect(DEFAULT_ATTRIBUTE.styles).toBe(TextStyle.NONE);
		expect(DEFAULT_ATTRIBUTE.fg.type).toBe(ColorType.DEFAULT);
		expect(DEFAULT_ATTRIBUTE.bg.type).toBe(ColorType.DEFAULT);
	});
});

describe('TextStyle constants', () => {
	it('has unique bit values', () => {
		const values = Object.values(TextStyle).filter((v) => typeof v === 'number' && v !== 0);
		const set = new Set(values);
		expect(set.size).toBe(values.length);
	});

	it('allows combining multiple styles', () => {
		const combined =
			TextStyle.BOLD |
			TextStyle.ITALIC |
			TextStyle.UNDERLINE |
			TextStyle.STRIKETHROUGH |
			TextStyle.OVERLINE;

		expect(combined & TextStyle.BOLD).toBeTruthy();
		expect(combined & TextStyle.ITALIC).toBeTruthy();
		expect(combined & TextStyle.UNDERLINE).toBeTruthy();
		expect(combined & TextStyle.STRIKETHROUGH).toBeTruthy();
		expect(combined & TextStyle.OVERLINE).toBeTruthy();
		expect(combined & TextStyle.HIDDEN).toBeFalsy();
	});
});

describe('codeAttr', () => {
	describe('basic styles', () => {
		it('returns empty string for default attribute', () => {
			const attr = createAttribute();
			expect(codeAttr(attr)).toBe('');
		});

		it('generates bold code', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.BOLD,
			};
			expect(codeAttr(attr)).toBe('\x1b[1m');
		});

		it('generates multiple style codes', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.BOLD | TextStyle.ITALIC | TextStyle.UNDERLINE,
			};
			expect(codeAttr(attr)).toBe('\x1b[1;3;4m');
		});

		it('generates all style codes', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles:
					TextStyle.BOLD |
					TextStyle.DIM |
					TextStyle.ITALIC |
					TextStyle.UNDERLINE |
					TextStyle.BLINK |
					TextStyle.RAPID_BLINK |
					TextStyle.INVERSE |
					TextStyle.HIDDEN |
					TextStyle.STRIKETHROUGH |
					TextStyle.DOUBLE_UNDERLINE |
					TextStyle.OVERLINE,
			};
			expect(codeAttr(attr)).toBe('\x1b[1;2;3;4;5;6;7;8;9;21;53m');
		});
	});

	describe('basic foreground colors', () => {
		it('generates basic foreground color (0-7)', () => {
			const attr: Attribute = {
				fg: { type: ColorType.BASIC, value: 1 }, // red
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[31m');
		});

		it('generates bright foreground color (8-15)', () => {
			const attr: Attribute = {
				fg: { type: ColorType.BASIC, value: 9 }, // bright red
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[91m');
		});
	});

	describe('basic background colors', () => {
		it('generates basic background color (0-7)', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.BASIC, value: 4 }, // blue
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[44m');
		});

		it('generates bright background color (8-15)', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.BASIC, value: 12 }, // bright blue
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[104m');
		});
	});

	describe('256-color support', () => {
		it('generates 256-color foreground', () => {
			const attr: Attribute = {
				fg: { type: ColorType.COLOR_256, value: 196 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[38;5;196m');
		});

		it('generates 256-color background', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.COLOR_256, value: 220 },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[48;5;220m');
		});
	});

	describe('RGB color support', () => {
		it('generates RGB foreground', () => {
			const attr: Attribute = {
				fg: { type: ColorType.RGB, value: packRgb(255, 128, 0) },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[38;2;255;128;0m');
		});

		it('generates RGB background', () => {
			const attr: Attribute = {
				fg: { type: ColorType.DEFAULT, value: 0 },
				bg: { type: ColorType.RGB, value: packRgb(100, 150, 200) },
				styles: TextStyle.NONE,
			};
			expect(codeAttr(attr)).toBe('\x1b[48;2;100;150;200m');
		});
	});

	describe('combined attributes', () => {
		it('generates style and foreground color', () => {
			const attr: Attribute = {
				fg: { type: ColorType.BASIC, value: 1 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.BOLD,
			};
			expect(codeAttr(attr)).toBe('\x1b[1;31m');
		});

		it('generates style, foreground, and background', () => {
			const attr: Attribute = {
				fg: { type: ColorType.BASIC, value: 1 },
				bg: { type: ColorType.BASIC, value: 4 },
				styles: TextStyle.BOLD | TextStyle.UNDERLINE,
			};
			expect(codeAttr(attr)).toBe('\x1b[1;4;31;44m');
		});
	});

	describe('includeReset option', () => {
		it('includes reset when option is true', () => {
			const attr: Attribute = {
				fg: { type: ColorType.BASIC, value: 1 },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.BOLD,
			};
			// 0=reset, 1=bold, 31=red fg, 49=default bg
			expect(codeAttr(attr, { includeReset: true })).toBe('\x1b[0;1;31;49m');
		});

		it('includes default colors when reset is enabled', () => {
			const attr = createAttribute();
			expect(codeAttr(attr, { includeReset: true })).toBe('\x1b[0;39;49m');
		});
	});

	describe('color depth reduction', () => {
		it('reduces RGB to 256-color', () => {
			const attr: Attribute = {
				fg: { type: ColorType.RGB, value: packRgb(255, 0, 0) }, // pure red
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			const result = codeAttr(attr, { colorDepth: '256' });
			// RGB(255,0,0) should map to 256-color palette
			expect(result).toMatch(/^\x1b\[38;5;\d+m$/);
		});

		it('reduces RGB to 16-color', () => {
			const attr: Attribute = {
				fg: { type: ColorType.RGB, value: packRgb(255, 0, 0) }, // pure red
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			const result = codeAttr(attr, { colorDepth: '16' });
			// Should be basic color code 31 or 91
			expect(result).toMatch(/^\x1b\[(3[0-7]|9[0-7])m$/);
		});

		it('reduces 256-color to 16-color', () => {
			const attr: Attribute = {
				fg: { type: ColorType.COLOR_256, value: 196 }, // red in 256-color
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.NONE,
			};
			const result = codeAttr(attr, { colorDepth: '16' });
			// Should be basic color code
			expect(result).toMatch(/^\x1b\[(3[0-7]|9[0-7])m$/);
		});

		it('outputs default colors in none mode', () => {
			const attr: Attribute = {
				fg: { type: ColorType.RGB, value: packRgb(255, 0, 0) },
				bg: { type: ColorType.DEFAULT, value: 0 },
				styles: TextStyle.BOLD,
			};
			const result = codeAttr(attr, { colorDepth: 'none' });
			// Should only have style and default fg
			expect(result).toBe('\x1b[1;39m');
		});
	});
});

describe('attrToSgrCodes', () => {
	it('returns empty array for default attribute', () => {
		const attr = createAttribute();
		expect(attrToSgrCodes(attr)).toEqual([]);
	});

	it('returns style codes', () => {
		const attr: Attribute = {
			fg: { type: ColorType.DEFAULT, value: 0 },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.BOLD | TextStyle.ITALIC,
		};
		expect(attrToSgrCodes(attr)).toEqual([1, 3]);
	});

	it('returns foreground color codes', () => {
		const attr: Attribute = {
			fg: { type: ColorType.BASIC, value: 1 },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.NONE,
		};
		expect(attrToSgrCodes(attr)).toEqual([31]);
	});

	it('returns 256-color codes', () => {
		const attr: Attribute = {
			fg: { type: ColorType.COLOR_256, value: 196 },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.NONE,
		};
		expect(attrToSgrCodes(attr)).toEqual([38, 5, 196]);
	});

	it('returns RGB color codes', () => {
		const attr: Attribute = {
			fg: { type: ColorType.RGB, value: packRgb(255, 128, 0) },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.NONE,
		};
		expect(attrToSgrCodes(attr)).toEqual([38, 2, 255, 128, 0]);
	});

	it('includes reset when option is true', () => {
		const attr: Attribute = {
			fg: { type: ColorType.BASIC, value: 1 },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.BOLD,
		};
		// 0=reset, 1=bold, 31=red fg, 49=default bg
		expect(attrToSgrCodes(attr, { includeReset: true })).toEqual([0, 1, 31, 49]);
	});

	it('respects color depth option', () => {
		const attr: Attribute = {
			fg: { type: ColorType.RGB, value: packRgb(255, 0, 0) },
			bg: { type: ColorType.DEFAULT, value: 0 },
			styles: TextStyle.NONE,
		};
		const codes = attrToSgrCodes(attr, { colorDepth: '256' });
		// Should be 256-color format
		expect(codes[0]).toBe(38);
		expect(codes[1]).toBe(5);
	});
});

describe('sgrReset', () => {
	it('returns reset escape sequence', () => {
		expect(sgrReset()).toBe('\x1b[0m');
	});
});

describe('codeAttr roundtrip', () => {
	it('roundtrips basic attributes', () => {
		const original: Attribute = {
			fg: { type: ColorType.BASIC, value: 1 },
			bg: { type: ColorType.BASIC, value: 4 },
			styles: TextStyle.BOLD | TextStyle.UNDERLINE,
		};

		const sgr = codeAttr(original);
		const restored = createAttribute();
		parseSgrString(sgr, restored);

		expect(restored.fg.type).toBe(ColorType.BASIC);
		expect(restored.fg.value).toBe(1);
		expect(restored.bg.type).toBe(ColorType.BASIC);
		expect(restored.bg.value).toBe(4);
		expect(restored.styles & TextStyle.BOLD).toBeTruthy();
		expect(restored.styles & TextStyle.UNDERLINE).toBeTruthy();
	});

	it('roundtrips 256-color attributes', () => {
		const original: Attribute = {
			fg: { type: ColorType.COLOR_256, value: 196 },
			bg: { type: ColorType.COLOR_256, value: 220 },
			styles: TextStyle.ITALIC,
		};

		const sgr = codeAttr(original);
		const restored = createAttribute();
		parseSgrString(sgr, restored);

		expect(restored.fg.type).toBe(ColorType.COLOR_256);
		expect(restored.fg.value).toBe(196);
		expect(restored.bg.type).toBe(ColorType.COLOR_256);
		expect(restored.bg.value).toBe(220);
		expect(restored.styles & TextStyle.ITALIC).toBeTruthy();
	});

	it('roundtrips RGB color attributes', () => {
		const original: Attribute = {
			fg: { type: ColorType.RGB, value: packRgb(255, 128, 64) },
			bg: { type: ColorType.RGB, value: packRgb(32, 64, 128) },
			styles: TextStyle.STRIKETHROUGH,
		};

		const sgr = codeAttr(original);
		const restored = createAttribute();
		parseSgrString(sgr, restored);

		expect(restored.fg.type).toBe(ColorType.RGB);
		const fgRgb = unpackRgb(restored.fg.value);
		expect(fgRgb.r).toBe(255);
		expect(fgRgb.g).toBe(128);
		expect(fgRgb.b).toBe(64);

		expect(restored.bg.type).toBe(ColorType.RGB);
		const bgRgb = unpackRgb(restored.bg.value);
		expect(bgRgb.r).toBe(32);
		expect(bgRgb.g).toBe(64);
		expect(bgRgb.b).toBe(128);
	});
});
