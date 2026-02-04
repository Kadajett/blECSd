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
// Fonts
export type {
	BitmapFont,
	CharBitmap,
	FontName,
	FontNotFoundError,
	RenderCharOptions,
} from './fonts';
export {
	BitmapFontSchema,
	CharBitmapSchema,
	createFontNotFoundError,
	getCharBitmap,
	loadFont,
	renderChar,
} from './fonts';
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
// Layout widget
export type {
	AlignItems,
	ChildLayoutData,
	FlexDirection,
	JustifyContent,
	LayoutConfig,
	LayoutMode,
	LayoutPosition,
	LayoutWidget,
} from './layout';
export {
	calculateFlexLayout,
	calculateGridLayout,
	calculateInlineLayout,
	createLayout,
	getLayoutMode,
	isLayout,
	Layout,
	LayoutConfigSchema,
	resetLayoutStore,
} from './layout';
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
	ListbarAction,
	ListbarItem,
	ListbarSelectCallback,
	ListbarState,
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
// Panel widget
export type {
	PanelAction,
	PanelBorderConfig,
	PanelConfig,
	PanelContentStyle,
	PanelStyleConfig,
	PanelTitleStyle,
	PanelWidget,
	TitleAlign,
} from './panel';
export {
	CLOSE_BUTTON_CHAR,
	COLLAPSE_CHAR,
	createPanel,
	DEFAULT_PANEL_TITLE,
	EXPAND_CHAR,
	getPanelTitle,
	getPanelTitleAlign,
	isPanel,
	isPanelCollapsed,
	Panel,
	PanelConfigSchema,
	renderPanelTitleBar,
	resetPanelStore,
	setPanelTitle,
} from './panel';
// Widget Registry
export type { WidgetFactory, WidgetRegistration, WidgetRegistry } from './registry';
export {
	createWidgetRegistry,
	defaultRegistry,
	getWidgetsByTag,
	getWidgetTypes,
	isWidgetType,
	registerBuiltinWidgets,
} from './registry';
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
// ScrollableText widget
export type { ScrollableTextConfig, ScrollableTextWidget } from './scrollableText';
export { createScrollableText, isScrollableText } from './scrollableText';
// Table widget
export type { TableStyleConfig, TableWidget, TableWidgetConfig } from './table';
export { createTable, isTableWidget, TableWidgetConfigSchema } from './table';
// Tabs widget
export type {
	ContentStyleConfig as TabsContentStyleConfig,
	TabConfig,
	TabData,
	TabPosition,
	TabStyleConfig,
	TabsAction,
	TabsBorderConfig,
	TabsConfig,
	TabsStyleConfig,
	TabsWidget,
} from './tabs';
export {
	createTabs,
	DEFAULT_TAB_POSITION,
	getActiveTabIndex,
	getTabCount,
	getTabPosition,
	isTabs,
	renderTabBar,
	resetTabsStore,
	TAB_CLOSE_CHAR,
	TAB_SEPARATOR,
	Tabs,
	TabsConfigSchema,
} from './tabs';
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
// VirtualizedList widget
export type {
	VirtualizedList,
	VirtualizedListConfig,
	VirtualizedListStyle,
} from './virtualizedList';
export {
	BorderConfigSchema,
	createVirtualizedList,
	handleVirtualizedListKey,
	handleVirtualizedListWheel,
	isVirtualizedList,
	VirtualizedListConfigSchema,
	VirtualizedListStyleSchema,
} from './virtualizedList';
