/**
 * Panel Widget
 *
 * A container widget with a title bar, optional close button,
 * and optional collapse/expand functionality.
 *
 * @module widgets/panel
 */

import { removeEntity } from 'bitecs';
import { z } from 'zod';
import {
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Horizontal text alignment for title.
 */
export type TitleAlign = 'left' | 'center' | 'right';

/**
 * Border configuration for panels.
 */
export interface PanelBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Style configuration for the panel title.
 */
export interface PanelTitleStyle {
	/** Title foreground color */
	readonly fg?: string | number;
	/** Title background color */
	readonly bg?: string | number;
	/** Title text alignment */
	readonly align?: TitleAlign;
}

/**
 * Style configuration for the panel content area.
 */
export interface PanelContentStyle {
	/** Content foreground color */
	readonly fg?: string | number;
	/** Content background color */
	readonly bg?: string | number;
}

/**
 * Panel style configuration.
 */
export interface PanelStyleConfig {
	/** Title bar style */
	readonly title?: PanelTitleStyle;
	/** Content area style */
	readonly content?: PanelContentStyle;
	/** Border configuration */
	readonly border?: PanelBorderConfig;
}

/**
 * Padding configuration (all sides, or individual sides).
 */
export type PaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Configuration for creating a Panel widget.
 */
export interface PanelConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Title
	/** Title text */
	readonly title?: string;
	/** Title alignment */
	readonly titleAlign?: TitleAlign;

	// Features
	/** Show close button in title bar */
	readonly closable?: boolean;
	/** Allow collapse/expand */
	readonly collapsible?: boolean;
	/** Initial collapsed state */
	readonly collapsed?: boolean;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Panel style configuration */
	readonly style?: PanelStyleConfig;
	/** Padding configuration for content area */
	readonly padding?: PaddingConfig;

	// Content
	/** Initial content text */
	readonly content?: string;
}

/**
 * Panel widget interface providing chainable methods.
 */
export interface PanelWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the panel */
	show(): PanelWidget;
	/** Hides the panel */
	hide(): PanelWidget;

	// Position
	/** Moves the panel by dx, dy */
	move(dx: number, dy: number): PanelWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): PanelWidget;

	// Title
	/** Sets the panel title */
	setTitle(title: string): PanelWidget;
	/** Gets the panel title */
	getTitle(): string;

	// Content
	/** Sets the content text of the panel */
	setContent(text: string): PanelWidget;
	/** Gets the content text of the panel */
	getContent(): string;

	// Collapse/Expand
	/** Collapses the panel */
	collapse(): PanelWidget;
	/** Expands the panel */
	expand(): PanelWidget;
	/** Toggles collapsed state */
	toggle(): PanelWidget;
	/** Returns whether the panel is collapsed */
	isCollapsed(): boolean;

	// Close
	/** Returns whether the panel is closable */
	isClosable(): boolean;
	/** Closes the panel (hides it) */
	close(): void;

	// Focus
	/** Focuses the panel */
	focus(): PanelWidget;
	/** Blurs the panel */
	blur(): PanelWidget;
	/** Checks if the panel is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to the content area */
	append(child: Entity): PanelWidget;
	/** Gets all direct children of the content area */
	getChildren(): Entity[];

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

/**
 * Panel action types for events.
 */
export type PanelAction = 'close' | 'collapse' | 'expand' | 'toggle';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default panel title */
export const DEFAULT_PANEL_TITLE = '';

/** Close button character */
export const CLOSE_BUTTON_CHAR = '✕';

/** Collapse button character (when expanded) */
export const COLLAPSE_CHAR = '▼';

/** Expand button character (when collapsed) */
export const EXPAND_CHAR = '▶';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z.object({
	type: z.enum(['line', 'bg', 'none']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	ch: z
		.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.object({}).passthrough()])
		.optional(),
});

/**
 * Zod schema for title style.
 */
const TitleStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
});

/**
 * Zod schema for content style.
 */
const ContentStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for panel style configuration.
 */
const PanelStyleSchema = z.object({
	title: TitleStyleSchema.optional(),
	content: ContentStyleSchema.optional(),
	border: BorderConfigSchema.optional(),
});

/**
 * Zod schema for padding configuration.
 */
const PaddingSchema = z.union([
	z.number().nonnegative(),
	z.object({
		left: z.number().nonnegative().optional(),
		top: z.number().nonnegative().optional(),
		right: z.number().nonnegative().optional(),
		bottom: z.number().nonnegative().optional(),
	}),
]);

/**
 * Zod schema for panel widget configuration.
 */
export const PanelConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Title
	title: z.string().optional(),
	titleAlign: z.enum(['left', 'center', 'right']).optional(),

	// Features
	closable: z.boolean().optional(),
	collapsible: z.boolean().optional(),
	collapsed: z.boolean().optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	style: PanelStyleSchema.optional(),
	padding: PaddingSchema.optional(),

	// Content
	content: z.string().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Panel component marker for identifying panel entities.
 */
