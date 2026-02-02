/**
 * Listbar Widget
 *
 * Provides a horizontal menu bar widget with keyboard and mouse support.
 * Items are arranged horizontally with selection highlighting.
 *
 * @module widgets/listbar
 */

import { removeEntity } from 'bitecs';
import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * A listbar item with optional keyboard shortcut and callback.
 */
export interface ListbarItem {
	/** Display text for the item */
	readonly text: string;
	/** Optional keyboard shortcut key */
	readonly key?: string;
	/** Optional callback when item is activated */
	readonly callback?: () => void;
	/** Optional unique value/identifier */
	readonly value?: string;
}

/**
 * Style configuration for listbar items.
 */
export interface ListbarStyleConfig {
	/** Style for regular items */
	readonly item?: {
		readonly fg?: number;
		readonly bg?: number;
	};
	/** Style for selected item */
	readonly selected?: {
		readonly fg?: number;
		readonly bg?: number;
	};
	/** Style for prefix (key hint) */
	readonly prefix?: {
		readonly fg?: number;
		readonly bg?: number;
	};
	/** Separator between items */
	readonly separator?: string;
}

/**
 * Configuration for creating a Listbar widget.
 */
export interface ListbarWidgetConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width of the listbar (auto if not specified) */
	readonly width?: number;
	/** Items to display */
	readonly items?: readonly ListbarItem[];
	/** Initially selected index */
	readonly selected?: number;
	/** Style configuration */
	readonly style?: ListbarStyleConfig;
	/** Auto-assign 1-9 command keys (default: true) */
	readonly autoCommandKeys?: boolean;
	/** Whether mouse input is enabled (default: true) */
	readonly mouse?: boolean;
	/** Whether keyboard input is enabled (default: true) */
	readonly keys?: boolean;
}

/**
 * Listbar state type.
 */
export type ListbarState = 'idle' | 'focused';

/**
 * Listbar action type.
 */
export interface ListbarAction {
	readonly type:
		| 'selectPrev'
		| 'selectNext'
		| 'selectFirst'
		| 'selectLast'
		| 'confirm'
		| 'cancel'
		| 'selectByKey';
	readonly key?: string;
	readonly index?: number;
}

/**
 * Callback for listbar selection events.
 */
export type ListbarSelectCallback = (index: number, item: ListbarItem) => void;

/**
 * Listbar widget interface providing chainable methods.
 */
export interface ListbarWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the listbar */
	show(): ListbarWidget;
	/** Hides the listbar */
	hide(): ListbarWidget;

	// Position
	/** Moves the listbar by dx, dy */
	move(dx: number, dy: number): ListbarWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ListbarWidget;

	// Focus
	/** Focuses the listbar */
	focus(): ListbarWidget;
	/** Blurs the listbar */
	blur(): ListbarWidget;

	// Items
	/** Sets the items in the listbar */
	setItems(items: readonly ListbarItem[]): ListbarWidget;
	/** Gets all items */
	getItems(): readonly ListbarItem[];
	/** Adds an item to the listbar */
	addItem(item: ListbarItem): ListbarWidget;
	/** Removes an item by index */
	removeItem(index: number): ListbarWidget;
	/** Gets the item count */
	getItemCount(): number;

	// Selection
	/** Selects the item at the given index */
	select(index: number): ListbarWidget;
	/** Gets the currently selected index */
	getSelectedIndex(): number;
	/** Gets the currently selected item */
	getSelectedItem(): ListbarItem | undefined;
	/** Selects the previous item */
	selectPrev(): ListbarWidget;
	/** Selects the next item */
	selectNext(): ListbarWidget;
	/** Selects the first item */
	selectFirst(): ListbarWidget;
	/** Selects the last item */
	selectLast(): ListbarWidget;
	/** Selects item by keyboard shortcut key */
	selectByKey(key: string): boolean;
	/** Activates (confirms) the current selection */
	activate(): ListbarWidget;

	// State
	/** Gets the current state */
	getState(): ListbarState;

	// Display
	/** Sets display styles */
	setStyle(style: ListbarStyleConfig): ListbarWidget;
	/** Gets the separator string */
	getSeparator(): string;
	/** Sets the separator string */
	setSeparator(separator: string): ListbarWidget;

	// Rendering
	/** Renders the listbar as a single line */
	renderLine(): string;
	/** Calculates the total width of the listbar */
	calculateWidth(): number;

	// Events
	/** Registers callback for selection change */
	onSelect(callback: ListbarSelectCallback): () => void;
	/** Registers callback for item activation */
	onActivate(callback: ListbarSelectCallback): () => void;

	// Key handling
	/** Handles a key press, returns the action taken */
	handleKey(key: string): ListbarAction | null;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for listbar item.
 */
