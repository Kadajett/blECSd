/**
 * Panel Widget Types
 *
 * TypeScript interfaces and type definitions for the Panel widget.
 *
 * @module widgets/panel/types
 */

import type { BorderCharset } from '../../components/border';
import type { Entity } from '../../core/types';

// =============================================================================
// DIMENSION AND POSITION TYPES
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

// =============================================================================
// STYLE CONFIGURATION TYPES
// =============================================================================

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
 * Panel style configuration for customizing visual appearance.
 *
 * @example
 * ```typescript
 * style: {
 *   title: { fg: '#FFFF00', bg: '#000080', align: 'center' },
 *   content: { fg: '#FFFFFF', bg: '#000000' },
 *   border: { type: 'line', ch: 'double', fg: '#00FFFF' }
 * }
 * ```
 */
export interface PanelStyleConfig {
	/**
	 * Title bar styling (colors and alignment)
	 * @default undefined (uses panel fg/bg)
	 */
	readonly title?: PanelTitleStyle;
	/**
	 * Content area styling (colors)
	 * @default undefined (uses panel fg/bg)
	 */
	readonly content?: PanelContentStyle;
	/**
	 * Border styling (type, colors, and characters)
	 * @default undefined (uses panel fg/bg with default border)
	 */
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

// =============================================================================
// PANEL CONFIGURATION
// =============================================================================

/**
 * Configuration for creating a Panel widget.
 *
 * @example
 * ```typescript
 * const panel = createPanel(world, eid, {
 *   left: 10,
 *   top: 5,
 *   width: 50,
 *   height: 30,
 *   title: 'My Panel',
 *   titleAlign: 'center',
 *   closable: true,
 *   collapsible: true,
 *   content: 'Panel content goes here',
 *   padding: 2,
 *   style: {
 *     title: { fg: '#FFFF00', align: 'center' },
 *     border: { type: 'line', ch: 'double' }
 *   }
 * });
 * ```
 */
export interface PanelConfig {
	// Position
	/**
	 * Left position (absolute pixels, percentage of parent, or keyword)
	 * @default 0
	 */
	readonly left?: PositionValue;
	/**
	 * Top position (absolute pixels, percentage of parent, or keyword)
	 * @default 0
	 */
	readonly top?: PositionValue;
	/**
	 * Width (absolute pixels, percentage of parent, or 'auto')
	 * @default 'auto'
	 */
	readonly width?: DimensionValue;
	/**
	 * Height (absolute pixels, percentage of parent, or 'auto')
	 * @default 'auto'
	 */
	readonly height?: DimensionValue;

	// Title
	/**
	 * Title text displayed in the title bar
	 * @default '' (empty string, no title bar)
	 */
	readonly title?: string;
	/**
	 * Horizontal alignment of title text
	 * @default 'left'
	 */
	readonly titleAlign?: TitleAlign;

	// Features
	/**
	 * Show close button (×) in title bar
	 * @default false
	 */
	readonly closable?: boolean;
	/**
	 * Allow panel to be collapsed/expanded via title bar click
	 * @default false
	 */
	readonly collapsible?: boolean;
	/**
	 * Initial collapsed state (requires collapsible: true)
	 * @default false
	 */
	readonly collapsed?: boolean;

	// Style
	/**
	 * Foreground (text) color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default foreground color
	 */
	readonly fg?: string | number;
	/**
	 * Background color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default background color
	 */
	readonly bg?: string | number;
	/**
	 * Detailed style configuration for title, content, and border
	 * @default undefined (uses default styling)
	 */
	readonly style?: PanelStyleConfig;
	/**
	 * Padding configuration for content area (uniform or per-side)
	 * @default 0
	 */
	readonly padding?: PaddingConfig;

	// Content
	/**
	 * Initial text content displayed in the panel body
	 * @default '' (empty string)
	 */
	readonly content?: string;
}

// =============================================================================
// PANEL WIDGET INTERFACE
// =============================================================================

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
// INTERNAL TYPES
// =============================================================================

/**
 * Validated config type from PanelConfigSchema.
 * @internal
 */
export interface ValidatedPanelConfig {
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
