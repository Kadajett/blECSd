/**
 * Dimensions component for entity sizing in the terminal grid.
 * @module components/dimensions
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Special value indicating "auto" (content-based) dimension.
 * When used, the dimension is calculated based on content.
 */
export const AUTO_DIMENSION = -1;

/**
 * Encodes a percentage value for storage in typed arrays.
 * Percentages are stored as negative values: -2 = 0%, -102 = 100%
 *
 * @param percent - Percentage value (0-100)
 * @returns Encoded value for storage
 *
 * @example
 * ```typescript
 * const encoded = encodePercentage(50); // Returns -52
 * ```
 */
export function encodePercentage(percent: number): number {
	return -(percent + 2);
}

/**
 * Decodes a percentage value from typed array storage.
 *
 * @param value - Encoded value from storage
 * @returns Percentage value (0-100) or null if not a percentage
 *
 * @example
 * ```typescript
 * const percent = decodePercentage(-52); // Returns 50
 * const notPercent = decodePercentage(100); // Returns null
 * ```
 */
export function decodePercentage(value: number): number | null {
	if (value >= AUTO_DIMENSION) {
		return null;
	}
	// Use Math.abs to avoid -0 when decoding 0%
	const result = -(value + 2);
	return result === 0 ? 0 : result;
}

/**
 * Checks if a value represents a percentage.
 *
 * @param value - Value to check
 * @returns true if the value is an encoded percentage
 */
export function isPercentage(value: number): boolean {
	return value < AUTO_DIMENSION;
}

/**
 * Dimensions component store using SoA (Structure of Arrays) for performance.
 *
 * - `width`, `height`: Size in terminal cells (floats), or encoded percentages
 * - `minWidth`, `minHeight`: Minimum size constraints
 * - `maxWidth`, `maxHeight`: Maximum size constraints
 * - `shrink`: Whether to shrink to content (0=no, 1=yes)
 *
 * Percentage values are encoded as negative numbers: -2 = 0%, -102 = 100%
 * Use `encodePercentage()` and `decodePercentage()` for conversion.
 *
 * @example
 * ```typescript
 * import { Dimensions, setDimensions, getDimensions } from 'blecsd';
 *
 * setDimensions(world, entity, 80, 24);
 *
 * const dims = getDimensions(world, entity);
 * console.log(dims.width, dims.height); // 80, 24
 * ```
 */
