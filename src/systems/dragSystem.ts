/**
 * Drag and drop system for interactive entities.
 *
 * Handles drag initiation, position updates during drag, and drop handling.
 * Supports constraints like parent bounds, axis locking, and grid snapping.
 *
 * @module systems/dragSystem
 */

import { getDimensions } from '../components/dimensions';
import { getParent, NULL_ENTITY } from '../components/hierarchy';
import { getPosition, Position, setPosition, setZIndex } from '../components/position';
import type { EventBus } from '../core/events';
import type { Entity, World } from '../core/types';
import { getWorldStore } from '../core/worldStore';
import { isDraggable } from '../systems/interactiveSystem';

/**
 * Drag constraint configuration.
 */
export interface DragConstraints {
	/** Constrain to parent bounds */
	constrainToParent?: boolean;
	/** Lock to a single axis */
	constrainAxis?: 'x' | 'y' | null;
	/** Snap to grid */
	snapToGrid?: { x: number; y: number } | null;
	/** Minimum X position */
	minX?: number;
	/** Maximum X position */
	maxX?: number;
	/** Minimum Y position */
	minY?: number;
	/** Maximum Y position */
	maxY?: number;
	/** Bring entity to front (highest z-index) when dragging starts */
	bringToFront?: boolean;
	/** Z-index to use when bringing to front */
	frontZIndex?: number;
}

/**
 * Drag verification callback.
 * Return false to cancel the drag movement.
 */
export type DragVerifyCallback = (entity: Entity, dx: number, dy: number) => boolean;

/**
 * Drag start event data.
 */
export interface DragStartEvent {
	/** Entity being dragged */
	entity: Entity;
	/** Starting X position */
	startX: number;
	/** Starting Y position */
	startY: number;
	/** Mouse X at drag start */
	mouseX: number;
	/** Mouse Y at drag start */
	mouseY: number;
}

/**
 * Drag move event data.
 */
export interface DragMoveEvent {
	/** Entity being dragged */
	entity: Entity;
	/** Current X position */
	x: number;
	/** Current Y position */
	y: number;
	/** Change in X since last move */
	dx: number;
	/** Change in Y since last move */
	dy: number;
	/** Current mouse X */
	mouseX: number;
	/** Current mouse Y */
	mouseY: number;
}

/**
 * Drag end event data.
 */
export interface DragEndEvent {
	/** Entity that was dragged */
	entity: Entity;
	/** Final X position */
	x: number;
	/** Final Y position */
	y: number;
	/** Total change in X */
	totalDx: number;
	/** Total change in Y */
	totalDy: number;
	/** Whether drag was cancelled */
	cancelled: boolean;
}

/**
 * Drop event data.
 */
export interface DropEvent {
	/** Entity that was dropped */
	entity: Entity;
	/** Drop X position */
	x: number;
	/** Drop Y position */
	y: number;
	/** Entity under drop point (if any) */
	dropTarget: Entity | null;
}

/**
 * Drag system event map.
 */
export interface DragEventMap {
	dragstart: DragStartEvent;
	drag: DragMoveEvent;
	dragend: DragEndEvent;
	drop: DropEvent;
}

/**
 * Current drag state.
 */
export interface DragState {
	/** Entity currently being dragged */
	dragging: Entity | null;
	/** Starting position of drag */
	startX: number;
	startY: number;
	/** Mouse offset from entity origin at drag start */
	offsetX: number;
	offsetY: number;
	/** Last known position during drag */
	lastX: number;
	lastY: number;
	/** Constraints for current drag */
	constraints: DragConstraints;
	/** Verification callback */
	verifyCallback: DragVerifyCallback | null;
}

// =============================================================================
// WORLD-SCOPED STORES (REPLACED MODULE-LEVEL SINGLETONS)
// =============================================================================

/** Get world-scoped store for drag constraints */
function getConstraintStore(world: World): Map<Entity, DragConstraints> {
	return getWorldStore<Entity, DragConstraints>(world, 'drag:constraints');
}

