/**
 * Scroll component namespace.
 *
 * Combines scrollable, scrollbar, and virtual viewport operations
 * into a unified scrolling API.
 *
 * @example
 * ```typescript
 * import { scroll } from 'blecsd/components';
 * scroll.by(world, eid, 0, 10);
 * scroll.toTop(world, eid);
 * if (scroll.isAtBottom(world, eid)) { ... }
 * ```
 */
import {
	canScroll,
	canScrollX,
	canScrollY,
	getScroll,
	getScrollable,
	getScrollPercentage,
	hasScrollable,
	isAtBottom,
	isAtLeft,
	isAtRight,
	isAtTop,
	scrollBy,
	scrollTo,
	scrollToBottom,
	scrollToLeft,
	scrollToRight,
	scrollToTop,
	setClampEnabled,
	setScroll,
	setScrollable,
	setScrollbarVisibility,
	setScrollPercentage,
	setScrollSize,
	setViewport,
} from '../../systems/scrollableSystem';

import {
	calculateHorizontalScrollbar,
	calculateVerticalScrollbar,
	disableScrollbar,
	enableScrollbar,
	getScrollbar,
	hasScrollbar,
	isScrollbarEnabled,
	setScrollbar,
	setScrollbarChars,
	setScrollbarColors,
	shouldShowHorizontalScrollbar,
	shouldShowVerticalScrollbar,
} from '../scrollbar';

import {
	clearViewportDirty,
	ensureCursorVisible,
	getCursorLine,
	getSelectedLine,
	getScrollInfo as getVirtualScrollInfo,
	getVirtualViewport,
	getVisibleRange,
	hasVirtualViewport,
	invalidateViewport,
	isLineInRenderRange,
	isLineVisible,
	isViewportDirty,
	moveCursor as moveViewportCursor,
	scrollByLines,
	scrollByPages,
	scrollToLine,
	scrollToBottom as scrollViewportToBottom,
	scrollToTop as scrollViewportToTop,
	setCursorLine,
	setOverscan,
	setSelectedLine,
	setTotalLineCount,
	setViewportStart,
	setVirtualViewport,
	setVisibleLineCount,
} from '../virtualViewport';

export const scroll = Object.freeze({
	get: getScrollable,
	has: hasScrollable,
	set: setScrollable,
	getScroll,
	setScroll,

	by: scrollBy,
	to: scrollTo,
	toTop: scrollToTop,
	toBottom: scrollToBottom,
	toLeft: scrollToLeft,
	toRight: scrollToRight,

	canScroll,
	canScrollX,
	canScrollY,
	isAtTop,
	isAtBottom,
	isAtLeft,
	isAtRight,

	getPercentage: getScrollPercentage,
	setPercentage: setScrollPercentage,
	setSize: setScrollSize,
	setViewport,
	setClampEnabled,
	setScrollbarVisibility,

	bar: Object.freeze({
		get: getScrollbar,
		has: hasScrollbar,
		set: setScrollbar,
		enable: enableScrollbar,
		disable: disableScrollbar,
		isEnabled: isScrollbarEnabled,
		setChars: setScrollbarChars,
		setColors: setScrollbarColors,
		shouldShowVertical: shouldShowVerticalScrollbar,
		shouldShowHorizontal: shouldShowHorizontalScrollbar,
		calculateVertical: calculateVerticalScrollbar,
		calculateHorizontal: calculateHorizontalScrollbar,
	}),

	viewport: Object.freeze({
		get: getVirtualViewport,
		has: hasVirtualViewport,
		set: setVirtualViewport,
		getScrollInfo: getVirtualScrollInfo,
		getVisibleRange,
		isDirty: isViewportDirty,
		clearDirty: clearViewportDirty,
		invalidate: invalidateViewport,

		byLines: scrollByLines,
		byPages: scrollByPages,
		toLine: scrollToLine,
		toTop: scrollViewportToTop,
		toBottom: scrollViewportToBottom,

		isLineVisible,
		isLineInRenderRange,
		ensureCursorVisible,

		getCursorLine,
		setCursorLine,
		moveCursor: moveViewportCursor,
		getSelectedLine,
		setSelectedLine,

		setStart: setViewportStart,
		setTotalLineCount,
		setVisibleLineCount,
		setOverscan,
	}),
});

export type ScrollModule = typeof scroll;
