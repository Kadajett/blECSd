/**
 * VirtualizedList Widget
 *
 * High-performance list widget for displaying large datasets (10M+ lines).
 * Uses virtualization to only render visible lines plus overscan.
 *
 * @module widgets/virtualizedList
 *
 * @example
 * ```typescript
 * import { createVirtualizedList } from 'blecsd';
 *
 * // Create a log viewer
 * const log = createVirtualizedList(world, {
 *   x: 0, y: 0,
 *   width: 80, height: 24,
 *   mouse: true,
 *   keys: true,
 * });
 *
 * // Enable auto-scroll for streaming
 * log.follow(true);
 *
 * // Add lines
 * log.appendLine('Server started');
 * log.appendLines(['Request received', 'Processing...', 'Done']);
 *
 * // Load large file
 * log.setLines(fs.readFileSync('huge.log', 'utf8').split('\n'));
 * ```
 */

import { addEntity, removeEntity } from 'bitecs';
import { z } from 'zod';
import { type BorderOptions, BorderType, setBorder } from '../components/border';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, type StyleOptions, setStyle, setVisible } from '../components/renderable';
import {
	getScrollInfo,
	moveCursor,
	type ScrollInfo,
	scrollByLines,
	scrollByPages,
	scrollToBottom,
	scrollToLine,
	scrollToTop,
	setSelectedLine,
	setTotalLineCount,
	setVirtualViewport,
	setVisibleLineCount,
	VirtualViewport,
} from '../components/virtualViewport';
import type { Entity, World } from '../core/types';
import { ComputedLayout } from '../systems/layoutSystem';
import {
	cleanupEntityResources,
	type LineRenderConfig,
	registerLineStore,
	setLineRenderConfig,
	updateLineStore,
} from '../systems/virtualizedRenderSystem';
import {
	appendLines as appendLinesToStore,
	appendToStore,
	createEmptyLineStore,
	createLineStoreFromLines,
	getLineAtIndex,
	getLineCount,
	trimToLineCount,
	type VirtualizedLineStore,
} from '../utils/virtualizedLineStore';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Style configuration schema for virtualized list.
 */
export const VirtualizedListStyleSchema = z.object({
	/** Foreground color */
	fg: z.number().int().nonnegative().optional(),
	/** Background color */
	bg: z.number().int().nonnegative().optional(),
	/** Foreground color for selected line */
	selectedFg: z.number().int().nonnegative().optional(),
	/** Background color for selected line */
	selectedBg: z.number().int().nonnegative().optional(),
	/** Foreground color for cursor line */
	cursorFg: z.number().int().nonnegative().optional(),
	/** Background color for cursor line */
	cursorBg: z.number().int().nonnegative().optional(),
	/** Whether to show line numbers */
	showLineNumbers: z.boolean().optional(),
	/** Width for line numbers column */
	lineNumberWidth: z.number().int().nonnegative().optional(),
});

/**
 * Border configuration schema.
 */