/** Get world-scoped store for drag verification callbacks */
function getVerifyStore(world: World): Map<Entity, DragVerifyCallback> {
	return getWorldStore<Entity, DragVerifyCallback>(world, 'drag:verify');
}

/**
 * Creates a new drag state.
 */
function createDragState(): DragState {
	return {
		dragging: null,
		startX: 0,
		startY: 0,
		offsetX: 0,
		offsetY: 0,
		lastX: 0,
		lastY: 0,
		constraints: {},
		verifyCallback: null,
	};
}

/**
 * Sets drag constraints for an entity.
 *
 * @param eid - The entity ID
 * @param constraints - Drag constraints
 *
 * @example
 * ```typescript
 * import { setDragConstraints } from 'blecsd';
 *
 * // Constrain to parent bounds
 * setDragConstraints(entity, { constrainToParent: true });
 *
 * // Lock to horizontal axis with grid snap
 * setDragConstraints(entity, {
 *   constrainAxis: 'x',
 *   snapToGrid: { x: 10, y: 10 }
 * });
 * ```
 */
export function setDragConstraints(world: World, eid: Entity, constraints: DragConstraints): void {
	getConstraintStore(world).set(eid, constraints);
}

/**
 * Gets drag constraints for an entity.
 *
 * @param eid - The entity ID
 * @returns Drag constraints or empty object
 */
export function getDragConstraints(world: World, eid: Entity): DragConstraints {
	return getConstraintStore(world).get(eid) ?? {};
}

/**
 * Clears drag constraints for an entity.
 *
 * @param eid - The entity ID
 */
export function clearDragConstraints(world: World, eid: Entity): void {
	getConstraintStore(world).delete(eid);
}

/**
 * Sets a drag verification callback for an entity.
 *
 * @param eid - The entity ID
 * @param callback - Verification callback (return false to cancel movement)
 *
 * @example
 * ```typescript
 * import { setDragVerifyCallback } from 'blecsd';
 *
 * // Prevent dragging into certain areas
 * setDragVerifyCallback(entity, (entity, dx, dy) => {
 *   const newX = Position.x[entity] + dx;
 *   const newY = Position.y[entity] + dy;
 *
 *   // Don't allow dragging into forbidden zone
 *   if (newX > 50 && newX < 60) return false;
 *
 *   return true;
 * });
 * ```
 */
export function setDragVerifyCallback(
	world: World,
	eid: Entity,
	callback: DragVerifyCallback | null,
): void {
	if (callback) {
		getVerifyStore(world).set(eid, callback);
	} else {
		getVerifyStore(world).delete(eid);
	}
}

/**
 * Gets the drag verification callback for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The verification callback or null
 */
export function getDragVerifyCallback(world: World, eid: Entity): DragVerifyCallback | null {
	return getVerifyStore(world).get(eid) ?? null;
}

/**
 * Applies constraints to a position.
 *
 * @param world - The ECS world
 * @param eid - The entity being dragged
 * @param x - Proposed X position
 * @param y - Proposed Y position
 * @param constraints - Constraints to apply
 * @returns Constrained position
 */
/** Apply axis constraint */
function applyAxisConstraint(
	eid: Entity,
	x: number,
	y: number,
	axis: 'x' | 'y' | null | undefined,
): { x: number; y: number } {
	if (axis === 'x') return { x, y: (Position.y[eid] as number | undefined) ?? y };
	if (axis === 'y') return { x: (Position.x[eid] as number | undefined) ?? x, y };
	return { x, y };
}

/** Apply grid snap constraint */
function applyGridSnap(
	x: number,
	y: number,
	grid: { x: number; y: number } | null | undefined,
): { x: number; y: number } {
	if (!grid) return { x, y };
	return {
		x: Math.round(x / grid.x) * grid.x,
		y: Math.round(y / grid.y) * grid.y,
	};
}

