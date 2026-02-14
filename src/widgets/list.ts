/**
 * List Widget
 *
 * Provides a chainable API wrapper around the List component for creating
 * selectable list widgets with keyboard and mouse support.
 *
 * @module widgets/list
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import {
	activateSelected,
	appendToSearchQuery,
	attachListBehavior,
	backspaceSearchQuery,
	blurList,
	clearItems,
	clearListCallbacks,
	clearListFilter,
	clearSearchQuery,
	deselectAllItems,
	endListSearch,
	findNextMatch,
	focusList,
	getFilteredItems,
	getItems,
	getListSearchQuery,
	getListState,
	getMultiSelected,
	getSelectedIndex,
	getSelectedItem,
	handleListKeyPress,
	isList,
	isListSearching,
	type ListAction,
	type ListDisplayOptions,
	type ListItem,
	type ListSelectCallback,
	type ListState,
	onListActivate,
	onListCancel,
	onListSearchChange,
	onListSelect,
	removeItem,
	scrollPage,
	selectAllItems,
	selectFirst,
	selectLast,
	selectNext,
	selectPrev,
	setItems,
	setListDisplay,
	setListFilter,
	setListMultiSelect,
	setSelectedIndex,
	startListSearch,
	toggleMultiSelect,
	triggerListCancel,
} from '../components/list';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Style configuration for list items.
 *
 * @example
 * ```typescript
 * style: {
 *   item: { fg: 0xFFFFFFFF, bg: 0x000000FF },
 *   selected: { fg: 0x000000FF, bg: 0x00FF00FF, prefix: '> ' },
 *   unselectedPrefix: '  ',
 *   disabledFg: 0x888888FF
 * }
 * ```
 */
export interface ListStyleConfig {
	/**
	 * Style for regular (unselected) items
	 * @default undefined (uses terminal defaults)
	 */
	readonly item?: {
		/** Foreground color @default Terminal default */
		readonly fg?: number;
		/** Background color @default Terminal default */
		readonly bg?: number;
	};
	/**
	 * Style for the currently selected item
	 * @default undefined (uses inverted colors)
	 */
	readonly selected?: {
		/** Foreground color @default Inverted terminal fg */
		readonly fg?: number;
		/** Background color @default Inverted terminal bg */
		readonly bg?: number;
		/** Prefix string shown before selected item @default '> ' */
		readonly prefix?: string;
	};
	/**
	 * Prefix string shown before unselected items
	 * @default '  ' (two spaces)
	 */
	readonly unselectedPrefix?: string;
	/**
	 * Foreground color for disabled items
	 * @default 0x888888FF (gray)
	 */
	readonly disabledFg?: number;
}

/**
 * Zod schema for ListStyleConfig validation.
 *
 * @example
 * ```typescript
 * import { ListStyleConfigSchema } from 'blecsd';
 *
 * const style = ListStyleConfigSchema.parse({
 *   item: { fg: 0xFFFFFFFF, bg: 0x000000FF },
 *   selected: { fg: 0x000000FF, bg: 0x00FF00FF, prefix: '> ' },
 *   unselectedPrefix: '  ',
 * });
 * ```
 */
export const ListStyleConfigSchema = z.object({
	item: z
		.object({
			fg: z.number().int().nonnegative().optional(),
			bg: z.number().int().nonnegative().optional(),
		})
		.optional(),
	selected: z
		.object({
			fg: z.number().int().nonnegative().optional(),
			bg: z.number().int().nonnegative().optional(),
			prefix: z.string().optional(),
		})
		.optional(),
	unselectedPrefix: z.string().optional(),
	disabledFg: z.number().int().nonnegative().optional(),
});

/**
 * Configuration for creating a List widget.
 *
 * @example
 * ```typescript
 * const list = createList(world, eid, {
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   height: 10,
 *   items: ['Item 1', 'Item 2', 'Item 3'],
 *   selected: 0,
 *   interactive: true,
 *   keys: true,
 *   mouse: true,
 *   search: true,
 *   multiSelect: false,
 *   style: {
 *     selected: { bg: 0x00FF00FF, prefix: '> ' }
 *   }
 * });
 * ```
 */
