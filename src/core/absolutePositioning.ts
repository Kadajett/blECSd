/**
 * Absolute positioning helpers for screen-edge anchoring.
 * Provides blessed-compatible aleft, aright, atop, abottom positioning.
 * @module core/absolutePositioning
 */

import { Dimensions, getDimensions, hasDimensions } from '../components/dimensions';
import { getPosition, setAbsolute, setPosition } from '../components/position';
import { getScreen, hasScreenSingleton } from '../components/screen';
import type { Entity, World } from './types';

/**
 * Gets the screen dimensions for absolute positioning calculations.
 * Returns default dimensions if screen not available.
 */
function getScreenDimensions(world: World): { width: number; height: number } {
	if (!hasScreenSingleton(world)) {
		return { width: 80, height: 24 };
	}

	const screen = getScreen(world);
	if (!screen || !hasDimensions(world, screen)) {
		return { width: 80, height: 24 };
	}

	return {
		width: Dimensions.width[screen] as number,
		height: Dimensions.height[screen] as number,
	};
}

/**
 * Sets the absolute left position (distance from left edge of screen).
 *
 * This anchors the element to the left edge of the screen, ignoring parent positioning.
 * Equivalent to blessed's `aleft` property.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param left - Distance from left edge of screen
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsoluteLeft } from 'blecsd';
 *
 * // Position element 10 cells from left edge of screen
 * setAbsoluteLeft(world, entity, 10);
 * ```
 */
export function setAbsoluteLeft(world: World, eid: Entity, left: number): Entity {
	setAbsolute(world, eid, true);
	const pos = getPosition(world, eid);
	const currentY = pos?.y ?? 0; // Preserve Y if available
	setPosition(world, eid, left, currentY);
	return eid;
}

/**
 * Sets the absolute right position (distance from right edge of screen).
 *
 * This anchors the element to the right edge of the screen, ignoring parent positioning.
 * Equivalent to blessed's `aright` property.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param right - Distance from right edge of screen
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsoluteRight } from 'blecsd';
 *
 * // Position element 10 cells from right edge of screen
 * setAbsoluteRight(world, entity, 10);
 * ```
 */
export function setAbsoluteRight(world: World, eid: Entity, right: number): Entity {
	const screen = getScreenDimensions(world);
	const dims = getDimensions(world, eid);
	const width = dims?.width ?? 0;

	setAbsolute(world, eid, true);
	const x = screen.width - right - width;
	const pos = getPosition(world, eid);
	const currentY = pos?.y ?? 0; // Preserve Y if available
	setPosition(world, eid, x, currentY);
	return eid;
}

/**
 * Sets the absolute top position (distance from top edge of screen).
 *
 * This anchors the element to the top edge of the screen, ignoring parent positioning.
 * Equivalent to blessed's `atop` property.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param top - Distance from top edge of screen
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsoluteTop } from 'blecsd';
 *
 * // Position element 5 cells from top edge of screen
 * setAbsoluteTop(world, entity, 5);
 * ```
 */
export function setAbsoluteTop(world: World, eid: Entity, top: number): Entity {
	setAbsolute(world, eid, true);
	const pos = getPosition(world, eid);
	const currentX = pos?.x ?? 0; // Preserve X if available
	setPosition(world, eid, currentX, top);
	return eid;
}

/**
 * Sets the absolute bottom position (distance from bottom edge of screen).
 *
 * This anchors the element to the bottom edge of the screen, ignoring parent positioning.
 * Equivalent to blessed's `abottom` property.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param bottom - Distance from bottom edge of screen
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsoluteBottom } from 'blecsd';
 *
 * // Position element 5 cells from bottom edge of screen
 * setAbsoluteBottom(world, entity, 5);
 * ```
 */
export function setAbsoluteBottom(world: World, eid: Entity, bottom: number): Entity {
	const screen = getScreenDimensions(world);
	const dims = getDimensions(world, eid);
	const height = dims?.height ?? 0;

	setAbsolute(world, eid, true);
	const y = screen.height - bottom - height;
	const pos = getPosition(world, eid);
	const currentX = pos?.x ?? 0; // Preserve X if available
	setPosition(world, eid, currentX, y);
	return eid;
}

/**
 * Sets absolute position from all four edges.
 *
 * This is a convenience function that sets the position based on multiple edge distances.
 * Uses left/top if both left/right or top/bottom are specified.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Edge distances (any combination)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setAbsoluteEdges } from 'blecsd';
 *
 * // Position element 10 from left, 5 from top
 * setAbsoluteEdges(world, entity, { left: 10, top: 5 });
 *
 * // Position element 10 from right, 5 from bottom
 * setAbsoluteEdges(world, entity, { right: 10, bottom: 5 });
 * ```
 */
export function setAbsoluteEdges(
	world: World,
	eid: Entity,
	options: {
		left?: number;
		right?: number;
		top?: number;
		bottom?: number;
	},
): Entity {
	const { left, right, top, bottom } = options;

	// Always set absolute positioning mode
	setAbsolute(world, eid, true);

	// Set horizontal position (prefer left if both specified)
	if (left !== undefined) {
		setAbsoluteLeft(world, eid, left);
	} else if (right !== undefined) {
		setAbsoluteRight(world, eid, right);
	}

	// Set vertical position (prefer top if both specified)
	if (top !== undefined) {
		setAbsoluteTop(world, eid, top);
	} else if (bottom !== undefined) {
		setAbsoluteBottom(world, eid, bottom);
	}

	return eid;
}

/**
 * Gets the current absolute edge distances for an entity.
 *
 * Returns distances from each edge of the screen. Useful for reading back
 * the current positioning of an absolutely-positioned element.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Edge distances or undefined if entity has no position
 *
 * @example
 * ```typescript
 * import { getAbsoluteEdges } from 'blecsd';
 *
 * const edges = getAbsoluteEdges(world, entity);
 * if (edges) {
 *   console.log(`Left: ${edges.left}, Top: ${edges.top}`);
 * }
 * ```
 */
export function getAbsoluteEdges(
	world: World,
	eid: Entity,
): { left: number; right: number; top: number; bottom: number } | undefined {
	const pos = getPosition(world, eid);
	if (!pos || !pos.absolute) {
		return undefined;
	}

	const dims = getDimensions(world, eid);
	const width = dims?.width ?? 0;
	const height = dims?.height ?? 0;

	const screen = getScreenDimensions(world);

	// For absolutely positioned elements, Position.x and Position.y are screen coordinates
	const left = pos.x;
	const right = screen.width - left - width;
	const top = pos.y;
	const bottom = screen.height - top - height;

	return { left, right, top, bottom };
}
