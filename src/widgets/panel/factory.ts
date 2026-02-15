/**
 * Panel Widget Factory
 *
 * Factory function for creating panel widgets and utility functions
 * for working with panel entities.
 *
 * @module widgets/panel/factory
 */

import {
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../../components/border';
import { setContent, TextAlign, TextVAlign } from '../../components/content';
import { getDimensions, setDimensions } from '../../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { appendChild, getChildren } from '../../components/hierarchy';
import { setPadding } from '../../components/padding';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setStyle, setVisible } from '../../components/renderable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import { PanelConfigSchema } from './config';
import { numberToTitleAlign, titleAlignToNumber } from './render';
import { contentStore, DEFAULT_PANEL_TITLE, Panel, titleStore } from './state';
import type { PanelConfig, PanelWidget, TitleAlign, ValidatedPanelConfig } from './types';

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a position value to a number.
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/** Calculates panel padding from config, adding space for title bar. */
function calculatePanelPadding(
	padding: number | { left?: number; top?: number; right?: number; bottom?: number } | undefined,
): { left: number; top: number; right: number; bottom: number } {
	if (typeof padding === 'number') {
		return { left: padding, top: padding + 1, right: padding, bottom: padding };
	}
	if (padding) {
		return {
			left: padding.left ?? 0,
			top: (padding.top ?? 0) + 1,
			right: padding.right ?? 0,
			bottom: padding.bottom ?? 0,
		};
	}
	return { left: 0, top: 1, right: 0, bottom: 0 };
}

/**
 * Converts border charset name to actual charset.
 */
function getBorderCharset(ch: string | object | undefined): BorderCharset {
	if (ch === undefined || ch === 'single') return BORDER_SINGLE;
	if (typeof ch === 'object') return ch as BorderCharset;
	// Import other charsets as needed
	return BORDER_SINGLE;
}

/**
 * Sets up style for panel from config.
 */
function applyPanelStyle(world: World, eid: Entity, validated: ValidatedPanelConfig): void {
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}
}

/**
 * Sets up border for panel from config.
 */
