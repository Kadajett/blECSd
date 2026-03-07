/**
 * Tests for the OverlayImage widget.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { resetFocusState } from '../components/focusable';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { GraphicsManagerState } from '../terminal/graphics/backend';
import { createGraphicsManager, registerBackend } from '../terminal/graphics/backend';
import type { Bitmap } from '../terminal/graphics/cellRenderer';
import {
	createOverlayImage,
	getOverlayImageBitmap,
	isOverlayImage,
	resetOverlayImageStore,
} from './overlayImage';

/** Creates a simple 2x2 red bitmap for testing. */
function makeRedBitmap(): Bitmap {
	return {
		width: 2,
		height: 2,
		data: new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]),
	};
}

/** Creates a mock graphics manager with no real protocol support (ANSI fallback). */
function makeFallbackManager(): GraphicsManagerState {
	return createGraphicsManager({});
}

/** Creates a mock graphics manager that simulates Kitty protocol support. */
function makeMockKittyManager(): GraphicsManagerState {
	const manager = createGraphicsManager({});
	registerBackend(manager, {
		name: 'kitty',
		isSupported: () => true,
		capabilities: {
			staticImages: true,
			animation: true,
			alphaChannel: true,
			maxWidth: null,
			maxHeight: null,
		},
		render: (_img, _opts) => '\x1b_Gf=32,a=T;base64data\x1b\\',
		clear: () => '',
	});
	return manager;
}

describe('OverlayImage widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetOverlayImageStore();
	});

	describe('creation', () => {
		it('creates with default config', () => {
			const overlay = createOverlayImage(world);
			expect(overlay.eid).toBeGreaterThan(0);
			expect(overlay.isVisible()).toBe(true);
			expect(overlay.getImage()).toBeUndefined();
			expect(overlay.getFallbackRenderMode()).toBe('color');
		});

		it('creates with bitmap', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, { bitmap });
			expect(overlay.getImage()).toStrictEqual(bitmap);
		});

		it('marks entity as OverlayImage', () => {
			const overlay = createOverlayImage(world);
			expect(isOverlayImage(world, overlay.eid)).toBe(true);
		});

		it('creates hidden when visible=false', () => {
			const overlay = createOverlayImage(world, { visible: false });
			expect(overlay.isVisible()).toBe(false);
		});
	});

	describe('fallback mode (no graphics protocol)', () => {
		it('falls back to ANSI rendering without a manager', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, { bitmap });
			expect(overlay.isUsingGraphicsProtocol()).toBe(false);
			expect(overlay.getActiveBackendName()).toBe('ansi-fallback');

			const output = overlay.render();
			expect(output.length).toBeGreaterThan(0);
			// ANSI escape sequences present
			expect(output).toContain('\x1b[');
		});

		it('falls back to ANSI with empty manager', () => {
			const bitmap = makeRedBitmap();
			const manager = makeFallbackManager();
			const overlay = createOverlayImage(world, { bitmap, graphicsManager: manager });
			expect(overlay.isUsingGraphicsProtocol()).toBe(false);
			expect(overlay.getActiveBackendName()).toBe('ansi-fallback');
		});

		it('provides CellMap in fallback mode', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, { bitmap });
			const cellMap = overlay.getCellMap();
			expect(cellMap).toBeDefined();
			expect(cellMap!.width).toBeGreaterThan(0);
		});

		it('uses fallback render mode setting', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, {
				bitmap,
				fallbackRenderMode: 'braille',
			});
			expect(overlay.getFallbackRenderMode()).toBe('braille');
		});

		it('changes fallback render mode dynamically', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, { bitmap });
			overlay.setFallbackRenderMode('ascii');
			expect(overlay.getFallbackRenderMode()).toBe('ascii');
		});
	});

	describe('graphics protocol mode', () => {
		it('uses Kitty protocol when available', () => {
			const bitmap = makeRedBitmap();
			const manager = makeMockKittyManager();
			const overlay = createOverlayImage(world, { bitmap, graphicsManager: manager });

			expect(overlay.isUsingGraphicsProtocol()).toBe(true);
			expect(overlay.getActiveBackendName()).toBe('kitty');
		});

		it('renders with protocol output', () => {
			const bitmap = makeRedBitmap();
			const manager = makeMockKittyManager();
			const overlay = createOverlayImage(world, { bitmap, graphicsManager: manager });

			const output = overlay.render();
			expect(output).toContain('G'); // Kitty protocol marker
		});

		it('has no CellMap in protocol mode', () => {
			const bitmap = makeRedBitmap();
			const manager = makeMockKittyManager();
			const overlay = createOverlayImage(world, { bitmap, graphicsManager: manager });
			expect(overlay.getCellMap()).toBeUndefined();
		});
	});

	describe('graphics manager switching', () => {
		it('switches from fallback to protocol when manager set', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world, { bitmap });
			expect(overlay.isUsingGraphicsProtocol()).toBe(false);

			const manager = makeMockKittyManager();
			overlay.setGraphicsManager(manager);
			expect(overlay.isUsingGraphicsProtocol()).toBe(true);
		});
	});

	describe('positioning', () => {
		it('sets and gets position', () => {
			const overlay = createOverlayImage(world, { x: 5, y: 10 });
			expect(overlay.getPosition()).toEqual({ x: 5, y: 10 });

			overlay.setPosition(20, 30);
			expect(overlay.getPosition()).toEqual({ x: 20, y: 30 });
		});

		it('moves by delta', () => {
			const overlay = createOverlayImage(world, { x: 5, y: 10 });
			overlay.move(3, -2);
			expect(overlay.getPosition()).toEqual({ x: 8, y: 8 });
		});
	});

	describe('visibility', () => {
		it('toggles visibility', () => {
			const overlay = createOverlayImage(world);
			overlay.hide();
			expect(overlay.isVisible()).toBe(false);
			overlay.show();
			expect(overlay.isVisible()).toBe(true);
		});
	});

	describe('chainable API', () => {
		it('methods return this for chaining', () => {
			const bitmap = makeRedBitmap();
			const overlay = createOverlayImage(world);
			const result = overlay
				.setImage(bitmap)
				.setFallbackRenderMode('braille')
				.setPosition(5, 10)
				.show();
			expect(result).toBe(overlay);
		});
	});

	describe('render with empty bitmap', () => {
		it('returns empty string when no bitmap set', () => {
			const overlay = createOverlayImage(world);
			expect(overlay.render()).toBe('');
		});
	});

	describe('destroy', () => {
		it('cleans up entity', () => {
			const overlay = createOverlayImage(world, { bitmap: makeRedBitmap() });
			const eid = overlay.eid;
			expect(isOverlayImage(world, eid)).toBe(true);

			overlay.destroy();
			expect(isOverlayImage(world, eid)).toBe(false);
			expect(getOverlayImageBitmap(eid)).toBeUndefined();
		});
	});
});
