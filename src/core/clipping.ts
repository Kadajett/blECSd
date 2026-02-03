/**
 * Element Clipping System
 *
 * Provides clipping functionality for elements that exceed their parent bounds.
 * Supports overflow modes: hidden (clip), visible (no clip), and scroll (clip with scrolling).
 *
 * @module core/clipping
 *
 * @example
 * ```typescript
 * import {
 *   getClipRect,
 *   isPointVisible,
 *   intersectClipRects,
 *   Overflow,
 *   setOverflow,
 * } from 'blecsd';
 *
 * // Set overflow mode on entity
 * setOverflow(world, container, Overflow.HIDDEN);
 *
 * // Get clip rect for an entity
 * const clipRect = getClipRect(world, entity);
 *
 * // Check if a point is visible
 * if (isPointVisible(clipRect, x, y)) {
 *   // Point is within bounds
 * }
 * ```
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from './types';
import { getParent, NULL_ENTITY } from '../components/hierarchy';
import { ComputedLayout, hasComputedLayout } from '../systems/layoutSystem';
import { hasBorderVisible, Border } from '../components/border';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Overflow behavior modes.
 */
export const Overflow = {
	/** Content that exceeds bounds is clipped (default) */
	HIDDEN: 0,
	/** Content is visible even if it exceeds bounds */
	VISIBLE: 1,
	/** Content is clipped but can be scrolled */
	SCROLL: 2,
} as const;

export type OverflowValue = (typeof Overflow)[keyof typeof Overflow];

// =============================================================================
// CLIPPING COMPONENT
// =============================================================================

/**
 * Clipping component store for overflow settings.
 *
 * @example
 * ```typescript
 * import { Clipping, setOverflow, getOverflow } from 'blecsd';
 *
 * setOverflow(world, container, Overflow.HIDDEN);
 * const mode = getOverflow(world, container);
 * ```
 */
export const Clipping = {
	/** Overflow mode (0=hidden, 1=visible, 2=scroll) */
	overflow: new Uint8Array(DEFAULT_CAPACITY),
	/** Overflow X mode (if different from general overflow) */
	overflowX: new Uint8Array(DEFAULT_CAPACITY),
	/** Overflow Y mode (if different from general overflow) */
	overflowY: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether overflow X/Y are set independently */
	hasIndependentOverflow: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * A clipping rectangle defining visible bounds.
 */
export interface ClipRect {
	/** Left edge X coordinate (inclusive) */
	readonly x1: number;
	/** Top edge Y coordinate (inclusive) */
	readonly y1: number;
	/** Right edge X coordinate (exclusive) */
	readonly x2: number;
	/** Bottom edge Y coordinate (exclusive) */
	readonly y2: number;
}

/**
 * Clipping data returned by getClipping.
 */
export interface ClippingData {
	readonly overflow: OverflowValue;
	readonly overflowX: OverflowValue;
	readonly overflowY: OverflowValue;
}

/**
 * Options for setting overflow.
 */
export interface ClippingOptions {
	/** General overflow mode (applies to both axes) */
	overflow?: OverflowValue;
	/** Horizontal overflow mode */
	overflowX?: OverflowValue;
	/** Vertical overflow mode */
	overflowY?: OverflowValue;
}

// =============================================================================
// COMPONENT FUNCTIONS
// =============================================================================

/**
 * Ensures an entity has the Clipping component.
 */
function ensureClipping(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Clipping)) {
		addComponent(world, eid, Clipping);
		Clipping.overflow[eid] = Overflow.HIDDEN;
		Clipping.overflowX[eid] = Overflow.HIDDEN;
		Clipping.overflowY[eid] = Overflow.HIDDEN;
		Clipping.hasIndependentOverflow[eid] = 0;
	}
}

/**
 * Checks if an entity has the Clipping component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Clipping component
 */
export function hasClipping(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Clipping);
}

