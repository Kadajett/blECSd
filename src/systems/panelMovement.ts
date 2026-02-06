/**
 * Fast panel movement and resizing system.
 *
 * Provides instant panel position updates on input with deferred
 * content re-layout. Uses dirty rect optimization and optional
 * content simplification during drag for 60fps movement.
 *
 * @module systems/panelMovement
 */

import type { Entity } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resize handle positions.
 */
export type ResizeHandle =
	| 'top'
	| 'bottom'
	| 'left'
	| 'right'
	| 'topLeft'
	| 'topRight'
	| 'bottomLeft'
	| 'bottomRight';

/**
 * Panel movement constraints.
 */
export interface PanelConstraints {
	/** Minimum panel width (default: 4) */
	readonly minWidth: number;
	/** Minimum panel height (default: 2) */
	readonly minHeight: number;
	/** Maximum panel width (0 = no limit) */
	readonly maxWidth: number;
	/** Maximum panel height (0 = no limit) */
	readonly maxHeight: number;
	/** Constrain movement to screen bounds */
	readonly constrainToScreen: boolean;
	/** Screen width for constraining */
	readonly screenWidth: number;
	/** Screen height for constraining */
	readonly screenHeight: number;
	/** Snap to grid size (0 = no snap) */
	readonly snapGrid: number;
}

/**
 * Panel movement/resize state.
 */
export interface PanelMoveState {
	/** Currently moving entity */
	readonly entity: Entity | undefined;
	/** Whether a move is in progress */
	readonly isMoving: boolean;
	/** Whether a resize is in progress */
	readonly isResizing: boolean;
	/** Active resize handle */
	readonly resizeHandle: ResizeHandle | undefined;
	/** Starting mouse/cursor position */
	readonly startX: number;
	readonly startY: number;
	/** Starting panel position */
	readonly panelStartX: number;
	readonly panelStartY: number;
	/** Starting panel dimensions */
	readonly panelStartWidth: number;
	readonly panelStartHeight: number;
	/** Whether content layout is deferred (simplified rendering during move) */
	readonly layoutDeferred: boolean;
}

/**
 * Configuration for panel movement behavior.
 */
export interface PanelMoveConfig {
	/** Defer content layout during move for performance (default: true) */
	readonly deferLayout: boolean;
	/** Show resize outline instead of live resize (default: false) */
	readonly outlineResize: boolean;
	/** Number of pixels to move with keyboard (default: 1) */
	readonly keyboardStep: number;
	/** Number of pixels to resize with keyboard (default: 1) */
	readonly keyboardResizeStep: number;
}

/**
 * Dirty rectangle representing changed area.
 */
export interface DirtyRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Result of a panel move or resize operation.
 */
