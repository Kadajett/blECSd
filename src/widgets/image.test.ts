import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { Bitmap } from '../media/render/ansi';
import {
	createImage,
	getImageBitmap,
	getImageCellMap,
	Image,
	ImageConfigSchema,
	isImage,
	resetImageStore,
} from './image';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Creates a solid-color RGBA bitmap for testing.
 */
function createTestBitmap(
	width: number,
	height: number,
	r: number,
	g: number,
	b: number,
	a = 255,
): Bitmap {
	const data = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		data[i * 4] = r;
		data[i * 4 + 1] = g;
		data[i * 4 + 2] = b;
		data[i * 4 + 3] = a;
	}
	return { width, height, data };
}

let world: World;

beforeEach(() => {
	resetImageStore();
	world = createWorld();
});

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

describe('ImageConfigSchema', () => {
	it('should accept empty config with defaults', () => {
		const result = ImageConfigSchema.parse({});
		expect(result.x).toBe(0);
		expect(result.y).toBe(0);
		expect(result.type).toBe('ansi');
		expect(result.renderMode).toBe('color');
		expect(result.dither).toBe(false);
		expect(result.visible).toBe(true);
	});

	it('should accept valid config', () => {
		const result = ImageConfigSchema.parse({
			x: 10,
			y: 5,
			width: 40,
			height: 20,
			type: 'overlay',
			renderMode: 'ascii',
			dither: true,
			visible: false,
		});
		expect(result.x).toBe(10);
		expect(result.y).toBe(5);
		expect(result.type).toBe('overlay');
		expect(result.renderMode).toBe('ascii');
		expect(result.dither).toBe(true);
		expect(result.visible).toBe(false);
	});

	it('should reject invalid type', () => {
		expect(() => ImageConfigSchema.parse({ type: 'invalid' })).toThrow();
	});

	it('should reject invalid render mode', () => {
		expect(() => ImageConfigSchema.parse({ renderMode: 'nope' })).toThrow();
	});

	it('should reject negative width', () => {
		expect(() => ImageConfigSchema.parse({ width: -1 })).toThrow();
	});

	it('should reject zero width', () => {
		expect(() => ImageConfigSchema.parse({ width: 0 })).toThrow();
	});

	it('should accept bitmap in config', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const result = ImageConfigSchema.parse({ bitmap });
		expect(result.bitmap).toBeDefined();
		expect(result.bitmap?.width).toBe(2);
		expect(result.bitmap?.height).toBe(2);
	});
});

// =============================================================================
// FACTORY
// =============================================================================

describe('createImage', () => {
	it('should create an image widget with default config', () => {
		const image = createImage(world);
		expect(image.eid).toBeDefined();
		expect(image.getType()).toBe('ansi');
		expect(image.getRenderMode()).toBe('color');
		expect(image.isVisible()).toBe(true);
		expect(image.getImage()).toBeUndefined();
	});

	it('should create with position', () => {
		const image = createImage(world, { x: 10, y: 5 });
		const pos = image.getPosition();
		expect(pos.x).toBe(10);
		expect(pos.y).toBe(5);
	});

	it('should create with bitmap', () => {
		const bitmap = createTestBitmap(4, 4, 255, 0, 0);
		const image = createImage(world, { bitmap });
		expect(image.getImage()).toEqual(bitmap);
	});

	it('should create in overlay mode', () => {
		const image = createImage(world, { type: 'overlay' });
		expect(image.getType()).toBe('overlay');
	});

	it('should create hidden', () => {
		const image = createImage(world, { visible: false });
		expect(image.isVisible()).toBe(false);
	});

	it('should mark entity with Image component tag', () => {
		const image = createImage(world);
		expect(Image.isImage[image.eid]).toBe(1);
	});

	it('should render bitmap on creation in ansi mode', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const image = createImage(world, { bitmap, type: 'ansi' });
		expect(image.getCellMap()).toBeDefined();
		const cellMap = image.getCellMap();
		expect(cellMap?.width).toBe(2);
		// Color mode: 2 pixels high = 1 row (2 vertical pixels per cell)
		expect(cellMap?.height).toBe(1);
	});

	it('should not generate cellMap for overlay mode', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const image = createImage(world, { bitmap, type: 'overlay' });
		expect(image.getCellMap()).toBeUndefined();
	});
});

