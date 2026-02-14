import { describe, expect, it, vi } from 'vitest';

import type { GraphicsBackend } from './backend';
import { createGraphicsManager, registerBackend } from './backend';
import { createBrailleCanvas, setDot } from './vector';
import { canvasToPixelBitmap, hasPixelBackend, renderVector } from './vectorBridge';

// =============================================================================
// HELPERS
// =============================================================================

function createMockBackend(name: string, supported: boolean): GraphicsBackend {
	return {
		name: name as GraphicsBackend['name'],
		capabilities: {
			staticImages: true,
			animation: false,
			alphaChannel: true,
			maxWidth: null,
			maxHeight: null,
		},
		render: vi.fn((_image, _options) => `[${name}-render]`),
		clear: vi.fn(() => `[${name}-clear]`),
		isSupported: () => supported,
	};
}

// =============================================================================
// hasPixelBackend
// =============================================================================

describe('hasPixelBackend', () => {
	it('returns true for kitty backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('kitty', true));
		expect(hasPixelBackend(manager)).toBe(true);
	});

	it('returns true for iterm2 backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('iterm2', true));
		expect(hasPixelBackend(manager)).toBe(true);
	});

	it('returns true for sixel backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('sixel', true));
		expect(hasPixelBackend(manager)).toBe(true);
	});

	it('returns false for ansi backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));
		expect(hasPixelBackend(manager)).toBe(false);
	});

	it('returns false for braille backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('braille', true));
		expect(hasPixelBackend(manager)).toBe(false);
	});

	it('returns false for ascii backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ascii', true));
		expect(hasPixelBackend(manager)).toBe(false);
	});

	it('returns false when no backend is available', () => {
		const manager = createGraphicsManager();
		expect(hasPixelBackend(manager)).toBe(false);
	});
});

// =============================================================================
// canvasToPixelBitmap
// =============================================================================

describe('canvasToPixelBitmap', () => {
	it('creates bitmap with correct dimensions', () => {
		const canvas = createBrailleCanvas(10, 5);
		const bitmap = canvasToPixelBitmap(canvas, { cellWidth: 8, cellHeight: 16 });

		// 10 cells * 2 dots * 4 px/dot = 80
		expect(bitmap.width).toBe(80);
		// 5 cells * 4 dots * 4 px/dot = 80
		expect(bitmap.height).toBe(80);
		expect(bitmap.data.length).toBe(80 * 80 * 4);
	});

	it('renders empty canvas as all background', () => {
		const canvas = createBrailleCanvas(2, 2);
		const bitmap = canvasToPixelBitmap(canvas, {
			cellWidth: 2,
			cellHeight: 4,
			background: { r: 10, g: 20, b: 30 },
		});

		// Every pixel should be background color
		for (let i = 0; i < bitmap.data.length; i += 4) {
			expect(bitmap.data[i]).toBe(10);
			expect(bitmap.data[i + 1]).toBe(20);
			expect(bitmap.data[i + 2]).toBe(30);
			expect(bitmap.data[i + 3]).toBe(255);
		}
	});

	it('renders set dots in foreground color', () => {
		const canvas = createBrailleCanvas(1, 1);
		// Set the top-left dot (0,0)
		setDot(canvas, 0, 0);

		const bitmap = canvasToPixelBitmap(canvas, {
			cellWidth: 2,
			cellHeight: 4,
			foreground: { r: 255, g: 0, b: 0 },
			background: { r: 0, g: 0, b: 0 },
		});

		// Top-left pixel should be foreground (red)
		expect(bitmap.data[0]).toBe(255);
		expect(bitmap.data[1]).toBe(0);
		expect(bitmap.data[2]).toBe(0);
		expect(bitmap.data[3]).toBe(255);
	});

	it('uses default options when none provided', () => {
		const canvas = createBrailleCanvas(1, 1);
		const bitmap = canvasToPixelBitmap(canvas);

		// Default cell size is 8x16
		// 1 cell * 2 dots * 4 px/dot = 8
		expect(bitmap.width).toBe(8);
		// 1 cell * 4 dots * 4 px/dot = 16
		expect(bitmap.height).toBe(16);
	});

	it('uses cell color when available', () => {
		const canvas = createBrailleCanvas(1, 1);
		setDot(canvas, 0, 0);
		// Set cell color to green (0x00FF00)
		canvas.colors[0] = 0x00ff00;

		const bitmap = canvasToPixelBitmap(canvas, {
			cellWidth: 2,
			cellHeight: 4,
			foreground: { r: 255, g: 255, b: 255 },
		});

		// Dot should be green (from cell color), not white (from foreground)
		expect(bitmap.data[0]).toBe(0);
		expect(bitmap.data[1]).toBe(255);
		expect(bitmap.data[2]).toBe(0);
	});
});

// =============================================================================
// renderVector
// =============================================================================

describe('renderVector', () => {
	it('uses braille fallback when no pixel backend available', () => {
		const canvas = createBrailleCanvas(2, 1);
		setDot(canvas, 0, 0);

		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));

		const output = renderVector(canvas, manager, { x: 0, y: 0 });

		// Should contain braille characters, not escape sequences
		expect(output).not.toContain('[ansi-render]');
		expect(output.length).toBeGreaterThan(0);
	});

	it('uses pixel backend when available', () => {
		const canvas = createBrailleCanvas(2, 1);
		setDot(canvas, 0, 0);

		const kittyBackend = createMockBackend('kitty', true);
		const manager = createGraphicsManager();
		registerBackend(manager, kittyBackend);

		const output = renderVector(canvas, manager, { x: 5, y: 10 });

		expect(output).toBe('[kitty-render]');
		expect(kittyBackend.render).toHaveBeenCalledTimes(1);

		// Verify the render was called with correct position
		const call = (kittyBackend.render as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(call).toBeDefined();
		if (call) {
			const [imageData, renderOpts] = call;
			expect(imageData.format).toBe('rgba');
			expect(imageData.width).toBeGreaterThan(0);
			expect(imageData.height).toBeGreaterThan(0);
			expect(renderOpts.x).toBe(5);
			expect(renderOpts.y).toBe(10);
		}
	});

	it('prefers kitty over braille fallback', () => {
		const canvas = createBrailleCanvas(2, 1);

		const kittyBackend = createMockBackend('kitty', true);
		const brailleBackend = createMockBackend('braille', true);
		const manager = createGraphicsManager();
		registerBackend(manager, kittyBackend);
		registerBackend(manager, brailleBackend);

		const output = renderVector(canvas, manager, { x: 0, y: 0 });

		expect(output).toBe('[kitty-render]');
	});

	it('falls back to braille when no backends registered', () => {
		const canvas = createBrailleCanvas(2, 1);
		const manager = createGraphicsManager();

		const output = renderVector(canvas, manager, { x: 0, y: 0 });

		// Should return braille string (empty canvas = blank braille)
		expect(typeof output).toBe('string');
	});
});
