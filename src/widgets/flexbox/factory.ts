/**
 * Flexbox Widget Factory
 *
 * Factory function for creating Flexbox widgets.
 *
 * @module widgets/flexbox/factory
 */

import { type DimensionValue, setDimensions } from '../../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { appendChild, getParent, NULL_ENTITY } from '../../components/hierarchy';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setStyle, setVisible } from '../../components/renderable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import {
	FlexChildOptionsSchema,
	FlexContainerConfigSchema,
	type ValidatedFlexChildOptions,
	type ValidatedFlexContainerConfig,
} from './config';
import { applyFlexLayout } from './helpers';
import { type FlexContainerState, FlexContainer, flexContainerStateMap } from './state';
import type {
	FlexChildOptions,
	FlexContainerConfig,
	FlexContainerWidget,
	FlexDirection,
	JustifyContent,
	AlignItems,
	FlexWrap,
} from './types';

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
