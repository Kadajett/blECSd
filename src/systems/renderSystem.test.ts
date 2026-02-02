/**
 * Tests for Render System
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	Border,
	BorderType,
	BORDER_SINGLE,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { Position, setPosition, setZIndex } from '../components/position';
import {
	Renderable,
	hide,
	markDirty,
	setStyle,
	setVisible,
} from '../components/renderable';
import { createScreenEntity } from '../core/entities';
import type { World } from '../core/types';
import { createCell, getCell } from '../terminal/screen/cell';
import {
	clearDirtyRegions,
	createDoubleBuffer,
	getBackBuffer,
	getDirtyRegions,
} from '../terminal/screen/doubleBuffer';
import { layoutSystem } from './layoutSystem';
import {
	clearRenderBuffer,
	createRenderSystem,
	getRenderBuffer,
	markAllDirty,
	renderBackground,
	renderBorder,
	renderRect,
	renderSystem,
	renderText,
	setRenderBuffer,
} from './renderSystem';

describe('renderSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		createScreenEntity(world, { width: 80, height: 24 });
		clearRenderBuffer();
	});

	describe('setRenderBuffer / getRenderBuffer', () => {
		it('sets and gets the render buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			expect(getRenderBuffer()).toBe(db);
		});

		it('clears the render buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);
			clearRenderBuffer();

			expect(getRenderBuffer()).toBeNull();
		});
	});

	describe('basic rendering', () => {
		it('renders visible entity to buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { fg: '#ff0000', bg: '#0000ff' });

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 10, 5);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe(' ');
			// Background should be blue (ARGB format: 0xff0000ff)
			expect(cell?.bg).toBe(0xff0000ff);
		});

		it('skips hidden entities', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });
			hide(world, entity);

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 10, 5);
			// Should still be default (space with default colors)
			expect(cell?.bg).not.toBe(0xff0000ff);
		});

		it('skips clean entities', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Clear dirty regions and run again
			clearDirtyRegions(db);
			const regionsBefore = getDirtyRegions(db).length;

			renderSystem(world);

			// No new dirty regions should be added
			expect(getDirtyRegions(db).length).toBe(regionsBefore);
		});

		it('does nothing without render buffer', () => {
			clearRenderBuffer();

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw
			expect(() => renderSystem(world)).not.toThrow();
		});
	});

	describe('z-index ordering', () => {
		it('renders entities in z-index order (lower first)', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			// Create overlapping entities
			const back = addEntity(world);
			setPosition(world, back, 10, 5);
			setZIndex(world, back, 0);
			setDimensions(world, back, 10, 5);
			setStyle(world, back, { bg: '#ff0000' }); // Red

			const front = addEntity(world);
			setPosition(world, front, 12, 6);
			setZIndex(world, front, 10);
			setDimensions(world, front, 10, 5);
			setStyle(world, front, { bg: '#0000ff' }); // Blue

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);

			// Overlapping area should be blue (higher z-index renders on top)
			// ARGB format: 0xff0000ff
			const cell = getCell(buffer, 15, 7);
			expect(cell?.bg).toBe(0xff0000ff);

			// Non-overlapping back area should be red
			// ARGB format: 0xffff0000
			const backCell = getCell(buffer, 10, 5);
			expect(backCell?.bg).toBe(0xffff0000);
		});
	});

	describe('border rendering', () => {
		it('renders border around entity', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { fg: '#ffffff', bg: '#000000' });
			setBorder(world, entity, { type: BorderType.Line });
			setBorderChars(world, entity, BORDER_SINGLE);

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);

			// Check corners
			const topLeft = getCell(buffer, 10, 5);
			expect(topLeft?.char).toBe(String.fromCodePoint(BORDER_SINGLE.topLeft));

			const topRight = getCell(buffer, 19, 5);
			expect(topRight?.char).toBe(String.fromCodePoint(BORDER_SINGLE.topRight));

			const bottomLeft = getCell(buffer, 10, 9);
			expect(bottomLeft?.char).toBe(String.fromCodePoint(BORDER_SINGLE.bottomLeft));

			const bottomRight = getCell(buffer, 19, 9);
			expect(bottomRight?.char).toBe(String.fromCodePoint(BORDER_SINGLE.bottomRight));

			// Check horizontal edges
			const topEdge = getCell(buffer, 15, 5);
			expect(topEdge?.char).toBe(String.fromCodePoint(BORDER_SINGLE.horizontal));

			// Check vertical edges
			const leftEdge = getCell(buffer, 10, 7);
			expect(leftEdge?.char).toBe(String.fromCodePoint(BORDER_SINGLE.vertical));
		});

		it('renders partial borders', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { fg: '#ffffff', bg: '#000000' });
			setBorder(world, entity, {
				type: BorderType.Line,
				top: true,
				bottom: true,
				left: false,
				right: false,
			});

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);

			// Top edge should exist
			const topEdge = getCell(buffer, 15, 5);
			expect(topEdge?.char).toBe(String.fromCodePoint(BORDER_SINGLE.horizontal));

			// Left edge should be background, not border
			const leftEdge = getCell(buffer, 10, 7);
			expect(leftEdge?.char).toBe(' ');
		});

		it('skips border rendering for BorderType.None', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { fg: '#ffffff', bg: '#0000ff' });
			setBorder(world, entity, { type: BorderType.None });

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);

			// All edges should be background color (ARGB format: 0xff0000ff)
			const topLeft = getCell(buffer, 10, 5);
			expect(topLeft?.char).toBe(' ');
			expect(topLeft?.bg).toBe(0xff0000ff);
		});
	});

	describe('dirty region tracking', () => {
		it('marks dirty region when rendering', () => {
			const db = createDoubleBuffer(80, 24);
			clearDirtyRegions(db);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			const regions = getDirtyRegions(db);
			expect(regions.length).toBeGreaterThan(0);

			// Should include the entity's bounds
			const hasEntityRegion = regions.some(
				(r) => r.x <= 10 && r.y <= 5 && r.x + r.w >= 30 && r.y + r.h >= 15,
			);
			expect(hasEntityRegion).toBe(true);
		});
	});

	describe('parent-child visibility', () => {
		it('hides children when parent is hidden', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const parent = addEntity(world);
			setPosition(world, parent, 10, 5);
			setDimensions(world, parent, 30, 15);
			setStyle(world, parent, { bg: '#0000ff' });
			hide(world, parent);

			const child = addEntity(world);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);
			setStyle(world, child, { bg: '#ff0000' });
			appendChild(world, parent, child);

			layoutSystem(world);
			renderSystem(world);

			const buffer = getBackBuffer(db);

			// Child position would be (15, 8) but should not be rendered
			const cell = getCell(buffer, 15, 8);
			expect(cell?.bg).not.toBe(0xff0000ff);
		});
	});

	describe('utility functions', () => {
		it('renderText writes text to buffer', () => {
			const db = createDoubleBuffer(80, 24);
			const buffer = getBackBuffer(db);

			const written = renderText(buffer, 10, 5, 'Hello', 0xffffffff, 0x000000ff);

			expect(written).toBe(5);

			const cell = getCell(buffer, 10, 5);
			expect(cell?.char).toBe('H');

			const cell2 = getCell(buffer, 14, 5);
			expect(cell2?.char).toBe('o');
		});

		it('renderRect fills a rectangle', () => {
			const db = createDoubleBuffer(80, 24);
			const buffer = getBackBuffer(db);

			renderRect(buffer, 10, 5, 5, 3, createCell('X', 0xff0000ff, 0x0000ffff));

			const cell = getCell(buffer, 10, 5);
			expect(cell?.char).toBe('X');
			expect(cell?.fg).toBe(0xff0000ff);

			const cell2 = getCell(buffer, 14, 7);
			expect(cell2?.char).toBe('X');
		});

		it('markAllDirty marks all renderable entities', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 0, 0);
			setStyle(world, entity1, {});
			Renderable.dirty[entity1] = 0;

			const entity2 = addEntity(world);
			setPosition(world, entity2, 10, 0);
			setStyle(world, entity2, {});
			Renderable.dirty[entity2] = 0;

			markAllDirty(world);

			expect(Renderable.dirty[entity1]).toBe(1);
			expect(Renderable.dirty[entity2]).toBe(1);
		});
	});

	describe('createRenderSystem', () => {
		it('creates a working render system', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const system = createRenderSystem();

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			system(world);

			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 10, 5);
			// ARGB format: '#ff0000' -> 0xffff0000
			expect(cell?.bg).toBe(0xffff0000);
		});
	});

	describe('renderBackground', () => {
		it('skips transparent backgrounds', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			// Pre-fill with a specific color
			const buffer = getBackBuffer(db);
			renderRect(buffer, 0, 0, 80, 24, createCell(' ', 0xffffffff, 0x00ff00ff)); // Green

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000', transparent: true });

			layoutSystem(world);

			const ctx = {
				world,
				buffer,
				doubleBuffer: db,
			};

			const bounds = { x: 10, y: 5, width: 20, height: 10 };
			renderBackground(ctx, entity, bounds);

			// Should still be green (transparent didn't overwrite)
			const cell = getCell(buffer, 10, 5);
			expect(cell?.bg).toBe(0x00ff00ff);
		});
	});

	describe('renderBorder', () => {
		it('handles small bounds gracefully', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 1, 1);
			setStyle(world, entity, {});
			setBorder(world, entity, { type: BorderType.Line });

			layoutSystem(world);

			const buffer = getBackBuffer(db);
			const ctx = {
				world,
				buffer,
				doubleBuffer: db,
			};

			const bounds = { x: 10, y: 5, width: 1, height: 1 };

			// Should not throw
			expect(() => renderBorder(ctx, entity, bounds)).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('handles entity with no dimensions', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			// No dimensions set
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw
			expect(() => renderSystem(world)).not.toThrow();
		});

		it('handles entity outside buffer bounds', () => {
			const db = createDoubleBuffer(80, 24);
			setRenderBuffer(db);

			const entity = addEntity(world);
			setPosition(world, entity, 100, 50); // Outside 80x24 buffer
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw
			expect(() => renderSystem(world)).not.toThrow();
		});
	});
});