export const BorderConfigSchema = z.object({
	/** Border type */
	type: z.nativeEnum(BorderType).optional(),
	/** Foreground color */
	fg: z.union([z.string(), z.number()]).optional(),
	/** Background color */
	bg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Configuration schema for VirtualizedList widget.
 */
export const VirtualizedListConfigSchema = z.object({
	/** X position */
	x: z.number().int().default(0),
	/** Y position */
	y: z.number().int().default(0),
	/** Width in columns */
	width: z.number().int().positive(),
	/** Height in rows */
	height: z.number().int().positive(),
	/** Initial lines */
	lines: z.array(z.string()).optional(),
	/** Enable mouse scrolling */
	mouse: z.boolean().default(true),
	/** Enable keyboard navigation */
	keys: z.boolean().default(true),
	/** Style configuration */
	style: VirtualizedListStyleSchema.optional(),
	/** Border configuration */
	border: BorderConfigSchema.optional(),
	/** Overscan lines (default: 5) */
	overscan: z.number().int().nonnegative().default(5),
	/** Maximum lines to keep (0 = unlimited) */
	maxLines: z.number().int().nonnegative().default(0),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Validated configuration type.
 */
export type VirtualizedListConfig = z.input<typeof VirtualizedListConfigSchema>;

/**
 * Style configuration for virtualized list.
 */
export type VirtualizedListStyle = z.infer<typeof VirtualizedListStyleSchema>;

/**
 * VirtualizedList widget interface with chainable methods.
 */
export interface VirtualizedList {
	/** The underlying entity ID */
	readonly eid: Entity;

	// ==========================================================================
	// Visibility
	// ==========================================================================

	/** Shows the list */
	show(): VirtualizedList;
	/** Hides the list */
	hide(): VirtualizedList;

	// ==========================================================================
	// Position
	// ==========================================================================

	/** Sets the position */
	setPosition(x: number, y: number): VirtualizedList;
	/** Sets the dimensions */
	setDimensions(width: number, height: number): VirtualizedList;

	// ==========================================================================
	// Content
	// ==========================================================================

	/** Sets all lines (replaces existing content) */
	setLines(lines: readonly string[]): VirtualizedList;
	/** Appends a single line */
	appendLine(line: string): VirtualizedList;
	/** Appends multiple lines */
	appendLines(lines: readonly string[]): VirtualizedList;
	/** Gets the total line count */
	getLineCount(): number;
	/** Gets a specific line by index */
	getLine(index: number): string | undefined;
	/** Clears all content */
	clear(): VirtualizedList;

	// ==========================================================================
	// Scrolling
	// ==========================================================================

	/** Scrolls to a specific line (centers it) */
	scrollToLine(line: number): VirtualizedList;
	/** Scrolls to the top */
	scrollToTop(): VirtualizedList;
	/** Scrolls to the bottom */
	scrollToBottom(): VirtualizedList;
	/** Scrolls by a number of lines */
	scrollBy(lines: number): VirtualizedList;
	/** Scrolls by pages */
	scrollPage(pages: number): VirtualizedList;
	/** Gets scroll information */
	getScrollInfo(): ScrollInfo | undefined;

	// ==========================================================================
	// Selection
	// ==========================================================================

	/** Selects a line */
	select(line: number): VirtualizedList;
	/** Gets the selected line index */
	getSelected(): number;
	/** Clears selection */
	clearSelection(): VirtualizedList;

	// ==========================================================================
	// Cursor Navigation
	// ==========================================================================

	/** Moves cursor up */
	cursorUp(count?: number): VirtualizedList;
	/** Moves cursor down */
	cursorDown(count?: number): VirtualizedList;
	/** Moves cursor to line */
	setCursor(line: number): VirtualizedList;
	/** Gets cursor position */
	getCursor(): number;

	// ==========================================================================
	// Follow Mode (for streaming)
	// ==========================================================================

	/** Enables/disables auto-scroll on append */
	follow(enabled: boolean): VirtualizedList;
	/** Gets follow mode state */
	isFollowing(): boolean;

	// ==========================================================================
	// Style
	// ==========================================================================

	/** Sets style options */
	setStyle(style: VirtualizedListStyle): VirtualizedList;

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	/** Destroys the widget and releases resources */
	destroy(): void;
	/** Marks the widget as dirty (needs re-render) */
	refresh(): VirtualizedList;
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Internal state for each virtualized list */
interface VirtualizedListState {
	world: World;
	eid: Entity;
	store: VirtualizedLineStore;
	followMode: boolean;
	maxLines: number;
	mouseEnabled: boolean;
	keysEnabled: boolean;
}

/** Map of entity ID to internal state */
const stateMap = new WeakMap<object, VirtualizedListState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Updates the store and syncs viewport.
 */
function updateStore(state: VirtualizedListState, newStore: VirtualizedLineStore): void {
	state.store = newStore;
	updateLineStore(state.eid, newStore);
	setTotalLineCount(state.world, state.eid, newStore.lineCount);

	// Trim if max lines exceeded
	if (state.maxLines > 0 && newStore.lineCount > state.maxLines) {
		const trimmed = trimToLineCount(newStore, state.maxLines);
		state.store = trimmed;
		updateLineStore(state.eid, trimmed);
		setTotalLineCount(state.world, state.eid, trimmed.lineCount);
	}

	// Auto-scroll if following
	if (state.followMode) {
		scrollToBottom(state.world, state.eid);
	}

	markDirty(state.world, state.eid);
}

/**
 * Calculates visible line count from dimensions.
 */
function calculateVisibleLines(height: number, hasBorder: boolean): number {
	const borderOffset = hasBorder ? 2 : 0;
	return Math.max(1, height - borderOffset);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a VirtualizedList widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns VirtualizedList widget interface
 *
 * @example
 * ```typescript
 * import { createVirtualizedList } from 'blecsd';
 *
 * const list = createVirtualizedList(world, {
 *   width: 80,
 *   height: 24,
 *   lines: ['Line 1', 'Line 2', 'Line 3'],
 * });
 *
 * // Append more lines
 * list.appendLine('New line');
 *
 * // Enable follow mode
 * list.follow(true);
 * ```
 */
export function createVirtualizedList(
	world: World,
	config: VirtualizedListConfig,
): VirtualizedList {
	// Validate config
	const validated = VirtualizedListConfigSchema.parse(config);

	// Create entity
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set computed layout for rendering
	ComputedLayout.x[eid] = validated.x;
	ComputedLayout.y[eid] = validated.y;
	ComputedLayout.width[eid] = validated.width;
	ComputedLayout.height[eid] = validated.height;
	ComputedLayout.valid[eid] = 1;

	// Calculate visible lines
	const hasBorder = validated.border !== undefined && validated.border.type !== BorderType.None;
	const visibleLines = calculateVisibleLines(validated.height, hasBorder);

	// Create line store
	let store: VirtualizedLineStore;
	if (validated.lines && validated.lines.length > 0) {
		store = createLineStoreFromLines(validated.lines);
	} else {
		store = createEmptyLineStore();
	}

	// Register store with render system
	registerLineStore(eid, store);

	// Set up viewport
	setVirtualViewport(world, eid, {
		totalLineCount: store.lineCount,
		visibleLineCount: visibleLines,
		overscanBefore: validated.overscan,
		overscanAfter: validated.overscan,
		selectedLine: -1,
		cursorLine: -1,
	});

	// Apply style
	const defaultStyle: StyleOptions = {
		fg: validated.style?.fg ?? 0xffffffff,
		bg: validated.style?.bg ?? 0x000000ff,
	};
	setStyle(world, eid, defaultStyle);
	setVisible(world, eid, true);

	// Apply render config - build object with only defined values
	const renderConfig: Record<string, number | boolean> = {};
	if (validated.style?.fg !== undefined) renderConfig.fg = validated.style.fg;
	if (validated.style?.bg !== undefined) renderConfig.bg = validated.style.bg;
	if (validated.style?.selectedFg !== undefined)
		renderConfig.selectedFg = validated.style.selectedFg;
	if (validated.style?.selectedBg !== undefined)
		renderConfig.selectedBg = validated.style.selectedBg;
	if (validated.style?.cursorFg !== undefined) renderConfig.cursorFg = validated.style.cursorFg;
	if (validated.style?.cursorBg !== undefined) renderConfig.cursorBg = validated.style.cursorBg;
	if (validated.style?.showLineNumbers !== undefined)
		renderConfig.showLineNumbers = validated.style.showLineNumbers;
	if (validated.style?.lineNumberWidth !== undefined)
		renderConfig.lineNumberWidth = validated.style.lineNumberWidth;
	setLineRenderConfig(eid, renderConfig as Partial<LineRenderConfig>);

	// Apply border
	if (validated.border) {
		setBorder(world, eid, validated.border as BorderOptions);
	}

	// Create internal state
	const state: VirtualizedListState = {
		world,
		eid,
		store,
		followMode: false,
		maxLines: validated.maxLines,
		mouseEnabled: validated.mouse,
		keysEnabled: validated.keys,
	};

	// Store state (using object as key since WeakMap needs object)
	const stateKey = { eid };
	stateMap.set(stateKey, state);

	// Mark dirty for initial render
	markDirty(world, eid);

	// Create widget interface
	const widget: VirtualizedList = {
		eid,

		// Visibility
		show() {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide() {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Position
		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			ComputedLayout.x[eid] = x;
			ComputedLayout.y[eid] = y;
			markDirty(world, eid);
			return widget;
		},

		setDimensions(width: number, height: number) {
			setDimensions(world, eid, width, height);
			ComputedLayout.width[eid] = width;
			ComputedLayout.height[eid] = height;
			const newVisibleLines = calculateVisibleLines(height, hasBorder);
			setVisibleLineCount(world, eid, newVisibleLines);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setLines(lines: readonly string[]) {
			const newStore = lines.length > 0 ? createLineStoreFromLines(lines) : createEmptyLineStore();
			updateStore(state, newStore);
			return widget;
		},

		appendLine(line: string) {
			const newStore = appendToStore(state.store, state.store.byteSize > 0 ? `\n${line}` : line);
			updateStore(state, newStore);
			return widget;
		},

		appendLines(lines: readonly string[]) {
			if (lines.length === 0) return widget;
			const newStore = appendLinesToStore(state.store, lines);
			updateStore(state, newStore);
			return widget;
		},

		getLineCount() {
			return getLineCount(state.store);
		},

		getLine(index: number) {
			return getLineAtIndex(state.store, index);
		},

		clear() {
			updateStore(state, createEmptyLineStore());
			return widget;
		},

		// Scrolling
		scrollToLine(line: number) {
			scrollToLine(world, eid, line);
			return widget;
		},

		scrollToTop() {
			scrollToTop(world, eid);
			return widget;
		},

		scrollToBottom() {
			scrollToBottom(world, eid);
			return widget;
		},

		scrollBy(lines: number) {
			scrollByLines(world, eid, lines);
			return widget;
		},

		scrollPage(pages: number) {
			scrollByPages(world, eid, pages);
			return widget;
		},

		getScrollInfo() {
			return getScrollInfo(world, eid);
		},

		// Selection
		select(line: number) {
			setSelectedLine(world, eid, line);
			return widget;
		},

		getSelected() {
			return VirtualViewport.selectedLine[eid] as number;
		},

		clearSelection() {
			setSelectedLine(world, eid, -1);
			return widget;
		},

		// Cursor
		cursorUp(count = 1) {
			moveCursor(world, eid, -count);
			return widget;
		},

		cursorDown(count = 1) {
			moveCursor(world, eid, count);
			return widget;
		},

		setCursor(line: number) {
			VirtualViewport.cursorLine[eid] = line;
			markDirty(world, eid);
			return widget;
		},

		getCursor() {
			return VirtualViewport.cursorLine[eid] as number;
		},

		// Follow mode
		follow(enabled: boolean) {
			state.followMode = enabled;
			if (enabled) {
				scrollToBottom(world, eid);
			}
			return widget;
		},

		isFollowing() {
			return state.followMode;
		},

		// Style
		setStyle(style: VirtualizedListStyle) {
			const config: Record<string, number | boolean> = {};
			if (style.fg !== undefined) config.fg = style.fg;
			if (style.bg !== undefined) config.bg = style.bg;
			if (style.selectedFg !== undefined) config.selectedFg = style.selectedFg;
			if (style.selectedBg !== undefined) config.selectedBg = style.selectedBg;
			if (style.cursorFg !== undefined) config.cursorFg = style.cursorFg;
			if (style.cursorBg !== undefined) config.cursorBg = style.cursorBg;
			if (style.showLineNumbers !== undefined) config.showLineNumbers = style.showLineNumbers;
			if (style.lineNumberWidth !== undefined) config.lineNumberWidth = style.lineNumberWidth;
			setLineRenderConfig(eid, config as Partial<LineRenderConfig>);
			markDirty(world, eid);
			return widget;
		},

		// Lifecycle
		destroy() {
			cleanupEntityResources(eid);
			stateMap.delete(stateKey);
			removeEntity(world, eid);
		},

		refresh() {
			markDirty(world, eid);
			return widget;
		},
	};

	return widget;
}

// =============================================================================
// KEYBOARD HANDLER
// =============================================================================

/**
 * Handles keyboard input for a VirtualizedList.
 *
 * @param widget - The widget
 * @param key - Key name
 * @param ctrl - Control key pressed
 * @param shift - Shift key pressed
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { createVirtualizedList, handleVirtualizedListKey } from 'blecsd';
 *
 * const list = createVirtualizedList(world, config);
 *
 * // In your input handler
 * if (handleVirtualizedListKey(list, event.key, event.ctrl, event.shift)) {
 *   // Key was handled
 * }
 * ```
 */
export function handleVirtualizedListKey(
	widget: VirtualizedList,
	key: string,
	ctrl = false,
	shift = false,
): boolean {
	switch (key) {
		case 'up':
		case 'k':
			widget.cursorUp(shift ? 5 : 1);
			return true;

		case 'down':
		case 'j':
			widget.cursorDown(shift ? 5 : 1);
			return true;

		case 'pageup':
			widget.scrollPage(-1);
			return true;

		case 'pagedown':
			widget.scrollPage(1);
			return true;

		case 'home':
			if (ctrl) {
				widget.scrollToTop();
				widget.setCursor(0);
			} else {
				widget.scrollToTop();
			}
			return true;

		case 'end':
			if (ctrl) {
				widget.scrollToBottom();
				const total = widget.getLineCount();
				widget.setCursor(total - 1);
			} else {
				widget.scrollToBottom();
			}
			return true;

		case 'g':
			if (!ctrl && !shift) {
				widget.scrollToTop();
				widget.setCursor(0);
				return true;
			}
			return false;

		case 'G':
			widget.scrollToBottom();
			widget.setCursor(widget.getLineCount() - 1);
			return true;

		case 'enter':
		case 'return':
			// Select current cursor position
			widget.select(widget.getCursor());
			return true;

		default:
			return false;
	}
}

/**
 * Handles mouse wheel input for a VirtualizedList.
 *
 * @param widget - The widget
 * @param direction - 'up' or 'down'
 * @param amount - Lines to scroll (default: 3)
 * @returns true if handled
 */
export function handleVirtualizedListWheel(
	widget: VirtualizedList,
	direction: 'up' | 'down',
	amount = 3,
): boolean {
	if (direction === 'up') {
		widget.scrollBy(-amount);
	} else {
		widget.scrollBy(amount);
	}
	return true;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a VirtualizedList.
 *
 * @param _world - The ECS world (unused, kept for API consistency)
 * @param eid - Entity ID to check
 * @returns true if the entity has VirtualViewport component
 */
export function isVirtualizedList(_world: World, eid: Entity): boolean {
	return (
		VirtualViewport.totalLineCount[eid] !== undefined &&
		VirtualViewport.visibleLineCount[eid] !== undefined
	);
}
