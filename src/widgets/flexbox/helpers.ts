/**
 * Flexbox Widget Helpers
 *
 * Internal helper functions for flexbox layout algorithm.
 *
 * @module widgets/flexbox/helpers
 */

import { type DimensionValue, getDimensions, setDimensions } from '../../components/dimensions';
import { getPosition, setPosition } from '../../components/position';
import { markDirty } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import type { FlexChildState, FlexContainerState } from './state';
import type { AlignItems, JustifyContent } from './types';

// =============================================================================
// LAYOUT TYPES
// =============================================================================

/**
 * Flex line (for wrapping).
 * @internal
 */
export interface FlexLine {
	children: FlexChildState[];
	mainSize: number;
	crossSize: number;
}

// =============================================================================
// LAYOUT ALGORITHM
// =============================================================================

/**
 * Applies flexbox layout to children.
 * @internal
 */
export function applyFlexLayout(
	world: World,
	containerEid: Entity,
	state: FlexContainerState,
): void {
	const containerDims = getDimensions(world, containerEid);
	const containerPos = getPosition(world, containerEid);

	if (!containerDims || !containerPos) return;

	const containerWidth = containerDims.width;
	const containerHeight = containerDims.height;
	const children = state.children;

	if (children.length === 0) return;

	const isRow = state.direction === 'row';
	const mainSize = isRow ? containerWidth : containerHeight;

	// Calculate flex lines (for wrapping)
	const lines = calculateFlexLines(world, children, mainSize, state.gap, isRow, state.wrap);

	// Position each line
	let crossOffset = 0;

	for (const line of lines) {
		const lineMainSize = line.mainSize;
		const lineCrossSize = line.crossSize;

		// Calculate main axis positioning
		const { positions, sizes } = distributeMainAxis(
			line.children,
			mainSize,
			lineMainSize,
			state.gap,
			state.justifyContent,
		);

		// Position children in this line
		for (let i = 0; i < line.children.length; i++) {
			const child = line.children[i];
			if (!child) continue;

			const mainPos = positions[i] ?? 0;
			const mainChildSize = sizes[i] ?? 0;

			// Calculate cross axis position
			const alignSelf = child.alignSelf ?? state.alignItems;
			const childCrossSize = getCrossSize(world, child.entity, isRow);
			const crossPos = calculateCrossPosition(alignSelf, lineCrossSize, childCrossSize);

			positionFlexChild(
				world,
				child,
				containerPos,
				mainPos,
				mainChildSize,
				crossOffset,
				crossPos,
				isRow,
			);
		}

		crossOffset += lineCrossSize + state.gap;
	}
}

/**
 * Positions a single child within a flex line.
 * @internal
 */
function positionFlexChild(
	world: World,
	child: FlexChildState,
	containerPos: { x: number; y: number },
	mainPos: number,
	mainChildSize: number,
	crossOffset: number,
	crossPos: number,
	isRow: boolean,
): void {
	const childEntity = child.entity;
	const childCrossSize = getCrossSize(world, childEntity, isRow);

	// Set position and dimensions
	if (isRow) {
		setPosition(
			world,
			childEntity,
			containerPos.x + mainPos,
			containerPos.y + crossOffset + crossPos,
		);
		setDimensions(
			world,
			childEntity,
			mainChildSize as DimensionValue,
			childCrossSize as DimensionValue,
		);
	} else {
		setPosition(
			world,
			childEntity,
			containerPos.x + crossPos,
			containerPos.y + crossOffset + mainPos,
		);
		setDimensions(
			world,
			childEntity,
			childCrossSize as DimensionValue,
			mainChildSize as DimensionValue,
		);
	}

	markDirty(world, childEntity);
}

// =============================================================================
// FLEX LINE CALCULATION
// =============================================================================

/**
 * Calculates flex lines (for wrapping).
 * @internal
 */
export function calculateFlexLines(
	world: World,
	children: FlexChildState[],
	containerMainSize: number,
	gap: number,
	isRow: boolean,
	wrap: 'nowrap' | 'wrap',
): FlexLine[] {
	if (wrap === 'nowrap') {
		// Single line
		const mainSize = calculateLineMainSize(world, children, gap, isRow);
		const crossSize = calculateLineCrossSize(world, children, isRow);
		return [{ children, mainSize, crossSize }];
	}

	// Multi-line wrapping
	const lines: FlexLine[] = [];
	let currentLine: FlexChildState[] = [];
	let currentMainSize = 0;

	for (const child of children) {
		const childMainSize = getMainSize(world, child.entity, isRow, child.flexBasis);
		const itemSize = currentLine.length === 0 ? childMainSize : gap + childMainSize;

		if (currentLine.length > 0 && currentMainSize + itemSize > containerMainSize) {
			// Start new line
			lines.push({
				children: currentLine,
				mainSize: currentMainSize - gap,
				crossSize: calculateLineCrossSize(world, currentLine, isRow),
			});
			currentLine = [child];
			currentMainSize = childMainSize;
		} else {
			currentLine.push(child);
			currentMainSize += itemSize;
		}
	}

	// Add last line
	if (currentLine.length > 0) {
		lines.push({
			children: currentLine,
			mainSize: currentMainSize - (currentLine.length > 0 ? gap : 0),
			crossSize: calculateLineCrossSize(world, currentLine, isRow),
		});
	}

	return lines;
}

