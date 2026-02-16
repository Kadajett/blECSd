/**
 * Split Pane Widget
 *
 * A container that divides its area into independently scrollable panes
 * separated by draggable dividers. Supports horizontal and vertical splits,
 * nested splits, shared text buffers for memory efficiency, and coordinated
 * single-pass rendering with dirty rect tracking.
 *
 * @module widgets/splitPane
 */

import { z } from 'zod';
import { getDimensions, setDimensions } from '../components/dimensions';
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

// =============================================================================
// SCHEMAS
// =============================================================================

const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for SplitPane widget configuration.
 */
export const SplitPaneConfigSchema = z.object({
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),
	direction: z.enum(['horizontal', 'vertical']).optional(),
	ratios: z.array(z.number().min(0).max(1)).optional(),
	minPaneSize: z.number().int().nonnegative().optional(),
	dividerSize: z.number().int().nonnegative().optional(),
	resizable: z.boolean().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	dividerFg: z.union([z.string(), z.number()]).optional(),
	dividerBg: z.union([z.string(), z.number()]).optional(),
	dividerChar: z.string().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * SplitPane component marker for identifying split pane entities.
 */
export const SplitPane = {
	/** Tag indicating this is a split pane widget (1 = yes) */
	isSplitPane: new Uint8Array(DEFAULT_CAPACITY),
	/** Split direction (0 = horizontal, 1 = vertical) */
	direction: new Uint8Array(DEFAULT_CAPACITY),
	/** Number of panes */
	paneCount: new Uint8Array(DEFAULT_CAPACITY),
	/** Minimum pane size in cells */
	minPaneSize: new Uint8Array(DEFAULT_CAPACITY),
	/** Divider size in cells */
	dividerSize: new Uint8Array(DEFAULT_CAPACITY),
	/** Resizable flag (0 = no, 1 = yes) */
	resizable: new Uint8Array(DEFAULT_CAPACITY),
};

/** Store for pane states (arrays of PaneState) */
const paneStateStore = new Map<Entity, PaneState[]>();

/** Store for divider states */
const dividerStateStore = new Map<Entity, DividerState[]>();

/** Store for divider style config */
const dividerStyleStore = new Map<
	Entity,
	{ fg: number | undefined; bg: number | undefined; char: string }
>();

/** Global shared buffer registry for memory-efficient buffer sharing */
const sharedBufferRegistry = new Map<string, SharedTextBuffer>();

/** Store for accumulated dirty rects */
const dirtyRectStore = new Map<Entity, DirtyRect[]>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;

	// Handle keyword positions
	if (value === 'left' || value === 'top') return 0;
	if (value === 'center') return 50;
	if (value === 'right' || value === 'bottom') return 100;

	// Handle percentage strings like "50%"
	if (typeof value === 'string' && value.endsWith('%')) {
		const numericPortion = Number.parseFloat(value.slice(0, -1));
		if (!Number.isNaN(numericPortion)) {
			return numericPortion;
		}
	}

	return 0;
}

function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Normalizes ratios so they sum to 1.0.
 */
function normalizeRatios(ratios: readonly number[]): number[] {
	const sum = ratios.reduce((a, b) => a + b, 0);
	if (sum === 0) return ratios.map(() => 1 / ratios.length);
	return ratios.map((r) => r / sum);
}

/**
 * Creates default equal ratios for N panes.
 */
function defaultRatios(count: number): number[] {
	if (count <= 0) return [];
	return new Array(count).fill(1 / count) as number[];
}

/**
 * Computes pane viewports from ratios, container bounds, and direction.
 */
