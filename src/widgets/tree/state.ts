/**
 * State management for Tree Widget.
 *
 * @module widgets/tree/state
 */

import type { Entity } from '../../core/types';
import { createComponentStore } from '../../utils/componentStorage';
import type { InternalTreeNode, TreeDisplay, TreeSelectCallback, TreeState } from './types';

/** Maximum number of entities supported */
const MAX_ENTITIES = 10000;

/** Store for tree state */
export const treeStore = {
	isTree: new Uint8Array(MAX_ENTITIES),
	state: new Uint8Array(MAX_ENTITIES), // 0 = idle, 1 = focused
	showLines: new Uint8Array(MAX_ENTITIES),
	keys: new Uint8Array(MAX_ENTITIES),
	indent: new Uint8Array(MAX_ENTITIES),
	firstVisible: new Uint32Array(MAX_ENTITIES),
	visibleCount: new Uint32Array(MAX_ENTITIES),
};

/**
 * Store for tree nodes.
 * Uses iterable ComponentStore backed by PackedStore for cache-friendly
 * dense iteration when rendering all tree entities.
 */
export const nodesStore = createComponentStore<InternalTreeNode[]>({ iterable: true });

/** Store for selected path */
export const selectedPathStore = new Map<Entity, string>();

/** Store for display options */
export const displayStore = new Map<Entity, TreeDisplay>();

/** Store for callbacks */
export const selectCallbacks = new Map<Entity, Set<TreeSelectCallback>>();
export const activateCallbacks = new Map<Entity, Set<TreeSelectCallback>>();
export const toggleCallbacks = new Map<Entity, Set<(path: string, expanded: boolean) => void>>();

// Default colors
export const DEFAULT_NODE_FG = 0xccccccff;
export const DEFAULT_NODE_BG = 0x000000ff;
export const DEFAULT_SELECTED_FG = 0x000000ff;
export const DEFAULT_SELECTED_BG = 0x00ffffff;
export const DEFAULT_EXPANDED_FG = 0x88ff88ff;
export const DEFAULT_COLLAPSED_FG = 0x8888ffff;

// State mapping
export const STATE_MAP: Record<number, TreeState> = {
	0: 'idle',
	1: 'focused',
};

/**
 * Resets the tree store (for testing).
 */
export function resetTreeStore(): void {
	treeStore.isTree.fill(0);
	treeStore.state.fill(0);
	treeStore.showLines.fill(0);
	treeStore.keys.fill(0);
	treeStore.indent.fill(0);
	treeStore.firstVisible.fill(0);
	treeStore.visibleCount.fill(0);
	nodesStore.clear();
	selectedPathStore.clear();
	displayStore.clear();
	selectCallbacks.clear();
	activateCallbacks.clear();
	toggleCallbacks.clear();
}
