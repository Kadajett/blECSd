/**
 * Tests for the virtualized render system.
 * @module systems/virtualizedRenderSystem.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BorderType, setBorder } from '../components/border';
import { Position, setPosition } from '../components/position';
import { markDirty, Renderable, setStyle, setVisible } from '../components/renderable';
import {
	invalidateViewport,
	setVirtualViewport,
	VirtualViewport,
} from '../components/virtualViewport';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import { getCell } from '../terminal/screen/cell';
import { createDoubleBuffer, getBackBuffer } from '../terminal/screen/doubleBuffer';
import { createLineStore, createLineStoreFromLines } from '../utils/virtualizedLineStore';
import { ComputedLayout } from './layoutSystem';
import {
	cleanupEntityResources,
	cleanupVirtualizedRenderSystem,
	clearLineRenderConfig,
	clearVirtualizedRenderBuffer,
	createVirtualizedRenderSystem,
	getLineRenderConfig,
	getLineStore,
	getVirtualizedRenderBuffer,
	registerLineStore,
	setLineRenderConfig,
	setVirtualizedRenderBuffer,
	unregisterLineStore,
	updateLineStore,
	virtualizedRenderSystem,
} from './virtualizedRenderSystem';

describe('virtualizedRenderSystem', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		clearVirtualizedRenderBuffer();
		cleanupVirtualizedRenderSystem(world);
	});

	// ===========================================================================
	// BUFFER MANAGEMENT
	// ===========================================================================

	describe('buffer management', () => {
		it('should set and get render buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setVirtualizedRenderBuffer(db);

			expect(getVirtualizedRenderBuffer()).toBe(db);
		});

		it('should clear render buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setVirtualizedRenderBuffer(db);
			clearVirtualizedRenderBuffer();

			expect(getVirtualizedRenderBuffer()).toBeNull();
		});

		it('should return early if no buffer set', () => {
			// Create entity with all required components
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Renderable);
			addComponent(world, eid, VirtualViewport);

			// Should not throw
			const result = virtualizedRenderSystem(world);
			expect(result).toBe(world);
		});
	});

	// ===========================================================================
	// LINE STORE MANAGEMENT
	// ===========================================================================

	describe('line store management', () => {
		it('should register and get line store', () => {
			const eid = addEntity(world);
			const store = createLineStore('Line 1\nLine 2');

			registerLineStore(world, eid, store);

			expect(getLineStore(world, eid)).toBe(store);
		});

		it('should unregister line store', () => {
			const eid = addEntity(world);
			const store = createLineStore('Content');

			registerLineStore(world, eid, store);
			unregisterLineStore(world, eid);

			expect(getLineStore(world, eid)).toBeUndefined();
		});

		it('should update line store', () => {
			const eid = addEntity(world);
			const store1 = createLineStore('Original');
			const store2 = createLineStore('Updated');

			registerLineStore(world, eid, store1);
			updateLineStore(world, eid, store2);

			expect(getLineStore(world, eid)).toBe(store2);
		});
	});

	// ===========================================================================
	// LINE RENDER CONFIG
	// ===========================================================================

	describe('line render config', () => {
		it('should return default config for unconfigured entity', () => {
			const eid = addEntity(world);
			const config = getLineRenderConfig(world, eid);

			expect(config.fg).toBe(0xffffffff);
			expect(config.bg).toBe(0x000000ff);
			expect(config.showLineNumbers).toBe(false);
		});

		it('should set and merge config', () => {
			const eid = addEntity(world);

			setLineRenderConfig(world, eid, { showLineNumbers: true, lineNumberWidth: 5 });

			const config = getLineRenderConfig(world, eid);
			expect(config.showLineNumbers).toBe(true);
			expect(config.lineNumberWidth).toBe(5);
			expect(config.fg).toBe(0xffffffff); // Default preserved
		});

		it('should override existing config values', () => {
			const eid = addEntity(world);

			setLineRenderConfig(world, eid, { fg: 0xff0000ff });
			setLineRenderConfig(world, eid, { bg: 0x00ff00ff });

			const config = getLineRenderConfig(world, eid);
			expect(config.fg).toBe(0xff0000ff);
			expect(config.bg).toBe(0x00ff00ff);
		});

		it('should clear config', () => {
			const eid = addEntity(world);

			setLineRenderConfig(world, eid, { showLineNumbers: true });
			clearLineRenderConfig(world, eid);

			const config = getLineRenderConfig(world, eid);
			expect(config.showLineNumbers).toBe(false); // Back to default
		});
	});

	// ===========================================================================
	// RENDERING
	// ===========================================================================

	describe('rendering', () => {
		function createTestEntity(
			w: ReturnType<typeof createWorld>,
			x: number,
			y: number,
			width: number,
			height: number,
		): number {
			const eid = addEntity(w);

			// Add required components
			addComponent(w, eid, Position);
			addComponent(w, eid, Renderable);
			addComponent(w, eid, VirtualViewport);
			addComponent(w, eid, ComputedLayout);

			// Set position
			setPosition(w, eid, x, y);

			// Set computed layout values directly
			ComputedLayout.x[eid] = x;
			ComputedLayout.y[eid] = y;
			ComputedLayout.width[eid] = width;
			ComputedLayout.height[eid] = height;
			ComputedLayout.valid[eid] = 1;

			// Set renderable (visible and dirty)
			setStyle(w, eid, { fg: 0xffffffff, bg: 0x000000ff });
			setVisible(w, eid, true);
			markDirty(w, eid);

			return eid;
		}

		it('should render visible lines to buffer', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			// Create content
			const lines = ['Line 0', 'Line 1', 'Line 2', 'Line 3', 'Line 4'];
			const store = createLineStoreFromLines(lines);
			registerLineStore(world, eid, store);

			// Set viewport
			setVirtualViewport(world, eid, {
				totalLineCount: 5,
				visibleLineCount: 3,
				firstVisibleLine: 0,
			});
			invalidateViewport(world, eid);

			// Run system
			virtualizedRenderSystem(world);

			// Verify content was rendered
			const buffer = getBackBuffer(db);

			// Check first line starts with 'L'
			const cell = getCell(buffer, 0, 0);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('L');
		});

		it('should skip entities without line store', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			setVirtualViewport(world, eid, {
				totalLineCount: 5,
				visibleLineCount: 3,
			});
			invalidateViewport(world, eid);

			// No line store registered

			// Should not throw
			virtualizedRenderSystem(world);
		});

		it('should skip non-visible entities', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			// Make invisible
			Renderable.visible[eid] = 0;

			const store = createLineStore('Content');
			registerLineStore(world, eid, store);

			setVirtualViewport(world, eid, {
				totalLineCount: 1,
				visibleLineCount: 1,
			});
			invalidateViewport(world, eid);

			// Run system - should skip this entity
			virtualizedRenderSystem(world);
		});

		it('should skip non-dirty entities', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			const store = createLineStore('Content');
			registerLineStore(world, eid, store);

			setVirtualViewport(world, eid, {
				totalLineCount: 1,
				visibleLineCount: 1,
			});

			// Clear dirty flags
			Renderable.dirty[eid] = 0;
			VirtualViewport.isDirty[eid] = 0;

			// Should skip this entity
			virtualizedRenderSystem(world);
		});

		it('should render with line numbers when enabled', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			const store = createLineStoreFromLines(['Content']);
			registerLineStore(world, eid, store);

			setLineRenderConfig(world, eid, {
				showLineNumbers: true,
				lineNumberWidth: 5,
			});

			setVirtualViewport(world, eid, {
				totalLineCount: 1,
				visibleLineCount: 1,
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// Line number "   1 " should be rendered at start (position 3 has '1')
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 3, 0);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('1');
		});

		it('should render selected line with different colors', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			const store = createLineStoreFromLines(['Line 0', 'Line 1', 'Line 2']);
			registerLineStore(world, eid, store);

			setLineRenderConfig(world, eid, {
				selectedBg: 0x0000ffff, // Blue
			});

			setVirtualViewport(world, eid, {
				totalLineCount: 3,
				visibleLineCount: 3,
				selectedLine: 1,
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// Selected line should have different background
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 0, 1);
			expect(cell).toBeDefined();
			expect(cell?.bg).toBe(0x0000ffff);
		});

		it('should render cursor line with different colors', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			const store = createLineStoreFromLines(['Line 0', 'Line 1', 'Line 2']);
			registerLineStore(world, eid, store);

			setLineRenderConfig(world, eid, {
				cursorBg: 0x00ff00ff, // Green
			});

			setVirtualViewport(world, eid, {
				totalLineCount: 3,
				visibleLineCount: 3,
				cursorLine: 2,
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// Cursor line should have green background
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 0, 2);
			expect(cell).toBeDefined();
			expect(cell?.bg).toBe(0x00ff00ff);
		});

		it('should handle scrolled viewport', () => {
			const db = createDoubleBuffer(40, 5);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 5);

			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);
			registerLineStore(world, eid, store);

			setVirtualViewport(world, eid, {
				totalLineCount: 100,
				visibleLineCount: 5,
				firstVisibleLine: 50, // Start from line 50
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// First visible row should show "Line 50"
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 5, 0);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('5'); // From "Line 50"
		});

		it('should render empty lines for sparse content', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createTestEntity(world, 0, 0, 40, 10);

			// Only 3 lines but viewport shows 10
			const store = createLineStoreFromLines(['A', 'B', 'C']);
			registerLineStore(world, eid, store);

			setVirtualViewport(world, eid, {
				totalLineCount: 3,
				visibleLineCount: 10,
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// Lines beyond content should be empty (space)
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 0, 5);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe(' ');
		});
	});

	// ===========================================================================
	// SCROLLBAR RENDERING
	// ===========================================================================

	describe('scrollbar', () => {
		function createScrollableEntity(
			w: ReturnType<typeof createWorld>,
			totalLines: number,
			visibleLines: number,
		): number {
			const eid = addEntity(w);

			addComponent(w, eid, Position);
			addComponent(w, eid, Renderable);
			addComponent(w, eid, VirtualViewport);
			addComponent(w, eid, ComputedLayout);

			setPosition(w, eid, 0, 0);
			ComputedLayout.x[eid] = 0;
			ComputedLayout.y[eid] = 0;
			ComputedLayout.width[eid] = 40;
			ComputedLayout.height[eid] = visibleLines;
			ComputedLayout.valid[eid] = 1;
			setStyle(w, eid, { fg: 0xffffffff, bg: 0x000000ff });
			setVisible(w, eid, true);
			markDirty(w, eid);

			setVirtualViewport(w, eid, {
				totalLineCount: totalLines,
				visibleLineCount: visibleLines,
				firstVisibleLine: 0,
			});
			invalidateViewport(w, eid);

			return eid;
		}

		it('should render scrollbar when content exceeds viewport', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createScrollableEntity(world, 100, 10);

			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);
			registerLineStore(world, eid, store);

			virtualizedRenderSystem(world);

			// Scrollbar should be rendered on right edge
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 39, 0);
			expect(cell).toBeDefined();
			// Should have a scrollbar character
			expect(['│', '█'].includes(cell?.char ?? '')).toBe(true);
		});

		it('should not render scrollbar when content fits viewport', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = createScrollableEntity(world, 5, 10);

			const lines = Array.from({ length: 5 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);
			registerLineStore(world, eid, store);

			virtualizedRenderSystem(world);

			// Content fits, no scrollbar needed
			// Right edge should have content or background, not scrollbar
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 39, 0);
			expect(cell?.char).toBe(' ');
		});
	});

	// ===========================================================================
	// BORDERS
	// ===========================================================================

	describe('borders', () => {
		it('should respect border when rendering content', () => {
			const db = createDoubleBuffer(40, 10);
			setVirtualizedRenderBuffer(db);

			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Renderable);
			addComponent(world, eid, VirtualViewport);
			addComponent(world, eid, ComputedLayout);
			// Note: Don't add Border manually - let setBorder initialize it

			setPosition(world, eid, 0, 0);
			ComputedLayout.x[eid] = 0;
			ComputedLayout.y[eid] = 0;
			ComputedLayout.width[eid] = 40;
			ComputedLayout.height[eid] = 10;
			ComputedLayout.valid[eid] = 1;
			setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
			setVisible(world, eid, true);
			markDirty(world, eid);

			// Set border - this will add and initialize the Border component
			setBorder(world, eid, { type: BorderType.Line });

			const store = createLineStoreFromLines(['Content']);
			registerLineStore(world, eid, store);

			// Account for border in visible lines (8 instead of 10)
			setVirtualViewport(world, eid, {
				totalLineCount: 1,
				visibleLineCount: 8,
			});
			invalidateViewport(world, eid);

			virtualizedRenderSystem(world);

			// Content should be inside border (at position 1,1)
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 1, 1);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('C'); // Start of "Content"
		});
	});

	// ===========================================================================
	// CLEANUP
	// ===========================================================================

	describe('cleanup', () => {
		it('should clean up all resources', () => {
			const eid = addEntity(world);
			const store = createLineStore('Content');

			registerLineStore(world, eid, store);
			setLineRenderConfig(world, eid, { showLineNumbers: true });

			cleanupVirtualizedRenderSystem(world);

			expect(getLineStore(world, eid)).toBeUndefined();
			expect(getLineRenderConfig(world, eid).showLineNumbers).toBe(false);
		});

		it('should clean up entity resources', () => {
			const eid = addEntity(world);
			const store = createLineStore('Content');

			registerLineStore(world, eid, store);
			setLineRenderConfig(world, eid, { showLineNumbers: true });

			cleanupEntityResources(world, eid);

			expect(getLineStore(world, eid)).toBeUndefined();
			expect(getLineRenderConfig(world, eid).showLineNumbers).toBe(false);
		});
	});

	// ===========================================================================
	// FACTORY
	// ===========================================================================

	describe('factory', () => {
		it('should create render system', () => {
			const system = createVirtualizedRenderSystem();
			expect(system).toBe(virtualizedRenderSystem);
		});
	});

	// ===========================================================================
	// LARGE CONTENT
	// ===========================================================================

	describe('large content', () => {
		it('should handle 10000 lines efficiently', () => {
			const db = createDoubleBuffer(80, 24);
			setVirtualizedRenderBuffer(db);

			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Renderable);
			addComponent(world, eid, VirtualViewport);
			addComponent(world, eid, ComputedLayout);

			setPosition(world, eid, 0, 0);
			ComputedLayout.x[eid] = 0;
			ComputedLayout.y[eid] = 0;
			ComputedLayout.width[eid] = 80;
			ComputedLayout.height[eid] = 24;
			ComputedLayout.valid[eid] = 1;
			setStyle(world, eid, { fg: 0xffffffff, bg: 0x000000ff });
			setVisible(world, eid, true);
			markDirty(world, eid);

			// Create 10000 lines
			const lines = Array.from(
				{ length: 10000 },
				(_, i) => `Line ${i.toString().padStart(5, '0')}`,
			);
			const store = createLineStoreFromLines(lines);
			registerLineStore(world, eid, store);

			setVirtualViewport(world, eid, {
				totalLineCount: 10000,
				visibleLineCount: 24,
				firstVisibleLine: 5000, // Start in the middle
			});
			invalidateViewport(world, eid);

			const start = performance.now();
			virtualizedRenderSystem(world);
			const elapsed = performance.now() - start;

			// Should complete very quickly (< 50ms for sure)
			expect(elapsed).toBeLessThan(50);

			// Verify correct content was rendered
			// "Line 05000" - L(0) i(1) n(2) e(3) space(4) 0(5) 5(6) 0(7) 0(8) 0(9)
			const buffer = getBackBuffer(db);
			const cell = getCell(buffer, 6, 0);
			expect(cell).toBeDefined();
			expect(cell?.char).toBe('5'); // From "Line 05000"
		});
	});
});