function computeViewports(
	containerX: number,
	containerY: number,
	containerWidth: number,
	containerHeight: number,
	direction: SplitDirection,
	ratios: readonly number[],
	dividerSize: number,
): PaneViewport[] {
	const paneCount = ratios.length;
	if (paneCount === 0) return [];

	const totalDividerSpace = dividerSize * (paneCount - 1);
	const availableSpace =
		direction === 'horizontal'
			? containerWidth - totalDividerSpace
			: containerHeight - totalDividerSpace;

	const clampedSpace = Math.max(0, availableSpace);
	const viewports: PaneViewport[] = [];
	let offset = 0;
	let usedPaneSpace = 0;

	for (let i = 0; i < paneCount; i++) {
		const isLastPane = i === paneCount - 1;
		// Last pane fills remaining pane space to avoid rounding gaps
		const paneSize = isLastPane
			? Math.max(1, clampedSpace - usedPaneSpace)
			: Math.max(1, Math.round(clampedSpace * (ratios[i] ?? 0)));

		if (direction === 'horizontal') {
			viewports.push({
				x: containerX + offset,
				y: containerY,
				width: paneSize,
				height: containerHeight,
			});
		} else {
			viewports.push({
				x: containerX,
				y: containerY + offset,
				width: containerWidth,
				height: paneSize,
			});
		}

		offset += paneSize;
		usedPaneSpace += paneSize;
		if (!isLastPane) {
			offset += dividerSize;
		}
	}

	return viewports;
}

/**
 * Clamps a ratio change to respect minimum pane sizes.
 */
function clampRatioChange(
	ratios: readonly number[],
	dividerIndex: number,
	delta: number,
	minPaneSize: number,
	totalSpace: number,
): number[] {
	const newRatios = [...ratios];
	const minRatio = totalSpace > 0 ? minPaneSize / totalSpace : 0;

	const leftRatio = (newRatios[dividerIndex] ?? 0) + delta;
	const rightRatio = (newRatios[dividerIndex + 1] ?? 0) - delta;

	if (leftRatio < minRatio) {
		const correctedDelta = minRatio - (newRatios[dividerIndex] ?? 0);
		newRatios[dividerIndex] = minRatio;
		newRatios[dividerIndex + 1] = (newRatios[dividerIndex + 1] ?? 0) - correctedDelta;
	} else if (rightRatio < minRatio) {
		const correctedDelta = (newRatios[dividerIndex + 1] ?? 0) - minRatio;
		newRatios[dividerIndex] = (newRatios[dividerIndex] ?? 0) + correctedDelta;
		newRatios[dividerIndex + 1] = minRatio;
	} else {
		newRatios[dividerIndex] = leftRatio;
		newRatios[dividerIndex + 1] = rightRatio;
	}

	return newRatios;
}

/**
 * Computes dirty rects from a viewport change.
 */
function computeResizeDirtyRects(
	oldViewports: readonly PaneViewport[],
	newViewports: readonly PaneViewport[],
	containerX: number,
	containerY: number,
	containerWidth: number,
	containerHeight: number,
): DirtyRect[] {
	const rects: DirtyRect[] = [];

	for (let i = 0; i < Math.max(oldViewports.length, newViewports.length); i++) {
		const oldVp = oldViewports[i];
		const newVp = newViewports[i];

		if (!oldVp || !newVp) {
			// Pane added or removed - dirty the entire area
			const vp = newVp ?? oldVp;
			if (vp) rects.push(vp);
			continue;
		}

		if (
			oldVp.x !== newVp.x ||
			oldVp.y !== newVp.y ||
			oldVp.width !== newVp.width ||
			oldVp.height !== newVp.height
		) {
			// Union the old and new bounds
			const minX = Math.min(oldVp.x, newVp.x);
			const minY = Math.min(oldVp.y, newVp.y);
			const maxX = Math.max(oldVp.x + oldVp.width, newVp.x + newVp.width);
			const maxY = Math.max(oldVp.y + oldVp.height, newVp.y + newVp.height);
			rects.push({
				x: Math.max(containerX, minX),
				y: Math.max(containerY, minY),
				width: Math.min(containerX + containerWidth, maxX) - Math.max(containerX, minX),
				height: Math.min(containerY + containerHeight, maxY) - Math.max(containerY, minY),
			});
		}
	}

	return rects;
}

function createPaneScrollState(): PaneScrollState {
	return { scrollX: 0, scrollY: 0, contentWidth: 0, contentHeight: 0 };
}

function clampScroll(scroll: PaneScrollState, viewport: PaneViewport): void {
	const maxX = Math.max(0, scroll.contentWidth - viewport.width);
	const maxY = Math.max(0, scroll.contentHeight - viewport.height);
	scroll.scrollX = Math.max(0, Math.min(scroll.scrollX, maxX));
	scroll.scrollY = Math.max(0, Math.min(scroll.scrollY, maxY));
}