/**
 * Calculates total main size for a line.
 * @internal
 */
function calculateLineMainSize(
	world: World,
	children: FlexChildState[],
	gap: number,
	isRow: boolean,
): number {
	let total = 0;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!child) continue;
		if (i > 0) total += gap;
		total += getMainSize(world, child.entity, isRow, child.flexBasis);
	}
	return total;
}

/**
 * Calculates maximum cross size for a line.
 * @internal
 */
function calculateLineCrossSize(world: World, children: FlexChildState[], isRow: boolean): number {
	let max = 0;
	for (const child of children) {
		const size = getCrossSize(world, child.entity, isRow);
		max = Math.max(max, size);
	}
	return max;
}

/**
 * Gets main axis size for an entity.
 * @internal
 */
function getMainSize(
	world: World,
	entity: Entity,
	isRow: boolean,
	flexBasis: number | 'auto',
): number {
	if (flexBasis !== 'auto') return flexBasis;

	const dims = getDimensions(world, entity);
	if (!dims) return 0;

	return isRow ? dims.width : dims.height;
}

/**
 * Gets cross axis size for an entity.
 * @internal
 */
function getCrossSize(world: World, entity: Entity, isRow: boolean): number {
	const dims = getDimensions(world, entity);
	if (!dims) return 0;

	return isRow ? dims.height : dims.width;
}

// =============================================================================
// MAIN AXIS DISTRIBUTION
// =============================================================================

/**
 * Distributes children along the main axis with flex grow/shrink.
 * @internal
 */
export function distributeMainAxis(
	children: FlexChildState[],
	containerSize: number,
	contentSize: number,
	gap: number,
	justifyContent: JustifyContent,
): { positions: number[]; sizes: number[] } {
	const positions: number[] = [];
	const sizes: number[] = [];

	if (children.length === 0) {
		return { positions, sizes };
	}

	const totalGap = gap * (children.length - 1);
	const availableSpace = containerSize - totalGap;

	// Calculate child sizes with flex grow/shrink
	const childSizes = calculateFlexSizes(children, availableSpace, contentSize);

	// Calculate positions based on justifyContent
	const actualContentSize = childSizes.reduce((sum, size) => sum + size, 0) + totalGap;
	const remainingSpace = containerSize - actualContentSize;

	let position = calculateStartPosition(justifyContent, remainingSpace, children.length);

	for (let i = 0; i < children.length; i++) {
		const childSize = childSizes[i] ?? 0;
		positions.push(position);
		sizes.push(childSize);

		position += calculatePositionIncrement(
			justifyContent,
			childSize,
			gap,
			remainingSpace,
			children.length,
		);
	}

	return { positions, sizes };
}

/**
 * Calculates child sizes based on flex grow/shrink.
 * @internal
 */
function calculateFlexSizes(
	children: FlexChildState[],
	availableSpace: number,
	contentSize: number,
): number[] {
	// Calculate total flex grow/shrink
	let totalFlex = 0;
	let totalShrink = 0;
	for (const child of children) {
		totalFlex += child.flex;
		totalShrink += child.flexShrink;
	}

	const freeSpace = availableSpace - contentSize;

	// Distribute space
	const childSizes: number[] = [];
	for (const child of children) {
		let size = 0;
		if (child.flexBasis === 'auto') {
			size = 10; // Default size
		} else {
			size = child.flexBasis;
		}

		if (freeSpace > 0 && totalFlex > 0) {
			// Grow
			size += (freeSpace * child.flex) / totalFlex;
		} else if (freeSpace < 0 && totalShrink > 0) {
			// Shrink
			size += (freeSpace * child.flexShrink) / totalShrink;
		}

		childSizes.push(Math.max(0, size));
	}

	return childSizes;
}

/**
 * Calculates initial position based on justifyContent.
 * @internal
 */
function calculateStartPosition(
	justifyContent: JustifyContent,
	remainingSpace: number,
	childCount: number,
): number {
	switch (justifyContent) {
		case 'start':
			return 0;
		case 'center':
			return remainingSpace / 2;
		case 'end':
			return remainingSpace;
		case 'space-between':
			return 0;
		case 'space-around':
			return remainingSpace / (childCount * 2);
		case 'space-evenly':
			return remainingSpace / (childCount + 1);
	}
}

/**
 * Calculates position increment for each child.
 * @internal
 */
function calculatePositionIncrement(
	justifyContent: JustifyContent,
	childSize: number,
	gap: number,
	remainingSpace: number,
	childCount: number,
): number {
	if (justifyContent === 'space-between' && childCount > 1) {
		return childSize + gap + remainingSpace / (childCount - 1);
	}
	if (justifyContent === 'space-around') {
		return childSize + gap + remainingSpace / childCount;
	}
	if (justifyContent === 'space-evenly') {
		return childSize + gap + remainingSpace / (childCount + 1);
	}
	return childSize + gap;
}

// =============================================================================
// CROSS AXIS POSITIONING
// =============================================================================

/**
 * Calculates cross axis position for a child.
 * @internal
 */
function calculateCrossPosition(
	alignSelf: AlignItems,
	lineSize: number,
	childSize: number,
): number {
	switch (alignSelf) {
		case 'start':
			return 0;
		case 'center':
			return (lineSize - childSize) / 2;
		case 'end':
			return lineSize - childSize;
		case 'stretch':
			return 0;
	}
}
