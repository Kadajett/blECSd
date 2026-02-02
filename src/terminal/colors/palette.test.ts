import { describe, expect, it } from 'vitest';
import {
	ANSI,
	asColor256,
	COLOR_CUBE_LEVELS,
	COLORS,
	Color256Schema,
	colorCubeIndex,
	getHex,
	getRGB,
	grayscaleIndex,
	HexColorSchema,
	HSLASchema,
	HSLSchema,
	isColor256,
	isColorCube,
	isGrayscale,
	isRGB,
	isStandardColor,
	PALETTE_HEX,
	PALETTE_RGB,
	RGBASchema,
	RGBSchema,
} from './palette';

describe('palette', () => {
	describe('Color256 type', () => {
		describe('isColor256', () => {
			it('returns true for valid indices', () => {
				expect(isColor256(0)).toBe(true);
				expect(isColor256(127)).toBe(true);
				expect(isColor256(255)).toBe(true);
			});

			it('returns false for out of range', () => {
				expect(isColor256(-1)).toBe(false);
				expect(isColor256(256)).toBe(false);
			});

			it('returns false for non-integers', () => {
				expect(isColor256(1.5)).toBe(false);
				expect(isColor256(NaN)).toBe(false);
			});

			it('returns false for non-numbers', () => {
				expect(isColor256('red')).toBe(false);
				expect(isColor256(null)).toBe(false);
				expect(isColor256(undefined)).toBe(false);
			});
		});

		describe('asColor256', () => {
			it('returns value for valid indices', () => {
				expect(asColor256(0)).toBe(0);
				expect(asColor256(255)).toBe(255);
			});

			it('throws for invalid indices', () => {
				expect(() => asColor256(-1)).toThrow();
				expect(() => asColor256(256)).toThrow();
				expect(() => asColor256(1.5)).toThrow();
			});
		});
	});

	describe('Zod schemas', () => {
		describe('Color256Schema', () => {
			it('accepts valid values', () => {
				expect(Color256Schema.safeParse(0).success).toBe(true);
				expect(Color256Schema.safeParse(127).success).toBe(true);
				expect(Color256Schema.safeParse(255).success).toBe(true);
			});

			it('rejects invalid values', () => {
				expect(Color256Schema.safeParse(-1).success).toBe(false);
				expect(Color256Schema.safeParse(256).success).toBe(false);
				expect(Color256Schema.safeParse(1.5).success).toBe(false);
			});

			it('transforms to Color256 type', () => {
				const result = Color256Schema.parse(196);
				expect(result).toBe(196);
			});
		});

		describe('RGBSchema', () => {
			it('accepts valid RGB objects', () => {
				expect(RGBSchema.safeParse({ r: 0, g: 0, b: 0 }).success).toBe(true);
				expect(RGBSchema.safeParse({ r: 255, g: 128, b: 64 }).success).toBe(true);
			});

			it('rejects invalid values', () => {
				expect(RGBSchema.safeParse({ r: -1, g: 0, b: 0 }).success).toBe(false);
				expect(RGBSchema.safeParse({ r: 256, g: 0, b: 0 }).success).toBe(false);
				expect(RGBSchema.safeParse({ r: 0 }).success).toBe(false);
			});
		});

		describe('RGBASchema', () => {
			it('accepts valid RGBA objects', () => {
				expect(RGBASchema.safeParse({ r: 255, g: 0, b: 0, a: 0.5 }).success).toBe(true);
				expect(RGBASchema.safeParse({ r: 0, g: 0, b: 0, a: 1 }).success).toBe(true);
			});

			it('rejects invalid alpha', () => {
				expect(RGBASchema.safeParse({ r: 0, g: 0, b: 0, a: -0.1 }).success).toBe(false);
				expect(RGBASchema.safeParse({ r: 0, g: 0, b: 0, a: 1.1 }).success).toBe(false);
			});
		});

		describe('HSLSchema', () => {
			it('accepts valid HSL objects', () => {
				expect(HSLSchema.safeParse({ h: 0, s: 0, l: 0 }).success).toBe(true);
				expect(HSLSchema.safeParse({ h: 360, s: 100, l: 50 }).success).toBe(true);
			});

			it('rejects invalid values', () => {
				expect(HSLSchema.safeParse({ h: -1, s: 0, l: 0 }).success).toBe(false);
				expect(HSLSchema.safeParse({ h: 0, s: 101, l: 0 }).success).toBe(false);
			});
		});

		describe('HSLASchema', () => {
			it('accepts valid HSLA objects', () => {
				expect(HSLASchema.safeParse({ h: 180, s: 50, l: 50, a: 0.5 }).success).toBe(true);
			});
		});

		describe('HexColorSchema', () => {
			it('accepts valid hex colors', () => {
				expect(HexColorSchema.safeParse('#fff').success).toBe(true);
				expect(HexColorSchema.safeParse('#ff0000').success).toBe(true);
				expect(HexColorSchema.safeParse('#ff000080').success).toBe(true);
			});

			it('rejects invalid formats', () => {
				expect(HexColorSchema.safeParse('fff').success).toBe(false);
				expect(HexColorSchema.safeParse('#ffff').success).toBe(false);
				expect(HexColorSchema.safeParse('#gg0000').success).toBe(false);
			});
		});
	});

	describe('isRGB', () => {
		it('returns true for valid RGB objects', () => {
			expect(isRGB({ r: 0, g: 0, b: 0 })).toBe(true);
			expect(isRGB({ r: 255, g: 255, b: 255 })).toBe(true);
		});

		it('returns false for invalid objects', () => {
			expect(isRGB(null)).toBe(false);
			expect(isRGB({ r: 0, g: 0 })).toBe(false);
			expect(isRGB({ r: -1, g: 0, b: 0 })).toBe(false);
			expect(isRGB({ r: 0, g: 256, b: 0 })).toBe(false);
		});
	});

	describe('PALETTE_RGB', () => {
		it('has 256 colors', () => {
			expect(PALETTE_RGB).toHaveLength(256);
		});

		it('has correct standard colors', () => {
			expect(PALETTE_RGB[0]).toEqual({ r: 0, g: 0, b: 0 }); // Black
			expect(PALETTE_RGB[9]).toEqual({ r: 255, g: 0, b: 0 }); // Red
			expect(PALETTE_RGB[15]).toEqual({ r: 255, g: 255, b: 255 }); // White
		});

		it('has correct color cube values', () => {
			// First color cube entry (16) should be black
			expect(PALETTE_RGB[16]).toEqual({ r: 0, g: 0, b: 0 });
			// Last color cube entry (231) should be white
			expect(PALETTE_RGB[231]).toEqual({ r: 255, g: 255, b: 255 });
		});

		it('has correct grayscale range', () => {
			// First grayscale (232) is darkest
			expect(PALETTE_RGB[232]).toEqual({ r: 8, g: 8, b: 8 });
			// Last grayscale (255) is lightest
			expect(PALETTE_RGB[255]).toEqual({ r: 238, g: 238, b: 238 });
		});
	});

	describe('PALETTE_HEX', () => {
		it('has 256 colors', () => {
			expect(PALETTE_HEX).toHaveLength(256);
		});

		it('has correct hex format', () => {
			expect(PALETTE_HEX[0]).toBe('#000000');
			expect(PALETTE_HEX[9]).toBe('#ff0000');
			expect(PALETTE_HEX[15]).toBe('#ffffff');
		});
	});

	describe('getRGB', () => {
		it('returns correct RGB for palette index', () => {
			const red = getRGB(asColor256(9));
			expect(red).toEqual({ r: 255, g: 0, b: 0 });
		});
	});

	describe('getHex', () => {
		it('returns correct hex for palette index', () => {
			const red = getHex(asColor256(9));
			expect(red).toBe('#ff0000');
		});
	});

	describe('COLOR_CUBE_LEVELS', () => {
		it('has 6 levels', () => {
			expect(COLOR_CUBE_LEVELS).toHaveLength(6);
		});

		it('has correct values', () => {
			expect(COLOR_CUBE_LEVELS).toEqual([0, 95, 135, 175, 215, 255]);
		});
	});

	describe('colorCubeIndex', () => {
		it('returns correct index for r,g,b levels', () => {
			expect(colorCubeIndex(0, 0, 0)).toBe(16); // First cube color
			expect(colorCubeIndex(5, 5, 5)).toBe(231); // Last cube color
			expect(colorCubeIndex(5, 0, 0)).toBe(196); // Bright red
		});

		it('throws for invalid levels', () => {
			expect(() => colorCubeIndex(-1, 0, 0)).toThrow();
			expect(() => colorCubeIndex(6, 0, 0)).toThrow();
		});
	});

	describe('grayscaleIndex', () => {
		it('returns correct index for step', () => {
			expect(grayscaleIndex(0)).toBe(232);
			expect(grayscaleIndex(23)).toBe(255);
		});

		it('throws for invalid step', () => {
			expect(() => grayscaleIndex(-1)).toThrow();
			expect(() => grayscaleIndex(24)).toThrow();
		});
	});

	describe('color range checks', () => {
		describe('isStandardColor', () => {
			it('returns true for 0-15', () => {
				expect(isStandardColor(asColor256(0))).toBe(true);
				expect(isStandardColor(asColor256(15))).toBe(true);
			});

			it('returns false for other ranges', () => {
				expect(isStandardColor(asColor256(16))).toBe(false);
				expect(isStandardColor(asColor256(255))).toBe(false);
			});
		});

		describe('isColorCube', () => {
			it('returns true for 16-231', () => {
				expect(isColorCube(asColor256(16))).toBe(true);
				expect(isColorCube(asColor256(231))).toBe(true);
			});

			it('returns false for other ranges', () => {
				expect(isColorCube(asColor256(15))).toBe(false);
				expect(isColorCube(asColor256(232))).toBe(false);
			});
		});

		describe('isGrayscale', () => {
			it('returns true for 232-255', () => {
				expect(isGrayscale(asColor256(232))).toBe(true);
				expect(isGrayscale(asColor256(255))).toBe(true);
			});

			it('returns false for other ranges', () => {
				expect(isGrayscale(asColor256(231))).toBe(false);
				expect(isGrayscale(asColor256(0))).toBe(false);
			});
		});
	});

	describe('color constants', () => {
		describe('COLORS', () => {
			it('has all 16 standard colors', () => {
				expect(COLORS.BLACK).toBe(0);
				expect(COLORS.RED).toBe(9);
				expect(COLORS.WHITE).toBe(15);
			});
		});

		describe('ANSI', () => {
			it('has standard colors', () => {
				expect(ANSI.BLACK).toBe(0);
				expect(ANSI.WHITE).toBe(15);
			});

			it('has aliases', () => {
				expect(ANSI.DARK_GRAY).toBe(8);
				expect(ANSI.BRIGHT_RED).toBe(9);
			});
		});
	});
});
