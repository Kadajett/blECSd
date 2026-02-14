/**
 * Scrollable component for scrolling support.
 * @module components/scrollable
 */

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Scrollbar visibility mode.
 */
export enum ScrollbarVisibility {
	/** Always hidden */
	Hidden = 0,
	/** Always visible */
	Visible = 1,
	/** Visible only when content overflows */
	Auto = 2,
}

/**
 * Scrollable component store using SoA (Structure of Arrays) for performance.
 *
 * - `scrollX`, `scrollY`: Current scroll offset
 * - `scrollWidth`, `scrollHeight`: Total scrollable content size
 * - `scrollbarVisible`: Scrollbar visibility mode
 * - `trackVisible`: Whether scroll track is visible
 * - `alwaysScroll`: Always show scrollbar even when not needed
 *
 * @example
 * ```typescript
 * import { Scrollable, setScroll, getScroll, scrollBy } from 'blecsd';
 *
 * setScroll(world, entity, 0, 100);
 * scrollBy(world, entity, 0, 50);
 *
 * const scroll = getScroll(world, entity);
 * console.log(scroll.y); // 150
 * ```
 */
export const Scrollable = {
	/** Horizontal scroll offset */
	scrollX: new Float32Array(DEFAULT_CAPACITY),
	/** Vertical scroll offset */
	scrollY: new Float32Array(DEFAULT_CAPACITY),
	/** Total scrollable width */
	scrollWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Total scrollable height */
	scrollHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Viewport width (visible area) - used for clamping */
	viewportWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Viewport height (visible area) - used for clamping */
	viewportHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Scrollbar visibility mode (0=hidden, 1=visible, 2=auto) */
	scrollbarVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether scroll track is visible */
	trackVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Always show scrollbar (0=no, 1=yes) */
	alwaysScroll: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether clamping is enabled (0=no, 1=yes) - default yes */
	clampEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Scrollable configuration options.
 */
export interface ScrollableOptions {
	/** Initial horizontal scroll offset */
	scrollX?: number;
	/** Initial vertical scroll offset */
	scrollY?: number;
	/** Total scrollable width */
	scrollWidth?: number;
	/** Total scrollable height */
	scrollHeight?: number;
	/** Viewport width (visible area) */
	viewportWidth?: number;
	/** Viewport height (visible area) */
	viewportHeight?: number;
	/** Scrollbar visibility mode */
	scrollbarVisible?: ScrollbarVisibility;
	/** Whether scroll track is visible */
	trackVisible?: boolean;
	/** Always show scrollbar */
	alwaysScroll?: boolean;
	/** Whether scroll clamping is enabled (default: true) */
	clampEnabled?: boolean;
}

/**
 * Scroll position data.
 */
export interface ScrollPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * Scroll percentage data.
 */
export interface ScrollPercentage {
	readonly x: number;
	readonly y: number;
}

/**
 * Full scrollable data returned by getScrollable.
 */
export interface ScrollableData {
	readonly scrollX: number;
	readonly scrollY: number;
	readonly scrollWidth: number;
	readonly scrollHeight: number;
	readonly viewportWidth: number;
	readonly viewportHeight: number;
	readonly scrollbarVisible: ScrollbarVisibility;
	readonly trackVisible: boolean;
	readonly alwaysScroll: boolean;
	readonly clampEnabled: boolean;
}
