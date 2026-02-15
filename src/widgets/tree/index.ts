/**
 * Tree Widget
 *
 * Provides a hierarchical tree view widget with expandable nodes,
 * keyboard navigation, and selection support.
 *
 * @module widgets/tree
 */

// Export constants and schemas
export { TREE_LINES, TreeNodeSchema, TreeWidgetConfigSchema } from './config';

// Export factory functions
export { createTree, isTreeWidget } from './factory';

// Export state (for advanced usage)
export {
	activateCallbacks,
	DEFAULT_COLLAPSED_FG,
	DEFAULT_EXPANDED_FG,
	DEFAULT_NODE_BG,
	DEFAULT_NODE_FG,
	DEFAULT_SELECTED_BG,
	DEFAULT_SELECTED_FG,
	displayStore,
	nodesStore,
	resetTreeStore,
	STATE_MAP,
	selectCallbacks,
	selectedPathStore,
	toggleCallbacks,
	treeStore,
} from './state';

// Export all types
export type {
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

// Export utilities (for advanced usage)
export {
	buildTreeIndentation,
	collapseAllNodes,
	convertToInternalNode,
	expandAllNodes,
	findNodeByPath,
	flattenNodes,
	formatTreeLine,
	generateNodeId,
	handleTreeEnterKey,
	handleTreeLeftKey,
	handleTreeRightKey,
	setNodeExpanded,
} from './utils';
