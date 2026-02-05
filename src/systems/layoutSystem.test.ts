/**
 * Tests for Layout System
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { setConstraints, setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setAbsolute, setPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { World } from '../core/types';
import {
	computeLayoutNow,
	createLayoutSystem,
	getComputedBounds,
	getComputedLayout,
	hasComputedLayout,
	invalidateAllLayouts,
	invalidateLayout,
	layoutSystem,
} from './layoutSystem';

describe('layoutSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		// Create screen for root container dimensions
		createScreenEntity(world, { width: 80, height: 24 });
	});

	describe('basic positioning', () => {
		it('computes absolute position for root entity', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout).toBeDefined();
			expect(layout?.x).toBe(10);
			expect(layout?.y).toBe(5);
			expect(layout?.width).toBe(20);
			expect(layout?.height).toBe(10);
		});

		it('computes position relative to parent', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 10, 5);
			setDimensions(world, parent, 40, 20);

			const child = addEntity(world);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);
			appendChild(world, parent, child);

			layoutSystem(world);

			const childLayout = getComputedLayout(world, child);
			expect(childLayout).toBeDefined();
			expect(childLayout?.x).toBe(15); // parent.x + child.x
			expect(childLayout?.y).toBe(8); // parent.y + child.y
		});

		it('handles absolute positioning', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 10, 5);
			setDimensions(world, parent, 40, 20);

			const child = addEntity(world);
			setPosition(world, child, 50, 20);
			setAbsolute(world, child, true);
			setDimensions(world, child, 10, 5);
			appendChild(world, parent, child);

			layoutSystem(world);

			const childLayout = getComputedLayout(world, child);
			expect(childLayout).toBeDefined();
			expect(childLayout?.x).toBe(50); // Absolute, not relative to parent
			expect(childLayout?.y).toBe(20);
		});
	});

	describe('percentage dimensions', () => {
		it('calculates width as percentage of container', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, '50%', 10);

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.width).toBe(40); // 50% of 80
		});

		it('calculates height as percentage of container', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 20, '50%');

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.height).toBe(12); // 50% of 24
		});

		it('calculates percentage relative to parent', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 0, 0);
			setDimensions(world, parent, 40, 20);

			const child = addEntity(world);
			setPosition(world, child, 0, 0);
			setDimensions(world, child, '50%', '50%');
			appendChild(world, parent, child);

			layoutSystem(world);

			const childLayout = getComputedLayout(world, child);
			expect(childLayout?.width).toBe(20); // 50% of 40
			expect(childLayout?.height).toBe(10); // 50% of 20
		});
	});

	describe('dimension constraints', () => {
		it('respects minimum width', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 5, 10);
			setConstraints(world, entity, { minWidth: 10 });

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.width).toBe(10);
		});

		it('respects maximum width', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 100, 10);
			setConstraints(world, entity, { maxWidth: 50 });

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.width).toBe(50);
		});

		it('respects minimum height', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 20, 3);
			setConstraints(world, entity, { minHeight: 5 });

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.height).toBe(5);
		});

		it('respects maximum height', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 20, 100);
			setConstraints(world, entity, { maxHeight: 15 });

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout?.height).toBe(15);
		});
	});

	describe('nested layout', () => {
		it('computes nested hierarchy correctly', () => {
			const grandparent = addEntity(world);
			setPosition(world, grandparent, 5, 2);
			setDimensions(world, grandparent, 60, 20);

			const parent = addEntity(world);
			setPosition(world, parent, 5, 3);
			setDimensions(world, parent, 40, 15);
			appendChild(world, grandparent, parent);

			const child = addEntity(world);
			setPosition(world, child, 2, 1);
			setDimensions(world, child, 10, 5);
			appendChild(world, parent, child);

			layoutSystem(world);

			const childLayout = getComputedLayout(world, child);
			expect(childLayout?.x).toBe(12); // 5 + 5 + 2
			expect(childLayout?.y).toBe(6); // 2 + 3 + 1
		});

		it('processes parents before children', () => {
			const parent = addEntity(world);
			const child = addEntity(world);

			// Add child to parent after creating both
			setPosition(world, parent, 10, 10);
			setDimensions(world, parent, 30, 20);
			setPosition(world, child, 5, 5);
			setDimensions(world, child, 10, 10);
			appendChild(world, parent, child);

			layoutSystem(world);

			const parentLayout = getComputedLayout(world, parent);
			const childLayout = getComputedLayout(world, child);

			expect(parentLayout).toBeDefined();
			expect(childLayout).toBeDefined();
			if (!parentLayout || !childLayout) {
				throw new Error('Expected computed layouts to be defined');
			}
			expect(childLayout.x).toBe(parentLayout.x + 5);
			expect(childLayout.y).toBe(parentLayout.y + 5);
		});
	});

	describe('container bounds', () => {
		it('clamps child to container bounds', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 10, 10);
			setDimensions(world, parent, 20, 10);

			const child = addEntity(world);
			setPosition(world, child, 15, 5); // Would extend past parent
			setDimensions(world, child, 15, 10); // Too wide for container
			appendChild(world, parent, child);

			layoutSystem(world);

			const childLayout = getComputedLayout(world, child);
			expect(childLayout?.width).toBeLessThanOrEqual(20 - 15); // Clamped
		});
	});

	describe('hasComputedLayout', () => {
		it('returns false before layout system runs', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);

			expect(hasComputedLayout(world, entity)).toBe(false);
		});

		it('returns true after layout system runs', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 10, 10);

			layoutSystem(world);

			expect(hasComputedLayout(world, entity)).toBe(true);
		});
	});

	describe('invalidateLayout', () => {
		it('marks layout as invalid', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 10, 10);

			layoutSystem(world);
			expect(hasComputedLayout(world, entity)).toBe(true);

			invalidateLayout(world, entity);
			expect(hasComputedLayout(world, entity)).toBe(false);
		});
	});

	describe('invalidateAllLayouts', () => {
		it('marks all layouts as invalid', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 0, 0);
			setDimensions(world, entity1, 10, 10);

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 0);
			setDimensions(world, entity2, 10, 10);

			layoutSystem(world);

			expect(hasComputedLayout(world, entity1)).toBe(true);
			expect(hasComputedLayout(world, entity2)).toBe(true);

			invalidateAllLayouts(world);

			expect(hasComputedLayout(world, entity1)).toBe(false);
			expect(hasComputedLayout(world, entity2)).toBe(false);
		});
	});

	describe('computeLayoutNow', () => {
		it('computes layout for a single entity', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);

			const layout = computeLayoutNow(world, entity);

			expect(layout).toBeDefined();
			expect(layout?.x).toBe(10);
			expect(layout?.y).toBe(5);
		});

		it('computes parent layout if needed', () => {
			const parent = addEntity(world);
			setPosition(world, parent, 10, 5);
			setDimensions(world, parent, 40, 20);

			const child = addEntity(world);
			setPosition(world, child, 5, 3);
			setDimensions(world, child, 10, 5);
			appendChild(world, parent, child);

			const layout = computeLayoutNow(world, child);

			expect(layout).toBeDefined();
			expect(layout?.x).toBe(15);
			expect(layout?.y).toBe(8);
		});
	});

	describe('getComputedBounds', () => {
		it('returns bounding rectangle', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);

			layoutSystem(world);

			const bounds = getComputedBounds(world, entity);
			expect(bounds).toBeDefined();
			expect(bounds?.left).toBe(10);
			expect(bounds?.top).toBe(5);
			expect(bounds?.right).toBe(29); // 10 + 20 - 1
			expect(bounds?.bottom).toBe(14); // 5 + 10 - 1
		});
	});

	describe('createLayoutSystem', () => {
		it('creates a working layout system', () => {
			const system = createLayoutSystem();
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setDimensions(world, entity, 20, 10);

			system(world);

			const layout = getComputedLayout(world, entity);
			expect(layout).toBeDefined();
			expect(layout?.x).toBe(10);
		});
	});

	describe('multiple roots', () => {
		it('handles multiple root entities', () => {
			const root1 = addEntity(world);
			setPosition(world, root1, 0, 0);
			setDimensions(world, root1, 30, 10);

			const root2 = addEntity(world);
			setPosition(world, root2, 40, 0);
			setDimensions(world, root2, 30, 10);

			layoutSystem(world);

			const layout1 = getComputedLayout(world, root1);
			const layout2 = getComputedLayout(world, root2);

			expect(layout1?.x).toBe(0);
			expect(layout2?.x).toBe(40);
		});
	});

	describe('entity without dimensions', () => {
		it('handles entity with only position', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			// No dimensions set

			layoutSystem(world);

			const layout = getComputedLayout(world, entity);
			expect(layout).toBeDefined();
			expect(layout?.x).toBe(10);
			expect(layout?.y).toBe(5);
			expect(layout?.width).toBe(0);
			expect(layout?.height).toBe(0);
		});
	});
});
