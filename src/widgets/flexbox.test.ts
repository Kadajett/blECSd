/**
 * Tests for Flexbox widget
 */

import { describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	addFlexChild,
	createFlexContainer,
	type FlexContainerConfig,
	resetFlexContainerStore,
} from './flexbox';

describe('Flexbox widget', () => {
	let world: World;

	function setup(config: FlexContainerConfig = {}) {
		resetFlexContainerStore();
		world = createWorld();
		const eid = addEntity(world);
		return createFlexContainer(world, eid, config);
	}

	describe('creation', () => {
		it('creates flexbox with default values', () => {
			const flex = setup();
			expect(flex.eid).toBeGreaterThanOrEqual(0);
			expect(flex.getChildren()).toEqual([]);
		});

		it('creates flexbox with row direction', () => {
			const flex = setup({ direction: 'row' });
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates flexbox with column direction', () => {
			const flex = setup({ direction: 'column' });
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates flexbox with justify content options', () => {
			const configs: FlexContainerConfig[] = [
				{ justifyContent: 'start' },
				{ justifyContent: 'center' },
				{ justifyContent: 'end' },
				{ justifyContent: 'space-between' },
				{ justifyContent: 'space-around' },
				{ justifyContent: 'space-evenly' },
			];

			for (const config of configs) {
				const flex = setup(config);
				expect(flex.eid).toBeGreaterThanOrEqual(0);
			}
		});

		it('creates flexbox with align items options', () => {
			const configs: FlexContainerConfig[] = [
				{ alignItems: 'start' },
				{ alignItems: 'center' },
				{ alignItems: 'end' },
				{ alignItems: 'stretch' },
			];

			for (const config of configs) {
				const flex = setup(config);
				expect(flex.eid).toBeGreaterThanOrEqual(0);
			}
		});

		it('creates flexbox with gap', () => {
			const flex = setup({ gap: 5 });
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates flexbox with wrap', () => {
			const flex = setup({ wrap: 'wrap' });
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates flexbox with custom dimensions', () => {
			const flex = setup({
				left: 10,
				top: 5,
				width: 80,
				height: 24,
			});
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates flexbox with colors', () => {
			const flex = setup({
				fg: '#FFFFFF',
				bg: '#000000',
			});
			expect(flex.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('shows the flexbox', () => {
			const flex = setup();
			const result = flex.show();
			expect(result).toBe(flex);
		});

		it('hides the flexbox', () => {
			const flex = setup();
			const result = flex.hide();
			expect(result).toBe(flex);
		});
	});

	describe('position', () => {
		it('moves the flexbox', () => {
			const flex = setup();
			const result = flex.move(5, 10);
			expect(result).toBe(flex);
		});

		it('sets absolute position', () => {
			const flex = setup();
			const result = flex.setPosition(20, 15);
			expect(result).toBe(flex);
		});
	});

	describe('children management', () => {
		it('adds children', () => {
			const flex = setup();
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			flex.addChild(child1);
			flex.addChild(child2);

			const children = flex.getChildren();
			expect(children).toHaveLength(2);
			expect(children).toContain(child1);
			expect(children).toContain(child2);
		});

		it('adds children with flex options', () => {
			const flex = setup();
			const child = addEntity(world);

			const result = flex.addChild(child, {
				flex: 1,
				flexShrink: 0,
				flexBasis: 50,
				alignSelf: 'center',
			});

			expect(result).toBe(flex);
			expect(flex.getChildren()).toHaveLength(1);
		});

		it('removes children', () => {
			const flex = setup();
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			flex.addChild(child1);
			flex.addChild(child2);
			expect(flex.getChildren()).toHaveLength(2);

			flex.removeChild(child1);
			expect(flex.getChildren()).toHaveLength(1);
			expect(flex.getChildren()).toContain(child2);
		});

		it('chains child operations', () => {
			const flex = setup();
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			const result = flex.addChild(child1).addChild(child2);
			expect(result).toBe(flex);
		});
	});

	describe('configuration', () => {
		it('sets direction', () => {
			const flex = setup();
			const result = flex.setDirection('column');
			expect(result).toBe(flex);
		});

		it('sets justify content', () => {
			const flex = setup();
			const result = flex.setJustifyContent('center');
			expect(result).toBe(flex);
		});

		it('sets align items', () => {
			const flex = setup();
			const result = flex.setAlignItems('end');
			expect(result).toBe(flex);
		});

		it('sets gap', () => {
			const flex = setup();
			const result = flex.setGap(10);
			expect(result).toBe(flex);
		});

		it('sets wrap', () => {
			const flex = setup();
			const result = flex.setWrap('wrap');
			expect(result).toBe(flex);
		});

		it('chains configuration updates', () => {
			const flex = setup();
			const result = flex
				.setDirection('column')
				.setJustifyContent('center')
				.setAlignItems('end')
				.setGap(5);
			expect(result).toBe(flex);
		});
	});

	describe('layout', () => {
		it('applies layout', () => {
			const flex = setup({
				width: 100,
				height: 50,
				direction: 'row',
			});

			const child1 = addEntity(world);
			setDimensions(world, child1, 30, 20);

			const child2 = addEntity(world);
			setDimensions(world, child2, 40, 20);

			flex.addChild(child1);
			flex.addChild(child2);

			const result = flex.layout();
			expect(result).toBe(flex);

			// Children should be positioned
			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);
			expect(pos1).toBeDefined();
			expect(pos2).toBeDefined();
		});

		it('layouts with gap', () => {
			const flex = setup({
				width: 100,
				height: 50,
				direction: 'row',
				gap: 10,
			});

			const child1 = addEntity(world);
			setDimensions(world, child1, 30, 20);

			const child2 = addEntity(world);
			setDimensions(world, child2, 40, 20);

			flex.addChild(child1).addChild(child2).layout();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);

			if (pos1 && pos2) {
				// With gap, second child should be offset
				expect(pos2.x).toBeGreaterThan(pos1.x);
			}
		});

		it('layouts with justify-content center', () => {
			const flex = setup({
				width: 100,
				height: 50,
				direction: 'row',
				justifyContent: 'center',
			});

			const child = addEntity(world);
			setDimensions(world, child, 30, 20);

			flex.addChild(child).layout();

			const pos = getPosition(world, child);
			expect(pos).toBeDefined();
			if (pos) {
				// Child should be centered
				expect(pos.x).toBeGreaterThan(0);
			}
		});

		it('layouts with justify-content space-between', () => {
			const flex = setup({
				width: 100,
				height: 50,
				direction: 'row',
				justifyContent: 'space-between',
			});

			const child1 = addEntity(world);
			setDimensions(world, child1, 20, 20);

			const child2 = addEntity(world);
			setDimensions(world, child2, 20, 20);

			flex.addChild(child1).addChild(child2).layout();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);

			if (pos1 && pos2) {
				// First child at start, second at end
				expect(pos1.x).toBe(0);
				expect(pos2.x).toBeGreaterThan(pos1.x);
			}
		});

		it('layouts column direction', () => {
			const flex = setup({
				width: 50,
				height: 100,
				direction: 'column',
			});

			const child1 = addEntity(world);
			setDimensions(world, child1, 20, 30);

			const child2 = addEntity(world);
			setDimensions(world, child2, 20, 40);

			flex.addChild(child1).addChild(child2).layout();

			const pos1 = getPosition(world, child1);
			const pos2 = getPosition(world, child2);

			if (pos1 && pos2) {
				// In column, children stack vertically
				expect(pos2.y).toBeGreaterThan(pos1.y);
			}
		});

		it('chains layout operations', () => {
			const flex = setup({ width: 100, height: 50 });
			const child = addEntity(world);
			setDimensions(world, child, 30, 20);

			const result = flex.addChild(child).layout();
			expect(result).toBe(flex);
		});
	});

	describe('focus', () => {
		it('focuses the flexbox', () => {
			const flex = setup();
			const result = flex.focus();
			expect(result).toBe(flex);
		});

		it('blurs the flexbox', () => {
			const flex = setup();
			const result = flex.blur();
			expect(result).toBe(flex);
		});

		it('checks focus state', () => {
			const flex = setup();
			expect(typeof flex.isFocused()).toBe('boolean');
		});
	});

	describe('addFlexChild function', () => {
		it('adds child with standalone function', () => {
			const flex = setup();
			const child = addEntity(world);

			addFlexChild(world, flex.eid, child, { flex: 1 });

			expect(flex.getChildren()).toHaveLength(1);
			expect(flex.getChildren()).toContain(child);
		});

		it('adds child with all options', () => {
			const flex = setup();
			const child = addEntity(world);

			addFlexChild(world, flex.eid, child, {
				flex: 2,
				flexShrink: 0.5,
				flexBasis: 100,
				alignSelf: 'end',
			});

			expect(flex.getChildren()).toHaveLength(1);
		});

		it('handles invalid container gracefully', () => {
			const nonFlexEid = addEntity(world);
			const child = addEntity(world);

			// Should not throw
			expect(() => {
				addFlexChild(world, nonFlexEid, child);
			}).not.toThrow();
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const flex = setup();
			expect(() => flex.destroy()).not.toThrow();
		});

		it('cleans up state on destroy', () => {
			const flex = setup();
			const child = addEntity(world);
			flex.addChild(child);

			flex.destroy();

			// After destroy, children list should be empty
			expect(flex.getChildren()).toEqual([]);
		});
	});

	describe('integration scenarios', () => {
		it('handles complete flexbox workflow', () => {
			const flex = setup({
				width: 200,
				height: 100,
				direction: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 10,
			});

			// Add multiple children with different flex properties
			const child1 = addEntity(world);
			setDimensions(world, child1, 40, 30);
			flex.addChild(child1, { flex: 1 });

			const child2 = addEntity(world);
			setDimensions(world, child2, 60, 40);
			flex.addChild(child2, { flex: 2 });

			const child3 = addEntity(world);
			setDimensions(world, child3, 50, 35);
			flex.addChild(child3, { flex: 1, alignSelf: 'start' });

			// Apply layout
			flex.layout();

			// All children should be positioned
			expect(getPosition(world, child1)).toBeDefined();
			expect(getPosition(world, child2)).toBeDefined();
			expect(getPosition(world, child3)).toBeDefined();
		});

		it('handles wrapping layout', () => {
			const flex = setup({
				width: 100,
				height: 100,
				direction: 'row',
				wrap: 'wrap',
				gap: 5,
			});

			// Add children that exceed width
			for (let i = 0; i < 5; i++) {
				const child = addEntity(world);
				setDimensions(world, child, 30, 20);
				flex.addChild(child);
			}

			flex.layout();

			// All children should have positions
			for (const childEid of flex.getChildren()) {
				expect(getPosition(world, childEid)).toBeDefined();
			}
		});

		it('handles nested flex containers', () => {
			const outer = setup({
				width: 200,
				height: 100,
				direction: 'row',
			});

			// Create inner flex container
			const innerEid = addEntity(world);
			const inner = createFlexContainer(world, innerEid, {
				width: 80,
				height: 80,
				direction: 'column',
			});

			outer.addChild(inner.eid);

			// Add children to inner
			const child = addEntity(world);
			setDimensions(world, child, 60, 30);
			inner.addChild(child);

			outer.layout();
			inner.layout();

			expect(getPosition(world, inner.eid)).toBeDefined();
			expect(getPosition(world, child)).toBeDefined();
		});

		it('handles dynamic configuration changes', () => {
			const flex = setup({
				width: 100,
				height: 50,
				direction: 'row',
			});

			const child1 = addEntity(world);
			setDimensions(world, child1, 30, 20);
			const child2 = addEntity(world);
			setDimensions(world, child2, 30, 20);

			flex.addChild(child1).addChild(child2);

			// Initial layout
			flex.layout();
			const initialPos1 = getPosition(world, child1);

			// Change configuration
			flex.setDirection('column').setJustifyContent('center').layout();

			const newPos1 = getPosition(world, child1);

			// Position should change after reconfiguration
			if (initialPos1 && newPos1) {
				expect(newPos1.y).not.toBe(initialPos1.y);
			}
		});
	});

	describe('chainability', () => {
		it('chains all operations', () => {
			const flex = setup();
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			setDimensions(world, child1, 30, 20);
			setDimensions(world, child2, 40, 20);

			const result = flex
				.show()
				.setDirection('row')
				.setJustifyContent('space-between')
				.setAlignItems('center')
				.setGap(5)
				.addChild(child1, { flex: 1 })
				.addChild(child2, { flex: 2 })
				.layout()
				.focus()
				.blur()
				.hide();

			expect(result).toBe(flex);
		});
	});
});
