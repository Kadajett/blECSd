/**
 * Widget wrappers for blECSd components.
 *
 * Widgets provide chainable APIs around ECS components for easier use.
 *
 * @module widgets
 */

// Box widget
export type {
	Align,
	BorderConfig,
	BoxConfig,
	BoxWidget,
	DimensionValue,
	PaddingConfig,
	PositionValue,
	VAlign,
} from './box';
export {
	Box,
	BoxConfigSchema,
	createBox,
	getBoxContent,
	isBox,
	resetBoxStore,
	setBoxContent,
} from './box';
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
// HoverText (Tooltip) system
export type {
	HoverTextConfig,
	HoverTextManager,
	HoverTextManagerConfig,
	TooltipPosition,
	TooltipRenderData,
	TooltipState,
	TooltipStyle,
} from './hoverText';
export {
	clearAllHoverText,
	clearHoverText,
	createHoverTextManager,
	DEFAULT_CURSOR_OFFSET_X,
	DEFAULT_CURSOR_OFFSET_Y,
	DEFAULT_HIDE_DELAY,
	DEFAULT_HOVER_DELAY,
	DEFAULT_TOOLTIP_BG,
	DEFAULT_TOOLTIP_BORDER,
	DEFAULT_TOOLTIP_FG,
	getHoverText,
	getHoverTextCount,
	hasHoverText,
	resetHoverTextStore,
	setHoverText,
} from './hoverText';
// Line widget
export type { LineConfig, LineOrientation, LineWidget } from './line';
export {
	createLine,
	DEFAULT_HORIZONTAL_CHAR,
	DEFAULT_LINE_LENGTH,
	DEFAULT_VERTICAL_CHAR,
	getLineChar,
	getLineOrientation,
	isLine,
	Line,
	LineConfigSchema,
	resetLineStore,
	setLineChar,
} from './line';
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
// Loading widget
export type {
	LoadingConfig,
	LoadingStyleConfig,
	LoadingWidget,
} from './loading';
export {
	createLoading,
	DEFAULT_LOADING_BG,
	DEFAULT_LOADING_FG,
	hideLoading,
	isLoadingWidget,
	LoadingConfigSchema,
	LoadingStyleConfigSchema,
	resetLoadingStore,
	setLoadingMessage,
	showLoading,
	updateLoadingAnimation,
} from './loading';
// ScrollableBox widget
export type {
	ScrollableBoxConfig,
	ScrollableBoxWidget,
	ScrollbarConfig,
	ScrollbarMode,
} from './scrollableBox';
export {
	createScrollableBox,
	isKeysScrollEnabled,
	isMouseScrollEnabled,
	isScrollableBox,
	resetScrollableBoxStore,
	ScrollableBox,
	ScrollableBoxConfigSchema,
} from './scrollableBox';
// Table widget
export type { TableStyleConfig, TableWidget, TableWidgetConfig } from './table';
export { createTable, isTableWidget, TableWidgetConfigSchema } from './table';
// Text widget
export type { TextConfig, TextWidget } from './text';
export {
	createText,
	getTextContent,
	isText,
	resetTextStore,
	setTextContent,
	Text,
	TextConfigSchema,
} from './text';
// Tree widget
export type {
	FlattenedNode,
	TreeNode,
	TreeStyleConfig,
	TreeWidget,
	TreeWidgetConfig,
} from './tree';
export { createTree, isTreeWidget, resetTreeStore, TreeWidgetConfigSchema } from './tree';
