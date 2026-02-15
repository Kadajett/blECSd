import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, setPixel } from '../rasterizer/pixelBuffer';
import { SixelConfigSchema } from '../schemas/backends';
import { createSixelBackend } from './sixel';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };

describe('Sixel backend', () => {
	describe('createSixelBackend', () => {
		it('has correct type and capabilities', () => {
			const backend = createSixelBackend();
			expect(backend.type).toBe('sixel');
			expect(backend.capabilities.maxColors).toBe(256);
			expect(backend.capabilities.requiresEscapeSequences).toBe(true);
			expect(backend.capabilities.supportsAlpha).toBe(false);
		});

		it('respects custom maxColors', () => {
			const backend = createSixelBackend({ maxColors: 64 });
			expect(backend.capabilities.maxColors).toBe(64);
		});
	});

	describe('getPixelDimensions', () => {
		it('returns cell-pixel scaled dimensions', () => {
			const backend = createSixelBackend();
			const dims = backend.getPixelDimensions(80, 24);
			expect(dims.width).toBe(640);
			expect(dims.height).toBe(384);
		});
	});

	describe('encode', () => {
		it('starts with DCS and ends with ST', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 4, height: 6 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toBeDefined();
			expect(output.escape?.startsWith('\x1bPq')).toBe(true);
			expect(output.escape?.endsWith('\x1b\\')).toBe(true);
		});

		it('contains palette entries', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 6 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			// Should contain palette entry for red: #0;2;100;0;0
			expect(output.escape).toContain('#0;2;100;0;0');
		});

		it('encodes single-color image correctly', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 6 });
			// Fill entire column with red
			for (let y = 0; y < 6; y++) {
				setPixel(fb, 0, y, RED);
			}
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toBeDefined();
			// All 6 bits set = char code 63 + 63 = 126 = '~'
			expect(output.escape).toContain('~');
		});

		it('includes cursor position', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 6 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 5, 10);

			expect(output.cursorX).toBe(5);
			expect(output.cursorY).toBe(10);
		});

		it('uses RLE for repeated columns', () => {
			const backend = createSixelBackend({ rleEnabled: true });
			const fb = createPixelFramebuffer({ width: 10, height: 6 });
			// Fill all 10 columns with same pattern
			for (let x = 0; x < 10; x++) {
				setPixel(fb, x, 0, WHITE);
			}
			const output = backend.encode(fb, 0, 0);

			// 10 identical columns should be RLE encoded as !10<char>
			expect(output.escape).toContain('!10');
		});

		it('does not use RLE when disabled', () => {
			const backend = createSixelBackend({ rleEnabled: false });
			const fb = createPixelFramebuffer({ width: 10, height: 6 });
			for (let x = 0; x < 10; x++) {
				setPixel(fb, x, 0, WHITE);
			}
			const output = backend.encode(fb, 0, 0);

			// Should NOT contain !<count> patterns
			expect(output.escape).not.toMatch(/!\d+/);
		});

		it('uses band separators for multi-band images', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 12 });
			setPixel(fb, 0, 0, RED);
			setPixel(fb, 0, 6, RED);
			const output = backend.encode(fb, 0, 0);

			// Should have '-' between bands
			expect(output.escape).toContain('-');
		});

		it('handles empty framebuffer', () => {
			const backend = createSixelBackend();
			const fb = createPixelFramebuffer({ width: 4, height: 6 });
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toBeDefined();
			expect(output.escape?.startsWith('\x1bPq')).toBe(true);
			expect(output.escape?.endsWith('\x1b\\')).toBe(true);
		});
	});

	describe('SixelConfigSchema', () => {
		it('applies defaults', () => {
			const result = SixelConfigSchema.parse({});
			expect(result.maxColors).toBe(256);
			expect(result.rleEnabled).toBe(true);
		});

		it('rejects maxColors > 256', () => {
			expect(() => SixelConfigSchema.parse({ maxColors: 257 })).toThrow();
		});

		it('rejects maxColors < 2', () => {
			expect(() => SixelConfigSchema.parse({ maxColors: 1 })).toThrow();
		});
	});
});
