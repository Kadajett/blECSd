/**
 * Tests for the Line widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createLine,
	DEFAULT_HORIZONTAL_CHAR,
	DEFAULT_LINE_LENGTH,
	DEFAULT_VERTICAL_CHAR,
	getLineChar,
	getLineOrientation,
	isLine,
	LineConfigSchema,
	resetLineStore,
	setLineChar,
} from './line';

describe('Line widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetLineStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('LineConfigSchema', () => {
		it('validates empty config', () => {
			const result = LineConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = LineConfigSchema.safeParse({
				left: 10,
				top: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = LineConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates horizontal orientation', () => {
			const result = LineConfigSchema.safeParse({
				orientation: 'horizontal',
			});
			expect(result.success).toBe(true);
		});

		it('validates vertical orientation', () => {
			const result = LineConfigSchema.safeParse({
				orientation: 'vertical',
			});
			expect(result.success).toBe(true);
		});

		it('validates length', () => {
			const result = LineConfigSchema.safeParse({
				length: 80,
			});
			expect(result.success).toBe(true);
		});

		it('validates char option', () => {
			const result = LineConfigSchema.safeParse({
				char: '═',
			});
			expect(result.success).toBe(true);
		});

		it('validates colors', () => {
			const result = LineConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid orientation', () => {
			const result = LineConfigSchema.safeParse({
				orientation: 'diagonal',
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative length', () => {
			const result = LineConfigSchema.safeParse({
				length: -5,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createLine', () => {
		it('creates a line with default values', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid);

			expect(line.eid).toBe(eid);
			expect(isLine(world, eid)).toBe(true);
		});

		it('defaults to horizontal orientation', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid);

			expect(line.getOrientation()).toBe('horizontal');
		});

		it('defaults to horizontal character for horizontal lines', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid, { orientation: 'horizontal' });

			expect(line.getChar()).toBe(DEFAULT_HORIZONTAL_CHAR);
		});

		it('defaults to vertical character for vertical lines', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid, { orientation: 'vertical' });

			expect(line.getChar()).toBe(DEFAULT_VERTICAL_CHAR);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createLine(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions for horizontal line', () => {
			const eid = addEntity(world);
			createLine(world, eid, { orientation: 'horizontal', length: 50 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(50);
			expect(dims?.height).toBe(1);
		});

		it('sets dimensions for vertical line', () => {
			const eid = addEntity(world);
			createLine(world, eid, { orientation: 'vertical', length: 30 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(1);
			expect(dims?.height).toBe(30);
		});

		it('uses default length when not specified', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid);

			expect(line.getLength()).toBe(DEFAULT_LINE_LENGTH);
		});

		it('sets custom character from config', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid, { char: '═' });

			expect(line.getChar()).toBe('═');
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createLine(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});
	});

	describe('LineWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the line visible', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				line.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the line invisible', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				line.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				const result = line.show();
				expect(result).toBe(line);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid, { left: 10, top: 20 });

				line.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				line.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				const result = line.move(1, 1);
				expect(result).toBe(line);
			});
		});

		describe('line-specific methods', () => {
			it('setChar() updates the line character', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				line.setChar('═');

				expect(line.getChar()).toBe('═');
			});

			it('setChar() returns widget for chaining', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				const result = line.setChar('║');
				expect(result).toBe(line);
			});

			it('getOrientation() returns correct orientation', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);

				const hLine = createLine(world, eid1, { orientation: 'horizontal' });
				const vLine = createLine(world, eid2, { orientation: 'vertical' });

				expect(hLine.getOrientation()).toBe('horizontal');
				expect(vLine.getOrientation()).toBe('vertical');
			});

			it('setLength() updates the line length', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid, { orientation: 'horizontal', length: 10 });

				line.setLength(50);

				expect(line.getLength()).toBe(50);
				const dims = getDimensions(world, eid);
				expect(dims?.width).toBe(50);
				expect(dims?.height).toBe(1);
			});

			it('setLength() updates dimensions for vertical lines', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid, { orientation: 'vertical', length: 10 });

				line.setLength(30);

				expect(line.getLength()).toBe(30);
				const dims = getDimensions(world, eid);
				expect(dims?.width).toBe(1);
				expect(dims?.height).toBe(30);
			});

			it('setLength() returns widget for chaining', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				const result = line.setLength(100);
				expect(result).toBe(line);
			});
		});

		describe('focus', () => {
			it('lines are not focusable by default', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				// Lines are decorative and not focusable by default
				line.focus();
				expect(line.isFocused()).toBe(false);
			});

			it('isFocused() returns false by default', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				expect(line.isFocused()).toBe(false);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const line = createLine(world, parentEid);

				line.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const line = createLine(world, parentEid);

				line.append(child1).append(child2);

				const children = line.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the line marker', () => {
				const eid = addEntity(world);
				const line = createLine(world, eid);

				expect(isLine(world, eid)).toBe(true);
				line.destroy();
				expect(isLine(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('isLine', () => {
			it('returns true for line entities', () => {
				const eid = addEntity(world);
				createLine(world, eid);

				expect(isLine(world, eid)).toBe(true);
			});

			it('returns false for non-line entities', () => {
				const eid = addEntity(world);

				expect(isLine(world, eid)).toBe(false);
			});
		});

		describe('getLineChar', () => {
			it('returns the line character', () => {
				const eid = addEntity(world);
				createLine(world, eid, { char: '═' });

				expect(getLineChar(world, eid)).toBe('═');
			});
		});

		describe('setLineChar', () => {
			it('sets the line character', () => {
				const eid = addEntity(world);
				createLine(world, eid);

				setLineChar(world, eid, '║');

				expect(getLineChar(world, eid)).toBe('║');
			});

			it('returns entity ID for chaining', () => {
				const eid = addEntity(world);
				createLine(world, eid);

				const result = setLineChar(world, eid, '║');
				expect(result).toBe(eid);
			});
		});

		describe('getLineOrientation', () => {
			it('returns the line orientation', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);
				createLine(world, eid1, { orientation: 'horizontal' });
				createLine(world, eid2, { orientation: 'vertical' });

				expect(getLineOrientation(world, eid1)).toBe('horizontal');
				expect(getLineOrientation(world, eid2)).toBe('vertical');
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const line = createLine(world, eid, { left: 0, top: 0 });

			line.setPosition(10, 10).move(5, 5).setChar('═').setLength(40).show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(line.getChar()).toBe('═');
			expect(line.getLength()).toBe(40);
		});
	});
});
