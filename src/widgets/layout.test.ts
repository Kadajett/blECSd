/**
 * Tests for the Layout widget.
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import type { World } from '../core/types';
import {
	calculateFlexLayout,
	calculateGridLayout,
	calculateInlineLayout,
	createLayout,
	getLayoutMode,
	isLayout,
	Layout,
	LayoutConfigSchema,
	resetLayoutStore,
	type ChildLayoutData,
} from './layout';

describe('Layout widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetLayoutStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('LayoutConfigSchema', () => {
		it('validates empty config', () => {
			const result = LayoutConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = LayoutConfigSchema.safeParse({
				left: 10,
				top: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = LayoutConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates inline layout mode', () => {
			const result = LayoutConfigSchema.safeParse({
				layout: 'inline',
			});
			expect(result.success).toBe(true);
		});

		it('validates grid layout mode', () => {
			const result = LayoutConfigSchema.safeParse({
				layout: 'grid',
				cols: 3,
			});
			expect(result.success).toBe(true);
		});

		it('validates flex layout mode', () => {
			const result = LayoutConfigSchema.safeParse({
				layout: 'flex',
				direction: 'row',
				justify: 'center',
				align: 'center',
			});
			expect(result.success).toBe(true);
		});

		it('validates gap option', () => {
			const result = LayoutConfigSchema.safeParse({
				gap: 2,
			});
			expect(result.success).toBe(true);
		});

		it('validates wrap option', () => {
			const result = LayoutConfigSchema.safeParse({
				wrap: true,
			});
			expect(result.success).toBe(true);
		});

		it('validates colors', () => {
			const result = LayoutConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid layout mode', () => {
			const result = LayoutConfigSchema.safeParse({
				layout: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative gap', () => {
			const result = LayoutConfigSchema.safeParse({
				gap: -5,
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-positive cols', () => {
			const result = LayoutConfigSchema.safeParse({
				cols: 0,
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid justify value', () => {
			const result = LayoutConfigSchema.safeParse({
				justify: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid align value', () => {
			const result = LayoutConfigSchema.safeParse({
				align: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid direction value', () => {
			const result = LayoutConfigSchema.safeParse({
				direction: 'diagonal',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createLayout', () => {
		it('creates a layout with default values', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid);

			expect(layout.eid).toBe(eid);
			expect(isLayout(world, eid)).toBe(true);
		});

		it('defaults to inline layout mode', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid);

			expect(layout.getLayoutMode()).toBe('inline');
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createLayout(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets layout mode from config', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			const inline = createLayout(world, eid1, { layout: 'inline' });
			const grid = createLayout(world, eid2, { layout: 'grid' });
			const flex = createLayout(world, eid3, { layout: 'flex' });

			expect(inline.getLayoutMode()).toBe('inline');
			expect(grid.getLayoutMode()).toBe('grid');
			expect(flex.getLayoutMode()).toBe('flex');
		});

		it('sets gap from config', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid, { gap: 5 });

			expect(layout.getGap()).toBe(5);
		});

		it('defaults gap to 0', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid);

			expect(layout.getGap()).toBe(0);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createLayout(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('stores grid cols in component', () => {
			const eid = addEntity(world);
			createLayout(world, eid, { layout: 'grid', cols: 4 });

			expect(Layout.cols[eid]).toBe(4);
		});

		it('stores flex direction in component', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			createLayout(world, eid1, { layout: 'flex', direction: 'row' });
			createLayout(world, eid2, { layout: 'flex', direction: 'column' });

			expect(Layout.direction[eid1]).toBe(0); // row
			expect(Layout.direction[eid2]).toBe(1); // column
		});

		it('stores wrap setting in component', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			createLayout(world, eid1, { wrap: true });
			createLayout(world, eid2, { wrap: false });

			expect(Layout.wrap[eid1]).toBe(1);
			expect(Layout.wrap[eid2]).toBe(0);
		});
	});

	describe('LayoutWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the layout visible', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				layout.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the layout invisible', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				layout.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				const result = layout.show();
				expect(result).toBe(layout);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid, { left: 10, top: 20 });

				layout.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				layout.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				const result = layout.move(1, 1);
				expect(result).toBe(layout);
			});
		});

		describe('layout-specific methods', () => {
			it('getLayoutMode() returns correct mode', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);
				const eid3 = addEntity(world);

				const inline = createLayout(world, eid1, { layout: 'inline' });
				const grid = createLayout(world, eid2, { layout: 'grid' });
				const flex = createLayout(world, eid3, { layout: 'flex' });

				expect(inline.getLayoutMode()).toBe('inline');
				expect(grid.getLayoutMode()).toBe('grid');
				expect(flex.getLayoutMode()).toBe('flex');
			});

			it('setGap() updates the gap', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid, { gap: 1 });

				layout.setGap(5);

				expect(layout.getGap()).toBe(5);
			});

			it('setGap() returns widget for chaining', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				const result = layout.setGap(3);
				expect(result).toBe(layout);
			});
		});

		describe('focus', () => {
			it('focus() focuses the layout', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				layout.focus();
				expect(layout.isFocused()).toBe(true);
			});

			it('blur() unfocuses the layout', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				layout.focus();
				layout.blur();
				expect(layout.isFocused()).toBe(false);
			});

			it('isFocused() returns false by default', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				expect(layout.isFocused()).toBe(false);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const layout = createLayout(world, parentEid);

				layout.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const layout = createLayout(world, parentEid);

				layout.append(child1).append(child2);

				const children = layout.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the layout marker', () => {
				const eid = addEntity(world);
				const layout = createLayout(world, eid);

				expect(isLayout(world, eid)).toBe(true);
				layout.destroy();
				expect(isLayout(world, eid)).toBe(false);
			});
		});
	});

	describe('layout calculations', () => {
		describe('calculateInlineLayout', () => {
			it('positions children in a row', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
				];

				const positions = calculateInlineLayout(children, 80, 0, true);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
				expect(positions.get(3 as number)).toEqual({ x: 20, y: 0 });
			});

			it('applies gap between children', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateInlineLayout(children, 80, 2, true);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 12, y: 0 }); // 10 + 2 gap
			});

			it('wraps children when exceeding container width', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 30, height: 5 },
					{ eid: 2 as number, width: 30, height: 5 },
					{ eid: 3 as number, width: 30, height: 5 },
				];

				const positions = calculateInlineLayout(children, 50, 0, true);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 0, y: 5 }); // wraps to next row
				expect(positions.get(3 as number)).toEqual({ x: 0, y: 10 });
			});

			it('does not wrap when wrap is false', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 30, height: 5 },
					{ eid: 2 as number, width: 30, height: 5 },
					{ eid: 3 as number, width: 30, height: 5 },
				];

				const positions = calculateInlineLayout(children, 50, 0, false);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 30, y: 0 });
				expect(positions.get(3 as number)).toEqual({ x: 60, y: 0 });
			});

			it('uses tallest child for row height when wrapping', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 20, height: 5 },
					{ eid: 2 as number, width: 20, height: 10 },
					{ eid: 3 as number, width: 20, height: 5 },
				];

				// Container width: 45, so child 1 (20) + gap (1) + child 2 (20) = 41 fits
				const positions = calculateInlineLayout(children, 45, 1, true);

				// Child 1 and 2 fit on first row, child 3 wraps
				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 21, y: 0 }); // 20 + 1 gap
				expect(positions.get(3 as number)).toEqual({ x: 0, y: 11 }); // 10 (max height) + 1 gap
			});
		});

		describe('calculateGridLayout', () => {
			it('positions children in a grid', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
					{ eid: 4 as number, width: 10, height: 5 },
				];

				const positions = calculateGridLayout(children, 2, 0);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
				expect(positions.get(3 as number)).toEqual({ x: 0, y: 5 });
				expect(positions.get(4 as number)).toEqual({ x: 10, y: 5 });
			});

			it('applies gap in grid', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
					{ eid: 4 as number, width: 10, height: 5 },
				];

				const positions = calculateGridLayout(children, 2, 2);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 12, y: 0 }); // 10 + 2 gap
				expect(positions.get(3 as number)).toEqual({ x: 0, y: 7 }); // 5 + 2 gap
				expect(positions.get(4 as number)).toEqual({ x: 12, y: 7 });
			});

			it('uses max width in column', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 20, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
					{ eid: 4 as number, width: 10, height: 5 },
				];

				const positions = calculateGridLayout(children, 2, 0);

				// Column 0: max width = 10, Column 1: max width = 20
				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
				expect(positions.get(3 as number)).toEqual({ x: 0, y: 5 });
				expect(positions.get(4 as number)).toEqual({ x: 10, y: 5 }); // Uses col 0 max width
			});

			it('handles 3 columns', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
					{ eid: 4 as number, width: 10, height: 5 },
				];

				const positions = calculateGridLayout(children, 3, 0);

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
				expect(positions.get(3 as number)).toEqual({ x: 20, y: 0 });
				expect(positions.get(4 as number)).toEqual({ x: 0, y: 5 });
			});
		});

		describe('calculateFlexLayout', () => {
			it('positions children in a row', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 80, 0, 'row', 'start', 'start');

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
			});

			it('positions children in a column', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 24, 0, 'column', 'start', 'start');

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 0, y: 5 });
			});

			it('applies gap in flex row', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 80, 2, 'row', 'start', 'start');

				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 12, y: 0 });
			});

			it('centers children with justify center', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 40, 0, 'row', 'center', 'start');

				// Total width = 20, container = 40, free space = 20, offset = 10
				expect(positions.get(1 as number)).toEqual({ x: 10, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 20, y: 0 });
			});

			it('positions children at end with justify end', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 40, 0, 'row', 'end', 'start');

				// Total width = 20, container = 40, free space = 20
				expect(positions.get(1 as number)).toEqual({ x: 20, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 30, y: 0 });
			});

			it('distributes space with justify space-between', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 5 },
					{ eid: 2 as number, width: 10, height: 5 },
					{ eid: 3 as number, width: 10, height: 5 },
				];

				const positions = calculateFlexLayout(children, 50, 0, 'row', 'space-between', 'start');

				// Total width = 30, container = 50, free space = 20
				// Space between = 20 / 2 = 10
				expect(positions.get(1 as number)).toEqual({ x: 0, y: 0 });
				expect(positions.get(2 as number)).toEqual({ x: 20, y: 0 }); // 10 + 10 space
				expect(positions.get(3 as number)).toEqual({ x: 40, y: 0 }); // 20 + 10 + 10 space
			});

			it('centers children on cross axis with align center', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 3 },
					{ eid: 2 as number, width: 10, height: 7 },
				];

				const positions = calculateFlexLayout(children, 80, 0, 'row', 'start', 'center');

				// Max height = 7
				// Child 1 offset = (7 - 3) / 2 = 2
				// Child 2 offset = (7 - 7) / 2 = 0
				expect(positions.get(1 as number)).toEqual({ x: 0, y: 2 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
			});

			it('aligns children to end on cross axis with align end', () => {
				const children: ChildLayoutData[] = [
					{ eid: 1 as number, width: 10, height: 3 },
					{ eid: 2 as number, width: 10, height: 7 },
				];

				const positions = calculateFlexLayout(children, 80, 0, 'row', 'start', 'end');

				// Max height = 7
				// Child 1 offset = 7 - 3 = 4
				// Child 2 offset = 7 - 7 = 0
				expect(positions.get(1 as number)).toEqual({ x: 0, y: 4 });
				expect(positions.get(2 as number)).toEqual({ x: 10, y: 0 });
			});

			it('returns empty map for empty children', () => {
				const children: ChildLayoutData[] = [];

				const positions = calculateFlexLayout(children, 80, 0, 'row', 'start', 'start');

				expect(positions.size).toBe(0);
			});
		});
	});

	describe('recalculate', () => {
		it('recalculates inline layout', () => {
			const parentEid = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			setDimensions(world, child1, 10, 5);
			setDimensions(world, child2, 10, 5);

			const layout = createLayout(world, parentEid, {
				left: 5,
				top: 10,
				width: 80,
				height: 24,
				layout: 'inline',
				gap: 2,
			});

			layout.append(child1).append(child2);
			layout.recalculate();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);

			// Positions should be relative to parent (5, 10)
			expect(pos1?.x).toBe(5);
			expect(pos1?.y).toBe(10);
			expect(pos2?.x).toBe(17); // 5 + 10 + 2 gap
			expect(pos2?.y).toBe(10);
		});

		it('recalculates grid layout', () => {
			const parentEid = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);
			const child4 = addEntity(world);

			setDimensions(world, child1, 10, 5);
			setDimensions(world, child2, 10, 5);
			setDimensions(world, child3, 10, 5);
			setDimensions(world, child4, 10, 5);

			const layout = createLayout(world, parentEid, {
				left: 0,
				top: 0,
				width: 80,
				height: 24,
				layout: 'grid',
				cols: 2,
				gap: 1,
			});

			layout.append(child1).append(child2).append(child3).append(child4);
			layout.recalculate();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);
			const pos3 = getPosition(world, child3);
			const pos4 = getPosition(world, child4);

			expect(pos1?.x).toBe(0);
			expect(pos1?.y).toBe(0);
			expect(pos2?.x).toBe(11); // 10 + 1 gap
			expect(pos2?.y).toBe(0);
			expect(pos3?.x).toBe(0);
			expect(pos3?.y).toBe(6); // 5 + 1 gap
			expect(pos4?.x).toBe(11);
			expect(pos4?.y).toBe(6);
		});

		it('recalculates flex layout', () => {
			const parentEid = addEntity(world);
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			setDimensions(world, child1, 10, 5);
			setDimensions(world, child2, 10, 5);

			const layout = createLayout(world, parentEid, {
				left: 0,
				top: 0,
				width: 40,
				height: 24,
				layout: 'flex',
				direction: 'row',
				justify: 'center',
				gap: 0,
			});

			layout.append(child1).append(child2);
			layout.recalculate();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);

			// Total width = 20, container = 40, offset = 10
			expect(pos1?.x).toBe(10);
			expect(pos1?.y).toBe(0);
			expect(pos2?.x).toBe(20);
			expect(pos2?.y).toBe(0);
		});

		it('returns widget for chaining', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid, { width: 80, height: 24 });

			const result = layout.recalculate();
			expect(result).toBe(layout);
		});
	});

	describe('utility functions', () => {
		describe('isLayout', () => {
			it('returns true for layout entities', () => {
				const eid = addEntity(world);
				createLayout(world, eid);

				expect(isLayout(world, eid)).toBe(true);
			});

			it('returns false for non-layout entities', () => {
				const eid = addEntity(world);

				expect(isLayout(world, eid)).toBe(false);
			});
		});

		describe('getLayoutMode', () => {
			it('returns the layout mode', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);
				const eid3 = addEntity(world);

				createLayout(world, eid1, { layout: 'inline' });
				createLayout(world, eid2, { layout: 'grid' });
				createLayout(world, eid3, { layout: 'flex' });

				expect(getLayoutMode(world, eid1)).toBe('inline');
				expect(getLayoutMode(world, eid2)).toBe('grid');
				expect(getLayoutMode(world, eid3)).toBe('flex');
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const layout = createLayout(world, eid, {
				left: 0,
				top: 0,
				width: 80,
				height: 24,
			});

			layout.setPosition(10, 10).move(5, 5).setGap(2).show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(layout.getGap()).toBe(2);
		});
	});
});
