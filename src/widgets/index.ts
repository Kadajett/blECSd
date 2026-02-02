/**
 * Widget wrappers for blECSd components.
 *
 * Widgets provide chainable APIs around ECS components for easier use.
 *
 * @module widgets
 */

// Content line manipulation
export {
	clearLines,
	deleteBottom,
	deleteLine,
	deleteTop,
	getBaseLine,
	getLine,
	getLineCount,
	getLines,
	insertBottom,
	insertLine,
	insertTop,
	popLine,
	pushLine,
	replaceLines,
	setBaseLine,
	setLine,
	setLines,
	shiftLine,
	spliceLines,
	unshiftLine,
} from './contentManipulation';
// List widget
export type { ListStyleConfig, ListWidget, ListWidgetConfig } from './list';
export { createList, isListWidget, ListWidgetConfigSchema } from './list';
// Listbar widget
export type {
	ListbarItem,
	ListbarStyleConfig,
	ListbarWidget,
	ListbarWidgetConfig,
} from './listbar';
export {
	createListbar,
	isListbarWidget,
	ListbarWidgetConfigSchema,
	resetListbarStore,
} from './listbar';
// ListTable widget
export type { ListTableStyleConfig, ListTableWidget, ListTableWidgetConfig } from './listTable';
export { createListTable, isListTableWidget, ListTableWidgetConfigSchema } from './listTable';
// Table widget
export type { TableStyleConfig, TableWidget, TableWidgetConfig } from './table';
export { createTable, isTableWidget, TableWidgetConfigSchema } from './table';
// Tree widget
export type {
	FlattenedNode,
	TreeNode,
	TreeStyleConfig,
	TreeWidget,
	TreeWidgetConfig,
} from './tree';
export { createTree, isTreeWidget, resetTreeStore, TreeWidgetConfigSchema } from './tree';