export const ListbarItemSchema = z.object({
	text: z.string(),
	key: z.string().optional(),
	callback: z.function().optional(),
	value: z.string().optional(),
});

/**
 * Zod schema for listbar widget configuration.
 */
export const ListbarWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	items: z.array(ListbarItemSchema).default([]),
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
				})
				.optional(),
			prefix: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			separator: z.string().optional(),
		})
		.optional(),
	autoCommandKeys: z.boolean().default(true),
	mouse: z.boolean().default(true),
	keys: z.boolean().default(true),
});

// =============================================================================
// STORE
// =============================================================================

/** Store for listbar state */
const listbarStore = {
	isListbar: new Uint8Array(MAX_ENTITIES),
	selectedIndex: new Int32Array(MAX_ENTITIES).fill(-1),
	itemCount: new Uint32Array(MAX_ENTITIES),
	state: new Uint8Array(MAX_ENTITIES), // 0 = idle, 1 = focused
	autoCommandKeys: new Uint8Array(MAX_ENTITIES),
	mouse: new Uint8Array(MAX_ENTITIES),
	keys: new Uint8Array(MAX_ENTITIES),
};

/** Store for listbar items (keyed by entity) */
const itemsStore = new Map<Entity, ListbarItem[]>();

/** Store for display options */
interface ListbarDisplay {
	itemFg: number;
	itemBg: number;
	selectedFg: number;
	selectedBg: number;
	prefixFg: number;
	prefixBg: number;
	separator: string;
}

const displayStore = new Map<Entity, ListbarDisplay>();

/** Store for callbacks */
const selectCallbacks = new Map<Entity, Set<ListbarSelectCallback>>();
const activateCallbacks = new Map<Entity, Set<ListbarSelectCallback>>();

// Default colors
const DEFAULT_ITEM_FG = 0xccccccff;
const DEFAULT_ITEM_BG = 0x000000ff;
const DEFAULT_SELECTED_FG = 0x000000ff;
const DEFAULT_SELECTED_BG = 0x00ffffff;
const DEFAULT_PREFIX_FG = 0xffff00ff;
const DEFAULT_PREFIX_BG = 0x000000ff;
const DEFAULT_SEPARATOR = ' | ';

// State mapping
const STATE_MAP: Record<number, ListbarState> = {
	0: 'idle',
	1: 'focused',
};

/**
 * Resets the listbar store (for testing).
 */
