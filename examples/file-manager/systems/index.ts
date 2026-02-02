/**
 * Systems exports.
 * @module systems
 */

export {
	createVirtualListSystem,
	createVirtualListState,
	registerListRows,
	markAllRowsDirty,
	getRowAtPosition,
	type VirtualListState,
} from './virtualListSystem';

export {
	processSelectionAction,
	resetSelection,
	type SelectionAction,
} from './selectionSystem';

export {
	processNavigationAction,
	type NavigationAction,
	type NavigationResult,
} from './navigationSystem';

export {
	updatePreview,
	scrollPreviewUp,
	scrollPreviewDown,
	createPreviewState,
	cleanupPreviewState,
	type PreviewState,
} from './previewSystem';

export {
	render,
	bufferToAnsi,
	createRenderState,
	updateRenderDimensions,
	COLORS,
	type RenderState,
} from './renderSystem';

export {
	highlightLine,
	highlightContent,
	supportsHighlighting,
	SYNTAX_COLORS,
	type HighlightedLine,
} from './syntaxHighlight';

export {
	createDualPaneState,
	createFileDragState,
	processDualPaneAction,
	getActivePane,
	addPane,
	removePane,
	calculatePaneBounds,
	getPaneAtPosition,
	type DualPaneState,
	type FileDragState,
	type PaneConfig,
	type PaneBounds,
	type DualPaneAction,
} from './dualPaneSystem';

export {
	createDualPaneRenderState,
	updateDualPaneRenderDimensions,
	renderDualPane,
	dualPaneBufferToAnsi,
	type DualPaneRenderState,
} from './dualPaneRender';
