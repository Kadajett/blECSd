/**
 * Public utility functions for Split Pane Widget.
 *
 * @module widgets/splitPane/utilities
 */

import type { Entity, World } from '../../core/types';
import {
	dividerStyleStore,
	paneStateStore,
	resetSplitPaneStore as resetStore,
	SplitPane,
	sharedBufferRegistry,
} from './state';
import type { DividerRenderInfo, PaneState, SharedTextBuffer, SplitDirection } from './types';

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

/**
 * Finds the divider at a given position.
 */
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
 * @param _world - The ECS world
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
export function getDividerRenderInfo(_world: World, eid: Entity): readonly DividerRenderInfo[] {
	if (SplitPane.isSplitPane[eid] !== 1) return [];

	const panes = paneStateStore.get(eid);
	if (!panes || panes.length < 2) return [];

	const dir = SplitPane.direction[eid] === 0 ? 'horizontal' : 'vertical';
	const dvSize = SplitPane.dividerSize[eid] ?? 1;
	const style = dividerStyleStore.get(eid) ?? { fg: undefined, bg: undefined, char: '│' };

	const result: DividerRenderInfo[] = [];

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
	resetStore();
}
