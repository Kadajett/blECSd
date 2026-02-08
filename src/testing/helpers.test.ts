/**
 * Tests for test helper utilities.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Border } from '../components/border';
import { Content } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable } from '../components/focusable';
import { Hierarchy } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { hasScreen } from '../components/screen';
import { Scrollable } from '../components/scrollable';
import { hasComponent } from '../core/ecs';
import type { World } from '../core/types';
import { getZIndex } from '../core/zOrder';
import {
	createClickableEntity,
	createHoverableEntity,
	createRenderableEntity,
	createTestEntity,
	createTestScreen,
	createTestWorld,
} from './helpers';

describe('Test Helpers', () => {
	let world: World;

	beforeEach(() => {
		world = createTestWorld();
	});

	describe('createTestWorld', () => {
		it('creates a valid ECS world', () => {
			const testWorld = createTestWorld();
			expect(testWorld).toBeDefined();
			expect(typeof testWorld).toBe('object');
		});

		it('creates independent worlds', () => {
			const world1 = createTestWorld();
			const world2 = createTestWorld();
			expect(world1).not.toBe(world2);
		});
	});

	describe('createTestEntity', () => {
		it('creates entity with no config', () => {
			const eid = createTestEntity(world);
			expect(eid).toBeGreaterThanOrEqual(0);
		});

		it('creates entity with position', () => {
			const eid = createTestEntity(world, { x: 10, y: 5, z: 2 });

			expect(hasComponent(world, eid, Position)).toBe(true);
			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(5);
			expect(getZIndex(world, eid)).toBe(2);
		});

		it('creates entity with dimensions', () => {
			const eid = createTestEntity(world, { width: 20, height: 15 });

			expect(hasComponent(world, eid, Dimensions)).toBe(true);
			expect(Dimensions.width[eid]).toBe(20);
			expect(Dimensions.height[eid]).toBe(15);
		});

		it('creates entity with style', () => {
			const eid = createTestEntity(world, {
				style: { fg: 0xff0000, bg: 0x00ff00, bold: true },
			});

			expect(hasComponent(world, eid, Renderable)).toBe(true);
			expect(Renderable.fg[eid]).toBe(0xff0000);
			expect(Renderable.bg[eid]).toBe(0x00ff00);
			expect(Renderable.bold[eid]).toBe(1);
		});

		it('creates entity with visibility flags', () => {
			const visible = createTestEntity(world, { visible: true, style: {} });
			const hidden = createTestEntity(world, { visible: false, style: {} });

			expect(Renderable.visible[visible]).toBe(1);
			expect(Renderable.visible[hidden]).toBe(0);
		});

		it('creates entity with dirty flag', () => {
			const dirty = createTestEntity(world, { dirty: true, style: {} });
			const clean = createTestEntity(world, { dirty: false, style: {} });

			expect(Renderable.dirty[dirty]).toBe(1);
			expect(Renderable.dirty[clean]).toBe(0);
		});

		it('creates entity with content', () => {
			const eid = createTestEntity(world, { content: 'Hello, World!' });

			expect(hasComponent(world, eid, Content)).toBe(true);
		});

		it('creates clickable entity', () => {
			const eid = createTestEntity(world, { clickable: true });

			expect(hasComponent(world, eid, Interactive)).toBe(true);
			expect(Interactive.clickable[eid]).toBe(1);
		});

		it('creates hoverable entity', () => {
			const eid = createTestEntity(world, { hoverable: true });

			expect(hasComponent(world, eid, Interactive)).toBe(true);
			expect(Interactive.hoverable[eid]).toBe(1);
		});

		it('creates focusable entity', () => {
			const eid = createTestEntity(world, { focusable: true });

			expect(hasComponent(world, eid, Focusable)).toBe(true);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates scrollable entity', () => {
			const eid = createTestEntity(world, { scrollable: true });

			expect(hasComponent(world, eid, Scrollable)).toBe(true);
		});

		it('creates entity with border', () => {
			const eid = createTestEntity(world, { border: true });

			expect(hasComponent(world, eid, Border)).toBe(true);
		});

		it('creates entity with padding', () => {
			const eid = createTestEntity(world, { padding: true });

			expect(hasComponent(world, eid, Padding)).toBe(true);
		});

		it('creates entity with hierarchy', () => {
			const eid = createTestEntity(world, { hierarchy: true });

			expect(hasComponent(world, eid, Hierarchy)).toBe(true);
		});

		it('creates complex entity with multiple components', () => {
			const eid = createTestEntity(world, {
				x: 10,
				y: 5,
				z: 3,
				width: 30,
				height: 20,
				content: 'Button',
				style: { fg: 0xffffff, bg: 0x0000ff },
				clickable: true,
				focusable: true,
				border: true,
				padding: true,
			});

			expect(hasComponent(world, eid, Position)).toBe(true);
			expect(hasComponent(world, eid, Dimensions)).toBe(true);
			expect(hasComponent(world, eid, Content)).toBe(true);
			expect(hasComponent(world, eid, Renderable)).toBe(true);
			expect(hasComponent(world, eid, Interactive)).toBe(true);
			expect(hasComponent(world, eid, Focusable)).toBe(true);
			expect(hasComponent(world, eid, Border)).toBe(true);
			expect(hasComponent(world, eid, Padding)).toBe(true);
		});
	});

	describe('createRenderableEntity', () => {
		it('creates renderable with default values', () => {
			const eid = createRenderableEntity(world);

			expect(hasComponent(world, eid, Position)).toBe(true);
			expect(hasComponent(world, eid, Dimensions)).toBe(true);
			expect(hasComponent(world, eid, Renderable)).toBe(true);
			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Dimensions.width[eid]).toBe(10);
			expect(Dimensions.height[eid]).toBe(10);
			expect(Renderable.visible[eid]).toBe(1);
			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('creates renderable with custom position and size', () => {
			const eid = createRenderableEntity(world, 15, 25, 30, 40);

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(25);
			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(40);
		});

		it('creates visible and dirty entity', () => {
			const eid = createRenderableEntity(world);

			expect(Renderable.visible[eid]).toBe(1);
			expect(Renderable.dirty[eid]).toBe(1);
		});
	});

	describe('createClickableEntity', () => {
		it('creates clickable entity with default z-index', () => {
			const eid = createClickableEntity(world, 10, 20, 30, 40);

			expect(hasComponent(world, eid, Position)).toBe(true);
			expect(hasComponent(world, eid, Dimensions)).toBe(true);
			expect(hasComponent(world, eid, Interactive)).toBe(true);
			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(20);
			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(40);
			expect(Interactive.clickable[eid]).toBe(1);
			expect(getZIndex(world, eid)).toBe(0);
		});

		it('creates clickable entity with custom z-index', () => {
			const eid = createClickableEntity(world, 0, 0, 10, 10, 50);

			expect(getZIndex(world, eid)).toBe(50);
		});
	});

	describe('createHoverableEntity', () => {
		it('creates hoverable entity with default z-index', () => {
			const eid = createHoverableEntity(world, 5, 10, 15, 20);

			expect(hasComponent(world, eid, Position)).toBe(true);
			expect(hasComponent(world, eid, Dimensions)).toBe(true);
			expect(hasComponent(world, eid, Interactive)).toBe(true);
			expect(Position.x[eid]).toBe(5);
			expect(Position.y[eid]).toBe(10);
			expect(Dimensions.width[eid]).toBe(15);
			expect(Dimensions.height[eid]).toBe(20);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(getZIndex(world, eid)).toBe(0);
		});

		it('creates hoverable entity with custom z-index', () => {
			const eid = createHoverableEntity(world, 0, 0, 10, 10, 25);

			expect(getZIndex(world, eid)).toBe(25);
		});
	});

	describe('createTestScreen', () => {
		it('creates screen with default dimensions', () => {
			const screen = createTestScreen(world);

			expect(hasScreen(world, screen)).toBe(true);
		});

		it('creates screen with custom dimensions', () => {
			const screen = createTestScreen(world, { width: 120, height: 40 });

			expect(hasScreen(world, screen)).toBe(true);
		});

		it('throws when creating second screen', () => {
			createTestScreen(world);

			expect(() => createTestScreen(world)).toThrow('A screen already exists');
		});
	});

	describe('helper integration', () => {
		it('can be used together in complex test scenarios', () => {
			const screen = createTestScreen(world, { width: 100, height: 50 });

			const background = createRenderableEntity(world, 0, 0, 100, 50);

			const button1 = createClickableEntity(world, 10, 10, 20, 5, 1);
			const button2 = createClickableEntity(world, 40, 10, 20, 5, 1);

			const dialog = createTestEntity(world, {
				x: 20,
				y: 15,
				width: 60,
				height: 30,
				z: 10,
				border: true,
				padding: true,
				style: { bg: 0x222222 },
			});

			expect(hasScreen(world, screen)).toBe(true);
			expect(hasComponent(world, background, Renderable)).toBe(true);
			expect(Interactive.clickable[button1]).toBe(1);
			expect(Interactive.clickable[button2]).toBe(1);
			expect(hasComponent(world, dialog, Border)).toBe(true);
			expect(getZIndex(world, dialog)).toBe(10);
		});
	});
});