export interface MoveResult {
	/** New position X */
	readonly x: number;
	/** New position Y */
	readonly y: number;
	/** New width (for resize) */
	readonly width: number;
	/** New height (for resize) */
	readonly height: number;
	/** Dirty rectangles that need redrawing */
	readonly dirtyRects: readonly DirtyRect[];
	/** Whether the operation was clamped by constraints */
	readonly clamped: boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONSTRAINTS: PanelConstraints = {
	minWidth: 4,
	minHeight: 2,
	maxWidth: 0,
	maxHeight: 0,
	constrainToScreen: true,
	screenWidth: 80,
	screenHeight: 24,
	snapGrid: 0,
};

const DEFAULT_MOVE_CONFIG: PanelMoveConfig = {
	deferLayout: true,
	outlineResize: false,
	keyboardStep: 1,
	keyboardResizeStep: 1,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial panel move state.
 *
 * @returns Fresh move state
 *
 * @example
 * ```typescript
 * import { createPanelMoveState } from 'blecsd';
 *
 * const moveState = createPanelMoveState();
 * ```
 */
export function createPanelMoveState(): PanelMoveState {
	return {
		entity: undefined,
		isMoving: false,
		isResizing: false,
		resizeHandle: undefined,
		startX: 0,
		startY: 0,
		panelStartX: 0,
		panelStartY: 0,
		panelStartWidth: 0,
		panelStartHeight: 0,
		layoutDeferred: false,
	};
}

/**
 * Creates panel move configuration with defaults.
 *
 * @param config - Partial overrides
 * @returns Full configuration
 */
export function createPanelMoveConfig(config?: Partial<PanelMoveConfig>): PanelMoveConfig {
	return { ...DEFAULT_MOVE_CONFIG, ...config };
}

/**
 * Creates panel constraints with defaults.
 *
 * @param constraints - Partial overrides
 * @returns Full constraints
 */
export function createPanelConstraints(constraints?: Partial<PanelConstraints>): PanelConstraints {
	return { ...DEFAULT_CONSTRAINTS, ...constraints };
}

// =============================================================================
// MOVEMENT OPERATIONS
// =============================================================================

/**
 * Begins a panel move operation.
 *
 * @param state - Current move state
 * @param entity - Entity to move
 * @param mouseX - Starting mouse X
 * @param mouseY - Starting mouse Y
 * @param panelX - Current panel X position
 * @param panelY - Current panel Y position
 * @param panelWidth - Current panel width
 * @param panelHeight - Current panel height
 * @param config - Move configuration
 * @returns Updated state
 *
 * @example
 * ```typescript
 * import { createPanelMoveState, beginMove } from 'blecsd';
 *
 * let state = createPanelMoveState();
 * state = beginMove(state, eid, mouseX, mouseY, panelX, panelY, 30, 10);
 * ```
 */
export function beginMove(
	state: PanelMoveState,
	entity: Entity,
	mouseX: number,
	mouseY: number,
	panelX: number,
	panelY: number,
	panelWidth: number,
	panelHeight: number,
	config?: Partial<PanelMoveConfig>,
): PanelMoveState {
	const cfg = { ...DEFAULT_MOVE_CONFIG, ...config };
	return {
		...state,
		entity,
		isMoving: true,
		isResizing: false,
		resizeHandle: undefined,
		startX: mouseX,
		startY: mouseY,
		panelStartX: panelX,
		panelStartY: panelY,
		panelStartWidth: panelWidth,
		panelStartHeight: panelHeight,
		layoutDeferred: cfg.deferLayout,
	};
}

/**
 * Begins a panel resize operation.
 *
 * @param state - Current move state
 * @param entity - Entity to resize
 * @param handle - Resize handle being dragged
 * @param mouseX - Starting mouse X
 * @param mouseY - Starting mouse Y
 * @param panelX - Current panel X
 * @param panelY - Current panel Y
 * @param panelWidth - Current panel width
 * @param panelHeight - Current panel height
 * @param config - Move configuration
 * @returns Updated state
 */
export function beginResize(
	state: PanelMoveState,
	entity: Entity,
	handle: ResizeHandle,
	mouseX: number,
	mouseY: number,
	panelX: number,
	panelY: number,
	panelWidth: number,
	panelHeight: number,
	config?: Partial<PanelMoveConfig>,
): PanelMoveState {
	const cfg = { ...DEFAULT_MOVE_CONFIG, ...config };
	return {
		...state,
		entity,
		isMoving: false,
		isResizing: true,
		resizeHandle: handle,
		startX: mouseX,
		startY: mouseY,
		panelStartX: panelX,
		panelStartY: panelY,
		panelStartWidth: panelWidth,
		panelStartHeight: panelHeight,
		layoutDeferred: cfg.deferLayout,
	};
}

/**
 * Updates a panel move with new cursor position.
 * Returns the new panel position with constraints applied.
 *
 * @param state - Current move state
 * @param mouseX - Current mouse X
 * @param mouseY - Current mouse Y
 * @param constraints - Panel constraints
 * @returns Move result with new position and dirty rects
 *
 * @example
 * ```typescript
 * import { updateMove, createPanelConstraints } from 'blecsd';
 *
 * const result = updateMove(state, mouseX, mouseY, createPanelConstraints());
 * setPosition(world, eid, result.x, result.y);
 * ```
 */
export function updateMove(
	state: PanelMoveState,
	mouseX: number,
	mouseY: number,
	constraints?: Partial<PanelConstraints>,
): MoveResult {
	if (!state.isMoving) {
		return {
			x: state.panelStartX,
			y: state.panelStartY,
			width: state.panelStartWidth,
			height: state.panelStartHeight,
			dirtyRects: [],
			clamped: false,
		};
	}

	const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
	const dx = mouseX - state.startX;
	const dy = mouseY - state.startY;

	let newX = state.panelStartX + dx;
	let newY = state.panelStartY + dy;
	let clamped = false;

	// Snap to grid
	if (c.snapGrid > 0) {
		newX = Math.round(newX / c.snapGrid) * c.snapGrid;
		newY = Math.round(newY / c.snapGrid) * c.snapGrid;
	}

	// Constrain to screen
	if (c.constrainToScreen) {
		const clampedX = Math.max(0, Math.min(newX, c.screenWidth - state.panelStartWidth));
		const clampedY = Math.max(0, Math.min(newY, c.screenHeight - state.panelStartHeight));
		if (clampedX !== newX || clampedY !== newY) clamped = true;
		newX = clampedX;
		newY = clampedY;
	}

	// Compute dirty rects: old position + new position
	const dirtyRects = computeMoveDirtyRects(
		state.panelStartX + (mouseX - state.startX - dx + dx), // Approximate previous
		state.panelStartY + (mouseY - state.startY - dy + dy),
		newX,
		newY,
		state.panelStartWidth,
		state.panelStartHeight,
	);

	return {
		x: newX,
		y: newY,
		width: state.panelStartWidth,
		height: state.panelStartHeight,
		dirtyRects,
		clamped,
	};
}

/**
 * Updates a panel resize with new cursor position.
 *
 * @param state - Current move state
 * @param mouseX - Current mouse X
 * @param mouseY - Current mouse Y
 * @param constraints - Panel constraints
 * @returns Move result with new dimensions and dirty rects
 */
function applyResizeByHandle(
	handle: ResizeHandle,
	startX: number,
	startY: number,
	startWidth: number,
	startHeight: number,
	dx: number,
	dy: number,
): { x: number; y: number; w: number; h: number } {
	let x = startX;
	let y = startY;
	let w = startWidth;
	let h = startHeight;

	if (handle.includes('right') || handle === 'right') w += dx;
	if (handle.includes('bottom') || handle === 'bottom') h += dy;
	if (handle.includes('left') || handle === 'left') {
		x += dx;
		w -= dx;
	}
	if (handle.includes('top') || handle === 'top') {
		y += dy;
		h -= dy;
	}

	return { x, y, w, h };
}

function applyDimensionConstraints(
	width: number,
	height: number,
	constraints: PanelConstraints,
): { width: number; height: number; clamped: boolean } {
	let w = width;
	let h = height;
	let clamped = false;

	if (w < constraints.minWidth) {
		w = constraints.minWidth;
		clamped = true;
	}
	if (h < constraints.minHeight) {
		h = constraints.minHeight;
		clamped = true;
	}
	if (constraints.maxWidth > 0 && w > constraints.maxWidth) {
		w = constraints.maxWidth;
		clamped = true;
	}
	if (constraints.maxHeight > 0 && h > constraints.maxHeight) {
		h = constraints.maxHeight;
		clamped = true;
	}

	return { width: w, height: h, clamped };
}

function applyGridSnap(
	x: number,
	y: number,
	w: number,
	h: number,
	gridSize: number,
): { x: number; y: number; w: number; h: number } {
	if (gridSize <= 0) return { x, y, w, h };

	return {
		x: Math.round(x / gridSize) * gridSize,
		y: Math.round(y / gridSize) * gridSize,
		w: Math.round(w / gridSize) * gridSize,
		h: Math.round(h / gridSize) * gridSize,
	};
}

function applyScreenConstraints(
	x: number,
	y: number,
	w: number,
	h: number,
	constraints: PanelConstraints,
): { x: number; y: number; w: number; h: number } {
	if (!constraints.constrainToScreen) return { x, y, w, h };

	const newX = Math.max(0, x);
	const newY = Math.max(0, y);
	let newW = w;
	let newH = h;

	if (newX + newW > constraints.screenWidth) newW = constraints.screenWidth - newX;
	if (newY + newH > constraints.screenHeight) newH = constraints.screenHeight - newY;

	return { x: newX, y: newY, w: newW, h: newH };
}

export function updateResize(
	state: PanelMoveState,
	mouseX: number,
	mouseY: number,
	constraints?: Partial<PanelConstraints>,
): MoveResult {
	if (!state.isResizing || !state.resizeHandle) {
		return {
			x: state.panelStartX,
			y: state.panelStartY,
			width: state.panelStartWidth,
			height: state.panelStartHeight,
			dirtyRects: [],
			clamped: false,
		};
	}

	const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
	const dx = mouseX - state.startX;
	const dy = mouseY - state.startY;

	// Apply resize transformation
	let result = applyResizeByHandle(
		state.resizeHandle,
		state.panelStartX,
		state.panelStartY,
		state.panelStartWidth,
		state.panelStartHeight,
		dx,
		dy,
	);

	// Apply size constraints
	const constrained = applyDimensionConstraints(result.w, result.h, c);
	result.w = constrained.width;
	result.h = constrained.height;
	const clamped = constrained.clamped;

	// Apply grid snap
	result = applyGridSnap(result.x, result.y, result.w, result.h, c.snapGrid);

	// Constrain position to screen
	result = applyScreenConstraints(result.x, result.y, result.w, result.h, c);

	const dirtyRects: DirtyRect[] = [
		{
			x: state.panelStartX,
			y: state.panelStartY,
			width: state.panelStartWidth,
			height: state.panelStartHeight,
		},
		{ x: result.x, y: result.y, width: result.w, height: result.h },
	];

	return { x: result.x, y: result.y, width: result.w, height: result.h, dirtyRects, clamped };
}

/**
 * Ends the current move or resize operation.
 *
 * @param state - Current move state
 * @returns Reset state
 */
export function endMoveOrResize(state: PanelMoveState): PanelMoveState {
	return {
		...state,
		isMoving: false,
		isResizing: false,
		resizeHandle: undefined,
		layoutDeferred: false,
	};
}

/**
 * Cancels the current move or resize, returning to original position.
 *
 * @param state - Current move state
 * @returns Object with original position and reset state
 */
export function cancelMoveOrResize(state: PanelMoveState): {
	state: PanelMoveState;
	restoreX: number;
	restoreY: number;
	restoreWidth: number;
	restoreHeight: number;
} {
	return {
		state: createPanelMoveState(),
		restoreX: state.panelStartX,
		restoreY: state.panelStartY,
		restoreWidth: state.panelStartWidth,
		restoreHeight: state.panelStartHeight,
	};
}

// =============================================================================
// KEYBOARD MOVEMENT
// =============================================================================

/**
 * Moves a panel by keyboard step amount.
 *
 * @param x - Current X position
 * @param y - Current Y position
 * @param width - Panel width
 * @param height - Panel height
 * @param direction - Movement direction
 * @param step - Step amount
 * @param constraints - Panel constraints
 * @returns New position
 */
export function keyboardMove(
	x: number,
	y: number,
	width: number,
	height: number,
	direction: 'up' | 'down' | 'left' | 'right',
	step: number,
	constraints?: Partial<PanelConstraints>,
): { x: number; y: number } {
	const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
	let newX = x;
	let newY = y;

	if (direction === 'up') newY -= step;
	if (direction === 'down') newY += step;
	if (direction === 'left') newX -= step;
	if (direction === 'right') newX += step;

	if (c.constrainToScreen) {
		newX = Math.max(0, Math.min(newX, c.screenWidth - width));
		newY = Math.max(0, Math.min(newY, c.screenHeight - height));
	}

	if (c.snapGrid > 0) {
		newX = Math.round(newX / c.snapGrid) * c.snapGrid;
		newY = Math.round(newY / c.snapGrid) * c.snapGrid;
	}

	return { x: newX, y: newY };
}

/**
 * Resizes a panel by keyboard step amount.
 *
 * @param width - Current width
 * @param height - Current height
 * @param direction - Resize direction
 * @param step - Step amount
 * @param constraints - Panel constraints
 * @returns New dimensions
 */
export function keyboardResize(
	width: number,
	height: number,
	direction: 'grow-horizontal' | 'shrink-horizontal' | 'grow-vertical' | 'shrink-vertical',
	step: number,
	constraints?: Partial<PanelConstraints>,
): { width: number; height: number } {
	const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
	let w = width;
	let h = height;

	if (direction === 'grow-horizontal') w += step;
	if (direction === 'shrink-horizontal') w -= step;
	if (direction === 'grow-vertical') h += step;
	if (direction === 'shrink-vertical') h -= step;

	w = Math.max(c.minWidth, w);
	h = Math.max(c.minHeight, h);
	if (c.maxWidth > 0) w = Math.min(c.maxWidth, w);
	if (c.maxHeight > 0) h = Math.min(c.maxHeight, h);

	return { width: w, height: h };
}

/**
 * Detects which resize handle a click position corresponds to.
 *
 * @param clickX - Click X relative to panel
 * @param clickY - Click Y relative to panel
 * @param panelWidth - Panel width
 * @param panelHeight - Panel height
 * @param borderSize - Size of the resize border area (default: 1)
 * @returns The resize handle, or undefined if not on a border
 */
export function detectResizeHandle(
	clickX: number,
	clickY: number,
	panelWidth: number,
	panelHeight: number,
	borderSize = 1,
): ResizeHandle | undefined {
	const onLeft = clickX < borderSize;
	const onRight = clickX >= panelWidth - borderSize;
	const onTop = clickY < borderSize;
	const onBottom = clickY >= panelHeight - borderSize;

	if (onTop && onLeft) return 'topLeft';
	if (onTop && onRight) return 'topRight';
	if (onBottom && onLeft) return 'bottomLeft';
	if (onBottom && onRight) return 'bottomRight';
	if (onTop) return 'top';
	if (onBottom) return 'bottom';
	if (onLeft) return 'left';
	if (onRight) return 'right';

	return undefined;
}

/**
 * Merges overlapping dirty rectangles for efficient redraw.
 *
 * @param rects - Array of dirty rectangles
 * @returns Merged bounding rectangle
 */
export function mergeDirtyRects(rects: readonly DirtyRect[]): DirtyRect | undefined {
	if (rects.length === 0) return undefined;

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = 0;
	let maxY = 0;

	for (const r of rects) {
		minX = Math.min(minX, r.x);
		minY = Math.min(minY, r.y);
		maxX = Math.max(maxX, r.x + r.width);
		maxY = Math.max(maxY, r.y + r.height);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function computeMoveDirtyRects(
	_oldX: number,
	_oldY: number,
	newX: number,
	newY: number,
	width: number,
	height: number,
): DirtyRect[] {
	// Simple approach: mark both old and new bounds as dirty
	return [
		{ x: _oldX, y: _oldY, width, height },
		{ x: newX, y: newY, width, height },
	];
}
