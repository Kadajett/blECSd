/**
 * Tests for the Box widget.
 */

import { addEntity, createWorld, hasComponent } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BorderType, getBorder } from '../components/border';
import { getContent, getContentData, TextAlign, TextVAlign } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { Focusable, isFocused, resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPadding } from '../components/padding';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import type { World } from '../core/types';
import {
	BoxConfigSchema,
	createBox,
	getBoxContent,
	isBox,
	resetBoxStore,
	setBoxContent,
} from './box';

describe('Box widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetBoxStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('BoxConfigSchema', () => {
		it('validates empty config', () => {
			const result = BoxConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = BoxConfigSchema.safeParse({
				left: 10,
				top: 20,
				right: 30,
				bottom: 40,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = BoxConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates keyword position values', () => {
			const result = BoxConfigSchema.safeParse({
				left: 'center',
				top: 'top',
			});
			expect(result.success).toBe(true);
		});

		it('validates dimension values', () => {
			const result = BoxConfigSchema.safeParse({
				width: 80,
				height: 24,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage dimensions', () => {
			const result = BoxConfigSchema.safeParse({
				width: '50%',
				height: '100%',
			});
			expect(result.success).toBe(true);
		});

		it('validates auto dimensions', () => {
			const result = BoxConfigSchema.safeParse({
				width: 'auto',
				height: 'auto',
			});
			expect(result.success).toBe(true);
		});

		it('validates color as hex string', () => {
			const result = BoxConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('validates color as number', () => {
			const result = BoxConfigSchema.safeParse({
				fg: 0xff0000ff,
				bg: 0x00ff00ff,
			});
			expect(result.success).toBe(true);
		});

		it('validates border config', () => {
			const result = BoxConfigSchema.safeParse({
				border: {
					type: 'line',
					fg: '#ffffff',
					ch: 'single',
				},
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as number', () => {
			const result = BoxConfigSchema.safeParse({
				padding: 2,
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as object', () => {
			const result = BoxConfigSchema.safeParse({
				padding: {
					left: 1,
					top: 2,
					right: 1,
					bottom: 2,
				},
			});
			expect(result.success).toBe(true);
		});

		it('validates content and alignment', () => {
			const result = BoxConfigSchema.safeParse({
				content: 'Hello, World!',
				align: 'center',
				valign: 'middle',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid position values', () => {
			const result = BoxConfigSchema.safeParse({
				left: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid dimension values', () => {
			const result = BoxConfigSchema.safeParse({
				width: 'invalid',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createBox', () => {
		it('creates a box with default values', () => {
			const eid = addEntity(world);
			const box = createBox(world, eid);

			expect(box.eid).toBe(eid);
			expect(isBox(world, eid)).toBe(true);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, { width: 80, height: 24 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(80);
			expect(dims?.height).toBe(24);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('sets border from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, {
				border: { type: 'line', fg: '#ffffff' },
			});

			const border = getBorder(world, eid);
			expect(border).toBeDefined();
			expect(border?.type).toBe(BorderType.Line);
			expect(border?.fg).toBe(hexToColor('#ffffff'));
		});

		it('sets padding from number config', () => {
			const eid = addEntity(world);
			createBox(world, eid, { padding: 2 });

			const padding = getPadding(world, eid);
			expect(padding).toBeDefined();
			expect(padding?.left).toBe(2);
			expect(padding?.top).toBe(2);
			expect(padding?.right).toBe(2);
			expect(padding?.bottom).toBe(2);
		});

		it('sets padding from object config', () => {
			const eid = addEntity(world);
			createBox(world, eid, {
				padding: { left: 1, top: 2, right: 3, bottom: 4 },
			});

			const padding = getPadding(world, eid);
			expect(padding).toBeDefined();
			expect(padding?.left).toBe(1);
			expect(padding?.top).toBe(2);
			expect(padding?.right).toBe(3);
			expect(padding?.bottom).toBe(4);
		});

		it('sets content from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, { content: 'Hello, World!' });

			const content = getContent(world, eid);
			expect(content).toBe('Hello, World!');
		});

		it('sets content alignment from config', () => {
			const eid = addEntity(world);
			createBox(world, eid, {
				content: 'Test',
				align: 'center',
				valign: 'middle',
			});

			const contentData = getContentData(world, eid);
			expect(contentData).toBeDefined();
			expect(contentData?.align).toBe(TextAlign.Center);
			expect(contentData?.valign).toBe(TextVAlign.Middle);
		});

		it('makes box focusable by default', () => {
			const eid = addEntity(world);
			createBox(world, eid);

			expect(hasComponent(world, eid, Focusable)).toBe(true);
		});
	});

	describe('BoxWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the box visible', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the box invisible', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				const result = box.show();
				expect(result).toBe(box);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid, { left: 10, top: 20 });

				box.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				const result = box.move(1, 1);
				expect(result).toBe(box);
			});
		});

		describe('content', () => {
			it('setContent() updates box content', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.setContent('New content');

				expect(getContent(world, eid)).toBe('New content');
			});

			it('getContent() returns current content', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid, { content: 'Initial' });

				expect(box.getContent()).toBe('Initial');
			});

			it('setContent() returns widget for chaining', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				const result = box.setContent('Test');
				expect(result).toBe(box);
			});
		});

		describe('focus', () => {
			it('focus() focuses the box', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.focus();

				expect(isFocused(world, eid)).toBe(true);
			});

			it('blur() removes focus from the box', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				box.focus().blur();

				expect(isFocused(world, eid)).toBe(false);
			});

			it('isFocused() returns focus state', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				expect(box.isFocused()).toBe(false);
				box.focus();
				expect(box.isFocused()).toBe(true);
			});

			it('focus() returns widget for chaining', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				const result = box.focus();
				expect(result).toBe(box);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const box = createBox(world, parentEid);

				box.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const box = createBox(world, parentEid);

				box.append(child1).append(child2);

				const children = box.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});

			it('append() returns widget for chaining', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const box = createBox(world, parentEid);

				const result = box.append(childEid);
				expect(result).toBe(box);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the box marker', () => {
				const eid = addEntity(world);
				const box = createBox(world, eid);

				expect(isBox(world, eid)).toBe(true);
				box.destroy();
				expect(isBox(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('setBoxContent', () => {
			it('sets content of a box entity', () => {
				const eid = addEntity(world);
				createBox(world, eid);

				setBoxContent(world, eid, 'Updated content');

				expect(getContent(world, eid)).toBe('Updated content');
			});

			it('returns entity ID for chaining', () => {
				const eid = addEntity(world);
				createBox(world, eid);

				const result = setBoxContent(world, eid, 'Test');
				expect(result).toBe(eid);
			});
		});

		describe('getBoxContent', () => {
			it('gets content of a box entity', () => {
				const eid = addEntity(world);
				createBox(world, eid, { content: 'Box content' });

				expect(getBoxContent(world, eid)).toBe('Box content');
			});

			it('returns empty string for no content', () => {
				const eid = addEntity(world);
				createBox(world, eid);

				expect(getBoxContent(world, eid)).toBe('');
			});
		});

		describe('isBox', () => {
			it('returns true for box entities', () => {
				const eid = addEntity(world);
				createBox(world, eid);

				expect(isBox(world, eid)).toBe(true);
			});

			it('returns false for non-box entities', () => {
				const eid = addEntity(world);

				expect(isBox(world, eid)).toBe(false);
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const box = createBox(world, eid, { left: 0, top: 0 });

			box.setPosition(10, 10).move(5, 5).setContent('Chained!').focus().show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(box.getContent()).toBe('Chained!');
			expect(box.isFocused()).toBe(true);
		});
	});
});
