/**
 * Drag system tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { setParent } from '../components/hierarchy';
import { setDraggable } from '../components/interactive';
import { getPosition, getZIndex, setPosition, setZIndex } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import { EventBus } from '../core/events';
import type { Entity, World } from '../core/types';
import {
	clearDragConstraints,
	createDragSystem,
	type DragEventMap,
	getDragConstraints,
	getDragVerifyCallback,
	resetDragStores,
	setDragConstraints,
	setDragVerifyCallback,
} from './dragSystem';

describe('dragSystem', () => {
	let world: World;
	let eventBus: EventBus<DragEventMap>;
	let dragSystem: ReturnType<typeof createDragSystem>;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		eventBus = new EventBus<DragEventMap>();
		dragSystem = createDragSystem(eventBus);
		resetDragStores();

		// Create a draggable entity
		entity = addEntity(world) as Entity;
		setPosition(world, entity, 10, 20);
		setDraggable(world, entity, true);
	});

	describe('createDragSystem', () => {
		it('should create a drag system', () => {
			expect(dragSystem).toBeDefined();
			expect(dragSystem.isDragging()).toBe(false);
			expect(dragSystem.getDraggingEntity()).toBeNull();
		});
	});

	describe('canDrag', () => {
		it('should return true for draggable entities', () => {
			expect(dragSystem.canDrag(world, entity)).toBe(true);
		});

		it('should return false for non-draggable entities', () => {
			const nonDraggable = addEntity(world) as Entity;
			expect(dragSystem.canDrag(world, nonDraggable)).toBe(false);
		});
	});

	describe('startDrag', () => {
		it('should start dragging an entity', () => {
			const result = dragSystem.startDrag(world, entity, 15, 25);

			expect(result).toBe(true);
			expect(dragSystem.isDragging()).toBe(true);
			expect(dragSystem.getDraggingEntity()).toBe(entity);
		});

		it('should emit dragstart event', () => {
			const handler = vi.fn();
			eventBus.on('dragstart', handler);

			dragSystem.startDrag(world, entity, 15, 25);

			expect(handler).toHaveBeenCalledWith({
				entity,
				startX: 10,
				startY: 20,
				mouseX: 15,
				mouseY: 25,
			});
		});

		it('should not start drag for non-draggable entity', () => {
			const nonDraggable = addEntity(world) as Entity;
			const result = dragSystem.startDrag(world, nonDraggable, 0, 0);

			expect(result).toBe(false);
			expect(dragSystem.isDragging()).toBe(false);
		});

		it('should not start new drag while dragging', () => {
			dragSystem.startDrag(world, entity, 15, 25);

			const entity2 = addEntity(world) as Entity;
			setDraggable(world, entity2, true);

			const result = dragSystem.startDrag(world, entity2, 0, 0);

			expect(result).toBe(false);
			expect(dragSystem.getDraggingEntity()).toBe(entity);
		});
	});

	describe('updateDrag', () => {
		beforeEach(() => {
			dragSystem.startDrag(world, entity, 15, 25);
		});

		it('should update entity position', () => {
			dragSystem.updateDrag(world, 25, 35);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(20); // 25 - (15 - 10) = 20
			expect(pos?.y).toBe(30); // 35 - (25 - 20) = 30
		});

		it('should emit drag event', () => {
			const handler = vi.fn();
			eventBus.on('drag', handler);

			dragSystem.updateDrag(world, 25, 35);

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					entity,
					x: 20,
					y: 30,
					dx: 10,
					dy: 10,
					mouseX: 25,
					mouseY: 35,
				}),
			);
		});

		it('should not update if no movement', () => {
			const handler = vi.fn();
			eventBus.on('drag', handler);

			// Same position as start (accounting for offset)
			dragSystem.updateDrag(world, 15, 25);

			expect(handler).not.toHaveBeenCalled();
		});

		it('should return false when not dragging', () => {
			dragSystem.endDrag(world);
			const result = dragSystem.updateDrag(world, 30, 40);

			expect(result).toBe(false);
		});
	});

	describe('endDrag', () => {
		beforeEach(() => {
			dragSystem.startDrag(world, entity, 15, 25);
			dragSystem.updateDrag(world, 25, 35);
		});

		it('should end dragging', () => {
			dragSystem.endDrag(world);

			expect(dragSystem.isDragging()).toBe(false);
			expect(dragSystem.getDraggingEntity()).toBeNull();
		});

		it('should emit dragend event', () => {
			const handler = vi.fn();
			eventBus.on('dragend', handler);

			dragSystem.endDrag(world);

			expect(handler).toHaveBeenCalledWith({
				entity,
				x: 20,
				y: 30,
				totalDx: 10,
				totalDy: 10,
				cancelled: false,
			});
		});

		it('should emit drop event', () => {
			const handler = vi.fn();
			eventBus.on('drop', handler);

			const dropTarget = addEntity(world) as Entity;
			dragSystem.endDrag(world, dropTarget);

			expect(handler).toHaveBeenCalledWith({
				entity,
				x: 20,
				y: 30,
				dropTarget,
			});
		});

		it('should not emit drop when cancelled', () => {
			const handler = vi.fn();
			eventBus.on('drop', handler);

			dragSystem.endDrag(world, null, true);

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('cancelDrag', () => {
		it('should restore original position', () => {
			dragSystem.startDrag(world, entity, 15, 25);
			dragSystem.updateDrag(world, 50, 60);

			dragSystem.cancelDrag(world);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(10); // Original position
			expect(pos?.y).toBe(20);
		});

		it('should emit dragend with cancelled=true', () => {
			const handler = vi.fn();
			eventBus.on('dragend', handler);

			dragSystem.startDrag(world, entity, 15, 25);
			dragSystem.cancelDrag(world);

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					cancelled: true,
				}),
			);
		});
	});

	describe('constraints', () => {
		describe('setDragConstraints', () => {
			it('should store constraints for entity', () => {
				setDragConstraints(entity, { constrainAxis: 'x' });
				expect(getDragConstraints(entity)).toEqual({ constrainAxis: 'x' });
			});
		});

		describe('clearDragConstraints', () => {
			it('should clear constraints', () => {
				setDragConstraints(entity, { constrainAxis: 'x' });
				clearDragConstraints(entity);
				expect(getDragConstraints(entity)).toEqual({});
			});
		});

		describe('constrainAxis', () => {
			it('should lock to X axis', () => {
				setDragConstraints(entity, { constrainAxis: 'x' });

				dragSystem.startDrag(world, entity, 15, 25);
				dragSystem.updateDrag(world, 25, 50); // Try to move both X and Y

				const pos = getPosition(world, entity);
				expect(pos?.x).toBe(20); // X should change
				expect(pos?.y).toBe(20); // Y should stay original
			});

			it('should lock to Y axis', () => {
				setDragConstraints(entity, { constrainAxis: 'y' });

				dragSystem.startDrag(world, entity, 15, 25);
				dragSystem.updateDrag(world, 50, 35);

				const pos = getPosition(world, entity);
				expect(pos?.x).toBe(10); // X should stay original
				expect(pos?.y).toBe(30); // Y should change
			});
		});

		describe('snapToGrid', () => {
			it('should snap position to grid', () => {
				setDragConstraints(entity, { snapToGrid: { x: 10, y: 10 } });

				// Entity at (10, 20), drag starts at mouse (10, 20) so offset = (0, 0)
				dragSystem.startDrag(world, entity, 10, 20);
				// Mouse at (27, 33) means new position = (27, 33)
				// Snapped to grid of 10: round(27/10)*10 = 30, round(33/10)*10 = 30
				dragSystem.updateDrag(world, 27, 33);

				const pos = getPosition(world, entity);
				expect(pos?.x).toBe(30); // Snapped from 27
				expect(pos?.y).toBe(30); // Snapped from 33
			});
		});

		describe('minX/maxX/minY/maxY', () => {
			it('should constrain to min/max bounds', () => {
				setDragConstraints(entity, {
					minX: 5,
					maxX: 50,
					minY: 5,
					maxY: 50,
				});

				dragSystem.startDrag(world, entity, 10, 20);

				// Try to go below min
				dragSystem.updateDrag(world, -10, -10);
				let pos = getPosition(world, entity);
				expect(pos?.x).toBe(5);
				expect(pos?.y).toBe(5);

				// Try to go above max
				dragSystem.updateDrag(world, 100, 100);
				pos = getPosition(world, entity);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(50);
			});
		});

		describe('bringToFront', () => {
			it('should bring entity to front when drag starts', () => {
				setZIndex(world, entity, 10);
				setDragConstraints(entity, { bringToFront: true });

				dragSystem.startDrag(world, entity, 15, 25);

				expect(getZIndex(world, entity)).toBe(9999);
			});

			it('should use custom frontZIndex', () => {
				setZIndex(world, entity, 10);
				setDragConstraints(entity, { bringToFront: true, frontZIndex: 500 });

				dragSystem.startDrag(world, entity, 15, 25);

				expect(getZIndex(world, entity)).toBe(500);
			});

			it('should not change z-index if bringToFront is false', () => {
				setZIndex(world, entity, 10);
				setDragConstraints(entity, { bringToFront: false });

				dragSystem.startDrag(world, entity, 15, 25);

				expect(getZIndex(world, entity)).toBe(10);
			});
		});

		describe('constrainToParent', () => {
			it('should constrain to parent bounds', () => {
				const parent = addEntity(world) as Entity;
				setDimensions(world, parent, 100, 100);

				// Set up entity dimensions
				setDimensions(world, entity, 20, 20);

				setParent(world, entity, parent);
				setDragConstraints(entity, { constrainToParent: true });

				dragSystem.startDrag(world, entity, 10, 20);

				// Try to drag outside parent on right/bottom
				dragSystem.updateDrag(world, 200, 200);
				let pos = getPosition(world, entity);
				expect(pos?.x).toBe(80); // 100 - 20 = 80
				expect(pos?.y).toBe(80);

				// Try to drag outside parent on left/top
				dragSystem.updateDrag(world, -100, -100);
				pos = getPosition(world, entity);
				expect(pos?.x).toBe(0);
				expect(pos?.y).toBe(0);
			});
		});
	});

	describe('verification callback', () => {
		it('should call verify callback before move', () => {
			const verify = vi.fn().mockReturnValue(true);
			setDragVerifyCallback(entity, verify);

			dragSystem.startDrag(world, entity, 15, 25);
			dragSystem.updateDrag(world, 25, 35);

			expect(verify).toHaveBeenCalledWith(entity, 10, 10);
		});

		it('should block move if callback returns false', () => {
			setDragVerifyCallback(entity, () => false);

			dragSystem.startDrag(world, entity, 15, 25);
			const result = dragSystem.updateDrag(world, 25, 35);

			expect(result).toBe(false);
			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(10); // Unchanged
			expect(pos?.y).toBe(20);
		});

		it('should allow move if callback returns true', () => {
			setDragVerifyCallback(entity, () => true);

			dragSystem.startDrag(world, entity, 15, 25);
			dragSystem.updateDrag(world, 25, 35);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(20);
			expect(pos?.y).toBe(30);
		});

		describe('getDragVerifyCallback', () => {
			it('should return stored callback', () => {
				const callback = () => true;
				setDragVerifyCallback(entity, callback);
				expect(getDragVerifyCallback(entity)).toBe(callback);
			});

			it('should return null if no callback', () => {
				expect(getDragVerifyCallback(entity)).toBeNull();
			});
		});
	});

	describe('getState', () => {
		it('should return current drag state', () => {
			dragSystem.startDrag(world, entity, 15, 25);

			const state = dragSystem.getState();

			expect(state.dragging).toBe(entity);
			expect(state.startX).toBe(10);
			expect(state.startY).toBe(20);
			expect(state.offsetX).toBe(5);
			expect(state.offsetY).toBe(5);
		});
	});
});