/** Apply min/max bounds */
function applyBounds(x: number, y: number, constraints: DragConstraints): { x: number; y: number } {
	let newX = x;
	let newY = y;
	if (constraints.minX !== undefined) newX = Math.max(newX, constraints.minX);
	if (constraints.maxX !== undefined) newX = Math.min(newX, constraints.maxX);
	if (constraints.minY !== undefined) newY = Math.max(newY, constraints.minY);
	if (constraints.maxY !== undefined) newY = Math.min(newY, constraints.maxY);
	return { x: newX, y: newY };
}

/** Apply parent bounds constraint */
function applyParentBounds(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	constrainToParent: boolean | undefined,
): { x: number; y: number } {
	if (!constrainToParent) return { x, y };

	const parent = getParent(world, eid);
	if (parent === NULL_ENTITY) return { x, y };

	const parentDims = getDimensions(world, parent);
	if (!parentDims) return { x, y };

	const entityDims = getDimensions(world, eid);
	const entityWidth = entityDims?.width ?? 1;
	const entityHeight = entityDims?.height ?? 1;

	return {
		x: Math.max(0, Math.min(x, parentDims.width - entityWidth)),
		y: Math.max(0, Math.min(y, parentDims.height - entityHeight)),
	};
}

function applyConstraints(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	constraints: DragConstraints,
): { x: number; y: number } {
	let pos = applyAxisConstraint(eid, x, y, constraints.constrainAxis);
	pos = applyGridSnap(pos.x, pos.y, constraints.snapToGrid);
	pos = applyBounds(pos.x, pos.y, constraints);
	pos = applyParentBounds(world, eid, pos.x, pos.y, constraints.constrainToParent);
	return pos;
}

/**
 * Creates a drag system with event handling.
 *
 * @param eventBus - Event bus for drag events
 * @returns Drag system API
 *
 * @example
 * ```typescript
 * import { createDragSystem, createEventBus } from 'blecsd';
 *
 * const dragEvents = createEventBus<DragEventMap>();
 * const dragSystem = createDragSystem(dragEvents);
 *
 * // Listen for drag events
 * dragEvents.on('dragstart', (e) => {
 *   console.log(`Started dragging entity ${e.entity}`);
 * });
 *
 * dragEvents.on('drag', (e) => {
 *   console.log(`Dragged to ${e.x}, ${e.y}`);
 * });
 *
 * dragEvents.on('dragend', (e) => {
 *   console.log(`Drag ended, cancelled: ${e.cancelled}`);
 * });
 *
 * // In mouse event handler
 * function onMouseDown(x: number, y: number, entity: Entity) {
 *   if (dragSystem.canDrag(world, entity)) {
 *     dragSystem.startDrag(world, entity, x, y);
 *   }
 * }
 *
 * function onMouseMove(x: number, y: number) {
 *   dragSystem.updateDrag(world, x, y);
 * }
 *
 * function onMouseUp(x: number, y: number, dropTarget: Entity | null) {
 *   dragSystem.endDrag(world, dropTarget);
 * }
 * ```
 */
