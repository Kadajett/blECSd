/**
 * ScrollableBox Widget Factory
 *
 * Factory function for creating ScrollableBox widgets.
 *
 * @module widgets/scrollableBox/factory
 */

import { getContent, setContent } from '../../components/content';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { appendChild, getChildren } from '../../components/hierarchy';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import type { ScrollableData, ScrollPercentage, ScrollPosition } from '../../components/scrollable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
	canScroll,
	canScrollX,
	canScrollY,
	getScroll,
	getScrollable,
	getScrollPercentage,
	isAtBottom,
	isAtLeft,
	isAtRight,
	isAtTop,
	scrollBy as componentScrollBy,
	scrollTo as componentScrollTo,
	scrollToBottom,
	scrollToLeft,
	scrollToRight,
	scrollToTop,
	setScrollPercentage,
	setScrollSize,
	setViewport,
} from '../../systems/scrollableSystem';
import { ScrollableBoxConfigSchema } from './config';
import {
	setupBorder,
	setupContent,
	setupPadding,
	setupPositionAndDimensions,
	setupScrollable,
	setupStyle,
	type ValidatedScrollableBoxConfig,
} from './helpers';
import { ScrollableBox } from './state';
import type { ScrollableBoxConfig, ScrollableBoxWidget } from './types';

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ScrollableBox widget with the given configuration.
 *
 * The ScrollableBox widget is a container that supports scrolling.
 * It combines Box functionality with scrollable content support.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The ScrollableBox widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createScrollableBox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const scrollBox = createScrollableBox(world, eid, {
 *   left: 5,
 *   top: 5,
 *   width: 40,
 *   height: 10,
 *   scrollHeight: 100,  // Content is 100 lines tall
 *   border: { type: 'line' },
 *   scrollbar: true,
 * });
 *
 * // Scroll down
 * scrollBox.scrollBy(0, 5);
 *
 * // Scroll to 50%
 * scrollBox.setScrollPerc(0, 50);
 *
 * // Jump to bottom
 * scrollBox.scrollToBottom();
 * ```
 */
export function createScrollableBox(
	world: World,
	entity: Entity,
	config: ScrollableBoxConfig = {},
): ScrollableBoxWidget {
	const validated = ScrollableBoxConfigSchema.parse(config) as ValidatedScrollableBoxConfig;
	const eid = entity;

	// Mark as scrollable box
	ScrollableBox.isScrollableBox[eid] = 1;

	// Set up components using helper functions
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	if (validated.border) setupBorder(world, eid, validated.border);
	if (validated.padding !== undefined) setupPadding(world, eid, validated.padding);
	setupContent(world, eid, validated);
	setupScrollable(world, eid, validated);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Create the widget object with chainable methods
	const widget: ScrollableBoxWidget = {
		eid,

		// Visibility
		show(): ScrollableBoxWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ScrollableBoxWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ScrollableBoxWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): ScrollableBoxWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setContent(text: string): ScrollableBoxWidget {
			setContent(world, eid, text);
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return getContent(world, eid);
		},

		// Focus
		focus(): ScrollableBoxWidget {
			focus(world, eid);
			return widget;
		},

		blur(): ScrollableBoxWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): ScrollableBoxWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Scrolling
		scrollTo(x: number, y: number): ScrollableBoxWidget {
			componentScrollTo(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		scrollBy(dx: number, dy: number): ScrollableBoxWidget {
			componentScrollBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setScrollPerc(percX: number, percY: number): ScrollableBoxWidget {
			setScrollPercentage(world, eid, percX, percY);
			markDirty(world, eid);
			return widget;
		},

		getScrollPerc(): ScrollPercentage {
			return getScrollPercentage(world, eid);
		},

		getScroll(): ScrollPosition {
			return getScroll(world, eid);
		},

		setScrollSize(width: number, height: number): ScrollableBoxWidget {
			setScrollSize(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		setViewport(width: number, height: number): ScrollableBoxWidget {
			setViewport(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		getScrollable(): ScrollableData | undefined {
			return getScrollable(world, eid);
		},

		scrollToTop(): ScrollableBoxWidget {
			scrollToTop(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToBottom(): ScrollableBoxWidget {
			scrollToBottom(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToLeft(): ScrollableBoxWidget {
			scrollToLeft(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToRight(): ScrollableBoxWidget {
			scrollToRight(world, eid);
			markDirty(world, eid);
			return widget;
		},

		canScroll(): boolean {
			return canScroll(world, eid);
		},

		canScrollX(): boolean {
			return canScrollX(world, eid);
		},

		canScrollY(): boolean {
			return canScrollY(world, eid);
		},

		isAtTop(): boolean {
			return isAtTop(world, eid);
		},

		isAtBottom(): boolean {
			return isAtBottom(world, eid);
		},

		isAtLeft(): boolean {
			return isAtLeft(world, eid);
		},

		isAtRight(): boolean {
			return isAtRight(world, eid);
		},

		// Lifecycle
		destroy(): void {
			ScrollableBox.isScrollableBox[eid] = 0;
			ScrollableBox.mouseEnabled[eid] = 0;
			ScrollableBox.keysEnabled[eid] = 0;
			removeEntity(world, eid);
		},
	};

	return widget;
}
