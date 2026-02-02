/**
 * ScrollableText Widget
 *
 * A thin wrapper over ScrollableBox optimized for read-only scrollable
 * text content. Used for logs, help text, and other scrollable text displays.
 *
 * @module widgets/scrollableText
 */

import type { Entity, World } from '../core/types';
import {
	createScrollableBox,
	type ScrollableBoxConfig,
	type ScrollableBoxWidget,
} from './scrollableBox';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a ScrollableText widget.
 * Inherits all options from ScrollableBoxConfig.
 */
export interface ScrollableTextConfig extends Omit<ScrollableBoxConfig, 'alwaysScroll'> {
	// All options inherited from ScrollableBoxConfig, but alwaysScroll is forced to true
}

/**
 * ScrollableText widget interface.
 * Provides the same API as ScrollableBoxWidget.
 */
export type ScrollableTextWidget = ScrollableBoxWidget;

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ScrollableText widget with the given configuration.
 *
 * ScrollableText is a thin wrapper over ScrollableBox with `alwaysScroll: true`,
 * optimized for read-only scrollable text content like logs, help text,
 * and documentation.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The ScrollableText widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { createScrollableText } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Create a scrollable text area for logs
 * const logView = createScrollableText(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 80,
 *   height: 20,
 *   content: 'Log entry 1\nLog entry 2\nLog entry 3\n...',
 *   scrollbar: { mode: 'visible' },
 * });
 *
 * // Scroll to bottom to see latest logs
 * logView.scrollToBottom();
 * ```
 */
export function createScrollableText(
	world: World,
	entity: Entity,
	config: ScrollableTextConfig = {},
): ScrollableTextWidget {
	// Create a ScrollableBox with alwaysScroll forced to true
	return createScrollableBox(world, entity, {
		...config,
		alwaysScroll: true,
	});
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a scrollable text widget.
 *
 * Note: This returns the same result as isScrollableBox since
 * ScrollableText is just a wrapper over ScrollableBox.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a scrollable box/text widget
 *
 * @example
 * ```typescript
 * import { isScrollableText } from 'blecsd/widgets';
 *
 * if (isScrollableText(world, entity)) {
 *   // Handle scrollable text logic
 * }
 * ```
 */
export { isScrollableBox as isScrollableText } from './scrollableBox';