export function createDragSystem(eventBus: EventBus<DragEventMap>) {
	const state = createDragState();

	/**
	 * Ends the current drag operation.
	 *
	 * @param world - The ECS world
	 * @param dropTarget - Entity under the drop point (if any)
	 * @param cancelled - Whether the drag was cancelled
	 */
	const endDrag = (world: World, dropTarget: Entity | null = null, cancelled = false): void => {
		if (state.dragging === null) {
			return;
		}

		const eid = state.dragging;
		const finalPos = getPosition(world, eid);
		const finalX = finalPos?.x ?? state.lastX;
		const finalY = finalPos?.y ?? state.lastY;

		eventBus.emit('dragend', {
			entity: eid,
			x: finalX,
			y: finalY,
			totalDx: finalX - state.startX,
			totalDy: finalY - state.startY,
			cancelled,
		});

		if (!cancelled) {
			eventBus.emit('drop', {
				entity: eid,
				x: finalX,
				y: finalY,
				dropTarget,
			});
		}

		// Reset state
		state.dragging = null;
		state.startX = 0;
		state.startY = 0;
		state.offsetX = 0;
		state.offsetY = 0;
		state.lastX = 0;
		state.lastY = 0;
		state.constraints = {};
		state.verifyCallback = null;
	};

	return {
		/**
		 * Gets the current drag state.
		 */
		getState(): Readonly<DragState> {
			return state;
		},

		/**
		 * Checks if an entity is currently being dragged.
		 */
		isDragging(): boolean {
			return state.dragging !== null;
		},

		/**
		 * Gets the entity currently being dragged.
		 */
		getDraggingEntity(): Entity | null {
			return state.dragging;
		},

		/**
		 * Checks if an entity can be dragged.
		 *
		 * @param world - The ECS world
		 * @param eid - The entity to check
		 */
		canDrag(world: World, eid: Entity): boolean {
			return isDraggable(world, eid);
		},

		/**
		 * Starts dragging an entity.
		 *
		 * @param world - The ECS world
		 * @param eid - The entity to drag
		 * @param mouseX - Current mouse X
		 * @param mouseY - Current mouse Y
		 * @returns True if drag started successfully
		 */
		startDrag(world: World, eid: Entity, mouseX: number, mouseY: number): boolean {
			if (!isDraggable(world, eid)) {
				return false;
			}

			// Already dragging something
			if (state.dragging !== null) {
				return false;
			}

			const pos = getPosition(world, eid);
			if (!pos) {
				return false;
			}

			state.dragging = eid;
			state.startX = pos.x;
			state.startY = pos.y;
			state.offsetX = mouseX - pos.x;
			state.offsetY = mouseY - pos.y;
			state.lastX = pos.x;
			state.lastY = pos.y;
			state.constraints = getDragConstraints(world, eid);
			state.verifyCallback = getDragVerifyCallback(world, eid);

			// Bring to front if configured
			if (state.constraints.bringToFront) {
				const frontZ = state.constraints.frontZIndex ?? 9999;
				setZIndex(world, eid, frontZ);
			}

			eventBus.emit('dragstart', {
				entity: eid,
				startX: pos.x,
				startY: pos.y,
				mouseX,
				mouseY,
			});

			return true;
		},

		/**
		 * Updates the drag position based on mouse movement.
		 *
		 * @param world - The ECS world
		 * @param mouseX - Current mouse X
		 * @param mouseY - Current mouse Y
		 * @returns True if position was updated
		 */
		updateDrag(world: World, mouseX: number, mouseY: number): boolean {
			if (state.dragging === null) {
				return false;
			}

			const eid = state.dragging;

			// Calculate new position
			let newX = mouseX - state.offsetX;
			let newY = mouseY - state.offsetY;

			// Apply constraints
			const constrained = applyConstraints(world, eid, newX, newY, state.constraints);
			newX = constrained.x;
			newY = constrained.y;

			// Calculate delta
			const dx = newX - state.lastX;
			const dy = newY - state.lastY;

			// Skip if no movement
			if (dx === 0 && dy === 0) {
				return false;
			}

			// Call verification callback
			if (state.verifyCallback && !state.verifyCallback(eid, dx, dy)) {
				return false;
			}

			// Update position
			setPosition(world, eid, newX, newY);
			state.lastX = newX;
			state.lastY = newY;

			eventBus.emit('drag', {
				entity: eid,
				x: newX,
				y: newY,
				dx,
				dy,
				mouseX,
				mouseY,
			});

			return true;
		},

		endDrag,

		/**
		 * Cancels the current drag and restores original position.
		 *
		 * @param world - The ECS world
		 */
		cancelDrag(world: World): void {
			if (state.dragging === null) {
				return;
			}

			const eid = state.dragging;

			// Restore original position
			setPosition(world, eid, state.startX, state.startY);

			endDrag(world, null, true);
		},
	};
}

/**
 * Resets all drag-related stores.
 * Useful for testing.
 */
export function resetDragStores(world: World): void {
	getConstraintStore(world).clear();
	getVerifyStore(world).clear();
}
