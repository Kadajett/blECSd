/**
 * Layout system for computing entity positions and dimensions.
 * Runs in the LAYOUT phase to pre-compute absolute positions in tree order.
 * @module systems/layoutSystem
 */

import { addComponent, hasComponent, query } from 'bitecs';
import {
	AUTO_DIMENSION,
	Dimensions,
	decodePercentage,
	hasDimensions,
	isPercentage,
} from '../components/dimensions';
import { getChildren, getParent, hasHierarchy, NULL_ENTITY } from '../components/hierarchy';
import { hasPosition, isAbsolute, Position } from '../components/position';
import { getScreen, hasScreenSingleton } from '../components/screen';
import type { Entity, System, World } from '../core/types';

// =============================================================================
// COMPUTED LAYOUT COMPONENT
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Computed Layout component stores the final computed positions and dimensions.
 * This component is written by the layout system and read by the render system.
 *
 * @example
 * ```typescript
 * import { ComputedLayout, getComputedLayout } from 'blecsd';
 *
 * // After layout system runs, computed values are available
 * const layout = getComputedLayout(world, entity);
 * if (layout) {
 *   console.log(`Absolute: (${layout.x}, ${layout.y})`);
 *   console.log(`Size: ${layout.width}x${layout.height}`);
 * }
 * ```
 */
export const ComputedLayout = {
	/** Computed absolute X position (screen column) */
	x: new Float32Array(DEFAULT_CAPACITY),
	/** Computed absolute Y position (screen row) */
	y: new Float32Array(DEFAULT_CAPACITY),
	/** Computed width in cells */
	width: new Float32Array(DEFAULT_CAPACITY),
	/** Computed height in cells */
	height: new Float32Array(DEFAULT_CAPACITY),
	/** Whether layout is valid (0 = needs recompute, 1 = valid) */
	valid: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Computed layout data returned by getComputedLayout.
 */
export interface ComputedLayoutData {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Gets the computed layout of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Computed layout data or undefined if not available
 *
 * @example
 * ```typescript
 * const layout = getComputedLayout(world, entity);
 * if (layout) {
 *   console.log(`Position: (${layout.x}, ${layout.y})`);
 * }
 * ```
 */
export function getComputedLayout(world: World, eid: Entity): ComputedLayoutData | undefined {
	if (!hasComponent(world, eid, ComputedLayout)) {
		return undefined;
	}
	if (ComputedLayout.valid[eid] !== 1) {
		return undefined;
	}
	return {
		x: ComputedLayout.x[eid] as number,
		y: ComputedLayout.y[eid] as number,
		width: ComputedLayout.width[eid] as number,
		height: ComputedLayout.height[eid] as number,
	};
}

/**
 * Checks if an entity has a valid computed layout.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity has a valid computed layout
 */
export function hasComputedLayout(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, ComputedLayout) && ComputedLayout.valid[eid] === 1;
}

/**
 * Invalidates the computed layout of an entity.
 * Call this when position or dimensions change to trigger recalculation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function invalidateLayout(world: World, eid: Entity): void {
	if (hasComponent(world, eid, ComputedLayout)) {
		ComputedLayout.valid[eid] = 0;
	}
}

// =============================================================================
// LAYOUT COMPUTATION HELPERS
// =============================================================================

/**
 * Ensures an entity has the ComputedLayout component.
 */
function ensureComputedLayout(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, ComputedLayout)) {
		addComponent(world, eid, ComputedLayout);
		ComputedLayout.x[eid] = 0;
		ComputedLayout.y[eid] = 0;
		ComputedLayout.width[eid] = 0;
		ComputedLayout.height[eid] = 0;
		ComputedLayout.valid[eid] = 0;
	}
}

/**
 * Gets the screen dimensions as the root container size.
 */
