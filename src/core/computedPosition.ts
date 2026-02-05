/**
 * Computed position utilities for calculating absolute, relative, and inner positions.
 * These functions compute positions dynamically based on hierarchy and component data.
 * @module core/computedPosition
 */

import { Border, BorderType, hasBorder } from '../components/border';
import { getDimensions, hasDimensions } from '../components/dimensions';
import { getParent, Hierarchy, NULL_ENTITY } from '../components/hierarchy';
import { getPadding } from '../components/padding';
import { getPosition, hasPosition, Position } from '../components/position';
import { hasComponent } from './ecs';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Absolute position data (screen coordinates).
 */
export interface AbsolutePosition {
	/** Absolute left position (screen column) */
	readonly left: number;
	/** Absolute top position (screen row) */
	readonly top: number;
	/** Absolute right position (left + width - 1) */
	readonly right: number;
	/** Absolute bottom position (top + height - 1) */
	readonly bottom: number;
}

/**
 * Relative position data (relative to parent).
 */
export interface RelativePosition {
	/** Left position relative to parent */
	readonly left: number;
	/** Top position relative to parent */
	readonly top: number;
	/** Right position relative to parent (parent.innerWidth - left - width) */
	readonly right: number;
	/** Bottom position relative to parent (parent.innerHeight - top - height) */
	readonly bottom: number;
}

/**
 * Inner position data (inside padding and border).
 */
export interface InnerPosition {
	/** Inner left edge (absolute + border + padding) */
	readonly left: number;
	/** Inner top edge (absolute + border + padding) */
	readonly top: number;
	/** Inner right edge */
	readonly right: number;
	/** Inner bottom edge */
	readonly bottom: number;
}

/**
 * Inner dimensions (content area size).
 */
export interface InnerDimensions {
	/** Inner width (total width - border*2 - padding horizontal) */
	readonly width: number;
	/** Inner height (total height - border*2 - padding vertical) */
	readonly height: number;
}

/**
 * Total padding (all sides combined).
 */
export interface TotalPadding {
	/** Total horizontal padding (left + right) */
	readonly horizontal: number;
	/** Total vertical padding (top + bottom) */
	readonly vertical: number;
	/** Sum of all padding (left + right + top + bottom) */
	readonly total: number;
}

/**
 * Complete computed position data.
 */
