/**
 * Tests for the Text widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getContent, getContentData, TextAlign, TextVAlign } from '../components/content';
import { getDimensions, shouldShrink } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createText,
	getTextContent,
	isText,
	resetTextStore,
	setTextContent,
	TextConfigSchema,
} from './text';

describe('Text widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetTextStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('TextConfigSchema', () => {
		it('validates empty config', () => {
			const result = TextConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = TextConfigSchema.safeParse({
				left: 10,
				top: 20,
				right: 30,
				bottom: 40,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = TextConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates keyword position values', () => {
			const result = TextConfigSchema.safeParse({
				left: 'center',
				top: 'top',
			});
			expect(result.success).toBe(true);
		});

		it('validates dimension values', () => {
			const result = TextConfigSchema.safeParse({
				width: 80,
				height: 24,
			});
			expect(result.success).toBe(true);
		});

		it('validates auto dimensions', () => {
			const result = TextConfigSchema.safeParse({
				width: 'auto',
				height: 'auto',
			});
			expect(result.success).toBe(true);
		});

		it('validates color as hex string', () => {
			const result = TextConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('validates color as number', () => {
			const result = TextConfigSchema.safeParse({
				fg: 0xff0000ff,
				bg: 0x00ff00ff,
			});
			expect(result.success).toBe(true);
		});

		it('validates content and alignment', () => {
			const result = TextConfigSchema.safeParse({
				content: 'Hello, World!',
				align: 'center',
				valign: 'middle',
			});
			expect(result.success).toBe(true);
		});

		it('validates shrink option', () => {
			const result = TextConfigSchema.safeParse({
				shrink: true,
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid position values', () => {
			const result = TextConfigSchema.safeParse({
				left: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid dimension values', () => {
			const result = TextConfigSchema.safeParse({
				width: 'invalid',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createText', () => {
		it('creates a text with default values', () => {
			const eid = addEntity(world);
			const text = createText(world, eid);

			expect(text.eid).toBe(eid);
			expect(isText(world, eid)).toBe(true);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createText(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createText(world, eid, { width: 80, height: 24 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(80);
			expect(dims?.height).toBe(24);
		});

		it('enables shrink by default', () => {
			const eid = addEntity(world);
			createText(world, eid);

			expect(shouldShrink(world, eid)).toBe(true);
		});

		it('respects shrink: false config', () => {
			const eid = addEntity(world);
			createText(world, eid, { shrink: false });

			expect(shouldShrink(world, eid)).toBe(false);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createText(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('sets content from config', () => {
			const eid = addEntity(world);
			createText(world, eid, { content: 'Hello, World!' });

			const content = getContent(world, eid);
			expect(content).toBe('Hello, World!');
		});

		it('sets content alignment from config', () => {
			const eid = addEntity(world);
			createText(world, eid, {
				content: 'Test',
				align: 'center',
				valign: 'middle',
			});

			const contentData = getContentData(world, eid);
			expect(contentData).toBeDefined();
			expect(contentData?.align).toBe(TextAlign.Center);
			expect(contentData?.valign).toBe(TextVAlign.Middle);
		});
	});

	describe('TextWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the text visible', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the text invisible', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				const result = text.show();
				expect(result).toBe(text);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const text = createText(world, eid, { left: 10, top: 20 });

				text.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				const result = text.move(1, 1);
				expect(result).toBe(text);
			});
		});

		describe('content', () => {
			it('setContent() updates text content', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.setContent('New content');

				expect(getContent(world, eid)).toBe('New content');
			});

			it('getContent() returns current content', () => {
				const eid = addEntity(world);
				const text = createText(world, eid, { content: 'Initial' });

				expect(text.getContent()).toBe('Initial');
			});

			it('setContent() returns widget for chaining', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				const result = text.setContent('Test');
				expect(result).toBe(text);
			});
		});

		describe('focus', () => {
			it('focus() focuses the text', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.focus();

				expect(text.isFocused()).toBe(true);
			});

			it('blur() removes focus from the text', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				text.focus().blur();

				expect(text.isFocused()).toBe(false);
			});

			it('isFocused() returns focus state', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				expect(text.isFocused()).toBe(false);
				text.focus();
				expect(text.isFocused()).toBe(true);
			});

			it('focus() returns widget for chaining', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				const result = text.focus();
				expect(result).toBe(text);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const text = createText(world, parentEid);

				text.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const text = createText(world, parentEid);

				text.append(child1).append(child2);

				const children = text.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});

			it('append() returns widget for chaining', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const text = createText(world, parentEid);

				const result = text.append(childEid);
				expect(result).toBe(text);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the text marker', () => {
				const eid = addEntity(world);
				const text = createText(world, eid);

				expect(isText(world, eid)).toBe(true);
				text.destroy();
				expect(isText(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('setTextContent', () => {
			it('sets content of a text entity', () => {
				const eid = addEntity(world);
				createText(world, eid);

				setTextContent(world, eid, 'Updated content');

				expect(getContent(world, eid)).toBe('Updated content');
			});

			it('returns entity ID for chaining', () => {
				const eid = addEntity(world);
				createText(world, eid);

				const result = setTextContent(world, eid, 'Test');
				expect(result).toBe(eid);
			});
		});

		describe('getTextContent', () => {
			it('gets content of a text entity', () => {
				const eid = addEntity(world);
				createText(world, eid, { content: 'Text content' });

				expect(getTextContent(world, eid)).toBe('Text content');
			});

			it('returns empty string for no content', () => {
				const eid = addEntity(world);
				createText(world, eid);

				expect(getTextContent(world, eid)).toBe('');
			});
		});

		describe('isText', () => {
			it('returns true for text entities', () => {
				const eid = addEntity(world);
				createText(world, eid);

				expect(isText(world, eid)).toBe(true);
			});

			it('returns false for non-text entities', () => {
				const eid = addEntity(world);

				expect(isText(world, eid)).toBe(false);
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const text = createText(world, eid, { left: 0, top: 0 });

			text.setPosition(10, 10).move(5, 5).setContent('Chained!').focus().show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(text.getContent()).toBe('Chained!');
			expect(text.isFocused()).toBe(true);
		});
	});

	describe('shrink behavior', () => {
		it('shrinks to content by default', () => {
			const eid = addEntity(world);
			createText(world, eid, { content: 'Short' });

			expect(shouldShrink(world, eid)).toBe(true);
		});

		it('handles multi-line text', () => {
			const eid = addEntity(world);
			const text = createText(world, eid, {
				content: 'Line 1\nLine 2\nLine 3',
			});

			expect(text.getContent()).toBe('Line 1\nLine 2\nLine 3');
			expect(shouldShrink(world, eid)).toBe(true);
		});
	});
});