function getScreenDimensions(world: World): { width: number; height: number } {
	if (!hasScreenSingleton(world)) {
		return { width: 80, height: 24 }; // Default fallback
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
 * Resolves a dimension value (absolute, percentage, or auto).
 */
function resolveDimension(
	value: number,
	containerSize: number,
	contentSize: number,
	minConstraint: number,
	maxConstraint: number,
): number {
	let resolved: number;

	if (value === AUTO_DIMENSION) {
		// Auto: use content size
		resolved = contentSize;
	} else if (isPercentage(value)) {
		// Percentage: calculate from container
		const percent = decodePercentage(value);
		resolved = percent !== null ? (percent / 100) * containerSize : 0;
	} else {
		// Absolute value
		resolved = value;
	}

	// Apply constraints
	resolved = Math.max(minConstraint, resolved);
	if (Number.isFinite(maxConstraint)) {
		resolved = Math.min(maxConstraint, resolved);
	}

	return Math.floor(resolved);
}

/**
 * Computes the layout for a single entity.
 * Requires parent layout to be computed first for relative positioning.
 */
function computeEntityLayout(
	world: World,
	eid: Entity,
	parentX: number,
	parentY: number,
	containerWidth: number,
	containerHeight: number,
): void {
	ensureComputedLayout(world, eid);

	// Get entity position
	const posX = hasPosition(world, eid) ? (Position.x[eid] as number) : 0;
	const posY = hasPosition(world, eid) ? (Position.y[eid] as number) : 0;
	const absolute = isAbsolute(world, eid);

	// Calculate absolute position
	let absX: number;
	let absY: number;

	if (absolute) {
		// Absolute positioning: use position directly
		absX = posX;
		absY = posY;
	} else {
		// Relative positioning: add to parent position
		absX = parentX + posX;
		absY = parentY + posY;
	}

	// Get dimensions
	let width = 0;
	let height = 0;

	if (hasDimensions(world, eid)) {
		const rawWidth = Dimensions.width[eid] as number;
		const rawHeight = Dimensions.height[eid] as number;
		const minWidth = Dimensions.minWidth[eid] as number;
		const minHeight = Dimensions.minHeight[eid] as number;
		const maxWidth = Dimensions.maxWidth[eid] as number;
		const maxHeight = Dimensions.maxHeight[eid] as number;
		const shrink = Dimensions.shrink[eid] === 1;

		// For shrink-to-content, we'd need to measure content
		// For now, use a default content size of 0 for auto dimensions
		const contentWidth = shrink ? 0 : containerWidth;
		const contentHeight = shrink ? 0 : containerHeight;

		width = resolveDimension(rawWidth, containerWidth, contentWidth, minWidth, maxWidth);
		height = resolveDimension(rawHeight, containerHeight, contentHeight, minHeight, maxHeight);
	}

	// Clamp to container bounds for relative elements
	if (!absolute) {
		// Ensure element doesn't extend beyond container
		if (absX + width > parentX + containerWidth) {
			width = Math.max(0, parentX + containerWidth - absX);
		}
		if (absY + height > parentY + containerHeight) {
			height = Math.max(0, parentY + containerHeight - absY);
		}
	}

	// Store computed values
	ComputedLayout.x[eid] = absX;
	ComputedLayout.y[eid] = absY;
	ComputedLayout.width[eid] = width;
	ComputedLayout.height[eid] = height;
	ComputedLayout.valid[eid] = 1;
}

/**
 * Computes layout for an entity and all its descendants.
 * Processes in tree order (parents before children).
 */
function computeLayoutTree(
	world: World,
	eid: Entity,
	parentX: number,
	parentY: number,
	containerWidth: number,
	containerHeight: number,
): void {
	// Compute this entity's layout
	computeEntityLayout(world, eid, parentX, parentY, containerWidth, containerHeight);

	// Get computed layout for this entity to use as container for children
	const layout = getComputedLayout(world, eid);
	if (!layout) {
		return;
	}

	// Recursively compute children
	const children = getChildren(world, eid);
	for (const child of children) {
		computeLayoutTree(world, child, layout.x, layout.y, layout.width, layout.height);
	}
}

// =============================================================================
// LAYOUT SYSTEM
// =============================================================================

/**
 * Collects root entities (entities with no parent that have Position).
 */
function getRootEntities(world: World): Entity[] {
	// Query entities with Position component
	const entities = query(world, [Position]);
	const roots: Entity[] = [];

	for (const eid of entities) {
		if (!hasHierarchy(world, eid)) {
			// No hierarchy component = root level
			roots.push(eid);
		} else {
			const parent = getParent(world, eid);
			if (parent === NULL_ENTITY) {
				roots.push(eid);
			}
		}
	}

	return roots;
}

/**
 * Layout system that computes absolute positions for all entities.
 * Runs in tree order (parents before children) to support relative positioning.
 *
 * The system:
 * 1. Finds all root entities (no parent)
 * 2. Computes layout for each root and its descendants
 * 3. Handles percentage dimensions relative to parent
 * 4. Respects min/max constraints
 * 5. Stores results in ComputedLayout component
 *
 * @param world - The ECS world
 * @returns The world (unchanged)
 *
 * @example
 * ```typescript
 * import { layoutSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
 * ```
 */
export const layoutSystem: System = (world: World): World => {
	// Get screen dimensions as the root container
	const screen = getScreenDimensions(world);

	// Find all root entities
	const roots = getRootEntities(world);

	// Compute layout for each root tree
	for (const root of roots) {
		computeLayoutTree(world, root, 0, 0, screen.width, screen.height);
	}

	return world;
};

/**
 * Creates the layout system function.
 * This is an alternative to using the layoutSystem directly for custom configuration.
 *
 * @returns A new layout system function
 *
 * @example
 * ```typescript
 * import { createLayoutSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.LAYOUT, createLayoutSystem());
 * ```
 */
export function createLayoutSystem(): System {
	return layoutSystem;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Forces a full layout recalculation for all entities.
 * Call this after major changes like screen resize.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { invalidateAllLayouts } from 'blecsd';
 *
 * // After terminal resize
 * invalidateAllLayouts(world);
 * ```
 */
export function invalidateAllLayouts(world: World): void {
	const entities = query(world, [Position]);
	for (const eid of entities) {
		if (hasComponent(world, eid, ComputedLayout)) {
			ComputedLayout.valid[eid] = 0;
		}
	}
}

/**
 * Computes layout for a single entity immediately.
 * Useful for getting layout outside the normal system loop.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Computed layout data or undefined if entity lacks Position
 *
 * @example
 * ```typescript
 * import { computeLayoutNow } from 'blecsd';
 *
 * const layout = computeLayoutNow(world, entity);
 * if (layout) {
 *   console.log(`Position: (${layout.x}, ${layout.y})`);
 * }
 * ```
 */
export function computeLayoutNow(world: World, eid: Entity): ComputedLayoutData | undefined {
	if (!hasPosition(world, eid)) {
		return undefined;
	}

	// Get parent layout or screen dimensions
	let parentX = 0;
	let parentY = 0;
	let containerWidth: number;
	let containerHeight: number;

	if (hasHierarchy(world, eid)) {
		const parent = getParent(world, eid);
		if (parent !== NULL_ENTITY) {
			// Ensure parent layout is computed
			const parentLayout = computeLayoutNow(world, parent);
			if (parentLayout) {
				parentX = parentLayout.x;
				parentY = parentLayout.y;
				containerWidth = parentLayout.width;
				containerHeight = parentLayout.height;
			} else {
				const screen = getScreenDimensions(world);
				containerWidth = screen.width;
				containerHeight = screen.height;
			}
		} else {
			const screen = getScreenDimensions(world);
			containerWidth = screen.width;
			containerHeight = screen.height;
		}
	} else {
		const screen = getScreenDimensions(world);
		containerWidth = screen.width;
		containerHeight = screen.height;
	}

	computeEntityLayout(world, eid, parentX, parentY, containerWidth, containerHeight);
	return getComputedLayout(world, eid);
}

/**
 * Gets the computed content bounds for an entity (position + dimensions).
 * Returns the bounding rectangle in screen coordinates.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Bounding rectangle or undefined
 *
 * @example
 * ```typescript
 * import { getComputedBounds } from 'blecsd';
 *
 * const bounds = getComputedBounds(world, entity);
 * if (bounds) {
 *   console.log(`Bounds: (${bounds.left}, ${bounds.top}) to (${bounds.right}, ${bounds.bottom})`);
 * }
 * ```
 */
export function getComputedBounds(
	world: World,
	eid: Entity,
): { left: number; top: number; right: number; bottom: number } | undefined {
	const layout = getComputedLayout(world, eid);
	if (!layout) {
		return undefined;
	}
	return {
		left: layout.x,
		top: layout.y,
		right: layout.x + layout.width - 1,
		bottom: layout.y + layout.height - 1,
	};
}