export interface ListWidgetConfig {
	/**
	 * X (horizontal) position in cells
	 * @default 0
	 */
	readonly x?: number;
	/**
	 * Y (vertical) position in cells
	 * @default 0
	 */
	readonly y?: number;
	/**
	 * Width of the list in cells
	 * @default 20
	 */
	readonly width?: number;
	/**
	 * Height of the list in cells (number of visible items)
	 * @default 10
	 */
	readonly height?: number;
	/**
	 * Array of items to display in the list
	 * @default [] (empty array)
	 */
	readonly items?: readonly string[];
	/**
	 * Initially selected item index (0-based)
	 * @default 0
	 */
	readonly selected?: number;
	/**
	 * Style configuration for items and selection
	 * @default undefined (uses default styling)
	 */
	readonly style?: ListStyleConfig;
	/**
	 * Whether the list responds to user input
	 * @default true
	 */
	readonly interactive?: boolean;
	/**
	 * Whether mouse clicks/scrolling are enabled
	 * @default true
	 */
	readonly mouse?: boolean;
	/**
	 * Whether keyboard navigation (arrow keys, Enter) is enabled
	 * @default true
	 */
	readonly keys?: boolean;
	/**
	 * Whether search/filter mode is enabled (type to filter items)
	 * @default false
	 */
	readonly search?: boolean;
	/**
	 * Whether multiple items can be selected simultaneously
	 * @default false
	 */
	readonly multiSelect?: boolean;
}

/**
 * List widget interface providing chainable methods.
 */
export interface ListWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the list */
	show(): ListWidget;
	/** Hides the list */
	hide(): ListWidget;

	// Position
	/** Moves the list by dx, dy */
	move(dx: number, dy: number): ListWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ListWidget;

	// Focus
	/** Focuses the list */
	focus(): ListWidget;
	/** Blurs the list */
	blur(): ListWidget;

	// Items
	/** Sets the items in the list */
	setItems(items: readonly string[]): ListWidget;
	/** Gets all items */
	getItems(): readonly ListItem[];
	/** Adds an item to the list */
	addItem(text: string, value?: string): ListWidget;
	/** Removes an item by index */
	removeItem(index: number): ListWidget;
	/** Clears all items */
	clearItems(): ListWidget;

	// Selection
	/** Selects the item at the given index */
	select(index: number): ListWidget;
	/** Gets the currently selected index */
	getSelectedIndex(): number;
	/** Gets the currently selected item */
	getSelectedItem(): ListItem | undefined;
	/** Selects the previous item */
	selectPrev(): ListWidget;
	/** Selects the next item */
	selectNext(): ListWidget;
	/** Selects the first item */
	selectFirst(): ListWidget;
	/** Selects the last item */
	selectLast(): ListWidget;
	/** Activates (confirms) the current selection */
	activate(): ListWidget;

	// Scrolling
	/** Scrolls up one page */
	pageUp(): ListWidget;
	/** Scrolls down one page */
	pageDown(): ListWidget;

	// Search
	/** Enters search mode */
	startSearch(): ListWidget;
	/** Exits search mode */
	endSearch(): ListWidget;
	/** Gets the current search query */
	getSearchQuery(): string;
	/** Checks if in search mode */
	isSearching(): boolean;

	// State
	/** Gets the current state */
	getState(): ListState;

	// Events
	/** Registers callback for selection change */
	onSelect(callback: ListSelectCallback): () => void;
	/** Registers callback for item activation */
	onActivate(callback: ListSelectCallback): () => void;
	/** Registers callback for cancel event (Escape key) */
	onCancel(callback: () => void): () => void;
	/** Registers callback for search query change */
	onSearchChange(callback: (query: string) => void): () => void;

	// Multi-select
	/** Gets selected indices (multi-select mode only) */
	getSelected(): number[];
	/** Selects all items (multi-select mode only) */
	selectAll(): ListWidget;
	/** Deselects all items (multi-select mode only) */
	deselectAll(): ListWidget;

	// Filter
	/** Sets filter text to show only matching items */
	setFilter(text: string): ListWidget;
	/** Clears the filter */
	clearFilter(): ListWidget;
	/** Gets currently visible items (after filtering) */
	getVisibleItems(): readonly ListItem[];

	// Key handling
	/** Handles a key press, returns the action taken */
	handleKey(key: string): ListAction | null;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for list widget configuration.
 */
