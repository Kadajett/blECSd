/**
 * Truecolor Support Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	bg,
	ColorDepthLevel,
	color,
	createTruecolorSupport,
	fg,
	getColorDepthLevel,
	getDefaultTruecolor,
	hex,
	isTruecolor,
	resetDefaultTruecolor,
	rgb,
	rgba,
} from './truecolor';

describe('truecolor', () => {
	// Store original env
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Reset env
		process.env = { ...originalEnv };
		// Reset default instance
		resetDefaultTruecolor();
	});

	afterEach(() => {
		// Restore env
		process.env = originalEnv;
		// Clean up
		resetDefaultTruecolor();
	});

	describe('ColorDepthLevel', () => {
		it('should have correct depth values', () => {
			expect(ColorDepthLevel.MONO).toBe(1);
			expect(ColorDepthLevel.BASIC_8).toBe(8);
			expect(ColorDepthLevel.STANDARD_16).toBe(16);
			expect(ColorDepthLevel.PALETTE_256).toBe(256);
			expect(ColorDepthLevel.TRUECOLOR).toBe(16777216);
		});
	});

	describe('createTruecolorSupport', () => {
		it('should create a TruecolorSupport instance', () => {
			const support = createTruecolorSupport();

			expect(support).toBeDefined();
			expect(typeof support.rgb).toBe('function');
			expect(typeof support.fromHex).toBe('function');
			expect(typeof support.fg).toBe('function');
			expect(typeof support.bg).toBe('function');
		});

		it('should respect forced depth', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.PALETTE_256,
			});

			expect(support.getDepth()).toBe(ColorDepthLevel.PALETTE_256);
		});
	});

	describe('rgb', () => {
		it('should create a Color from RGB components', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
			expect(red.rgb).toBe(0xff0000);
		});

		it('should clamp values to 0-255', () => {
			const support = createTruecolorSupport();

			const color = support.rgb(300, -50, 128);

			expect(color.r).toBe(255);
			expect(color.g).toBe(0);
			expect(color.b).toBe(128);
		});

		it('should compute color256 approximation', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);

			expect(red.color256).toBeDefined();
			expect(typeof red.color256).toBe('number');
			expect(red.color256).toBeGreaterThanOrEqual(0);
			expect(red.color256).toBeLessThanOrEqual(255);
		});

		it('should compute color16 approximation', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);

			expect(red.color16).toBeDefined();
			expect(typeof red.color16).toBe('number');
			expect(red.color16).toBeGreaterThanOrEqual(0);
			expect(red.color16).toBeLessThanOrEqual(15);
		});

		it('should compute color8 approximation', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);

			expect(red.color8).toBeDefined();
			expect(typeof red.color8).toBe('number');
			expect(red.color8).toBeGreaterThanOrEqual(0);
			expect(red.color8).toBeLessThanOrEqual(7);
		});
	});

	describe('rgba', () => {
		it('should create a Color with alpha', () => {
			const support = createTruecolorSupport();

			const semiRed = support.rgba(255, 0, 0, 0.5);

			expect(semiRed.r).toBe(255);
			expect(semiRed.g).toBe(0);
			expect(semiRed.b).toBe(0);
			expect(semiRed.a).toBe(0.5);
		});
	});

	describe('fromHex', () => {
		it('should parse #RRGGBB format', () => {
			const support = createTruecolorSupport();

			const red = support.fromHex('#ff0000');

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
		});

		it('should parse #RGB format', () => {
			const support = createTruecolorSupport();

			const red = support.fromHex('#f00');

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
		});

		it('should parse #RRGGBBAA format', () => {
			const support = createTruecolorSupport();

			const semiRed = support.fromHex('#ff000080');

			expect(semiRed.r).toBe(255);
			expect(semiRed.g).toBe(0);
			expect(semiRed.b).toBe(0);
			expect(semiRed.a).toBeCloseTo(0.5, 1);
		});
	});

	describe('from', () => {
		it('should accept hex strings', () => {
			const support = createTruecolorSupport();

			const red = support.from('#ff0000');

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
		});

		it('should accept RGB objects', () => {
			const support = createTruecolorSupport();

			const red = support.from({ r: 255, g: 0, b: 0 });

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
		});

		it('should accept truecolor numbers', () => {
			const support = createTruecolorSupport();

			const red = support.from(0xff0000);

			expect(red.r).toBe(255);
			expect(red.g).toBe(0);
			expect(red.b).toBe(0);
		});
	});

	describe('withOpacity', () => {
		it('should create a new Color with modified alpha', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);
			const semiRed = support.withOpacity(red, 0.5);

			expect(semiRed.a).toBe(0.5);
			expect(semiRed.r).toBe(255);
			expect(semiRed.g).toBe(0);
			expect(semiRed.b).toBe(0);
		});

		it('should clamp opacity to 0-1', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);

			expect(support.withOpacity(red, -0.5).a).toBe(0);
			expect(support.withOpacity(red, 1.5).a).toBe(1);
		});
	});

	describe('fg', () => {
		it('should generate truecolor sequence when supported', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.TRUECOLOR,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.fg(red);

			expect(seq).toBe('\x1b[38;2;255;0;0m');
		});

		it('should generate 256-color sequence when depth is 256', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.PALETTE_256,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.fg(red);

			expect(seq).toMatch(/^\x1b\[38;5;\d+m$/);
		});

		it('should generate 16-color sequence when depth is 16', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.STANDARD_16,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.fg(red);

			// Should be 3x or 9x for standard or bright colors
			expect(seq).toMatch(/^\x1b\[[39]\dm$/);
		});

		it('should generate 8-color sequence when depth is 8', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.BASIC_8,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.fg(red);

			expect(seq).toMatch(/^\x1b\[3[0-7]m$/);
		});

		it('should generate empty string for mono', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.MONO,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.fg(red);

			expect(seq).toBe('');
		});
	});

	describe('bg', () => {
		it('should generate truecolor sequence when supported', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.TRUECOLOR,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.bg(red);

			expect(seq).toBe('\x1b[48;2;255;0;0m');
		});

		it('should generate 256-color sequence when depth is 256', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.PALETTE_256,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.bg(red);

			expect(seq).toMatch(/^\x1b\[48;5;\d+m$/);
		});

		it('should generate 16-color sequence when depth is 16', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.STANDARD_16,
			});

			const red = support.rgb(255, 0, 0);
			const seq = support.bg(red);

			// Should be 4x or 10x for standard or bright colors
			expect(seq).toMatch(/^\x1b\[(?:4|10)\dm$/);
		});
	});

	describe('setDepth / resetDepth', () => {
		it('should allow forcing depth', () => {
			const support = createTruecolorSupport();

			support.setDepth(ColorDepthLevel.BASIC_8);
			expect(support.getDepth()).toBe(ColorDepthLevel.BASIC_8);

			support.setDepth(ColorDepthLevel.TRUECOLOR);
			expect(support.getDepth()).toBe(ColorDepthLevel.TRUECOLOR);
		});

		it('should reset to auto-detection', () => {
			const support = createTruecolorSupport();

			support.setDepth(ColorDepthLevel.BASIC_8);
			expect(support.getDepth()).toBe(ColorDepthLevel.BASIC_8);

			support.resetDepth();
			// Should now use environment detection
			expect(support.getDepth()).not.toBe(ColorDepthLevel.BASIC_8);
		});
	});

	describe('isTruecolorSupported', () => {
		it('should return true when depth is TRUECOLOR', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.TRUECOLOR,
			});

			expect(support.isTruecolorSupported()).toBe(true);
		});

		it('should return false when depth is not TRUECOLOR', () => {
			const support = createTruecolorSupport({
				forceDepth: ColorDepthLevel.PALETTE_256,
			});

			expect(support.isTruecolorSupported()).toBe(false);
		});
	});

	describe('gradient', () => {
		it('should create a gradient between two colors', () => {
			const support = createTruecolorSupport();

			const from = support.rgb(255, 0, 0);
			const to = support.rgb(0, 0, 255);
			const gradient = support.gradient(from, to, 5);

			expect(gradient).toHaveLength(5);
			expect(gradient[0]?.r).toBe(255);
			expect(gradient[0]?.b).toBe(0);
			expect(gradient[4]?.r).toBe(0);
			expect(gradient[4]?.b).toBe(255);
		});

		it('should handle single step', () => {
			const support = createTruecolorSupport();

			const from = support.rgb(255, 0, 0);
			const to = support.rgb(0, 0, 255);
			const gradient = support.gradient(from, to, 1);

			expect(gradient).toHaveLength(1);
			expect(gradient[0]).toBe(from);
		});

		it('should create intermediate colors', () => {
			const support = createTruecolorSupport();

			const from = support.rgb(0, 0, 0);
			const to = support.rgb(255, 255, 255);
			const gradient = support.gradient(from, to, 3);

			// Middle color should be gray
			expect(gradient[1]?.r).toBeCloseTo(128, -1);
			expect(gradient[1]?.g).toBeCloseTo(128, -1);
			expect(gradient[1]?.b).toBeCloseTo(128, -1);
		});
	});

	describe('blend', () => {
		it('should blend two colors at 50%', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);
			const blue = support.rgb(0, 0, 255);
			const blended = support.blend(red, blue);

			expect(blended.r).toBeCloseTo(128, -1);
			expect(blended.g).toBe(0);
			expect(blended.b).toBeCloseTo(128, -1);
		});

		it('should blend with custom ratio', () => {
			const support = createTruecolorSupport();

			const red = support.rgb(255, 0, 0);
			const blue = support.rgb(0, 0, 255);

			const mostlyRed = support.blend(red, blue, 0.25);
			expect(mostlyRed.r).toBeGreaterThan(mostlyRed.b);

			const mostlyBlue = support.blend(red, blue, 0.75);
			expect(mostlyBlue.b).toBeGreaterThan(mostlyBlue.r);
		});

		it('should blend alpha values', () => {
			const support = createTruecolorSupport();

			const color1 = support.rgba(255, 0, 0, 0);
			const color2 = support.rgba(0, 0, 255, 1);
			const blended = support.blend(color1, color2);

			expect(blended.a).toBe(0.5);
		});
	});

	describe('environment detection', () => {
		it('should detect truecolor from COLORTERM', () => {
			process.env['COLORTERM'] = 'truecolor';

			const support = createTruecolorSupport();

			expect(support.getDepth()).toBe(ColorDepthLevel.TRUECOLOR);
		});

		it('should detect truecolor from COLORTERM=24bit', () => {
			process.env['COLORTERM'] = '24bit';

			const support = createTruecolorSupport();

			expect(support.getDepth()).toBe(ColorDepthLevel.TRUECOLOR);
		});

		it('should detect 256 colors from TERM', () => {
			delete process.env['COLORTERM'];
			process.env['TERM'] = 'xterm-256color';

			const support = createTruecolorSupport();

			expect(support.getDepth()).toBe(ColorDepthLevel.PALETTE_256);
		});

		it('should detect 16 colors from xterm', () => {
			delete process.env['COLORTERM'];
			process.env['TERM'] = 'xterm';

			const support = createTruecolorSupport();

			expect(support.getDepth()).toBe(ColorDepthLevel.STANDARD_16);
		});

		it('should detect mono from dumb terminal', () => {
			delete process.env['COLORTERM'];
			process.env['TERM'] = 'dumb';

			const support = createTruecolorSupport();

			expect(support.getDepth()).toBe(ColorDepthLevel.MONO);
		});
	});

	describe('getDefaultTruecolor', () => {
		it('should return same instance on multiple calls', () => {
			const t1 = getDefaultTruecolor();
			const t2 = getDefaultTruecolor();

			expect(t1).toBe(t2);
		});

		it('should return new instance after reset', () => {
			const t1 = getDefaultTruecolor();
			resetDefaultTruecolor();
			const t2 = getDefaultTruecolor();

			expect(t1).not.toBe(t2);
		});
	});

	describe('convenience functions', () => {
		describe('rgb', () => {
			it('should create a color using default instance', () => {
				const red = rgb(255, 0, 0);

				expect(red.r).toBe(255);
				expect(red.g).toBe(0);
				expect(red.b).toBe(0);
			});
		});

		describe('rgba', () => {
			it('should create a color with alpha using default instance', () => {
				const semiRed = rgba(255, 0, 0, 0.5);

				expect(semiRed.r).toBe(255);
				expect(semiRed.a).toBe(0.5);
			});
		});

		describe('hex', () => {
			it('should create a color from hex using default instance', () => {
				const red = hex('#ff0000');

				expect(red.r).toBe(255);
				expect(red.g).toBe(0);
				expect(red.b).toBe(0);
			});
		});

		describe('color', () => {
			it('should create a color from any value using default instance', () => {
				const c1 = color('#ff0000');
				const c2 = color({ r: 255, g: 0, b: 0 });
				const c3 = color(0xff0000);

				expect(c1.r).toBe(255);
				expect(c2.r).toBe(255);
				expect(c3.r).toBe(255);
			});
		});

		describe('fg / bg', () => {
			it('should generate SGR sequences using default instance', () => {
				process.env['COLORTERM'] = 'truecolor';
				resetDefaultTruecolor();

				const red = rgb(255, 0, 0);

				const fgSeq = fg(red);
				const bgSeq = bg(red);

				expect(fgSeq).toBe('\x1b[38;2;255;0;0m');
				expect(bgSeq).toBe('\x1b[48;2;255;0;0m');
			});
		});

		describe('isTruecolor', () => {
			it('should check truecolor support using default instance', () => {
				process.env['COLORTERM'] = 'truecolor';
				resetDefaultTruecolor();

				expect(isTruecolor()).toBe(true);
			});
		});

		describe('getColorDepthLevel', () => {
			it('should get depth using default instance', () => {
				process.env['COLORTERM'] = 'truecolor';
				resetDefaultTruecolor();

				expect(getColorDepthLevel()).toBe(ColorDepthLevel.TRUECOLOR);
			});
		});
	});

	describe('Color interface', () => {
		it('should have all required properties', () => {
			const support = createTruecolorSupport();
			const c = support.rgb(128, 64, 32);

			expect('rgb' in c).toBe(true);
			expect('r' in c).toBe(true);
			expect('g' in c).toBe(true);
			expect('b' in c).toBe(true);
			expect('color256' in c).toBe(true);
			expect('color16' in c).toBe(true);
			expect('color8' in c).toBe(true);
		});
	});
});
