/**
 * State management for Split Pane Widget.
 *
 * @module widgets/splitPane/state
 */

import type { Entity } from '../../core/types';
import type { DirtyRect, DividerState, PaneState, SharedTextBuffer } from './types';

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
export const paneStateStore = new Map<Entity, PaneState[]>();

/** Store for divider states */
export const dividerStateStore = new Map<Entity, DividerState[]>();

/** Store for divider style config */
export const dividerStyleStore = new Map<
	Entity,
	{ fg: number | undefined; bg: number | undefined; char: string }
>();

/** Global shared buffer registry for memory-efficient buffer sharing */
export const sharedBufferRegistry = new Map<string, SharedTextBuffer>();

/** Store for accumulated dirty rects */
export const dirtyRectStore = new Map<Entity, DirtyRect[]>();

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