// =============================================================================
// VISIBILITY
// =============================================================================

describe('visibility', () => {
	it('should show and hide', () => {
		const image = createImage(world, { visible: false });
		expect(image.isVisible()).toBe(false);

		image.show();
		expect(image.isVisible()).toBe(true);

		image.hide();
		expect(image.isVisible()).toBe(false);
	});

	it('should return this for chaining', () => {
		const image = createImage(world);
		const result = image.show();
		expect(result).toBe(image);
		expect(image.hide()).toBe(image);
	});
});

// =============================================================================
// POSITION
// =============================================================================

describe('position', () => {
	it('should move by delta', () => {
		const image = createImage(world, { x: 10, y: 5 });
		image.move(3, -2);
		const pos = image.getPosition();
		expect(pos.x).toBe(13);
		expect(pos.y).toBe(3);
	});

	it('should set absolute position', () => {
		const image = createImage(world, { x: 0, y: 0 });
		image.setPosition(20, 15);
		const pos = image.getPosition();
		expect(pos.x).toBe(20);
		expect(pos.y).toBe(15);
	});

	it('should return this for chaining', () => {
		const image = createImage(world);
		expect(image.move(1, 1)).toBe(image);
		expect(image.setPosition(0, 0)).toBe(image);
	});
});

// =============================================================================
// IMAGE DATA
// =============================================================================

describe('image data', () => {
	it('should set and get bitmap', () => {
		const image = createImage(world);
		const bitmap = createTestBitmap(4, 4, 0, 255, 0);

		image.setImage(bitmap);
		expect(image.getImage()).toEqual(bitmap);
	});

	it('should re-render on setImage', () => {
		const image = createImage(world);

		const bitmap1 = createTestBitmap(2, 2, 255, 0, 0);
		image.setImage(bitmap1);
		const cellMap1 = image.getCellMap();
		expect(cellMap1).toBeDefined();

		const bitmap2 = createTestBitmap(4, 4, 0, 0, 255);
		image.setImage(bitmap2);
		const cellMap2 = image.getCellMap();
		expect(cellMap2).toBeDefined();
		expect(cellMap2?.width).toBe(4);
	});

	it('should return this for chaining on setImage', () => {
		const image = createImage(world);
		const bitmap = createTestBitmap(2, 2, 0, 0, 0);
		expect(image.setImage(bitmap)).toBe(image);
	});
});

// =============================================================================
// RENDER OPTIONS
// =============================================================================

describe('render options', () => {
	it('should change render mode', () => {
		const bitmap = createTestBitmap(4, 4, 128, 128, 128);
		const image = createImage(world, { bitmap, renderMode: 'color' });

		image.setRenderMode('ascii');
		expect(image.getRenderMode()).toBe('ascii');
		// ASCII mode: one cell per pixel (not half-block)
		const cellMap = image.getCellMap();
		expect(cellMap?.height).toBe(4);
	});

	it('should change to braille mode', () => {
		const bitmap = createTestBitmap(4, 8, 255, 255, 255);
		const image = createImage(world, { bitmap, renderMode: 'color' });

		image.setRenderMode('braille');
		expect(image.getRenderMode()).toBe('braille');
		// Braille: 2 pixels wide per cell, 4 pixels tall per cell
		const cellMap = image.getCellMap();
		expect(cellMap?.width).toBe(2); // 4 / 2
		expect(cellMap?.height).toBe(2); // 8 / 4
	});

	it('should return this for chaining on setRenderMode', () => {
		const image = createImage(world);
		expect(image.setRenderMode('ascii')).toBe(image);
	});
});

// =============================================================================
// RENDER OUTPUT
// =============================================================================