export function resetListbarStore(): void {
	listbarStore.isListbar.fill(0);
	listbarStore.selectedIndex.fill(-1);
	listbarStore.itemCount.fill(0);
	listbarStore.state.fill(0);
	listbarStore.autoCommandKeys.fill(0);
	listbarStore.mouse.fill(0);
	listbarStore.keys.fill(0);
	itemsStore.clear();
	displayStore.clear();
	selectCallbacks.clear();
	activateCallbacks.clear();
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Listbar widget with the given configuration.
 *
 * The Listbar widget provides a horizontal menu bar with keyboard and mouse support.
 *
 * Key bindings:
 * - Left/h: Previous item
 * - Right/l: Next item
 * - Enter/Space: Activate (confirm) selection
 * - Escape: Blur
 * - 1-9: Jump to item (if autoCommandKeys enabled)
 * - Custom keys: Jump to item with matching key
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Listbar widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { createListbar } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const listbar = createListbar(world, eid, {
 *   x: 0,
 *   y: 0,
 *   items: [
 *     { text: 'File', key: 'f' },
 *     { text: 'Edit', key: 'e' },
 *     { text: 'View', key: 'v' },
 *     { text: 'Help', key: 'h' },
 *   ],
 *   autoCommandKeys: true,
 *   style: {
 *     selected: { fg: 0x000000ff, bg: 0x00ffffff },
 *   },
 * });
 *
 * // Chain methods
 * listbar
 *   .focus()
 *   .selectFirst()
 *   .onActivate((index, item) => {
 *     console.log(`Activated: ${item.text}`);
 *   });
 *
 * // Handle keys in your game loop
 * const action = listbar.handleKey('right');
 *
 * // Render to string
 * const line = listbar.renderLine();
 *
 * // Clean up when done
 * listbar.destroy();
 * ```
 */
export function createListbar(
	world: World,
	entity: Entity,
	config: ListbarWidgetConfig = {},
): ListbarWidget {
	const validated = ListbarWidgetConfigSchema.parse(config);
	const eid = entity;

	// Mark as listbar
	listbarStore.isListbar[eid] = 1;

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set options
	listbarStore.autoCommandKeys[eid] = validated.autoCommandKeys ? 1 : 0;
	listbarStore.mouse[eid] = validated.mouse ? 1 : 0;
	listbarStore.keys[eid] = validated.keys ? 1 : 0;

	// Set items
	const items: ListbarItem[] = [...validated.items];
	itemsStore.set(eid, items);
	listbarStore.itemCount[eid] = items.length;

	// Set initial selection
	if (validated.selected >= 0 && validated.selected < items.length) {
		listbarStore.selectedIndex[eid] = validated.selected;
	} else if (items.length > 0) {
		listbarStore.selectedIndex[eid] = 0;
	}

	// Set display options
	const display: ListbarDisplay = {
		itemFg: validated.style?.item?.fg ?? DEFAULT_ITEM_FG,
		itemBg: validated.style?.item?.bg ?? DEFAULT_ITEM_BG,
		selectedFg: validated.style?.selected?.fg ?? DEFAULT_SELECTED_FG,
		selectedBg: validated.style?.selected?.bg ?? DEFAULT_SELECTED_BG,
		prefixFg: validated.style?.prefix?.fg ?? DEFAULT_PREFIX_FG,
		prefixBg: validated.style?.prefix?.bg ?? DEFAULT_PREFIX_BG,
		separator: validated.style?.separator ?? DEFAULT_SEPARATOR,
	};
	displayStore.set(eid, display);

	// Set dimensions based on content
	const calculateTotalWidth = (): number => {
		const currentItems = itemsStore.get(eid) ?? [];
		const currentDisplay = displayStore.get(eid);
		const sep = currentDisplay?.separator ?? DEFAULT_SEPARATOR;
		let width = 0;
		for (let i = 0; i < currentItems.length; i++) {
			const item = currentItems[i];
			if (item) {
				// Format: [key] text or just text
				const keyPart = getKeyPrefix(item, i, listbarStore.autoCommandKeys[eid] === 1);
				width += keyPart.length + item.text.length;
			}
			if (i < currentItems.length - 1) {
				width += sep.length;
			}
		}
		return width;
	};

	// Set initial dimensions
	const initialWidth = validated.width ?? calculateTotalWidth();
	setDimensions(world, eid, initialWidth, 1);

	// Initialize callback sets
	selectCallbacks.set(eid, new Set());
	activateCallbacks.set(eid, new Set());

	// Helper to get key prefix for an item
	function getKeyPrefix(item: ListbarItem, index: number, autoKeys: boolean): string {
		if (item.key) {
			return `[${item.key}]`;
		}
		if (autoKeys && index < 9) {
			return `[${index + 1}]`;
		}
		return '';
	}

	// Helper to notify select callbacks
	const notifySelect = (): void => {
		const index = listbarStore.selectedIndex[eid] ?? -1;
		const currentItems = itemsStore.get(eid) ?? [];
		const item = currentItems[index];
		if (item && index >= 0) {
			const callbacks = selectCallbacks.get(eid);
			if (callbacks) {
				for (const cb of callbacks) {
					cb(index, item);
				}
			}
		}
	};

	// Helper to notify activate callbacks
	const notifyActivate = (): void => {
		const index = listbarStore.selectedIndex[eid] ?? -1;
		const currentItems = itemsStore.get(eid) ?? [];
		const item = currentItems[index];
		if (item && index >= 0) {
			// Call item's own callback if present
			if (item.callback) {
				item.callback();
			}
			// Call registered callbacks
			const callbacks = activateCallbacks.get(eid);
			if (callbacks) {
				for (const cb of callbacks) {
					cb(index, item);
				}
			}
		}
	};

	// Create the widget object with chainable methods
	const widget: ListbarWidget = {
		eid,

		// Visibility
		show(): ListbarWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ListbarWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ListbarWidget {
			Position.x[eid] = (Position.x[eid] ?? 0) + dx;
			Position.y[eid] = (Position.y[eid] ?? 0) + dy;
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): ListbarWidget {
			setPosition(world, eid, x, y);
			return widget;
		},

		// Focus
		focus(): ListbarWidget {
			listbarStore.state[eid] = 1;
			markDirty(world, eid);
			return widget;
		},

		blur(): ListbarWidget {
			listbarStore.state[eid] = 0;
			markDirty(world, eid);
			return widget;
		},

		// Items
		setItems(newItems: readonly ListbarItem[]): ListbarWidget {
			const itemsCopy = [...newItems];
			itemsStore.set(eid, itemsCopy);
			listbarStore.itemCount[eid] = itemsCopy.length;
			// Adjust selection if needed
			const currentIndex = listbarStore.selectedIndex[eid] ?? -1;
			if (currentIndex >= itemsCopy.length) {
				listbarStore.selectedIndex[eid] = Math.max(0, itemsCopy.length - 1);
			}
			markDirty(world, eid);
			return widget;
		},

		getItems(): readonly ListbarItem[] {
			return itemsStore.get(eid) ?? [];
		},

		addItem(item: ListbarItem): ListbarWidget {
			const currentItems = itemsStore.get(eid) ?? [];
			currentItems.push(item);
			listbarStore.itemCount[eid] = currentItems.length;
			markDirty(world, eid);
			return widget;
		},

		removeItem(index: number): ListbarWidget {
			const currentItems = itemsStore.get(eid) ?? [];
			if (index >= 0 && index < currentItems.length) {
				currentItems.splice(index, 1);
				listbarStore.itemCount[eid] = currentItems.length;
				// Adjust selection if needed
				const currentIndex = listbarStore.selectedIndex[eid] ?? -1;
				if (currentIndex >= currentItems.length) {
					listbarStore.selectedIndex[eid] = Math.max(0, currentItems.length - 1);
				} else if (currentIndex > index) {
					listbarStore.selectedIndex[eid] = currentIndex - 1;
				}
				markDirty(world, eid);
			}
			return widget;
		},

		getItemCount(): number {
			return listbarStore.itemCount[eid] ?? 0;
		},

		// Selection
		select(index: number): ListbarWidget {
			const itemCount = listbarStore.itemCount[eid] ?? 0;
			if (index >= 0 && index < itemCount) {
				const prevIndex = listbarStore.selectedIndex[eid];
				if (prevIndex !== index) {
					listbarStore.selectedIndex[eid] = index;
					markDirty(world, eid);
					notifySelect();
				}
			}
			return widget;
		},

		getSelectedIndex(): number {
			return listbarStore.selectedIndex[eid] ?? -1;
		},

		getSelectedItem(): ListbarItem | undefined {
			const index = listbarStore.selectedIndex[eid] ?? -1;
			const currentItems = itemsStore.get(eid) ?? [];
			return currentItems[index];
		},

		selectPrev(): ListbarWidget {
			const currentIndex = listbarStore.selectedIndex[eid] ?? 0;
			const itemCount = listbarStore.itemCount[eid] ?? 0;
			if (itemCount > 0) {
				const newIndex = currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
				widget.select(newIndex);
			}
			return widget;
		},

		selectNext(): ListbarWidget {
			const currentIndex = listbarStore.selectedIndex[eid] ?? 0;
			const itemCount = listbarStore.itemCount[eid] ?? 0;
			if (itemCount > 0) {
				const newIndex = currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
				widget.select(newIndex);
			}
			return widget;
		},

		selectFirst(): ListbarWidget {
			const itemCount = listbarStore.itemCount[eid] ?? 0;
			if (itemCount > 0) {
				widget.select(0);
			}
			return widget;
		},

		selectLast(): ListbarWidget {
			const itemCount = listbarStore.itemCount[eid] ?? 0;
			if (itemCount > 0) {
				widget.select(itemCount - 1);
			}
			return widget;
		},

		selectByKey(key: string): boolean {
			const currentItems = itemsStore.get(eid) ?? [];
			const autoKeys = listbarStore.autoCommandKeys[eid] === 1;

			// Check for custom key match
			for (let i = 0; i < currentItems.length; i++) {
				const item = currentItems[i];
				if (item?.key?.toLowerCase() === key.toLowerCase()) {
					widget.select(i);
					return true;
				}
			}

			// Check for auto command key (1-9)
			if (autoKeys) {
				const num = Number.parseInt(key, 10);
				if (num >= 1 && num <= 9 && num <= currentItems.length) {
					widget.select(num - 1);
					return true;
				}
			}

			return false;
		},

		activate(): ListbarWidget {
			notifyActivate();
			return widget;
		},

		// State
		getState(): ListbarState {
			const stateNum = listbarStore.state[eid] ?? 0;
			return STATE_MAP[stateNum] ?? 'idle';
		},

		// Display
		setStyle(style: ListbarStyleConfig): ListbarWidget {
			const currentDisplay = displayStore.get(eid) ?? {
				itemFg: DEFAULT_ITEM_FG,
				itemBg: DEFAULT_ITEM_BG,
				selectedFg: DEFAULT_SELECTED_FG,
				selectedBg: DEFAULT_SELECTED_BG,
				prefixFg: DEFAULT_PREFIX_FG,
				prefixBg: DEFAULT_PREFIX_BG,
				separator: DEFAULT_SEPARATOR,
			};

			if (style.item?.fg !== undefined) {
				currentDisplay.itemFg = style.item.fg;
			}
			if (style.item?.bg !== undefined) {
				currentDisplay.itemBg = style.item.bg;
			}
			if (style.selected?.fg !== undefined) {
				currentDisplay.selectedFg = style.selected.fg;
			}
			if (style.selected?.bg !== undefined) {
				currentDisplay.selectedBg = style.selected.bg;
			}
			if (style.prefix?.fg !== undefined) {
				currentDisplay.prefixFg = style.prefix.fg;
			}
			if (style.prefix?.bg !== undefined) {
				currentDisplay.prefixBg = style.prefix.bg;
			}
			if (style.separator !== undefined) {
				currentDisplay.separator = style.separator;
			}

			displayStore.set(eid, currentDisplay);
			markDirty(world, eid);
			return widget;
		},

		getSeparator(): string {
			return displayStore.get(eid)?.separator ?? DEFAULT_SEPARATOR;
		},

		setSeparator(separator: string): ListbarWidget {
			const currentDisplay = displayStore.get(eid);
			if (currentDisplay) {
				currentDisplay.separator = separator;
				markDirty(world, eid);
			}
			return widget;
		},

		// Rendering
		renderLine(): string {
			const currentItems = itemsStore.get(eid) ?? [];
			const selectedIndex = listbarStore.selectedIndex[eid] ?? -1;
			const autoKeys = listbarStore.autoCommandKeys[eid] === 1;
			const currentDisplay = displayStore.get(eid);
			const sep = currentDisplay?.separator ?? DEFAULT_SEPARATOR;

			const parts: string[] = [];

			for (let i = 0; i < currentItems.length; i++) {
				const item = currentItems[i];
				if (!item) continue;

				const keyPart = getKeyPrefix(item, i, autoKeys);
				const isSelected = i === selectedIndex;

				// For now, just output plain text (actual color application would be done by renderer)
				const itemText = keyPart + item.text;
				if (isSelected) {
					// Mark selected with brackets for simple rendering
					parts.push(`[${itemText}]`);
				} else {
					parts.push(` ${itemText} `);
				}
			}

			return parts.join(sep);
		},

		calculateWidth(): number {
			return calculateTotalWidth();
		},

		// Events
		onSelect(callback: ListbarSelectCallback): () => void {
			const callbacks = selectCallbacks.get(eid);
			if (callbacks) {
				callbacks.add(callback);
			}
			return () => {
				callbacks?.delete(callback);
			};
		},

		onActivate(callback: ListbarSelectCallback): () => void {
			const callbacks = activateCallbacks.get(eid);
			if (callbacks) {
				callbacks.add(callback);
			}
			return () => {
				callbacks?.delete(callback);
			};
		},

		// Key handling
		handleKey(key: string): ListbarAction | null {
			// Only respond to keys if focused and keys enabled
			const state = listbarStore.state[eid] ?? 0;
			const keysEnabled = listbarStore.keys[eid] === 1;

			if (state !== 1 || !keysEnabled) {
				return null;
			}

			// Navigation keys
			switch (key.toLowerCase()) {
				case 'left':
				case 'h':
					widget.selectPrev();
					return { type: 'selectPrev' };

				case 'right':
				case 'l':
					widget.selectNext();
					return { type: 'selectNext' };

				case 'home':
					widget.selectFirst();
					return { type: 'selectFirst' };

				case 'end':
					widget.selectLast();
					return { type: 'selectLast' };

				case 'enter':
				case ' ':
					widget.activate();
					return { type: 'confirm' };

				case 'escape':
					widget.blur();
					return { type: 'cancel' };
			}

			// Check for key shortcuts
			if (widget.selectByKey(key)) {
				return { type: 'selectByKey', key };
			}

			return null;
		},

		// Lifecycle
		destroy(): void {
			listbarStore.isListbar[eid] = 0;
			listbarStore.selectedIndex[eid] = -1;
			listbarStore.itemCount[eid] = 0;
			listbarStore.state[eid] = 0;
			itemsStore.delete(eid);
			displayStore.delete(eid);
			selectCallbacks.delete(eid);
			activateCallbacks.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a listbar.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a listbar
 */
export function isListbarWidget(_world: World, eid: Entity): boolean {
	return listbarStore.isListbar[eid] === 1;
}
