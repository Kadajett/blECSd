/**
 * Factory function for creating Tree widgets.
 *
 * @module widgets/tree/factory
 */

import { setDimensions } from '../../components/dimensions';
import { Position, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { TreeWidgetConfigSchema } from './config';
import {
	activateCallbacks,
	DEFAULT_COLLAPSED_FG,
	DEFAULT_EXPANDED_FG,
	DEFAULT_NODE_BG,
	DEFAULT_NODE_FG,
	DEFAULT_SELECTED_BG,
	DEFAULT_SELECTED_FG,
	displayStore,
	nodesStore,
	STATE_MAP,
	selectCallbacks,
	selectedPathStore,
	toggleCallbacks,
	treeStore,
} from './state';
import type {
	FlattenedNode,
	InternalTreeNode,
	TreeAction,
	TreeDisplay,
	TreeNode,
	TreeSelectCallback,
	TreeState,
	TreeStyleConfig,
	TreeWidget,
	TreeWidgetConfig,
} from './types';
import {
	buildTreeIndentation,
	collapseAllNodes,
	convertToInternalNode,
	expandAllNodes,
	findNodeByPath,
	flattenNodes,
	formatTreeLine,
	handleTreeEnterKey,
	handleTreeLeftKey,
	handleTreeRightKey,
	setNodeExpanded,
} from './utils';

/**
 * Creates a Tree widget with the given configuration.
 *
 * The Tree widget provides a hierarchical view with expandable nodes
 * and keyboard navigation support.
 *
 * Key bindings:
 * - Up/k: Previous visible node
 * - Down/j: Next visible node
 * - Left/h: Collapse or select parent
 * - Right/l: Expand
 * - Enter/Space: Activate node
 * - Escape: Blur
 * - g: First node
 * - G: Last node
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Tree widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createTree } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const tree = createTree(world, eid, {
 *   nodes: [
 *     {
 *       label: 'Root',
 *       expanded: true,
 *       children: [
 *         { label: 'Child 1' },
 *         {
 *           label: 'Child 2',
 *           children: [
 *             { label: 'Grandchild' },
 *           ],
 *         },
 *       ],
 *     },
 *   ],
 *   style: {
 *     selected: { fg: 0x000000ff, bg: 0x00ffffff },
 *   },
 * });
 *
 * // Navigate
 * tree.focus().selectNext();
 *
 * // Expand/collapse
 * tree.toggle('0');
 *
 * // Handle keys in your game loop
 * const action = tree.handleKey('down');
 *
 * // Clean up when done
 * tree.destroy();
 * ```
 */
export function createTree(
	world: World,
	entity: Entity,
	config: TreeWidgetConfig = {},
): TreeWidget {
	const validated = TreeWidgetConfigSchema.parse(config);
	const eid = entity;

	// Mark as tree
	treeStore.isTree[eid] = 1;

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set options
	treeStore.showLines[eid] = validated.showLines ? 1 : 0;
	treeStore.keys[eid] = validated.keys ? 1 : 0;
	treeStore.indent[eid] = validated.indent;
	treeStore.visibleCount[eid] = validated.height;

	// Convert nodes to internal format
	const internalNodes = validated.nodes.map((node) => convertToInternalNode(node));

	// Set root indices for path calculation
	for (let i = 0; i < internalNodes.length; i++) {
		const node = internalNodes[i];
		if (node) {
			// Store root index
			(node as InternalTreeNode & { rootIndex: number }).rootIndex = i;
		}
	}

	nodesStore.set(eid, internalNodes);

	// Set initial selection
	if (validated.selected) {
		selectedPathStore.set(eid, validated.selected);
	} else if (internalNodes.length > 0) {
		selectedPathStore.set(eid, '0');
	}

	// Set display options
	const display: TreeDisplay = {
		nodeFg: validated.style?.node?.fg ?? DEFAULT_NODE_FG,
		nodeBg: validated.style?.node?.bg ?? DEFAULT_NODE_BG,
		selectedFg: validated.style?.selected?.fg ?? DEFAULT_SELECTED_FG,
		selectedBg: validated.style?.selected?.bg ?? DEFAULT_SELECTED_BG,
		expandedFg: validated.style?.expanded?.fg ?? DEFAULT_EXPANDED_FG,
		collapsedFg: validated.style?.collapsed?.fg ?? DEFAULT_COLLAPSED_FG,
	};
	displayStore.set(eid, display);

	// Initialize callback sets
	selectCallbacks.set(eid, new Set());
	activateCallbacks.set(eid, new Set());
	toggleCallbacks.set(eid, new Set());

	// Helper to notify select callbacks
	const notifySelect = (): void => {
		const path = selectedPathStore.get(eid) ?? '';
		const nodes = nodesStore.get(eid) ?? [];
		const node = findNodeByPath(nodes, path);
		if (node) {
			const callbacks = selectCallbacks.get(eid);
			if (callbacks) {
				for (const cb of callbacks) {
					cb(path, node);
				}
			}
		}
	};

	// Helper to notify activate callbacks
	const notifyActivate = (): void => {
		const path = selectedPathStore.get(eid) ?? '';
		const nodes = nodesStore.get(eid) ?? [];
		const node = findNodeByPath(nodes, path);
		if (node) {
			const callbacks = activateCallbacks.get(eid);
			if (callbacks) {
				for (const cb of callbacks) {
					cb(path, node);
				}
			}
		}
	};

	// Helper to notify toggle callbacks
	const notifyToggle = (path: string, expanded: boolean): void => {
		const callbacks = toggleCallbacks.get(eid);
		if (callbacks) {
			for (const cb of callbacks) {
				cb(path, expanded);
			}
		}
	};

	// Helper to get flattened visible nodes
	const getFlattened = (): FlattenedNode[] => {
		const nodes = nodesStore.get(eid) ?? [];
		return flattenNodes(nodes);
	};

	// Helper to ensure selected node is visible
	const ensureVisible = (): void => {
		const flattened = getFlattened();
		const path = selectedPathStore.get(eid) ?? '';
		const index = flattened.findIndex((f) => f.path === path);
		if (index < 0) return;

		const firstVisible = treeStore.firstVisible[eid] ?? 0;
		const visibleCount = treeStore.visibleCount[eid] ?? 0;
		const lastVisible = firstVisible + visibleCount - 1;

		if (index < firstVisible) {
			treeStore.firstVisible[eid] = index;
		} else if (index > lastVisible) {
			treeStore.firstVisible[eid] = Math.max(0, index - visibleCount + 1);
		}
	};

	// Create the widget object with chainable methods
	const widget: TreeWidget = {
		eid,

		// Visibility
		show(): TreeWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TreeWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): TreeWidget {
			Position.x[eid] = (Position.x[eid] ?? 0) + dx;
			Position.y[eid] = (Position.y[eid] ?? 0) + dy;
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): TreeWidget {
			setPosition(world, eid, x, y);
			return widget;
		},

		// Focus
		focus(): TreeWidget {
			treeStore.state[eid] = 1;
			markDirty(world, eid);
			return widget;
		},

		blur(): TreeWidget {
			treeStore.state[eid] = 0;
			markDirty(world, eid);
			return widget;
		},

		// Nodes
		setNodes(newNodes: readonly TreeNode[]): TreeWidget {
			const internal = newNodes.map((node) => convertToInternalNode(node));
			nodesStore.set(eid, internal);
			// Reset selection to first node
			if (internal.length > 0) {
				selectedPathStore.set(eid, '0');
			} else {
				selectedPathStore.delete(eid);
			}
			treeStore.firstVisible[eid] = 0;
			markDirty(world, eid);
			return widget;
		},

		getNodes(): readonly InternalTreeNode[] {
			return nodesStore.get(eid) ?? [];
		},

		getNode(path: string): InternalTreeNode | undefined {
			const nodes = nodesStore.get(eid) ?? [];
			return findNodeByPath(nodes, path);
		},

		getVisibleNodes(): readonly FlattenedNode[] {
			return getFlattened();
		},

		// Selection
		select(path: string): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			const node = findNodeByPath(nodes, path);
			if (node) {
				selectedPathStore.set(eid, path);
				ensureVisible();
				markDirty(world, eid);
				notifySelect();
			}
			return widget;
		},

		getSelectedPath(): string {
			return selectedPathStore.get(eid) ?? '';
		},

		getSelectedNode(): InternalTreeNode | undefined {
			const path = selectedPathStore.get(eid) ?? '';
			const nodes = nodesStore.get(eid) ?? [];
			return findNodeByPath(nodes, path);
		},

		selectPrev(): TreeWidget {
			const flattened = getFlattened();
			const currentPath = selectedPathStore.get(eid) ?? '';
			const currentIndex = flattened.findIndex((f) => f.path === currentPath);
			if (currentIndex > 0) {
				const prev = flattened[currentIndex - 1];
				if (prev) {
					widget.select(prev.path);
				}
			}
			return widget;
		},

		selectNext(): TreeWidget {
			const flattened = getFlattened();
			const currentPath = selectedPathStore.get(eid) ?? '';
			const currentIndex = flattened.findIndex((f) => f.path === currentPath);
			if (currentIndex < flattened.length - 1) {
				const next = flattened[currentIndex + 1];
				if (next) {
					widget.select(next.path);
				}
			}
			return widget;
		},

		selectFirst(): TreeWidget {
			const flattened = getFlattened();
			if (flattened.length > 0) {
				const first = flattened[0];
				if (first) {
					widget.select(first.path);
				}
			}
			return widget;
		},

		selectLast(): TreeWidget {
			const flattened = getFlattened();
			if (flattened.length > 0) {
				const last = flattened[flattened.length - 1];
				if (last) {
					widget.select(last.path);
				}
			}
			return widget;
		},

		selectParent(): TreeWidget {
			const currentPath = selectedPathStore.get(eid) ?? '';
			const parts = currentPath.split('.');
			if (parts.length > 1) {
				parts.pop();
				widget.select(parts.join('.'));
			}
			return widget;
		},

		// Expand/Collapse
		expand(path: string): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			const node = findNodeByPath(nodes, path);
			if (node && node.children.length > 0 && !node.expanded) {
				setNodeExpanded(node, true);
				markDirty(world, eid);
				notifyToggle(path, true);
			}
			return widget;
		},

		collapse(path: string): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			const node = findNodeByPath(nodes, path);
			if (node?.expanded) {
				setNodeExpanded(node, false);
				markDirty(world, eid);
				notifyToggle(path, false);
			}
			return widget;
		},

		toggle(path: string): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			const node = findNodeByPath(nodes, path);
			if (node && node.children.length > 0) {
				const newState = !node.expanded;
				setNodeExpanded(node, newState);
				markDirty(world, eid);
				notifyToggle(path, newState);
			}
			return widget;
		},

		expandAll(): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			expandAllNodes(nodes);
			markDirty(world, eid);
			return widget;
		},

		collapseAll(): TreeWidget {
			const nodes = nodesStore.get(eid) ?? [];
			collapseAllNodes(nodes);
			markDirty(world, eid);
			return widget;
		},

		isExpanded(path: string): boolean {
			const nodes = nodesStore.get(eid) ?? [];
			const node = findNodeByPath(nodes, path);
			return node?.expanded ?? false;
		},

		// State
		getState(): TreeState {
			const stateNum = treeStore.state[eid] ?? 0;
			return STATE_MAP[stateNum] ?? 'idle';
		},

		// Display
		setStyle(style: TreeStyleConfig): TreeWidget {
			const currentDisplay = displayStore.get(eid) ?? {
				nodeFg: DEFAULT_NODE_FG,
				nodeBg: DEFAULT_NODE_BG,
				selectedFg: DEFAULT_SELECTED_FG,
				selectedBg: DEFAULT_SELECTED_BG,
				expandedFg: DEFAULT_EXPANDED_FG,
				collapsedFg: DEFAULT_COLLAPSED_FG,
			};

			if (style.node?.fg !== undefined) {
				currentDisplay.nodeFg = style.node.fg;
			}
			if (style.node?.bg !== undefined) {
				currentDisplay.nodeBg = style.node.bg;
			}
			if (style.selected?.fg !== undefined) {
				currentDisplay.selectedFg = style.selected.fg;
			}
			if (style.selected?.bg !== undefined) {
				currentDisplay.selectedBg = style.selected.bg;
			}
			if (style.expanded?.fg !== undefined) {
				currentDisplay.expandedFg = style.expanded.fg;
			}
			if (style.collapsed?.fg !== undefined) {
				currentDisplay.collapsedFg = style.collapsed.fg;
			}

			displayStore.set(eid, currentDisplay);
			markDirty(world, eid);
			return widget;
		},

		setShowLines(show: boolean): TreeWidget {
			treeStore.showLines[eid] = show ? 1 : 0;
			markDirty(world, eid);
			return widget;
		},

		getShowLines(): boolean {
			return treeStore.showLines[eid] === 1;
		},

		// Scrolling
		getFirstVisible(): number {
			return treeStore.firstVisible[eid] ?? 0;
		},

		setFirstVisible(index: number): TreeWidget {
			treeStore.firstVisible[eid] = Math.max(0, index);
			markDirty(world, eid);
			return widget;
		},

		getVisibleCount(): number {
			return treeStore.visibleCount[eid] ?? 0;
		},

		// Rendering
		renderLines(width: number): string[] {
			const flattened = getFlattened();
			const selectedPath = selectedPathStore.get(eid) ?? '';
			const showLines = treeStore.showLines[eid] === 1;
			const indent = treeStore.indent[eid] ?? 2;
			const firstVisible = treeStore.firstVisible[eid] ?? 0;
			const visibleCount = treeStore.visibleCount[eid] ?? flattened.length;

			const lines: string[] = [];
			const endIndex = Math.min(firstVisible + visibleCount, flattened.length);

			for (let i = firstVisible; i < endIndex; i++) {
				const item = flattened[i];
				if (!item) continue;

				const { node, path, isLastChild, parentIsLast } = item;
				const isSelected = path === selectedPath;

				const indentation = buildTreeIndentation(
					node.depth,
					indent,
					showLines,
					isLastChild,
					parentIsLast,
				);
				const line = formatTreeLine(node, indentation, isSelected, width);
				lines.push(line);
			}

			return lines;
		},

		// Events
		onSelect(callback: TreeSelectCallback): () => void {
			const callbacks = selectCallbacks.get(eid);
			if (callbacks) {
				callbacks.add(callback);
			}
			return () => {
				callbacks?.delete(callback);
			};
		},

		onActivate(callback: TreeSelectCallback): () => void {
			const callbacks = activateCallbacks.get(eid);
			if (callbacks) {
				callbacks.add(callback);
			}
			return () => {
				callbacks?.delete(callback);
			};
		},

		onToggle(callback: (path: string, expanded: boolean) => void): () => void {
			const callbacks = toggleCallbacks.get(eid);
			if (callbacks) {
				callbacks.add(callback);
			}
			return () => {
				callbacks?.delete(callback);
			};
		},

		// Key handling
		handleKey(key: string): TreeAction | null {
			// Only respond to keys if focused and keys enabled
			const state = treeStore.state[eid] ?? 0;
			const keysEnabled = treeStore.keys[eid] === 1;

			if (state !== 1 || !keysEnabled) {
				return null;
			}

			const currentPath = selectedPathStore.get(eid) ?? '';
			const nodes = nodesStore.get(eid) ?? [];
			const currentNode = findNodeByPath(nodes, currentPath);

			// Check for G (uppercase) first before lowercasing
			if (key === 'G') {
				widget.selectLast();
				return { type: 'selectLast' };
			}

			switch (key.toLowerCase()) {
				case 'up':
				case 'k':
					widget.selectPrev();
					return { type: 'selectPrev' };
				case 'down':
				case 'j':
					widget.selectNext();
					return { type: 'selectNext' };
				case 'left':
				case 'h':
					return handleTreeLeftKey(widget, currentNode, currentPath);
				case 'right':
				case 'l':
					return handleTreeRightKey(widget, currentNode, currentPath);
				case 'enter':
				case ' ':
					return handleTreeEnterKey(widget, currentNode, currentPath, notifyActivate);
				case 'escape':
					widget.blur();
					return { type: 'cancel' };
				case 'g':
					widget.selectFirst();
					return { type: 'selectFirst' };
			}

			return null;
		},

		// Lifecycle
		destroy(): void {
			treeStore.isTree[eid] = 0;
			treeStore.state[eid] = 0;
			treeStore.showLines[eid] = 0;
			treeStore.keys[eid] = 0;
			treeStore.indent[eid] = 0;
			treeStore.firstVisible[eid] = 0;
			treeStore.visibleCount[eid] = 0;
			nodesStore.delete(eid);
			selectedPathStore.delete(eid);
			displayStore.delete(eid);
			selectCallbacks.delete(eid);
			activateCallbacks.delete(eid);
			toggleCallbacks.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a tree.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a tree
 */
export function isTreeWidget(_world: World, eid: Entity): boolean {
	return treeStore.isTree[eid] === 1;
}