describe('render', () => {
	it('should return empty string without bitmap', () => {
		const image = createImage(world);
		expect(image.render()).toBe('');
	});

	it('should return ANSI string for color mode', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const image = createImage(world, { bitmap, renderMode: 'color' });

		const output = image.render();
		expect(output).toContain('\x1b['); // Contains escape sequences
		expect(output).toContain('\x1b[0m'); // Ends with reset
	});

	it('should return ASCII characters for ascii mode', () => {
		const bitmap = createTestBitmap(2, 2, 255, 255, 255);
		const image = createImage(world, { bitmap, renderMode: 'ascii' });

		const output = image.render();
		expect(output).toContain('\x1b['); // Still has color sequences
		// White pixels should map to bright ASCII char '@'
		expect(output).toContain('@');
	});

	it('should return braille characters for braille mode', () => {
		const bitmap = createTestBitmap(2, 4, 255, 255, 255);
		const image = createImage(world, { bitmap, renderMode: 'braille' });

		const output = image.render();
		// Braille characters are in U+2800-U+28FF range
		const hasBraille = /[\u2800-\u28FF]/.test(output);
		expect(hasBraille).toBe(true);
	});
});

// =============================================================================
// LIFECYCLE
// =============================================================================

describe('destroy', () => {
	it('should clean up all stores', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const image = createImage(world, { bitmap });
		const eid = image.eid;

		expect(Image.isImage[eid]).toBe(1);
		expect(getImageBitmap(eid)).toBeDefined();
		expect(getImageCellMap(eid)).toBeDefined();

		image.destroy();

		expect(Image.isImage[eid]).toBe(0);
		expect(getImageBitmap(eid)).toBeUndefined();
		expect(getImageCellMap(eid)).toBeUndefined();
	});
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe('isImage', () => {
	it('should return true for image widgets', () => {
		const image = createImage(world);
		expect(isImage(world, image.eid)).toBe(true);
	});

	it('should return false for non-image entities', () => {
		const eid = addEntity(world);
		expect(isImage(world, eid)).toBe(false);
	});
});

describe('getImageBitmap', () => {
	it('should return bitmap for image entity', () => {
		const bitmap = createTestBitmap(3, 3, 0, 255, 0);
		const image = createImage(world, { bitmap });
		expect(getImageBitmap(image.eid)).toEqual(bitmap);
	});

	it('should return undefined for entity without bitmap', () => {
		const image = createImage(world);
		expect(getImageBitmap(image.eid)).toBeUndefined();
	});
});

describe('getImageCellMap', () => {
	it('should return cellMap after render', () => {
		const bitmap = createTestBitmap(4, 2, 128, 128, 128);
		const image = createImage(world, { bitmap });
		const cellMap = getImageCellMap(image.eid);
		expect(cellMap).toBeDefined();
		expect(cellMap?.width).toBe(4);
	});

	it('should return undefined without bitmap', () => {
		const image = createImage(world);
		expect(getImageCellMap(image.eid)).toBeUndefined();
	});
});

// =============================================================================
// CHAINING
// =============================================================================

describe('chaining', () => {
	it('should support full method chaining', () => {
		const bitmap = createTestBitmap(2, 2, 255, 0, 0);
		const image = createImage(world, { bitmap });

		const result = image.setPosition(10, 5).setRenderMode('ascii').move(1, 1).show().hide().show();

		expect(result).toBe(image);
		expect(image.getPosition()).toEqual({ x: 11, y: 6 });
		expect(image.getRenderMode()).toBe('ascii');
		expect(image.isVisible()).toBe(true);
	});
});

// =============================================================================
// MULTIPLE IMAGES
// =============================================================================

describe('multiple images', () => {
	it('should support independent image widgets', () => {
		const red = createTestBitmap(2, 2, 255, 0, 0);
		const green = createTestBitmap(2, 2, 0, 255, 0);

		const image1 = createImage(world, { bitmap: red, x: 0, y: 0 });
		const image2 = createImage(world, { bitmap: green, x: 10, y: 5 });

		expect(image1.eid).not.toBe(image2.eid);
		expect(image1.getPosition()).toEqual({ x: 0, y: 0 });
		expect(image2.getPosition()).toEqual({ x: 10, y: 5 });

		// Destroying one should not affect the other
		image1.destroy();
		expect(isImage(world, image1.eid)).toBe(false);
		expect(isImage(world, image2.eid)).toBe(true);
		expect(getImageBitmap(image2.eid)).toEqual(green);
	});
});
