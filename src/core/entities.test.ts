import { createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Border, BorderType } from '../components/border';
import { Content, getContent, resetContentStore } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable, resetFocusState } from '../components/focusable';
import { Hierarchy } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import {
	BoxConfigSchema,
	ButtonConfigSchema,
	createBoxEntity,
	createButtonEntity,
	createInputEntity,
	createListEntity,
	createScreenEntity,
	createTextEntity,
	InputConfigSchema,
	ListConfigSchema,
	ScreenConfigSchema,
	TextConfigSchema,
} from './entities';
import type { World } from './types';

describe('Entity Factories', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetContentStore();
		resetFocusState();
	});

	describe('createBoxEntity', () => {
		it('creates a box with default values', () => {
			const eid = createBoxEntity(world);

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Renderable.visible[eid]).toBe(1);
			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
		});

		it('creates a box with position config', () => {
			const eid = createBoxEntity(world, {
				x: 10,
				y: 20,
				z: 5,
				absolute: true,
			});

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(20);
			expect(Position.z[eid]).toBe(5);
			expect(Position.absolute[eid]).toBe(1);
		});

		it('creates a box with dimension config', () => {
			const eid = createBoxEntity(world, {
				width: 40,
				height: 10,
				minWidth: 20,
				maxWidth: 60,
			});

			expect(Dimensions.width[eid]).toBe(40);
			expect(Dimensions.height[eid]).toBe(10);
			expect(Dimensions.minWidth[eid]).toBe(20);
			expect(Dimensions.maxWidth[eid]).toBe(60);
		});

		it('creates a box with style config', () => {
			const eid = createBoxEntity(world, {
				fg: 0xff0000ff,
				bg: 0x00ff00ff,
				bold: true,
				visible: true,
			});

			expect(Renderable.fg[eid]).toBe(0xff0000ff);
			expect(Renderable.bg[eid]).toBe(0x00ff00ff);
			expect(Renderable.visible[eid]).toBe(1);
		});

		it('creates a box with border config', () => {
			const eid = createBoxEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
			expect(Border.left[eid]).toBe(1);
			expect(Border.right[eid]).toBe(1);
			expect(Border.top[eid]).toBe(1);
			expect(Border.bottom[eid]).toBe(1);
		});

		it('creates a box with padding config', () => {
			const eid = createBoxEntity(world, {
				padding: {
					left: 2,
					right: 2,
					top: 1,
					bottom: 1,
				},
			});

			expect(Padding.left[eid]).toBe(2);
			expect(Padding.right[eid]).toBe(2);
			expect(Padding.top[eid]).toBe(1);
			expect(Padding.bottom[eid]).toBe(1);
		});

		it('creates a box with parent', () => {
			const parent = createBoxEntity(world);
			const child = createBoxEntity(world, { parent });

			expect(Hierarchy.parent[child]).toBe(parent);
		});
	});

	describe('createTextEntity', () => {
		it('creates a text with default values', () => {
			const eid = createTextEntity(world);

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Renderable.visible[eid]).toBe(1);
			expect(Content.align[eid]).toBe(0);
		});

		it('creates a text with content', () => {
			const eid = createTextEntity(world, {
				text: 'Hello, World!',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Hello, World!');
			expect(Content.length[eid]).toBe(13);
		});

		it('creates a text with alignment', () => {
			const eid = createTextEntity(world, {
				text: 'Centered',
				align: 1, // Center
				valign: 1, // Middle
			});

			expect(Content.align[eid]).toBe(1);
			expect(Content.valign[eid]).toBe(1);
		});

		it('creates a text with wrap enabled', () => {
			const eid = createTextEntity(world, {
				text: 'Long text that should wrap',
				wrap: true,
			});

			expect(Content.wrap[eid]).toBe(1);
		});
	});

	describe('createButtonEntity', () => {
		it('creates a button with default interactive properties', () => {
			const eid = createButtonEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a button with label', () => {
			const eid = createButtonEntity(world, {
				label: 'Submit',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Submit');
		});

		it('creates a button with custom interactive options', () => {
			const eid = createButtonEntity(world, {
				clickable: true,
				hoverable: true,
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a button with custom focusable options', () => {
			const eid = createButtonEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a button with border', () => {
			const eid = createButtonEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
			expect(Border.left[eid]).toBe(1);
		});
	});

	describe('createScreenEntity', () => {
		it('creates a screen with required dimensions', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Dimensions.width[eid]).toBe(80);
			expect(Dimensions.height[eid]).toBe(24);
		});

		it('creates a screen as root (no parent)', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.depth[eid]).toBe(0);
		});

		it('creates a screen that is always visible', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Renderable.visible[eid]).toBe(1);
		});

		it('throws for invalid screen config', () => {
			expect(() => {
				createScreenEntity(world, {
					width: -1,
					height: 24,
				});
			}).toThrow();
		});
	});

	describe('createInputEntity', () => {
		it('creates an input with default values', () => {
			const eid = createInputEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates an input with initial value', () => {
			const eid = createInputEntity(world, {
				value: 'Initial text',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Initial text');
		});

		it('creates an input with custom focus colors', () => {
			const eid = createInputEntity(world, {
				focusEffectFg: 0x00ff00ff,
				focusEffectBg: 0x111111ff,
			});

			expect(Focusable.focusEffectFg[eid]).toBe(0x00ff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x111111ff);
		});
	});

	describe('createListEntity', () => {
		it('creates a list with items', () => {
			const eid = createListEntity(world, {
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			const content = getContent(world, eid);
			expect(content).toBe('Item 1\nItem 2\nItem 3');
		});

		it('creates a list with scrollable properties', () => {
			const eid = createListEntity(world, {
				items: ['A', 'B', 'C', 'D', 'E'],
				scrollY: 2,
			});

			expect(Scrollable.scrollY[eid]).toBe(2);
			expect(Scrollable.scrollHeight[eid]).toBe(5);
		});

		it('creates a list that is focusable and keyable', () => {
			const eid = createListEntity(world);

			expect(Focusable.focusable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
		});

		it('creates an empty list', () => {
			const eid = createListEntity(world, {});

			expect(Scrollable.scrollHeight[eid]).toBe(0);
		});
	});

	describe('Config Schemas', () => {
		it('validates BoxConfigSchema', () => {
			const result = BoxConfigSchema.safeParse({
				x: 10,
				y: 20,
				width: 40,
				height: 10,
			});

			expect(result.success).toBe(true);
		});

		it('validates TextConfigSchema with text', () => {
			const result = TextConfigSchema.safeParse({
				text: 'Hello',
				align: 1,
			});

			expect(result.success).toBe(true);
		});

		it('validates ButtonConfigSchema', () => {
			const result = ButtonConfigSchema.safeParse({
				label: 'Click me',
				clickable: true,
				focusable: true,
			});

			expect(result.success).toBe(true);
		});

		it('validates ScreenConfigSchema requires dimensions', () => {
			const validResult = ScreenConfigSchema.safeParse({
				width: 80,
				height: 24,
			});
			expect(validResult.success).toBe(true);

			const invalidResult = ScreenConfigSchema.safeParse({});
			expect(invalidResult.success).toBe(false);
		});

		it('validates InputConfigSchema', () => {
			const result = InputConfigSchema.safeParse({
				value: 'test',
				placeholder: 'Enter text',
				maxLength: 100,
			});

			expect(result.success).toBe(true);
		});

		it('validates ListConfigSchema', () => {
			const result = ListConfigSchema.safeParse({
				items: ['a', 'b', 'c'],
				selectedIndex: 0,
			});

			expect(result.success).toBe(true);
		});
	});

	describe('Entity creation order', () => {
		it('creates entities with sequential IDs', () => {
			const eid1 = createBoxEntity(world);
			const eid2 = createBoxEntity(world);
			const eid3 = createBoxEntity(world);

			expect(eid2).toBe(eid1 + 1);
			expect(eid3).toBe(eid2 + 1);
		});
	});

	describe('Default component values', () => {
		it('marks new entities as dirty', () => {
			const eid = createBoxEntity(world);

			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('sets default colors', () => {
			const eid = createBoxEntity(world);

			expect(Renderable.fg[eid]).toBe(0xffffffff); // White
			expect(Renderable.bg[eid]).toBe(0x000000ff); // Black
		});

		it('initializes hierarchy with no parent', () => {
			const eid = createBoxEntity(world);

			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.firstChild[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.childCount[eid]).toBe(0);
		});
	});
});
