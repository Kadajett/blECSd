/**
 * Type definitions for Tree Widget.
 *
 * @module widgets/tree/types
 */

import type { Entity } from '../../core/types';

/**
 * A node in the tree hierarchy.
 */
export interface TreeNode {
	/** Display label for the node */
	readonly label: string;
	/** Optional value associated with the node */
	readonly value?: unknown;
	/** Child nodes */
	readonly children?: readonly TreeNode[] | undefined;
	/** Whether the node is expanded (default: false) */
	readonly expanded?: boolean | undefined;
	/** Optional icon displayed before the label */
	readonly icon?: string | undefined;
	/** Optional unique identifier (auto-generated if not provided) */
	readonly id?: string | undefined;
}

/**
 * Internal tree node with mutable state.
 */
export interface InternalTreeNode {
	label: string;
	value?: unknown;
	children: InternalTreeNode[];
	expanded: boolean;
	icon?: string | undefined;
	id: string;
	parent?: InternalTreeNode | undefined;
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

/**
 * Internal tree display state.
 * @internal
 */
export interface TreeDisplay {
	nodeFg: number;
	nodeBg: number;
	selectedFg: number;
	selectedBg: number;
	expandedFg: number;
	collapsedFg: number;
}
