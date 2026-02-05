/**
 * Tabs Widget
 *
 * A tabbed container widget that manages multiple content panels
 * with a tab bar for navigation.
 *
 * @module widgets/tabs
 */

import { z } from 'zod';
import { type BorderCharset, BorderType, setBorder } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
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

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default tab position */
export const DEFAULT_TAB_POSITION: TabPosition = 'top';

/** Tab separator character */
export const TAB_SEPARATOR = ' │ ';

/** Close button character */
export const TAB_CLOSE_CHAR = '✕';

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
 * Zod schema for tab configuration.
 */
const TabConfigSchema = z.object({
	label: z.string(),
	content: z.union([z.number(), z.function()]).optional(),
	closable: z.boolean().optional(),
});

/**
 * Zod schema for tab style.
 */
const TabStyleSchema = z.object({
	activeFg: z.union([z.string(), z.number()]).optional(),
	activeBg: z.union([z.string(), z.number()]).optional(),
	inactiveFg: z.union([z.string(), z.number()]).optional(),
	inactiveBg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Zod schema for content style.
 */
const ContentStyleSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

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
 * Zod schema for tabs style configuration.
 */
const TabsStyleSchema = z.object({
	tab: TabStyleSchema.optional(),
	content: ContentStyleSchema.optional(),
	border: BorderConfigSchema.optional(),
});

/**
 * Zod schema for tabs widget configuration.
 */
export const TabsConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Tabs
	tabs: z.array(TabConfigSchema).optional(),
	activeTab: z.number().nonnegative().optional(),
	position: z.enum(['top', 'bottom']).optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	style: TabsStyleSchema.optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Tabs component marker for identifying tabs entities.
 */
export const Tabs = {
	/** Tag indicating this is a tabs widget (1 = yes) */
	isTabs: new Uint8Array(DEFAULT_CAPACITY),
	/** Active tab index */
	activeTab: new Uint16Array(DEFAULT_CAPACITY),
	/** Tab position (0 = top, 1 = bottom) */
	position: new Uint8Array(DEFAULT_CAPACITY),
	/** Number of tabs */
	tabCount: new Uint16Array(DEFAULT_CAPACITY),
};

/**
 * Store for tab data (arrays can't be stored in typed arrays).
 */
const tabDataStore = new Map<Entity, TabData[]>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a color value to a packed 32-bit color.
 */
function parseColor(color: string | number): number {
	return typeof color === 'string' ? hexToColor(color) : color;
}

/** Converts tab config to internal TabData. */
function tabConfigToData(tab: {
	label: string;
	content?: number | (() => number);
	closable?: boolean;
}): TabData {
	return {
		label: tab.label,
		contentEntity: typeof tab.content === 'number' ? tab.content : null,
		lazyLoader: typeof tab.content === 'function' ? (tab.content as () => Entity) : null,
		closable: tab.closable ?? false,
		loaded: typeof tab.content === 'number',
	};
}

/** Initializes tab data store from config. */
function initializeTabData(eid: Entity, tabs: ValidatedTabsConfig['tabs']): TabData[] {
	const tabData = tabs ? tabs.map(tabConfigToData) : [];
	tabDataStore.set(eid, tabData);
	return tabData;
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
 * Handles key events for tabs navigation.
 */
function handleTabsKey(key: string, widget: TabsWidget): TabsAction | null {
	if (key === 'Tab' || key === 'right') {
		widget.nextTab();
		return { type: 'next' };
	}
	if (key === 'S-Tab' || key === 'left') {
		widget.prevTab();
		return { type: 'prev' };
	}
	// Number keys 1-9 for direct tab access
	if (key >= '1' && key <= '9') {
		const idx = Number.parseInt(key, 10) - 1;
		const count = widget.getTabCount();
		if (idx < count) {
			widget.setActiveTab(idx);
			return { type: 'goto', index: idx };
		}
	}
	return null;
}

/**
 * Sets up style for tabs from config.
 */
function applyTabsStyle(world: World, eid: Entity, validated: ValidatedTabsConfig): void {
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}
}

/**
 * Sets up border for tabs from config.
 */
function applyTabsBorder(world: World, eid: Entity, validated: ValidatedTabsConfig): void {
	const borderConfig = validated.style?.border;
	if (borderConfig?.type === 'none') return;

	setBorder(world, eid, {
		type: borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line,
		fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});
}

/**
 * Loads lazy content for a tab if needed.
 */
function loadTabContentImpl(world: World, eid: Entity, index: number): void {
	const data = tabDataStore.get(eid);
	if (!data || index < 0 || index >= data.length) return;

	const tab = data[index];
	if (!tab) return;

	if (!tab.loaded && tab.lazyLoader) {
		tab.contentEntity = tab.lazyLoader();
		tab.loaded = true;
		if (tab.contentEntity !== null) {
			appendChild(world, eid, tab.contentEntity);
		}
	}
}

/**
 * Shows content for the active tab and hides others.
 */
function updateTabContentVisibility(world: World, eid: Entity): void {
	const data = tabDataStore.get(eid);
	if (!data) return;

	const activeIdx = Tabs.activeTab[eid] as number;

	for (let i = 0; i < data.length; i++) {
		const tab = data[i];
		if (tab?.contentEntity !== null && tab?.contentEntity !== undefined) {
			setVisible(world, tab.contentEntity, i === activeIdx);
		}
	}
}

/**
 * Validated config type.
 */
interface ValidatedTabsConfig {
	left?: string | number;
	top?: string | number;
	width?: string | number;
	height?: string | number;
	tabs?: Array<{
		label: string;
		content?: number | (() => number);
		closable?: boolean;
	}>;
	activeTab?: number;
	position?: 'top' | 'bottom';
	fg?: string | number;
	bg?: string | number;
	style?: {
		tab?: {
			activeFg?: string | number;
			activeBg?: string | number;
			inactiveFg?: string | number;
			inactiveBg?: string | number;
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
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Tabs widget with the given configuration.
 *
 * The Tabs widget is a container with a tab bar for navigating
 * between multiple content panels.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Tabs widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createTabs } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Basic tabs
 * const tabs = createTabs(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 60,
 *   height: 20,
 *   tabs: [
 *     { label: 'Tab 1' },
 *     { label: 'Tab 2' },
 *     { label: 'Tab 3', closable: true },
 *   ],
 * });
 *
 * // Navigate between tabs
 * tabs.nextTab();
 * tabs.setActiveTab(2);
 * ```
 */
export function createTabs(world: World, entity: Entity, config: TabsConfig = {}): TabsWidget {
	const validated = TabsConfigSchema.parse(config) as ValidatedTabsConfig;
	const eid = entity;

	// Mark as tabs and initialize data
	Tabs.isTabs[eid] = 1;
	Tabs.position[eid] = validated.position === 'bottom' ? 1 : 0;
	const tabData = initializeTabData(eid, validated.tabs);
	Tabs.tabCount[eid] = tabData.length;
	const activeTab = Math.min(validated.activeTab ?? 0, Math.max(0, tabData.length - 1));
	Tabs.activeTab[eid] = activeTab;

	// Set up layout
	setPosition(
		world,
		eid,
		parsePositionToNumber(validated.left),
		parsePositionToNumber(validated.top),
	);
	setDimensions(world, eid, parseDimension(validated.width), parseDimension(validated.height));

	// Set up style and border
	applyTabsStyle(world, eid, validated);
	applyTabsBorder(world, eid, validated);

	// Set default state
	setFocusable(world, eid, { focusable: true });
	setVisible(world, eid, true);

	// Load and show initial active tab content
	if (tabData.length > 0) {
		loadTabContentImpl(world, eid, activeTab);
		updateTabContentVisibility(world, eid);
	}

	// Create the widget object with chainable methods
	const widget: TabsWidget = {
		eid,

		// Visibility
		show(): TabsWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TabsWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): TabsWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): TabsWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		// Tab management
		addTab(tabConfig: TabConfig): TabsWidget {
			const data = tabDataStore.get(eid) ?? [];
			const newTab: TabData = {
				label: tabConfig.label,
				contentEntity: typeof tabConfig.content === 'number' ? tabConfig.content : null,
				lazyLoader:
					typeof tabConfig.content === 'function' ? (tabConfig.content as () => Entity) : null,
				closable: tabConfig.closable ?? false,
				loaded: typeof tabConfig.content === 'number',
			};
			data.push(newTab);
			tabDataStore.set(eid, data);
			Tabs.tabCount[eid] = data.length;
			markDirty(world, eid);
			return widget;
		},

		removeTab(index: number): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			data.splice(index, 1);
			Tabs.tabCount[eid] = data.length;

			// Adjust active tab if needed
			const activeIdx = Tabs.activeTab[eid] as number;
			if (activeIdx >= data.length && data.length > 0) {
				Tabs.activeTab[eid] = data.length - 1;
			} else if (data.length === 0) {
				Tabs.activeTab[eid] = 0;
			}

			updateTabContentVisibility(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getActiveTab(): number {
			return Tabs.activeTab[eid] as number;
		},

		setActiveTab(index: number): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			Tabs.activeTab[eid] = index;
			loadTabContentImpl(world, eid, index);
			updateTabContentVisibility(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getTabCount(): number {
			return Tabs.tabCount[eid] as number;
		},

		getTab(index: number): TabData | undefined {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return undefined;
			return data[index];
		},

		setTabLabel(index: number, label: string): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			const tab = data[index];
			if (tab) {
				tab.label = label;
			}
			markDirty(world, eid);
			return widget;
		},

		// Navigation
		nextTab(): TabsWidget {
			const count = Tabs.tabCount[eid] as number;
			if (count === 0) return widget;

			const currentIdx = Tabs.activeTab[eid] as number;
			const nextIdx = (currentIdx + 1) % count;
			return widget.setActiveTab(nextIdx);
		},

		prevTab(): TabsWidget {
			const count = Tabs.tabCount[eid] as number;
			if (count === 0) return widget;

			const currentIdx = Tabs.activeTab[eid] as number;
			const prevIdx = currentIdx === 0 ? count - 1 : currentIdx - 1;
			return widget.setActiveTab(prevIdx);
		},

		// Focus
		focus(): TabsWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TabsWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Key handling
		handleKey(key: string): TabsAction | null {
			if (!widget.isFocused()) return null;
			return handleTabsKey(key, widget);
		},

		// Lifecycle
		destroy(): void {
			Tabs.isTabs[eid] = 0;
			Tabs.activeTab[eid] = 0;
			Tabs.position[eid] = 0;
			Tabs.tabCount[eid] = 0;
			tabDataStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a tabs widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a tabs widget
 *
 * @example
 * ```typescript
 * import { isTabs } from 'blecsd/widgets';
 *
 * if (isTabs(world, entity)) {
 *   // Handle tabs-specific logic
 * }
 * ```
 */
export function isTabs(_world: World, eid: Entity): boolean {
	return Tabs.isTabs[eid] === 1;
}

/**
 * Gets the active tab index of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The active tab index
 */
export function getActiveTabIndex(_world: World, eid: Entity): number {
	return Tabs.activeTab[eid] as number;
}

/**
 * Gets the tab count of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The number of tabs
 */
export function getTabCount(_world: World, eid: Entity): number {
	return Tabs.tabCount[eid] as number;
}

/**
 * Gets the tab position of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The tab position ('top' or 'bottom')
 */
export function getTabPosition(_world: World, eid: Entity): TabPosition {
	return Tabs.position[eid] === 1 ? 'bottom' : 'top';
}

/**
 * Renders the tab bar for a tabs entity.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param width - Available width for the tab bar
 * @returns The rendered tab bar string
 */
export function renderTabBar(_world: World, eid: Entity, width: number): string {
	const data = tabDataStore.get(eid);
	if (!data || data.length === 0) {
		return ' '.repeat(width);
	}

	const activeIdx = Tabs.activeTab[eid] as number;

	let result = '';
	for (let i = 0; i < data.length; i++) {
		const tab = data[i];
		if (!tab) continue;

		if (i > 0) {
			result += TAB_SEPARATOR;
		}

		const label = i === activeIdx ? `[${tab.label}]` : ` ${tab.label} `;
		const closeBtn = tab.closable ? ` ${TAB_CLOSE_CHAR}` : '';
		result += label + closeBtn;
	}

	// Pad or truncate to width
	if (result.length > width) {
		result = `${result.slice(0, width - 1)}…`;
	} else if (result.length < width) {
		result = result + ' '.repeat(width - result.length);
	}

	return result;
}

/**
 * Resets the Tabs component store. Useful for testing.
 * @internal
 */
export function resetTabsStore(): void {
	Tabs.isTabs.fill(0);
	Tabs.activeTab.fill(0);
	Tabs.position.fill(0);
	Tabs.tabCount.fill(0);
	tabDataStore.clear();
}
