/**
 * Tests for SplitPane widget.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDimensions, setDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createSharedTextBuffer,
	createSplitPane,
	getDividerRenderInfo,
	getSplitDirection,
	hitTestDivider,
	isSplitPane,
	resetSplitPaneStore,
	SplitPaneConfigSchema,
} from './splitPane';

describe('SplitPane', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetSplitPaneStore();
	});

	afterEach(() => {
		resetFocusState();
		resetSplitPaneStore();
	});

	// =========================================================================
	// Schema validation
	// =========================================================================

	describe('SplitPaneConfigSchema', () => {
		it('validates empty config', () => {
			const result = SplitPaneConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates full config', () => {
			const result = SplitPaneConfigSchema.safeParse({
				left: 10,
				top: 5,
				width: 120,
				height: 40,
				direction: 'horizontal',
				ratios: [0.5, 0.5],
				minPaneSize: 5,
				dividerSize: 1,
				resizable: true,
				fg: '#ffffff',
				bg: '#000000',
				dividerFg: '#888888',
				dividerBg: '#333333',
				dividerChar: '│',
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage dimensions', () => {
			const result = SplitPaneConfigSchema.safeParse({
				width: '100%',
				height: '50%',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid direction', () => {
			const result = SplitPaneConfigSchema.safeParse({
				direction: 'diagonal',
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative ratios', () => {
			const result = SplitPaneConfigSchema.safeParse({
				ratios: [-0.5, 1.5],
			});
			expect(result.success).toBe(false);
		});

		it('rejects ratios above 1', () => {
			const result = SplitPaneConfigSchema.safeParse({
				ratios: [0.5, 1.5],
			});
			expect(result.success).toBe(false);
		});
	});

	// =========================================================================
	// Factory
	// =========================================================================

	describe('createSplitPane', () => {
		it('creates a split pane with default config', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid);
			expect(split.eid).toBe(eid);
			expect(isSplitPane(world, eid)).toBe(true);
		});

		it('creates a horizontal split', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				direction: 'horizontal',
				width: 80,
				height: 24,
			});
			expect(split.getDirection()).toBe('horizontal');
		});

		it('creates a vertical split', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				direction: 'vertical',
				width: 80,
				height: 24,
			});
			expect(split.getDirection()).toBe('vertical');
		});

		it('defaults to horizontal direction', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid);
			expect(split.getDirection()).toBe('horizontal');
		});

		it('supports method chaining', () => {
			const eid = addEntity(world);
			const result = createSplitPane(world, eid, { width: 80, height: 24 })
				.setPosition(10, 5)
				.show();
			expect(result.eid).toBe(eid);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, { left: 10, top: 5 });
			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, { width: 120, height: 40 });
			const dims = getDimensions(world, eid);
			expect(dims?.width).toBe(120);
			expect(dims?.height).toBe(40);
		});
	});

	// =========================================================================
	// Panes
	// =========================================================================

	describe('pane management', () => {
		it('starts with zero panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			expect(split.getPaneCount()).toBe(0);
		});

		it('adds panes via append', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });

			const p1 = addEntity(world);
			const p2 = addEntity(world);
			split.append(p1).append(p2);

			expect(split.getPaneCount()).toBe(2);
		});

		it('computes viewports for two horizontal panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			});

			const p1 = addEntity(world);
			const p2 = addEntity(world);
			split.append(p1).append(p2);

			const viewports = split.getAllPaneViewports();
			expect(viewports.length).toBe(2);

			// 81 - 1 divider = 80 available, 50/50 = 40 each
			expect(viewports[0]?.width).toBe(40);
			expect(viewports[1]?.width).toBe(40);
			expect(viewports[0]?.height).toBe(24);
			expect(viewports[1]?.height).toBe(24);

			// First pane starts at x=0, second at x=41 (after divider)
			expect(viewports[0]?.x).toBe(0);
			expect(viewports[1]?.x).toBe(41);
		});

		it('computes viewports for two vertical panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 80,
				height: 25,
				direction: 'vertical',
				dividerSize: 1,
			});

			const p1 = addEntity(world);
			const p2 = addEntity(world);
			split.append(p1).append(p2);

			const viewports = split.getAllPaneViewports();
			expect(viewports.length).toBe(2);

			// 25 - 1 = 24 available, 50/50 = 12 each
			expect(viewports[0]?.height).toBe(12);
			expect(viewports[1]?.height).toBe(12);
			expect(viewports[0]?.width).toBe(80);
			expect(viewports[1]?.width).toBe(80);

			expect(viewports[0]?.y).toBe(0);
			expect(viewports[1]?.y).toBe(13);
		});

		it('computes viewports for four horizontal panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 83,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			});

			const panes = [addEntity(world), addEntity(world), addEntity(world), addEntity(world)];
			for (const p of panes) split.append(p);

			const viewports = split.getAllPaneViewports();
			expect(viewports.length).toBe(4);

			// 83 - 3 dividers = 80 available, 25% each = 20
			expect(viewports[0]?.width).toBe(20);
			expect(viewports[1]?.width).toBe(20);
			expect(viewports[2]?.width).toBe(20);
			expect(viewports[3]?.width).toBe(20);
		});

		it('applies custom ratios', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 101,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
				ratios: [0.3, 0.7],
			});

			const p1 = addEntity(world);
			const p2 = addEntity(world);
			split.append(p1).append(p2);

			const viewports = split.getAllPaneViewports();
			// 101 - 1 = 100 available, 30/70 = 30 and 70
			expect(viewports[0]?.width).toBe(30);
			expect(viewports[1]?.width).toBe(70);
		});

		it('updates child entity positions and dimensions', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			});

			const p1 = addEntity(world);
			const p2 = addEntity(world);
			split.append(p1).append(p2);

			const pos1 = getPosition(world, p1);
			const dims1 = getDimensions(world, p1);
			expect(pos1?.x).toBe(0);
			expect(dims1?.width).toBe(40);

			const pos2 = getPosition(world, p2);
			const dims2 = getDimensions(world, p2);
			expect(pos2?.x).toBe(41);
			expect(dims2?.width).toBe(40);
		});
	});

	// =========================================================================
	// Ratios
	// =========================================================================

	describe('ratio management', () => {
		it('gets default equal ratios', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const ratios = split.getRatios();
			expect(ratios.length).toBe(2);
			expect(ratios[0]).toBeCloseTo(0.5);
			expect(ratios[1]).toBeCloseTo(0.5);
		});

		it('sets custom ratios', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			split.setRatios([0.3, 0.7]);
			const ratios = split.getRatios();
			expect(ratios[0]).toBeCloseTo(0.3);
			expect(ratios[1]).toBeCloseTo(0.7);
		});

		it('normalizes ratios that do not sum to 1', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			split.setRatios([1, 3]);
			const ratios = split.getRatios();
			expect(ratios[0]).toBeCloseTo(0.25);
			expect(ratios[1]).toBeCloseTo(0.75);
		});

		it('rejects ratios with wrong count', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			split.setRatios([0.33, 0.33, 0.34]); // 3 ratios for 2 panes
			const ratios = split.getRatios();
			// Should remain at default
			expect(ratios.length).toBe(2);
			expect(ratios[0]).toBeCloseTo(0.5);
		});
	});

	// =========================================================================
	// Independent scrolling
	// =========================================================================

	describe('independent scrolling', () => {
		it('starts with zero scroll', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const scroll = split.getPaneScroll(0);
			expect(scroll?.scrollX).toBe(0);
			expect(scroll?.scrollY).toBe(0);
		});

		it('scrolls panes independently', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 200, 1000);
			split.setPaneContentSize(1, 200, 2000);

			split.scrollPane(0, 0, 100);
			split.scrollPane(1, 0, 500);

			expect(split.getPaneScroll(0)?.scrollY).toBe(100);
			expect(split.getPaneScroll(1)?.scrollY).toBe(500);
		});

		it('clamps scroll to content bounds', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 80, 100);

			split.scrollPane(0, 0, 999);
			const scroll = split.getPaneScroll(0);
			// max scroll = 100 - 24 = 76
			expect(scroll?.scrollY).toBe(76);
		});

		it('clamps scroll to zero on negative', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			split.scrollPane(0, 0, -10);
			expect(split.getPaneScroll(0)?.scrollY).toBe(0);
		});

		it('sets absolute scroll position', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 200, 1000);

			split.setPaneScroll(0, 10, 50);
			const scroll = split.getPaneScroll(0);
			expect(scroll?.scrollX).toBe(10);
			expect(scroll?.scrollY).toBe(50);
		});

		it('returns undefined scroll for invalid index', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			expect(split.getPaneScroll(99)).toBeUndefined();
		});
	});

	// =========================================================================
	// Shared buffers
	// =========================================================================

	describe('shared text buffers', () => {
		it('creates a shared buffer', () => {
			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`);
			const buffer = createSharedTextBuffer('test-buf', lines);
			expect(buffer.id).toBe('test-buf');
			expect(buffer.lines.length).toBe(100);
			expect(buffer.refCount).toBe(0);
		});

		it('attaches a buffer to a pane', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world));

			const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`);
			const buffer = createSharedTextBuffer('buf1', lines);

			split.attachBuffer(0, buffer);
			expect(split.getBuffer(0)).toBe(buffer);
			expect(buffer.refCount).toBe(1);
		});

		it('shares buffer between panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i}`);
			const buffer = createSharedTextBuffer('shared', lines);

			split.attachBuffer(0, buffer);
			split.attachBuffer(1, buffer);

			expect(buffer.refCount).toBe(2);
			// Same buffer reference
			expect(split.getBuffer(0)).toBe(split.getBuffer(1));
		});

		it('detaches buffer decrements refcount', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const buffer = createSharedTextBuffer('buf2', ['line']);
			split.attachBuffer(0, buffer);
			split.attachBuffer(1, buffer);
			expect(buffer.refCount).toBe(2);

			split.detachBuffer(0);
			expect(buffer.refCount).toBe(1);
			expect(split.getBuffer(0)).toBeUndefined();
			expect(split.getBuffer(1)).toBe(buffer);
		});

		it('sets content height from buffer on attach', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world));

			const lines = Array.from({ length: 500 }, (_, i) => `Line ${i}`);
			const buffer = createSharedTextBuffer('buf3', lines);
			split.attachBuffer(0, buffer);

			const scroll = split.getPaneScroll(0);
			expect(scroll?.contentHeight).toBe(500);
		});
	});

	// =========================================================================
	// Divider dragging
	// =========================================================================

	describe('divider dragging', () => {
		it('begins and ends drag', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 80,
				height: 24,
				resizable: true,
			});
			split.append(addEntity(world)).append(addEntity(world));

			expect(split.isDragging()).toBe(false);
			split.beginDrag(0, 40);
			expect(split.isDragging()).toBe(true);
			split.endDrag(0);
			expect(split.isDragging()).toBe(false);
		});

		it('updates ratios on drag', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
				minPaneSize: 3,
			});
			split.append(addEntity(world)).append(addEntity(world));

			split.beginDrag(0, 40);
			const event = split.updateDrag(0, 50);

			expect(event).toBeDefined();
			expect(event?.ratios.length).toBe(2);
			// Should have shifted right
			expect(event?.ratios[0]).toBeGreaterThan(0.5);
			expect(event?.ratios[1]).toBeLessThan(0.5);
		});

		it('respects minimum pane size', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
				minPaneSize: 10,
			});
			split.append(addEntity(world)).append(addEntity(world));

			split.beginDrag(0, 40);
			// Try to push all the way right
			const event = split.updateDrag(0, 200);

			expect(event).toBeDefined();
			// Second pane should not go below min size
			const vp1 = split.getPaneViewport(1);
			expect(vp1?.width).toBeGreaterThanOrEqual(10);
		});

		it('does not drag when resizable is false', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 80,
				height: 24,
				resizable: false,
			});
			split.append(addEntity(world)).append(addEntity(world));

			split.beginDrag(0, 40);
			expect(split.isDragging()).toBe(false);
		});

		it('produces dirty rects on drag', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 80,
				height: 24,
			});
			split.append(addEntity(world)).append(addEntity(world));
			split.flushDirty();

			split.beginDrag(0, 40);
			const event = split.updateDrag(0, 50);

			expect(event?.dirtyRects.length).toBeGreaterThan(0);
			expect(split.getDirtyRects().length).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// Dirty tracking
	// =========================================================================

	describe('dirty tracking', () => {
		it('marks pane as dirty on scroll', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 200, 1000);
			split.flushDirty();

			split.scrollPane(0, 0, 10);
			const rects = split.getDirtyRects();
			expect(rects.length).toBeGreaterThan(0);
		});

		it('flushes dirty state', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 200, 1000);

			split.scrollPane(0, 0, 10);
			expect(split.getDirtyRects().length).toBeGreaterThan(0);

			split.flushDirty();
			expect(split.getDirtyRects().length).toBe(0);
		});

		it('marks specific pane dirty', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.flushDirty();

			split.markPaneDirty(1);
			const rects = split.getDirtyRects();
			expect(rects.length).toBe(1);
		});
	});

	// =========================================================================
	// Hit testing
	// =========================================================================

	describe('hitTestDivider', () => {
		it('returns -1 for non-split-pane entity', () => {
			const eid = addEntity(world);
			expect(hitTestDivider(world, eid, 40, 12)).toBe(-1);
		});

		it('detects horizontal divider hit', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			});
			split.append(addEntity(world)).append(addEntity(world));

			// First pane is 40 wide, divider at x=40
			expect(hitTestDivider(world, eid, 40, 12)).toBe(0);
		});

		it('returns -1 for position inside a pane', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			})
				.append(addEntity(world))
				.append(addEntity(world));

			expect(hitTestDivider(world, eid, 20, 12)).toBe(-1);
		});

		it('detects vertical divider hit', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, {
				width: 80,
				height: 25,
				direction: 'vertical',
				dividerSize: 1,
			})
				.append(addEntity(world))
				.append(addEntity(world));

			// First pane is 12 tall, divider at y=12
			expect(hitTestDivider(world, eid, 40, 12)).toBe(0);
		});
	});

	// =========================================================================
	// Divider render info
	// =========================================================================

	describe('getDividerRenderInfo', () => {
		it('returns empty for non-split-pane', () => {
			const eid = addEntity(world);
			expect(getDividerRenderInfo(world, eid).length).toBe(0);
		});

		it('returns divider info for horizontal split', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, {
				width: 81,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
				dividerChar: '|',
			})
				.append(addEntity(world))
				.append(addEntity(world));

			const info = getDividerRenderInfo(world, eid);
			expect(info.length).toBe(1);
			expect(info[0]?.x).toBe(40);
			expect(info[0]?.width).toBe(1);
			expect(info[0]?.height).toBe(24);
			expect(info[0]?.char).toBe('|');
		});

		it('returns multiple dividers for 3+ panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 82,
				height: 24,
				direction: 'horizontal',
				dividerSize: 1,
			});
			split.append(addEntity(world)).append(addEntity(world)).append(addEntity(world));

			const info = getDividerRenderInfo(world, eid);
			expect(info.length).toBe(2);
		});
	});

	// =========================================================================
	// Utility functions
	// =========================================================================

	describe('utility functions', () => {
		it('isSplitPane identifies split panes', () => {
			const splitEid = addEntity(world);
			createSplitPane(world, splitEid);

			const otherEid = addEntity(world);
			expect(isSplitPane(world, splitEid)).toBe(true);
			expect(isSplitPane(world, otherEid)).toBe(false);
		});

		it('getSplitDirection returns direction', () => {
			const eid = addEntity(world);
			createSplitPane(world, eid, { direction: 'vertical' });
			expect(getSplitDirection(world, eid)).toBe('vertical');
		});
	});

	// =========================================================================
	// Focus
	// =========================================================================

	describe('focus management', () => {
		it('supports focus and blur', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid);
			expect(split.isFocused()).toBe(false);

			split.focus();
			expect(split.isFocused()).toBe(true);

			split.blur();
			expect(split.isFocused()).toBe(false);
		});
	});

	// =========================================================================
	// Visibility
	// =========================================================================

	describe('visibility', () => {
		it('supports show and hide chaining', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid);
			const result = split.hide().show();
			expect(result.eid).toBe(eid);
		});
	});

	// =========================================================================
	// Recalculate
	// =========================================================================

	describe('recalculate', () => {
		it('recalculates viewports after dimension change', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 81,
				height: 24,
				dividerSize: 1,
			});
			split.append(addEntity(world)).append(addEntity(world));

			const before = split.getPaneViewport(0)?.width;

			// Change dimensions and recalculate
			setDimensions(world, eid, 161, 24);
			split.recalculate();

			const after = split.getPaneViewport(0)?.width;
			expect(after).toBeGreaterThan(before ?? 0);
		});
	});

	// =========================================================================
	// Destroy
	// =========================================================================

	describe('destroy', () => {
		it('cleans up all state', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const buffer = createSharedTextBuffer('destroy-buf', ['line']);
			split.attachBuffer(0, buffer);
			expect(buffer.refCount).toBe(1);

			split.destroy();
			expect(isSplitPane(world, eid)).toBe(false);
			expect(buffer.refCount).toBe(0);
		});
	});

	// =========================================================================
	// Performance characteristics
	// =========================================================================

	describe('performance', () => {
		it('handles 4 panes efficiently', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, {
				width: 240,
				height: 60,
				direction: 'horizontal',
				dividerSize: 1,
			});

			for (let i = 0; i < 4; i++) {
				split.append(addEntity(world));
				split.setPaneContentSize(i, 240, 100000);
			}

			// All 4 panes should have viewports
			const viewports = split.getAllPaneViewports();
			expect(viewports.length).toBe(4);
			for (const vp of viewports) {
				expect(vp.width).toBeGreaterThan(0);
				expect(vp.height).toBe(60);
			}

			// Should be able to scroll each independently
			for (let i = 0; i < 4; i++) {
				split.scrollPane(i, 0, i * 1000);
			}

			expect(split.getPaneScroll(0)?.scrollY).toBe(0);
			expect(split.getPaneScroll(1)?.scrollY).toBe(1000);
			expect(split.getPaneScroll(2)?.scrollY).toBe(2000);
			expect(split.getPaneScroll(3)?.scrollY).toBe(3000);
		});

		it('shared buffers reduce memory', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));

			const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i}`);
			const buffer = createSharedTextBuffer('perf-buf', lines);

			// Same buffer, two panes - only one copy of lines
			split.attachBuffer(0, buffer);
			split.attachBuffer(1, buffer);

			expect(buffer.refCount).toBe(2);
			expect(split.getBuffer(0)?.lines).toBe(split.getBuffer(1)?.lines);
		});

		it('dirty rects are localized to changed panes', () => {
			const eid = addEntity(world);
			const split = createSplitPane(world, eid, { width: 80, height: 24 });
			split.append(addEntity(world)).append(addEntity(world));
			split.setPaneContentSize(0, 200, 1000);
			split.flushDirty();

			// Only scroll pane 0
			split.scrollPane(0, 0, 10);
			const rects = split.getDirtyRects();

			// Only the first pane's viewport should be dirty
			expect(rects.length).toBe(1);
			const vp0 = split.getPaneViewport(0);
			expect(rects[0]?.x).toBe(vp0?.x);
			expect(rects[0]?.width).toBe(vp0?.width);
		});
	});
});
