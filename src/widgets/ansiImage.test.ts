/**
 * Tests for the ANSIImage widget.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { resetFocusState } from '../components/focusable';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { Bitmap } from '../terminal/graphics/cellRenderer';
import {
	createANSIImage,
	getANSIImageBitmap,
	getANSIImageCellMap,
	isANSIImage,
	resetANSIImageStore,
} from './ansiImage';

/** Creates a simple 2x2 red bitmap for testing. */
function makeRedBitmap(): Bitmap {
	return {
		width: 2,
		height: 2,
		data: new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]),
	};
}

/** Creates a 4x4 multicolor bitmap for testing. */
function makeColorBitmap(): Bitmap {
	const data = new Uint8Array(4 * 4 * 4);
	for (let i = 0; i < 4 * 4; i++) {
		data[i * 4] = (i * 17) % 256; // R
		data[i * 4 + 1] = (i * 37) % 256; // G
		data[i * 4 + 2] = (i * 71) % 256; // B
		data[i * 4 + 3] = 255; // A
	}
	return { width: 4, height: 4, data };
}

describe('ANSIImage widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetANSIImageStore();
	});

	describe('creation', () => {
		it('creates with default config', () => {
			const img = createANSIImage(world);
			expect(img.eid).toBeGreaterThan(0);
			expect(img.isVisible()).toBe(true);
			expect(img.getRenderMode()).toBe('color');
			expect(img.getDither()).toBe(false);
			expect(img.getImage()).toBeUndefined();
		});

		it('creates with bitmap and renders content', () => {
			const bitmap = makeRedBitmap();
			const img = createANSIImage(world, { bitmap, renderMode: 'color' });
			expect(img.getImage()).toStrictEqual(bitmap);
			const content = getContent(world, img.eid);
			expect(content.length).toBeGreaterThan(0);
		});

		it('creates hidden when visible=false', () => {
			const img = createANSIImage(world, { visible: false });
			expect(img.isVisible()).toBe(false);
		});

		it('marks entity as ANSIImage', () => {
			const img = createANSIImage(world);
			expect(isANSIImage(world, img.eid)).toBe(true);
		});
	});

	describe('render modes', () => {
		it('renders in color mode', () => {
			const bitmap = makeColorBitmap();
			const img = createANSIImage(world, { bitmap, renderMode: 'color' });
			const output = img.render();
			expect(output.length).toBeGreaterThan(0);
			// Color mode uses ANSI escape sequences
			expect(output).toContain('\x1b[');
		});

		it('renders in ascii mode', () => {
			const bitmap = makeColorBitmap();
			const img = createANSIImage(world, { bitmap, renderMode: 'ascii' });
			const output = img.render();
			expect(output.length).toBeGreaterThan(0);
		});

		it('renders in braille mode', () => {
			const bitmap = makeColorBitmap();
			const img = createANSIImage(world, { bitmap, renderMode: 'braille' });
			const output = img.render();
			expect(output.length).toBeGreaterThan(0);
		});

		it('switches render mode dynamically', () => {
			const bitmap = makeColorBitmap();
			const img = createANSIImage(world, { bitmap, renderMode: 'color' });
			const colorOutput = img.render();

			img.setRenderMode('ascii');
			expect(img.getRenderMode()).toBe('ascii');
			const asciiOutput = img.render();

			// Different modes produce different output
			expect(colorOutput).not.toBe(asciiOutput);
		});
	});

	describe('dithering', () => {
		it('toggles dithering', () => {
			const bitmap = makeColorBitmap();
			const img = createANSIImage(world, { bitmap });
			expect(img.getDither()).toBe(false);

			img.setDither(true);
			expect(img.getDither()).toBe(true);
		});
	});

	describe('positioning', () => {
		it('sets and gets position', () => {
			const img = createANSIImage(world, { x: 10, y: 20 });
			expect(img.getPosition()).toEqual({ x: 10, y: 20 });

			img.setPosition(30, 40);
			expect(img.getPosition()).toEqual({ x: 30, y: 40 });
		});

		it('moves by delta', () => {
			const img = createANSIImage(world, { x: 10, y: 20 });
			img.move(5, -3);
			expect(img.getPosition()).toEqual({ x: 15, y: 17 });
		});
	});

	describe('visibility', () => {
		it('toggles visibility', () => {
			const img = createANSIImage(world);
			expect(img.isVisible()).toBe(true);

			img.hide();
			expect(img.isVisible()).toBe(false);

			img.show();
			expect(img.isVisible()).toBe(true);
		});
	});

	describe('image data', () => {
		it('sets image and updates content', () => {
			const img = createANSIImage(world);
			expect(img.getImage()).toBeUndefined();

			const bitmap = makeRedBitmap();
			img.setImage(bitmap);
			expect(img.getImage()).toStrictEqual(bitmap);

			const content = getContent(world, img.eid);
			expect(content.length).toBeGreaterThan(0);
		});

		it('provides CellMap after render', () => {
			const bitmap = makeRedBitmap();
			const img = createANSIImage(world, { bitmap });
			const cellMap = img.getCellMap();
			expect(cellMap).toBeDefined();
			expect(cellMap!.width).toBeGreaterThan(0);
			expect(cellMap!.height).toBeGreaterThan(0);
		});
	});

	describe('helpers', () => {
		it('getANSIImageBitmap returns bitmap', () => {
			const bitmap = makeRedBitmap();
			const img = createANSIImage(world, { bitmap });
			expect(getANSIImageBitmap(img.eid)).toStrictEqual(bitmap);
		});

		it('getANSIImageCellMap returns cellMap', () => {
			const bitmap = makeRedBitmap();
			const img = createANSIImage(world, { bitmap });
			expect(getANSIImageCellMap(img.eid)).toBeDefined();
		});
	});

	describe('chainable API', () => {
		it('methods return this for chaining', () => {
			const bitmap = makeRedBitmap();
			const img = createANSIImage(world);
			const result = img
				.setImage(bitmap)
				.setRenderMode('braille')
				.setDither(true)
				.setPosition(5, 10)
				.show();
			expect(result).toBe(img);
		});
	});

	describe('render with empty bitmap', () => {
		it('returns empty string when no bitmap set', () => {
			const img = createANSIImage(world);
			expect(img.render()).toBe('');
		});
	});

	describe('destroy', () => {
		it('cleans up entity', () => {
			const img = createANSIImage(world, { bitmap: makeRedBitmap() });
			const eid = img.eid;
			expect(isANSIImage(world, eid)).toBe(true);

			img.destroy();
			expect(isANSIImage(world, eid)).toBe(false);
			expect(getANSIImageBitmap(eid)).toBeUndefined();
		});
	});
});
