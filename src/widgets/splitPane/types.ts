/**
 * Type definitions for Split Pane Widget.
 *
 * @module widgets/splitPane/types
 */

import type { Entity } from '../../core/types';

/**
 * Split direction.
 */
export type SplitDirection = 'horizontal' | 'vertical';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Viewport bounds for a single pane.
 */
export interface PaneViewport {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Pane scroll state for independent scrolling.
 */
export interface PaneScrollState {
	/** Horizontal scroll offset */
	scrollX: number;
	/** Vertical scroll offset */
	scrollY: number;
	/** Total content width */
	contentWidth: number;
	/** Total content height */
	contentHeight: number;
}

/**
 * Dirty rectangle for incremental rendering.
 */
export interface DirtyRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Shared text buffer for memory-efficient pane content.
 * Multiple panes can reference the same buffer with different scroll offsets.
 */
export interface SharedTextBuffer {
	/** Unique buffer identifier */
	readonly id: string;
	/** Lines of text content */
	readonly lines: readonly string[];
	/** Reference count for cleanup */
	refCount: number;
}

/**
 * Individual pane state managed by the split pane.
 */
export interface PaneState {
	/** The pane's entity ID */
	readonly entity: Entity;
	/** Computed viewport bounds */
	viewport: PaneViewport;
	/** Independent scroll state */
	scroll: PaneScrollState;
	/** Reference to shared buffer (if any) */
	sharedBufferId: string | undefined;
	/** Dirty flag for this pane */
	dirty: boolean;
}

/**
 * Divider state for drag resizing.
 */
export interface DividerState {
	/** Position ratio along the split axis (0-1) */
	ratio: number;
	/** Whether the divider is being dragged */
	dragging: boolean;
	/** Drag start position (in cells) */
	dragStartPos: number;
	/** Ratio at drag start */
	dragStartRatio: number;
	/** Snapshot of all ratios at drag start, used for absolute delta calculation */
	dragStartRatios: readonly number[];
}

/**
 * Configuration for creating a SplitPane widget.
 */
export interface SplitPaneConfig {
	/** Left position */
	readonly left?: PositionValue;
	/** Top position */
	readonly top?: PositionValue;
	/** Width */
	readonly width?: DimensionValue;
	/** Height */
	readonly height?: DimensionValue;
	/** Split direction: 'horizontal' (side-by-side) or 'vertical' (top-bottom) */
	readonly direction?: SplitDirection;
	/** Initial split ratios (must sum to 1.0, length = number of panes) */
	readonly ratios?: readonly number[];
	/** Minimum pane size in cells */
	readonly minPaneSize?: number;
	/** Divider width in cells */
	readonly dividerSize?: number;
	/** Whether dividers are draggable */
	readonly resizable?: boolean;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Divider foreground color */
	readonly dividerFg?: string | number;
	/** Divider background color */
	readonly dividerBg?: string | number;
	/** Divider character */
	readonly dividerChar?: string;
}

/**
 * Resize event emitted when a divider is moved.
 */
export interface SplitResizeEvent {
	/** Index of the divider that was moved */
	readonly dividerIndex: number;
	/** New ratios after the resize */
	readonly ratios: readonly number[];
	/** Dirty rects affected by the resize */
	readonly dirtyRects: readonly DirtyRect[];
}

/**
 * Split pane widget interface providing chainable methods.
 */
export interface SplitPaneWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the split pane */
	show(): SplitPaneWidget;
	/** Hides the split pane */
	hide(): SplitPaneWidget;

	// Position
	/** Moves the split pane by dx, dy */
	move(dx: number, dy: number): SplitPaneWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): SplitPaneWidget;

	// Split-specific
	/** Gets the split direction */
	getDirection(): SplitDirection;
	/** Gets current split ratios */
	getRatios(): readonly number[];
	/** Sets split ratios (must sum to 1.0) */
	setRatios(ratios: readonly number[]): SplitPaneWidget;
	/** Gets the number of panes */
	getPaneCount(): number;
	/** Gets the viewport for a pane by index */
	getPaneViewport(index: number): PaneViewport | undefined;
	/** Gets all pane viewports */
	getAllPaneViewports(): readonly PaneViewport[];

	// Scrolling
	/** Scrolls a pane by index */
	scrollPane(index: number, dx: number, dy: number): SplitPaneWidget;
	/** Sets absolute scroll position for a pane */
	setPaneScroll(index: number, x: number, y: number): SplitPaneWidget;
	/** Gets scroll state for a pane */
	getPaneScroll(index: number): PaneScrollState | undefined;
	/** Sets content dimensions for a pane (for scroll bounds) */
	setPaneContentSize(index: number, width: number, height: number): SplitPaneWidget;

	// Shared buffers
	/** Attaches a shared text buffer to a pane */
	attachBuffer(paneIndex: number, buffer: SharedTextBuffer): SplitPaneWidget;
	/** Detaches the shared buffer from a pane */
	detachBuffer(paneIndex: number): SplitPaneWidget;
	/** Gets the shared buffer for a pane */
	getBuffer(paneIndex: number): SharedTextBuffer | undefined;

	// Divider interaction
	/** Begins dragging a divider */
	beginDrag(dividerIndex: number, position: number): SplitPaneWidget;
	/** Updates a drag in progress */
	updateDrag(dividerIndex: number, position: number): SplitResizeEvent | undefined;
	/** Ends a drag */
	endDrag(dividerIndex: number): SplitPaneWidget;
	/** Checks if any divider is being dragged */
	isDragging(): boolean;

	// Dirty tracking
	/** Gets dirty rects since last flush */
	getDirtyRects(): readonly DirtyRect[];
	/** Marks a pane as dirty */
	markPaneDirty(index: number): SplitPaneWidget;
	/** Flushes dirty state (call after rendering) */
	flushDirty(): SplitPaneWidget;

	// Recalculate
	/** Recalculates all pane viewports from current ratios */
	recalculate(): SplitPaneWidget;

	// Focus
	/** Focuses the split pane */
	focus(): SplitPaneWidget;
	/** Blurs the split pane */
	blur(): SplitPaneWidget;
	/** Checks if focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity as a new pane */
	append(child: Entity): SplitPaneWidget;
	/** Gets all pane entities */
	getChildren(): Entity[];

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

/**
 * Internal validated config after Zod parsing.
 * @internal
 */
export interface ValidatedSplitPaneConfig {
	left?: string | number;
	top?: string | number;
	width?: string | number;
	height?: string | number;
	direction?: 'horizontal' | 'vertical';
	ratios?: number[];
	minPaneSize?: number;
	dividerSize?: number;
	resizable?: boolean;
	fg?: string | number;
	bg?: string | number;
	dividerFg?: string | number;
	dividerBg?: string | number;
	dividerChar?: string;
}

/**
 * Divider render information for drawing.
 */
export interface DividerRenderInfo {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly char: string;
	readonly fg: number | undefined;
	readonly bg: number | undefined;
}