export const ListWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(20),
	height: z.number().int().positive().default(10),
	items: z.array(z.string()).default([]),
	selected: z.number().int().min(-1).default(0),
	style: z
		.object({
			item: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			selected: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
					prefix: z.string().optional(),
				})
				.optional(),
			unselectedPrefix: z.string().optional(),
			disabledFg: z.number().optional(),
		})
		.optional(),
	interactive: z.boolean().default(true),
	mouse: z.boolean().default(true),
	keys: z.boolean().default(true),
	search: z.boolean().default(false),
	multiSelect: z.boolean().default(false),
});

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Applies list style options to display options.
 * Helper function to reduce complexity in createList.
 */
function applyListStyleOptions(world: World, eid: Entity, style: ListStyleConfig): void {
	const displayOptions: ListDisplayOptions = {};
	if (style.selected?.prefix !== undefined) {
		displayOptions.selectedPrefix = style.selected.prefix;
	}
	if (style.unselectedPrefix !== undefined) {
		displayOptions.unselectedPrefix = style.unselectedPrefix;
	}
	if (style.selected?.fg !== undefined) {
		displayOptions.selectedFg = style.selected.fg;
	}
	if (style.selected?.bg !== undefined) {
		displayOptions.selectedBg = style.selected.bg;
	}
	if (style.item?.fg !== undefined) {
		displayOptions.itemFg = style.item.fg;
	}
	if (style.item?.bg !== undefined) {
		displayOptions.itemBg = style.item.bg;
	}
	if (style.disabledFg !== undefined) {
		displayOptions.disabledFg = style.disabledFg;
	}
	setListDisplay(world, eid, displayOptions);
}

/**
 * Creates a List widget with the given configuration.
 *
 * The List widget provides a chainable API for creating and managing
 * selectable lists with keyboard and mouse support.
 *
 * Key bindings:
 * - Up/k: Previous item
 * - Down/j: Next item
 * - Enter/Space: Activate (confirm) selection
 * - Escape: Cancel
 * - /: Enter search mode (if enabled)
 * - g: First item
 * - G: Last item
 * - PageUp/PageDown: Scroll by page
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The List widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createList } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const list = createList(world, eid, {
 *   x: 5,
 *   y: 5,
 *   width: 20,
 *   height: 10,
 *   items: ['Option 1', 'Option 2', 'Option 3'],
 *   search: true,
 * });
 *
 * // Chain methods
 * list
 *   .focus()
 *   .selectFirst()
 *   .onSelect((index, item) => {
 *     console.log(`Selected: ${item.text}`);
 *   });
 *
 * // Handle keys in your game loop
 * const action = list.handleKey('down');
 *
 * // Clean up when done
 * list.destroy();
 * ```
 */
