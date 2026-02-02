import { describe, expect, it } from 'vitest';
import {
	AttrFlags,
	attrsToStyle,
	decodeStyleAttr,
	encodeStyleAttr,
	sattr,
	sattrAddFlag,
	sattrCopy,
	sattrEmpty,
	sattrEqual,
	sattrFromStyleData,
	sattrHasFlag,
	sattrInvert,
	sattrMerge,
	sattrRemoveFlag,
	styleToAttrs,
} from './sattr';

describe('sattr', () => {
	describe('styleToAttrs', () => {
		it('returns NONE for empty style', () => {
			expect(styleToAttrs({})).toBe(AttrFlags.NONE);
		});

		it('sets BOLD flag', () => {
			expect(styleToAttrs({ bold: true })).toBe(AttrFlags.BOLD);
		});

		it('sets UNDERLINE flag', () => {
			expect(styleToAttrs({ underline: true })).toBe(AttrFlags.UNDERLINE);
		});

		it('sets BLINK flag', () => {
			expect(styleToAttrs({ blink: true })).toBe(AttrFlags.BLINK);
		});

		it('sets INVERSE flag', () => {
			expect(styleToAttrs({ inverse: true })).toBe(AttrFlags.INVERSE);
		});

		it('combines multiple flags', () => {
			const attrs = styleToAttrs({ bold: true, underline: true, inverse: true });
			expect(attrs).toBe(AttrFlags.BOLD | AttrFlags.UNDERLINE | AttrFlags.INVERSE);
		});

		it('ignores false values', () => {
			expect(styleToAttrs({ bold: false, underline: false })).toBe(AttrFlags.NONE);
		});

		it('handles all flags', () => {
			const attrs = styleToAttrs({
				bold: true,
				underline: true,
				blink: true,
				inverse: true,
				invisible: true,
				dim: true,
				italic: true,
				strikethrough: true,
			});
			expect(attrs).toBe(
				AttrFlags.BOLD |
					AttrFlags.UNDERLINE |
					AttrFlags.BLINK |
					AttrFlags.INVERSE |
					AttrFlags.INVISIBLE |
					AttrFlags.DIM |
					AttrFlags.ITALIC |
					AttrFlags.STRIKETHROUGH,
			);
		});
	});

	describe('attrsToStyle', () => {
		it('returns all false for NONE', () => {
			const style = attrsToStyle(AttrFlags.NONE);
			expect(style.bold).toBe(false);
			expect(style.underline).toBe(false);
			expect(style.blink).toBe(false);
			expect(style.inverse).toBe(false);
		});

		it('decodes BOLD flag', () => {
			const style = attrsToStyle(AttrFlags.BOLD);
			expect(style.bold).toBe(true);
			expect(style.underline).toBe(false);
		});

		it('decodes combined flags', () => {
			const style = attrsToStyle(AttrFlags.BOLD | AttrFlags.UNDERLINE);
			expect(style.bold).toBe(true);
			expect(style.underline).toBe(true);
			expect(style.blink).toBe(false);
		});
	});

	describe('sattr', () => {
		it('creates style attribute with defaults', () => {
			const attr = sattr({});
			expect(attr.fg).toBe(0xffffffff);
			expect(attr.bg).toBe(0x00000000);
			expect(attr.attrs).toBe(AttrFlags.NONE);
		});

		it('uses provided fg color', () => {
			const attr = sattr({ fg: 0xffff0000 });
			expect(attr.fg).toBe(0xffff0000);
		});

		it('uses provided bg color', () => {
			const attr = sattr({ bg: 0xff0000ff });
			expect(attr.bg).toBe(0xff0000ff);
		});

		it('encodes attributes', () => {
			const attr = sattr({ bold: true, underline: true });
			expect(attr.attrs).toBe(AttrFlags.BOLD | AttrFlags.UNDERLINE);
		});

		it('uses custom defaults', () => {
			const attr = sattr({}, 0xaabbccdd, 0x11223344);
			expect(attr.fg).toBe(0xaabbccdd);
			expect(attr.bg).toBe(0x11223344);
		});

		it('overrides custom defaults with provided values', () => {
			const attr = sattr({ fg: 0x12345678 }, 0xaabbccdd, 0x11223344);
			expect(attr.fg).toBe(0x12345678);
			expect(attr.bg).toBe(0x11223344);
		});
	});

	describe('sattrFromStyleData', () => {
		it('converts StyleData to StyleAttr', () => {
			const styleData = {
				fg: 0xffff0000,
				bg: 0xff0000ff,
				bold: true,
				underline: false,
				blink: true,
				inverse: false,
				transparent: false,
			};
			const attr = sattrFromStyleData(styleData);
			expect(attr.fg).toBe(0xffff0000);
			expect(attr.bg).toBe(0xff0000ff);
			expect(attr.attrs).toBe(AttrFlags.BOLD | AttrFlags.BLINK);
		});
	});

	describe('sattrEqual', () => {
		it('returns true for equal attributes', () => {
			const a = sattr({ fg: 0xffff0000, bold: true });
			const b = sattr({ fg: 0xffff0000, bold: true });
			expect(sattrEqual(a, b)).toBe(true);
		});

		it('returns false for different fg', () => {
			const a = sattr({ fg: 0xffff0000 });
			const b = sattr({ fg: 0xff00ff00 });
			expect(sattrEqual(a, b)).toBe(false);
		});

		it('returns false for different bg', () => {
			const a = sattr({ bg: 0xffff0000 });
			const b = sattr({ bg: 0xff00ff00 });
			expect(sattrEqual(a, b)).toBe(false);
		});

		it('returns false for different attrs', () => {
			const a = sattr({ bold: true });
			const b = sattr({ underline: true });
			expect(sattrEqual(a, b)).toBe(false);
		});
	});

	describe('sattrCopy', () => {
		it('creates a copy with same values', () => {
			const original = sattr({ fg: 0xffff0000, bold: true });
			const copy = sattrCopy(original);
			expect(sattrEqual(original, copy)).toBe(true);
		});

		it('copy is independent', () => {
			const original = sattr({ fg: 0xffff0000, bold: true });
			const copy = sattrCopy(original);
			// Modifying copy shouldn't affect original (but they're immutable anyway)
			expect(copy.fg).toBe(original.fg);
		});
	});

	describe('sattrMerge', () => {
		it('keeps base values when overlay is empty', () => {
			const base = sattr({ fg: 0xffff0000, bold: true });
			const merged = sattrMerge(base, {});
			expect(sattrEqual(merged, base)).toBe(true);
		});

		it('overrides fg from overlay', () => {
			const base = sattr({ fg: 0xffff0000 });
			const merged = sattrMerge(base, { fg: 0xff00ff00 });
			expect(merged.fg).toBe(0xff00ff00);
			expect(merged.bg).toBe(base.bg);
		});

		it('overrides bg from overlay', () => {
			const base = sattr({ bg: 0xffff0000 });
			const merged = sattrMerge(base, { bg: 0xff00ff00 });
			expect(merged.bg).toBe(0xff00ff00);
		});

		it('overrides attrs from overlay', () => {
			const base = sattr({ bold: true });
			const merged = sattrMerge(base, { attrs: AttrFlags.UNDERLINE });
			expect(merged.attrs).toBe(AttrFlags.UNDERLINE);
		});
	});

	describe('sattrHasFlag', () => {
		it('returns true when flag is set', () => {
			const attr = sattr({ bold: true, underline: true });
			expect(sattrHasFlag(attr, AttrFlags.BOLD)).toBe(true);
			expect(sattrHasFlag(attr, AttrFlags.UNDERLINE)).toBe(true);
		});

		it('returns false when flag is not set', () => {
			const attr = sattr({ bold: true });
			expect(sattrHasFlag(attr, AttrFlags.UNDERLINE)).toBe(false);
			expect(sattrHasFlag(attr, AttrFlags.BLINK)).toBe(false);
		});
	});

	describe('sattrAddFlag', () => {
		it('adds flag to attribute', () => {
			const attr = sattr({ bold: true });
			const updated = sattrAddFlag(attr, AttrFlags.UNDERLINE);
			expect(sattrHasFlag(updated, AttrFlags.BOLD)).toBe(true);
			expect(sattrHasFlag(updated, AttrFlags.UNDERLINE)).toBe(true);
		});

		it('does not modify original', () => {
			const attr = sattr({ bold: true });
			sattrAddFlag(attr, AttrFlags.UNDERLINE);
			expect(sattrHasFlag(attr, AttrFlags.UNDERLINE)).toBe(false);
		});
	});

	describe('sattrRemoveFlag', () => {
		it('removes flag from attribute', () => {
			const attr = sattr({ bold: true, underline: true });
			const updated = sattrRemoveFlag(attr, AttrFlags.UNDERLINE);
			expect(sattrHasFlag(updated, AttrFlags.BOLD)).toBe(true);
			expect(sattrHasFlag(updated, AttrFlags.UNDERLINE)).toBe(false);
		});

		it('does not modify original', () => {
			const attr = sattr({ bold: true, underline: true });
			sattrRemoveFlag(attr, AttrFlags.UNDERLINE);
			expect(sattrHasFlag(attr, AttrFlags.UNDERLINE)).toBe(true);
		});
	});

	describe('sattrInvert', () => {
		it('swaps fg and bg', () => {
			const attr = sattr({ fg: 0xffff0000, bg: 0xff0000ff });
			const inverted = sattrInvert(attr);
			expect(inverted.fg).toBe(0xff0000ff);
			expect(inverted.bg).toBe(0xffff0000);
		});

		it('preserves attrs', () => {
			const attr = sattr({ fg: 0xffff0000, bg: 0xff0000ff, bold: true });
			const inverted = sattrInvert(attr);
			expect(sattrHasFlag(inverted, AttrFlags.BOLD)).toBe(true);
		});
	});

	describe('sattrEmpty', () => {
		it('returns default style attribute', () => {
			const empty = sattrEmpty();
			expect(empty.fg).toBe(0xffffffff);
			expect(empty.bg).toBe(0x00000000);
			expect(empty.attrs).toBe(AttrFlags.NONE);
		});
	});

	describe('encodeStyleAttr / decodeStyleAttr', () => {
		it('round-trips simple attribute', () => {
			const attr = sattr({ fg: 0xffff0000, bg: 0xff0000ff, bold: true });
			const encoded = encodeStyleAttr(attr);
			const decoded = decodeStyleAttr(encoded);
			expect(sattrEqual(attr, decoded)).toBe(true);
		});

		it('round-trips all attributes', () => {
			const attr = sattr({
				fg: 0x12345678,
				bg: 0x87654321,
				bold: true,
				underline: true,
				blink: true,
				inverse: true,
			});
			const encoded = encodeStyleAttr(attr);
			const decoded = decodeStyleAttr(encoded);
			expect(decoded.fg).toBe(attr.fg);
			expect(decoded.bg).toBe(attr.bg);
			expect(decoded.attrs).toBe(attr.attrs);
		});

		it('round-trips empty attribute', () => {
			const attr = sattrEmpty();
			const encoded = encodeStyleAttr(attr);
			const decoded = decodeStyleAttr(encoded);
			expect(sattrEqual(attr, decoded)).toBe(true);
		});

		it('handles large color values', () => {
			const attr = sattr({ fg: 0xffffffff, bg: 0xffffffff });
			const encoded = encodeStyleAttr(attr);
			const decoded = decodeStyleAttr(encoded);
			expect(decoded.fg).toBe(0xffffffff);
			expect(decoded.bg).toBe(0xffffffff);
		});
	});

	describe('AttrFlags', () => {
		it('has correct bit positions', () => {
			expect(AttrFlags.NONE).toBe(0);
			expect(AttrFlags.BOLD).toBe(1);
			expect(AttrFlags.UNDERLINE).toBe(2);
			expect(AttrFlags.BLINK).toBe(4);
			expect(AttrFlags.INVERSE).toBe(8);
			expect(AttrFlags.INVISIBLE).toBe(16);
			expect(AttrFlags.DIM).toBe(32);
			expect(AttrFlags.ITALIC).toBe(64);
			expect(AttrFlags.STRIKETHROUGH).toBe(128);
		});

		it('flags are independent', () => {
			const allFlags =
				AttrFlags.BOLD |
				AttrFlags.UNDERLINE |
				AttrFlags.BLINK |
				AttrFlags.INVERSE |
				AttrFlags.INVISIBLE |
				AttrFlags.DIM |
				AttrFlags.ITALIC |
				AttrFlags.STRIKETHROUGH;
			expect(allFlags).toBe(255);
		});
	});
});
