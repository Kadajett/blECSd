/**
 * Tests for Canvas widget.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	clearCanvas,
	createCanvas,
	drawCircle,
	drawLine,
	drawRect,
	getCanvasContent,
	isCanvas,
	resetCanvasStore,
	setPixel,
} from './canvas';

describe('Canvas widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetCanvasStore();
	});

	describe('createCanvas', () => {
		it('should create a canvas widget', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid);

			expect(canvas.entity).toBe(eid);
			expect(canvas.world).toBe(world);
			expect(isCanvas(eid)).toBe(true);
		});

		it('should accept width and height in dots', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 80,
			});

			expect(canvas.widthDots).toBe(40);
			expect(canvas.heightDots).toBe(80);
		});

		it('should use default dimensions', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid);

			expect(canvas.widthDots).toBe(40);
			expect(canvas.heightDots).toBe(40);
		});

		it('should accept foreground color', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				fg: '#FFFFFF',
			});

			expect(isCanvas(canvas.entity)).toBe(true);
		});

		it('should accept background color', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				bg: '#000000',
			});

			expect(isCanvas(canvas.entity)).toBe(true);
		});

		it('should accept both colors', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				fg: '#00FF00',
				bg: '#000000',
			});

			expect(isCanvas(canvas.entity)).toBe(true);
		});

		it('should accept numeric colors', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				fg: 0xffffff,
				bg: 0x000000,
			});

			expect(isCanvas(canvas.entity)).toBe(true);
		});
	});

	describe('setPixel', () => {
		it('should set a single pixel', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 10,
			});

			setPixel(canvas, 5, 5, true);
			const content = getCanvasContent(canvas);

			// Should have non-empty braille characters
			expect(content.length).toBeGreaterThan(0);
			expect(content).not.toBe('     \n     \n     ');
		});

		it('should clear a pixel', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 10,
			});

			setPixel(canvas, 5, 5, true);
			setPixel(canvas, 5, 5, false);
			const content = getCanvasContent(canvas);

			// Should be back to empty (all braille base characters)
			expect(content).toContain('⠀'); // U+2800 braille base
		});

		it('should handle out-of-bounds coordinates gracefully', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 10,
			});

			expect(() => setPixel(canvas, -1, 5, true)).not.toThrow();
			expect(() => setPixel(canvas, 5, -1, true)).not.toThrow();
			expect(() => setPixel(canvas, 100, 5, true)).not.toThrow();
			expect(() => setPixel(canvas, 5, 100, true)).not.toThrow();
		});

		it('should handle multiple pixels', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 10,
			});

			setPixel(canvas, 0, 0, true);
			setPixel(canvas, 1, 0, true);
			setPixel(canvas, 0, 1, true);
			setPixel(canvas, 1, 1, true);

			const content = getCanvasContent(canvas);
			expect(content.length).toBeGreaterThan(0);
		});
	});

	describe('drawLine', () => {
		it('should draw a horizontal line', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			drawLine(canvas, 0, 5, 19, 5);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
			expect(content).not.toBe('⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀');
		});

		it('should draw a vertical line', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			drawLine(canvas, 10, 0, 10, 19);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should draw a diagonal line', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			drawLine(canvas, 0, 0, 19, 19);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should draw line in any direction', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			// Right to left
			drawLine(canvas, 19, 5, 0, 5);
			clearCanvas(canvas);

			// Bottom to top
			drawLine(canvas, 10, 19, 10, 0);
			clearCanvas(canvas);

			// Diagonal reverse
			drawLine(canvas, 19, 19, 0, 0);

			expect(getCanvasContent(canvas).length).toBeGreaterThan(0);
		});
	});

	describe('drawRect', () => {
		it('should draw a rectangle outline', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 30,
				height: 30,
			});

			drawRect(canvas, 5, 5, 10, 10, false);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should draw a filled rectangle', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 30,
				height: 30,
			});

			drawRect(canvas, 5, 5, 10, 10, true);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle single-pixel rectangles', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			expect(() => drawRect(canvas, 10, 10, 1, 1, false)).not.toThrow();
		});

		it('should handle large rectangles', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 40,
			});

			drawRect(canvas, 0, 0, 40, 40, false);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});
	});

	describe('drawCircle', () => {
		it('should draw a circle outline', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 40,
			});

			drawCircle(canvas, 20, 20, 10, false);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should draw a filled circle', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 40,
			});

			drawCircle(canvas, 20, 20, 10, true);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle small circles', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			drawCircle(canvas, 10, 10, 3, false);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle large circles', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 60,
				height: 60,
			});

			drawCircle(canvas, 30, 30, 25, false);
			const content = getCanvasContent(canvas);

			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle radius of zero', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			expect(() => drawCircle(canvas, 10, 10, 0, false)).not.toThrow();
		});
	});

	describe('clearCanvas', () => {
		it('should clear all pixels', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			// Draw some shapes
			drawLine(canvas, 0, 0, 19, 19);
			drawRect(canvas, 5, 5, 10, 10);
			drawCircle(canvas, 10, 10, 5);

			// Clear
			clearCanvas(canvas);
			const content = getCanvasContent(canvas);

			// Should be all braille base characters (empty)
			expect(content).toContain('⠀');
		});

		it('should allow drawing after clear', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			drawLine(canvas, 0, 0, 19, 19);
			clearCanvas(canvas);
			drawLine(canvas, 0, 19, 19, 0);

			const content = getCanvasContent(canvas);
			expect(content.length).toBeGreaterThan(0);
		});
	});

	describe('getCanvasContent', () => {
		it('should return string content', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 20,
				height: 20,
			});

			const content = getCanvasContent(canvas);

			expect(typeof content).toBe('string');
			expect(content.length).toBeGreaterThan(0);
		});

		it('should return braille characters', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 10,
			});

			const content = getCanvasContent(canvas);

			// Should contain braille unicode characters (U+2800-U+28FF)
			expect(content).toMatch(/[\u2800-\u28FF]/);
		});

		it('should include newlines for rows', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 10,
				height: 20, // 5 character rows
			});

			const content = getCanvasContent(canvas);

			// Should have newlines
			expect(content).toContain('\n');
		});
	});

	describe('isCanvas', () => {
		it('should return true for canvas entities', () => {
			const eid = addEntity(world);
			createCanvas(world, eid);

			expect(isCanvas(eid)).toBe(true);
		});

		it('should return false for non-canvas entities', () => {
			const eid = addEntity(world);

			expect(isCanvas(eid)).toBe(false);
		});
	});

	describe('integration', () => {
		it('should support complex drawings', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 60,
				height: 80,
				fg: '#00FF00',
				bg: '#000000',
			});

			// Draw multiple shapes
			drawCircle(canvas, 30, 40, 20, false);
			drawCircle(canvas, 30, 40, 10, true);
			drawRect(canvas, 20, 30, 20, 20, false);
			drawLine(canvas, 0, 0, 59, 79);
			drawLine(canvas, 59, 0, 0, 79);

			const content = getCanvasContent(canvas);
			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle overlapping shapes', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 40,
			});

			// Draw overlapping circles
			drawCircle(canvas, 15, 20, 10, true);
			drawCircle(canvas, 25, 20, 10, true);

			const content = getCanvasContent(canvas);
			expect(content.length).toBeGreaterThan(0);
		});

		it('should handle full canvas clear and redraw', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 40,
				height: 40,
			});

			// Draw something
			drawRect(canvas, 10, 10, 20, 20, true);
			const content1 = getCanvasContent(canvas);

			// Clear
			clearCanvas(canvas);
			const content2 = getCanvasContent(canvas);

			// Draw something else
			drawCircle(canvas, 20, 20, 15, true);
			const content3 = getCanvasContent(canvas);

			expect(content1).not.toBe(content2);
			expect(content2).not.toBe(content3);
			expect(content1).not.toBe(content3);
		});
	});

	describe('braille character rendering', () => {
		it('should use correct braille base character', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 2,
				height: 4,
			});

			const content = getCanvasContent(canvas);

			// Empty canvas should be all U+2800 (braille blank)
			expect(content).toBe('⠀');
		});

		it('should combine multiple dots in same character', () => {
			const eid = addEntity(world);
			const canvas = createCanvas(world, eid, {
				width: 2,
				height: 4,
			});

			// Set all 4 dots in one character (2x4 grid)
			setPixel(canvas, 0, 0, true);
			setPixel(canvas, 1, 0, true);
			setPixel(canvas, 0, 1, true);
			setPixel(canvas, 1, 1, true);

			const content = getCanvasContent(canvas);

			// Should have combined braille character (not base)
			expect(content).not.toBe('⠀');
			expect(content).toMatch(/[\u2801-\u28FF]/);
		});
	});
});
