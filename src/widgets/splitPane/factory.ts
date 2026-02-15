/**
 * Factory function for creating Split Pane widgets.
 *
 * @module widgets/splitPane/factory
 */

import { getDimensions, setDimensions } from '../../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { appendChild, getChildren } from '../../components/hierarchy';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setStyle, setVisible } from '../../components/renderable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { SplitPaneConfigSchema } from './config';
import {
	dirtyRectStore,
	dividerStateStore,
	dividerStyleStore,
	paneStateStore,
	SplitPane,
	sharedBufferRegistry,
} from './state';
import type {
	DirtyRect,
	PaneScrollState,
	PaneState,
	PaneViewport,
	SharedTextBuffer,
	SplitDirection,
	SplitPaneConfig,
	SplitPaneWidget,
	SplitResizeEvent,
	ValidatedSplitPaneConfig,
} from './types';
import {
	clampRatioChange,
	clampScroll,
	computeResizeDirtyRects,
	computeViewports,
	createPaneScrollState,
	defaultRatios,
	normalizeRatios,
	parseColor,
	parseDimension,
	parsePositionToNumber,
} from './utils';

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
