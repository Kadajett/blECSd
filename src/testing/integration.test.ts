import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { getFocusedEntity } from '../components/focusable';
import { appendChild } from '../components/hierarchy';
import { isFocused } from '../components/focusable';
import { isHovered } from '../systems/interactiveSystem';
import { setPosition, setZIndex } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { focusEntity, focusNext, focusPrev, getFocused } from '../systems/focusSystem';
import { renderText } from '../systems/renderSystem';
import { getCell } from '../terminal/screen/cell';
import type { IntegrationTestContext } from './integration';
import {
	createInteractiveEntity,
	createTestScreen,
	simulateClick,
	simulateKey,
	simulateMouse,
	teardownTestScreen,
} from './integration';

describe('Integration Tests', () => {
	let ctx: IntegrationTestContext;
	let world: World;

	beforeEach(() => {
		ctx = createTestScreen(40, 12);
		world = ctx.world;
	});

	afterEach(() => {
		teardownTestScreen(ctx);
	});

	describe('Rendering Integration', () => {
		it('creates and renders a widget through full pipeline', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 20, 5);
			setStyle(world, eid, { bg: '#ff0000' });

			ctx.step();

			// Buffer should have content
			const text = ctx.toText();
			expect(text).toBeDefined();
		});

		it('renders multiple entities with z-ordering', () => {
			const back = addEntity(world);
			setPosition(world, back, 0, 0);
			setDimensions(world, back, 20, 5);
			setStyle(world, back, { bg: '#ff0000' });
			setZIndex(world, back, 0);

			const front = addEntity(world);
			setPosition(world, front, 5, 1);
			setDimensions(world, front, 20, 5);
			setStyle(world, front, { bg: '#0000ff' });
			setZIndex(world, front, 10);

			ctx.step();

			// Overlapping area should be rendered (front on top)
			const buffer = ctx.buffer;
			const cell = getCell(buffer, 10, 2);
			expect(cell?.bg).toBe(0xff0000ff); // blue in ARGB
		});

		it('renders nested entities at computed positions', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 5, 2);
			setDimensions(world, parent, 30, 8);
			setStyle(world, parent, { bg: '#333333' });

			const child = addEntity(world);
			setPosition(world, child, 3, 1);
			setDimensions(world, child, 10, 3);
			setStyle(world, child, { bg: '#ff0000' });
			appendChild(world, parent, child);

			ctx.step();

			// Child absolute position: parent(5,2) + local(3,1) = (8,3)
			const buffer = ctx.buffer;
			const cell = getCell(buffer, 8, 3);
			expect(cell?.bg).toBe(0xffff0000); // red in ARGB
		});

		it('renders text via direct buffer write', () => {
			const buffer = ctx.buffer;
			renderText(buffer, 5, 3, 'Integration Test', 0xffffffff, 0x000000ff);

			expect(ctx.rowText(3)).toContain('Integration Test');
			expect(ctx.charAt(5, 3)).toBe('I');
			expect(ctx.charAt(20, 3)).toBe('t');
		});
	});

	describe('Input Integration', () => {
		it('processes key events through the system', () => {
			const eid = createInteractiveEntity(ctx, 0, 0, 20, 5);

			focusEntity(world, eid);
			simulateKey('a');
			ctx.step();

			// Entity should still be focused after key input
			expect(getFocused(world)).toBe(eid);
		});

		it('processes mouse events through the system', () => {
			const eid = createInteractiveEntity(ctx, 10, 5, 15, 3);

			ctx.step(); // layout first

			simulateClick(15, 6); // click inside the entity
			ctx.step();

			// After clicking an interactive entity, it should get focus (via legacy path)
			expect(getFocusedEntity()).toBe(eid);
		});

		it('handles tab navigation between focusable entities', () => {
			const e1 = createInteractiveEntity(ctx, 0, 0, 10, 3);
			createInteractiveEntity(ctx, 15, 0, 10, 3);
			createInteractiveEntity(ctx, 0, 5, 10, 3);

			ctx.step();

			// Focus first entity
			focusEntity(world, e1);
			expect(getFocused(world)).toBe(e1);

			// Tab to next
			const next = focusNext(world);
			expect(next).not.toBeNull();
			expect(isFocused(world, e1)).toBe(false);
		});

		it('handles reverse tab navigation', () => {
			createInteractiveEntity(ctx, 0, 0, 10, 3);
			const e2 = createInteractiveEntity(ctx, 15, 0, 10, 3);

			ctx.step();

			// Focus second entity
			focusEntity(world, e2);
			expect(getFocused(world)).toBe(e2);

			// Shift+tab to previous
			const prev = focusPrev(world);
			expect(prev).not.toBeNull();
		});

		it('handles mouse hover simulation', () => {
			const eid = createInteractiveEntity(ctx, 10, 5, 15, 3);

			ctx.step();

			simulateMouse(15, 6, 'unknown', 'move');
			ctx.step();

			// Entity should be hovered
			expect(isHovered(world, eid)).toBe(true);
		});
	});

	describe('Widget Lifecycle', () => {
		it('creates entity with all components', () => {
			const eid = createInteractiveEntity(ctx, 5, 2, 20, 5, {
				focusable: true,
				bg: '#ff0000',
				zIndex: 10,
			});

			ctx.step();

			// Entity should be renderable and focusable
			expect(eid).toBeGreaterThan(0);
		});

		it('handles parent-child hierarchy', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 0, 0);
			setDimensions(world, parent, 40, 12);
			setStyle(world, parent, { bg: '#333333' });

			const child1 = createInteractiveEntity(ctx, 2, 1, 15, 3, {
				parentEid: parent,
				bg: '#ff0000',
			});
			const child2 = createInteractiveEntity(ctx, 2, 5, 15, 3, {
				parentEid: parent,
				bg: '#0000ff',
			});

			ctx.step();

			// Both children should exist and be focusable
			focusEntity(world, child1);
			expect(getFocused(world)).toBe(child1);

			focusEntity(world, child2);
			expect(getFocused(world)).toBe(child2);
		});
	});

	describe('Focus Navigation', () => {
		it('cycles focus through all focusable entities', () => {
			const entities: number[] = [];
			for (let i = 0; i < 4; i++) {
				entities.push(createInteractiveEntity(ctx, i * 10, 0, 8, 3));
			}

			ctx.step();

			// Focus first
			focusEntity(world, entities[0]!);
			expect(getFocused(world)).toBe(entities[0]);

			// Step through each
			for (let i = 1; i < entities.length; i++) {
				focusNext(world);
			}

			// Should have cycled through
			const current = getFocused(world);
			expect(current).not.toBeNull();
		});

		it('focus click changes focus target', () => {
			const e1 = createInteractiveEntity(ctx, 0, 0, 10, 3);
			const e2 = createInteractiveEntity(ctx, 20, 0, 10, 3);

			ctx.step();

			// Focus first by clicking
			simulateClick(5, 1);
			ctx.step();
			expect(getFocusedEntity()).toBe(e1);

			// Focus second by clicking
			simulateClick(25, 1);
			ctx.step();
			expect(getFocusedEntity()).toBe(e2);
		});
	});

	describe('Full Pipeline', () => {
		it('runs create -> render -> input -> re-render cycle', () => {
			// Create entities
			const eid = createInteractiveEntity(ctx, 5, 2, 20, 5, { bg: '#ff0000' });

			// First render
			ctx.step();

			// Simulate input
			simulateClick(15, 4);
			ctx.step();

			// After click, entity should be focused (via legacy focus path)
			expect(getFocusedEntity()).toBe(eid);

			// Second render should still work
			const secondRender = ctx.toText();
			expect(secondRender).toBeDefined();
		});

		it('handles rapid input sequences', () => {
			const eid = createInteractiveEntity(ctx, 0, 0, 30, 10);

			ctx.step();
			focusEntity(world, eid);

			// Queue multiple keys
			simulateKey('h');
			simulateKey('e');
			simulateKey('l');
			simulateKey('l');
			simulateKey('o');

			ctx.step();

			// All events should have been processed
			expect(getFocused(world)).toBe(eid);
		});
	});
});
