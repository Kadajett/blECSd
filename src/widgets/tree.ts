/**
 * Tree Widget
 *
 * Provides a hierarchical tree view widget with expandable nodes,
 * keyboard navigation, and selection support.
 *
 * @module widgets/tree
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

/** Default tree line characters */
const TREE_LINES = {
	VERTICAL: '│',
	HORIZONTAL: '─',
	BRANCH: '├',
	CORNER: '└',
	EXPANDED: '▼',
	COLLAPSED: '▶',
	SPACE: ' ',
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * A node in the tree hierarchy.
 */
export interface TreeNode {
	/** Display label for the node */
	readonly label: string;
	/** Optional value associated with the node */
	readonly value?: unknown;
	/** Child nodes */
	readonly children?: readonly TreeNode[];
	/** Whether the node is expanded (default: false) */
	readonly expanded?: boolean;
	/** Optional icon displayed before the label */
	readonly icon?: string;
	/** Optional unique identifier (auto-generated if not provided) */
	readonly id?: string;
}

/**
 * Internal tree node with mutable state.
 */
interface InternalTreeNode {
	label: string;
	value?: unknown;
	children: InternalTreeNode[];
	expanded: boolean;
	icon?: string;
	id: string;
	parent?: InternalTreeNode;
	depth: number;
}

/**
 * Flattened node for rendering.
 */
export interface FlattenedNode {
	readonly node: InternalTreeNode;
	readonly path: string;
	readonly depth: number;
	readonly isLastChild: boolean;
	readonly parentIsLast: boolean[];
}

/**
 * Style configuration for tree widget.
 */
export interface TreeStyleConfig {
	/** Style for regular nodes */
	readonly node?: {
		readonly fg?: number;
		readonly bg?: number;
	};
	/** Style for selected node */
	readonly selected?: {
		readonly fg?: number;
		readonly bg?: number;
	};
	/** Style for expanded indicator */
	readonly expanded?: {
		readonly fg?: number;
	};
	/** Style for collapsed indicator */
	readonly collapsed?: {
		readonly fg?: number;
	};
}

/**
 * Configuration for creating a Tree widget.
 */
export interface TreeWidgetConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width of the tree */
	readonly width?: number;
	/** Height of the tree (visible rows) */
	readonly height?: number;
	/** Root nodes */
	readonly nodes?: readonly TreeNode[];
	/** Initially selected path (e.g., "0.1.0") */
	readonly selected?: string;
	/** Style configuration */
	readonly style?: TreeStyleConfig;
	/** Whether to show connection lines (default: true) */
	readonly showLines?: boolean;
	/** Whether keyboard input is enabled (default: true) */
	readonly keys?: boolean;
	/** Indentation per level (default: 2) */
	readonly indent?: number;
}

/**
 * Tree state type.
 */
export type TreeState = 'idle' | 'focused';

/**
 * Tree action type.
 */
export interface TreeAction {
	readonly type:
		| 'selectPrev'
		| 'selectNext'
		| 'selectFirst'
		| 'selectLast'
		| 'expand'
		| 'collapse'
		| 'toggle'
		| 'confirm'
		| 'cancel'
		| 'selectParent';
}

/**
 * Callback for tree selection events.
 */
export type TreeSelectCallback = (path: string, node: InternalTreeNode) => void;

/**
 * Tree widget interface providing chainable methods.
 */
export interface TreeWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the tree */
	show(): TreeWidget;
	/** Hides the tree */
	hide(): TreeWidget;

	// Position
	/** Moves the tree by dx, dy */
	move(dx: number, dy: number): TreeWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): TreeWidget;

	// Focus
	/** Focuses the tree */
	focus(): TreeWidget;
	/** Blurs the tree */
	blur(): TreeWidget;

	// Nodes
	/** Sets the root nodes */
	setNodes(nodes: readonly TreeNode[]): TreeWidget;
	/** Gets the root nodes */
	getNodes(): readonly InternalTreeNode[];
	/** Gets a node by path */
	getNode(path: string): InternalTreeNode | undefined;
	/** Gets all visible (flattened) nodes */
	getVisibleNodes(): readonly FlattenedNode[];

	// Selection
	/** Selects a node by path */
	select(path: string): TreeWidget;
	/** Gets the selected path */
	getSelectedPath(): string;
	/** Gets the selected node */
	getSelectedNode(): InternalTreeNode | undefined;
	/** Selects the previous visible node */
	selectPrev(): TreeWidget;
	/** Selects the next visible node */
	selectNext(): TreeWidget;
	/** Selects the first visible node */
	selectFirst(): TreeWidget;
	/** Selects the last visible node */
	selectLast(): TreeWidget;
	/** Selects the parent of the current node */
	selectParent(): TreeWidget;

	// Expand/Collapse
	/** Expands a node by path */
	expand(path: string): TreeWidget;
	/** Collapses a node by path */
	collapse(path: string): TreeWidget;
	/** Toggles expansion of a node */
	toggle(path: string): TreeWidget;
	/** Expands all nodes */
	expandAll(): TreeWidget;
	/** Collapses all nodes */
	collapseAll(): TreeWidget;
	/** Checks if a node is expanded */
	isExpanded(path: string): boolean;

	// State
	/** Gets the current state */
	getState(): TreeState;

	// Display
	/** Sets display styles */
	setStyle(style: TreeStyleConfig): TreeWidget;
	/** Sets whether to show lines */
	setShowLines(show: boolean): TreeWidget;
	/** Gets whether lines are shown */
	getShowLines(): boolean;

	// Scrolling
	/** Gets the first visible index */
	getFirstVisible(): number;
	/** Sets the first visible index */
	setFirstVisible(index: number): TreeWidget;
	/** Gets the visible count */
	getVisibleCount(): number;

	// Rendering
	/** Renders tree as text lines */
	renderLines(width: number): string[];

	// Events
	/** Registers callback for selection change */
	onSelect(callback: TreeSelectCallback): () => void;
	/** Registers callback for node activation (Enter) */
	onActivate(callback: TreeSelectCallback): () => void;
	/** Registers callback for expand/collapse */
	onToggle(callback: (path: string, expanded: boolean) => void): () => void;

	// Key handling
	/** Handles a key press, returns the action taken */
	handleKey(key: string): TreeAction | null;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for tree node.
 */