/**
 * Sets the overflow mode for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Clipping options or single overflow value
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * // Set both axes to hidden
 * setOverflow(world, container, Overflow.HIDDEN);
 *
 * // Or use options object
 * setOverflow(world, container, { overflow: Overflow.HIDDEN });
 *
 * // Set independent overflow per axis
 * setOverflow(world, container, {
 *   overflowX: Overflow.SCROLL,
 *   overflowY: Overflow.HIDDEN,
 * });
 * ```
 */
export function setOverflow(
	world: World,
	eid: Entity,
	options: ClippingOptions | OverflowValue,
): Entity {
	ensureClipping(world, eid);

	if (typeof options === 'number') {
		// Single overflow value for both axes
		Clipping.overflow[eid] = options;
		Clipping.overflowX[eid] = options;
		Clipping.overflowY[eid] = options;
		Clipping.hasIndependentOverflow[eid] = 0;
	} else {
		// Options object
		if (options.overflow !== undefined) {
			Clipping.overflow[eid] = options.overflow;
			Clipping.overflowX[eid] = options.overflow;
			Clipping.overflowY[eid] = options.overflow;
		}
		if (options.overflowX !== undefined) {
			Clipping.overflowX[eid] = options.overflowX;
			Clipping.hasIndependentOverflow[eid] = 1;
		}
		if (options.overflowY !== undefined) {
			Clipping.overflowY[eid] = options.overflowY;
			Clipping.hasIndependentOverflow[eid] = 1;
		}
	}

	return eid;
}

/**
 * Gets the overflow mode for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The overflow value, or HIDDEN if no Clipping component
 */
export function getOverflow(world: World, eid: Entity): OverflowValue {
	if (!hasComponent(world, eid, Clipping)) {
		return Overflow.HIDDEN;
	}
	return Clipping.overflow[eid] as OverflowValue;
}

/**
 * Gets the full clipping data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Clipping data or undefined if no Clipping component
 */
export function getClipping(world: World, eid: Entity): ClippingData | undefined {
	if (!hasComponent(world, eid, Clipping)) {
		return undefined;
	}
	return {
		overflow: Clipping.overflow[eid] as OverflowValue,
		overflowX: Clipping.overflowX[eid] as OverflowValue,
		overflowY: Clipping.overflowY[eid] as OverflowValue,
	};
}

// =============================================================================
// CLIP RECT FUNCTIONS
// =============================================================================

/**
 * Creates a clip rect from bounds.
 *
 * @param x - Left edge
 * @param y - Top edge
 * @param width - Width
 * @param height - Height
 * @returns A ClipRect
 */
export function createClipRect(x: number, y: number, width: number, height: number): ClipRect {
	return {
		x1: x,
		y1: y,
		x2: x + width,
		y2: y + height,
	};
}

/**
 * Creates an infinite clip rect (no clipping).
 *
 * @returns A ClipRect with infinite bounds
 */
export function createInfiniteClipRect(): ClipRect {
	return {
		x1: -Infinity,
		y1: -Infinity,
		x2: Infinity,
		y2: Infinity,
	};
}

/**
 * Checks if a clip rect is empty (no visible area).
 *
 * @param rect - The clip rect to check
 * @returns true if the rect has no visible area
 */
export function isClipRectEmpty(rect: ClipRect): boolean {
	return rect.x1 >= rect.x2 || rect.y1 >= rect.y2;
}

/**
 * Checks if a point is visible within a clip rect.
 *
 * @param rect - The clip rect
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if the point is within the clip rect
 *
 * @example
 * ```typescript
 * const clipRect = getClipRect(world, entity);
 * if (isPointVisible(clipRect, mouseX, mouseY)) {
 *   // Handle click
 * }
 * ```
 */
export function isPointVisible(rect: ClipRect, x: number, y: number): boolean {
	return x >= rect.x1 && x < rect.x2 && y >= rect.y1 && y < rect.y2;
}