export const Dimensions = {
	/** Width in terminal cells (or encoded percentage) */
	width: new Float32Array(DEFAULT_CAPACITY),
	/** Height in terminal cells (or encoded percentage) */
	height: new Float32Array(DEFAULT_CAPACITY),
	/** Minimum width constraint */
	minWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Minimum height constraint */
	minHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum width constraint */
	maxWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Maximum height constraint */
	maxHeight: new Float32Array(DEFAULT_CAPACITY),
	/** 0 = fixed size, 1 = shrink to content */
	shrink: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Dimensions data returned by getDimensions.
 */
export interface DimensionsData {
	readonly width: number;
	readonly height: number;
	readonly minWidth: number;
	readonly minHeight: number;
	readonly maxWidth: number;
	readonly maxHeight: number;
	readonly shrink: boolean;
}

/**
 * Constraints data for min/max dimensions.
 */
export interface DimensionConstraints {
	readonly minWidth?: number;
	readonly minHeight?: number;
	readonly maxWidth?: number;
	readonly maxHeight?: number;
}

/**
 * Parses a dimension value into a number for storage.
 *
 * @param value - Dimension value (number, percentage string, or 'auto')
 * @returns Numeric value for storage
 */
function parseDimensionValue(value: DimensionValue): number {
	if (value === 'auto') {
		return AUTO_DIMENSION;
	}
	if (typeof value === 'string') {
		// Handle percentage strings like "50%"
		const percent = Number.parseFloat(value);
		return encodePercentage(percent);
	}
	return value;
}

/**
 * Sets the dimensions of an entity.
 * Adds the Dimensions component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param width - Width value (number, percentage string like "50%", or "auto")
 * @param height - Height value (number, percentage string like "50%", or "auto")
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setDimensions } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Fixed size
 * setDimensions(world, entity, 80, 24);
 *
 * // Percentage width
 * setDimensions(world, entity, '50%', 24);
 *
 * // Auto height
 * setDimensions(world, entity, 80, 'auto');
 * ```
 */
export function setDimensions(
	world: World,
	eid: Entity,
	width: DimensionValue,
	height: DimensionValue,
): Entity {
	if (!hasComponent(world, eid, Dimensions)) {
		addComponent(world, eid, Dimensions);
		// Initialize all values to defaults
		Dimensions.minWidth[eid] = 0;
		Dimensions.minHeight[eid] = 0;
		Dimensions.maxWidth[eid] = Number.POSITIVE_INFINITY;
		Dimensions.maxHeight[eid] = Number.POSITIVE_INFINITY;
		Dimensions.shrink[eid] = 0;
	}
	Dimensions.width[eid] = parseDimensionValue(width);
	Dimensions.height[eid] = parseDimensionValue(height);
	return eid;
}

/**
 * Gets the dimensions data of an entity.
 * Returns undefined if the entity doesn't have a Dimensions component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Dimensions data or undefined
 *
 * @example
 * ```typescript
 * import { getDimensions } from 'blecsd';
 *
 * const dims = getDimensions(world, entity);
 * if (dims) {
 *   console.log(`Size: ${dims.width}x${dims.height}`);
 * }
 * ```
 */
export function getDimensions(world: World, eid: Entity): DimensionsData | undefined {
	if (!hasComponent(world, eid, Dimensions)) {
		return undefined;
	}
	return {
		width: Dimensions.width[eid] as number,
		height: Dimensions.height[eid] as number,
		minWidth: Dimensions.minWidth[eid] as number,
		minHeight: Dimensions.minHeight[eid] as number,
		maxWidth: Dimensions.maxWidth[eid] as number,
		maxHeight: Dimensions.maxHeight[eid] as number,
		shrink: Dimensions.shrink[eid] === 1,
	};
}

/**
 * Sets dimension constraints (min/max) for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param constraints - Constraint values to set
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setConstraints } from 'blecsd';
 *
 * setConstraints(world, entity, {
 *   minWidth: 10,
 *   maxWidth: 100,
 *   minHeight: 5,
 * });
 * ```
 */
export function setConstraints(
	world: World,
	eid: Entity,
	constraints: DimensionConstraints,
): Entity {
	if (!hasComponent(world, eid, Dimensions)) {
		addComponent(world, eid, Dimensions);
		// Initialize all values to defaults
		Dimensions.width[eid] = AUTO_DIMENSION;
		Dimensions.height[eid] = AUTO_DIMENSION;
		Dimensions.minWidth[eid] = 0;
		Dimensions.minHeight[eid] = 0;
		Dimensions.maxWidth[eid] = Number.POSITIVE_INFINITY;
		Dimensions.maxHeight[eid] = Number.POSITIVE_INFINITY;
		Dimensions.shrink[eid] = 0;
	}
	if (constraints.minWidth !== undefined) {
		Dimensions.minWidth[eid] = constraints.minWidth;
	}
	if (constraints.minHeight !== undefined) {
		Dimensions.minHeight[eid] = constraints.minHeight;
	}
	if (constraints.maxWidth !== undefined) {
		Dimensions.maxWidth[eid] = constraints.maxWidth;
	}
	if (constraints.maxHeight !== undefined) {
		Dimensions.maxHeight[eid] = constraints.maxHeight;
	}
	return eid;
}

/**
 * Sets the shrink-to-content flag for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param shrink - true to shrink to content, false for fixed size
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setShrink } from 'blecsd';
 *
 * // Enable shrink-to-content
 * setShrink(world, entity, true);
 * ```
 */
export function setShrink(world: World, eid: Entity, shrink: boolean): Entity {
	if (!hasComponent(world, eid, Dimensions)) {
		addComponent(world, eid, Dimensions);
		// Initialize all values to defaults
		Dimensions.width[eid] = AUTO_DIMENSION;
		Dimensions.height[eid] = AUTO_DIMENSION;
		Dimensions.minWidth[eid] = 0;
		Dimensions.minHeight[eid] = 0;
		Dimensions.maxWidth[eid] = Number.POSITIVE_INFINITY;
		Dimensions.maxHeight[eid] = Number.POSITIVE_INFINITY;
	}
	Dimensions.shrink[eid] = shrink ? 1 : 0;
	return eid;
}

/**
 * Checks if an entity should shrink to content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if shrink is enabled, false otherwise
 */
export function shouldShrink(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Dimensions)) {
		return false;
	}
	return Dimensions.shrink[eid] === 1;
}

/**
 * Checks if an entity has a Dimensions component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Dimensions component
 */
export function hasDimensions(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Dimensions);
}

/**
 * Gets the width of an entity, resolving percentages against a container width.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param containerWidth - Container width to resolve percentages against
 * @returns Resolved width value, or undefined if no Dimensions component
 *
 * @example
 * ```typescript
 * import { getResolvedWidth, setDimensions } from 'blecsd';
 *
 * setDimensions(world, entity, '50%', 24);
 * const width = getResolvedWidth(world, entity, 100); // Returns 50
 * ```
 */
export function getResolvedWidth(
	world: World,
	eid: Entity,
	containerWidth: number,
): number | undefined {
	if (!hasComponent(world, eid, Dimensions)) {
		return undefined;
	}
	const width = Dimensions.width[eid] as number;
	if (width === AUTO_DIMENSION) {
		return undefined;
	}
	const percent = decodePercentage(width);
	if (percent !== null) {
		return (percent / 100) * containerWidth;
	}
	return width;
}

/**
 * Gets the height of an entity, resolving percentages against a container height.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param containerHeight - Container height to resolve percentages against
 * @returns Resolved height value, or undefined if no Dimensions component
 *
 * @example
 * ```typescript
 * import { getResolvedHeight, setDimensions } from 'blecsd';
 *
 * setDimensions(world, entity, 80, '25%');
 * const height = getResolvedHeight(world, entity, 80); // Returns 20
 * ```
 */
export function getResolvedHeight(
	world: World,
	eid: Entity,
	containerHeight: number,
): number | undefined {
	if (!hasComponent(world, eid, Dimensions)) {
		return undefined;
	}
	const height = Dimensions.height[eid] as number;
	if (height === AUTO_DIMENSION) {
		return undefined;
	}
	const percent = decodePercentage(height);
	if (percent !== null) {
		return (percent / 100) * containerHeight;
	}
	return height;
}