interface ValidatedSplitPaneConfig {
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

// =============================================================================
// FACTORY
// =============================================================================

function initSplitPaneComponents(
	world: World,
	eid: Entity,
	validated: ValidatedSplitPaneConfig,
	direction: SplitDirection,
	minPaneSize: number,
	dividerSize: number,
	resizable: boolean,
): void {
	SplitPane.isSplitPane[eid] = 1;
	SplitPane.direction[eid] = direction === 'horizontal' ? 0 : 1;
	SplitPane.paneCount[eid] = 0;
	SplitPane.minPaneSize[eid] = minPaneSize;
	SplitPane.dividerSize[eid] = dividerSize;
	SplitPane.resizable[eid] = resizable ? 1 : 0;

	paneStateStore.set(eid, []);
	dividerStateStore.set(eid, []);
	dirtyRectStore.set(eid, []);

	dividerStyleStore.set(eid, {
		fg: validated.dividerFg !== undefined ? parseColor(validated.dividerFg) : undefined,
		bg: validated.dividerBg !== undefined ? parseColor(validated.dividerBg) : undefined,
		char: validated.dividerChar ?? (direction === 'horizontal' ? '│' : '─'),
	});

	const x = parsePositionToNumber(validated.left);
	const y = parsePositionToNumber(validated.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(validated.width);
	const height = parseDimension(validated.height);
	setDimensions(world, eid, width, height);

	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	setFocusable(world, eid, { focusable: true });
}

/**
 * Creates a SplitPane widget with the given configuration.
 *
 * The SplitPane divides its area into independently scrollable panes
 * separated by draggable dividers. Supports both horizontal (side-by-side)
 * and vertical (top-bottom) splits.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The SplitPane widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import { createSplitPane } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Two-pane horizontal split (like VS Code)
 * const split = createSplitPane(world, eid, {
 *   width: 120,
 *   height: 40,
 *   direction: 'horizontal',
 *   ratios: [0.5, 0.5],
 * });
 *
 * // Add pane content
 * const pane1 = addEntity(world);
 * const pane2 = addEntity(world);
 * split.append(pane1).append(pane2);
 *
 * // Scroll panes independently
 * split.scrollPane(0, 0, 10);
 * split.scrollPane(1, 0, 20);
 * ```
 */
export function createSplitPane(
	world: World,
	entity: Entity,
	config: SplitPaneConfig = {},
): SplitPaneWidget {
	const validated = SplitPaneConfigSchema.parse(config) as ValidatedSplitPaneConfig;
	const eid = entity;

	const direction: SplitDirection = validated.direction ?? 'horizontal';
	const minPaneSize = validated.minPaneSize ?? 3;
	const dividerSize = validated.dividerSize ?? 1;
	const resizable = validated.resizable !== false;

	initSplitPaneComponents(world, eid, validated, direction, minPaneSize, dividerSize, resizable);

	// Set initial ratios if provided
	let currentRatios: number[] = validated.ratios ? normalizeRatios(validated.ratios) : [];

	function releaseBufferRef(bufferId: string): void {
		const buf = sharedBufferRegistry.get(bufferId);
		if (!buf) return;
		buf.refCount--;
		if (buf.refCount <= 0) {
			sharedBufferRegistry.delete(bufferId);
		}
	}

	/**
	 * Gets container dimensions from the ECS.
	 */
	function getContainerBounds(): { x: number; y: number; width: number; height: number } {
		const dims = getDimensions(world, eid);
		return {
			x: 0,
			y: 0,
			width: dims?.width ?? 80,
			height: dims?.height ?? 24,
		};
	}

	function applyViewportsToPanes(panes: PaneState[], viewports: PaneViewport[]): void {
		for (let i = 0; i < panes.length; i++) {
			const pane = panes[i];
			const vp = viewports[i];
			if (!pane || !vp) continue;
			pane.viewport = vp;
			clampScroll(pane.scroll, vp);
			pane.dirty = true;
		}
	}

	function updateDividerRatios(ratios: number[]): void {
		const dividers = dividerStateStore.get(eid) ?? [];
		for (let i = 0; i < dividers.length; i++) {
			const divider = dividers[i];
			if (!divider) continue;
			let cumulative = 0;
			for (let j = 0; j <= i; j++) {
				cumulative += ratios[j] ?? 0;
			}
			divider.ratio = cumulative;
		}
	}

	function syncChildEntities(panes: PaneState[], viewports: PaneViewport[]): void {
		for (let i = 0; i < panes.length; i++) {
			const pane = panes[i];
			const vp = viewports[i];
			if (!pane || !vp) continue;
			setPosition(world, pane.entity, vp.x, vp.y);
			setDimensions(world, pane.entity, vp.width, vp.height);
		}
	}

	/**
	 * Recalculates all pane viewports.
	 */
	function recalculateViewports(): void {
		const panes = paneStateStore.get(eid);
		if (!panes || panes.length === 0) return;

		const bounds = getContainerBounds();
		const viewports = computeViewports(
			bounds.x,
			bounds.y,
			bounds.width,
			bounds.height,
			direction,
			currentRatios,
			dividerSize,
		);

		applyViewportsToPanes(panes, viewports);
		updateDividerRatios(currentRatios);
		syncChildEntities(panes, viewports);

		SplitPane.paneCount[eid] = panes.length;
		markDirty(world, eid);
	}

	/**
	 * Adds a pane to the split.
	 */
	function addPane(childEntity: Entity): void {
		const panes = paneStateStore.get(eid) ?? [];
		const newPane: PaneState = {
			entity: childEntity,
			viewport: { x: 0, y: 0, width: 0, height: 0 },
			scroll: createPaneScrollState(),
			sharedBufferId: undefined,
			dirty: true,
		};
		panes.push(newPane);
		paneStateStore.set(eid, panes);

		// Recalculate ratios for new pane count
		if (currentRatios.length < panes.length) {
			currentRatios = defaultRatios(panes.length);
		}

		// Add divider if there are now 2+ panes
		const dividers = dividerStateStore.get(eid) ?? [];
		if (panes.length > 1 && dividers.length < panes.length - 1) {
			let cumulative = 0;
			for (let j = 0; j < dividers.length + 1; j++) {
				cumulative += currentRatios[j] ?? 0;
			}
			dividers.push({
				ratio: cumulative,
				dragging: false,
				dragStartPos: 0,
				dragStartRatio: 0,
				dragStartRatios: [],
			});
			dividerStateStore.set(eid, dividers);
		}

		appendChild(world, eid, childEntity);
		recalculateViewports();
	}

	// Create the widget
	const widget: SplitPaneWidget = {
		eid,

		// Visibility
		show(): SplitPaneWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): SplitPaneWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): SplitPaneWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): SplitPaneWidget {
			setPosition(world, eid, newX, newY);
			recalculateViewports();
			return widget;
		},

