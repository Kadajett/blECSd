/**
 * Tabs Widget Types
 *
 * Type definitions for tabs widget configuration and API.
 *
 * @module widgets/tabs/types
 */

import type { BorderCharset } from '../../components/border';
import type { Entity } from '../../core/types';

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Tab bar position.
 */
export type TabPosition = 'top' | 'bottom';

/**
 * Individual tab configuration.
 */
export interface TabConfig {
	/** Tab label text */
	readonly label: string;
	/** Tab content (entity ID or lazy loader function) */
	readonly content?: Entity | (() => Entity);
	/** Whether the tab is closable */
	readonly closable?: boolean;
}

/**
 * Tab style configuration.
 */
export interface TabStyleConfig {
	/** Active tab foreground color */
	readonly activeFg?: string | number;
	/** Active tab background color */
	readonly activeBg?: string | number;
	/** Inactive tab foreground color */
	readonly inactiveFg?: string | number;
	/** Inactive tab background color */
	readonly inactiveBg?: string | number;
}

/**
 * Content area style configuration.
 */
export interface ContentStyleConfig {
	/** Content foreground color */
	readonly fg?: string | number;
	/** Content background color */
	readonly bg?: string | number;
}

/**
 * Border configuration for tabs.
 */
export interface TabsBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border */
	readonly fg?: string | number;
	/** Background color for border */
	readonly bg?: string | number;
	/** Border charset */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Tabs style configuration.
 */
export interface TabsStyleConfig {
	/** Tab style */
	readonly tab?: TabStyleConfig;
	/** Content area style */
	readonly content?: ContentStyleConfig;
	/** Border configuration */
	readonly border?: TabsBorderConfig;
}

/**
 * Configuration for creating a Tabs widget.
 */
export interface TabsConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Tabs
	/** Array of tab configurations */
	readonly tabs?: readonly TabConfig[];
	/** Initially active tab index (0-based) */
	readonly activeTab?: number;
	/** Tab bar position */
	readonly position?: TabPosition;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Style configuration */
	readonly style?: TabsStyleConfig;
}

/**
 * Tab data stored internally.
 */
export interface TabData {
	/** Tab label */
	label: string;
	/** Content entity (created or provided) */
	contentEntity: Entity | null;
	/** Lazy content loader */
	lazyLoader: (() => Entity) | null;
	/** Whether the tab is closable */
	closable: boolean;
	/** Whether content has been loaded (for lazy loading) */
	loaded: boolean;
}

/**
 * Tabs widget interface providing chainable methods.
 */
export interface TabsWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the tabs */
	show(): TabsWidget;
	/** Hides the tabs */
	hide(): TabsWidget;

	// Position
	/** Moves the tabs by dx, dy */
	move(dx: number, dy: number): TabsWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): TabsWidget;

	// Tab management
	/** Adds a new tab */
	addTab(config: TabConfig): TabsWidget;
	/** Removes a tab by index */
	removeTab(index: number): TabsWidget;
	/** Gets the active tab index */
	getActiveTab(): number;
	/** Sets the active tab by index */
	setActiveTab(index: number): TabsWidget;
	/** Gets the number of tabs */
	getTabCount(): number;
	/** Gets tab data by index */
	getTab(index: number): TabData | undefined;
	/** Sets the tab label */
	setTabLabel(index: number, label: string): TabsWidget;

	// Navigation
	/** Moves to the next tab */
	nextTab(): TabsWidget;
	/** Moves to the previous tab */
	prevTab(): TabsWidget;

	// Focus
	/** Focuses the tabs widget */
	focus(): TabsWidget;
	/** Blurs the tabs widget */
	blur(): TabsWidget;
	/** Checks if the tabs widget is focused */
	isFocused(): boolean;

	// Children
	/** Gets all direct children of the content area */
	getChildren(): Entity[];

	// Key handling
	/** Handles key input, returns action taken or null */
	handleKey(key: string): TabsAction | null;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

/**
 * Tab action types.
 */
export type TabsAction =
	| { type: 'next' }
	| { type: 'prev' }
	| { type: 'goto'; index: number }
	| { type: 'close'; index: number };
