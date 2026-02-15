/**
 * ScrollableBox Widget Types
 *
 * TypeScript interfaces and type definitions for the ScrollableBox widget.
 *
 * @module widgets/scrollableBox/types
 */

import type { BorderCharset } from '../../components/border';
import type {
	ScrollableData,
	ScrollPercentage,
	ScrollPosition,
} from '../../components/scrollable';
import type { Entity } from '../../core/types';

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
 * Horizontal text alignment.
 */
export type Align = 'left' | 'center' | 'right';

/**
 * Vertical text alignment.
 */
export type VAlign = 'top' | 'middle' | 'bottom';

/**
 * Border configuration for boxes.
 */
export interface BorderConfig {
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
 * Scrollbar visibility mode.
 */
export type ScrollbarMode = 'auto' | 'visible' | 'hidden';

/**
 * Scrollbar configuration.
 */
export interface ScrollbarConfig {
	/** Scrollbar visibility mode */
	readonly mode?: ScrollbarMode;
	/** Scrollbar foreground color */
	readonly fg?: string | number;
	/** Scrollbar background color */
	readonly bg?: string | number;
	/** Track character */
	readonly trackChar?: string;
	/** Thumb character */
	readonly thumbChar?: string;
}

/**
 * Configuration for creating a ScrollableBox widget.
 */
export interface ScrollableBoxConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Right position (absolute or percentage) */
	readonly right?: PositionValue;
	/** Bottom position (absolute or percentage) */
	readonly bottom?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Padding configuration */
	readonly padding?: PaddingConfig;

	// Content
	/** Text content */
	readonly content?: string;
	/** Horizontal text alignment */
	readonly align?: Align;
	/** Vertical text alignment */
	readonly valign?: VAlign;

	// Scrolling
	/** Scrollbar configuration (true for default, false to disable, or config) */
	readonly scrollbar?: boolean | ScrollbarConfig;
	/** Always show scrollbar even if content fits */
	readonly alwaysScroll?: boolean;
	/** Enable mouse wheel scrolling (default: true) */
	readonly mouse?: boolean;
	/** Enable keyboard scrolling (default: true) */
	readonly keys?: boolean;
	/** Total scrollable content width */
	readonly scrollWidth?: number;
	/** Total scrollable content height */
	readonly scrollHeight?: number;
	/** Initial scroll X position */
	readonly scrollX?: number;
	/** Initial scroll Y position */
	readonly scrollY?: number;
}

/**
 * ScrollableBox widget interface providing chainable methods.
 */
export interface ScrollableBoxWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the scrollable box */
	show(): ScrollableBoxWidget;
	/** Hides the scrollable box */
	hide(): ScrollableBoxWidget;

	// Position
	/** Moves the scrollable box by dx, dy */
	move(dx: number, dy: number): ScrollableBoxWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ScrollableBoxWidget;

	// Content
	/** Sets the text content of the scrollable box */
	setContent(text: string): ScrollableBoxWidget;
	/** Gets the text content of the scrollable box */
	getContent(): string;

	// Focus
	/** Focuses the scrollable box */
	focus(): ScrollableBoxWidget;
	/** Blurs the scrollable box */
	blur(): ScrollableBoxWidget;
	/** Checks if the scrollable box is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this scrollable box */
	append(child: Entity): ScrollableBoxWidget;
	/** Gets all direct children of this scrollable box */
	getChildren(): Entity[];

	// Scrolling
	/** Scrolls to absolute position */
	scrollTo(x: number, y: number): ScrollableBoxWidget;
	/** Scrolls by delta */
	scrollBy(dx: number, dy: number): ScrollableBoxWidget;
	/** Scrolls to percentage (0-100) */
	setScrollPerc(percX: number, percY: number): ScrollableBoxWidget;
	/** Gets scroll percentage (0-100) */
	getScrollPerc(): ScrollPercentage;
	/** Gets scroll position */
	getScroll(): ScrollPosition;
	/** Sets scrollable content size */
	setScrollSize(width: number, height: number): ScrollableBoxWidget;
	/** Sets viewport size */
	setViewport(width: number, height: number): ScrollableBoxWidget;
	/** Gets full scrollable data */
	getScrollable(): ScrollableData | undefined;
	/** Scrolls to top */
	scrollToTop(): ScrollableBoxWidget;
	/** Scrolls to bottom */
	scrollToBottom(): ScrollableBoxWidget;
	/** Scrolls to left */
	scrollToLeft(): ScrollableBoxWidget;
	/** Scrolls to right */
	scrollToRight(): ScrollableBoxWidget;
	/** Checks if can scroll (content exceeds viewport) */
	canScroll(): boolean;
	/** Checks if can scroll horizontally */
	canScrollX(): boolean;
	/** Checks if can scroll vertically */
	canScrollY(): boolean;
	/** Checks if scrolled to top */
	isAtTop(): boolean;
	/** Checks if scrolled to bottom */
	isAtBottom(): boolean;
	/** Checks if scrolled to left */
	isAtLeft(): boolean;
	/** Checks if scrolled to right */
	isAtRight(): boolean;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}
