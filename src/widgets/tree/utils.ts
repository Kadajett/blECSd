/**
 * Utility functions for Tree Widget.
 *
 * @module widgets/tree/utils
 */

import { TREE_LINES } from './config';
import type { FlattenedNode, InternalTreeNode, TreeAction, TreeNode, TreeWidget } from './types';

let nodeIdCounter = 0;

/**
 * Generates a unique node ID.
 */
export function generateNodeId(): string {
	return `node_${++nodeIdCounter}`;
}

/**
 * Converts a TreeNode to an InternalTreeNode.
 */
export function convertToInternalNode(
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
export function handleTreeLeftKey(
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
export function handleTreeRightKey(
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
export function handleTreeEnterKey(
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
export function buildTreeIndentation(
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
export function formatTreeLine(
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

/**
 * Flattens tree nodes for rendering.
 */
export function flattenNodes(
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

/**
 * Finds a node by its path string.
 */
export function findNodeByPath(
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

/**
 * Sets the expanded state of a node.
 */
export function setNodeExpanded(node: InternalTreeNode, expanded: boolean): void {
	node.expanded = expanded;
}

/**
 * Expands all nodes recursively.
 */
export function expandAllNodes(nodes: InternalTreeNode[]): void {
	for (const node of nodes) {
		node.expanded = true;
		if (node.children.length > 0) {
			expandAllNodes(node.children);
		}
	}
}

/**
 * Collapses all nodes recursively.
 */
export function collapseAllNodes(nodes: InternalTreeNode[]): void {
	for (const node of nodes) {
		node.expanded = false;
		if (node.children.length > 0) {
			collapseAllNodes(node.children);
		}
	}
}
