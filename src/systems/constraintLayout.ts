/**
 * Constraint-based layout helpers inspired by Ratatui.
 * Provides flexible layout computation using various constraint types.
 * @module systems/constraintLayout
 */

import type { World } from '../core/types';

/**
 * Rectangle representing a layout area.
 */
export interface Rect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Constraint type for layout calculations.
 */
export type Constraint =
	| { type: 'fixed'; value: number }
	| { type: 'percentage'; value: number }
	| { type: 'min'; value: number }
	| { type: 'max'; value: number }
	| { type: 'ratio'; numerator: number; denominator: number };

/**
 * Creates a fixed-size constraint.
 *
 * @param value - Fixed size in cells
 * @returns Fixed constraint
 *
 * @example
 * ```typescript
 * import { fixed, layoutHorizontal } from 'blecsd';
 *
 * const area = { x: 0, y: 0, width: 100, height: 20 };
 * const rects = layoutHorizontal(world, area, [
 *   fixed(20),  // Left sidebar: 20 cells
 *   fixed(60),  // Main area: 60 cells
 *   fixed(20),  // Right sidebar: 20 cells
 * ]);
 * ```
 */
export function fixed(value: number): Constraint {
	return { type: 'fixed', value };
}

/**
 * Creates a percentage-based constraint.
 *
 * @param value - Percentage (0-100)
 * @returns Percentage constraint
 *
 * @example
 * ```typescript
 * import { percentage, layoutVertical } from 'blecsd';
 *
 * const area = { x: 0, y: 0, width: 80, height: 24 };
 * const rects = layoutVertical(world, area, [
 *   percentage(30),  // Header: 30% of height
 *   percentage(60),  // Content: 60% of height
 *   percentage(10),  // Footer: 10% of height
 * ]);
 * ```
 */
export function percentage(value: number): Constraint {
	return { type: 'percentage', value };
}

/**
 * Creates a minimum-size constraint.
 *
 * @param value - Minimum size in cells
 * @returns Min constraint
 *
 * @example
 * ```typescript
 * import { min, percentage, layoutHorizontal } from 'blecsd';
 *
 * const area = { x: 0, y: 0, width: 100, height: 20 };
 * const rects = layoutHorizontal(world, area, [
 *   min(20),       // Sidebar: at least 20 cells
 *   percentage(80), // Main: 80% of remaining
 * ]);
 * ```
 */
export function min(value: number): Constraint {
	return { type: 'min', value };
}

/**
 * Creates a maximum-size constraint.
 *
 * @param value - Maximum size in cells
 * @returns Max constraint
 *
 * @example
 * ```typescript
 * import { max, percentage, layoutVertical } from 'blecsd';
 *
 * const area = { x: 0, y: 0, width: 80, height: 40 };
 * const rects = layoutVertical(world, area, [
 *   max(10),       // Header: max 10 cells
 *   percentage(100), // Content: rest of space
 * ]);
 * ```
 */
export function max(value: number): Constraint {
	return { type: 'max', value };
}

/**
 * Creates a ratio-based constraint.
 *
 * @param numerator - Numerator of the ratio
 * @param denominator - Denominator of the ratio
 * @returns Ratio constraint
 *
 * @example
 * ```typescript
 * import { ratio, layoutHorizontal } from 'blecsd';
 *
 * const area = { x: 0, y: 0, width: 120, height: 20 };
 * const rects = layoutHorizontal(world, area, [
 *   ratio(1, 3),  // 1/3 of width
 *   ratio(2, 3),  // 2/3 of width
 * ]);
 * ```
 */
export function ratio(numerator: number, denominator: number): Constraint {
	return { type: 'ratio', numerator, denominator };
}

/**
 * Calculates the size for a single constraint.
 */
function calculateSingleSize(constraint: Constraint, totalAvailable: number): number {
	switch (constraint.type) {
		case 'fixed':
			return Math.min(constraint.value, totalAvailable);
		case 'percentage':
			return Math.floor((constraint.value / 100) * totalAvailable);
		case 'min':
			return Math.min(constraint.value, totalAvailable);
		case 'max':
			return Math.min(constraint.value, totalAvailable);
		case 'ratio':
			return Math.floor((constraint.numerator / constraint.denominator) * totalAvailable);
	}
}

/**
 * Calculates constraint sizes for all constraints given total available space.
 */
function calculateConstraintSizes(
	constraints: readonly Constraint[],
	totalAvailable: number,
): number[] {
	const sizes: number[] = [];
	let fixedTotal = 0;
	const flexibleIndices: number[] = [];

	// First pass: Calculate fixed sizes
	for (let i = 0; i < constraints.length; i++) {
		const constraint = constraints[i];
		if (!constraint) {
			sizes.push(0);
			continue;
		}

		if (constraint.type === 'fixed') {
			const size = Math.min(constraint.value, totalAvailable - fixedTotal);
			sizes.push(size);
			fixedTotal += size;
		} else {
			sizes.push(0);
			flexibleIndices.push(i);
		}
	}

	// Second pass: Calculate flexible constraints
	for (const idx of flexibleIndices) {
		const constraint = constraints[idx];
		if (constraint) {
			sizes[idx] = calculateSingleSize(constraint, totalAvailable);
		}
	}

	return sizes;
}

/**
 * Finds indices of flexible constraints (min/max).
 */
