/**
 * Split Pane Widget
 *
 * A container that divides its area into independently scrollable panes
 * separated by draggable dividers. Supports horizontal and vertical splits,
 * nested splits, shared text buffers for memory efficiency, and coordinated
 * single-pass rendering with dirty rect tracking.
 *
 * @module widgets/splitPane
 */

// Export config and schemas
export { SplitPaneConfigSchema } from './config';

// Export factory function
export { createSplitPane } from './factory';

// Export state (component and stores)
export {
	dirtyRectStore,
	dividerStateStore,
	dividerStyleStore,
	paneStateStore,
	SplitPane,
	sharedBufferRegistry,
} from './state';

// Export all types
export type {
	DimensionValue,
	DirtyRect,
	DividerRenderInfo,
	DividerState,
	PaneScrollState,
	PaneState,
	PaneViewport,
	PositionValue,
	SharedTextBuffer,
	SplitDirection,
	SplitPaneConfig,
	SplitPaneWidget,
	SplitResizeEvent,
	ValidatedSplitPaneConfig,
} from './types';

// Export public utilities
export {
	createSharedTextBuffer,
	getDividerRenderInfo,
	getSharedTextBuffer,
	getSplitDirection,
	hitTestDivider,
	isSplitPane,
	resetSplitPaneStore,
} from './utilities';