export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
	z.object({
		label: z.string(),
		value: z.unknown().optional(),
		children: z.array(TreeNodeSchema).optional(),
		expanded: z.boolean().optional(),
		icon: z.string().optional(),
		id: z.string().optional(),
	}),
);

/**
 * Zod schema for tree widget configuration.
 */
export const TreeWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	nodes: z.array(TreeNodeSchema).default([]),
	selected: z.string().optional(),
	style: z
		.object({
			node: z
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
			expanded: z
				.object({
					fg: z.number().optional(),
				})
				.optional(),
			collapsed: z
				.object({
					fg: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
	showLines: z.boolean().default(true),
	keys: z.boolean().default(true),
	indent: z.number().int().min(1).max(8).default(2),
});

// =============================================================================
// STORE
// =============================================================================

/** Store for tree state */
const treeStore = {
	isTree: new Uint8Array(MAX_ENTITIES),
	state: new Uint8Array(MAX_ENTITIES), // 0 = idle, 1 = focused
	showLines: new Uint8Array(MAX_ENTITIES),
	keys: new Uint8Array(MAX_ENTITIES),
	indent: new Uint8Array(MAX_ENTITIES),
	firstVisible: new Uint32Array(MAX_ENTITIES),
	visibleCount: new Uint32Array(MAX_ENTITIES),
};

/** Store for tree nodes */
const nodesStore = new Map<Entity, InternalTreeNode[]>();

/** Store for selected path */
const selectedPathStore = new Map<Entity, string>();

/** Store for display options */
interface TreeDisplay {
	nodeFg: number;
	nodeBg: number;
	selectedFg: number;
	selectedBg: number;
	expandedFg: number;
	collapsedFg: number;
}

const displayStore = new Map<Entity, TreeDisplay>();

/** Store for callbacks */
const selectCallbacks = new Map<Entity, Set<TreeSelectCallback>>();
const activateCallbacks = new Map<Entity, Set<TreeSelectCallback>>();
const toggleCallbacks = new Map<Entity, Set<(path: string, expanded: boolean) => void>>();

// Default colors
const DEFAULT_NODE_FG = 0xccccccff;
const DEFAULT_NODE_BG = 0x000000ff;
const DEFAULT_SELECTED_FG = 0x000000ff;
const DEFAULT_SELECTED_BG = 0x00ffffff;
const DEFAULT_EXPANDED_FG = 0x88ff88ff;
const DEFAULT_COLLAPSED_FG = 0x8888ffff;

// State mapping
const STATE_MAP: Record<number, TreeState> = {
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

// =============================================================================
// HELPERS
// =============================================================================

let nodeIdCounter = 0;

function generateNodeId(): string {
	return `node_${++nodeIdCounter}`;
}

function convertToInternalNode(
	node: TreeNode,
	parent?: InternalTreeNode,
	depth = 0,
): InternalTreeNode {
	const internal: InternalTreeNode = {
		label: node.label,
		value: node.value,
		children: [],
		expanded: node.expanded ?? false,
		icon: node.icon,
		id: node.id ?? generateNodeId(),
		parent,
		depth,
	};

	if (node.children) {
		internal.children = node.children.map((child) =>
			convertToInternalNode(child, internal, depth + 1),
		);
	}

	return internal;
}

/**
 * Handles left/h key for tree navigation.
 */
function handleTreeLeftKey(
	widget: TreeWidget,
	currentNode: InternalTreeNode | undefined,
	currentPath: string,
): TreeAction {
	if (currentNode?.expanded) {
		widget.collapse(currentPath);
		return { type: 'collapse' };
	}
	widget.selectParent();
	return { type: 'selectParent' };
}

/**
 * Handles right/l key for tree navigation.
 */
function handleTreeRightKey(
	widget: TreeWidget,
	currentNode: InternalTreeNode | undefined,
	currentPath: string,
): TreeAction | null {
	if (currentNode && currentNode.children.length > 0 && !currentNode.expanded) {
		widget.expand(currentPath);
		return { type: 'expand' };
	}
	return null;
}

/**
 * Handles enter/space key for tree activation.
 */
function handleTreeEnterKey(
	widget: TreeWidget,
	currentNode: InternalTreeNode | undefined,
	currentPath: string,
	notifyActivate: () => void,
): TreeAction {
	if (currentNode && currentNode.children.length > 0) {
		widget.toggle(currentPath);
		return { type: 'toggle' };
	}
	notifyActivate();
	return { type: 'confirm' };
}

/**
 * Builds tree indentation string with optional tree lines.
 */
function buildTreeIndentation(
	depth: number,
	indent: number,
	showLines: boolean,
	isLastChild: boolean,
	parentIsLast: boolean[],
): string {
	if (depth === 0) {
		return '';
	}

	if (!showLines) {
		return TREE_LINES.SPACE.repeat(depth * indent);
	}

	let line = '';
	for (let d = 0; d < depth - 1; d++) {
		if (parentIsLast[d]) {
			line += TREE_LINES.SPACE.repeat(indent);
		} else {
			line += TREE_LINES.VERTICAL + TREE_LINES.SPACE.repeat(indent - 1);
		}
	}
	line += isLastChild ? TREE_LINES.CORNER : TREE_LINES.BRANCH;
	line += TREE_LINES.HORIZONTAL.repeat(indent - 1);
	return line;
}

/**
 * Formats a single tree line with all decorations.
 */
function formatTreeLine(
	node: InternalTreeNode,
	indentation: string,
	isSelected: boolean,
	width: number,
): string {
	let line = indentation;

	// Add expand/collapse indicator
	const hasChildren = node.children.length > 0;
	if (hasChildren) {
		line += node.expanded ? TREE_LINES.EXPANDED : TREE_LINES.COLLAPSED;
		line += ' ';
	} else {
		line += '  ';
	}

	// Add icon if present
	if (node.icon) {
		line += `${node.icon} `;
	}

	// Add label
	line += node.label;

	// Truncate if needed
	if (line.length > width) {
		line = `${line.slice(0, width - 1)}…`;
	}

	// Mark selected
	if (isSelected) {
		line = `[${line.padEnd(width - 2)}]`;
	} else {
		line = ` ${line.padEnd(width - 2)} `;
	}

	return line;
}

function flattenNodes(
	nodes: readonly InternalTreeNode[],
	parentPath = '',
	parentIsLast: boolean[] = [],
): FlattenedNode[] {
	const result: FlattenedNode[] = [];

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (!node) continue;

		const isLastChild = i === nodes.length - 1;
		const path = parentPath ? `${parentPath}.${i}` : `${i}`;

		result.push({
			node,
			path,
			depth: node.depth,
			isLastChild,
			parentIsLast: [...parentIsLast],
		});

		if (node.expanded && node.children.length > 0) {
			result.push(...flattenNodes(node.children, path, [...parentIsLast, isLastChild]));
		}
	}

	return result;
}

function findNodeByPath(
	nodes: readonly InternalTreeNode[],
	path: string,
): InternalTreeNode | undefined {
	if (!path) {
		return nodes[0];
	}

	const indices = path.split('.').map(Number);
	let current: InternalTreeNode | undefined = nodes[indices[0] ?? 0];

	for (let i = 1; i < indices.length && current; i++) {
		const index = indices[i];
		if (index !== undefined) {
			current = current.children[index];
		}
	}

	return current;
}

function setNodeExpanded(node: InternalTreeNode, expanded: boolean): void {
	node.expanded = expanded;
}

function expandAllNodes(nodes: InternalTreeNode[]): void {
	for (const node of nodes) {
		node.expanded = true;
		if (node.children.length > 0) {
			expandAllNodes(node.children);
		}
	}
}

function collapseAllNodes(nodes: InternalTreeNode[]): void {
	for (const node of nodes) {
		node.expanded = false;
		if (node.children.length > 0) {
			collapseAllNodes(node.children);
		}
	}
}

// =============================================================================
// FACTORY
// =============================================================================

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
 * import { createWorld, addEntity } from 'bitecs';
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
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a tree
 */
export function isTreeWidget(_world: World, eid: Entity): boolean {
	return treeStore.isTree[eid] === 1;
}