/**
 * Checks if a rect overlaps with a clip rect.
 *
 * @param clipRect - The clip rect
 * @param x - Left edge of test rect
 * @param y - Top edge of test rect
 * @param width - Width of test rect
 * @param height - Height of test rect
 * @returns true if the rects overlap
 */
export function isRectVisible(
	clipRect: ClipRect,
	x: number,
	y: number,
	width: number,
	height: number,
): boolean {
	return x < clipRect.x2 && x + width > clipRect.x1 && y < clipRect.y2 && y + height > clipRect.y1;
}

/**
 * Computes the intersection of two clip rects.
 *
 * @param a - First clip rect
 * @param b - Second clip rect
 * @returns The intersection clip rect (may be empty)
 *
 * @example
 * ```typescript
 * const parentClip = getClipRect(world, parent);
 * const childClip = getClipRect(world, child);
 * const finalClip = intersectClipRects(parentClip, childClip);
 * ```
 */
export function intersectClipRects(a: ClipRect, b: ClipRect): ClipRect {
	return {
		x1: Math.max(a.x1, b.x1),
		y1: Math.max(a.y1, b.y1),
		x2: Math.min(a.x2, b.x2),
		y2: Math.min(a.y2, b.y2),
	};
}

/**
 * Clamps a point to be within a clip rect.
 *
 * @param rect - The clip rect
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Clamped coordinates
 */
export function clampToClipRect(
	rect: ClipRect,
	x: number,
	y: number,
): { x: number; y: number } {
	return {
		x: Math.max(rect.x1, Math.min(rect.x2 - 1, x)),
		y: Math.max(rect.y1, Math.min(rect.y2 - 1, y)),
	};
}

/**
 * Gets the width of a clip rect.
 *
 * @param rect - The clip rect
 * @returns Width (may be negative if empty)
 */
export function getClipRectWidth(rect: ClipRect): number {
	return rect.x2 - rect.x1;
}

/**
 * Gets the height of a clip rect.
 *
 * @param rect - The clip rect
 * @returns Height (may be negative if empty)
 */
export function getClipRectHeight(rect: ClipRect): number {
	return rect.y2 - rect.y1;
}

// =============================================================================
// ENTITY CLIP RECT CALCULATION
// =============================================================================

/**
 * Gets border thickness for an entity.
 */