function findFlexibleIndices(constraints: readonly Constraint[]): number[] {
	const indices: number[] = [];
	for (let i = 0; i < constraints.length; i++) {
		const constraint = constraints[i];
		if (constraint && (constraint.type === 'min' || constraint.type === 'max')) {
			indices.push(i);
		}
	}
	return indices;
}

/**
 * Calculates additional space for a constraint.
 */
function calculateAdditional(
	constraint: Constraint,
	currentSize: number,
	perItem: number,
	hasLeftover: boolean,
): number {
	let additional = perItem;
	if (hasLeftover) {
		additional += 1;
	}

	if (constraint.type === 'max') {
		const maxAllowed = constraint.value - currentSize;
		additional = Math.min(additional, maxAllowed);
	}

	return additional;
}

/**
 * Distributes remaining space among flexible constraints.
 */
function distributeRemainingSpace(
	constraints: readonly Constraint[],
	sizes: number[],
	remaining: number,
): void {
	if (remaining <= 0) {
		return;
	}

	const flexibleIndices = findFlexibleIndices(constraints);
	if (flexibleIndices.length === 0) {
		return;
	}

	const perItem = Math.floor(remaining / flexibleIndices.length);
	let leftover = remaining % flexibleIndices.length;

	for (const idx of flexibleIndices) {
		const constraint = constraints[idx];
		const currentSize = sizes[idx];
		if (!constraint || currentSize === undefined) {
			continue;
		}

		const additional = calculateAdditional(constraint, currentSize, perItem, leftover > 0);
		if (leftover > 0) {
			leftover -= 1;
		}
		sizes[idx] = currentSize + additional;
	}
}

/**
 * Lays out rectangles horizontally within an area.
 * Pure function: takes available area and constraints, returns calculated rects.
 *
 * @param world - The ECS world (for consistency with other systems)
 * @param area - The available rectangular area
 * @param constraints - Array of constraints defining horizontal sections
 * @returns Array of rectangles representing the layout
 *
 * @example
 * ```typescript
 * import { createWorld, layoutHorizontal, fixed, percentage } from 'blecsd';
 *
 * const world = createWorld();
 * const area = { x: 0, y: 0, width: 100, height: 20 };
 *
 * const rects = layoutHorizontal(world, area, [
 *   fixed(20),       // Left panel: 20 cells
 *   percentage(80),  // Main content: 80% of remaining
 * ]);
 *
 * console.log(rects);
 * // [
 * //   { x: 0, y: 0, width: 20, height: 20 },
 * //   { x: 20, y: 0, width: 80, height: 20 }
 * // ]
 * ```
 */
export function layoutHorizontal(
	_world: World,
	area: Rect,
	constraints: readonly Constraint[],
): Rect[] {
	if (constraints.length === 0) {
		return [];
	}

	// Calculate sizes for all constraints
	const sizes = calculateConstraintSizes(constraints, area.width);

	// Calculate total used space
	let used = 0;
	for (const size of sizes) {
		used += size;
	}

	// Distribute remaining space if any
	const remaining = area.width - used;
	if (remaining > 0) {
		distributeRemainingSpace(constraints, sizes, remaining);
	}

	// Build rects
	const rects: Rect[] = [];
	let currentX = area.x;

	for (let i = 0; i < sizes.length; i++) {
		const width = sizes[i];
		if (width === undefined) {
			continue;
		}
		rects.push({
			x: currentX,
			y: area.y,
			width,
			height: area.height,
		});
		currentX += width;
	}

	return rects;
}

/**
 * Lays out rectangles vertically within an area.
 * Pure function: takes available area and constraints, returns calculated rects.
 *
 * @param world - The ECS world (for consistency with other systems)
 * @param area - The available rectangular area
 * @param constraints - Array of constraints defining vertical sections
 * @returns Array of rectangles representing the layout
 *
 * @example
 * ```typescript
 * import { createWorld, layoutVertical, fixed, percentage } from 'blecsd';
 *
 * const world = createWorld();
 * const area = { x: 0, y: 0, width: 80, height: 24 };
 *
 * const rects = layoutVertical(world, area, [
 *   fixed(2),        // Header: 2 lines
 *   percentage(90),  // Content: 90% of remaining
 *   fixed(1),        // Footer: 1 line
 * ]);
 *
 * console.log(rects);
 * // [
 * //   { x: 0, y: 0, width: 80, height: 2 },
 * //   { x: 0, y: 2, width: 80, height: 21 },
 * //   { x: 0, y: 23, width: 80, height: 1 }
 * // ]
 * ```
 */
export function layoutVertical(
	_world: World,
	area: Rect,
	constraints: readonly Constraint[],
): Rect[] {
	if (constraints.length === 0) {
		return [];
	}

	// Calculate sizes for all constraints
	const sizes = calculateConstraintSizes(constraints, area.height);

	// Calculate total used space
	let used = 0;
	for (const size of sizes) {
		used += size;
	}

	// Distribute remaining space if any
	const remaining = area.height - used;
	if (remaining > 0) {
		distributeRemainingSpace(constraints, sizes, remaining);
	}

	// Build rects
	const rects: Rect[] = [];
	let currentY = area.y;

	for (let i = 0; i < sizes.length; i++) {
		const height = sizes[i];
		if (height === undefined) {
			continue;
		}
		rects.push({
			x: area.x,
			y: currentY,
			width: area.width,
			height,
		});
		currentY += height;
	}

	return rects;
}