export interface ComputedPositionData {
	readonly absolute: AbsolutePosition;
	readonly relative: RelativePosition;
	readonly inner: InnerPosition;
	readonly innerDimensions: InnerDimensions;
	readonly totalPadding: TotalPadding;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the border width for an entity (1 if visible border, 0 otherwise).
 */
function getBorderWidth(world: World, eid: Entity): number {
	if (!hasBorder(world, eid)) {
		return 0;
	}
	// Border type 0 (None) means no visible border
	const borderType = Border.type[eid] as number;
	return borderType === BorderType.None ? 0 : 1;
}

/**
 * Gets the raw dimensions of an entity (width/height from component).
 * Returns 0 for width/height if no Dimensions component.
 */
function getRawDimensions(world: World, eid: Entity): { width: number; height: number } {
	if (!hasDimensions(world, eid)) {
		return { width: 0, height: 0 };
	}
	const dims = getDimensions(world, eid);
	return {
		width: dims?.width ?? 0,
		height: dims?.height ?? 0,
	};
}

/**
 * Gets the inner offset for a parent entity (border + padding).
 * Returns { x, y } offsets to add for positioning inside the parent.
 */
function getParentInnerOffset(world: World, parent: Entity): { x: number; y: number } {
	let x = getBorderWidth(world, parent);
	let y = x;

	const padding = getPadding(world, parent);
	if (padding) {
		x += padding.left;
		y += padding.top;
	}

	return { x, y };
}

/**
 * Accumulates offsets by walking up the hierarchy from an entity.
 * Returns the total x/y offset to reach screen coordinates.
 */
function accumulateParentOffsets(world: World, eid: Entity): { x: number; y: number } {
	let totalX = 0;
	let totalY = 0;

	if (!hasComponent(world, eid, Hierarchy)) {
		return { x: totalX, y: totalY };
	}

	let parent = getParent(world, eid);

	while (parent !== NULL_ENTITY) {
		if (!hasPosition(world, parent)) {
			parent = getParent(world, parent);
			continue;
		}

		const parentPos = getPosition(world, parent);
		if (!parentPos) {
			parent = getParent(world, parent);
			continue;
		}

		totalX += parentPos.x;
		totalY += parentPos.y;

		const offset = getParentInnerOffset(world, parent);
		totalX += offset.x;
		totalY += offset.y;

		// If parent is absolute, stop walking
		if (parentPos.absolute) {
			break;
		}

		parent = getParent(world, parent);
	}

	return { x: totalX, y: totalY };
}

// =============================================================================
// ABSOLUTE POSITION
// =============================================================================

/**
 * Gets the absolute position of an entity in screen coordinates.
 * Walks up the hierarchy, summing positions to get the final screen position.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Absolute position data or undefined if entity lacks required components
 *
 * @example
 * ```typescript
 * import { getAbsolutePosition } from 'blecsd';
 *
 * const absPos = getAbsolutePosition(world, entity);
 * if (absPos) {
 *   console.log(`Screen position: (${absPos.left}, ${absPos.top})`);
 * }
 * ```
 */
export function getAbsolutePosition(world: World, eid: Entity): AbsolutePosition | undefined {
	if (!hasPosition(world, eid)) {
		return undefined;
	}

	const pos = getPosition(world, eid);
	if (!pos) {
		return undefined;
	}

	const dims = getRawDimensions(world, eid);

	// If position is absolute, use it directly
	if (pos.absolute) {
		return {
			left: pos.x,
			top: pos.y,
			right: pos.x + dims.width - 1,
			bottom: pos.y + dims.height - 1,
		};
	}

	// Walk up the hierarchy to compute absolute position
	const offsets = accumulateParentOffsets(world, eid);
	const absX = pos.x + offsets.x;
	const absY = pos.y + offsets.y;

	return {
		left: absX,
		top: absY,
		right: absX + dims.width - 1,
		bottom: absY + dims.height - 1,
	};
}

// =============================================================================
// RELATIVE POSITION
// =============================================================================

/**
 * Gets the relative position of an entity within its parent.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Relative position data or undefined if entity lacks required components
 *
 * @example
 * ```typescript
 * import { getRelativePosition } from 'blecsd';
 *
 * const relPos = getRelativePosition(world, entity);
 * if (relPos) {
 *   console.log(`Position in parent: (${relPos.left}, ${relPos.top})`);
 * }
 * ```
 */
export function getRelativePosition(world: World, eid: Entity): RelativePosition | undefined {
	if (!hasPosition(world, eid)) {
		return undefined;
	}

	const pos = getPosition(world, eid);
	if (!pos) {
		return undefined;
	}

	const dims = getRawDimensions(world, eid);

	// Get parent's inner dimensions to calculate right/bottom
	let parentInnerWidth = 0;
	let parentInnerHeight = 0;

	if (hasComponent(world, eid, Hierarchy)) {
		const parent = getParent(world, eid);
		if (parent !== NULL_ENTITY) {
			const parentInner = getInnerDimensions(world, parent);
			if (parentInner) {
				parentInnerWidth = parentInner.width;
				parentInnerHeight = parentInner.height;
			}
		}
	}

	return {
		left: pos.x,
		top: pos.y,
		right: Math.max(0, parentInnerWidth - pos.x - dims.width),
		bottom: Math.max(0, parentInnerHeight - pos.y - dims.height),
	};
}

// =============================================================================
// INNER POSITION
// =============================================================================

/**
 * Gets the inner position of an entity (inside padding and border).
 * This is where content should be rendered.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Inner position data or undefined if entity lacks required components
 *
 * @example
 * ```typescript
 * import { getInnerPosition } from 'blecsd';
 *
 * const innerPos = getInnerPosition(world, entity);
 * if (innerPos) {
 *   console.log(`Content area: (${innerPos.left}, ${innerPos.top})`);
 * }
 * ```
 */
export function getInnerPosition(world: World, eid: Entity): InnerPosition | undefined {
	const absPos = getAbsolutePosition(world, eid);
	if (!absPos) {
		return undefined;
	}

	const borderWidth = getBorderWidth(world, eid);
	const padding = getPadding(world, eid);

	const paddingLeft = padding?.left ?? 0;
	const paddingTop = padding?.top ?? 0;
	const paddingRight = padding?.right ?? 0;
	const paddingBottom = padding?.bottom ?? 0;

	return {
		left: absPos.left + borderWidth + paddingLeft,
		top: absPos.top + borderWidth + paddingTop,
		right: absPos.right - borderWidth - paddingRight,
		bottom: absPos.bottom - borderWidth - paddingBottom,
	};
}

// =============================================================================
// INNER DIMENSIONS
// =============================================================================

/**
 * Gets the inner dimensions of an entity (content area size).
 * This is the size minus borders and padding.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Inner dimensions or undefined if entity lacks Dimensions component
 *
 * @example
 * ```typescript
 * import { getInnerDimensions } from 'blecsd';
 *
 * const innerDims = getInnerDimensions(world, entity);
 * if (innerDims) {
 *   console.log(`Content area size: ${innerDims.width}x${innerDims.height}`);
 * }
 * ```
 */
export function getInnerDimensions(world: World, eid: Entity): InnerDimensions | undefined {
	if (!hasDimensions(world, eid)) {
		return undefined;
	}

	const dims = getDimensions(world, eid);
	if (!dims) {
		return undefined;
	}

	const borderWidth = getBorderWidth(world, eid);
	const padding = getPadding(world, eid);

	const horizontalPadding = (padding?.left ?? 0) + (padding?.right ?? 0);
	const verticalPadding = (padding?.top ?? 0) + (padding?.bottom ?? 0);

	return {
		width: Math.max(0, dims.width - borderWidth * 2 - horizontalPadding),
		height: Math.max(0, dims.height - borderWidth * 2 - verticalPadding),
	};
}

// =============================================================================
// TOTAL PADDING
// =============================================================================

/**
 * Gets the total padding of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Total padding data or default zeros if no Padding component
 *
 * @example
 * ```typescript
 * import { getTotalPadding } from 'blecsd';
 *
 * const totalPad = getTotalPadding(world, entity);
 * console.log(`Total padding: ${totalPad.total}`);
 * ```
 */
export function getTotalPadding(world: World, eid: Entity): TotalPadding {
	const padding = getPadding(world, eid);

	const left = padding?.left ?? 0;
	const right = padding?.right ?? 0;
	const top = padding?.top ?? 0;
	const bottom = padding?.bottom ?? 0;

	return {
		horizontal: left + right,
		vertical: top + bottom,
		total: left + right + top + bottom,
	};
}

// =============================================================================
// SETTERS (CONVERT TO RELATIVE)
// =============================================================================

/**
 * Sets an entity's position based on an absolute screen position.
 * Converts the absolute position to a relative position based on the parent hierarchy.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param absX - Absolute X (screen column)
 * @param absY - Absolute Y (screen row)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsolutePosition } from 'blecsd';
 *
 * // Position entity at screen position (10, 5)
 * setAbsolutePosition(world, entity, 10, 5);
 * ```
 */
export function setAbsolutePosition(world: World, eid: Entity, absX: number, absY: number): Entity {
	// Calculate offsets from parent hierarchy
	const offsets = accumulateParentOffsets(world, eid);

	// Convert absolute to relative by subtracting parent offsets
	const relX = absX - offsets.x;
	const relY = absY - offsets.y;

	// Set the relative position
	Position.x[eid] = relX;
	Position.y[eid] = relY;

	return eid;
}

/**
 * Sets an entity's position based on relative-to-parent values.
 * Supports setting left/top (position from start) or right/bottom (position from end).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Position options (left/right/top/bottom)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setRelativePosition } from 'blecsd';
 *
 * // Position 10 from left, 5 from top
 * setRelativePosition(world, entity, { left: 10, top: 5 });
 *
 * // Position 5 from right edge
 * setRelativePosition(world, entity, { right: 5, top: 0 });
 * ```
 */
export function setRelativePosition(
	world: World,
	eid: Entity,
	options: {
		left?: number;
		right?: number;
		top?: number;
		bottom?: number;
	},
): Entity {
	const dims = getRawDimensions(world, eid);

	// Get parent's inner dimensions
	let parentInnerWidth = 0;
	let parentInnerHeight = 0;

	if (hasComponent(world, eid, Hierarchy)) {
		const parent = getParent(world, eid);
		if (parent !== NULL_ENTITY) {
			const parentInner = getInnerDimensions(world, parent);
			if (parentInner) {
				parentInnerWidth = parentInner.width;
				parentInnerHeight = parentInner.height;
			}
		}
	}

	// Calculate X position
	let x: number;
	if (options.left !== undefined) {
		x = options.left;
	} else if (options.right !== undefined) {
		x = parentInnerWidth - dims.width - options.right;
	} else {
		x = Position.x[eid] as number;
	}

	// Calculate Y position
	let y: number;
	if (options.top !== undefined) {
		y = options.top;
	} else if (options.bottom !== undefined) {
		y = parentInnerHeight - dims.height - options.bottom;
	} else {
		y = Position.y[eid] as number;
	}

	Position.x[eid] = x;
	Position.y[eid] = y;

	return eid;
}

// =============================================================================
// COMPLETE COMPUTED POSITION
// =============================================================================

/**
 * Gets all computed position data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Complete computed position data or undefined if entity lacks required components
 *
 * @example
 * ```typescript
 * import { getComputedPosition } from 'blecsd';
 *
 * const computed = getComputedPosition(world, entity);
 * if (computed) {
 *   console.log(`Absolute: (${computed.absolute.left}, ${computed.absolute.top})`);
 *   console.log(`Inner size: ${computed.innerDimensions.width}x${computed.innerDimensions.height}`);
 * }
 * ```
 */
export function getComputedPosition(world: World, eid: Entity): ComputedPositionData | undefined {
	const absolute = getAbsolutePosition(world, eid);
	if (!absolute) {
		return undefined;
	}

	const relative = getRelativePosition(world, eid);
	if (!relative) {
		return undefined;
	}

	const inner = getInnerPosition(world, eid);
	if (!inner) {
		return undefined;
	}

	const innerDimensions = getInnerDimensions(world, eid) ?? { width: 0, height: 0 };
	const totalPadding = getTotalPadding(world, eid);

	return {
		absolute,
		relative,
		inner,
		innerDimensions,
		totalPadding,
	};
}

// =============================================================================
// POINT TESTING
// =============================================================================

/**
 * Checks if a screen point is within an entity's bounds.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @returns true if the point is within the entity's bounds
 *
 * @example
 * ```typescript
 * import { isPointInEntity } from 'blecsd';
 *
 * if (isPointInEntity(world, entity, mouseX, mouseY)) {
 *   console.log('Point is inside entity');
 * }
 * ```
 */
export function isPointInEntity(world: World, eid: Entity, x: number, y: number): boolean {
	const absPos = getAbsolutePosition(world, eid);
	if (!absPos) {
		return false;
	}

	return x >= absPos.left && x <= absPos.right && y >= absPos.top && y <= absPos.bottom;
}

/**
 * Checks if a screen point is within an entity's inner bounds (content area).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @returns true if the point is within the entity's inner bounds
 *
 * @example
 * ```typescript
 * import { isPointInInnerBounds } from 'blecsd';
 *
 * if (isPointInInnerBounds(world, entity, mouseX, mouseY)) {
 *   console.log('Point is inside content area');
 * }
 * ```
 */
export function isPointInInnerBounds(world: World, eid: Entity, x: number, y: number): boolean {
	const innerPos = getInnerPosition(world, eid);
	if (!innerPos) {
		return false;
	}

	return x >= innerPos.left && x <= innerPos.right && y >= innerPos.top && y <= innerPos.bottom;
}