		// Split-specific
		getDirection(): SplitDirection {
			return direction;
		},

		getRatios(): readonly number[] {
			return [...currentRatios];
		},

		setRatios(ratios: readonly number[]): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			if (ratios.length !== panes.length) return widget;
			currentRatios = normalizeRatios(ratios);
			recalculateViewports();
			return widget;
		},

		getPaneCount(): number {
			return (paneStateStore.get(eid) ?? []).length;
		},

		getPaneViewport(index: number): PaneViewport | undefined {
			const panes = paneStateStore.get(eid) ?? [];
			return panes[index]?.viewport;
		},

		getAllPaneViewports(): readonly PaneViewport[] {
			return (paneStateStore.get(eid) ?? []).map((p) => p.viewport);
		},

		// Scrolling
		scrollPane(index: number, dx: number, dy: number): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[index];
			if (!pane) return widget;

			pane.scroll.scrollX += dx;
			pane.scroll.scrollY += dy;
			clampScroll(pane.scroll, pane.viewport);
			pane.dirty = true;

			const rects = dirtyRectStore.get(eid) ?? [];
			rects.push(pane.viewport);
			dirtyRectStore.set(eid, rects);

			markDirty(world, eid);
			return widget;
		},

		setPaneScroll(index: number, scrollX: number, scrollY: number): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[index];
			if (!pane) return widget;

			pane.scroll.scrollX = scrollX;
			pane.scroll.scrollY = scrollY;
			clampScroll(pane.scroll, pane.viewport);
			pane.dirty = true;

			const rects = dirtyRectStore.get(eid) ?? [];
			rects.push(pane.viewport);
			dirtyRectStore.set(eid, rects);

			markDirty(world, eid);
			return widget;
		},

		getPaneScroll(index: number): PaneScrollState | undefined {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[index];
			if (!pane) return undefined;
			return { ...pane.scroll };
		},

		setPaneContentSize(
			index: number,
			contentWidth: number,
			contentHeight: number,
		): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[index];
			if (!pane) return widget;

			pane.scroll.contentWidth = contentWidth;
			pane.scroll.contentHeight = contentHeight;
			clampScroll(pane.scroll, pane.viewport);
			return widget;
		},

		// Shared buffers
		attachBuffer(paneIndex: number, buffer: SharedTextBuffer): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[paneIndex];
			if (!pane) return widget;

			// Detach existing buffer if any
			if (pane.sharedBufferId) {
				releaseBufferRef(pane.sharedBufferId);
			}

			// Attach new buffer
			pane.sharedBufferId = buffer.id;
			if (!sharedBufferRegistry.has(buffer.id)) {
				sharedBufferRegistry.set(buffer.id, buffer);
			}
			const registryBuffer = sharedBufferRegistry.get(buffer.id);
			if (registryBuffer) {
				registryBuffer.refCount++;
			}

			pane.scroll.contentHeight = buffer.lines.length;
			pane.dirty = true;
			markDirty(world, eid);
			return widget;
		},

		detachBuffer(paneIndex: number): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[paneIndex];
			if (!pane || !pane.sharedBufferId) return widget;

			releaseBufferRef(pane.sharedBufferId);
			pane.sharedBufferId = undefined;
			pane.dirty = true;
			markDirty(world, eid);
			return widget;
		},

		getBuffer(paneIndex: number): SharedTextBuffer | undefined {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[paneIndex];
			if (!pane || !pane.sharedBufferId) return undefined;
			return sharedBufferRegistry.get(pane.sharedBufferId);
		},

		// Divider interaction
		beginDrag(dividerIndex: number, position: number): SplitPaneWidget {
			if (!resizable) return widget;
			const dividers = dividerStateStore.get(eid) ?? [];
			const divider = dividers[dividerIndex];
			if (!divider) return widget;

			divider.dragging = true;
			divider.dragStartPos = position;
			divider.dragStartRatio = divider.ratio;
			divider.dragStartRatios = [...currentRatios];
			return widget;
		},

		updateDrag(dividerIndex: number, position: number): SplitResizeEvent | undefined {
			if (!resizable) return undefined;
			const dividers = dividerStateStore.get(eid) ?? [];
			const divider = dividers[dividerIndex];
			if (!divider || !divider.dragging) return undefined;

			const bounds = getContainerBounds();
			const totalSpace = direction === 'horizontal' ? bounds.width : bounds.height;
			const totalDividerSpace = dividerSize * (currentRatios.length - 1);
			const availableSpace = Math.max(1, totalSpace - totalDividerSpace);

			// Apply absolute delta from start position to the original ratios
			// to prevent compounding on multiple updateDrag calls
			const posDelta = position - divider.dragStartPos;
			const ratioDelta = posDelta / availableSpace;

			const oldViewports = (paneStateStore.get(eid) ?? []).map((p) => p.viewport);
			currentRatios = clampRatioChange(
				divider.dragStartRatios,
				dividerIndex,
				ratioDelta,
				minPaneSize,
				availableSpace,
			);

			recalculateViewports();

			const newViewports = (paneStateStore.get(eid) ?? []).map((p) => p.viewport);
			const dirtyRects = computeResizeDirtyRects(
				oldViewports,
				newViewports,
				bounds.x,
				bounds.y,
				bounds.width,
				bounds.height,
			);

			const rects = dirtyRectStore.get(eid) ?? [];
			rects.push(...dirtyRects);
			dirtyRectStore.set(eid, rects);

			return {
				dividerIndex,
				ratios: [...currentRatios],
				dirtyRects,
			};
		},

		endDrag(dividerIndex: number): SplitPaneWidget {
			const dividers = dividerStateStore.get(eid) ?? [];
			const divider = dividers[dividerIndex];
			if (!divider) return widget;

			divider.dragging = false;
			divider.dragStartPos = 0;
			divider.dragStartRatio = 0;
			divider.dragStartRatios = [];
			return widget;
		},

		isDragging(): boolean {
			const dividers = dividerStateStore.get(eid) ?? [];
			return dividers.some((d) => d.dragging);
		},

		// Dirty tracking
		getDirtyRects(): readonly DirtyRect[] {
			return [...(dirtyRectStore.get(eid) ?? [])];
		},

		markPaneDirty(index: number): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			const pane = panes[index];
			if (!pane) return widget;

			pane.dirty = true;
			const rects = dirtyRectStore.get(eid) ?? [];
			rects.push(pane.viewport);
			dirtyRectStore.set(eid, rects);

			markDirty(world, eid);
			return widget;
		},

		flushDirty(): SplitPaneWidget {
			const panes = paneStateStore.get(eid) ?? [];
			for (const pane of panes) {
				pane.dirty = false;
			}
			dirtyRectStore.set(eid, []);
			return widget;
		},

		// Recalculate
		recalculate(): SplitPaneWidget {
			recalculateViewports();
			return widget;
		},

		// Focus
		focus(): SplitPaneWidget {
			focus(world, eid);
			return widget;
		},

		blur(): SplitPaneWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): SplitPaneWidget {
			addPane(child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			// Detach all shared buffers
			const panes = paneStateStore.get(eid) ?? [];
			for (const pane of panes) {
				if (pane.sharedBufferId) {
					releaseBufferRef(pane.sharedBufferId);
				}
			}

			// Clean up stores
			SplitPane.isSplitPane[eid] = 0;
			SplitPane.direction[eid] = 0;
			SplitPane.paneCount[eid] = 0;
			SplitPane.minPaneSize[eid] = 0;
			SplitPane.dividerSize[eid] = 0;
			SplitPane.resizable[eid] = 0;
			paneStateStore.delete(eid);
			dividerStateStore.delete(eid);
			dividerStyleStore.delete(eid);
			dirtyRectStore.delete(eid);

			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a split pane widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a split pane widget
 *
 * @example
 * ```typescript
 * import { isSplitPane } from 'blecsd';
 *
 * if (isSplitPane(world, entity)) {
 *   console.log('Entity is a split pane');
 * }
 * ```
 */
export function isSplitPane(_world: World, eid: Entity): boolean {
	return SplitPane.isSplitPane[eid] === 1;
}

/**
 * Gets the split direction of a split pane entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The split direction
 */
export function getSplitDirection(_world: World, eid: Entity): SplitDirection {
	return SplitPane.direction[eid] === 0 ? 'horizontal' : 'vertical';
}

/**
 * Creates or retrieves a shared text buffer for memory-efficient content sharing.
 *
 * If a buffer with the given ID already exists, the existing buffer is returned
 * without modifying its refCount. New buffers are created with refCount = 0.
 * The caller is responsible for incrementing refCount via `attachBuffer()` on
 * the split pane widget.
 *
 * @param id - Unique buffer identifier
 * @param lines - Initial lines of text (ignored if buffer already exists)
 * @returns The shared text buffer (new or existing)
 *
 * @example
 * ```typescript
 * import { createSharedTextBuffer, createSplitPane } from 'blecsd';
 *
 * // Create a shared buffer with 100K lines
 * const buffer = createSharedTextBuffer('file1', lines);
 *
 * // Attach to multiple panes - same memory, different scroll positions
 * split.attachBuffer(0, buffer);
 * split.attachBuffer(1, buffer);
 * ```
 */
export function createSharedTextBuffer(id: string, lines: readonly string[]): SharedTextBuffer {
	const existing = sharedBufferRegistry.get(id);
	if (existing) return existing;

	const buffer: SharedTextBuffer = { id, lines, refCount: 0 };
	sharedBufferRegistry.set(id, buffer);
	return buffer;
}

/**
 * Gets a shared text buffer by ID.
 *
 * @param id - Buffer identifier
 * @returns The buffer, or undefined
 */
export function getSharedTextBuffer(id: string): SharedTextBuffer | undefined {
	return sharedBufferRegistry.get(id);
}

function findDividerAtPosition(
	panes: PaneState[],
	isHorizontal: boolean,
	dvSize: number,
	posX: number,
	posY: number,
): number {
	for (let i = 0; i < panes.length - 1; i++) {
		const pane = panes[i];
		if (!pane) continue;

		const divStart = isHorizontal
			? pane.viewport.x + pane.viewport.width
			: pane.viewport.y + pane.viewport.height;
		const pos = isHorizontal ? posX : posY;

		if (pos >= divStart && pos < divStart + dvSize) {
			return i;
		}
	}
	return -1;
}

/**
 * Computes which divider (if any) is at the given position within a split pane.
 *
 * @param world - The ECS world
 * @param eid - The split pane entity
 * @param posX - X position (relative to split pane)
 * @param posY - Y position (relative to split pane)
 * @returns The divider index, or -1 if no divider is at this position
 *
 * @example
 * ```typescript
 * import { hitTestDivider } from 'blecsd';
 *
 * const dividerIdx = hitTestDivider(world, splitEid, mouseX, mouseY);
 * if (dividerIdx >= 0) {
 *   split.beginDrag(dividerIdx, mouseX);
 * }
 * ```
 */
export function hitTestDivider(_world: World, eid: Entity, posX: number, posY: number): number {
	if (SplitPane.isSplitPane[eid] !== 1) return -1;

	const panes = paneStateStore.get(eid);
	if (!panes || panes.length < 2) return -1;

	const isHorizontal = SplitPane.direction[eid] === 0;
	const dvSize = SplitPane.dividerSize[eid] ?? 1;

	return findDividerAtPosition(panes, isHorizontal, dvSize, posX, posY);
}

/**
 * Gets the divider render info for drawing dividers.
 *
 * @param _world - The ECS world
 * @param eid - The split pane entity
 * @returns Array of divider positions and styles
 */
export function getDividerRenderInfo(
	_world: World,
	eid: Entity,
): readonly {
	x: number;
	y: number;
	width: number;
	height: number;
	char: string;
	fg: number | undefined;
	bg: number | undefined;
}[] {
	if (SplitPane.isSplitPane[eid] !== 1) return [];

	const panes = paneStateStore.get(eid);
	if (!panes || panes.length < 2) return [];

	const dir = SplitPane.direction[eid] === 0 ? 'horizontal' : 'vertical';
	const dvSize = SplitPane.dividerSize[eid] ?? 1;
	const style = dividerStyleStore.get(eid) ?? { fg: undefined, bg: undefined, char: '│' };

	const result: {
		x: number;
		y: number;
		width: number;
		height: number;
		char: string;
		fg: number | undefined;
		bg: number | undefined;
	}[] = [];

	for (let i = 0; i < panes.length - 1; i++) {
		const pane = panes[i];
		if (!pane) continue;

		if (dir === 'horizontal') {
			result.push({
				x: pane.viewport.x + pane.viewport.width,
				y: pane.viewport.y,
				width: dvSize,
				height: pane.viewport.height,
				char: style.char,
				fg: style.fg,
				bg: style.bg,
			});
		} else {
			result.push({
				x: pane.viewport.x,
				y: pane.viewport.y + pane.viewport.height,
				width: pane.viewport.width,
				height: dvSize,
				char: style.char,
				fg: style.fg,
				bg: style.bg,
			});
		}
	}

	return result;
}

/**
 * Resets the SplitPane component store. Useful for testing.
 * @internal
 */
export function resetSplitPaneStore(): void {
	SplitPane.isSplitPane.fill(0);
	SplitPane.direction.fill(0);
	SplitPane.paneCount.fill(0);
	SplitPane.minPaneSize.fill(0);
	SplitPane.dividerSize.fill(0);
	SplitPane.resizable.fill(0);
	paneStateStore.clear();
	dividerStateStore.clear();
	dividerStyleStore.clear();
	dirtyRectStore.clear();
	sharedBufferRegistry.clear();
}
