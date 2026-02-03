import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, setPixel } from '../rasterizer/pixelBuffer';
import { KittyConfigSchema } from '../schemas/backends';
import { createKittyBackend } from './kitty';

const RED = { r: 255, g: 0, b: 0, a: 255 };

describe('Kitty backend', () => {
	describe('createKittyBackend', () => {
		it('has correct type and capabilities', () => {
			const backend = createKittyBackend();
			expect(backend.type).toBe('kitty');
			expect(backend.capabilities.maxColors).toBe(16777216);
			expect(backend.capabilities.supportsAlpha).toBe(true);
			expect(backend.capabilities.requiresEscapeSequences).toBe(true);
			expect(backend.capabilities.supportsAnimation).toBe(true);
		});
	});

	describe('getPixelDimensions', () => {
		it('returns cell-pixel scaled dimensions', () => {
			const backend = createKittyBackend();
			const dims = backend.getPixelDimensions(80, 24);
			expect(dims.width).toBe(640);
			expect(dims.height).toBe(384);
		});
	});

	describe('encode', () => {
		it('contains transmit command with RGBA format', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toContain('a=t');
			expect(output.escape).toContain('f=32');
		});

		it('contains image dimensions', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 10, height: 20 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toContain('s=10');
			expect(output.escape).toContain('v=20');
		});

		it('contains image ID from configured base', () => {
			const backend = createKittyBackend({ imageId: 42 });
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			// Double buffer uses baseId and baseId+1; first frame uses slot 1
			expect(output.escape).toContain('i=43');
		});

		it('deletes old frame after placing new one (double buffer)', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			const output = backend.encode(fb, 0, 0);

			const placeIdx = output.escape?.indexOf('a=p') ?? -1;
			const deleteIdx = output.escape?.indexOf('a=d') ?? -1;
			// Place must come before delete to avoid flicker
			expect(placeIdx).toBeGreaterThanOrEqual(0);
			expect(deleteIdx).toBeGreaterThan(placeIdx);
		});

		it('alternates image IDs between frames', () => {
			const backend = createKittyBackend({ imageId: 10 });
			const fb = createPixelFramebuffer({ width: 2, height: 2 });

			const output1 = backend.encode(fb, 0, 0);
			const output2 = backend.encode(fb, 0, 0);

			// Frame 1 uses slot 1 (id=11), frame 2 uses slot 0 (id=10)
			expect(output1.escape).toContain('i=11');
			expect(output2.escape).toContain('i=10');

			// Frame 1 deletes slot 0 (id=10), frame 2 deletes slot 1 (id=11)
			expect(output1.escape).toMatch(/a=d.*i=10/);
			expect(output2.escape).toMatch(/a=d.*i=11/);
		});

		it('contains placement command', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			const output = backend.encode(fb, 0, 0);

			expect(output.escape).toContain('a=p');
		});

		it('contains valid base64 payload', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			setPixel(fb, 0, 0, RED);
			const output = backend.encode(fb, 0, 0);

			// Extract base64 data between first ';' and ST in the transmit command
			const transmitMatch = output.escape?.match(/a=t[^;]*;([A-Za-z0-9+/=]+)/);
			expect(transmitMatch).toBeTruthy();
			const base64Data = transmitMatch?.[1] ?? '';
			// Verify it decodes without error
			const decoded = Buffer.from(base64Data, 'base64');
			expect(decoded.length).toBeGreaterThan(0);
		});

		it('uses chunked transfer for large images', () => {
			const backend = createKittyBackend({ chunkSize: 32 });
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					setPixel(fb, x, y, RED);
				}
			}
			const output = backend.encode(fb, 0, 0);

			// With 10x10 RGBA = 400 bytes, base64 ~536 chars, chunkSize=32 => many chunks
			// Intermediate chunks should have m=1
			expect(output.escape).toContain('m=1');
			// Last chunk should have m=0
			expect(output.escape).toContain('m=0');
		});

		it('single chunk for small images', () => {
			const backend = createKittyBackend({ chunkSize: 4096 });
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			const output = backend.encode(fb, 0, 0);

			// Small image fits in one chunk, so m=0 on the transmit command
			const transmitSection = output.escape?.match(/a=t[^\\]*\\/)?.[0] ?? '';
			expect(transmitSection).toContain('m=0');
			// Should NOT have m=1 in the transmit section
			expect(transmitSection).not.toContain('m=1');
		});

		it('includes cursor position', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			const output = backend.encode(fb, 3, 7);

			expect(output.cursorX).toBe(3);
			expect(output.cursorY).toBe(7);
		});

		it('uses APC format', () => {
			const backend = createKittyBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 2 });
			const output = backend.encode(fb, 0, 0);

			// Should use ESC _G as introducer
			expect(output.escape).toContain('\x1b_G');
			// Should use ESC \ as terminator
			expect(output.escape).toContain('\x1b\\');
		});
	});

	describe('KittyConfigSchema', () => {
		it('applies defaults', () => {
			const result = KittyConfigSchema.parse({});
			expect(result.imageId).toBe(1);
			expect(result.chunkSize).toBe(4096);
		});

		it('rejects non-positive imageId', () => {
			expect(() => KittyConfigSchema.parse({ imageId: 0 })).toThrow();
			expect(() => KittyConfigSchema.parse({ imageId: -1 })).toThrow();
		});
	});
});