function getEntityBorderThickness(
	world: World,
	eid: Entity,
): { top: number; right: number; bottom: number; left: number } {
	if (!hasBorderVisible(world, eid)) {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	return {
		top: Border.top[eid] === 1 ? 1 : 0,
		right: Border.right[eid] === 1 ? 1 : 0,
		bottom: Border.bottom[eid] === 1 ? 1 : 0,
		left: Border.left[eid] === 1 ? 1 : 0,
	};
}

/**
 * Gets the entity's own bounds as a clip rect.
 */
function getEntityOwnClipRect(world: World, eid: Entity): ClipRect | null {
	if (!hasComputedLayout(world, eid)) {
		return null;
	}

	const x = ComputedLayout.x[eid] as number;
	const y = ComputedLayout.y[eid] as number;
	const width = ComputedLayout.width[eid] as number;
	const height = ComputedLayout.height[eid] as number;

	// Account for border (content area is inside border)
	const border = getEntityBorderThickness(world, eid);

	return {
		x1: x + border.left,
		y1: y + border.top,
		x2: x + width - border.right,
		y2: y + height - border.bottom,
	};
}

/**
 * Gets the clip rect for an entity, considering parent hierarchy.
 *
 * The clip rect is the intersection of:
 * 1. The entity's own bounds (if overflow is not VISIBLE)
 * 2. All ancestor clip rects (recursively)
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The effective clip rect for rendering
 *
 * @example
 * ```typescript
 * const clipRect = getClipRect(world, entity);
 *
 * // Use when rendering content
 * for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
 *   if (y < clipRect.y1 || y >= clipRect.y2) continue;
 *   for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
 *     if (x < clipRect.x1 || x >= clipRect.x2) continue;
 *     // Render cell at x, y
 *   }
 * }
 * ```
 */
export function getClipRect(world: World, eid: Entity): ClipRect {
	// Start with infinite bounds
	let clipRect = createInfiniteClipRect();

	// Walk up the hierarchy
	let current: number = eid;

	while (current !== NULL_ENTITY) {
		const overflow = getOverflow(world, current as Entity);

		// If this entity clips (not VISIBLE), include its bounds
		if (overflow !== Overflow.VISIBLE) {
			const entityClip = getEntityOwnClipRect(world, current as Entity);
			if (entityClip) {
				clipRect = intersectClipRects(clipRect, entityClip);
			}
		}

		// Move to parent
		const parent = getParent(world, current as Entity);
		current = parent ?? NULL_ENTITY;
	}

	return clipRect;
}

/**
 * Gets the clip rect for an entity relative to a specific ancestor.
 * Useful for nested rendering contexts.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param ancestor - The ancestor entity to stop at
 * @returns The clip rect up to (but not including) the ancestor
 */
export function getClipRectToAncestor(
	world: World,
	eid: Entity,
	ancestor: Entity,
): ClipRect {
	let clipRect = createInfiniteClipRect();
	let current: number = eid;

	while (current !== NULL_ENTITY && current !== ancestor) {
		const overflow = getOverflow(world, current as Entity);

		if (overflow !== Overflow.VISIBLE) {
			const entityClip = getEntityOwnClipRect(world, current as Entity);
			if (entityClip) {
				clipRect = intersectClipRects(clipRect, entityClip);
			}
		}

		const parent = getParent(world, current as Entity);
		current = parent ?? NULL_ENTITY;
	}

	return clipRect;
}

/**
 * Checks if an entity should clip its content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity clips content
 */
export function shouldClipContent(world: World, eid: Entity): boolean {
	return getOverflow(world, eid) !== Overflow.VISIBLE;
}

// =============================================================================
// CLIP STACK FOR RENDERING
// =============================================================================

/**
 * Clip stack for managing nested clip contexts during rendering.
 */
export interface ClipStack {
	readonly stack: ClipRect[];
	readonly current: ClipRect;
}

/**
 * Creates a new clip stack.
 *
 * @returns A new ClipStack
 */
export function createClipStack(): ClipStack {
	return {
		stack: [],
		current: createInfiniteClipRect(),
	};
}

/**
 * Pushes a clip rect onto the stack.
 * The effective clip becomes the intersection with the new rect.
 *
 * @param stack - The clip stack
 * @param rect - The clip rect to push
 * @returns A new ClipStack with the rect pushed
 *
 * @example
 * ```typescript
 * let clipStack = createClipStack();
 *
 * // When entering a container
 * clipStack = pushClipRect(clipStack, containerClipRect);
 *
 * // Render children...
 *
 * // When leaving the container
 * clipStack = popClipRect(clipStack);
 * ```
 */
export function pushClipRect(stack: ClipStack, rect: ClipRect): ClipStack {
	const newStack = [...stack.stack, stack.current];
	const newCurrent = intersectClipRects(stack.current, rect);

	return {
		stack: newStack,
		current: newCurrent,
	};
}

/**
 * Pops a clip rect from the stack.
 *
 * @param stack - The clip stack
 * @returns A new ClipStack with the top rect popped
 */
export function popClipRect(stack: ClipStack): ClipStack {
	if (stack.stack.length === 0) {
		return stack;
	}

	const newStack = stack.stack.slice(0, -1);
	const previous = stack.stack[stack.stack.length - 1];

	return {
		stack: newStack,
		current: previous ?? createInfiniteClipRect(),
	};
}

/**
 * Gets the current effective clip rect from the stack.
 *
 * @param stack - The clip stack
 * @returns The current clip rect
 */
export function getCurrentClip(stack: ClipStack): ClipRect {
	return stack.current;
}
