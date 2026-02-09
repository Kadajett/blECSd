/**
 * Flexbox Widget
 *
 * A flexbox-style layout system for responsive terminal UIs.
 * Supports flex direction, justify-content, align-items, wrapping, and nested containers.
 *
 * @module widgets/flexbox
 */

import { z } from 'zod';
import { type DimensionValue, getDimensions, setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getParent, NULL_ENTITY } from '../components/hierarchy';
import { getPosition, moveBy, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Flexbox component marker for identifying flexbox containers.
 */
export const FlexContainer = {
	/** Tag indicating this is a flexbox container (1 = yes) */
	isFlexContainer: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Flex direction for main axis.
 */
export type FlexDirection = 'row' | 'column';

/**
 * Justify content options for main axis alignment.
 */
export type JustifyContent =
	| 'start'
	| 'center'
	| 'end'
	| 'space-between'
	| 'space-around'
	| 'space-evenly';

/**
 * Align items options for cross axis alignment.
 */
export type AlignItems = 'start' | 'center' | 'end' | 'stretch';

/**
 * Flex wrap behavior.
 */
export type FlexWrap = 'nowrap' | 'wrap';

/**
 * Flex child configuration options.
 */
export interface FlexChildOptions {
	/**
	 * Flex grow factor (how much to grow relative to siblings)
	 * @default 0
	 */
	readonly flex?: number;

	/**
	 * Flex shrink factor (how much to shrink relative to siblings)
	 * @default 1
	 */
	readonly flexShrink?: number;

	/**
	 * Flex basis (initial size before growing/shrinking)
	 * @default 'auto'
	 */
	readonly flexBasis?: number | 'auto';

	/**
	 * Override container alignItems for this child
	 * @default undefined (uses container value)
	 */
	readonly alignSelf?: AlignItems;
}

/**
 * Flexbox container configuration.
 *
 * @example
 * ```typescript
 * const flex = createFlexContainer(world, eid, {
 *   direction: 'row',
 *   justifyContent: 'space-between',
 *   alignItems: 'center',
 *   gap: 2,
 *   wrap: 'wrap'
 * });
 *
 * // Add children
 * const child1 = addEntity(world);
 * addFlexChild(world, flex.eid, child1, { flex: 1 });
 * ```
 */
export interface FlexContainerConfig {
	/**
	 * Flex direction
	 * @default 'row'
	 */
	readonly direction?: FlexDirection;

	/**
	 * Justify content (main axis alignment)
	 * @default 'start'
	 */
	readonly justifyContent?: JustifyContent;

	/**
	 * Align items (cross axis alignment)
	 * @default 'stretch'
	 */
	readonly alignItems?: AlignItems;

	/**
	 * Gap between items
	 * @default 0
	 */
	readonly gap?: number;

	/**
	 * Wrap behavior
	 * @default 'nowrap'
	 */
	readonly wrap?: FlexWrap;

	/**
	 * X position
	 * @default 0
	 */
	readonly left?: number;

	/**
	 * Y position
	 * @default 0
	 */
	readonly top?: number;

	/**
	 * Container width
	 * @default 'auto'
	 */
	readonly width?: DimensionValue;

	/**
	 * Container height
	 * @default 'auto'
	 */
	readonly height?: DimensionValue;

	/**
	 * Foreground color
	 * @default undefined
	 */
	readonly fg?: string | number;

	/**
	 * Background color
	 * @default undefined
	 */
	readonly bg?: string | number;
}

/**
 * Flexbox container widget interface.
 */
export interface FlexContainerWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the container */
	show(): FlexContainerWidget;
	/** Hides the container */
	hide(): FlexContainerWidget;

	// Position
	/** Moves the container by dx, dy */
	move(dx: number, dy: number): FlexContainerWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): FlexContainerWidget;

	// Children
	/** Adds a child with flex options */
	addChild(childEid: Entity, options?: FlexChildOptions): FlexContainerWidget;
	/** Removes a child */
	removeChild(childEid: Entity): FlexContainerWidget;
	/** Gets all children */
	getChildren(): readonly Entity[];

	// Configuration
	/** Sets flex direction */
	setDirection(direction: FlexDirection): FlexContainerWidget;
	/** Sets justify content */
	setJustifyContent(justifyContent: JustifyContent): FlexContainerWidget;
	/** Sets align items */
	setAlignItems(alignItems: AlignItems): FlexContainerWidget;
	/** Sets gap */
	setGap(gap: number): FlexContainerWidget;
	/** Sets wrap behavior */
	setWrap(wrap: FlexWrap): FlexContainerWidget;

	// Layout
	/** Recalculates and applies layout */
	layout(): FlexContainerWidget;

	// Focus
	/** Focuses the container */
	focus(): FlexContainerWidget;
	/** Blurs the container */
	blur(): FlexContainerWidget;
	/** Checks if focused */
	isFocused(): boolean;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const FlexChildOptionsSchema = z.object({
	flex: z.number().nonnegative().optional().default(0),
	flexShrink: z.number().nonnegative().optional().default(1),
	flexBasis: z
		.union([z.number().nonnegative(), z.literal('auto')])
		.optional()
		.default('auto'),
	alignSelf: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});

export const FlexContainerConfigSchema = z.object({
	direction: z.enum(['row', 'column']).optional().default('row'),
	justifyContent: z
		.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'])
		.optional()
		.default('start'),
	alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional().default('stretch'),
	gap: z.number().nonnegative().optional().default(0),
	wrap: z.enum(['nowrap', 'wrap']).optional().default('nowrap'),
	left: z.number().optional().default(0),
	top: z.number().optional().default(0),
	width: z.union([z.number(), z.string()]).optional().default('auto'),
	height: z.union([z.number(), z.string()]).optional().default('auto'),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

type ValidatedFlexContainerConfig = z.infer<typeof FlexContainerConfigSchema>;
type ValidatedFlexChildOptions = z.infer<typeof FlexChildOptionsSchema>;

// =============================================================================
// STATE
// =============================================================================

interface FlexChildState {
	entity: Entity;
	flex: number;
	flexShrink: number;
	flexBasis: number | 'auto';
	alignSelf: AlignItems | undefined;
}

interface FlexContainerState {
	direction: FlexDirection;
	justifyContent: JustifyContent;
	alignItems: AlignItems;
	gap: number;
	wrap: FlexWrap;
	children: FlexChildState[];
}

const flexContainerStateMap = new Map<Entity, FlexContainerState>();

// =============================================================================
// LAYOUT ALGORITHM
// =============================================================================

/**
 * Applies flexbox layout to children.
 */
function applyFlexLayout(world: World, containerEid: Entity, state: FlexContainerState): void {
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

			const childEntity = child.entity;
			const mainPos = positions[i] ?? 0;
			const mainChildSize = sizes[i] ?? 0;

			// Calculate cross axis position
			const alignSelf = child.alignSelf ?? state.alignItems;
			const childCrossSize = getCrossSize(world, childEntity, isRow);
			const crossPos = calculateCrossPosition(alignSelf, lineCrossSize, childCrossSize);

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

		crossOffset += lineCrossSize + state.gap;
	}
}

interface FlexLine {
	children: FlexChildState[];
	mainSize: number;
	crossSize: number;
}

function calculateFlexLines(
	world: World,
	children: FlexChildState[],
	containerMainSize: number,
	gap: number,
	isRow: boolean,
	wrap: FlexWrap,
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

function calculateLineCrossSize(world: World, children: FlexChildState[], isRow: boolean): number {
	let max = 0;
	for (const child of children) {
		const size = getCrossSize(world, child.entity, isRow);
		max = Math.max(max, size);
	}
	return max;
}

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

function getCrossSize(world: World, entity: Entity, isRow: boolean): number {
	const dims = getDimensions(world, entity);
	if (!dims) return 0;

	return isRow ? dims.height : dims.width;
}

function distributeMainAxis(
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

	// Calculate total flex grow/shrink
	let totalFlex = 0;
	let totalShrink = 0;
	for (const child of children) {
		totalFlex += child.flex;
		totalShrink += child.flexShrink;
	}

	const totalGap = gap * (children.length - 1);
	const availableSpace = containerSize - totalGap;
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

	// Calculate positions based on justifyContent
	let position = 0;
	const actualContentSize = childSizes.reduce((sum, size) => sum + size, 0) + totalGap;
	const remainingSpace = containerSize - actualContentSize;

	switch (justifyContent) {
		case 'start':
			position = 0;
			break;
		case 'center':
			position = remainingSpace / 2;
			break;
		case 'end':
			position = remainingSpace;
			break;
		case 'space-between':
			position = 0;
			break;
		case 'space-around':
			position = remainingSpace / (children.length * 2);
			break;
		case 'space-evenly':
			position = remainingSpace / (children.length + 1);
			break;
	}

	for (let i = 0; i < children.length; i++) {
		positions.push(position);
		sizes.push(childSizes[i] ?? 0);

		if (justifyContent === 'space-between' && children.length > 1) {
			position += (childSizes[i] ?? 0) + gap + remainingSpace / (children.length - 1);
		} else if (justifyContent === 'space-around') {
			position += (childSizes[i] ?? 0) + gap + remainingSpace / children.length;
		} else if (justifyContent === 'space-evenly') {
			position += (childSizes[i] ?? 0) + gap + remainingSpace / (children.length + 1);
		} else {
			position += (childSizes[i] ?? 0) + gap;
		}
	}

	return { positions, sizes };
}

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

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Flexbox container widget for responsive layouts.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Container configuration
 * @returns The Flexbox container widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createFlexContainer, addFlexChild } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const containerEid = addEntity(world);
 *
 * const flex = createFlexContainer(world, containerEid, {
 *   direction: 'row',
 *   justifyContent: 'space-between',
 *   alignItems: 'center',
 *   gap: 2,
 *   wrap: 'wrap',
 *   width: 80,
 *   height: 24
 * });
 *
 * // Add children with flex options
 * const child1 = addEntity(world);
 * flex.addChild(child1, { flex: 1, flexBasis: 20 });
 *
 * const child2 = addEntity(world);
 * flex.addChild(child2, { flex: 2, alignSelf: 'end' });
 *
 * // Apply layout
 * flex.layout();
 * ```
 */
export function createFlexContainer(
	world: World,
	entity: Entity,
	config: FlexContainerConfig = {},
): FlexContainerWidget {
	const validated = FlexContainerConfigSchema.parse(config) as ValidatedFlexContainerConfig;
	const eid = entity;

	// Mark as flex container
	FlexContainer.isFlexContainer[eid] = 1;

	// Position and dimensions
	setPosition(world, eid, validated.left, validated.top);
	setDimensions(world, eid, validated.width as DimensionValue, validated.height as DimensionValue);

	// Set up focusable
	setFocusable(world, eid, { focusable: true });

	// Set up style
	const fgColor = validated.fg ? parseColor(validated.fg) : undefined;
	const bgColor = validated.bg ? parseColor(validated.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}

	// Initialize state
	const state: FlexContainerState = {
		direction: validated.direction,
		justifyContent: validated.justifyContent,
		alignItems: validated.alignItems,
		gap: validated.gap,
		wrap: validated.wrap,
		children: [],
	};
	flexContainerStateMap.set(eid, state);

	// Create the widget object
	const widget: FlexContainerWidget = {
		eid,

		// Visibility
		show(): FlexContainerWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): FlexContainerWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Position
		move(dx: number, dy: number): FlexContainerWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): FlexContainerWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Children
		addChild(childEid: Entity, options: FlexChildOptions = {}): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (!currentState) return widget;

			const validated = FlexChildOptionsSchema.parse(options) as ValidatedFlexChildOptions;

			// Check if child is already attached to another parent
			const existingParent = getParent(world, childEid);
			if (existingParent !== NULL_ENTITY) {
				console.warn(`Child entity ${childEid} is already attached to parent ${existingParent}`);
				return widget;
			}

			appendChild(world, eid, childEid);

			currentState.children.push({
				entity: childEid,
				flex: validated.flex,
				flexShrink: validated.flexShrink,
				flexBasis: validated.flexBasis,
				alignSelf: validated.alignSelf,
			});

			markDirty(world, eid);
			return widget;
		},

		removeChild(childEid: Entity): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (!currentState) return widget;

			const index = currentState.children.findIndex((c) => c.entity === childEid);
			if (index !== -1) {
				currentState.children.splice(index, 1);
				markDirty(world, eid);
			}

			return widget;
		},

		getChildren(): readonly Entity[] {
			const currentState = flexContainerStateMap.get(eid);
			return currentState?.children.map((c) => c.entity) ?? [];
		},

		// Configuration
		setDirection(direction: FlexDirection): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				currentState.direction = direction;
				markDirty(world, eid);
			}
			return widget;
		},

		setJustifyContent(justifyContent: JustifyContent): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				currentState.justifyContent = justifyContent;
				markDirty(world, eid);
			}
			return widget;
		},

		setAlignItems(alignItems: AlignItems): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				currentState.alignItems = alignItems;
				markDirty(world, eid);
			}
			return widget;
		},

		setGap(gap: number): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				currentState.gap = gap;
				markDirty(world, eid);
			}
			return widget;
		},

		setWrap(wrap: FlexWrap): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				currentState.wrap = wrap;
				markDirty(world, eid);
			}
			return widget;
		},

		// Layout
		layout(): FlexContainerWidget {
			const currentState = flexContainerStateMap.get(eid);
			if (currentState) {
				applyFlexLayout(world, eid, currentState);
			}
			return widget;
		},

		// Focus
		focus(): FlexContainerWidget {
			focus(world, eid);
			return widget;
		},

		blur(): FlexContainerWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Lifecycle
		destroy(): void {
			flexContainerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Adds a child entity to a flex container with flex options.
 *
 * @param world - The ECS world
 * @param containerEid - The flex container entity
 * @param childEid - The child entity to add
 * @param options - Flex child options
 *
 * @example
 * ```typescript
 * addFlexChild(world, containerEid, childEid, {
 *   flex: 1,
 *   flexShrink: 0,
 *   flexBasis: 50,
 *   alignSelf: 'center'
 * });
 * ```
 */
export function addFlexChild(
	world: World,
	containerEid: Entity,
	childEid: Entity,
	options: FlexChildOptions = {},
): void {
	const state = flexContainerStateMap.get(containerEid);
	if (!state) {
		console.warn(`Entity ${containerEid} is not a flex container`);
		return;
	}

	const validated = FlexChildOptionsSchema.parse(options) as ValidatedFlexChildOptions;

	// Check if child is already attached to another parent
	const existingParent = getParent(world, childEid);
	if (existingParent !== NULL_ENTITY && existingParent !== containerEid) {
		console.warn(`Child entity ${childEid} is already attached to parent ${existingParent}`);
		return;
	}

	appendChild(world, containerEid, childEid);

	state.children.push({
		entity: childEid,
		flex: validated.flex,
		flexShrink: validated.flexShrink,
		flexBasis: validated.flexBasis,
		alignSelf: validated.alignSelf,
	});

	markDirty(world, containerEid);
}

/**
 * Type guard to check if an entity is a flex container.
 */
export function isFlexContainer(_world: World, eid: Entity): boolean {
	return FlexContainer.isFlexContainer[eid] === 1;
}

/**
 * Resets the flexbox store (for testing).
 * @internal
 */
export function resetFlexContainerStore(): void {
	flexContainerStateMap.clear();
}
