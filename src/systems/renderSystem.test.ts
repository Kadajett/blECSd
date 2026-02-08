/**
 * Tests for Render System
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BORDER_SINGLE, BorderType, setBorder, setBorderChars } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition, setZIndex } from '../components/position';
import { hide, Renderable, setStyle } from '../components/renderable';
import { clearDirtyTracking, createDirtyTracker, getDirtyRegions } from '../core/dirtyTracking';
import { addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { World } from '../core/types';
import { createCell, createScreenBuffer, getCell } from '../terminal/screen/cell';
import { layoutSystem } from './layoutSystem';
import {
	clearRenderBuffer,
	createRenderSystem,
	getRenderBuffer,
	getViewportBounds,
	markAllDirty,
	renderBackground,
	renderBorder,
	renderRect,
	renderSystem,
	renderText,
	setRenderBuffer,
	setViewportBounds,
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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			expect(getRenderBuffer()).toBe(tracker);
		});

		it('clears the render buffer', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			clearRenderBuffer();

			expect(getRenderBuffer()).toBeNull();
		});
	});

	describe('basic rendering', () => {
		it('renders visible entity to buffer', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { fg: '#ff0000', bg: '#0000ff' });

			layoutSystem(world);
			renderSystem(world);

			const cell = getCell(buffer, 10, 5);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe(' ');
			// Background should be blue (ARGB format: 0xff0000ff)
			expect(cell?.bg).toBe(0xff0000ff);
		});

		it('skips hidden entities', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });
			hide(world, entity);

			layoutSystem(world);
			renderSystem(world);

			const cell = getCell(buffer, 10, 5);
			// Should still be default (space with default colors)
			expect(cell?.bg).not.toBe(0xff0000ff);
		});

		it('skips clean entities', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Clear dirty regions and run again
			clearDirtyTracking(tracker);
			const regionsBefore = getDirtyRegions(tracker).length;

			renderSystem(world);

			// No new dirty regions should be added
			expect(getDirtyRegions(tracker).length).toBe(regionsBefore);
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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { fg: '#ffffff', bg: '#000000' });
			setBorder(world, entity, { type: BorderType.Line });
			setBorderChars(world, entity, BORDER_SINGLE);

			layoutSystem(world);
			renderSystem(world);

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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

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

			// Top edge should exist
			const topEdge = getCell(buffer, 15, 5);
			expect(topEdge?.char).toBe(String.fromCodePoint(BORDER_SINGLE.horizontal));

			// Left edge should be background, not border
			const leftEdge = getCell(buffer, 10, 7);
			expect(leftEdge?.char).toBe(' ');
		});

		it('skips border rendering for BorderType.None', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { fg: '#ffffff', bg: '#0000ff' });
			setBorder(world, entity, { type: BorderType.None });

			layoutSystem(world);
			renderSystem(world);

			// All edges should be background color (ARGB format: 0xff0000ff)
			const topLeft = getCell(buffer, 10, 5);
			expect(topLeft?.char).toBe(' ');
			expect(topLeft?.bg).toBe(0xff0000ff);
		});
	});

	describe('dirty region tracking', () => {
		it('marks dirty region when rendering', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			clearDirtyTracking(tracker);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBeGreaterThan(0);

			// Should include the entity's bounds
			const hasEntityRegion = regions.some(
				(r) => r.x <= 10 && r.y <= 5 && r.x + r.width >= 30 && r.y + r.height >= 15,
			);
			expect(hasEntityRegion).toBe(true);
		});
	});

	describe('parent-child visibility', () => {
		it('hides children when parent is hidden', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

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

			// Child position would be (15, 8) but should not be rendered
			const cell = getCell(buffer, 15, 8);
			expect(cell?.bg).not.toBe(0xff0000ff);
		});
	});

	describe('utility functions', () => {
		it('renderText writes text to buffer', () => {
			const buffer = createScreenBuffer(80, 24);

			const written = renderText(buffer, 10, 5, 'Hello', 0xffffffff, 0x000000ff);

			expect(written).toBe(5);

			const cell = getCell(buffer, 10, 5);
			expect(cell?.char).toBe('H');

			const cell2 = getCell(buffer, 14, 5);
			expect(cell2?.char).toBe('o');
		});

		it('renderRect fills a rectangle', () => {
			const buffer = createScreenBuffer(80, 24);

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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const system = createRenderSystem();

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			system(world);

			const cell = getCell(buffer, 10, 5);
			// ARGB format: '#ff0000' -> 0xffff0000
			expect(cell?.bg).toBe(0xffff0000);
		});
	});

	describe('renderBackground', () => {
		it('skips transparent backgrounds', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			// Pre-fill with a specific color
			renderRect(buffer, 0, 0, 80, 24, createCell(' ', 0xffffffff, 0x00ff00ff)); // Green

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000', transparent: true });

			layoutSystem(world);

			const ctx = {
				world,
				buffer,
				dirtyTracker: tracker,
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
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 1, 1);
			setStyle(world, entity, {});
			setBorder(world, entity, { type: BorderType.Line });

			layoutSystem(world);

			const ctx = {
				world,
				buffer,
				dirtyTracker: tracker,
			};

			const bounds = { x: 10, y: 5, width: 1, height: 1 };

			// Should not throw
			expect(() => renderBorder(ctx, entity, bounds)).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('handles entity with no dimensions', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			// No dimensions set
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw
			expect(() => renderSystem(world)).not.toThrow();
		});

		it('handles entity outside buffer bounds', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);

			const entity = addEntity(world);
			setPosition(world, entity, 100, 50); // Outside 80x24 buffer
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw
			expect(() => renderSystem(world)).not.toThrow();
		});
	});

	describe('viewport bounds culling', () => {
		it('sets and gets viewport bounds', () => {
			const bounds = { x: 0, y: 0, width: 80, height: 24 };
			setViewportBounds(bounds);

			expect(getViewportBounds()).toEqual(bounds);
		});

		it('clears viewport bounds with null', () => {
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });
			setViewportBounds(null);

			expect(getViewportBounds()).toBeNull();
		});

		it('renders entity inside viewport', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			const cell = getCell(buffer, 10, 5);
			// Should be rendered (red background)
			expect(cell?.bg).toBe(0xffff0000);
		});

		it('skips entity completely outside viewport (left)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 20, y: 0, width: 60, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 5, 5); // x=5, viewport starts at x=20
			setDimensions(world, entity, 10, 10); // Ends at x=15, still left of viewport
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Entity should be marked as clean even though it wasn't rendered
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('skips entity completely outside viewport (right)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 85, 5); // x=85, viewport ends at x=80
			setDimensions(world, entity, 10, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('skips entity completely outside viewport (above)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 10, width: 80, height: 14 });

			const entity = addEntity(world);
			setPosition(world, entity, 10, 2); // y=2, viewport starts at y=10
			setDimensions(world, entity, 20, 5); // Ends at y=7, still above viewport
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('skips entity completely outside viewport (below)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 10, 30); // y=30, viewport ends at y=24
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('renders partially visible entity (overlapping left edge)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 10, y: 0, width: 70, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 5, 5); // Starts at x=5
			setDimensions(world, entity, 10, 10); // Ends at x=15, overlaps viewport at x=10
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Should be rendered at x=10 (first visible column)
			const cell = getCell(buffer, 10, 5);
			expect(cell?.bg).toBe(0xffff0000);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('renders partially visible entity (overlapping right edge)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 75, 5); // Starts at x=75
			setDimensions(world, entity, 10, 10); // Ends at x=85, overlaps viewport boundary
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Should be rendered at x=75
			const cell = getCell(buffer, 75, 5);
			expect(cell?.bg).toBe(0xffff0000);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('renders partially visible entity (overlapping top edge)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 10, width: 80, height: 14 });

			const entity = addEntity(world);
			setPosition(world, entity, 10, 8); // Starts at y=8
			setDimensions(world, entity, 20, 5); // Ends at y=13, overlaps viewport at y=10
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Should be rendered at y=10 (first visible row)
			const cell = getCell(buffer, 10, 10);
			expect(cell?.bg).toBe(0xffff0000);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('renders partially visible entity (overlapping bottom edge)', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			const entity = addEntity(world);
			setPosition(world, entity, 10, 20); // Starts at y=20
			setDimensions(world, entity, 20, 10); // Ends at y=30, overlaps viewport boundary
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);
			renderSystem(world);

			// Should be rendered at y=20
			const cell = getCell(buffer, 10, 20);
			expect(cell?.bg).toBe(0xffff0000);

			// Entity should be marked as clean
			expect(Renderable.dirty[entity]).toBe(0);
		});

		it('renders entity exactly at viewport boundary', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 10, y: 10, width: 60, height: 14 });

			// Entity at top-left corner of viewport
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 10);
			setDimensions(world, entity1, 10, 5);
			setStyle(world, entity1, { bg: '#ff0000' });

			// Entity at bottom-right corner of viewport
			const entity2 = addEntity(world);
			setPosition(world, entity2, 65, 20);
			setDimensions(world, entity2, 5, 4);
			setStyle(world, entity2, { bg: '#00ff00' });

			layoutSystem(world);
			renderSystem(world);

			const cell1 = getCell(buffer, 10, 10);
			expect(cell1?.bg).toBe(0xffff0000);

			const cell2 = getCell(buffer, 65, 20);
			expect(cell2?.bg).toBe(0xff00ff00);
		});

		it('performance: culls many off-screen entities efficiently', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });

			// Create 1000 entities scattered across large virtual space
			const entities: number[] = [];
			for (let i = 0; i < 1000; i++) {
				const entity = addEntity(world);
				setPosition(world, entity, i * 100, i * 50); // Spread far outside viewport
				setDimensions(world, entity, 10, 10);
				setStyle(world, entity, { bg: '#ff0000' });
				entities.push(entity);
			}

			layoutSystem(world);

			// Measure render time
			const start = performance.now();
			renderSystem(world);
			const elapsed = performance.now() - start;

			// All off-screen entities should be marked as clean (culled)
			const culledCount = entities.filter((eid) => Renderable.dirty[eid] === 0).length;
			expect(culledCount).toBeGreaterThan(990); // Most should be culled

			// Performance check: should complete quickly (most entities culled)
			expect(elapsed).toBeLessThan(100); // Generous threshold for CI
		});

		it('disables culling when viewport bounds is null', () => {
			const tracker = createDirtyTracker(80, 24);
			const buffer = createScreenBuffer(80, 24);
			setRenderBuffer(tracker, buffer);
			setViewportBounds(null); // Disable viewport culling

			const entity = addEntity(world);
			setPosition(world, entity, 100, 50); // Far outside any reasonable viewport
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: '#ff0000' });

			layoutSystem(world);

			// Should not throw even with no viewport culling
			expect(() => renderSystem(world)).not.toThrow();

			// Entity should still be marked as clean (rendered or at least processed)
			expect(Renderable.dirty[entity]).toBe(0);
		});
	});
});
