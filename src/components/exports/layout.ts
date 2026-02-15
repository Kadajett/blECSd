/**
 * Layout components (screen, camera, scrollable, scrollbar, virtualViewport)
 * @module components/exports/layout
 */

// Camera component
export type { CameraBounds, CameraData, CameraOptions } from '../camera';
export {
	Camera,
	centerCameraOn,
	clearCameraBounds,
	DEFAULT_VIEWPORT_HEIGHT,
	DEFAULT_VIEWPORT_WIDTH,
	getCamera,
	getCameraPosition,
	getCameraTarget,
	hasCamera,
	isAreaInView,
	isCameraBounded,
	isFollowingTarget,
	isInView,
	moveCameraBy,
	removeCamera,
	screenToWorld,
	setCamera,
	setCameraBounds,
	setCameraDeadZone,
	setCameraPosition,
	setCameraTarget,
	updateCameraFollow,
	worldToScreen,
} from '../camera';

// Screen component
export type {
	CursorShapeValue,
	ScreenCursor,
	ScreenData,
	ScreenOptions,
} from '../screen';
export {
	CursorShape,
	destroyScreen,
	getScreen,
	getScreenCursor,
	getScreenData,
	getScreenFocus,
	getScreenHover,
	getScreenSize,
	hasScreen,
	hasScreenSingleton,
	initScreenComponent,
	isAutoPadding,
	isFullUnicode,
	isScreen,
	registerScreenSingleton,
	resetScreenSingleton,
	resizeScreen,
	Screen,
	setAutoPadding,
	setFullUnicode,
	setScreenCursor,
	setScreenCursorShape,
	setScreenCursorVisible,
	setScreenFocus,
	setScreenHover,
} from '../screen';

// Scrollable component
export type {
	ScrollableData,
	ScrollableOptions,
	ScrollPercentage,
	ScrollPosition,
} from '../scrollable';
export { Scrollable, ScrollbarVisibility } from '../scrollable';

// Scrollbar component
export type {
	ScrollbarData,
	ScrollbarOptions,
	ScrollbarRenderCell,
} from '../scrollbar';
export {
	calculateHorizontalScrollbar,
	calculateVerticalScrollbar,
	DEFAULT_THUMB_CHAR as DEFAULT_SCROLLBAR_THUMB_CHAR,
	DEFAULT_THUMB_COLOR,
	DEFAULT_TRACK_CHAR as DEFAULT_SCROLLBAR_TRACK_CHAR,
	DEFAULT_TRACK_CHAR_H,
	DEFAULT_TRACK_COLOR,
	disableScrollbar,
	enableScrollbar,
	getScrollbar,
	hasScrollbar,
	isScrollbarEnabled,
	Scrollbar,
	setScrollbar,
	setScrollbarChars,
	setScrollbarColors,
	shouldShowHorizontalScrollbar,
	shouldShowVerticalScrollbar,
} from '../scrollbar';

// VirtualViewport component for virtualized content
export type {
	ScrollInfo as VirtualViewportScrollInfo,
	VirtualViewportData,
	VirtualViewportOptions,
	VisibleRange,
} from '../virtualViewport';
export {
	clearViewportDirty,
	ensureCursorVisible,
	getCursorLine,
	getScrollInfo as getVirtualScrollInfo,
	getSelectedLine,
	getVirtualViewport,
	getVisibleRange,
	hasVirtualViewport,
	invalidateViewport,
	isLineInRenderRange,
	isLineVisible,
	isViewportDirty,
	moveCursor as moveViewportCursor,
	ScrollInfoSchema,
	scrollByLines,
	scrollByPages,
	scrollToBottom as scrollViewportToBottom,
	scrollToLine,
	scrollToTop as scrollViewportToTop,
	setCursorLine,
	setOverscan,
	setSelectedLine,
	setTotalLineCount,
	setViewportStart,
	setVirtualViewport,
	setVisibleLineCount,
	VirtualViewport,
	VirtualViewportOptionsSchema,
	VisibleRangeSchema,
} from '../virtualViewport';
