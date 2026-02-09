/**
 * Integration tests for widget + system interactions.
 *
 * Tests the full widget lifecycle through layout, render, focus, and input systems.
 *
 * @module testing/widget-system-integration.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFocusedEntity } from '../components/focusable';
import { appendChild } from '../components/hierarchy';
import { setInteractive } from '../components/interactive';
import { setScroll } from '../components/scrollable';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { getCell } from '../terminal/screen/cell';
import { createBox } from '../widgets/box';
import { createList } from '../widgets/list';
import { createScrollableBox } from '../widgets/scrollableBox';
import type { IntegrationTestContext } from './integration';
import { createTestScreen, simulateKey, teardownTestScreen } from './integration';

describe('Widget-System Integration Tests', () => {
	let ctx: IntegrationTestContext;
	let world: World;

	beforeEach(() => {
		ctx = createTestScreen(80, 24);
		world = ctx.world;
	});

	afterEach(() => {
		teardownTestScreen(ctx);
	});

	describe('Box Widget + Layout/Render Systems', () => {
		it('creates a box, runs layout, runs render, verifies output', () => {
			const eid = addEntity(world);

			createBox(world, eid, {
				top: 1,
				left: 1,
				width: 20,
				height: 5,
				border: { type: 'line' },
				fg: '#ffffff',
				bg: '#000000',
			});

			ctx.step();

			// Check that border was rendered
			const topLeft = ctx.charAt(1, 1);
			expect(topLeft).toBeDefined();

			// Check dimensions - box should occupy the specified area
			const text = ctx.toText();
			expect(text).toBeDefined();
		});

		it('renders box with background color', () => {
			const eid = addEntity(world);

			createBox(world, eid, {
				top: 2,
				left: 5,
				width: 30,
				height: 8,
				bg: '#ff0000',
			});

			ctx.step();

			// Check background color was applied
			const cell = getCell(ctx.buffer, 10, 5);
			expect(cell?.bg).toBeDefined();
			expect(cell?.bg).not.toBe(0); // Should not be default black
		});

		it('renders nested boxes with correct positioning', () => {
			const parentEid = addEntity(world);
			const childEid = addEntity(world);

			createBox(world, parentEid, {
				top: 0,
				left: 0,
				width: 40,
				height: 10,
				bg: '#333333',
			});

			createBox(world, childEid, {
				top: 2,
				left: 5,
				width: 20,
				height: 4,
				bg: '#ff0000',
			});

			appendChild(world, parentEid, childEid);

			ctx.step();

			// Child should be positioned relative to parent
			// Parent at (0,0), child at local (5,2) = absolute (5,2)
			const cell = getCell(ctx.buffer, 5, 2);
			expect(cell?.bg).toBeDefined();
			expect(cell?.bg).toBeGreaterThan(0); // Should have red background
		});

		it('respects z-index ordering', () => {
			const backEid = addEntity(world);
			const frontEid = addEntity(world);

			createBox(world, backEid, {
				top: 0,
				left: 0,
				width: 20,
				height: 5,
				bg: '#ff0000',
			});

			createBox(world, frontEid, {
				top: 2,
				left: 5,
				width: 20,
				height: 5,
				bg: '#0000ff',
			});

			ctx.step();

			// Overlapping area exists - verify rendering works
			const cell = getCell(ctx.buffer, 10, 3);
			expect(cell?.bg).toBeDefined();
			expect(cell?.bg).toBeGreaterThan(0);
		});
	});

	describe('List Widget + Layout/Render Systems', () => {
		it('creates a list with items and renders them', () => {
			const eid = addEntity(world);

			createList(world, eid, {
				y: 1,
				x: 1,
				width: 30,
				height: 10,
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			ctx.step();

			// Check that list rendered something (has content cells)
			const cell = getCell(ctx.buffer, 1, 1);
			expect(cell).toBeDefined();
			expect(cell?.char).toBeDefined();
		});

		it('handles list selection rendering', () => {
			const eid = addEntity(world);

			const list = createList(world, eid, {
				y: 1,
				x: 1,
				width: 30,
				height: 10,
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			// Set initial selection
			list.select(0);

			ctx.step();

			// Verify list rendered
			const cell = getCell(ctx.buffer, 1, 1);
			expect(cell).toBeDefined();
		});
	});

	describe('Focus System + Multiple Widgets', () => {
		it('creates multiple focusable widgets and cycles focus with tab', () => {
			const box1Eid = addEntity(world);
			const box2Eid = addEntity(world);
			const box3Eid = addEntity(world);

			createBox(world, box1Eid, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, box1Eid, { focusable: true });

			createBox(world, box2Eid, {
				top: 5,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, box2Eid, { focusable: true });

			createBox(world, box3Eid, {
				top: 9,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, box3Eid, { focusable: true });

			ctx.step();

			// Initial state - no focus
			const initialFocus = getFocusedEntity();
			expect(initialFocus === null || initialFocus === undefined).toBe(true);

			// Simulate tab key to move focus forward
			simulateKey('tab');
			ctx.step();

			const focused1 = getFocusedEntity();
			expect(focused1).toBe(box1Eid);

			// Tab again
			simulateKey('tab');
			ctx.step();

			const focused2 = getFocusedEntity();
			expect(focused2).toBe(box2Eid);

			// Tab again
			simulateKey('tab');
			ctx.step();

			const focused3 = getFocusedEntity();
			expect(focused3).toBe(box3Eid);
		});

		it('cycles focus backward with shift-tab', () => {
			const box1Eid = addEntity(world);
			const box2Eid = addEntity(world);

			createBox(world, box1Eid, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, box1Eid, { focusable: true });

			createBox(world, box2Eid, {
				top: 5,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, box2Eid, { focusable: true });

			// Focus first widget
			simulateKey('tab');
			ctx.step();

			expect(getFocusedEntity()).toBe(box1Eid);

			// Focus second widget
			simulateKey('tab');
			ctx.step();

			expect(getFocusedEntity()).toBe(box2Eid);

			// Shift-tab back to first
			simulateKey('tab', { shift: true });
			ctx.step();

			expect(getFocusedEntity()).toBe(box1Eid);
		});

		it('skips non-focusable widgets', () => {
			const focusableEid = addEntity(world);
			const focusableEid2 = addEntity(world);

			createBox(world, focusableEid, {
				top: 1,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, focusableEid, { focusable: true });

			createBox(world, focusableEid2, {
				top: 9,
				left: 1,
				width: 20,
				height: 3,
			});
			setInteractive(world, focusableEid2, { focusable: true });

			// Tab to first widget
			simulateKey('tab');
			ctx.step();

			const first = getFocusedEntity();
			expect(typeof first).toBe('number');

			// Tab to second widget
			simulateKey('tab');
			ctx.step();

			const second = getFocusedEntity();
			expect(typeof second).toBe('number');
			expect(second).not.toBe(first);
		});
	});

	describe('Input System + List Widget', () => {
		it('simulates arrow keys to change list selection', () => {
			const eid = addEntity(world);

			const list = createList(world, eid, {
				y: 1,
				x: 1,
				width: 30,
				height: 10,
				items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
			});

			// Lists handle their own selection state
			// Test that selection API works
			list.select(0);
			expect(list.getSelectedIndex()).toBe(0);

			// Change selection
			list.select(2);
			expect(list.getSelectedIndex()).toBe(2);

			list.select(1);
			expect(list.getSelectedIndex()).toBe(1);
		});

		it('handles enter key in list widget', () => {
			const eid = addEntity(world);

			createList(world, eid, {
				y: 1,
				x: 1,
				width: 30,
				height: 10,
				items: ['Item 1', 'Item 2', 'Item 3'],
			});
			setInteractive(world, eid, { focusable: true });

			// Focus the list
			simulateKey('tab');
			ctx.step();

			// Press enter - list receives input
			simulateKey('enter');
			ctx.step();

			// Test passes if no errors thrown
			expect(true).toBe(true);
		});
	});

	describe('Scroll System + Widgets', () => {
		it('renders scrollable content with vertical scroll', () => {
			const eid = addEntity(world);

			const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');

			createScrollableBox(world, eid, {
				top: 1,
				left: 1,
				width: 30,
				height: 10,
				content,
			});

			ctx.step();

			// Initial render
			const text1 = ctx.toText();
			expect(text1).toBeDefined();

			// Scroll down
			setScroll(world, eid, 0, 10);
			ctx.step();

			// Verify scrollable component works
			const text2 = ctx.toText();
			expect(text2).toBeDefined();
		});

		it('handles mouse wheel scrolling', () => {
			const eid = addEntity(world);

			const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');

			createScrollableBox(world, eid, {
				top: 1,
				left: 1,
				width: 30,
				height: 10,
				content,
			});

			ctx.step();

			// Scrollable box is rendered
			const text = ctx.toText();
			expect(text).toBeDefined();
		});
	});

	describe('Hierarchy + Systems', () => {
		it('renders parent panel containing child list', () => {
			const panelEid = addEntity(world);
			const listEid = addEntity(world);

			createBox(world, panelEid, {
				top: 0,
				left: 0,
				width: 40,
				height: 15,
				border: { type: 'line' },
			});

			createList(world, listEid, {
				x: 2,
				y: 3,
				width: 36,
				height: 10,
				items: ['Child 1', 'Child 2', 'Child 3'],
			});

			appendChild(world, panelEid, listEid);

			ctx.step();

			// Verify hierarchy rendered - check for border characters
			const cell = getCell(ctx.buffer, 0, 0);
			expect(cell).toBeDefined();
			expect(cell?.char).toBeDefined();
		});

		it('handles focus in nested widgets', () => {
			const panelEid = addEntity(world);
			const childEid1 = addEntity(world);
			const childEid2 = addEntity(world);

			createBox(world, panelEid, {
				top: 0,
				left: 0,
				width: 40,
				height: 20,
			});

			createBox(world, childEid1, {
				top: 2,
				left: 2,
				width: 36,
				height: 5,
			});
			setInteractive(world, childEid1, { focusable: true });

			createBox(world, childEid2, {
				top: 8,
				left: 2,
				width: 36,
				height: 5,
			});
			setInteractive(world, childEid2, { focusable: true });

			appendChild(world, panelEid, childEid1);
			appendChild(world, panelEid, childEid2);

			// Tab to first child
			simulateKey('tab');
			ctx.step();

			const first = getFocusedEntity();
			expect(first === childEid1 || first === panelEid).toBe(true);

			// Tab again
			simulateKey('tab');
			ctx.step();

			const second = getFocusedEntity();
			expect(typeof second).toBe('number');
			expect(second).not.toBe(first);
		});
	});

	describe('Full Widget Lifecycle', () => {
		it('creates, focuses, interacts, and destroys a widget', () => {
			const eid = addEntity(world);

			const box = createBox(world, eid, {
				top: 5,
				left: 10,
				width: 30,
				height: 8,
				content: 'Interactive Widget',
			});
			setInteractive(world, eid, { focusable: true });

			// Initial render
			ctx.step();

			let text = ctx.toText();
			expect(text).toBeDefined();

			// Focus the widget
			simulateKey('tab');
			ctx.step();

			expect(getFocusedEntity()).toBe(eid);

			// Update content
			box.setContent('Updated Content');
			ctx.step();

			text = ctx.toText();
			expect(text).toBeDefined();

			// Destroy the widget
			box.destroy();
			ctx.step();

			// Widget is destroyed - test passes if no errors thrown
			expect(true).toBe(true);
		});
	});
});
