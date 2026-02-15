/**
 * Flexbox Widget Types
 *
 * Type definitions for flexbox widget configuration and API.
 *
 * @module widgets/flexbox/types
 */

import type { DimensionValue } from '../../components/dimensions';
import type { Entity } from '../../core/types';

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