function applyPanelBorder(world: World, eid: Entity, validated: ValidatedPanelConfig): void {
	const borderConfig = validated.style?.border;
	if (borderConfig?.type !== 'none') {
		setBorder(world, eid, {
			type: borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line,
			fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
			bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
		});
	}
	setBorderChars(world, eid, getBorderCharset(borderConfig?.ch));
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Panel widget with the given configuration.
 *
 * The Panel widget is a container with a title bar at the top.
 * It supports optional close and collapse functionality.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Panel widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createPanel } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Basic panel with title
 * const panel = createPanel(world, eid, {
 *   left: 10,
 *   top: 5,
 *   width: 40,
 *   height: 15,
 *   title: 'My Panel',
 * });
 *
 * // Panel with close and collapse buttons
 * const closablePanel = createPanel(world, addEntity(world), {
 *   left: 60,
 *   top: 5,
 *   width: 40,
 *   height: 15,
 *   title: 'Closable Panel',
 *   closable: true,
 *   collapsible: true,
 * });
 * ```
 */
export function createPanel(world: World, entity: Entity, config: PanelConfig = {}): PanelWidget {
	const validated = PanelConfigSchema.parse(config) as ValidatedPanelConfig;
	const eid = entity;

	// Mark as panel
	Panel.isPanel[eid] = 1;
	Panel.collapsed[eid] = validated.collapsed ? 1 : 0;
	Panel.closable[eid] = validated.closable ? 1 : 0;
	Panel.collapsible[eid] = validated.collapsible ? 1 : 0;
	Panel.titleAlign[eid] = titleAlignToNumber(
		validated.titleAlign ?? validated.style?.title?.align ?? 'left',
	);

	// Store title and content
	titleStore.set(eid, validated.title ?? DEFAULT_PANEL_TITLE);
	contentStore.set(eid, validated.content ?? '');

	// Set up position
	const x = parsePositionToNumber(validated.left);
	const y = parsePositionToNumber(validated.top);
	setPosition(world, eid, x, y);

	// Set up dimensions
	const width = parseDimension(validated.width);
	const height = parseDimension(validated.height);
	setDimensions(world, eid, width, height);

	// Store original height for collapse/expand
	const dims = getDimensions(world, eid);
	Panel.originalHeight[eid] = dims?.height ?? 10;

	// Set up style and border
	applyPanelStyle(world, eid, validated);
	applyPanelBorder(world, eid, validated);

	// Set up padding for content area (add 1 to top for title bar)
	setPadding(world, eid, calculatePanelPadding(validated.padding));

	// Set initial content
	if (validated.content) {
		setContent(world, eid, validated.content, { align: TextAlign.Left, valign: TextVAlign.Top });
	}

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Default to visible
	setVisible(world, eid, true);

	// If initially collapsed, reduce height to title bar only
	if (validated.collapsed) {
		setDimensions(world, eid, width, 3); // Border + title + border
	}

	// Create the widget object with chainable methods
	const widget: PanelWidget = {
		eid,

		// Visibility
		show(): PanelWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): PanelWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): PanelWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): PanelWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		// Title
		setTitle(title: string): PanelWidget {
			titleStore.set(eid, title);
			markDirty(world, eid);
			return widget;
		},

		getTitle(): string {
			return titleStore.get(eid) ?? DEFAULT_PANEL_TITLE;
		},

		// Content
		setContent(text: string): PanelWidget {
			contentStore.set(eid, text);
			setContent(world, eid, text, { align: TextAlign.Left, valign: TextVAlign.Top });
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return contentStore.get(eid) ?? '';
		},

		// Collapse/Expand
		collapse(): PanelWidget {
			if (Panel.collapsible[eid] === 0) return widget;
			if (Panel.collapsed[eid] === 1) return widget;

			// Store current height
			const dims = getDimensions(world, eid);
			if (dims) {
				Panel.originalHeight[eid] = dims.height;
			}

			// Collapse to title bar height
			const currentDims = getDimensions(world, eid);
			setDimensions(world, eid, currentDims?.width ?? 'auto', 3);
			Panel.collapsed[eid] = 1;
			markDirty(world, eid);
			return widget;
		},

		expand(): PanelWidget {
			if (Panel.collapsible[eid] === 0) return widget;
			if (Panel.collapsed[eid] === 0) return widget;

			// Restore original height
			const originalHeight = Panel.originalHeight[eid] as number;
			const currentDims = getDimensions(world, eid);
			setDimensions(world, eid, currentDims?.width ?? 'auto', originalHeight);
			Panel.collapsed[eid] = 0;
			markDirty(world, eid);
			return widget;
		},

		toggle(): PanelWidget {
			if (Panel.collapsed[eid] === 1) {
				return widget.expand();
			}
			return widget.collapse();
		},

		isCollapsed(): boolean {
			return Panel.collapsed[eid] === 1;
		},

		// Close
		isClosable(): boolean {
			return Panel.closable[eid] === 1;
		},

		close(): void {
			if (Panel.closable[eid] === 1) {
				setVisible(world, eid, false);
			}
		},

		// Focus
		focus(): PanelWidget {
			focus(world, eid);
			return widget;
		},

		blur(): PanelWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): PanelWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Panel.isPanel[eid] = 0;
			Panel.collapsed[eid] = 0;
			Panel.closable[eid] = 0;
			Panel.collapsible[eid] = 0;
			Panel.originalHeight[eid] = 0;
			Panel.titleAlign[eid] = 0;
			titleStore.delete(eid);
			contentStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a panel widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a panel widget
 *
 * @example
 * ```typescript
 * import { isPanel } from 'blecsd/widgets';
 *
 * if (isPanel(world, entity)) {
 *   // Handle panel-specific logic
 * }
 * ```
 */
export function isPanel(_world: World, eid: Entity): boolean {
	return Panel.isPanel[eid] === 1;
}

/**
 * Gets the title of a panel entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The panel title
 */
export function getPanelTitle(_world: World, eid: Entity): string {
	return titleStore.get(eid) ?? DEFAULT_PANEL_TITLE;
}

/**
 * Sets the title of a panel entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param title - The title to set
 * @returns The entity ID for chaining
 */
export function setPanelTitle(world: World, eid: Entity, title: string): Entity {
	titleStore.set(eid, title);
	markDirty(world, eid);
	return eid;
}

/**
 * Gets the collapsed state of a panel entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the panel is collapsed
 */
export function isPanelCollapsed(_world: World, eid: Entity): boolean {
	return Panel.collapsed[eid] === 1;
}

/**
 * Gets the title alignment of a panel entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The title alignment
 */
export function getPanelTitleAlign(_world: World, eid: Entity): TitleAlign {
	return numberToTitleAlign(Panel.titleAlign[eid] as number);
}
