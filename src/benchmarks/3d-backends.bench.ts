import { bench, describe } from 'vitest';
import { createBrailleBackend } from '../3d/backends/braille';
import { createHalfBlockBackend } from '../3d/backends/halfblock';
import { createKittyBackend } from '../3d/backends/kitty';
import { createSextantBackend } from '../3d/backends/sextant';
import { createSixelBackend } from '../3d/backends/sixel';
import { createPixelFramebuffer, setPixel } from '../3d/rasterizer/pixelBuffer';

function fillFramebuffer(width: number, height: number) {
	const fb = createPixelFramebuffer({ width, height });
	// Fill with a gradient pattern to exercise color handling
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			setPixel(fb, x, y, {
				r: Math.floor((x / width) * 255),
				g: Math.floor((y / height) * 255),
				b: 128,
				a: 255,
			});
		}
	}
	return fb;
}

describe('Backend Encoding (400x200 framebuffer)', () => {
	const fb400 = fillFramebuffer(400, 200);
	const braille = createBrailleBackend();
	const halfblock = createHalfBlockBackend();
	const sextant = createSextantBackend();
	const sixel = createSixelBackend({ maxColors: 256 });
	const kitty = createKittyBackend();

	bench('Braille encode', () => {
		braille.encode(fb400, 0, 0);
	});

	bench('Half-block encode', () => {
		halfblock.encode(fb400, 0, 0);
	});

	bench('Sextant encode', () => {
		sextant.encode(fb400, 0, 0);
	});

	bench('Sixel encode (256 colors)', () => {
		sixel.encode(fb400, 0, 0);
	});

	bench('Kitty encode (RGBA)', () => {
		kitty.encode(fb400, 0, 0);
	});
});

describe('Backend Encoding (800x400 framebuffer)', () => {
	const fb800 = fillFramebuffer(800, 400);
	const braille = createBrailleBackend();
	const sixel = createSixelBackend({ maxColors: 256 });
	const kitty = createKittyBackend();

	bench('Braille encode 800x400', () => {
		braille.encode(fb800, 0, 0);
	});

	bench('Sixel encode 800x400', () => {
		sixel.encode(fb800, 0, 0);
	});

	bench('Kitty encode 800x400', () => {
		kitty.encode(fb800, 0, 0);
	});
});