export const Panel = {
	/** Tag indicating this is a panel widget (1 = yes) */
	isPanel: new Uint8Array(DEFAULT_CAPACITY),
	/** Collapsed state (0 = expanded, 1 = collapsed) */
	collapsed: new Uint8Array(DEFAULT_CAPACITY),
	/** Closable flag (0 = no, 1 = yes) */
	closable: new Uint8Array(DEFAULT_CAPACITY),
	/** Collapsible flag (0 = no, 1 = yes) */
	collapsible: new Uint8Array(DEFAULT_CAPACITY),
	/** Original height (before collapse) */
	originalHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Title alignment (0 = left, 1 = center, 2 = right) */
	titleAlign: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Store for panel titles (strings can't be stored in typed arrays).
 */
const titleStore = new Map<Entity, string>();

/**
 * Store for panel content (strings can't be stored in typed arrays).
 */
const contentStore = new Map<Entity, string>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a color value to a packed 32-bit color.
 */
function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

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

/**
 * Converts title alignment to number.
 */
function titleAlignToNumber(align: TitleAlign): number {
	switch (align) {
		case 'left':
			return 0;
		case 'center':
			return 1;
		case 'right':
			return 2;
	}
}

/**
 * Converts number to title alignment.
 */
function numberToTitleAlign(value: number): TitleAlign {
	switch (value) {
		case 0:
			return 'left';
		case 1:
			return 'center';
		case 2:
			return 'right';
		default:
			return 'left';
	}
}

/**
 * Validated config type from PanelConfigSchema.
 */
interface ValidatedPanelConfig {
	left?: string | number;
	top?: string | number;
	width?: string | number;
	height?: string | number;
	title?: string;
	titleAlign?: 'left' | 'center' | 'right';
	closable?: boolean;
	collapsible?: boolean;
	collapsed?: boolean;
	fg?: string | number;
	bg?: string | number;
	style?: {
		title?: {
			fg?: string | number;
			bg?: string | number;
			align?: 'left' | 'center' | 'right';
		};
		content?: {
			fg?: string | number;
			bg?: string | number;
		};
		border?: {
			type?: 'line' | 'bg' | 'none';
			fg?: string | number;
			bg?: string | number;
			ch?: string | object;
		};
	};
	padding?:
		| number
		| {
				left?: number;
				top?: number;
				right?: number;
				bottom?: number;
		  };
	content?: string;
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

// =============================================================================
// FACTORY
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
 * import { createWorld, addEntity } from 'bitecs';
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

	// Set up style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Set up border (default to single line)
	const borderConfig = validated.style?.border;
	if (borderConfig?.type !== 'none') {
		setBorder(world, eid, {
			type: borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line,
			fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
			bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
		});
	}
	setBorderChars(world, eid, getBorderCharset(borderConfig?.ch));

	// Set up padding for content area (add 1 to top for title bar)
	const padding = validated.padding;
	if (typeof padding === 'number') {
		setPadding(world, eid, {
			left: padding,
			top: padding + 1, // Add space for title
			right: padding,
			bottom: padding,
		});
	} else if (padding) {
		setPadding(world, eid, {
			left: padding.left ?? 0,
			top: (padding.top ?? 0) + 1, // Add space for title
			right: padding.right ?? 0,
			bottom: padding.bottom ?? 0,
		});
	} else {
		// Default: just add space for title
		setPadding(world, eid, { left: 0, top: 1, right: 0, bottom: 0 });
	}

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

/**
 * Renders the panel title bar.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param width - Available width for title bar
 * @returns The rendered title bar string
 */
export function renderPanelTitleBar(_world: World, eid: Entity, width: number): string {
	const title = titleStore.get(eid) ?? '';
	const closable = Panel.closable[eid] === 1;
	const collapsible = Panel.collapsible[eid] === 1;
	const collapsed = Panel.collapsed[eid] === 1;
	const align = numberToTitleAlign(Panel.titleAlign[eid] as number);

	// Calculate available space
	const buttonSpace = (closable ? 2 : 0) + (collapsible ? 2 : 0);
	const availableWidth = Math.max(0, width - buttonSpace);

	// Truncate title if needed
	let displayTitle = title;
	if (displayTitle.length > availableWidth) {
		displayTitle = `${displayTitle.slice(0, availableWidth - 1)}…`;
	}

	// Build buttons
	let buttons = '';
	if (collapsible) {
		buttons += collapsed ? `${EXPAND_CHAR} ` : `${COLLAPSE_CHAR} `;
	}
	if (closable) {
		buttons += `${CLOSE_BUTTON_CHAR} `;
	}
	buttons = buttons.trimEnd();

	// Pad title based on alignment
	const totalPadding = availableWidth - displayTitle.length;
	let leftPad = 0;
	let rightPad = 0;

	switch (align) {
		case 'left':
			rightPad = totalPadding;
			break;
		case 'center':
			leftPad = Math.floor(totalPadding / 2);
			rightPad = totalPadding - leftPad;
			break;
		case 'right':
			leftPad = totalPadding;
			break;
	}

	return `${' '.repeat(leftPad)}${displayTitle}${' '.repeat(rightPad)}${buttons}`;
}

/**
 * Resets the Panel component store. Useful for testing.
 * @internal
 */
export function resetPanelStore(): void {
	Panel.isPanel.fill(0);
	Panel.collapsed.fill(0);
	Panel.closable.fill(0);
	Panel.collapsible.fill(0);
	Panel.originalHeight.fill(0);
	Panel.titleAlign.fill(0);
	titleStore.clear();
	contentStore.clear();
}