export function createList(
	world: World,
	entity: Entity,
	config: ListWidgetConfig = {},
): ListWidget {
	const validated = ListWidgetConfigSchema.parse(config);
	const eid = entity;

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Convert string items to ListItem format
	const items: ListItem[] = validated.items.map((text) => ({ text, value: text }));

	// Attach list behavior
	attachListBehavior(world, eid, items, {
		interactive: validated.interactive,
		mouse: validated.mouse,
		keys: validated.keys,
		search: validated.search,
		selectedIndex: validated.selected,
		visibleCount: validated.height,
	});

	// Enable multi-select if configured
	if (validated.multiSelect) {
		setListMultiSelect(world, eid, true);
	}

	// Apply display styles if provided
	if (validated.style) {
		applyListStyleOptions(world, eid, validated.style as ListStyleConfig);
	}

	// Create the widget object with chainable methods
	const widget: ListWidget = {
		eid,

		// Visibility
		show(): ListWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ListWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ListWidget {
			Position.x[eid] = (Position.x[eid] ?? 0) + dx;
			Position.y[eid] = (Position.y[eid] ?? 0) + dy;
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): ListWidget {
			setPosition(world, eid, x, y);
			return widget;
		},

		// Focus
		focus(): ListWidget {
			focusList(world, eid);
			return widget;
		},

		blur(): ListWidget {
			blurList(world, eid);
			return widget;
		},

		// Items
		setItems(newItems: readonly string[]): ListWidget {
			const listItems: ListItem[] = newItems.map((text) => ({ text, value: text }));
			setItems(world, eid, listItems);
			return widget;
		},

		getItems(): readonly ListItem[] {
			return getItems(eid);
		},

		addItem(text: string, value?: string): ListWidget {
			const currentItems = [...getItems(eid)];
			currentItems.push({ text, value: value ?? text });
			setItems(world, eid, currentItems);
			return widget;
		},

		removeItem(index: number): ListWidget {
			removeItem(world, eid, index);
			return widget;
		},

		clearItems(): ListWidget {
			clearItems(world, eid);
			return widget;
		},

		// Selection
		select(index: number): ListWidget {
			setSelectedIndex(world, eid, index);
			return widget;
		},

		getSelectedIndex(): number {
			return getSelectedIndex(eid);
		},

		getSelectedItem(): ListItem | undefined {
			return getSelectedItem(eid);
		},

		selectPrev(): ListWidget {
			selectPrev(world, eid);
			return widget;
		},

		selectNext(): ListWidget {
			selectNext(world, eid);
			return widget;
		},

		selectFirst(): ListWidget {
			selectFirst(world, eid);
			return widget;
		},

		selectLast(): ListWidget {
			selectLast(world, eid);
			return widget;
		},

		activate(): ListWidget {
			activateSelected(world, eid);
			return widget;
		},

		// Scrolling
		pageUp(): ListWidget {
			scrollPage(world, eid, -1);
			return widget;
		},

		pageDown(): ListWidget {
			scrollPage(world, eid, 1);
			return widget;
		},

		// Search
		startSearch(): ListWidget {
			startListSearch(world, eid);
			return widget;
		},

		endSearch(): ListWidget {
			endListSearch(world, eid);
			return widget;
		},

		getSearchQuery(): string {
			return getListSearchQuery(eid);
		},

		isSearching(): boolean {
			return isListSearching(world, eid);
		},

		// State
		getState(): ListState {
			return getListState(world, eid);
		},

		// Events
		onSelect(callback: ListSelectCallback): () => void {
			return onListSelect(world, eid, callback);
		},

		onActivate(callback: ListSelectCallback): () => void {
			return onListActivate(world, eid, callback);
		},

		onCancel(callback: () => void): () => void {
			return onListCancel(world, eid, callback);
		},

		onSearchChange(callback: (query: string) => void): () => void {
			return onListSearchChange(eid, callback);
		},

		// Multi-select
		getSelected(): number[] {
			return getMultiSelected(world, eid);
		},

		selectAll(): ListWidget {
			selectAllItems(world, eid);
			return widget;
		},

		deselectAll(): ListWidget {
			deselectAllItems(world, eid);
			return widget;
		},

		// Filter
		setFilter(text: string): ListWidget {
			setListFilter(world, eid, text);
			return widget;
		},

		clearFilter(): ListWidget {
			clearListFilter(world, eid);
			return widget;
		},

		getVisibleItems(): readonly ListItem[] {
			return getFilteredItems(world, eid);
		},

		// Key handling
		handleKey(key: string): ListAction | null {
			const action = handleListKeyPress(world, eid, key);

			// Execute the action
			if (action) {
				switch (action.type) {
					case 'selectPrev':
						selectPrev(world, eid);
						break;
					case 'selectNext':
						selectNext(world, eid);
						break;
					case 'selectFirst':
						selectFirst(world, eid);
						break;
					case 'selectLast':
						selectLast(world, eid);
						break;
					case 'pageUp':
						scrollPage(world, eid, -1);
						break;
					case 'pageDown':
						scrollPage(world, eid, 1);
						break;
					case 'confirm':
						activateSelected(world, eid);
						break;
					case 'cancel':
						triggerListCancel(world, eid);
						blurList(world, eid);
						break;
					case 'toggleSelect': {
						const selectedIdx = getSelectedIndex(eid);
						if (selectedIdx >= 0) {
							toggleMultiSelect(world, eid, selectedIdx);
						}
						break;
					}
					case 'startSearch':
						startListSearch(world, eid);
						break;
					case 'endSearch':
						endListSearch(world, eid);
						break;
					case 'searchChar':
						appendToSearchQuery(world, eid, action.char);
						break;
					case 'searchBackspace':
						backspaceSearchQuery(world, eid);
						break;
					case 'searchNextMatch':
						findNextMatch(world, eid);
						break;
				}
			}

			return action;
		},

		// Lifecycle
		destroy(): void {
			clearListCallbacks(world, eid);
			clearSearchQuery(world, eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a list
 */
export function isListWidget(world: World, eid: Entity): boolean {
	return isList(world, eid);
}
